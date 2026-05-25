const { LEAD_STATUSES } = require("../domain");
const {
  normalizePhone,
  normalizePhoneNumber,
  phonesMatch,
  textMentionsPhone
} = require("../phone-utils");

const HARD_MATCH_TYPES = new Set(["exact_phone", "extra_phone", "notes_phone", "call_intent"]);
const INFERRED_MATCH_TYPES = new Set(["active_queue_inferred", "timeblock_inferred"]);
const CONNECTED_CALL_THRESHOLD_SECONDS = 20;
const DEFAULT_GLOBAL_DIALS_PER_SALE = 40;
const DEFAULT_AVERAGE_ORDER_VALUE = 10000;
const TELAVOX_LEGACY_LIMITATION =
  "Legacy Telavox /calls returns the last 30 calls and is limited to the last 4 months. Local history is preserved between syncs.";

const SERIES_DEFINITIONS = [
  { key: "rawTelavoxCalls", label: "Raw Telavox calls", group: "Telavox", color: "#2563eb", scale: "count" },
  { key: "outboundTotal", label: "Outbound total", group: "Telavox", color: "#1d4ed8", scale: "count" },
  { key: "incomingCalls", label: "Inbound", group: "Telavox", color: "#059669", scale: "count" },
  { key: "missedCalls", label: "Missed", group: "Telavox", color: "#dc2626", scale: "count" },
  { key: "outboundSalesDials", label: "Outbound sales dials", group: "Telavox", color: "#10b981", scale: "count" },
  { key: "connectedSalesCalls", label: "Connected sales calls", group: "Telavox", color: "#0f766e", scale: "count" },
  { key: "totalCallMinutes", label: "Total call minutes", group: "Telavox", color: "#7c3aed", scale: "minutes" },
  { key: "averageCallLength", label: "Average call length", group: "Telavox", color: "#8b5cf6", scale: "seconds" },
  { key: "unmatchedCalls", label: "Unmatched calls", group: "Telavox", color: "#ef4444", scale: "count" },
  { key: "hardMatchedCalls", label: "Hard matched", group: "Telavox", color: "#4f46e5", scale: "count" },
  { key: "inferredMatchedCalls", label: "Inferred matched", group: "Telavox", color: "#f59e0b", scale: "count" },
  { key: "handledCustomers", label: "Handled customers", group: "CRM", color: "#0f9f9a", scale: "count" },
  { key: "contactedCustomers", label: "Contacted customers", group: "CRM", color: "#d97706", scale: "count" },
  { key: "statusChanges", label: "Status changes", group: "CRM", color: "#64748b", scale: "count" },
  ...LEAD_STATUSES.map((status, index) => ({
    key: `status:${status}`,
    label: status,
    group: "CRM",
    color: ["#2563eb", "#64748b", "#d97706", "#0f9f9a", "#0891b2", "#4f46e5", "#059669", "#dc2626"][index] || "#64748b",
    scale: "count"
  })),
  { key: "followupsCreated", label: "Followups created", group: "CRM", color: "#f97316", scale: "count" },
  { key: "followupsCompleted", label: "Followups completed", group: "CRM", color: "#16a34a", scale: "count" },
  { key: "overdueFollowups", label: "Overdue followups", group: "CRM", color: "#b91c1c", scale: "count" },
  { key: "sales", label: "Sales", group: "Resultat", color: "#059669", scale: "count" },
  { key: "revenue", label: "Revenue", group: "Resultat", color: "#0f766e", scale: "money" },
  { key: "averageOrderValue", label: "Average order value", group: "Resultat", color: "#14b8a6", scale: "money" },
  { key: "revenuePerDial", label: "Revenue per dial", group: "Resultat", color: "#0284c7", scale: "money" },
  { key: "expectedKrPerDial", label: "Expected kr/dial", group: "Resultat", color: "#7c2d12", scale: "money" }
];

