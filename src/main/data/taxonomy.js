const BRANCH_TAXONOMY = [
  {
    id: "byggare",
    label: "Byggare",
    aliases: ["bygg", "byggare", "byggfirma", "byggföretag", "snickare", "entreprenad", "renovering", "byggservice"],
    queryTemplates: [
      "byggfirma {city}",
      "byggföretag {city}",
      "snickare {city}",
      "entreprenad {city}",
      "renovering {city}",
      "byggservice {city}"
    ]
  },
  {
    id: "elektriker",
    label: "Elektriker",
    aliases: ["elektriker", "elinstallatör", "elinstallation", "elfirma"],
    queryTemplates: [
      "elektriker {city}",
      "elfirma {city}",
      "elinstallation {city}",
      "elinstallatör {city}"
    ]
  },
  {
    id: "restauranger",
    label: "Restauranger",
    aliases: ["restaurang", "restauranger", "krog", "bistro", "lunchrestaurang"],
    queryTemplates: [
      "restaurang {city}",
      "krog {city}",
      "bistro {city}",
      "lunchrestaurang {city}"
    ]
  },
  {
    id: "blomsterhandlare",
    label: "Blomsterhandlare",
    aliases: ["blomsterhandlare", "florist", "blombutik", "blomsterhandel"],
    queryTemplates: [
      "blomsterhandlare {city}",
      "florist {city}",
      "blombutik {city}",
      "blomsterhandel {city}"
    ]
  },
  {
    id: "frisorer",
    label: "Frisörer",
    aliases: ["frisör", "frisörer", "frisörsalong", "hårsalong", "barberare"],
    queryTemplates: [
      "frisör {city}",
      "frisörsalong {city}",
      "hårsalong {city}",
      "barberare {city}"
    ]
  },
  {
    id: "malare",
    label: "Målare",
    aliases: ["målare", "måleri", "målerifirma"],
    queryTemplates: [
      "målare {city}",
      "måleri {city}",
      "målerifirma {city}"
    ]
  },
  {
    id: "bilverkstad",
    label: "Bilverkstad",
    aliases: ["bilverkstad", "verkstad", "bilservice", "mekaniker"],
    queryTemplates: [
      "bilverkstad {city}",
      "bilservice {city}",
      "verkstad {city}",
      "mekaniker {city}"
    ]
  },
  {
    id: "konsulter",
    label: "Konsulter",
    aliases: ["konsult", "konsulter", "konsultfirma", "rådgivning"],
    queryTemplates: [
      "konsult {city}",
      "konsultfirma {city}",
      "rådgivning {city}"
    ]
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

function buildQueriesForBranch(label, city) {
  const branch = findBranchDefinition(label) ?? { label: label.trim(), queryTemplates: [`${label} {city}`] };
  return branch.queryTemplates
    .map((template) => template.replace("{city}", city).trim())
    .filter(Boolean)
    .filter((item, index, list) => list.indexOf(item) === index);
}

module.exports = {
  BRANCH_TAXONOMY,
  buildQueriesForBranch,
  findBranchDefinition,
  inferBranchLabel,
  normalizeText
};
