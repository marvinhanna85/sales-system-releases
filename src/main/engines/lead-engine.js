const {
  buildQueriesForBranch,
  normalizeText
} = require("../data/taxonomy");
const {
  inferBranchFromContext,
  inferCityFromContext,
  inferCountryFromContext,
  inferLocalityFromContext,
  isRelevantForSearch
} = require("../data/normalizers");
const { findDuplicateLead, normalizeLead } = require("../domain");
const { MAX_RESULTS_PER_QUERY, searchSingleQuery } = require("../services/places-service");

const MAX_API_CALLS_PER_SEARCH = 500;

function mapGooglePlace(place, context) {
  const rawGoogleCategory = place.primaryTypeDisplayName?.text ?? place.primaryType ?? "";
  const rawAddress = place.formattedAddress ?? "";
  const addressComponents = Array.isArray(place.addressComponents) ? place.addressComponents : [];
  const normalizedBranch =
    inferBranchFromContext({
      rawGoogleCategory,
      sourceQuery: context.query,
      matchedQueries: [context.query],
      campaignName: context.branch
    }) || context.branch;
  const googleLocality = inferLocalityFromContext({
    addressComponents,
    rawAddress,
    fallbackLocality: context.city
  });
  const normalizedCity = inferCityFromContext({
    addressComponents,
    rawAddress,
    sourceQuery: context.query,
    campaignCities: [context.city],
    fallbackCity: context.city
  });
  const country = inferCountryFromContext({
    addressComponents,
    rawAddress,
    fallbackCountry: "Sweden"
  });

  return {
    source: "google-places",
    externalId: place.id ?? "",
    companyName: place.displayName?.text ?? "",
    phone: place.nationalPhoneNumber ?? place.internationalPhoneNumber ?? "",
    website: place.websiteUri ?? "",
    address: rawAddress,
    city: googleLocality,
    category: normalizedBranch,
    normalizedBranch,
    normalizedCity: context.city || normalizedCity,
    targetMarketCity: context.city,
    googleLocality,
    rawLocality: googleLocality,
    country,
    rawGoogleCategory,
    rawAddress,
    rawPlaceData: place,
    googleMapsUrl: place.googleMapsUri ?? "",
    rating: typeof place.rating === "number" ? place.rating : null,
    reviewCount: typeof place.userRatingCount === "number" ? place.userRatingCount : null,
    sourceQuery: context.query,
    matchedQueries: [context.query],
    status: "Ny"
  };
}

function mergeLead(existingLead, incomingLead) {
  return {
    ...existingLead,
    phone: existingLead.phone || incomingLead.phone,
    website: existingLead.website || incomingLead.website,
    address: existingLead.address || incomingLead.address,
    googleMapsUrl: existingLead.googleMapsUrl || incomingLead.googleMapsUrl,
    rawGoogleCategory: existingLead.rawGoogleCategory || incomingLead.rawGoogleCategory,
    googleLocality: existingLead.googleLocality || incomingLead.googleLocality,
    rawLocality: existingLead.rawLocality || incomingLead.rawLocality,
    sourceQuery: existingLead.sourceQuery || incomingLead.sourceQuery,
    matchedQueries: [...new Set([...(existingLead.matchedQueries || []), ...(incomingLead.matchedQueries || [])])]
  };
}

function summarizeCities(leads) {
  const cityMap = new Map();
  leads.forEach((lead) => {
    const city = lead.targetMarketCity || lead.normalizedCity || lead.city || "Okänd stad";
    cityMap.set(city, (cityMap.get(city) || 0) + 1);
  });
  return [...cityMap.entries()]
    .map(([city, count]) => ({ city, count }))
    .sort((left, right) => right.count - left.count || left.city.localeCompare(right.city, "sv"));
}

