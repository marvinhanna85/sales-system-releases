const { inferBranchLabel, normalizeText } = require("./taxonomy");

function normalizePhone(value) {
  return String(value ?? "").replace(/\D/g, "");
}

function titleCase(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function parseAddressComponents(addressComponents = []) {
  const result = {
    city: "",
    country: "",
    postalCode: ""
  };

  addressComponents.forEach((component) => {
    const types = Array.isArray(component.types) ? component.types : [];
    const text = component.longText ?? component.shortText ?? component.long_name ?? component.short_name ?? "";
    if (!result.city && (types.includes("locality") || types.includes("postal_town") || types.includes("administrative_area_level_2"))) {
      result.city = text;
    }
    if (!result.country && types.includes("country")) {
      result.country = text;
    }
    if (!result.postalCode && types.includes("postal_code")) {
      result.postalCode = text;
    }
  });

  return result;
}

function parseFormattedAddressParts(address) {
  const parts = String(address ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  const last = parts[parts.length - 1] ?? "";
  const penultimate = parts[parts.length - 2] ?? "";
  const cityFromPostal = penultimate.replace(/\b\d{3}\s?\d{2}\b/g, "").trim();
  return {
    city: cityFromPostal || penultimate || "",
    country: last || ""
  };
}

function inferBranchFromContext({ rawGoogleCategory = "", sourceQuery = "", matchedQueries = [], campaignName = "" }) {
  return (
    inferBranchLabel(sourceQuery) ||
    inferBranchLabel(campaignName) ||
    matchedQueries.map((item) => inferBranchLabel(item)).find(Boolean) ||
    inferBranchLabel(rawGoogleCategory) ||
    ""
  );
}

function inferCityFromContext({ addressComponents = [], rawAddress = "", sourceQuery = "", campaignCities = [], fallbackCity = "" }) {
  const parsed = parseAddressComponents(addressComponents);
  if (parsed.city) {
    return titleCase(parsed.city);
  }

  const parsedAddress = parseFormattedAddressParts(rawAddress);
  if (parsedAddress.city && normalizeText(parsedAddress.city) !== "sweden" && normalizeText(parsedAddress.city) !== "sverige") {
    return titleCase(parsedAddress.city);
  }

  const queryCity = String(sourceQuery ?? "")
    .trim()
    .split(/\s+/)
    .slice(-1)[0];
  if (queryCity) {
    return titleCase(queryCity);
  }

  if (campaignCities.length) {
    return titleCase(campaignCities[0]);
  }

  return titleCase(fallbackCity);
}

function inferLocalityFromContext({ addressComponents = [], rawAddress = "", fallbackLocality = "" }) {
  const parsed = parseAddressComponents(addressComponents);
  if (parsed.city) {
    return titleCase(parsed.city);
  }

  const parsedAddress = parseFormattedAddressParts(rawAddress);
  if (parsedAddress.city && normalizeText(parsedAddress.city) !== "sweden" && normalizeText(parsedAddress.city) !== "sverige") {
    return titleCase(parsedAddress.city);
  }

  return titleCase(fallbackLocality);
}

function inferCountryFromContext({ addressComponents = [], rawAddress = "", fallbackCountry = "Sweden" }) {
  const parsed = parseAddressComponents(addressComponents);
  if (parsed.country) {
    return titleCase(parsed.country);
  }

  const parsedAddress = parseFormattedAddressParts(rawAddress);
  if (parsedAddress.country) {
    return titleCase(parsedAddress.country);
  }

  return fallbackCountry;
}

function isRelevantForSearch({ normalizedCity, country, searchCity, expectedCountry = "Sweden" }) {
  const sameCountry = !country || normalizeText(country) === normalizeText(expectedCountry) || normalizeText(country) === "sverige";
  return sameCountry;
}

module.exports = {
  inferBranchFromContext,
  inferCityFromContext,
  inferCountryFromContext,
  inferLocalityFromContext,
  isRelevantForSearch,
  normalizePhone,
  normalizeText,
  parseAddressComponents,
  titleCase
};
