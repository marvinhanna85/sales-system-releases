const { buildQueriesForBranch, normalizeText } = require("../data/taxonomy");
const {
  inferBranchFromContext,
  inferCityFromContext,
  inferCountryFromContext,
  inferLocalityFromContext,
  isRelevantForSearch
} = require("../data/normalizers");
const { findDuplicateLead, normalizeLead } = require("../domain");
const { MAX_RESULTS_PER_QUERY, searchSingleQuery } = require("../services/places-service");

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

async function searchPlaces(payload = {}) {
  const apiKey = String(payload.apiKey ?? "").trim();
  const branch = String(payload.branch ?? payload.industry ?? "").trim();
  const cities = String(payload.cities ?? payload.city ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  const requestedMax = Number(payload.maxResults);
  const maxResultsPerQuery = Number.isFinite(requestedMax) && requestedMax > 0 ? requestedMax : MAX_RESULTS_PER_QUERY;

  if (!apiKey) {
    throw new Error("API-nyckel saknas.");
  }
  if (!branch) {
    throw new Error("Bransch saknas.");
  }
  if (!cities.length) {
    throw new Error("Minst en stad krävs.");
  }

  const queryPlan = cities.flatMap((city) =>
    buildQueriesForBranch(branch, city).map((query) => ({
      branch,
      city,
      query
    }))
  );

  const perQuery = [];
  const rawMappedLeads = [];
  let apiCalls = 0;
  let rawResults = 0;
  let filteredOut = 0;

  for (const queryContext of queryPlan) {
    const result = await searchSingleQuery(apiKey, queryContext.query, maxResultsPerQuery);
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
      city: queryContext.city,
      rawCount: result.rawCount,
      fetchedCount: result.fetchedCount,
      relevantCount: relevant.length,
      filteredOut: mapped.length - relevant.length,
      apiCalls: result.apiCalls,
      usedPagination: result.usedPagination,
      hadNextPageToken: result.hadNextPageToken
    });

    rawMappedLeads.push(...relevant);
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
      branch,
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