function buildStatisticsDecisionEngine(rawState = {}, options = {}) {
  const state = normalizeStateShape(rawState);
  const range = normalizeRange(options);
  const groupBy = ["day", "week", "month"].includes(options.groupBy) ? options.groupBy : "week";
  const attributionMode = options.attributionMode || "hard_inferred";
  const connectedThresholdSeconds = Number(state.settings.connectedCallThresholdSeconds) || CONNECTED_CALL_THRESHOLD_SECONDS;
  const campaignId = options.campaignId || "";
  const todayKey = formatLocalDate(new Date());

  const allActiveLeads = state.leads.filter((lead) => !lead.isDeleted);
  const activeLeads = allActiveLeads.filter((lead) => (campaignId ? lead.listId === campaignId : true));
  const activeLeadIds = new Set(activeLeads.map((lead) => lead.id));
  const campaignById = new Map(state.campaigns.map((campaign) => [campaign.id, campaign]));
  const periodLogs = state.logEntries.filter((entry) => isIsoInRange(entry.createdAt, range));
  const periodReminders = state.reminders.filter((reminder) => isDateInRange(reminder.dueDate || dateKeyFromIso(reminder.createdAt), range));
  const rawTelavoxCalls = state.callRecords
    .filter((record) => record.provider === "telavox")
    .filter((record) => isIsoInRange(record.happenedAt, range));
  const attributedCallsAll = buildCallAttributions({
    calls: rawTelavoxCalls,
    leads: allActiveLeads,
    logEntries: state.logEntries,
    reminders: state.reminders,
    callIntents: state.callIntents,
    campaigns: state.campaigns,
    activeQueue: options.activeQueue,
    settings: state.settings
  });
  const scopedCalls = attributedCallsAll.filter((call) => {
    if (!campaignId) {
      return true;
    }
    return call.matchedLeadId ? activeLeadIds.has(call.matchedLeadId) : call.matchedListId === campaignId || call.matchedCampaignId === campaignId;
  });
  const analysisCalls = filterCallsByAttributionMode(scopedCalls, attributionMode);
  const hardCalls = scopedCalls.filter((call) => call.isCountedForHardIndustryStats);
  const inferredCalls = scopedCalls.filter((call) => call.isCountedForInferredIndustryStats);
  const unmatchedCalls = scopedCalls.filter((call) => call.matchType === "unmatched");
  const ignoredCalls = scopedCalls.filter((call) => call.matchType === "ignored_private_or_internal");
  const outboundSalesDialsHard = hardCalls.filter((call) => call.isOutboundSalesDial);
  const outboundSalesDialsInferred = inferredCalls.filter((call) => call.isOutboundSalesDial);
  const connectedSalesCalls = scopedCalls.filter((call) => call.isConnectedSalesCall);
  const qualifiedCalls = scopedCalls.filter((call) => call.isQualifiedCall);
  const handlingLeadIds = buildHandledLeadSet({ activeLeads, activeLeadIds, periodLogs, calls: scopedCalls, range });
  const contactedLeadIds = buildContactedLeadSet({ activeLeads, activeLeadIds, periodLogs, calls: scopedCalls, handlingLeadIds, range });
  const salesLeadIds = buildSalesLeadSet({ activeLeads, activeLeadIds, periodLogs, range });
  const revenueByLeadId = new Map(activeLeads.map((lead) => [lead.id, getLeadRevenue(lead)]));
  const totalRevenue = [...salesLeadIds].reduce((sum, leadId) => sum + (revenueByLeadId.get(leadId) || 0), 0);
  const totalCallSeconds = scopedCalls.reduce((sum, call) => sum + call.durationSeconds, 0);
  const connectedSeconds = connectedSalesCalls.reduce((sum, call) => sum + call.durationSeconds, 0);
  const statusCounts = Object.fromEntries(LEAD_STATUSES.map((status) => [status, 0]));
  activeLeads.forEach((lead) => {
    statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
  });

  const globalBaseline = buildGlobalBaseline({ calls: scopedCalls, salesCount: salesLeadIds.size, revenue: totalRevenue });
  const segmentStats = buildSegmentStats({
    leads: activeLeads,
    calls: scopedCalls,
    periodLogs,
    reminders: state.reminders,
    salesLeadIds,
    handlingLeadIds,
    contactedLeadIds,
    campaignById,
    range,
    todayKey,
    globalBaseline
  });
  const buckets = buildBuckets({
    range,
    groupBy,
    calls: analysisCalls,
    leads: activeLeads,
    periodLogs,
    periodReminders,
    handlingLeadIds,
    contactedLeadIds,
    salesLeadIds,
    revenueByLeadId,
    globalBaseline
  });
  const kpis = {
    totalLeads: activeLeads.length,
    newLeads: activeLeads.filter((lead) => isIsoInRange(lead.createdAt, range)).length,
    handledCRMCustomers: handlingLeadIds.size,
    contactedCRMCustomers: contactedLeadIds.size,
    sales: salesLeadIds.size,
    revenue: totalRevenue,
    averageOrderValue: safeDivide(totalRevenue, salesLeadIds.size),
    rawTelavoxTotal: scopedCalls.length,
    outboundTotal: scopedCalls.filter((call) => call.isOutboundTotal).length,
    outboundSalesDials: outboundSalesDialsHard.length + outboundSalesDialsInferred.length,
    connectedSalesCalls: connectedSalesCalls.length,
    hardMatchedCalls: hardCalls.length,
    inferredCalls: inferredCalls.length,
    unmatchedCalls: unmatchedCalls.length,
    dialsPerSale: safeDivide(outboundSalesDialsHard.length, salesLeadIds.size),
    connectedCallsPerSale: safeDivide(connectedSalesCalls.length, salesLeadIds.size),
    revenuePerDial: safeDivide(totalRevenue, outboundSalesDialsHard.length),
    revenuePerHour: safeDivide(totalRevenue, totalCallSeconds / 3600),
    expectedKrPerDialBaseline: globalBaseline.globalSaleRate * globalBaseline.globalAverageOrder
  };
  const telavoxTotals = {
    rawCallsTotal: scopedCalls.length,
    outgoingTotal: scopedCalls.filter((call) => call.direction === "outgoing").length,
    incomingTotal: scopedCalls.filter((call) => call.direction === "incoming").length,
    missed: scopedCalls.filter((call) => call.direction === "missed").length,
    outboundSalesDials: outboundSalesDialsHard.length + outboundSalesDialsInferred.length,
    connectedSalesCalls: connectedSalesCalls.length,
    matchedHard: hardCalls.length,
    matchedInferred: inferredCalls.length,
    unmatched: unmatchedCalls.length,
    ignoredPrivateInternal: ignoredCalls.length,
    totalCallTimeSeconds: totalCallSeconds,
    averageCallLengthSeconds: safeDivide(totalCallSeconds, scopedCalls.length),
    averageConnectedCallLengthSeconds: safeDivide(connectedSeconds, connectedSalesCalls.length)
  };

  return {
    range,
    groupBy,
    attributionMode,
    campaignId,
    seriesDefinitions: SERIES_DEFINITIONS,
    statusCounts,
    kpis,
    insights: buildInsights({ kpis, telavoxTotals, qualifiedCalls, handlingLeadIds, contactedLeadIds, totalCallSeconds, salesCount: salesLeadIds.size }),
    buckets,
    segmentStats,
    telavoxTotals,
    coverage: buildTelavoxCoverage({ state, range, calls: rawTelavoxCalls }),
    unmatchedCalls: scopedCalls
      .filter((call) => ["unmatched", "timeblock_inferred", "active_queue_inferred"].includes(call.matchType))
      .sort((left, right) => new Date(right.datetime) - new Date(left.datetime))
      .slice(0, 100),
    exports: {
      rawTelavoxCalls,
      attributedCalls: scopedCalls,
      segmentStats,
      unmatchedCalls,
      generatedMetrics: {
        kpis,
        telavoxTotals,
        globalBaseline,
        coverage: buildTelavoxCoverage({ state, range, calls: rawTelavoxCalls })
      }
    }
  };
}

