const { estimateDays, normalizeScheduleItem } = require("../domain");
const { normalizeText } = require("../data/taxonomy");

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getWorkdaysForMonth(monthKey) {
  const [year, month] = String(monthKey).split("-").map(Number);
  const cursor = new Date(year, month - 1, 1);
  const dates = [];
  while (cursor.getMonth() === month - 1) {
    const day = cursor.getDay();
    if (day !== 0 && day !== 6) {
      dates.push(formatLocalDate(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

function groupByBranchAndCity(leads) {
  const branchMap = new Map();
  leads.forEach((lead) => {
    const branch = lead.normalizedBranch || lead.category || "Okategoriserat";
    const city = lead.targetMarketCity || lead.normalizedCity || lead.city || "Okänd stad";
    if (!branchMap.has(branch)) {
      branchMap.set(branch, new Map());
    }
    if (!branchMap.get(branch).has(city)) {
      branchMap.get(branch).set(city, []);
    }
    branchMap.get(branch).get(city).push(lead);
  });
  return branchMap;
}

function orderBranches(branchMap, priorityBranches = []) {
  return [...branchMap.entries()]
    .map(([branch, cityMap]) => ({
      branch,
      cityMap,
      totalLeads: [...cityMap.values()].reduce((sum, items) => sum + items.length, 0)
    }))
    .sort((left, right) => {
      const leftPriority = priorityBranches.some((item) => normalizeText(item) === normalizeText(left.branch)) ? 1 : 0;
      const rightPriority = priorityBranches.some((item) => normalizeText(item) === normalizeText(right.branch)) ? 1 : 0;
      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }
      if (right.totalLeads !== left.totalLeads) {
        return right.totalLeads - left.totalLeads;
      }
      return left.branch.localeCompare(right.branch, "sv");
    });
}

function orderCities(cityMap, priorityCities = []) {
  return [...cityMap.entries()]
    .map(([city, leads]) => ({ city, leads, count: leads.length }))
    .sort((left, right) => {
      const leftPriority = priorityCities.some((item) => normalizeText(item) === normalizeText(left.city)) ? 1 : 0;
      const rightPriority = priorityCities.some((item) => normalizeText(item) === normalizeText(right.city)) ? 1 : 0;
      if (leftPriority !== rightPriority) {
        return rightPriority - leftPriority;
      }
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return left.city.localeCompare(right.city, "sv");
    });
}

function buildMonthlyPlan(leads, monthKey, dailyTarget, priorityCities = [], priorityBranches = []) {
  const workdays = getWorkdaysForMonth(monthKey);
  const openLeads = leads.filter((lead) => !["Closed", "Inte intresserad"].includes(lead.status));
  if (!workdays.length || !openLeads.length) {
    return {
      scheduleItems: [],
      dayPlans: [],
      blocks: [],
      branchSummaries: []
    };
  }

  const dailyCap = Math.max(1, Number(dailyTarget) || 40);
  const branchMap = groupByBranchAndCity(openLeads);
  const branchEntries = orderBranches(branchMap, priorityBranches);
  const orderedLeads = [];
  const branchSummaries = [];

  branchEntries.forEach((branchEntry) => {
    const cities = orderCities(branchEntry.cityMap, priorityCities);
    branchSummaries.push({
      branch: branchEntry.branch,
      totalLeads: branchEntry.totalLeads,
      estimatedDays: estimateDays(branchEntry.totalLeads, dailyCap),
      cityBreakdown: cities.map((cityEntry) => ({ city: cityEntry.city, count: cityEntry.count }))
    });
    cities.forEach((cityEntry) => {
      orderedLeads.push(...cityEntry.leads);
    });
  });

  const scheduleItems = [];
  const dayPlans = [];
  const blocks = [];
  const byDate = new Map();

  orderedLeads.forEach((lead, index) => {
    const dayIndex = Math.floor(index / dailyCap);
    const plannedDate = workdays[dayIndex];
    if (!plannedDate) {
      return;
    }

    const orderIndex = index % dailyCap;
    scheduleItems.push(
      normalizeScheduleItem({
        leadId: lead.id,
        plannedDate,
        orderIndex,
        completed: false
      })
    );

    if (!byDate.has(plannedDate)) {
      byDate.set(plannedDate, {
        plannedDate,
        branch: lead.normalizedBranch || lead.category || "Okategoriserat",
        cityBreakdown: new Map(),
        totalLeads: 0,
        leadIds: []
      });
    }

    const entry = byDate.get(plannedDate);
    const city = lead.targetMarketCity || lead.normalizedCity || lead.city || "Okänd stad";
    entry.totalLeads += 1;
    entry.leadIds.push(lead.id);
    entry.cityBreakdown.set(city, (entry.cityBreakdown.get(city) || 0) + 1);
  });

  workdays.forEach((plannedDate) => {
    const entry = byDate.get(plannedDate);
    if (!entry) {
      dayPlans.push({
        plannedDate,
        branch: "",
        totalLeads: 0,
        cityBreakdown: [],
        leadIds: [],
        status: "föreslagen"
      });
      return;
    }

    const cityBreakdown = [...entry.cityBreakdown.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((left, right) => right.count - left.count || left.city.localeCompare(right.city, "sv"));

    dayPlans.push({
      plannedDate,
      branch: entry.branch,
      totalLeads: entry.totalLeads,
      cityBreakdown,
      leadIds: entry.leadIds,
      status: "föreslagen"
    });
  });

  dayPlans.forEach((dayPlan) => {
    if (!dayPlan.totalLeads || !dayPlan.branch) {
      return;
    }

    const lastBlock = blocks[blocks.length - 1];
    if (lastBlock && lastBlock.branch === dayPlan.branch) {
      lastBlock.toDate = dayPlan.plannedDate;
      lastBlock.totalLeads += dayPlan.totalLeads;
      lastBlock.days += 1;
      dayPlan.cityBreakdown.forEach((cityEntry) => {
        const existing = lastBlock.cityBreakdown.find((entry) => entry.city === cityEntry.city);
        if (existing) {
          existing.count += cityEntry.count;
        } else {
          lastBlock.cityBreakdown.push({ ...cityEntry });
        }
      });
      return;
    }

    blocks.push({
      id: `${dayPlan.branch}-${dayPlan.plannedDate}`,
      branch: dayPlan.branch,
      fromDate: dayPlan.plannedDate,
      toDate: dayPlan.plannedDate,
      totalLeads: dayPlan.totalLeads,
      days: 1,
      cityBreakdown: dayPlan.cityBreakdown.map((entry) => ({ ...entry })),
      status: "föreslagen"
    });
  });

  return {
    scheduleItems,
    dayPlans,
    blocks,
    branchSummaries
  };
}

module.exports = {
  buildMonthlyPlan,
  formatLocalDate,
  getWorkdaysForMonth
};