function parseInputList(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item ?? "").trim())
      .filter(Boolean);
  }

  return String(value ?? "")
    .split(/[,;\n\r]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildSegmentKey(branch, city) {
  return `${normalizeText(branch)}|${normalizeText(city)}`;
}

function estimateApiCalls(queryCount, maxResultsPerQuery) {
  const effectiveMax = Math.min(Math.max(1, Number(maxResultsPerQuery) || MAX_RESULTS_PER_QUERY), MAX_RESULTS_PER_QUERY);
  const pageCalls = Math.ceil(effectiveMax / 20);
  return queryCount * (pageCalls + effectiveMax);
}

function summarizeSegments(leads) {
  const segmentMap = new Map();
  leads.forEach((lead) => {
    const branch = lead.normalizedBranch || lead.category || "Okategoriserat";
    const city = lead.targetMarketCity || lead.normalizedCity || lead.city || "Okänd stad";
    const key = buildSegmentKey(branch, city);
    const current = segmentMap.get(key) || { branch, city, count: 0 };
    current.count += 1;
    segmentMap.set(key, current);
  });
  return [...segmentMap.values()]
    .sort((left, right) =>
      left.branch.localeCompare(right.branch, "sv") ||
      left.city.localeCompare(right.city, "sv")
    );
}

async function searchPlaces(payload = {}) {
  const onProgress = typeof payload.onProgress === "function" ? payload.onProgress : () => {};
  const apiKey = String(payload.apiKey ?? "").trim();
  const branches = parseInputList(payload.branches ?? payload.branch ?? payload.industry);
  const cities = parseInputList(payload.cities ?? payload.city);
  const requestedMax = Number(payload.maxResults);
  const maxResultsPerQuery = Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : MAX_RESULTS_PER_QUERY;

  if (!apiKey) {
    throw new Error("API-nyckel saknas.");
  }
  if (!branches.length) {
    throw new Error("Bransch saknas.");
  }
  if (!cities.length) {
    throw new Error("Minst en stad krävs.");
  }

  const queryPlan = branches.flatMap((branch) =>
    cities.flatMap((city) =>
      buildQueriesForBranch(branch, city).map((query) => ({
        branch,
        city,
        query,
        segmentKey: buildSegmentKey(branch, city)
      }))
    )
  );
  const estimatedApiCalls = estimateApiCalls(queryPlan.length, maxResultsPerQuery);

  if (estimatedApiCalls > MAX_API_CALLS_PER_SEARCH) {
    throw new Error(
      `Sökningen stoppades innan Google debiterades: den kan kräva upp till cirka ${estimatedApiCalls} API-anrop. ` +
        `Dela upp sökningen i färre branscher/städer eller sänk max träffar per query. Säkerhetsgräns: ${MAX_API_CALLS_PER_SEARCH} API-anrop.`
    );
  }

  const perQuery = [];
  const rawMappedLeads = [];
  let apiCalls = 0;
  let rawResults = 0;
  let filteredOut = 0;

  const emitProgress = (patch = {}) => {
    onProgress({
      totalQueries: queryPlan.length,
      rawResults,
      filteredOut,
      apiCalls,
      ...patch
    });
  };

  emitProgress({
    stage: "started",
    completedQueries: 0,
    currentQueryIndex: 0,
    queryProgress: 0
  });

  for (const [queryIndex, queryContext] of queryPlan.entries()) {
    emitProgress({
      stage: "query-start",
      completedQueries: queryIndex,
      currentQueryIndex: queryIndex + 1,
      queryProgress: 0,
      query: queryContext.query,
      branch: queryContext.branch,
      city: queryContext.city,
      segmentKey: queryContext.segmentKey
    });

    const result = await searchSingleQuery(apiKey, queryContext.query, maxResultsPerQuery, {
      onProgress: (progress) => emitProgress({
        ...progress,
        completedQueries: queryIndex,
        currentQueryIndex: queryIndex + 1,
        query: queryContext.query,
        branch: queryContext.branch,
        city: queryContext.city,
        segmentKey: queryContext.segmentKey
      })
    });
    apiCalls += result.apiCalls;
    rawResults += result.rawCount;

    const mapped = result.places.map((place) => mapGooglePlace(place, queryContext));
    const relevant = mapped.filter((lead) => {
      const okay = isRelevantForSearch({
        normalizedCity: lead.normalizedCity,
        country: lead.country,
        searchCity: queryContext.city,
        expectedCountry: "Sweden"
      });
      if (!okay) {
        filteredOut += 1;
      }
      return okay;
    });

    perQuery.push({
      query: queryContext.query,
      branch: queryContext.branch,
      city: queryContext.city,
      segmentKey: queryContext.segmentKey,
      rawCount: result.rawCount,
      fetchedCount: result.fetchedCount,
      relevantCount: relevant.length,
      filteredOut: mapped.length - relevant.length,
      apiCalls: result.apiCalls,
      usedPagination: result.usedPagination,
      hadNextPageToken: result.hadNextPageToken
    });

    rawMappedLeads.push(...relevant);

    emitProgress({
      stage: "query-complete",
      completedQueries: queryIndex + 1,
      currentQueryIndex: queryIndex + 1,
      queryProgress: 1,
      query: queryContext.query,
      branch: queryContext.branch,
      city: queryContext.city,
      segmentKey: queryContext.segmentKey,
      rawCount: result.rawCount,
      relevantCount: relevant.length
    });
  }

  const uniqueLeads = [];
  let duplicatesRemoved = 0;
  rawMappedLeads.forEach((lead) => {
    const candidate = normalizeLead(lead);
    const duplicate = findDuplicateLead(uniqueLeads, candidate);
    if (!duplicate) {
      uniqueLeads.push(candidate);
      return;
    }
    duplicatesRemoved += 1;
    const index = uniqueLeads.findIndex((item) => item.id === duplicate.id);
    uniqueLeads[index] = mergeLead(uniqueLeads[index], candidate);
  });

  return {
    queryPreview: queryPlan,
    places: uniqueLeads,
    meta: {
      branch: branches[0] || "",
      branches,
      cities,
      queryCount: queryPlan.length,
      rawResults,
      uniqueResults: uniqueLeads.length,
      duplicatesRemoved,
      filteredOut,
      apiCalls,
      maxResultsPerQuery: Math.min(maxResultsPerQuery, MAX_RESULTS_PER_QUERY),
      perQuery,
      cityBreakdown: summarizeCities(uniqueLeads),
      segmentBreakdown: summarizeSegments(uniqueLeads),
      notice:
        maxResultsPerQuery > MAX_RESULTS_PER_QUERY
          ? `Google Places Text Search returnerar högst ${MAX_RESULTS_PER_QUERY} resultat per query.`
          : ""
    }
  };
}

module.exports = {
  searchPlaces
};