function buildCallAttributions({ calls = [], leads = [], logEntries = [], reminders = [], callIntents = [], campaigns = [], activeQueue = null, settings = {} }) {
  const connectedThresholdSeconds = Number(settings.connectedCallThresholdSeconds) || CONNECTED_CALL_THRESHOLD_SECONDS;
  const campaignById = new Map(campaigns.map((campaign) => [campaign.id, campaign]));
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const logsByLeadId = groupByValue(logEntries, "leadId");
  const remindersByLeadId = groupByValue(reminders, "leadId");
  const normalizedLeads = leads.map((lead) => ({
    lead,
    primaryPhone: normalizePhone(lead.phone),
    extraPhones: [
      ...(Array.isArray(lead.extraPhones) ? lead.extraPhones : []),
      ...(Array.isArray(lead.contactPhones) ? lead.contactPhones : [])
    ].map(normalizePhone).filter(Boolean)
  }));
  const firstPass = calls.map((record) => {
    const base = makeAttributionBase(record);
    const manual = applyManualResolution(base, record, leadById, campaignById);
    if (manual) {
      return finalizeAttribution(manual, connectedThresholdSeconds, logsByLeadId, remindersByLeadId);
    }
    if (isPrivateOrInternalNumber(base.originalNumber, base.normalizedNumber)) {
      return finalizeAttribution({
        ...base,
        matchType: "ignored_private_or_internal",
        matchConfidence: 0,
        attributionReason: "Privat, dolt eller internt nummer."
      }, connectedThresholdSeconds, logsByLeadId, remindersByLeadId);
    }

    const storedLead = record.leadId ? leadById.get(record.leadId) : null;
    const exactLead = storedLead || normalizedLeads.find((item) => item.primaryPhone && phonesMatch(item.primaryPhone, base.normalizedNumber))?.lead;
    if (exactLead) {
      return finalizeAttribution(assignLead(base, exactLead, campaignById, {
        matchType: "exact_phone",
        matchConfidence: 1,
        attributionReason: storedLead ? "Sparad leadkoppling eller exakt telefonnummmer." : "Exakt match mot lead.phone."
      }), connectedThresholdSeconds, logsByLeadId, remindersByLeadId);
    }

    const extraLead = normalizedLeads.find((item) => item.extraPhones.some((phone) => phonesMatch(phone, base.normalizedNumber)))?.lead;
    if (extraLead) {
      return finalizeAttribution(assignLead(base, extraLead, campaignById, {
        matchType: "extra_phone",
        matchConfidence: 0.95,
        attributionReason: "Matchad mot extraPhones/contactPhones."
      }), connectedThresholdSeconds, logsByLeadId, remindersByLeadId);
    }

    const noteLead = leads.find((lead) => leadMentionsPhone(lead, logsByLeadId.get(lead.id) || [], remindersByLeadId.get(lead.id) || [], base.normalizedNumber));
    if (noteLead) {
      return finalizeAttribution(assignLead(base, noteLead, campaignById, {
        matchType: "notes_phone",
        matchConfidence: 0.9,
        attributionReason: "Numret hittades i kund-, aktivitets- eller reminderanteckning."
      }), connectedThresholdSeconds, logsByLeadId, remindersByLeadId);
    }

    const intent = findMatchingCallIntent(base, callIntents);
    if (intent) {
      const lead = intent.leadId ? leadById.get(intent.leadId) : null;
      const minutes = Math.abs(new Date(base.datetime) - new Date(intent.timestamp || intent.createdAt || "")) / 60000;
      const confidence = Math.max(0.9, Math.min(1, 1 - (minutes / 30) * 0.1));
      return finalizeAttribution(assignLead({
        ...base,
        matchedIndustry: intent.selectedIndustry || "",
        matchedCity: intent.selectedCity || "",
        matchedListId: intent.selectedListId || "",
        matchedCampaignId: intent.selectedListId || "",
        currentQueueId: intent.currentQueueId || ""
      }, lead, campaignById, {
        matchType: "call_intent",
        matchConfidence: confidence,
        attributionReason: "Matchad mot Ring-klick i appen inom tidsfonster."
      }), connectedThresholdSeconds, logsByLeadId, remindersByLeadId);
    }

    const activeQueueMatch = inferFromActiveQueue(base, activeQueue);
    if (activeQueueMatch) {
      return finalizeAttribution({
        ...base,
        ...activeQueueMatch,
        matchType: "active_queue_inferred",
        matchConfidence: activeQueueMatch.matchConfidence,
        attributionReason: "Antagen fran aktiv plan-ko. Inte hard data."
      }, connectedThresholdSeconds, logsByLeadId, remindersByLeadId);
    }

    return finalizeAttribution({
      ...base,
      matchType: "unmatched",
      matchConfidence: 0,
      attributionReason: "Ingen saker traff."
    }, connectedThresholdSeconds, logsByLeadId, remindersByLeadId);
  });

  return applyTimeblockInference(firstPass, connectedThresholdSeconds, logsByLeadId, remindersByLeadId);
}

function makeAttributionBase(record) {
  const phone = normalizePhoneNumber(record.remoteNumber || record.originalNumber || "");
  const datetime = record.happenedAt || record.datetime || record.createdAt || new Date().toISOString();
  return {
    id: record.id,
    telavoxId: record.telavoxId || record.externalId || "",
    datetime,
    date: dateKeyFromIso(datetime),
    direction: normalizeDirection(record.direction),
    durationSeconds: Number(record.durationSeconds) || 0,
    originalNumber: record.originalNumber || record.remoteNumber || phone.originalNumber,
    normalizedNumber: record.normalizedNumber || phone.normalizedNumber,
    displayNumber: record.displayNumber || phone.displayNumber,
    matchedLeadId: "",
    matchedLeadName: "",
    matchedIndustry: "",
    matchedCity: "",
    matchedListId: "",
    matchedCampaignId: "",
    matchType: "unmatched",
    matchConfidence: 0,
    isRawTelavoxCall: true,
    isOutboundTotal: normalizeDirection(record.direction) === "outgoing",
    isOutboundSalesDial: false,
    isConnectedSalesCall: false,
    isQualifiedCall: false,
    isCountedForHardIndustryStats: false,
    isCountedForInferredIndustryStats: false,
    attributionReason: ""
  };
}

function applyManualResolution(base, record, leadById, campaignById) {
  const resolution = record.manualResolution || {};
  if (resolution.type === "ignore") {
    return {
      ...base,
      matchType: "ignored_private_or_internal",
      matchConfidence: 0,
      attributionReason: resolution.reason || "Manuellt ignorerad."
    };
  }
  if (resolution.type === "private_internal") {
    return {
      ...base,
      matchType: "ignored_private_or_internal",
      matchConfidence: 0,
      attributionReason: "Manuellt markerad som privat/internt."
    };
  }
  if (resolution.leadId && leadById.has(resolution.leadId)) {
    return assignLead(base, leadById.get(resolution.leadId), campaignById, {
      matchType: resolution.matchType || "extra_phone",
      matchConfidence: Number(resolution.matchConfidence) || 0.95,
      attributionReason: resolution.reason || "Manuellt kopplad till lead."
    });
  }
  return null;
}

function assignLead(base, lead, campaignById, attribution) {
  const campaign = campaignById.get(lead?.listId || "");
  return {
    ...base,
    matchedLeadId: lead?.id || "",
    matchedLeadName: lead?.companyName || "",
    matchedIndustry: getLeadIndustry(lead) || campaign?.normalizedBranch || "",
    matchedCity: getLeadCity(lead) || campaign?.targetMarkets?.[0] || campaign?.cities?.[0] || "",
    matchedListId: lead?.listId || "",
    matchedCampaignId: lead?.listId || "",
    ...attribution
  };
}

function finalizeAttribution(call, connectedThresholdSeconds, logsByLeadId, remindersByLeadId) {
  const isHard = HARD_MATCH_TYPES.has(call.matchType);
  const isInferred = INFERRED_MATCH_TYPES.has(call.matchType);
  const isIgnored = call.matchType === "ignored_private_or_internal";
  const hasSegment = Boolean(call.matchedLeadId || call.matchedIndustry || call.matchedCity || call.matchedListId);
  const isOutboundSalesDial = call.direction === "outgoing" && !isIgnored && hasSegment && (isHard || isInferred);
  const isConnectedSalesCall = isOutboundSalesDial && call.durationSeconds >= connectedThresholdSeconds;
  return {
    ...call,
    isOutboundSalesDial,
    isConnectedSalesCall,
    isQualifiedCall: isQualifiedCall(call, logsByLeadId, remindersByLeadId) || isConnectedSalesCall,
    isCountedForHardIndustryStats: isHard,
    isCountedForInferredIndustryStats: isInferred
  };
}

function isQualifiedCall(call, logsByLeadId, remindersByLeadId) {
  if (!call.matchedLeadId) {
    return false;
  }
  const callDate = call.date;
  const logs = logsByLeadId.get(call.matchedLeadId) || [];
  const reminders = remindersByLeadId.get(call.matchedLeadId) || [];
  return logs.some((entry) => dateKeyFromIso(entry.createdAt) === callDate && isQualifyingLog(entry)) ||
    reminders.some((reminder) => (reminder.dueDate || dateKeyFromIso(reminder.createdAt)) === callDate);
}

