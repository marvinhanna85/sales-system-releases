const SEARCH_FIELD_MASK =
  "places.id,places.displayName,places.formattedAddress,places.addressComponents,places.primaryType,places.primaryTypeDisplayName,places.googleMapsUri,places.rating,places.userRatingCount,nextPageToken";
const DETAIL_FIELD_MASK =
  "id,displayName,formattedAddress,addressComponents,nationalPhoneNumber,internationalPhoneNumber,websiteUri,googleMapsUri,primaryType,primaryTypeDisplayName,rating,userRatingCount";
const PAGE_SIZE = 20;
const MAX_RESULTS_PER_QUERY = 60;
const NEXT_PAGE_DELAY_MS = 1500;

function formatPlacesError(responseText, status) {
  if (status === 429) {
    return "Google Places rate limit nåddes. Vänta en stund och försök igen.";
  }

  if (status === 403) {
    return "Google Places nekade anropet. Kontrollera API-nyckel, billing och att Places API är aktiverat.";
  }

  return `Google Places-sökning misslyckades (${status}). ${responseText}`;
}

async function fetchJson(url, options) {
  let response;
  try {
    response = await fetch(url, options);
  } catch (_error) {
    throw new Error("Nätverksfel mot Google Places. Kontrollera internetanslutning och API-inställningar.");
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(formatPlacesError(text, response.status));
  }

  return response.json();
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPlaceDetails(apiKey, placeId) {
  return fetchJson(`https://places.googleapis.com/v1/places/${placeId}`, {
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": DETAIL_FIELD_MASK
    }
  });
}

async function searchSingleQuery(apiKey, query, maxResultsPerQuery, options = {}) {
  const onProgress = typeof options.onProgress === "function" ? options.onProgress : () => {};
  const effectiveMax = Math.min(Math.max(1, Number(maxResultsPerQuery) || MAX_RESULTS_PER_QUERY), MAX_RESULTS_PER_QUERY);
  const pageSize = Math.min(PAGE_SIZE, effectiveMax);
  const rawPlaces = [];
  let nextPageToken = "";
  let apiCalls = 0;
  let usedPagination = false;
  let hadNextPageToken = false;

  const fetchPage = async (pageToken = "", allowRetry = false) => {
    apiCalls += 1;
    try {
      return await fetchJson("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": SEARCH_FIELD_MASK
        },
        body: JSON.stringify({
          textQuery: query,
          pageSize: pageToken ? Math.min(PAGE_SIZE, effectiveMax - rawPlaces.length) : pageSize,
          pageToken,
          languageCode: "sv"
        })
      });
    } catch (error) {
      if (!allowRetry) {
        throw error;
      }
      await wait(NEXT_PAGE_DELAY_MS);
      apiCalls += 1;
      return fetchJson("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": SEARCH_FIELD_MASK
        },
        body: JSON.stringify({
          textQuery: query,
          pageSize: Math.min(PAGE_SIZE, effectiveMax - rawPlaces.length),
          pageToken,
          languageCode: "sv"
        })
      });
    }
  };

  const firstPage = await fetchPage();
  rawPlaces.push(...(Array.isArray(firstPage.places) ? firstPage.places : []));
  nextPageToken = firstPage.nextPageToken ?? "";
  hadNextPageToken = Boolean(nextPageToken);
  onProgress({
    stage: "page",
    rawCount: rawPlaces.length,
    apiCalls,
    pageCount: 1,
    queryProgress: 0.1
  });

  let pageCount = 1;
  while (nextPageToken && rawPlaces.length < effectiveMax) {
    usedPagination = true;
    const pageData = await fetchPage(nextPageToken, true);
    rawPlaces.push(...(Array.isArray(pageData.places) ? pageData.places : []));
    nextPageToken = pageData.nextPageToken ?? "";
    pageCount += 1;
    onProgress({
      stage: "page",
      rawCount: rawPlaces.length,
      apiCalls,
      pageCount,
      queryProgress: Math.min(0.25, 0.1 + pageCount * 0.05)
    });
  }

  const detailedPlaces = [];
  const placesForDetails = rawPlaces.slice(0, effectiveMax);
  onProgress({
    stage: "details-start",
    rawCount: rawPlaces.length,
    detailIndex: 0,
    detailTotal: placesForDetails.length,
    apiCalls,
    queryProgress: 0.3
  });

  for (const [index, place] of placesForDetails.entries()) {
    if (!place.id) {
      detailedPlaces.push(place);
      onProgress({
        stage: "details",
        rawCount: rawPlaces.length,
        detailIndex: index + 1,
        detailTotal: placesForDetails.length,
        apiCalls,
        queryProgress: 0.3 + 0.65 * ((index + 1) / Math.max(1, placesForDetails.length))
      });
      continue;
    }

    try {
      apiCalls += 1;
      const detail = await fetchPlaceDetails(apiKey, place.id);
      detailedPlaces.push({ ...place, ...detail });
    } catch (_error) {
      detailedPlaces.push(place);
    }
    if ((index + 1) % 5 === 0 || index + 1 === placesForDetails.length) {
      onProgress({
        stage: "details",
        rawCount: rawPlaces.length,
        detailIndex: index + 1,
        detailTotal: placesForDetails.length,
        apiCalls,
        queryProgress: 0.3 + 0.65 * ((index + 1) / Math.max(1, placesForDetails.length))
      });
    }
  }

  return {
    query,
    rawPlaces,
    places: detailedPlaces,
    rawCount: rawPlaces.length,
    fetchedCount: detailedPlaces.length,
    apiCalls,
    usedPagination,
    hadNextPageToken
  };
}

module.exports = {
  MAX_RESULTS_PER_QUERY,
  searchSingleQuery
};
