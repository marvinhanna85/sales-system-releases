const assert = require("node:assert/strict");

const { buildMonthlyPlan, buildScheduleItems, findDuplicateLead, normalizeCampaign, normalizeLead } = require("../src/main/domain");
const { DataStore } = require("../src/main/data-store");
const { buildSearchQueries } = require("../src/main/places-service");

async function run() {
  const existing = [
    normalizeLead({ companyName: "Bygg AB", city: "Kalmar", phone: "070-123 45 67", externalId: "abc" })
  ];

  assert.ok(findDuplicateLead(existing, normalizeLead({ companyName: "Något", city: "Stockholm", externalId: "abc" })));
  assert.ok(findDuplicateLead(existing, normalizeLead({ companyName: "Annat", city: "Göteborg", phone: "0701234567" })));
  assert.ok(findDuplicateLead(existing, normalizeLead({ companyName: "Bygg AB", city: "Kalmar" })));
  assert.equal(findDuplicateLead(existing, normalizeLead({ companyName: "Måleri", city: "Kalmar" })), null);

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
  assert.ok(byggQueries.includes("byggfirma Kalmar"));
  assert.ok(byggQueries.includes("snickare Kalmar"));
  assert.ok(byggQueries.includes("byggservice Kalmar"));
  assert.ok(!byggQueries.includes("construction Kalmar"));
  assert.ok(byggQueries.length >= 4);

  const explicitQueries = buildSearchQueries({ query: "byggare Kalmar" });
  assert.deepEqual(explicitQueries, ["byggare Kalmar"]);

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

  const queueStore = new DataStore(__dirname);
  const queueLeads = [
    normalizeLead({ id: "lead-a", companyName: "A", status: "Ny", createdAt: "2026-04-01T08:00:00.000Z", updatedAt: "2026-04-01T08:00:00.000Z" }),
    normalizeLead({ id: "lead-b", companyName: "B", status: "Ny", createdAt: "2026-04-01T09:00:00.000Z", updatedAt: "2026-04-01T09:00:00.000Z" }),
    normalizeLead({ id: "lead-c", companyName: "C", status: "Ny", createdAt: "2026-04-01T10:00:00.000Z", updatedAt: "2026-04-01T10:00:00.000Z" })
  ];
  queueStore.state = { ...queueStore.state, leads: queueLeads, scheduleItems: [] };
  assert.equal(queueStore.getNextLead({ excludeLeadIds: ["lead-a"] }).id, "lead-b");
  assert.equal(queueStore.getNextLead({ excludeLeadIds: ["lead-a", "lead-b"] }).id, "lead-c");

  const noteStore = new DataStore(__dirname);
  noteStore.save = async () => {};
  noteStore.state = {
    ...noteStore.state,
    leads: [normalizeLead({ id: "note-lead", companyName: "Note Lead", status: "Ny", notes: "" })]
  };
  await noteStore.applyLeadAction({ leadId: "note-lead", status: "Ny", contactName: "", note: " Ringde Madeleine " });
  assert.equal(noteStore.state.leads[0].notes, "Ringde Madeleine");
  await noteStore.applyLeadAction({ leadId: "note-lead", status: "Ny", contactName: "", note: "" });
  assert.equal(noteStore.state.leads[0].notes, "");

  const campaignStore = new DataStore(__dirname);
  campaignStore.save = async () => {};
  campaignStore.state = {
    ...campaignStore.state,
    campaigns: [normalizeCampaign({ id: "campaign-a", name: "Bygg Kalmar" })],
    leads: [
      normalizeLead({ id: "campaign-lead-a", companyName: "List Lead A", listId: "campaign-a" }),
      normalizeLead({ id: "campaign-lead-b", companyName: "List Lead B", listId: "campaign-a", isDeleted: true }),
      normalizeLead({ id: "other-lead", companyName: "Other", listId: "campaign-b" })
    ],
    settings: { ...campaignStore.state.settings, lastSelectedCampaignId: "campaign-a" }
  };
  await campaignStore.deleteCampaign("campaign-a");
  assert.equal(campaignStore.state.campaigns.length, 0);
  assert.equal(campaignStore.state.leads.find((lead) => lead.id === "campaign-lead-a").listId, "");
  assert.equal(campaignStore.state.leads.find((lead) => lead.id === "campaign-lead-b").listId, "");
  assert.equal(campaignStore.state.leads.find((lead) => lead.id === "other-lead").listId, "campaign-b");
  assert.equal(campaignStore.state.settings.lastSelectedCampaignId, "");

  console.log("All tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