function isQualifyingLog(entry) {
  const type = String(entry.type || "");
  const text = `${entry.title || ""} ${entry.text || ""}`.toLowerCase();
  return ["activity", "call", "status", "note", "update", "reminder-complete"].includes(type) ||
    text.includes("status") ||
    text.includes("mail") ||
    text.includes("offert") ||
    text.includes("closed") ||
    text.includes("samtal");
}

function applyTimeblockInference(calls, connectedThresholdSeconds, logsByLeadId, remindersByLeadId) {
  const hardByBlock = new Map();
  calls.forEach((call) => {
    if (!call.isCountedForHardIndustryStats || !call.isOutboundSalesDial) {
      return;
    }
    const blockKey = getTimeblockKey(call.datetime);
    if (!blockKey) {
      return;
    }
    if (!hardByBlock.has(blockKey)) {
      hardByBlock.set(blockKey, []);
    }
    hardByBlock.get(blockKey).push(call);
  });

  return calls.map((call) => {
    if (call.matchType !== "unmatched" || call.direction !== "outgoing") {
      return call;
    }
    const blockCalls = hardByBlock.get(getTimeblockKey(call.datetime)) || [];
    if (blockCalls.length < 5) {
      return call;
    }
    const ranked = [...countSegments(blockCalls).entries()]
      .map(([key, value]) => ({ key, ...value }))
      .sort((left, right) => right.count - left.count);
    const top = ranked[0];
    if (!top || top.count / blockCalls.length < 0.7) {
      return call;
    }
    return finalizeAttribution({
      ...call,
      matchedIndustry: top.industry,
      matchedCity: top.city,
      matchedListId: top.listId,
      matchedCampaignId: top.listId,
      matchType: "timeblock_inferred",
      matchConfidence: 0.5,
      attributionReason: "Svagt antagen via tidsblock: minst 5 harda samtal och 70% samma segment."
    }, connectedThresholdSeconds, logsByLeadId, remindersByLeadId);
  });
}

function countSegments(calls) {
  const result = new Map();
  calls.forEach((call) => {
    const industry = call.matchedIndustry || "Okategoriserat";
    const city = call.matchedCity || "Okand stad";
    const listId = call.matchedListId || "";
    const key = `${industry}|${city}|${listId}`;
    if (!result.has(key)) {
      result.set(key, { count: 0, industry, city, listId });
    }
    result.get(key).count += 1;
  });
  return result;
}

function findMatchingCallIntent(call, callIntents) {
  if (!call.normalizedNumber) {
    return null;
  }
  return [...callIntents]
    .filter((intent) => intent.normalizedNumber && phonesMatch(intent.normalizedNumber, call.normalizedNumber))
    .map((intent) => ({
      intent,
      diff: Math.abs(new Date(call.datetime) - new Date(intent.timestamp || intent.createdAt || ""))
    }))
    .filter((item) => Number.isFinite(item.diff) && item.diff <= 30 * 60 * 1000)
    .sort((left, right) => left.diff - right.diff)[0]?.intent || null;
}

function inferFromActiveQueue(call, activeQueue) {
  if (!activeQueue || call.direction !== "outgoing") {
    return null;
  }
  if (activeQueue.fromDate && call.date < activeQueue.fromDate) {
    return null;
  }
  if (activeQueue.toDate && call.date > activeQueue.toDate) {
    return null;
  }
  const matchedIndustry = activeQueue.selectedIndustry || activeQueue.industry || "";
  const matchedCity = activeQueue.selectedCity || activeQueue.city || "";
  const matchedListId = activeQueue.selectedListId || activeQueue.campaignId || "";
  if (!matchedIndustry && !matchedCity && !matchedListId) {
    return null;
  }
  return {
    matchedIndustry,
    matchedCity,
    matchedListId,
    matchedCampaignId: matchedListId,
    matchConfidence: matchedListId ? 0.8 : 0.65
  };
}

function leadMentionsPhone(lead, logs, reminders, phone) {
  const haystacks = [
    lead.notes,
    lead.contactName,
    ...logs.map((entry) => `${entry.title || ""} ${entry.text || ""}`),
    ...reminders.map((reminder) => `${reminder.type || ""} ${reminder.note || ""}`)
  ];
  return haystacks.some((text) => textMentionsPhone(text, phone));
}

function buildHandledLeadSet({ activeLeads, activeLeadIds, periodLogs, calls, range }) {
  const handled = new Set();
  periodLogs.forEach((entry) => {
    if (activeLeadIds.has(entry.leadId) && isHandlingLog(entry)) {
      handled.add(entry.leadId);
    }
  });
  calls.forEach((call) => {
    if (call.matchedLeadId && activeLeadIds.has(call.matchedLeadId)) {
      handled.add(call.matchedLeadId);
    }
  });
  activeLeads.forEach((lead) => {
    if (lead.status !== "Ny" && isIsoInRange(lead.updatedAt, range)) {
      handled.add(lead.id);
    }
  });
  return handled;
}

function buildContactedLeadSet({ activeLeads, activeLeadIds, periodLogs, calls, handlingLeadIds, range }) {
  const contacted = new Set();
  activeLeads.forEach((lead) => {
    if (isContactedStatus(lead.status) && (handlingLeadIds.has(lead.id) || isIsoInRange(lead.updatedAt, range))) {
      contacted.add(lead.id);
    }
  });
  calls.forEach((call) => {
    if (call.matchedLeadId && activeLeadIds.has(call.matchedLeadId) && call.isConnectedSalesCall) {
      contacted.add(call.matchedLeadId);
    }
  });
  periodLogs.forEach((entry) => {
    if (activeLeadIds.has(entry.leadId) && logMentionsContact(entry)) {
      contacted.add(entry.leadId);
    }
  });
  return contacted;
}

function buildSalesLeadSet({ activeLeads, activeLeadIds, periodLogs, range }) {
  const sales = new Set();
  activeLeads.forEach((lead) => {
    if (lead.status === "Closed" && isIsoInRange(lead.updatedAt, range)) {
      sales.add(lead.id);
    }
  });
  periodLogs.forEach((entry) => {
    if (activeLeadIds.has(entry.leadId) && logMentionsStatus(entry, "Closed")) {
      sales.add(entry.leadId);
    }
  });
  return sales;
}

function buildGlobalBaseline({ calls, salesCount, revenue }) {
  const globalOutboundSalesDials = calls.filter((call) => call.isOutboundSalesDial && call.isCountedForHardIndustryStats).length;
  const globalDialsPerSale = salesCount ? globalOutboundSalesDials / salesCount : DEFAULT_GLOBAL_DIALS_PER_SALE;
  const globalSaleRate = globalOutboundSalesDials ? salesCount / globalOutboundSalesDials : 1 / DEFAULT_GLOBAL_DIALS_PER_SALE;
  const globalAverageOrder = salesCount && revenue ? revenue / salesCount : DEFAULT_AVERAGE_ORDER_VALUE;
  return {
    globalOutboundSalesDials,
    globalSalesCount: salesCount,
    globalRevenue: revenue,
    globalDialsPerSale,
    globalSaleRate,
    globalAverageOrder
  };
}

