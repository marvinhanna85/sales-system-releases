const { randomUUID } = require("node:crypto");
const { normalizePhone, normalizeText, titleCase } = require("./data/normalizers");

const LEAD_STATUSES = [
  "Ny",
  "Ej svar",
  "Ringa igen",
  "Skicka mail",
  "Mail skickat",
  "Återkoppling",
  "Closed",
  "Inte intresserad"
];

const LEAD_PRIORITIES = ["Hög", "Medel", "Låg"];

function nowIso() {
  return new Date().toISOString();
}

function createId() {
  return randomUUID();
}

function normalizeStatus(status) {
  return LEAD_STATUSES.includes(status) ? status : "Ny";
}

function normalizePriority(priority) {
  return LEAD_PRIORITIES.includes(priority) ? priority : "Medel";
}

function safeArray(value) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function normalizeLead(input = {}) {
  const timestamp = nowIso();
  const source = input.source ?? "manual";
  const normalizedBranch = input.normalizedBranch ?? input.category ?? "";
  const normalizedCity = input.normalizedCity ?? titleCase(input.targetMarketCity ?? input.city ?? "");
  return {
    id: input.id ?? createId(),
    source,
    externalId: input.externalId ?? "",
    sourceQuery: input.sourceQuery ?? (source === "manual" ? "manuell" : ""),
    matchedQueries: safeArray(input.matchedQueries).length ? safeArray(input.matchedQueries) : (source === "manual" ? ["manuell"] : []),
    companyName: input.companyName ?? "",
    contactName: input.contactName ?? "",
    phone: input.phone ?? "",
    website: input.website ?? "",
    address: input.address ?? "",
    city: input.city ?? "",
    normalizedCity,
    targetMarketCity: input.targetMarketCity ?? normalizedCity,
    googleLocality: input.googleLocality ?? input.rawLocality ?? input.city ?? "",
    rawLocality: input.rawLocality ?? input.googleLocality ?? input.city ?? "",
    country: input.country ?? "Sweden",
    category: input.category ?? "",
    normalizedBranch,
    rawGoogleCategory: input.rawGoogleCategory ?? "",
    rawAddress: input.rawAddress ?? input.address ?? "",
    rawPlaceData: input.rawPlaceData ?? null,
    tags: safeArray(input.tags),
    notes: input.notes ?? "",
    priority: normalizePriority(input.priority),
    status: normalizeStatus(input.status),
    listId: input.listId ?? input.campaignId ?? "",
    plannedDate: input.plannedDate ?? "",
    googleMapsUrl: input.googleMapsUrl ?? "",
    rating: Number.isFinite(Number(input.rating)) ? Number(input.rating) : null,
    reviewCount: Number.isFinite(Number(input.reviewCount)) ? Number(input.reviewCount) : null,
    photoReferences: safeArray(input.photoReferences),
    images: safeArray(input.images),
    openingHours: safeArray(input.openingHours),
    isDeleted: Boolean(input.isDeleted),
    deletedAt: input.deletedAt ?? "",
    createdAt: input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp
  };
}

function normalizeCampaign(input = {}) {
  const timestamp = nowIso();
  return {
    id: input.id ?? createId(),
    name: input.name ?? "Ny lista",
    sourceType: input.sourceType ?? "manual",
    searchQuery: input.searchQuery ?? "",
    cities: safeArray(input.cities).map(titleCase),
    targetMarkets: safeArray(input.targetMarkets ?? input.cities).map(titleCase),
    categories: safeArray(input.categories),
    normalizedBranch: input.normalizedBranch ?? input.categories?.[0] ?? "",
    totalLeads: Number(input.totalLeads) || 0,
    dailyTarget: Math.max(1, Number(input.dailyTarget) || 40),
    startDate: input.startDate ?? "",
    estimatedDays: Math.max(0, Number(input.estimatedDays) || 0),
    createdAt: input.createdAt ?? timestamp
  };
}

