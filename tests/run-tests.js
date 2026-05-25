const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const { buildMonthlyPlan, buildScheduleItems, findDuplicateLead, normalizeLead } = require("../src/main/domain");
const { DataStore } = require("../src/main/data-store");
const { buildCallAttributions, buildStatisticsDecisionEngine } = require("../src/main/engines/statistics-engine");
const { normalizePhone, normalizePhoneNumber } = require("../src/main/phone-utils");
const { buildSearchQueries } = require("../src/main/places-service");

async function run() {
  const existing = [
    normalizeLead({ companyName: "Bygg AB", city: "Kalmar", phone: "070-123 45 67", externalId: "abc" })
  ];

  assert.ok(findDuplicateLead(existing, normalizeLead({ companyName: "Något", city: "Stockholm", externalId: "abc" })));
  assert.ok(findDuplicateLead(existing, normalizeLead({ companyName: "Annat", city: "Göteborg", phone: "0701234567" })));
  assert.ok(findDuplicateLead(existing, normalizeLead({ companyName: "Bygg AB", city: "Kalmar" })));
  assert.equal(findDuplicateLead(existing, normalizeLead({ companyName: "Måleri", city: "Kalmar" })), null);
  assert.equal(normalizePhone("070-123 45 67"), "46701234567");
  assert.equal(normalizePhone("+46 70 123 45 67"), "46701234567");
  assert.equal(normalizePhone("+46 (0)70-123 45 67"), "46701234567");
  assert.equal(normalizePhone("Telefon direkt 070 123 45 67"), "46701234567");
  assert.equal(normalizePhoneNumber("70 123 45 67").displayNumber, "+46 70 123 45 67");

  const leads = [
    normalizeLead({ companyName: "A", priority: "Hög" }),
    normalizeLead({ companyName: "B", priority: "Medel" }),
    normalizeLead({ companyName: "C", priority: "Låg" })
  ];

  const items = buildScheduleItems(leads, "2026-04", 2, [], []);
  assert.equal(items.length, 3);
  assert.equal(items[0].plannedDate, "2026-04-01");
  assert.equal(items[1].plannedDate, "2026-04-01");
  assert.equal(items[2].plannedDate, "2026-04-02");
  assert.equal(items[0].orderIndex, 0);
  assert.equal(items[1].orderIndex, 1);
  assert.equal(items[2].orderIndex, 0);

  const byggQueries = buildSearchQueries({ branch: "Byggare", city: "Kalmar" });
  assert.deepEqual(byggQueries, ["Byggare Kalmar"]);

  const explicitQueries = buildSearchQueries({ query: "byggare Kalmar" });
  assert.deepEqual(explicitQueries, ["byggare Kalmar"]);

  const unknownTradeQueries = buildSearchQueries({ branch: "Plattsättare", city: "Kalmar" });
  assert.deepEqual(unknownTradeQueries, ["Plattsättare Kalmar"]);

  const compoundTradeQueries = buildSearchQueries({ branch: "Poolfirma", city: "Kalmar" });
  assert.deepEqual(compoundTradeQueries, ["Poolfirma Kalmar"]);

  const iceCreamQueries = buildSearchQueries({ branch: "Glassbutik", city: "Uppsala" });
  assert.deepEqual(iceCreamQueries, ["Glassbutik Uppsala"]);

  const monthlyPlan = buildMonthlyPlan(
    [
      normalizeLead({ companyName: "Hansa Bygg", category: "Byggare", city: "Kalmar" }),
      normalizeLead({ companyName: "LittleBigBygg", category: "Byggare", city: "Kalmar" }),
      normalizeLead({ companyName: "Byggbolag X", category: "Byggare", city: "Växjö" }),
      normalizeLead({ companyName: "Kalles Krog", category: "Restaurang", city: "Växjö" })
    ],
    "2026-04",
    2,
    [],
    []
  );
  assert.equal(monthlyPlan.branchSummaries.length, 2);
  assert.equal(monthlyPlan.categorySummaries.length, 2);
  assert.equal(monthlyPlan.blocks.length >= 1, true);
  assert.equal(monthlyPlan.scheduleItems.length, 4);

  const attributionLeads = [
    normalizeLead({
      id: "lead-exact",
      companyName: "Exact AB",
      phone: "0701112233",
      extraPhones: ["0702223344"],
      notes: "Direktnummer 0703334455",
      normalizedBranch: "Byggare",
      normalizedCity: "Kalmar",
      targetMarketCity: "Kalmar",
      listId: "list-bygg"
    }),
    normalizeLead({
      id: "lead-intent",
      companyName: "Intent AB",
      phone: "0704440000",
      normalizedBranch: "Elektriker",
      normalizedCity: "Växjö",
      targetMarketCity: "Växjö"
    })
  ];
  const attributionCalls = [
    { id: "call-exact", provider: "telavox", direction: "outgoing", remoteNumber: "+46701112233", happenedAt: "2026-05-20T09:00:00.000Z", durationSeconds: 40 },
    { id: "call-extra", provider: "telavox", direction: "outgoing", remoteNumber: "070-222 33 44", happenedAt: "2026-05-20T09:05:00.000Z", durationSeconds: 10 },
    { id: "call-notes", provider: "telavox", direction: "outgoing", remoteNumber: "0703334455", happenedAt: "2026-05-20T09:10:00.000Z", durationSeconds: 25 },
    { id: "call-intent", provider: "telavox", direction: "outgoing", remoteNumber: "0705556677", happenedAt: "2026-05-20T09:16:00.000Z", durationSeconds: 30 },
    { id: "call-unmatched", provider: "telavox", direction: "outgoing", remoteNumber: "0709998888", happenedAt: "2026-05-20T09:20:00.000Z", durationSeconds: 5 },
    { id: "call-private", provider: "telavox", direction: "outgoing", remoteNumber: "private", happenedAt: "2026-05-20T09:25:00.000Z", durationSeconds: 0 }
  ];
  const attributed = buildCallAttributions({
    calls: attributionCalls,
    leads: attributionLeads,
    callIntents: [{
      leadId: "lead-intent",
      number: "0705556677",
      normalizedNumber: "46705556677",
      timestamp: "2026-05-20T09:15:00.000Z",
      selectedIndustry: "Elektriker",
      selectedCity: "Växjö"
    }]
  });
  assert.equal(attributed.find((call) => call.id === "call-exact").matchType, "exact_phone");
  assert.equal(attributed.find((call) => call.id === "call-extra").matchType, "extra_phone");
  assert.equal(attributed.find((call) => call.id === "call-notes").matchType, "notes_phone");
  assert.equal(attributed.find((call) => call.id === "call-intent").matchType, "call_intent");
  assert.equal(attributed.find((call) => call.id === "call-unmatched").matchType, "unmatched");
  assert.equal(attributed.find((call) => call.id === "call-private").matchType, "ignored_private_or_internal");

  const activeQueueAttributed = buildCallAttributions({
    calls: [{ id: "queue-call", provider: "telavox", direction: "outgoing", remoteNumber: "0707778899", happenedAt: "2026-05-20T10:00:00.000Z", durationSeconds: 22 }],
    leads: attributionLeads,
    activeQueue: { selectedIndustry: "Byggare", selectedCity: "Kalmar", selectedListId: "list-bygg", fromDate: "2026-05-20", toDate: "2026-05-20" }
  });
  assert.equal(activeQueueAttributed[0].matchType, "active_queue_inferred");

  const timeblockCalls = Array.from({ length: 5 }, (_, index) => ({
    id: `hard-${index}`,
    provider: "telavox",
    direction: "outgoing",
    remoteNumber: "0701112233",
    happenedAt: `2026-05-20T11:0${index}:00.000Z`,
    durationSeconds: 35
  })).concat({
    id: "timeblock",
    provider: "telavox",
    direction: "outgoing",
    remoteNumber: "0708887777",
    happenedAt: "2026-05-20T11:20:00.000Z",
    durationSeconds: 12
  });
  const timeblockAttributed = buildCallAttributions({ calls: timeblockCalls, leads: attributionLeads });
  assert.equal(timeblockAttributed.find((call) => call.id === "timeblock").matchType, "timeblock_inferred");

  const statsState = {
    leads: [
      normalizeLead({ id: "stats-a", companyName: "Stats A", phone: "0701000001", normalizedBranch: "Byggare", normalizedCity: "Kalmar", targetMarketCity: "Kalmar", status: "Closed", saleValue: 30000, updatedAt: "2026-05-20T12:00:00.000Z" }),
      normalizeLead({ id: "stats-b", companyName: "Stats B", phone: "0701000002", normalizedBranch: "Byggare", normalizedCity: "Kalmar", targetMarketCity: "Kalmar", status: "Ny", updatedAt: "2026-05-20T12:00:00.000Z" })
    ],
    campaigns: [],
    reminders: [{ id: "rem-1", leadId: "stats-b", dueDate: "2026-05-19", completed: false, createdAt: "2026-05-18T10:00:00.000Z" }],
    logEntries: [{ id: "log-closed", leadId: "stats-a", type: "activity", title: "Status ändrad", text: "Status ändrad till Closed", createdAt: "2026-05-20T12:00:00.000Z" }],
    callIntents: [],
    telavoxSyncs: [{ fromDate: "2026-05-01", toDate: "2026-05-31", fetchedCount: 3, completedAt: "2026-05-20T13:00:00.000Z" }],
    callRecords: [
      { id: "stats-call-hard", provider: "telavox", direction: "outgoing", remoteNumber: "0701000001", happenedAt: "2026-05-20T09:00:00.000Z", durationSeconds: 60 },
      { id: "stats-call-unmatched", provider: "telavox", direction: "outgoing", remoteNumber: "0700000999", happenedAt: "2026-05-20T09:10:00.000Z", durationSeconds: 10 }
    ],
    settings: {}
  };
  const stats = buildStatisticsDecisionEngine(statsState, { fromDate: "2026-05-20", toDate: "2026-05-20", groupBy: "day" });
  assert.equal(stats.kpis.rawTelavoxTotal, 2);
  assert.equal(stats.kpis.handledCRMCustomers, 1);
  assert.equal(stats.kpis.hardMatchedCalls, 1);
  assert.equal(stats.kpis.unmatchedCalls, 1);
  assert.equal(stats.segmentStats.find((segment) => segment.segmentType === "industry").dataQuality, "low");
  assert.equal(Math.round(stats.segmentStats.find((segment) => segment.segmentType === "industry").expectedKrPerDial), 30000);
  assert.equal(stats.segmentStats.find((segment) => segment.segmentType === "industry").priorityScore < stats.segmentStats.find((segment) => segment.segmentType === "industry").expectedKrPerDial, true);
  const qualityCalls = (count) => Array.from({ length: count }, (_, index) => ({
    id: `quality-${count}-${index}`,
    provider: "telavox",
    direction: "outgoing",
    remoteNumber: "0701000001",
    happenedAt: `2026-05-20T10:${String(index % 60).padStart(2, "0")}:00.000Z`,
    durationSeconds: 25
  }));
  assert.equal(buildStatisticsDecisionEngine({ ...statsState, callRecords: qualityCalls(40) }, { fromDate: "2026-05-20", toDate: "2026-05-20", groupBy: "day" }).segmentStats.find((segment) => segment.segmentType === "industry").dataQuality, "medium");
  assert.equal(buildStatisticsDecisionEngine({ ...statsState, callRecords: qualityCalls(80) }, { fromDate: "2026-05-20", toDate: "2026-05-20", groupBy: "day" }).segmentStats.find((segment) => segment.segmentType === "industry").dataQuality, "good");
  assert.equal(stats.buckets.length, 1);
  assert.equal(buildStatisticsDecisionEngine(statsState, { fromDate: "2026-05-01", toDate: "2026-05-31", groupBy: "week" }).buckets.length >= 4, true);
  assert.equal(buildStatisticsDecisionEngine(statsState, { fromDate: "2026-05-01", toDate: "2026-05-31", groupBy: "month" }).buckets.length, 1);
  assert.equal(stats.coverage.hasLimitationWarning, true);

  const queueStore = new DataStore(__dirname);
  const queueLeads = [
    normalizeLead({ id: "lead-a", companyName: "A", status: "Ny", createdAt: "2026-04-01T08:00:00.000Z", updatedAt: "2026-04-01T08:00:00.000Z" }),
    normalizeLead({ id: "lead-b", companyName: "B", status: "Ny", createdAt: "2026-04-01T09:00:00.000Z", updatedAt: "2026-04-01T09:00:00.000Z" }),
    normalizeLead({ id: "lead-c", companyName: "C", status: "Ny", createdAt: "2026-04-01T10:00:00.000Z", updatedAt: "2026-04-01T10:00:00.000Z" })
  ];
  queueStore.state = { ...queueStore.state, leads: queueLeads, scheduleItems: [] };
  assert.equal(queueStore.getNextLead({ excludeLeadIds: ["lead-a"] }).id, "lead-b");
  assert.equal(queueStore.getNextLead({ excludeLeadIds: ["lead-a", "lead-b"] }).id, "lead-c");

  const originalFetch = global.fetch;
  try {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({
        incoming: [
          { number: "+46701112233", datetimeISO: "2026-05-20T08:00:00.000Z", duration: 120, recordingId: "rec-1" }
        ],
        outgoing: [
          { number: "070-111 22 33", datetimeISO: "2026-05-20T09:00:00.000Z", duration: 60, recordingId: "0" }
        ],
        missed: [
          { number: "0739990000", datetimeISO: "2026-05-20T10:00:00.000Z", duration: 0, recordingId: "0" }
        ]
      })
    });
    const telavoxTempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sales-system-telavox-"));
    try {
      const telavoxStore = new DataStore(telavoxTempDir);
      telavoxStore.state = {
        ...telavoxStore.state,
        settings: { ...telavoxStore.state.settings, telavoxToken: "token" },
        leads: [normalizeLead({ id: "telavox-lead", companyName: "Tel AB", phone: "0701112233" })],
        callRecords: [
          {
            id: "old-call",
            leadId: "telavox-lead",
            provider: "telavox",
            externalId: "telavox:outgoing:2026-01-10T09:00:00.000Z:46701112233:none",
            direction: "outgoing",
            remoteNumber: "0701112233",
            happenedAt: "2026-01-10T09:00:00.000Z",
            durationSeconds: 45
          }
        ],
        logEntries: []
      };
      const firstSync = await telavoxStore.syncTelavoxPeriodCalls({ fromDate: "2026-05-20", toDate: "2026-05-20" });
      assert.equal(firstSync.totalFetched, 3);
      assert.equal(firstSync.inserted, 3);
      assert.equal(firstSync.updated, 0);
      assert.equal(firstSync.matchedCount, 2);
      assert.equal(firstSync.unmatchedCount, 1);
      assert.equal(telavoxStore.state.callRecords.filter((record) => record.leadId === "telavox-lead").length, 3);
      assert.equal(telavoxStore.state.callRecords.filter((record) => !record.leadId).length, 1);

      const secondSync = await telavoxStore.syncTelavoxPeriodCalls({ fromDate: "2026-05-20", toDate: "2026-05-20" });
      assert.equal(secondSync.inserted, 0);
      assert.equal(secondSync.updated, 3);
      assert.equal(telavoxStore.state.callRecords.length, 4);
      assert.ok(telavoxStore.state.callRecords.some((record) => record.id === "old-call"));
      assert.equal(firstSync.coverage.hasLimitationWarning, true);
    } finally {
      fs.rmSync(telavoxTempDir, { recursive: true, force: true });
    }
  } finally {
    global.fetch = originalFetch;
  }

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "sales-system-store-"));
  try {
    const persistentStore = new DataStore(tempDir);
    persistentStore.state = {
      ...persistentStore.state,
      leads: [normalizeLead({ id: "persisted-lead", companyName: "Persisted AB" })]
    };
    await persistentStore.save();
    await persistentStore.save();
    fs.writeFileSync(path.join(tempDir, "sales-system.json"), "{ broken", "utf8");

    const recoveredStore = new DataStore(tempDir);
    await recoveredStore.init();
    assert.equal(recoveredStore.state.leads.length, 1);
    assert.equal(recoveredStore.state.leads[0].id, "persisted-lead");

    const campaign = await recoveredStore.createCampaign({ id: "target-list", name: "Target List" });
    const firstImport = await recoveredStore.importLeads(
      [normalizeLead({ externalId: "place-1", companyName: "Same AB", phone: "0701234567" })],
      { listId: campaign.id }
    );
    const secondImport = await recoveredStore.importLeads(
      [normalizeLead({ externalId: "place-1", companyName: "Same AB", phone: "0701234567" })],
      { listId: campaign.id }
    );
    assert.equal(firstImport.imported, 1);
    assert.equal(secondImport.imported, 0);
    assert.equal(secondImport.alreadyInList, 1);
    assert.equal(recoveredStore.state.leads.filter((lead) => lead.listId === campaign.id).length, 1);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }

  console.log("All tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