function buildSegmentStats(context) {
  const segments = new Map();
  const ensure = (type, parts) => {
    const key = buildSegmentKey(type, parts);
    if (!key) {
      return null;
    }
    if (!segments.has(key)) {
      segments.set(key, createEmptySegment(type, parts, context.campaignById));
    }
    return segments.get(key);
  };

  context.leads.forEach((lead) => {
    getLeadSegmentParts(lead, context.campaignById).forEach(({ type, parts }) => {
      const segment = ensure(type, parts);
      if (!segment) {
        return;
      }
      segment.availableLeads += isOpenLead(lead) ? 1 : 0;
      segment.closedLeads += lead.status === "Closed" ? 1 : 0;
      segment.notInterestedLeads += lead.status === "Inte intresserad" ? 1 : 0;
      segment.followupLeads += lead.status === "Ringa igen" ? 1 : 0;
      segment.warmLeads += isWarmStatus(lead.status) ? 1 : 0;
      segment.handledLeads += context.handlingLeadIds.has(lead.id) ? 1 : 0;
      segment.contactedLeads += context.contactedLeadIds.has(lead.id) ? 1 : 0;
      if (lead.status === "Ny" && !context.handlingLeadIds.has(lead.id)) {
        segment.untouchedLeads += 1;
      }
      if (context.salesLeadIds.has(lead.id)) {
        segment.salesCount += 1;
        segment.revenue += getLeadRevenue(lead);
      }
    });
  });

  context.reminders.forEach((reminder) => {
    if (reminder.completed || !reminder.leadId || !reminder.dueDate || reminder.dueDate >= context.todayKey) {
      return;
    }
    const lead = context.leads.find((item) => item.id === reminder.leadId);
    if (!lead) {
      return;
    }
    getLeadSegmentParts(lead, context.campaignById).forEach(({ type, parts }) => {
      const segment = ensure(type, parts);
      if (segment) {
        segment.overdueFollowups += 1;
      }
    });
  });

  context.calls.forEach((call) => {
    getCallSegmentParts(call, context.campaignById).forEach(({ type, parts }) => {
      const segment = ensure(type, parts);
      if (!segment) {
        return;
      }
      segment.rawTelavoxCalls += 1;
      segment.outboundTotal += call.isOutboundTotal ? 1 : 0;
      segment.outboundSalesDialsHard += call.isOutboundSalesDial && call.isCountedForHardIndustryStats ? 1 : 0;
      segment.outboundSalesDialsInferred += call.isOutboundSalesDial && call.isCountedForInferredIndustryStats ? 1 : 0;
      segment.connectedSalesCalls += call.isConnectedSalesCall ? 1 : 0;
      segment.qualifiedCalls += call.isQualifiedCall ? 1 : 0;
      segment.incomingCalls += call.direction === "incoming" ? 1 : 0;
      segment.missedCalls += call.direction === "missed" ? 1 : 0;
      segment.unmatchedCalls += call.matchType === "unmatched" ? 1 : 0;
      segment.hardMatchedCalls += call.isCountedForHardIndustryStats ? 1 : 0;
      segment.inferredMatchedCalls += call.isCountedForInferredIndustryStats ? 1 : 0;
      segment.totalCallSeconds += call.durationSeconds;
      if (call.isConnectedSalesCall) {
        segment.connectedCallSeconds += call.durationSeconds;
      }
    });
  });

  return [...segments.values()]
    .map((segment) => finalizeSegment(segment, context.globalBaseline))
    .filter((segment) => segment.availableLeads || segment.rawTelavoxCalls || segment.salesCount || segment.revenue)
    .sort((left, right) => right.priorityScore - left.priorityScore || right.expectedKrPerDial - left.expectedKrPerDial)
    .slice(0, 120);
}

function createEmptySegment(type, parts, campaignById) {
  const listName = parts.listId ? campaignById.get(parts.listId)?.name || parts.listId : "";
  return {
    segmentType: type,
    segmentKey: buildSegmentKey(type, parts),
    segmentLabel: buildSegmentLabel(type, parts, listName),
    industry: parts.industry || "",
    city: parts.city || "",
    listId: parts.listId || "",
    listName,
    availableLeads: 0,
    untouchedLeads: 0,
    handledLeads: 0,
    contactedLeads: 0,
    followupLeads: 0,
    overdueFollowups: 0,
    warmLeads: 0,
    closedLeads: 0,
    notInterestedLeads: 0,
    rawTelavoxCalls: 0,
    outboundTotal: 0,
    outboundSalesDialsHard: 0,
    outboundSalesDialsInferred: 0,
    outboundSalesDialsTotal: 0,
    connectedSalesCalls: 0,
    qualifiedCalls: 0,
    incomingCalls: 0,
    missedCalls: 0,
    unmatchedCalls: 0,
    hardMatchedCalls: 0,
    inferredMatchedCalls: 0,
    averageCallDuration: 0,
    averageConnectedCallDuration: 0,
    totalCallMinutes: 0,
    totalCallSeconds: 0,
    connectedCallSeconds: 0,
    salesCount: 0,
    revenue: 0,
    averageOrderValue: 0,
    dialsPerSale: 0,
    connectedCallsPerSale: 0,
    qualifiedCallsPerSale: 0,
    revenuePerDial: 0,
    revenuePerConnectedCall: 0,
    revenuePerHour: 0,
    closeRatePerDial: 0,
    closeRatePerConnectedCall: 0,
    sampleSize: 0,
    hardDataShare: 0,
    inferredDataShare: 0,
    dataQuality: "low",
    confidenceScore: 0,
    warningLabel: "",
    adjustedSaleRate: 0,
    adjustedAverageOrder: 0,
    expectedKrPerDial: 0,
    priorityScore: 0,
    why: "",
    warnings: []
  };
}