function normalizeReminder(input = {}) {
  const timestamp = nowIso();
  return {
    id: input.id ?? createId(),
    leadId: input.leadId ?? "",
    type: input.type ?? "följ upp",
    dueDate: input.dueDate ?? "",
    dueTime: input.dueTime ?? "",
    note: input.note ?? "",
    completed: Boolean(input.completed),
    completedAt: input.completedAt ?? "",
    createdAt: input.createdAt ?? timestamp
  };
}

function normalizeLogEntry(input = {}) {
  return {
    id: input.id ?? createId(),
    leadId: input.leadId ?? "",
    text: input.text ?? "",
    type: input.type ?? "note",
    title: input.title ?? "",
    createdAt: input.createdAt ?? nowIso()
  };
}

function normalizeScheduleItem(input = {}) {
  return {
    id: input.id ?? createId(),
    leadId: input.leadId ?? "",
    plannedDate: input.plannedDate ?? "",
    orderIndex: Number(input.orderIndex) || 0,
    completed: Boolean(input.completed),
    completedAt: input.completedAt ?? ""
  };
}

function normalizeCallRecord(input = {}) {
  const timestamp = nowIso();
  return {
    id: input.id ?? createId(),
    leadId: input.leadId ?? "",
    provider: input.provider ?? "telavox",
    externalId: input.externalId ?? "",
    direction: input.direction ?? "unknown",
    remoteNumber: input.remoteNumber ?? "",
    happenedAt: input.happenedAt ?? timestamp,
    durationSeconds: Number(input.durationSeconds) || 0,
    recordingId: input.recordingId ?? "",
    localRecordingPath: input.localRecordingPath ?? "",
    createdAt: input.createdAt ?? timestamp,
    updatedAt: input.updatedAt ?? timestamp
  };
}

function findDuplicateLead(existingLeads, candidate) {
  const externalId = normalizeText(candidate.externalId);
  const phone = normalizePhone(candidate.phone);
  const website = normalizeText(candidate.website);
  const nameAddress = `${normalizeText(candidate.companyName)}|${normalizeText(candidate.address || candidate.normalizedCity || candidate.city)}`;

  return existingLeads.find((lead) => {
    if (externalId && normalizeText(lead.externalId) === externalId) {
      return true;
    }
    if (phone && normalizePhone(lead.phone) === phone) {
      return true;
    }
    if (website && normalizeText(lead.website) === website) {
      return true;
    }
    return normalizeText(`${lead.companyName}|${lead.address || lead.normalizedCity || lead.city}`) === nameAddress;
  }) ?? null;
}

function estimateDays(totalLeads, dailyTarget) {
  if (!totalLeads || !dailyTarget) {
    return 0;
  }
  return Math.ceil(totalLeads / dailyTarget);
}

function buildMonthlyPlan(leads, monthKey, dailyTarget, priorityCities = [], priorityBranches = []) {
  const { buildMonthlyPlan: buildMonthlyPlanInternal } = require("./engines/planning-engine");
  const result = buildMonthlyPlanInternal(leads, monthKey, dailyTarget, priorityCities, priorityBranches);
  return {
    ...result,
    categorySummaries: result.branchSummaries
  };
}

function buildScheduleItems(leads, monthKey, dailyTarget, priorityCities = [], priorityBranches = []) {
  return buildMonthlyPlan(leads, monthKey, dailyTarget, priorityCities, priorityBranches).scheduleItems;
}

function createEmptyState() {
  return {
    leads: [],
    logEntries: [],
    reminders: [],
    campaigns: [],
    scheduleItems: [],
    callRecords: [],
    settings: {
      apiKey: "",
      telavoxToken: "",
      telavoxFromDate: "",
      dailyTarget: 40,
      lastSelectedCampaignId: "",
      lastPlannedMonth: new Date().toISOString().slice(0, 7)
    }
  };
}

module.exports = {
  buildMonthlyPlan,
  buildScheduleItems,
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  createEmptyState,
  createId,
  estimateDays,
  findDuplicateLead,
  normalizeCampaign,
  normalizeCallRecord,
  normalizeLead,
  normalizeLogEntry,
  normalizePriority,
  normalizeReminder,
  normalizeScheduleItem,
  normalizeStatus
};
