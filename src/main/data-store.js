const fs = require("node:fs/promises");
const path = require("node:path");

const {
  createEmptyState,
  estimateDays,
  findDuplicateLead,
  normalizeCampaign,
  normalizeCallRecord,
  normalizeLead,
  normalizeLogEntry,
  normalizeReminder,
  normalizeScheduleItem
} = require("./domain");
const { inferBranchFromContext, inferCityFromContext, inferCountryFromContext, inferLocalityFromContext, normalizePhone } = require("./data/normalizers");
const { buildMonthlyPlan } = require("./engines/planning-engine");
const { fetchTelavoxCalls, fetchTelavoxRecording } = require("./services/telavox-service");

class DataStore {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.filePath = path.join(baseDir, "sales-system.json");
    this.state = createEmptyState();
  }

  async init() {
    await fs.mkdir(this.baseDir, { recursive: true });
    try {
      const raw = await fs.readFile(this.filePath, "utf8");
      const parsed = JSON.parse(raw);
      this.state = {
        ...createEmptyState(),
        ...parsed,
        leads: Array.isArray(parsed.leads) ? parsed.leads.map((lead) => this.migrateLead(lead, parsed.campaigns || [])) : [],
        logEntries: Array.isArray(parsed.logEntries) ? parsed.logEntries.map(normalizeLogEntry) : [],
        reminders: Array.isArray(parsed.reminders) ? parsed.reminders.map(normalizeReminder) : [],
        campaigns: Array.isArray(parsed.campaigns) ? parsed.campaigns.map(normalizeCampaign) : [],
        scheduleItems: Array.isArray(parsed.scheduleItems) ? parsed.scheduleItems.map(normalizeScheduleItem) : [],
        callRecords: Array.isArray(parsed.callRecords) ? parsed.callRecords.map(normalizeCallRecord) : [],
        settings: { ...createEmptyState().settings, ...(parsed.settings || {}) }
      };
      await this.save();
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      await this.save();
    }
  }

  migrateLead(rawLead, campaigns) {
    const campaign = campaigns.find((item) => item.id === (rawLead.listId ?? rawLead.campaignId));
    const sourceQuery = rawLead.sourceQuery || rawLead.searchQuery || "";
    const normalizedBranch =
      rawLead.normalizedBranch ||
      inferBranchFromContext({
        rawGoogleCategory: rawLead.rawGoogleCategory || rawLead.category || "",
        sourceQuery,
        matchedQueries: rawLead.matchedQueries || [],
        campaignName: campaign?.name || ""
      }) ||
      rawLead.category ||
      campaign?.normalizedBranch ||
      "";
    const normalizedCity =
      rawLead.normalizedCity ||
      inferCityFromContext({
        addressComponents: rawLead.rawPlaceData?.addressComponents || [],
        rawAddress: rawLead.rawAddress || rawLead.address || "",
        sourceQuery,
        campaignCities: campaign?.cities || [],
        fallbackCity: rawLead.city || ""
      });
    const googleLocality =
      rawLead.googleLocality ||
      rawLead.rawLocality ||
      inferLocalityFromContext({
        addressComponents: rawLead.rawPlaceData?.addressComponents || [],
        rawAddress: rawLead.rawAddress || rawLead.address || "",
        fallbackLocality: rawLead.city || ""
      });
    const country = rawLead.country || inferCountryFromContext({
      addressComponents: rawLead.rawPlaceData?.addressComponents || [],
      rawAddress: rawLead.rawAddress || rawLead.address || "",
      fallbackCountry: "Sweden"
    });

    return normalizeLead({
      ...rawLead,
      normalizedBranch,
      normalizedCity,
      targetMarketCity: rawLead.targetMarketCity || campaign?.targetMarkets?.[0] || campaign?.cities?.[0] || normalizedCity,
      googleLocality,
      rawLocality: rawLead.rawLocality || googleLocality,
      country,
      rawGoogleCategory: rawLead.rawGoogleCategory || rawLead.category || "",
      rawAddress: rawLead.rawAddress || rawLead.address || "",
      category: normalizedBranch,
      sourceQuery:
        rawLead.sourceQuery ||
        rawLead.matchedQueries?.[0] ||
        rawLead.searchQuery ||
        campaign?.searchQuery ||
        (rawLead.source === "manual" ? "manuell" : [normalizedBranch, rawLead.targetMarketCity || campaign?.targetMarkets?.[0] || campaign?.cities?.[0] || normalizedCity].filter(Boolean).join(" ")),
      matchedQueries: rawLead.matchedQueries?.length
        ? rawLead.matchedQueries
        : [rawLead.sourceQuery, rawLead.searchQuery, campaign?.searchQuery, rawLead.source === "manual" ? "manuell" : ""].filter(Boolean)
    });
  }

  getState() {
    return structuredClone(this.state);
  }

  async save() {
    await fs.writeFile(this.filePath, JSON.stringify(this.state, null, 2), "utf8");
  }

  async saveSettings(patch) {
    this.state.settings = {
      ...this.state.settings,
      ...patch
    };
    await this.save();
    return this.getState();
  }

  async createCampaign(payload) {
    const campaign = normalizeCampaign(payload);
    campaign.totalLeads = this.state.leads.filter((lead) => lead.listId === campaign.id && !lead.isDeleted).length;
    campaign.estimatedDays = estimateDays(campaign.totalLeads, campaign.dailyTarget);
    this.state.campaigns.unshift(campaign);
    await this.save();
    return campaign;
  }

  async upsertCampaign(payload) {
    const next = normalizeCampaign(payload);
    const index = this.state.campaigns.findIndex((campaign) => campaign.id === next.id);
    if (index >= 0) {
      this.state.campaigns[index] = { ...this.state.campaigns[index], ...next };
    } else {
      this.state.campaigns.unshift(next);
    }
    this.refreshCampaignCounters(next.id);
    await this.save();
    return this.getState();
  }

  async deleteCampaign(campaignId) {
    const campaign = this.state.campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      throw new Error("Lista hittades inte.");
    }

    this.state.leads.forEach((lead) => {
      if (lead.listId === campaignId) {
        lead.listId = "";
      }
    });
    this.state.campaigns = this.state.campaigns.filter((item) => item.id !== campaignId);
    if (this.state.settings.lastSelectedCampaignId === campaignId) {
      this.state.settings.lastSelectedCampaignId = "";
    }
    await this.save();
    return this.getState();
  }

  async createLead(payload, options = {}) {
    const candidate = normalizeLead(payload);
    if (!candidate.companyName.trim()) {
      throw new Error("Företagsnamn krävs.");
    }

    const duplicate = findDuplicateLead(this.state.leads, candidate);
    if (duplicate) {
      return { lead: duplicate, duplicate: true };
    }

    this.state.leads.push(candidate);
    this.state.logEntries.unshift(
      normalizeLogEntry({
        leadId: candidate.id,
        type: "created",
        title: "Kund skapad",
        text: `Kund skapad från ${candidate.source}${candidate.sourceQuery ? ` via "${candidate.sourceQuery}"` : ""}`
      })
    );

    if (candidate.listId) {
      this.refreshCampaignCounters(candidate.listId);
    }
    if (!options.skipSave) {
      await this.save();
    }
    return { lead: candidate, duplicate: false };
  }

  async importLeads(leads, options = {}) {
    const result = {
      imported: 0,
      duplicates: 0,
      skipped: 0,
      leadIds: []
    };

    for (const rawLead of leads) {
      if (!rawLead.companyName?.trim()) {
        result.skipped += 1;
        continue;
      }

      const creation = await this.createLead(
        {
          ...rawLead,
          listId: options.listId ?? rawLead.listId ?? ""
        },
        { skipSave: true }
      );

      if (creation.duplicate) {
        result.duplicates += 1;
        continue;
      }

      result.imported += 1;
      result.leadIds.push(creation.lead.id);
    }

    await this.save();
    return result;
  }

  async updateLead(leadId, patch) {
    const lead = this.state.leads.find((item) => item.id === leadId);
    if (!lead) {
      throw new Error("Lead hittades inte.");
    }

    const trackedFields = [
      ["companyName", "Foretagsnamn"],
      ["phone", "Telefon"],
      ["contactName", "Kontaktperson"],
      ["website", "Hemsida"],
      ["address", "Adress"],
      ["targetMarketCity", "Malomrade"],
      ["normalizedCity", "Stad"],
      ["normalizedBranch", "Bransch"],
      ["listId", "Lista"],
      ["notes", "Anteckningar"]
    ];
    const previous = Object.fromEntries(trackedFields.map(([field]) => [field, lead[field] ?? ""]));
    Object.assign(lead, normalizeLead({ ...lead, ...patch, id: lead.id, createdAt: lead.createdAt }));
    lead.updatedAt = new Date().toISOString();

    const changedLabels = trackedFields
      .filter(([field]) => patch[field] !== undefined && String(lead[field] ?? "") !== String(previous[field] ?? ""))
      .map(([, label]) => label);

    if (changedLabels.length) {
      this.state.logEntries.unshift(
        normalizeLogEntry({
          leadId: lead.id,
          type: "update",
          title: "Kunddata ändrad",
          text: "Anteckningar uppdaterades från kundkortet"
        })
      );
      this.state.logEntries[0].title = "Kunddata ändrad";
      this.state.logEntries[0].text = `Uppdaterade fält: ${changedLabels.join(", ")}`;
    }

    await this.save();
    return lead;
  }

  async applyLeadAction(payload) {
    const lead = this.state.leads.find((item) => item.id === payload.leadId);
    if (!lead) {
      throw new Error("Lead hittades inte.");
    }

    const previousStatus = lead.status;
    const changes = [];
    lead.status = payload.status ?? lead.status;
    lead.updatedAt = new Date().toISOString();

    if (payload.contactName !== undefined && payload.contactName !== lead.contactName) {
      lead.contactName = payload.contactName;
      changes.push(`Kontaktperson: ${payload.contactName || "rensad"}`);
    }

    if (payload.note !== undefined) {
      const nextNote = String(payload.note || "").trim();
      if (nextNote !== lead.notes) {
        lead.notes = nextNote;
        changes.push(nextNote ? `Anteckning: "${nextNote}"` : "Anteckning rensad");
      }
    }

    if (payload.status && payload.status !== previousStatus) {
      changes.push(`Status ändrad till ${payload.status}`);
    }

    if (payload.reminder?.dueDate) {
      const now = new Date().toISOString();
      this.state.reminders.forEach((existingReminder) => {
        if (existingReminder.leadId === lead.id && !existingReminder.completed) {
          existingReminder.completed = true;
          existingReminder.completedAt = now;
        }
      });
      const reminder = normalizeReminder({
        leadId: lead.id,
        type: payload.reminder.type ?? "följ upp",
        dueDate: payload.reminder.dueDate,
        dueTime: payload.reminder.dueTime ?? "",
        note: payload.reminder.note ?? ""
      });
      this.state.reminders.unshift(reminder);
      changes.push(`Reminder: ${reminder.dueDate}${reminder.dueTime ? ` ${reminder.dueTime}` : ""}${reminder.note ? ` – ${reminder.note}` : ""}`);
    }

    if (payload.completeScheduled) {
      const scheduleItem = this.state.scheduleItems.find((item) => item.leadId === lead.id && !item.completed);
      if (scheduleItem) {
        scheduleItem.completed = true;
        scheduleItem.completedAt = new Date().toISOString();
      }
    }

    if (changes.length) {
      this.state.logEntries.unshift(
        normalizeLogEntry({
          leadId: lead.id,
          type: "activity",
          title: "Samtal / uppdatering",
          text: changes.join(" • ")
        })
      );
    }

    await this.save();
    return lead;
  }

  async setReminderCompleted(reminderId, completed) {
    const reminder = this.state.reminders.find((item) => item.id === reminderId);
    if (!reminder) {
      throw new Error("Påminnelse hittades inte.");
    }

    reminder.completed = Boolean(completed);
    reminder.completedAt = completed ? new Date().toISOString() : "";
    this.state.logEntries.unshift(
      normalizeLogEntry({
        leadId: reminder.leadId,
        type: "reminder-complete",
        title: completed ? "Reminder klar" : "Reminder återöppnad",
        text: `${reminder.type} ${reminder.dueDate}${reminder.dueTime ? ` ${reminder.dueTime}` : ""}`
      })
    );
    await this.save();
    return reminder;
  }

  async addTimelineEvent(payload) {
    const lead = this.state.leads.find((item) => item.id === payload.leadId);
    if (!lead) {
      throw new Error("Lead hittades inte.");
    }

    this.state.logEntries.unshift(
      normalizeLogEntry({
        leadId: lead.id,
        type: payload.type ?? "event",
        title: payload.title ?? "Händelse",
        text: payload.text ?? ""
      })
    );
    lead.updatedAt = new Date().toISOString();
    await this.save();
    return lead;
  }

  async softDeleteLead(leadId) {
    const lead = this.state.leads.find((item) => item.id === leadId);
    if (!lead) {
      throw new Error("Lead hittades inte.");
    }

    lead.isDeleted = true;
    lead.deletedAt = new Date().toISOString();
    lead.updatedAt = new Date().toISOString();
    this.state.logEntries.unshift(
      normalizeLogEntry({
        leadId: lead.id,
        type: "delete",
        title: "Kund flyttad till papperskorg",
        text: "Kunden är dold från arbetsläge, dashboard, planering och vanliga listor."
      })
    );
    if (lead.listId) {
      this.refreshCampaignCounters(lead.listId);
    }
    await this.save();
    return lead;
  }

  async restoreLead(leadId) {
    const lead = this.state.leads.find((item) => item.id === leadId);
    if (!lead) {
      throw new Error("Lead hittades inte.");
    }

    lead.isDeleted = false;
    lead.deletedAt = "";
    lead.updatedAt = new Date().toISOString();
    this.state.logEntries.unshift(
      normalizeLogEntry({
        leadId: lead.id,
        type: "restore",
        title: "Kund återställd",
        text: "Kunden flyttades tillbaka från papperskorgen."
      })
    );
    if (lead.listId) {
      this.refreshCampaignCounters(lead.listId);
    }
    await this.save();
    return lead;
  }

  async purgeLead(leadId) {
    const exists = this.state.leads.some((item) => item.id === leadId);
    if (!exists) {
      throw new Error("Lead hittades inte.");
    }

    this.state.leads = this.state.leads.filter((item) => item.id !== leadId);
    this.state.logEntries = this.state.logEntries.filter((item) => item.leadId !== leadId);
    this.state.reminders = this.state.reminders.filter((item) => item.leadId !== leadId);
    this.state.scheduleItems = this.state.scheduleItems.filter((item) => item.leadId !== leadId);
    this.state.callRecords = this.state.callRecords.filter((item) => item.leadId !== leadId);
    this.state.campaigns.forEach((campaign) => this.refreshCampaignCounters(campaign.id));
    await this.save();
    return this.getState();
  }

  async syncTelavoxLeadCalls(payload) {
    const lead = this.state.leads.find((item) => item.id === payload.leadId);
    if (!lead) {
      throw new Error("Lead hittades inte.");
    }
    if (!lead.phone?.trim()) {
      throw new Error("Leadet saknar telefonnummer att matcha mot Telavox.");
    }

    const token = payload.token?.trim() || this.state.settings.telavoxToken?.trim();
    if (!token) {
      throw new Error("Spara en Telavox-token först.");
    }

    const fromDate = payload.fromDate || this.state.settings.telavoxFromDate || "";
    const calls = await fetchTelavoxCalls({
      token,
      fromDate,
      toDate: payload.toDate || "",
      withRecordings: true
    });

    const matched = calls.filter((call) => phonesMatch(call.remoteNumber, lead.phone));
    const syncedIds = [];

    matched.forEach((call) => {
      const externalId = buildTelavoxCallExternalId(call);
      const existingIndex = this.state.callRecords.findIndex((item) => item.externalId === externalId);
      const record = normalizeCallRecord({
        ...(existingIndex >= 0 ? this.state.callRecords[existingIndex] : {}),
        leadId: lead.id,
        provider: "telavox",
        externalId,
        direction: call.direction,
        remoteNumber: call.remoteNumber,
        happenedAt: call.happenedAt,
        durationSeconds: call.durationSeconds,
        recordingId: call.recordingId,
        updatedAt: new Date().toISOString()
      });

      if (existingIndex >= 0) {
        this.state.callRecords[existingIndex] = record;
      } else {
        this.state.callRecords.unshift(record);
      }
      syncedIds.push(record.id);
    });

    this.state.logEntries.unshift(
      normalizeLogEntry({
        leadId: lead.id,
        type: "telavox-sync",
        title: "Telavox synkad",
        text: `${matched.length} matchade samtal hämtades${fromDate ? ` från ${fromDate}` : ""}.`
      })
    );

    lead.updatedAt = new Date().toISOString();
    await this.save();

    return {
      matchedCount: matched.length,
      totalFetched: calls.length,
      fromDate,
      calls: this.state.callRecords
        .filter((item) => syncedIds.includes(item.id))
        .sort((left, right) => new Date(right.happenedAt) - new Date(left.happenedAt))
    };
  }

  async downloadTelavoxRecording(payload) {
    const record = this.state.callRecords.find((item) => item.id === payload.callRecordId);
    if (!record) {
      throw new Error("Telavox-samtalet hittades inte.");
    }
    if (!record.recordingId) {
      throw new Error("Samtalet har ingen inspelning i Telavox.");
    }

    const token = payload.token?.trim() || this.state.settings.telavoxToken?.trim();
    if (!token) {
      throw new Error("Spara en Telavox-token först.");
    }

    const { bytes, fileName } = await fetchTelavoxRecording({
      token,
      recordingId: record.recordingId
    });

    const recordingDir = path.join(this.baseDir, "recordings");
    await fs.mkdir(recordingDir, { recursive: true });
    const localPath = path.join(recordingDir, fileName);
    await fs.writeFile(localPath, bytes);

    record.localRecordingPath = localPath;
    record.updatedAt = new Date().toISOString();

    this.state.logEntries.unshift(
      normalizeLogEntry({
        leadId: record.leadId,
        type: "telavox-recording",
        title: "Telavox-inspelning sparad",
        text: `Inspelning ${record.recordingId} sparades lokalt.`
      })
    );

    await this.save();
    return record;
  }

  async planSchedule(payload) {
    const leads = this.state.leads.filter((lead) => {
      if (lead.isDeleted) {
        return false;
      }
      if (payload.campaignId && lead.listId !== payload.campaignId) {
        return false;
      }
      return !["Closed", "Inte intresserad"].includes(lead.status);
    });

    const result = buildMonthlyPlan(
      leads,
      payload.month,
      payload.dailyTarget,
      payload.priorityCities,
      payload.priorityBranches ?? payload.priorityCategories
    );

    const leadIds = new Set(result.scheduleItems.map((item) => item.leadId));
    this.state.scheduleItems = [
      ...this.state.scheduleItems.filter((item) => !leadIds.has(item.leadId)),
      ...result.scheduleItems
    ];

    this.state.leads = this.state.leads.map((lead) => {
      const item = result.scheduleItems.find((entry) => entry.leadId === lead.id);
      if (!item) {
        return lead;
      }
      return { ...lead, plannedDate: item.plannedDate, updatedAt: new Date().toISOString() };
    });

    await this.save();
    return {
      ...result,
      plannedLeadCount: result.scheduleItems.length
    };
  }

  async clearSchedule(payload) {
    const targetMonth = payload.month;
    const validLeadIds = new Set(
      this.state.scheduleItems
        .filter((item) => item.plannedDate.startsWith(targetMonth))
        .map((item) => item.leadId)
    );

    this.state.scheduleItems = this.state.scheduleItems.filter((item) => !item.plannedDate.startsWith(targetMonth));
    this.state.leads = this.state.leads.map((lead) =>
      validLeadIds.has(lead.id) ? { ...lead, plannedDate: "", updatedAt: new Date().toISOString() } : lead
    );
    await this.save();
    return this.getState();
  }

  getNextLead(queue = {}) {
    const campaignId = typeof queue === "string" ? queue : queue?.campaignId || "";
    const plannedDate = typeof queue === "object" ? queue?.plannedDate || "" : "";
    const excludeLeadId = typeof queue === "object" ? queue?.excludeLeadId || "" : "";
    const excludeLeadIds = new Set([
      excludeLeadId,
      ...(Array.isArray(queue?.excludeLeadIds) ? queue.excludeLeadIds : [])
    ].filter(Boolean));
    const scheduleLookup = new Map(
      this.state.scheduleItems
        .filter((item) => !item.completed)
        .filter((item) => (plannedDate ? item.plannedDate === plannedDate : true))
        .sort((a, b) => a.plannedDate.localeCompare(b.plannedDate) || a.orderIndex - b.orderIndex)
        .map((item) => [item.leadId, item])
    );

    return (
      this.state.leads
        .filter((lead) => (campaignId ? lead.listId === campaignId : true))
        .filter((lead) => (plannedDate ? scheduleLookup.has(lead.id) : true))
        .filter((lead) => !excludeLeadIds.has(lead.id))
        .filter((lead) => !lead.isDeleted)
        .filter((lead) => lead.status === "Ny")
        .sort((a, b) => {
          const scheduleA = scheduleLookup.get(a.id);
          const scheduleB = scheduleLookup.get(b.id);
          if (scheduleA && scheduleB) {
            return scheduleA.plannedDate.localeCompare(scheduleB.plannedDate) || scheduleA.orderIndex - scheduleB.orderIndex;
          }
          if (scheduleA) {
            return -1;
          }
          if (scheduleB) {
            return 1;
          }
          return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
        })[0] ?? null
    );
  }

  refreshCampaignCounters(campaignId) {
    const campaign = this.state.campaigns.find((item) => item.id === campaignId);
    if (!campaign) {
      return;
    }
    campaign.totalLeads = this.state.leads.filter((lead) => lead.listId === campaignId && !lead.isDeleted).length;
    campaign.estimatedDays = estimateDays(campaign.totalLeads, campaign.dailyTarget);
  }
}

function buildTelavoxCallExternalId(call) {
  return ["telavox", call.direction, call.happenedAt, normalizePhone(call.remoteNumber), call.recordingId || "none"].join(":");
}

function phonesMatch(left, right) {
  const a = normalizePhone(left);
  const b = normalizePhone(right);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  const tailLength = Math.min(9, a.length, b.length);
  return tailLength >= 7 && a.slice(-tailLength) === b.slice(-tailLength);
}

module.exports = { DataStore };