function finalizeSegment(segment, baseline) {
  segment.outboundSalesDialsTotal = segment.outboundSalesDialsHard + segment.outboundSalesDialsInferred;
  segment.averageCallDuration = safeDivide(segment.totalCallSeconds, segment.rawTelavoxCalls);
  segment.averageConnectedCallDuration = safeDivide(segment.connectedCallSeconds, segment.connectedSalesCalls);
  segment.totalCallMinutes = segment.totalCallSeconds / 60;
  segment.averageOrderValue = safeDivide(segment.revenue, segment.salesCount);
  segment.dialsPerSale = safeDivide(segment.outboundSalesDialsHard, segment.salesCount);
  segment.connectedCallsPerSale = safeDivide(segment.connectedSalesCalls, segment.salesCount);
  segment.qualifiedCallsPerSale = safeDivide(segment.qualifiedCalls, segment.salesCount);
  segment.revenuePerDial = safeDivide(segment.revenue, segment.outboundSalesDialsHard);
  segment.revenuePerConnectedCall = safeDivide(segment.revenue, segment.connectedSalesCalls);
  segment.revenuePerHour = safeDivide(segment.revenue, segment.totalCallSeconds / 3600);
  segment.closeRatePerDial = safeDivide(segment.salesCount, segment.outboundSalesDialsHard);
  segment.closeRatePerConnectedCall = safeDivide(segment.salesCount, segment.connectedSalesCalls);
  segment.sampleSize = segment.outboundSalesDialsHard;
  segment.hardDataShare = safeDivide(segment.hardMatchedCalls, segment.hardMatchedCalls + segment.inferredMatchedCalls);
  segment.inferredDataShare = safeDivide(segment.inferredMatchedCalls, segment.hardMatchedCalls + segment.inferredMatchedCalls);
  segment.dataQuality = segment.outboundSalesDialsHard >= 80 ? "good" : segment.outboundSalesDialsHard >= 40 ? "medium" : "low";
  segment.confidenceScore = Math.min(1, segment.outboundSalesDialsHard / 80);
  segment.warningLabel = segment.outboundSalesDialsHard < 40 ? "For lite data" : segment.inferredDataShare > 0.35 ? "Hog andel inferred" : "";
  segment.adjustedSaleRate = (segment.salesCount + 1) / (segment.outboundSalesDialsHard + baseline.globalDialsPerSale);
  segment.adjustedAverageOrder = (segment.revenue + baseline.globalAverageOrder * 2) / (segment.salesCount + 2);
  segment.expectedKrPerDial = segment.adjustedSaleRate * segment.adjustedAverageOrder;

  const confidenceMultiplier = Math.max(0.2, segment.confidenceScore);
  const availableLeadsMultiplier = segment.availableLeads <= 0 ? 0.2 : Math.min(1, Math.max(0.35, segment.availableLeads / 40));
  const freshnessMultiplier = segment.outboundSalesDialsHard > 0 && segment.availableLeads > 0 && segment.outboundSalesDialsHard / Math.max(segment.availableLeads, 1) > 2 ? 0.78 : 1;
  const pipelineMultiplier = 1 + Math.min(0.25, safeDivide(segment.warmLeads + segment.followupLeads, Math.max(segment.availableLeads, 1)) * 0.25);
  const dataQualityMultiplier = Math.max(0.55, segment.hardDataShare || (segment.outboundSalesDialsHard ? 1 : 0.55));
  segment.priorityScore = segment.expectedKrPerDial * confidenceMultiplier * availableLeadsMultiplier * freshnessMultiplier * pipelineMultiplier * dataQualityMultiplier;
  segment.warnings = buildSegmentWarnings(segment, baseline);
  segment.why = `Rankas pa ${roundCurrency(segment.expectedKrPerDial)} kr expectedKrPerDial, ${segment.outboundSalesDialsHard} harda saljdials, ${segment.salesCount} salj, ${roundCurrency(segment.revenue)} kr revenue, datakvalitet ${segment.dataQuality} och ${segment.availableLeads} leads kvar.`;
  return segment;
}

function buildSegmentWarnings(segment, baseline) {
  const warnings = [];
  if (segment.outboundSalesDialsHard < 40) {
    warnings.push("For lite data");
  }
  if (segment.inferredDataShare > 0.35) {
    warnings.push("Hog andel inferred");
  }
  if (segment.availableLeads < 10) {
    warnings.push("Fa leads kvar");
  }
  if (segment.closeRatePerDial > baseline.globalSaleRate && segment.revenuePerDial < baseline.globalSaleRate * baseline.globalAverageOrder * 0.6) {
    warnings.push("Lag kr/dial trots hog conversion");
  }
  if (segment.averageOrderValue > baseline.globalAverageOrder && segment.connectedSalesCalls < Math.max(5, segment.outboundSalesDialsHard * 0.15)) {
    warnings.push("Bra ordervarde men lag kontaktgrad");
  }
  return warnings;
}

function buildBuckets({ range, groupBy, calls, leads, periodLogs, periodReminders, handlingLeadIds, contactedLeadIds, salesLeadIds, revenueByLeadId, globalBaseline }) {
  const buckets = createBucketRange(range, groupBy);
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));

  calls.forEach((call) => {
    const bucket = bucketMap.get(getBucketKey(call.date, groupBy));
    if (!bucket) {
      return;
    }
    bucket.rawTelavoxCalls += 1;
    bucket.outboundTotal += call.isOutboundTotal ? 1 : 0;
    bucket.incomingCalls += call.direction === "incoming" ? 1 : 0;
    bucket.missedCalls += call.direction === "missed" ? 1 : 0;
    bucket.outboundSalesDials += call.isOutboundSalesDial ? 1 : 0;
    bucket.connectedSalesCalls += call.isConnectedSalesCall ? 1 : 0;
    bucket.totalCallSeconds += call.durationSeconds;
    bucket.totalCallMinutes = bucket.totalCallSeconds / 60;
    bucket.unmatchedCalls += call.matchType === "unmatched" ? 1 : 0;
    bucket.hardMatchedCalls += call.isCountedForHardIndustryStats ? 1 : 0;
    bucket.inferredMatchedCalls += call.isCountedForInferredIndustryStats ? 1 : 0;
  });

  periodLogs.forEach((entry) => {
    const bucket = bucketMap.get(getBucketKey(dateKeyFromIso(entry.createdAt), groupBy));
    if (!bucket) {
      return;
    }
    if (isHandlingLog(entry) && entry.leadId) {
      bucket.handledLeadIds.add(entry.leadId);
    }
    if (logMentionsContact(entry) && entry.leadId) {
      bucket.contactedLeadIds.add(entry.leadId);
    }
    if (logMentionsStatusChange(entry)) {
      bucket.statusChanges += 1;
    }
    LEAD_STATUSES.forEach((status) => {
      if (logMentionsStatus(entry, status)) {
        bucket[`status:${status}`] = (bucket[`status:${status}`] || 0) + 1;
      }
    });
  });

  periodReminders.forEach((reminder) => {
    const bucket = bucketMap.get(getBucketKey(reminder.dueDate || dateKeyFromIso(reminder.createdAt), groupBy));
    if (!bucket) {
      return;
    }
    bucket.followupsCreated += 1;
    if (reminder.completed) {
      bucket.followupsCompleted += 1;
    }
    if (!reminder.completed && reminder.dueDate && reminder.dueDate < formatLocalDate(new Date())) {
      bucket.overdueFollowups += 1;
    }
  });

  leads.forEach((lead) => {
    const dateKey = dateKeyFromIso(lead.updatedAt);
    const bucket = bucketMap.get(getBucketKey(dateKey, groupBy));
    if (!bucket || !isIsoInRange(lead.updatedAt, range)) {
      return;
    }
    if (handlingLeadIds.has(lead.id)) {
      bucket.handledLeadIds.add(lead.id);
    }
    if (contactedLeadIds.has(lead.id)) {
      bucket.contactedLeadIds.add(lead.id);
    }
    if (salesLeadIds.has(lead.id)) {
      bucket.salesLeadIds.add(lead.id);
      bucket.revenue += revenueByLeadId.get(lead.id) || 0;
    }
  });

  return buckets.map((bucket) => {
    bucket.handledCustomers = bucket.handledLeadIds.size;
    bucket.contactedCustomers = bucket.contactedLeadIds.size;
    bucket.sales = bucket.salesLeadIds.size;
    bucket.averageCallLength = safeDivide(bucket.totalCallSeconds, bucket.rawTelavoxCalls);
    bucket.averageOrderValue = safeDivide(bucket.revenue, bucket.sales);
    bucket.revenuePerDial = safeDivide(bucket.revenue, bucket.outboundSalesDials);
    bucket.expectedKrPerDial = globalBaseline.globalSaleRate * globalBaseline.globalAverageOrder;
    bucket.isEmpty = !SERIES_DEFINITIONS.some((series) => Number(bucket[series.key]) > 0);
    delete bucket.handledLeadIds;
    delete bucket.contactedLeadIds;
    delete bucket.salesLeadIds;
    return bucket;
  });
}

