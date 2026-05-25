const BRANCH_TAXONOMY = [
  {
    id: "byggare",
    label: "Byggare",
    aliases: ["bygg", "byggare", "byggfirma", "byggföretag", "snickare", "entreprenad", "renovering", "byggservice"]
  },
  {
    id: "elektriker",
    label: "Elektriker",
    aliases: ["elektriker", "elinstallatör", "elinstallation", "elfirma"]
  },
  {
    id: "restauranger",
    label: "Restauranger",
    aliases: ["restaurang", "restauranger", "krog", "bistro", "lunchrestaurang"]
  },
  {
    id: "blomsterhandlare",
    label: "Blomsterhandlare",
    aliases: ["blomsterhandlare", "florist", "blombutik", "blomsterhandel"]
  },
  {
    id: "frisorer",
    label: "Frisörer",
    aliases: ["frisör", "frisörer", "frisörsalong", "hårsalong", "barberare"]
  },
  {
    id: "malare",
    label: "Målare",
    aliases: ["målare", "måleri", "målerifirma"]
  },
  {
    id: "bilverkstad",
    label: "Bilverkstad",
    aliases: ["bilverkstad", "verkstad", "bilservice", "mekaniker"]
  },
  {
    id: "konsulter",
    label: "Konsulter",
    aliases: ["konsult", "konsulter", "konsultfirma", "rådgivning"]
  }
];

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function findBranchDefinition(input) {
  const normalized = normalizeText(input);
  return (
    BRANCH_TAXONOMY.find((branch) => {
      return normalizeText(branch.label) === normalized || branch.aliases.some((alias) => normalizeText(alias) === normalized);
    }) ?? null
  );
}

function inferBranchLabel(input) {
  const normalized = normalizeText(input);
  const direct = findBranchDefinition(input);
  if (direct) {
    return direct.label;
  }

  const fuzzy = BRANCH_TAXONOMY.find((branch) => {
    return branch.aliases.some((alias) => normalized.includes(normalizeText(alias))) || normalized.includes(normalizeText(branch.label));
  });
  return fuzzy?.label ?? "";
}

function buildGenericQueryTemplates(label) {
  const term = String(label ?? "").trim();
  if (!term) {
    return [];
  }

  return [`${term} {city}`];
}

function buildQueriesForBranch(label, city) {
  const term = String(label ?? "").trim();
  const location = String(city ?? "").trim();
  if (!term || !location) {
    return [];
  }

  return [`${term} ${location}`]
    .filter(Boolean)
    .filter((item, index, list) => list.findIndex((candidate) => normalizeText(candidate) === normalizeText(item)) === index);
}

module.exports = {
  BRANCH_TAXONOMY,
  buildQueriesForBranch,
  buildGenericQueryTemplates,
  findBranchDefinition,
  inferBranchLabel,
  normalizeText
};
