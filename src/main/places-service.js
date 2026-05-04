const { buildQueriesForBranch } = require("./data/taxonomy");
const { searchPlaces } = require("./engines/lead-engine");

function buildSearchQueries(payload = {}) {
  const explicitQuery = String(payload.query ?? "").trim();
  if (explicitQuery) {
    return [explicitQuery];
  }

  const branch = String(payload.branch ?? payload.industry ?? "").trim();
  const city = String(payload.city ?? "").trim();
  if (!branch || !city) {
    return [];
  }

  return buildQueriesForBranch(branch, city);
}

module.exports = {
  buildSearchQueries,
  searchPlaces
};