function createBucketRange(range, groupBy) {
  const buckets = [];
  let cursor = parseLocalDate(range.startKey);
  const end = parseLocalDate(range.endKey);
  if (groupBy === "week") {
    cursor = getStartOfWeek(cursor);
  }
  if (groupBy === "month") {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  }
  while (cursor <= end) {
    const dateKey = formatLocalDate(cursor);
    const key = getBucketKey(dateKey, groupBy);
    if (!buckets.some((bucket) => bucket.key === key)) {
      buckets.push(createEmptyBucket(key, getBucketLabel(cursor, groupBy)));
    }
    cursor = groupBy === "month"
      ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
      : addDays(cursor, groupBy === "week" ? 7 : 1);
  }
  return buckets;
}

function createEmptyBucket(key, label) {
  const bucket = {
    key,
    label,
    rawTelavoxCalls: 0,
    outboundTotal: 0,
    incomingCalls: 0,
    missedCalls: 0,
    outboundSalesDials: 0,
    connectedSalesCalls: 0,
    totalCallSeconds: 0,
    totalCallMinutes: 0,
    averageCallLength: 0,
    unmatchedCalls: 0,
    hardMatchedCalls: 0,
    inferredMatchedCalls: 0,
    handledCustomers: 0,
    contactedCustomers: 0,
    statusChanges: 0,
    followupsCreated: 0,
    followupsCompleted: 0,
    overdueFollowups: 0,
    sales: 0,
    revenue: 0,
    averageOrderValue: 0,
    revenuePerDial: 0,
    expectedKrPerDial: 0,
    handledLeadIds: new Set(),
    contactedLeadIds: new Set(),
    salesLeadIds: new Set()
  };
  LEAD_STATUSES.forEach((status) => {
    bucket[`status:${status}`] = 0;
  });
  return bucket;
}

function buildInsights({ kpis, telavoxTotals, qualifiedCalls, handlingLeadIds, contactedLeadIds, totalCallSeconds, salesCount }) {
  return [
    { title: "Raw calls per sale", value: safeDivide(telavoxTotals.rawCallsTotal, salesCount), detail: "Alla Telavox-samtal per salj." },
    { title: "Outbound sales dials per sale", value: safeDivide(kpis.outboundSalesDials, salesCount), detail: "Riktiga saljdials per salj." },
    { title: "Connected calls per sale", value: safeDivide(kpis.connectedSalesCalls, salesCount), detail: "Kopplade samtal over threshold." },
    { title: "Qualified calls per sale", value: safeDivide(qualifiedCalls.length, salesCount), detail: "Samtal med CRM-signal." },
    { title: "Handled CRM customers per sale", value: safeDivide(handlingLeadIds.size, salesCount), detail: "Hanterade kunder per salj." },
    { title: "Contacted CRM customers per sale", value: safeDivide(contactedLeadIds.size, salesCount), detail: "Kontaktade kunder per salj." },
    { title: "Call minutes per sale", value: safeDivide(totalCallSeconds / 60, salesCount), detail: "Samtalsminuter per salj." },
    { title: "Revenue per dial", value: kpis.revenuePerDial, detail: "Revenue per hard saljdial.", money: true },
    { title: "Revenue per hour", value: kpis.revenuePerHour, detail: "Revenue per samtalstimme.", money: true }
  ];
}

function buildTelavoxCoverage({ state, range, calls }) {
  const syncs = state.telavoxSyncs || [];
  const sortedSyncs = [...syncs].sort((left, right) => new Date(right.completedAt || right.startedAt || 0) - new Date(left.completedAt || left.startedAt || 0));
  const lastSync = sortedSyncs[0] || null;
  const overlapping = syncs.filter((sync) => rangesOverlap(range.startKey, range.endKey, sync.fromDate || "", sync.toDate || ""));
  return {
    lastSync: lastSync?.completedAt || lastSync?.startedAt || "",
    selectedFromDate: range.startKey,
    selectedToDate: range.endKey,
    fetchedCallsInMatchingSyncs: overlapping.reduce((sum, sync) => sum + (Number(sync.fetchedCount) || 0), 0),
    storedCallsInSelectedRange: calls.length,
    apiEndpoint: "GET https://api.telavox.se/calls",
    apiVersion: "legacy-v1",
    apiLimitation: TELAVOX_LEGACY_LIMITATION,
    hasLimitationWarning: true,
    mayBeIncomplete: !overlapping.length || true,
    warning: overlapping.length
      ? TELAVOX_LEGACY_LIMITATION
      : `Ingen lokal syncpost tacker valt intervall. ${TELAVOX_LEGACY_LIMITATION}`
  };
}

function filterCallsByAttributionMode(calls, attributionMode) {
  if (attributionMode === "hard") {
    return calls.filter((call) => call.isCountedForHardIndustryStats);
  }
  if (attributionMode === "raw") {
    return calls;
  }
  return calls.filter((call) => call.isCountedForHardIndustryStats || call.isCountedForInferredIndustryStats);
}

function getLeadSegmentParts(lead, campaignById) {
  const industry = getLeadIndustry(lead);
  const city = getLeadCity(lead);
  const listId = lead.listId || "";
  return buildSegmentParts(industry, city, listId);
}

function getCallSegmentParts(call) {
  return buildSegmentParts(call.matchedIndustry, call.matchedCity, call.matchedListId);
}

function buildSegmentParts(industry, city, listId) {
  const parts = [];
  if (industry) {
    parts.push({ type: "industry", parts: { industry } });
  }
  if (city) {
    parts.push({ type: "city", parts: { city } });
  }
  if (listId) {
    parts.push({ type: "list", parts: { listId } });
  }
  if (industry && city) {
    parts.push({ type: "industry_city", parts: { industry, city } });
  }
  if (industry && listId) {
    parts.push({ type: "industry_list", parts: { industry, listId } });
  }
  if (city && listId) {
    parts.push({ type: "city_list", parts: { city, listId } });
  }
  return parts;
}

function buildSegmentKey(type, parts) {
  const value = {
    industry: parts.industry,
    city: parts.city,
    list: parts.listId,
    industry_city: `${parts.industry || ""}|${parts.city || ""}`,
    industry_list: `${parts.industry || ""}|${parts.listId || ""}`,
    city_list: `${parts.city || ""}|${parts.listId || ""}`
  }[type];
  return value && !String(value).includes("undefined") ? `${type}:${value}` : "";
}

function buildSegmentLabel(type, parts, listName) {
  return {
    industry: parts.industry,
    city: parts.city,
    list: listName || parts.listId,
    industry_city: `${parts.industry} / ${parts.city}`,
    industry_list: `${parts.industry} / ${listName || parts.listId}`,
    city_list: `${parts.city} / ${listName || parts.listId}`
  }[type] || "Segment";
}

function normalizeStateShape(state) {
  return {
    leads: Array.isArray(state.leads) ? state.leads : [],
    logEntries: Array.isArray(state.logEntries) ? state.logEntries : [],
    reminders: Array.isArray(state.reminders) ? state.reminders : [],
    campaigns: Array.isArray(state.campaigns) ? state.campaigns : [],
    callRecords: Array.isArray(state.callRecords) ? state.callRecords : [],
    callIntents: Array.isArray(state.callIntents) ? state.callIntents : [],
    telavoxSyncs: Array.isArray(state.telavoxSyncs) ? state.telavoxSyncs : [],
    settings: state.settings || {}
  };
}

function normalizeRange(options) {
  let startKey = options.fromDate || options.startKey || formatLocalDate(addDays(new Date(), -29));
  let endKey = options.toDate || options.endKey || formatLocalDate(new Date());
  if (startKey > endKey) {
    [startKey, endKey] = [endKey, startKey];
  }
  return {
    startKey,
    endKey,
    label: startKey === endKey ? startKey : `${startKey} - ${endKey}`
  };
}

function isPrivateOrInternalNumber(originalNumber, normalizedNumber) {
  const text = String(originalNumber || "").toLowerCase();
  if (!normalizedNumber || ["unknown", "private", "anonymous", "dolt"].some((word) => text.includes(word))) {
    return true;
  }
  return normalizedNumber.length <= 5;
}

function getLeadIndustry(lead) {
  return lead?.normalizedBranch || lead?.category || "";
}

function getLeadCity(lead) {
  return lead?.targetMarketCity || lead?.normalizedCity || lead?.city || "";
}

function getLeadRevenue(lead) {
  const candidates = [lead.saleValue, lead.orderValue, lead.revenue, lead.dealValue, lead.value];
  const value = candidates.map((item) => Number(item)).find((item) => Number.isFinite(item) && item > 0);
  return value || 0;
}

function isOpenLead(lead) {
  return !["Closed", "Inte intresserad"].includes(lead.status);
}

function isWarmStatus(status) {
  return ["Ringa igen", "Skicka mail", "Mail skickat", "Aterkoppling", "Återkoppling", "Ã…terkoppling"].includes(status);
}

function isContactedStatus(status) {
  return ["Skicka mail", "Mail skickat", "Aterkoppling", "Återkoppling", "Ã…terkoppling", "Closed"].includes(status);
}

function isHandlingLog(entry) {
  return ["activity", "call", "status", "note", "reminder-complete", "update", "telavox-sync"].includes(entry.type);
}

function logMentionsContact(entry) {
  const text = normalizeForSearch(`${entry.title || ""} ${entry.text || ""}`);
  return ["kontakt", "mail", "offert", "closed", "aterkoppling", "samtal"].some((needle) => text.includes(needle));
}

function logMentionsStatusChange(entry) {
  return normalizeForSearch(`${entry.title || ""} ${entry.text || ""}`).includes("status");
}

function logMentionsStatus(entry, status) {
  const text = normalizeForSearch(`${entry.title || ""} ${entry.text || ""}`);
  return text.includes(normalizeForSearch(`Status andrad till ${status}`)) || text.includes(normalizeForSearch(status));
}

function normalizeForSearch(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ä/g, "a")
    .replace(/å/g, "a")
    .replace(/ö/g, "o");
}

function groupByValue(items, key) {
  const map = new Map();
  items.forEach((item) => {
    const value = item[key];
    if (!value) {
      return;
    }
    if (!map.has(value)) {
      map.set(value, []);
    }
    map.get(value).push(item);
  });
  return map;
}

function normalizeDirection(direction) {
  return ["incoming", "outgoing", "missed"].includes(direction) ? direction : "unknown";
}

function isIsoInRange(value, range) {
  const key = dateKeyFromIso(value);
  return Boolean(key) && key >= range.startKey && key <= range.endKey;
}

function isDateInRange(key, range) {
  return Boolean(key) && key >= range.startKey && key <= range.endKey;
}

function dateKeyFromIso(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value).slice(0, 10);
  }
  return formatLocalDate(date);
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseLocalDate(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function getStartOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  copy.setHours(12, 0, 0, 0);
  return copy;
}

function getBucketKey(dateKey, groupBy) {
  if (!dateKey) {
    return "";
  }
  const date = parseLocalDate(dateKey);
  if (groupBy === "week") {
    return formatLocalDate(getStartOfWeek(date));
  }
  if (groupBy === "month") {
    return formatLocalDate(new Date(date.getFullYear(), date.getMonth(), 1)).slice(0, 7);
  }
  return dateKey;
}

function getBucketLabel(date, groupBy) {
  if (groupBy === "week") {
    return `v.${getWeekNumber(date)}`;
  }
  if (groupBy === "month") {
    return new Intl.DateTimeFormat("sv-SE", { month: "short" }).format(date);
  }
  return new Intl.DateTimeFormat("sv-SE", { weekday: "short", day: "numeric" }).format(date);
}

function getWeekNumber(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
}

function getTimeblockKey(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return `${formatLocalDate(date)}T${String(date.getHours()).padStart(2, "0")}`;
}

function rangesOverlap(leftStart, leftEnd, rightStart, rightEnd) {
  const start = rightStart || leftStart;
  const end = rightEnd || leftEnd;
  return start <= leftEnd && end >= leftStart;
}

function safeDivide(numerator, denominator) {
  const n = Number(numerator) || 0;
  const d = Number(denominator) || 0;
  return d ? n / d : 0;
}

function roundCurrency(value) {
  return Math.round(Number(value) || 0);
}

module.exports = {
  HARD_MATCH_TYPES,
  INFERRED_MATCH_TYPES,
  SERIES_DEFINITIONS,
  TELAVOX_LEGACY_LIMITATION,
  buildCallAttributions,
  buildStatisticsDecisionEngine,
  filterCallsByAttributionMode,
  formatLocalDate,
  getBucketKey
};
