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

const BRANCH_QUERY_TEMPLATES = {
  byggare: ["byggfirma {city}", "byggföretag {city}", "snickare {city}", "entreprenad {city}", "renovering {city}", "byggservice {city}"],
  elektriker: ["elektriker {city}", "elfirma {city}", "elinstallation {city}", "elinstallatör {city}"],
  restauranger: ["restaurang {city}", "krog {city}", "bistro {city}", "lunchrestaurang {city}"],
  blomsterhandlare: ["blomsterhandlare {city}", "florist {city}", "blombutik {city}", "blomsterhandel {city}"],
  frisörer: ["frisör {city}", "frisörsalong {city}", "hårsalong {city}", "barberare {city}"],
  målare: ["målare {city}", "måleri {city}", "målerifirma {city}"],
  bilverkstad: ["bilverkstad {city}", "bilservice {city}", "verkstad {city}", "mekaniker {city}"],
  konsulter: ["konsult {city}", "konsultfirma {city}", "rådgivning {city}"]
};

const MANUAL_BRANCH_TAXONOMY = [
  { label: "Byggare", aliases: ["bygg", "byggare", "byggfirma", "byggföretag", "snickare", "entreprenad", "renovering", "byggservice"] },
  { label: "Elektriker", aliases: ["el", "elektriker", "elfirma", "elinstallatör", "elinstallation", "elservice"] },
  { label: "Restauranger", aliases: ["restaurang", "restauranger", "krog", "bistro", "lunchrestaurang"] },
  { label: "Blomsterhandlare", aliases: ["blomma", "blommor", "blomster", "blomsterhandlare", "florist", "blombutik", "blomsterhandel"] },
  { label: "Frisörer", aliases: ["frisör", "frisörer", "frisörsalong", "hårsalong", "barberare"] },
  { label: "Målare", aliases: ["målare", "måleri", "målerifirma"] },
  { label: "Bilverkstad", aliases: ["bilverkstad", "verkstad", "bilservice", "mekaniker"] },
  { label: "Konsulter", aliases: ["konsult", "konsulter", "konsultfirma", "rådgivning"] }
];

const state = {
  data: {
    leads: [],
    campaigns: [],
    reminders: [],
    logEntries: [],
    scheduleItems: [],
    callRecords: [],
    settings: {}
  },
  currentView: "dashboard",
  lastRenderedView: "",
  suppressViewHistory: false,
  viewHistory: [],
  selectedLeadId: "",
  workMode: "flow",
  workQueue: {
    campaignId: "",
    plannedDate: "",
    skippedLeadIds: []
  },
  workNotice: "",
  autoOpeningNextLead: false,
  customersMode: "catalog",
  customerSelection: {},
  campaignsMode: "catalog",
  campaignSelection: {},
  placesResults: [],
  placesMeta: null,
  placesSelection: {},
  reminderViewMode: "all",
  selectedReminderDate: "",
  dashboardTodayExpanded: false,
  dashboardActivityRange: "today",
  dashboardActivityDate: formatLocalDate(new Date()),
  dashboardActivityPage: 0,
  dashboardActivityShowAll: false,
  dashboardWeather: {
    loading: false,
    loaded: false,
    temperature: "",
    windSpeed: "",
    code: null,
    error: ""
  },
  planningData: null,
  selectedPlanningDate: "",
  notifiedReminderIds: new Set(),
  filters: {
    customerSearch: "",
    customerStatus: "",
    customerCategory: "",
    customerCity: "",
    customerCampaignId: ""
  },
  manualSearchTerm: "",
    manualCreateOpen: false,
    manualSelectedCampaignId: "",
    editLeadId: "",
    updateStatus: {
      status: "idle",
      message: "",
      version: "",
      availableVersion: "",
      progress: 0,
      isPackaged: false
    },
    uiZoom: getStoredUiZoom(),
    previousLeadIds: [],
    workDraft: createEmptyWorkDraft()
  };

let customerFilterRenderTimer = null;

const elements = {
  navButtons: [...document.querySelectorAll(".nav-button")],
  views: {
    dashboard: document.querySelector("#dashboardView"),
    work: document.querySelector("#workView"),
    customers: document.querySelector("#customersView"),
    campaigns: document.querySelector("#campaignsView"),
    planning: document.querySelector("#planningView"),
    reminders: document.querySelector("#remindersView"),
    export: document.querySelector("#exportView")
  },
  topbarTitle: document.querySelector("#topbarTitle"),
  topbarBackButton: document.querySelector("#topbarBackButton"),
  updateControl: document.querySelector("#updateControl"),
  updateStatusText: document.querySelector("#updateStatusText"),
  checkUpdatesButton: document.querySelector("#checkUpdatesButton"),
  downloadUpdateButton: document.querySelector("#downloadUpdateButton"),
  installUpdateButton: document.querySelector("#installUpdateButton"),
  uiZoomSlider: document.querySelector("#uiZoomSlider"),
  uiZoomValue: document.querySelector("#uiZoomValue"),
  topbarNextLead: document.querySelector("#topbarNextLead"),
  dashboardStats: document.querySelector("#dashboardStats"),
  dashboardTodayTitle: document.querySelector("#dashboardTodayTitle"),
  dashboardTodayDate: document.querySelector("#dashboardTodayDate"),
  dashboardSpecialDay: document.querySelector("#dashboardSpecialDay"),
  dashboardWeatherValue: document.querySelector("#dashboardWeatherValue"),
  dashboardWeatherMeta: document.querySelector("#dashboardWeatherMeta"),
  dashboardTodaySummary: document.querySelector("#dashboardTodaySummary"),
  dashboardWeekOverview: document.querySelector("#dashboardWeekOverview"),
  dashboardTodayList: document.querySelector("#dashboardTodayList"),
  dashboardTodayToggle: document.querySelector("#dashboardTodayToggle"),
  dashboardActivityRangeButtons: document.querySelector("#dashboardActivityRangeButtons"),
  dashboardActivityDateInput: document.querySelector("#dashboardActivityDateInput"),
  dashboardActivitySummary: document.querySelector("#dashboardActivitySummary"),
  dashboardActivityList: document.querySelector("#dashboardActivityList"),
  dashboardActivityPager: document.querySelector("#dashboardActivityPager"),
  dashboardActivityPrevButton: document.querySelector("#dashboardActivityPrevButton"),
  dashboardActivityNextButton: document.querySelector("#dashboardActivityNextButton"),
  dashboardActivityPageText: document.querySelector("#dashboardActivityPageText"),
  dashboardActivityShowAllButton: document.querySelector("#dashboardActivityShowAllButton"),
  dashboardFocusCopy: document.querySelector("#dashboardFocusCopy"),
  dashboardNextLead: document.querySelector("#dashboardNextLead"),
  dashboardOpenReminders: document.querySelector("#dashboardOpenReminders"),
  workFlowModeButton: document.querySelector("#workFlowModeButton"),
  workManualModeButton: document.querySelector("#workManualModeButton"),
  workFlowToolbar: document.querySelector("#workFlowToolbar"),
  workManualToolbar: document.querySelector("#workManualToolbar"),
  workCampaignFilter: document.querySelector("#workCampaignFilter"),
  workQueueProgress: document.querySelector("#workQueueProgress"),
  workNextLeadButton: document.querySelector("#workNextLeadButton"),
  openProfileModalButton: document.querySelector("#openProfileModalButton"),
  manualSearchInput: document.querySelector("#manualSearchInput"),
  manualSearchResults: document.querySelector("#manualSearchResults"),
  toggleManualCreateButton: document.querySelector("#toggleManualCreateButton"),
  closeManualCreatePanelButton: document.querySelector("#closeManualCreatePanelButton"),
  manualCreatePanel: document.querySelector("#manualCreatePanel"),
  manualCompanyNameInput: document.querySelector("#manualCompanyNameInput"),
  manualPhoneInput: document.querySelector("#manualPhoneInput"),
  manualContactInput: document.querySelector("#manualContactInput"),
  manualWebsiteInput: document.querySelector("#manualWebsiteInput"),
  manualAddressInput: document.querySelector("#manualAddressInput"),
  manualCityInput: document.querySelector("#manualCityInput"),
  manualBranchInput: document.querySelector("#manualBranchInput"),
  manualBranchSuggestions: document.querySelector("#manualBranchSuggestions"),
  manualBranchHint: document.querySelector("#manualBranchHint"),
  manualCampaignSelect: document.querySelector("#manualCampaignSelect"),
  manualCampaignHint: document.querySelector("#manualCampaignHint"),
  createManualLeadButton: document.querySelector("#createManualLeadButton"),
  manualCreateFeedback: document.querySelector("#manualCreateFeedback"),
  workMain: document.querySelector(".work-main"),
  workLeadCard: document.querySelector("#workLeadCard"),
  workTimelineList: document.querySelector("#workTimelineList"),
  workContactInput: document.querySelector("#workContactInput"),
  workNoteInput: document.querySelector("#workNoteInput"),
  statusButtons: document.querySelector("#statusButtons"),
  reminderTypeInput: document.querySelector("#reminderTypeInput"),
  reminderDateInput: document.querySelector("#reminderDateInput"),
  reminderTimeInput: document.querySelector("#reminderTimeInput"),
  reminderNoteInput: document.querySelector("#reminderNoteInput"),
  manualBackButton: document.querySelector("#manualBackButton"),
  workPreviousLeadButton: document.querySelector("#workPreviousLeadButton"),
  workDeleteLeadButton: document.querySelector("#workDeleteLeadButton"),
  workSaveButton: document.querySelector("#workSaveButton"),
  workSaveAndNextButton: document.querySelector("#workSaveAndNextButton"),
  customersCatalogModeButton: document.querySelector("#customersCatalogModeButton"),
  customersAllModeButton: document.querySelector("#customersAllModeButton"),
  customersTrashModeButton: document.querySelector("#customersTrashModeButton"),
  customerSearchInput: document.querySelector("#customerSearchInput"),
  customerStatusFilter: document.querySelector("#customerStatusFilter"),
  customerCategoryFilter: document.querySelector("#customerCategoryFilter"),
  customerCityFilter: document.querySelector("#customerCityFilter"),
  customerBulkBar: document.querySelector("#customerBulkBar"),
  customerSelectionCount: document.querySelector("#customerSelectionCount"),
  customerSelectVisibleButton: document.querySelector("#customerSelectVisibleButton"),
  customerClearSelectionButton: document.querySelector("#customerClearSelectionButton"),
  customerBulkStatusSelect: document.querySelector("#customerBulkStatusSelect"),
  customerBulkStatusButton: document.querySelector("#customerBulkStatusButton"),
  customerBulkDoneButton: document.querySelector("#customerBulkDoneButton"),
  customerBulkDeleteButton: document.querySelector("#customerBulkDeleteButton"),
  customerBulkRestoreButton: document.querySelector("#customerBulkRestoreButton"),
  customerBulkPurgeButton: document.querySelector("#customerBulkPurgeButton"),
  customersCatalog: document.querySelector("#customersCatalog"),
  customersFlatList: document.querySelector("#customersFlatList"),
  customersTrashList: document.querySelector("#customersTrashList"),
  apiKeyInput: document.querySelector("#apiKeyInput"),
  placesIndustryInput: document.querySelector("#placesIndustryInput"),
  placesCityInput: document.querySelector("#placesCityInput"),
  placesMaxResultsInput: document.querySelector("#placesMaxResultsInput"),
  campaignNameInput: document.querySelector("#campaignNameInput"),
  searchPlacesButton: document.querySelector("#searchPlacesButton"),
  selectAllPlacesButton: document.querySelector("#selectAllPlacesButton"),
  clearAllPlacesButton: document.querySelector("#clearAllPlacesButton"),
  savePlacesCampaignButton: document.querySelector("#savePlacesCampaignButton"),
  placesFeedback: document.querySelector("#placesFeedback"),
  placesQueryStats: document.querySelector("#placesQueryStats"),
  placesResultsList: document.querySelector("#placesResultsList"),
  csvCampaignSelect: document.querySelector("#csvCampaignSelect"),
  csvFileInput: document.querySelector("#csvFileInput"),
  csvFeedback: document.querySelector("#csvFeedback"),
  telavoxTokenInput: document.querySelector("#telavoxTokenInput"),
  telavoxFromDateInput: document.querySelector("#telavoxFromDateInput"),
  saveTelavoxSettingsButton: document.querySelector("#saveTelavoxSettingsButton"),
  telavoxSettingsFeedback: document.querySelector("#telavoxSettingsFeedback"),
  campaignsCatalogModeButton: document.querySelector("#campaignsCatalogModeButton"),
  campaignsAllModeButton: document.querySelector("#campaignsAllModeButton"),
  campaignBulkBar: document.querySelector("#campaignBulkBar"),
  campaignSelectionCount: document.querySelector("#campaignSelectionCount"),
  campaignSelectVisibleButton: document.querySelector("#campaignSelectVisibleButton"),
  campaignClearSelectionButton: document.querySelector("#campaignClearSelectionButton"),
  campaignBulkDeleteButton: document.querySelector("#campaignBulkDeleteButton"),
  campaignsCatalogList: document.querySelector("#campaignsCatalogList"),
  campaignCards: document.querySelector("#campaignCards"),
  planningCampaignSelect: document.querySelector("#planningCampaignSelect"),
  planningMonthInput: document.querySelector("#planningMonthInput"),
  planningDailyTargetInput: document.querySelector("#planningDailyTargetInput"),
  planningCitiesInput: document.querySelector("#planningCitiesInput"),
  planningBranchesInput: document.querySelector("#planningBranchesInput"),
  planScheduleButton: document.querySelector("#planScheduleButton"),
  clearScheduleButton: document.querySelector("#clearScheduleButton"),
  planningFeedback: document.querySelector("#planningFeedback"),
  planningCalendar: document.querySelector("#planningCalendar"),
  planningSummary: document.querySelector("#planningSummary"),
  remindersList: document.querySelector("#remindersList"),
  exportScheduleCsvButton: document.querySelector("#exportScheduleCsvButton"),
  exportScheduleIcsButton: document.querySelector("#exportScheduleIcsButton"),
  exportLeadsCsvButton: document.querySelector("#exportLeadsCsvButton"),
  planningList: document.querySelector("#planningList"),
  profileTitle: document.querySelector("#profileTitle"),
  profileMeta: document.querySelector("#profileMeta"),
  profileCallButton: document.querySelector("#profileCallButton"),
  profileOpenWebsite: document.querySelector("#profileOpenWebsite"),
  profileOpenMaps: document.querySelector("#profileOpenMaps"),
  profileNoteEditor: document.querySelector("#profileNoteEditor"),
  profileSaveNotes: document.querySelector("#profileSaveNotes"),
  profileLogList: document.querySelector("#profileLogList"),
  profileReminderList: document.querySelector("#profileReminderList"),
  profileSyncTelavoxButton: document.querySelector("#profileSyncTelavoxButton"),
  profileTelavoxFeedback: document.querySelector("#profileTelavoxFeedback"),
  profileTelavoxCalls: document.querySelector("#profileTelavoxCalls"),
  profileModal: document.querySelector("#profileModal"),
  closeProfileModalButton: document.querySelector("#closeProfileModalButton"),
  editLeadModal: document.querySelector("#editLeadModal"),
  editLeadTitle: document.querySelector("#editLeadTitle"),
  closeEditLeadModalButton: document.querySelector("#closeEditLeadModalButton"),
  cancelEditLeadButton: document.querySelector("#cancelEditLeadButton"),
  saveEditLeadButton: document.querySelector("#saveEditLeadButton"),
  editCompanyNameInput: document.querySelector("#editCompanyNameInput"),
  editPhoneInput: document.querySelector("#editPhoneInput"),
  editContactInput: document.querySelector("#editContactInput"),
  editWebsiteInput: document.querySelector("#editWebsiteInput"),
  editAddressInput: document.querySelector("#editAddressInput"),
  editCityInput: document.querySelector("#editCityInput"),
  editBranchInput: document.querySelector("#editBranchInput"),
  editBranchSuggestions: document.querySelector("#editBranchSuggestions"),
  editCampaignSelect: document.querySelector("#editCampaignSelect"),
  editLeadFeedback: document.querySelector("#editLeadFeedback")
};

window.addEventListener("error", (event) => {
  reportRuntimeError("Renderer-fel", event.error || event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  reportRuntimeError("Ohanterat Promise-fel", event.reason);
});

void init();

async function init() {
  try {
    bindEvents();
    await refreshState();
    hydrateSettings();
    applyUiZoom(state.uiZoom);
    renderStatusButtons();
    await setupUpdateStatus();
    render();
    startReminderNotifications();
  } catch (error) {
    reportRuntimeError("Init-fel", error);
  }
}

function bindEvents() {
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.currentView = button.dataset.view;
      render();
    });
  });
  document.addEventListener("click", (event) => {
    const navButton = event.target.closest(".nav-button[data-view]");
    if (!navButton) {
      return;
    }
    state.currentView = navButton.dataset.view;
    render();
  });

  elements.topbarNextLead.addEventListener("click", () => openNextLead(true));
  elements.dashboardNextLead.addEventListener("click", () => openNextLead(true));
  elements.dashboardOpenReminders.addEventListener("click", () => {
    state.currentView = "reminders";
    state.reminderViewMode = "due";
    state.selectedReminderDate = "";
    render();
  });
  elements.topbarBackButton?.addEventListener("click", goBack);
  elements.dashboardTodayToggle?.addEventListener("click", () => {
    state.dashboardTodayExpanded = !state.dashboardTodayExpanded;
    renderDashboard();
  });
  elements.dashboardActivityRangeButtons?.querySelectorAll("[data-activity-range]").forEach((button) => {
    button.addEventListener("click", () => {
      state.dashboardActivityRange = button.dataset.activityRange;
      state.dashboardActivityDate = getDateForDashboardActivityRange(state.dashboardActivityRange);
      resetDashboardActivityPaging();
      renderDashboard();
    });
  });
  elements.dashboardActivityDateInput?.addEventListener("change", (event) => {
    state.dashboardActivityRange = "date";
    state.dashboardActivityDate = event.target.value || formatLocalDate(new Date());
    resetDashboardActivityPaging();
    renderDashboard();
  });
  elements.dashboardActivityPrevButton?.addEventListener("click", () => {
    state.dashboardActivityShowAll = false;
    state.dashboardActivityPage = Math.max(0, state.dashboardActivityPage - 1);
    renderDashboard();
  });
  elements.dashboardActivityNextButton?.addEventListener("click", () => {
    state.dashboardActivityShowAll = false;
    state.dashboardActivityPage += 1;
    renderDashboard();
  });
  elements.dashboardActivityShowAllButton?.addEventListener("click", () => {
    state.dashboardActivityShowAll = !state.dashboardActivityShowAll;
    if (!state.dashboardActivityShowAll) {
      state.dashboardActivityPage = 0;
    }
    renderDashboard();
  });
  elements.uiZoomSlider?.addEventListener("input", (event) => {
    const nextZoom = clampUiZoom(Number(event.target.value));
    state.uiZoom = nextZoom;
    localStorage.setItem("salesSystemUiZoom", String(nextZoom));
    applyUiZoom(nextZoom);
  });
  elements.checkUpdatesButton?.addEventListener("click", async () => {
    state.updateStatus = await window.desktopApp.checkForUpdates();
    renderUpdateControl();
  });
  elements.downloadUpdateButton?.addEventListener("click", async () => {
    state.updateStatus = await window.desktopApp.downloadUpdate();
    renderUpdateControl();
  });
  elements.installUpdateButton?.addEventListener("click", () => {
    void window.desktopApp.installUpdate();
  });

  elements.workFlowModeButton.addEventListener("click", () => {
    state.workMode = "flow";
    state.workNotice = "";
    if (!state.selectedLeadId) {
      void openNextLead(false);
      return;
    }
    renderWorkMode();
  });
  elements.workManualModeButton.addEventListener("click", () => {
    if (!confirmDiscardDraft()) {
      return;
    }
    state.workMode = "manual";
    state.selectedLeadId = "";
    state.workNotice = "";
    state.manualCreateOpen = false;
    state.workDraft = createEmptyWorkDraft();
    renderWorkMode();
  });
  elements.workCampaignFilter.addEventListener("change", () => {
    state.workQueue.campaignId = elements.workCampaignFilter.value;
    state.workQueue.plannedDate = "";
    resetWorkQueueProgress();
    state.workNotice = "";
    renderWorkMode();
  });
  elements.workNextLeadButton.addEventListener("click", () => openNextLead(true));
  elements.openProfileModalButton.addEventListener("click", openProfileModal);
  elements.workLeadCard.addEventListener("click", (event) => {
    const target = event.target.closest("[data-work-action]");
    const manualLeadButton = event.target.closest("[data-manual-open-lead]");
    if (manualLeadButton) {
      selectLead(manualLeadButton.dataset.manualOpenLead, "work");
      return;
    }
    if (!target) {
      return;
    }
    if (target.dataset.workAction === "call") {
      void openSelectedLeadLink("phone", true);
    }
    if (target.dataset.workAction === "website") {
      void openSelectedLeadLink("website");
    }
    if (target.dataset.workAction === "maps") {
      void openSelectedLeadLink("googleMapsUrl");
    }
    if (target.dataset.workAction === "edit") {
      openEditLeadModal();
    }
  });

  elements.manualSearchInput.addEventListener("input", (event) => {
    state.manualSearchTerm = event.target.value;
    state.manualCreateOpen = false;
    elements.manualSearchResults.hidden =
      state.workMode !== "manual" || Boolean(state.selectedLeadId) || !state.manualSearchTerm.trim();
    renderManualSearchResults();
  });
  elements.manualCompanyNameInput.addEventListener("input", updateManualBranchHint);
  elements.manualBranchInput.addEventListener("input", handleManualBranchInput);
  elements.manualBranchInput.addEventListener("change", handleManualBranchInput);
  elements.manualCampaignSelect?.addEventListener("change", handleManualCampaignSelect);
  elements.toggleManualCreateButton.addEventListener("click", () => {
    state.manualCreateOpen = !state.manualCreateOpen;
    state.manualCreateFeedback = "";
    state.manualSelectedCampaignId = "";
    renderWorkMode();
  });
  elements.closeManualCreatePanelButton.addEventListener("click", () => {
    state.manualCreateOpen = false;
    state.manualCreateFeedback = "";
    state.manualSelectedCampaignId = "";
    renderWorkMode();
  });
  elements.createManualLeadButton.addEventListener("click", createManualLeadAction);

  elements.workContactInput.addEventListener("input", (event) => updateDraft("contactName", event.target.value));
  elements.workNoteInput.addEventListener("input", (event) => updateDraft("note", event.target.value));
  elements.workNoteInput.addEventListener("input", autoResizeTextarea);
  elements.reminderTypeInput.addEventListener("change", (event) => updateDraft("reminderType", event.target.value));
  elements.reminderDateInput.addEventListener("input", (event) => updateDraft("reminderDate", event.target.value));
  elements.reminderTimeInput.addEventListener("input", (event) => updateDraft("reminderTime", event.target.value));
  elements.reminderNoteInput.addEventListener("input", (event) => updateDraft("reminderNote", event.target.value));
  elements.manualBackButton.addEventListener("click", () => {
    if (!confirmDiscardDraft()) {
      return;
    }
    state.selectedLeadId = "";
    state.workNotice = "";
    state.manualSearchTerm = "";
    state.manualCreateOpen = false;
    state.workDraft = createEmptyWorkDraft();
    render();
  });
  elements.workPreviousLeadButton.addEventListener("click", openPreviousLead);
  elements.workDeleteLeadButton.addEventListener("click", deleteCurrentWorkLead);
  elements.workSaveButton.addEventListener("click", () => saveWorkDraft(false));
  elements.workSaveAndNextButton.addEventListener("click", () => saveWorkDraft(true));

  elements.customersCatalogModeButton.addEventListener("click", () => {
    state.customersMode = "catalog";
    renderCustomers();
  });
  elements.customersAllModeButton.addEventListener("click", () => {
    state.customersMode = "all";
    renderCustomers();
  });
  elements.customersTrashModeButton.addEventListener("click", () => {
    state.customersMode = "trash";
    renderCustomers();
  });
  elements.customerSearchInput.addEventListener("input", (event) => {
    state.filters.customerSearch = event.target.value;
    scheduleCustomerFilterRender();
  });
  elements.customerStatusFilter.addEventListener("change", (event) => {
    state.filters.customerStatus = event.target.value;
    renderCustomers();
  });
  elements.customerCategoryFilter.addEventListener("input", (event) => {
    state.filters.customerCategory = event.target.value;
    scheduleCustomerFilterRender();
  });
  elements.customerCityFilter.addEventListener("input", (event) => {
    state.filters.customerCity = event.target.value;
    scheduleCustomerFilterRender();
  });
  elements.customerSelectVisibleButton.addEventListener("click", () => {
    selectVisibleCustomers();
    renderCustomers();
  });
  elements.customerClearSelectionButton.addEventListener("click", () => {
    clearCustomerSelection();
    renderCustomers();
  });
  elements.customerBulkStatusSelect.addEventListener("change", () => updateCustomerBulkBar());
  elements.customerBulkStatusButton.addEventListener("click", () => bulkUpdateSelectedCustomers(elements.customerBulkStatusSelect.value));
  elements.customerBulkDoneButton.addEventListener("click", () => bulkUpdateSelectedCustomers("Closed"));
  elements.customerBulkDeleteButton.addEventListener("click", bulkDeleteSelectedCustomers);
  elements.customerBulkRestoreButton.addEventListener("click", bulkRestoreSelectedCustomers);
  elements.customerBulkPurgeButton.addEventListener("click", bulkPurgeSelectedCustomers);

  elements.campaignsCatalogModeButton.addEventListener("click", () => {
    state.campaignsMode = "catalog";
    renderCampaigns();
  });
  elements.campaignsAllModeButton.addEventListener("click", () => {
    state.campaignsMode = "all";
    renderCampaigns();
  });
  elements.campaignSelectVisibleButton.addEventListener("click", () => {
    selectVisibleCampaigns();
    renderCampaigns();
  });
  elements.campaignClearSelectionButton.addEventListener("click", () => {
    clearCampaignSelection();
    renderCampaigns();
  });
  elements.campaignBulkDeleteButton.addEventListener("click", bulkDeleteSelectedCampaigns);

  elements.searchPlacesButton.addEventListener("click", searchPlacesAction);
  elements.selectAllPlacesButton.addEventListener("click", () => {
    state.placesSelection = Object.fromEntries(state.placesResults.map((lead) => [lead.id, true]));
    renderCampaigns();
  });
  elements.clearAllPlacesButton.addEventListener("click", () => {
    state.placesSelection = Object.fromEntries(state.placesResults.map((lead) => [lead.id, false]));
    renderCampaigns();
  });
  elements.savePlacesCampaignButton.addEventListener("click", savePlacesAsCampaign);
  elements.csvFileInput.addEventListener("change", importCsvAction);
  elements.saveTelavoxSettingsButton.addEventListener("click", saveTelavoxSettingsAction);

  elements.planScheduleButton.addEventListener("click", planScheduleAction);
  elements.clearScheduleButton.addEventListener("click", clearScheduleAction);
  elements.planningMonthInput.addEventListener("change", () => {
    state.planningData = derivePlanningDataFromState();
    renderPlanning();
  });
  elements.planningCampaignSelect.addEventListener("change", renderPlanning);

  elements.exportScheduleCsvButton.addEventListener("click", exportScheduleCsv);
  elements.exportScheduleIcsButton.addEventListener("click", exportScheduleIcs);
  elements.exportLeadsCsvButton.addEventListener("click", exportLeadsCsv);

  elements.closeProfileModalButton.addEventListener("click", closeProfileModal);
  elements.profileModal.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeModal === "true") {
      closeProfileModal();
    }
  });
  elements.profileCallButton.addEventListener("click", () => {
    void openSelectedLeadLink("phone", true);
  });
  elements.profileOpenWebsite.addEventListener("click", () => {
    void openSelectedLeadLink("website");
  });
  elements.profileOpenMaps.addEventListener("click", () => {
    void openSelectedLeadLink("googleMapsUrl");
  });
  elements.profileSaveNotes.addEventListener("click", saveProfileNotes);
  elements.profileSyncTelavoxButton.addEventListener("click", syncSelectedLeadTelavox);
  elements.profileTelavoxCalls.addEventListener("click", handleTelavoxCallAction);
  elements.closeEditLeadModalButton?.addEventListener("click", closeEditLeadModal);
  elements.cancelEditLeadButton?.addEventListener("click", closeEditLeadModal);
  elements.editLeadModal?.addEventListener("click", (event) => {
    if (event.target instanceof HTMLElement && event.target.dataset.closeEditModal === "true") {
      closeEditLeadModal();
    }
  });
  elements.editCampaignSelect?.addEventListener("change", handleEditCampaignSelect);
  elements.saveEditLeadButton?.addEventListener("click", saveEditLeadAction);
}

async function refreshState() {
  state.data = await window.desktopApp.getState();
  if (state.workMode === "flow" && !findLead(state.selectedLeadId)) {
    state.selectedLeadId = "";
  }
  if (state.workMode === "manual" && !findLead(state.selectedLeadId)) {
    state.selectedLeadId = "";
  }
  state.planningData = derivePlanningDataFromState();
  syncWorkDraftWithSelectedLead();
}

function hydrateSettings() {
  elements.apiKeyInput.value = state.data.settings.apiKey ?? "";
  elements.telavoxTokenInput.value = state.data.settings.telavoxToken ?? "";
  elements.telavoxFromDateInput.value = state.data.settings.telavoxFromDate ?? formatLocalDate(daysAgo(30));
  elements.planningDailyTargetInput.value = String(state.data.settings.dailyTarget ?? 40);
  elements.planningMonthInput.value = state.data.settings.lastPlannedMonth ?? currentMonthKey();
}

function getStoredUiZoom() {
  return clampUiZoom(Number(localStorage.getItem("salesSystemUiZoom") || 100));
}

function clampUiZoom(value) {
  if (!Number.isFinite(value)) {
    return 100;
  }
  return Math.min(115, Math.max(80, Math.round(value / 5) * 5));
}

function applyUiZoom(value) {
  const nextZoom = clampUiZoom(value);
  document.body.style.zoom = String(nextZoom / 100);
  if (elements.uiZoomSlider) {
    elements.uiZoomSlider.value = String(nextZoom);
  }
  if (elements.uiZoomValue) {
    elements.uiZoomValue.textContent = `${nextZoom}%`;
  }
}

async function setupUpdateStatus() {
  if (!window.desktopApp?.getUpdateStatus) {
    return;
  }
  state.updateStatus = await window.desktopApp.getUpdateStatus();
  window.desktopApp.onUpdateStatus?.((status) => {
    state.updateStatus = status;
    renderUpdateControl();
  });
}

function renderUpdateControl() {
  if (!elements.updateControl) {
    return;
  }
  const update = state.updateStatus || {};
  const shouldShow = update.isPackaged || ["checking", "available", "downloading", "downloaded", "error"].includes(update.status);
  elements.updateControl.hidden = !shouldShow;
  if (!shouldShow) {
    return;
  }

  const versionLabel = update.version ? `v${update.version}` : "";
  elements.updateStatusText.textContent = update.message || `Sales System ${versionLabel}`;
  elements.checkUpdatesButton.hidden = ["checking", "downloading", "downloaded"].includes(update.status);
  elements.downloadUpdateButton.hidden = update.status !== "available";
  elements.installUpdateButton.hidden = update.status !== "downloaded";
}

function render() {
  try {
    trackViewHistory();
    document.body.dataset.view = state.currentView;
    document.body.classList.toggle("is-work-view", state.currentView === "work");
    elements.navButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === state.currentView);
    });
    Object.entries(elements.views).forEach(([key, view]) => {
      view.classList.toggle("is-active", key === state.currentView);
    });

    elements.topbarTitle.textContent = {
      dashboard: "Dashboard",
      work: "Arbetsläge",
      customers: "Kunder",
      campaigns: "Listor / kampanjer",
      planning: "Planering",
      reminders: "Påminnelser",
      export: "Export"
    }[state.currentView];
    if (elements.topbarBackButton) {
      elements.topbarBackButton.hidden = state.viewHistory.length === 0;
    }
    renderUpdateControl();

    safeRenderSection("selectors", renderSelectors);
    safeRenderSection("dashboard", renderDashboard);
    safeRenderSection("work", renderWorkMode);
    safeRenderSection("customers", renderCustomers);
    safeRenderSection("campaigns", renderCampaigns);
    safeRenderSection("planning", renderPlanning);
    safeRenderSection("reminders", renderReminders);
    safeRenderSection("export", renderExport);
    safeRenderSection("profile", renderProfile);
  } catch (error) {
    reportRuntimeError("Render-fel", error);
  }
}

function trackViewHistory() {
  if (!state.lastRenderedView) {
    state.lastRenderedView = state.currentView;
    return;
  }

  if (state.currentView === state.lastRenderedView) {
    return;
  }

  if (!state.suppressViewHistory) {
    state.viewHistory.push(captureNavigationSnapshot(state.lastRenderedView));
    if (state.viewHistory.length > 30) {
      state.viewHistory.shift();
    }
  }

  state.suppressViewHistory = false;
  state.lastRenderedView = state.currentView;
}

function captureNavigationSnapshot(view) {
  return {
    view,
    selectedLeadId: state.selectedLeadId,
    workMode: state.workMode,
    customersMode: state.customersMode,
    campaignsMode: state.campaignsMode,
    filters: { ...state.filters },
    reminderViewMode: state.reminderViewMode,
    selectedReminderDate: state.selectedReminderDate,
    selectedPlanningDate: state.selectedPlanningDate,
    workQueue: {
      campaignId: state.workQueue.campaignId,
      plannedDate: state.workQueue.plannedDate,
      skippedLeadIds: [...getQueueExcludeIds()]
    }
  };
}

function restoreNavigationSnapshot(snapshot) {
  state.currentView = snapshot.view;
  state.selectedLeadId = snapshot.selectedLeadId || "";
  state.workMode = snapshot.workMode || state.workMode;
  state.customersMode = snapshot.customersMode || state.customersMode;
  state.campaignsMode = snapshot.campaignsMode || state.campaignsMode;
  state.filters = { ...state.filters, ...(snapshot.filters || {}) };
  state.reminderViewMode = snapshot.reminderViewMode || state.reminderViewMode;
  state.selectedReminderDate = snapshot.selectedReminderDate || "";
  state.selectedPlanningDate = snapshot.selectedPlanningDate || "";
  state.workQueue = {
    ...state.workQueue,
    ...(snapshot.workQueue || {}),
    skippedLeadIds: Array.isArray(snapshot.workQueue?.skippedLeadIds) ? snapshot.workQueue.skippedLeadIds : []
  };
}

function goBack() {
  const previous = state.viewHistory.pop();
  if (!previous) {
    return;
  }
  state.suppressViewHistory = true;
  restoreNavigationSnapshot(previous);
  render();
}

function renderSelectors() {
  const campaignSelects = [
    { element: elements.workCampaignFilter, label: "Alla listor" },
    { element: elements.csvCampaignSelect, label: "Ingen lista" },
    { element: elements.planningCampaignSelect, label: "Alla öppna leads" }
  ];

  campaignSelects.forEach(({ element, label }) => {
    const currentValue = element.value;
    element.innerHTML = `<option value="">${label}</option>`;
    state.data.campaigns.forEach((campaign) => {
      const option = document.createElement("option");
      option.value = campaign.id;
      option.textContent = campaign.name;
      element.appendChild(option);
    });
    if ([...element.options].some((option) => option.value === currentValue)) {
      element.value = currentValue;
    }
  });

  elements.customerStatusFilter.innerHTML = `<option value="">Alla statusar</option>${LEAD_STATUSES.map(
    (status) => `<option value="${status}">${status}</option>`
  ).join("")}`;
  elements.customerStatusFilter.value = state.filters.customerStatus;
  elements.customerBulkStatusSelect.innerHTML = `<option value="">VÃ¤lj ny status</option>${LEAD_STATUSES.map(
    (status) => `<option value="${status}">${status}</option>`
  ).join("")}`;
  renderManualBranchSuggestions();
  renderManualCampaignOptions();
}

function renderDashboard() {
  const activeLeads = state.data.leads.filter((lead) => !lead.isDeleted);
  const cards = [
    ...LEAD_STATUSES.map((status) => ({
      label: status,
      value: activeLeads.filter((lead) => lead.status === status).length,
      onClick: () => openCustomerFilter({ status })
    })),
    {
      label: "Påminnelser idag",
      value: getDueReminders().length,
      onClick: () => {
        state.currentView = "reminders";
        state.reminderViewMode = "due";
        state.selectedReminderDate = "";
        render();
      }
    }
  ];

  elements.dashboardStats.innerHTML = "";
  cards.forEach((cardData) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "stat-card";
    card.innerHTML = `<p class="section-label">${escapeHtml(cardData.label)}</p><strong>${cardData.value}</strong>`;
    card.addEventListener("click", cardData.onClick);
    elements.dashboardStats.appendChild(card);
  });

  const nextLead = getSelectedLead() ?? getNextLeadFromState();
  elements.dashboardFocusCopy.textContent = nextLead
    ? `${nextLead.companyName} är nästa steg. ${nextLead.status} · ${nextLead.normalizedCity || nextLead.city || "Ort saknas"} · ${formatReminderLabel(getNextOpenReminder(nextLead.id))}`
    : "Inga öppna leads just nu.";
  const todayCards = buildTodayActionCards();
  const visibleTodayCards = state.dashboardTodayExpanded ? todayCards : [];
  elements.dashboardTodayList.hidden = !state.dashboardTodayExpanded && todayCards.length > 0;
  renderSimpleList(elements.dashboardTodayList, visibleTodayCards, "Inget akut idag.");
  if (elements.dashboardTodayToggle) {
    const hasTodayItems = todayCards.length > 0;
    elements.dashboardTodayToggle.hidden = !hasTodayItems;
    elements.dashboardTodayToggle.textContent = state.dashboardTodayExpanded
      ? "Dölj lista"
      : `Visa ${todayCards.length} saker`;
  }
  renderDashboardTodayHero();
  renderDashboardWeekOverview();
  renderRecentActivity();
  void loadDashboardWeather();
}

function renderRecentActivity() {
  if (!elements.dashboardActivityList) {
    return;
  }

  const range = getDashboardActivityRange();
  const entries = getRecentActivityEntries(range);
  const pageSize = 10;
  const totalPages = Math.max(1, Math.ceil(entries.length / pageSize));
  if (state.dashboardActivityPage >= totalPages) {
    state.dashboardActivityPage = totalPages - 1;
  }
  const startIndex = state.dashboardActivityShowAll ? 0 : state.dashboardActivityPage * pageSize;
  const visibleEntries = state.dashboardActivityShowAll
    ? entries
    : entries.slice(startIndex, startIndex + pageSize);
  const visibleStart = entries.length ? startIndex + 1 : 0;
  const visibleEnd = state.dashboardActivityShowAll ? entries.length : Math.min(entries.length, startIndex + pageSize);
  if (elements.dashboardActivityDateInput) {
    elements.dashboardActivityDateInput.value = range.dateValue;
  }
  elements.dashboardActivityRangeButtons?.querySelectorAll("[data-activity-range]").forEach((button) => {
    button.classList.toggle("is-active", state.dashboardActivityRange === button.dataset.activityRange);
  });
  if (elements.dashboardActivitySummary) {
    elements.dashboardActivitySummary.textContent = entries.length
      ? `${entries.length} kunder bearbetade ${range.label.toLowerCase()}. Visar ${state.dashboardActivityShowAll ? "alla" : `${visibleStart}-${visibleEnd}`} av ${entries.length}.`
      : `Inga bearbetade kunder ${range.label.toLowerCase()}.`;
  }
  renderSimpleList(
    elements.dashboardActivityList,
    visibleEntries.map((entry) => createRecentActivityCard(entry)),
    `Inga bearbetade kunder ${range.label.toLowerCase()}.`
  );
  updateDashboardActivityPager(entries.length, totalPages);
}

function updateDashboardActivityPager(totalCount, totalPages) {
  if (!elements.dashboardActivityPager) {
    return;
  }
  const showPager = totalCount > 10;
  elements.dashboardActivityPager.hidden = !showPager;
  if (!showPager) {
    return;
  }
  elements.dashboardActivityPrevButton.disabled = state.dashboardActivityShowAll || state.dashboardActivityPage <= 0;
  elements.dashboardActivityNextButton.disabled = state.dashboardActivityShowAll || state.dashboardActivityPage >= totalPages - 1;
  elements.dashboardActivityPageText.textContent = state.dashboardActivityShowAll
    ? `Visar alla ${totalCount}`
    : `Sida ${state.dashboardActivityPage + 1} av ${totalPages}`;
  elements.dashboardActivityShowAllButton.textContent = state.dashboardActivityShowAll
    ? "Visa 10 per sida"
    : `Visa alla ${totalCount}`;
}

function resetDashboardActivityPaging() {
  state.dashboardActivityPage = 0;
  state.dashboardActivityShowAll = false;
}

function getDashboardActivityRange() {
  const todayKey = formatLocalDate(new Date());
  if (state.dashboardActivityRange === "yesterday") {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const dateKey = formatLocalDate(date);
    return { startKey: dateKey, endKey: dateKey, dateValue: dateKey, label: "Igår" };
  }
  if (state.dashboardActivityRange === "week") {
    const date = new Date();
    date.setDate(date.getDate() - 6);
    return { startKey: formatLocalDate(date), endKey: todayKey, dateValue: todayKey, label: "Senaste 7 dagarna" };
  }
  if (state.dashboardActivityRange === "date") {
    const dateKey = state.dashboardActivityDate || todayKey;
    return { startKey: dateKey, endKey: dateKey, dateValue: dateKey, label: formatActivityDateLabel(dateKey) };
  }
  return { startKey: todayKey, endKey: todayKey, dateValue: todayKey, label: "Idag" };
}

function getDateForDashboardActivityRange(range) {
  const date = new Date();
  if (range === "yesterday") {
    date.setDate(date.getDate() - 1);
  }
  return formatLocalDate(date);
}

function getRecentActivityEntries(range) {
  const latestByLead = new Map();
  state.data.logEntries
    .filter((entry) => entry.leadId && entry.type !== "created")
    .forEach((entry) => {
      const createdAt = new Date(entry.createdAt);
      if (Number.isNaN(createdAt.getTime())) {
        return;
      }
      const dateKey = formatLocalDate(createdAt);
      if (dateKey < range.startKey || dateKey > range.endKey) {
        return;
      }
      const lead = findLead(entry.leadId);
      if (!lead) {
        return;
      }
      const existing = latestByLead.get(entry.leadId);
      if (!existing || new Date(entry.createdAt) > new Date(existing.entry.createdAt)) {
        latestByLead.set(entry.leadId, { lead, entry, dateKey });
      }
    });

  return [...latestByLead.values()]
    .sort((left, right) => new Date(right.entry.createdAt) - new Date(left.entry.createdAt));
}

function createRecentActivityCard(activity) {
  const { lead, entry, dateKey } = activity;
  const card = document.createElement("article");
  card.className = `list-card action-card${lead.isDeleted ? " is-muted" : ""}`;
  card.innerHTML = `
    <div class="row-header">
      <strong>${escapeHtml(lead.companyName || "Okänd kund")}</strong>
      <span class="status-badge" data-status="${escapeHtml(lead.status)}">${escapeHtml(lead.status)}</span>
    </div>
    <p class="meta-line">${escapeHtml(getTimelineTypeLabel(entry.type))} · ${escapeHtml(formatActivityTimeLabel(entry.createdAt, dateKey))}</p>
    <p class="meta-line">${escapeHtml(entry.text || entry.title || "Aktivitet registrerad")}</p>
    <p class="meta-line">${escapeHtml(lead.targetMarketCity || lead.normalizedCity || lead.city || "Ort saknas")} · ${escapeHtml(getCampaignName(lead.listId) || "Ingen lista")}</p>
  `;
  const actions = document.createElement("div");
  actions.className = "inline-actions compact-actions";
  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "secondary-button";
  openButton.textContent = lead.isDeleted ? "Visa i papperskorg" : "Öppna kund";
  openButton.addEventListener("click", () => openRecentActivityLead(lead.id));
  actions.appendChild(openButton);
  card.appendChild(actions);
  card.addEventListener("click", () => openRecentActivityLead(lead.id));
  return card;
}

function openRecentActivityLead(leadId) {
  const lead = findLead(leadId);
  if (!lead) {
    return;
  }
  if (lead.isDeleted) {
    state.customersMode = "trash";
    state.filters.customerSearch = lead.companyName || "";
    state.filters.customerStatus = "";
    state.filters.customerCategory = "";
    state.filters.customerCity = "";
    state.filters.customerCampaignId = "";
    state.currentView = "customers";
    render();
    return;
  }
  selectLead(lead.id, "work");
}

function renderDashboardTodayHero() {
  const now = new Date();
  const today = formatLocalDate(now);
  const overdueCount = state.data.reminders.filter((reminder) => {
    const lead = findLead(reminder.leadId);
    return !reminder.completed && reminder.dueDate && reminder.dueDate < today && !lead?.isDeleted;
  }).length;
  const todayReminderCount = state.data.reminders.filter((reminder) => {
    const lead = findLead(reminder.leadId);
    return !reminder.completed && reminder.dueDate === today && !lead?.isDeleted;
  }).length;
  const plannedCount = state.data.scheduleItems.filter((item) => {
    const lead = findLead(item.leadId);
    return item.plannedDate === today && !item.completed && !lead?.isDeleted;
  }).length;

  if (elements.dashboardTodayTitle) {
    elements.dashboardTodayTitle.textContent = getDashboardWeekday(now);
  }
  if (elements.dashboardTodayDate) {
    elements.dashboardTodayDate.textContent = formatLongDashboardDate(now);
  }
  if (elements.dashboardSpecialDay) {
    elements.dashboardSpecialDay.textContent = getSpecialDayText(now);
  }
  if (elements.dashboardTodaySummary) {
    elements.dashboardTodaySummary.innerHTML = [
      ["Försenade", overdueCount],
      ["Påminnelser idag", todayReminderCount],
      ["Planerade samtal", plannedCount]
    ].map(([label, value], index) => `
      <button class="today-summary-card" type="button" data-dashboard-today-action="${index === 2 ? "planning" : "reminders"}">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value)}</strong>
      </button>
    `).join("");
    elements.dashboardTodaySummary.querySelectorAll("[data-dashboard-today-action]").forEach((button) => {
      button.addEventListener("click", () => {
        if (button.dataset.dashboardTodayAction === "planning") {
          state.currentView = "planning";
          render();
          return;
        }
        state.currentView = "reminders";
        state.reminderViewMode = "due";
        render();
      });
    });
  }
  renderDashboardWeather();
}

function renderDashboardWeekOverview() {
  if (!elements.dashboardWeekOverview) {
    return;
  }

  const days = getDashboardWeekOverviewDays();
  elements.dashboardWeekOverview.innerHTML = days.map((day) => {
    const chips = [
      `<span class="week-chip is-target">${escapeHtml(`${day.dailyTarget} samtal`)}</span>`,
      day.overdueCount ? `<span class="week-chip is-overdue">${day.overdueCount} försenade</span>` : "",
      day.reminderCount ? `<span class="week-chip is-reminder">${day.reminderCount} reminders</span>` : "",
      day.plannedCount ? `<span class="week-chip is-planned">${day.plannedCount} samtal</span>` : ""
    ].filter(Boolean).join("");
    return `
      <button class="week-day-card${day.isToday ? " is-today" : ""}" type="button" data-dashboard-day="${day.dateKey}">
        <span class="week-day-card__label">${escapeHtml(day.relativeLabel)}</span>
        <strong>${escapeHtml(day.title)}</strong>
        <span class="week-day-card__meta">${escapeHtml(day.meta)}</span>
        <span class="week-day-card__chips">${chips || `<span class="week-chip is-empty">Lugnt</span>`}</span>
      </button>
    `;
  }).join("");

  elements.dashboardWeekOverview.querySelectorAll("[data-dashboard-day]").forEach((button) => {
    button.addEventListener("click", () => {
      const day = days.find((item) => item.dateKey === button.dataset.dashboardDay);
      openDashboardWeekDay(day);
    });
  });
}

function getDashboardWeekOverviewDays() {
  const todayDate = new Date();
  todayDate.setHours(12, 0, 0, 0);
  const todayKey = formatLocalDate(todayDate);
  const days = [];
  const cursor = new Date(todayDate);
  const dailyTarget = Math.max(1, Number(state.data.settings?.dailyTarget) || Number(elements.planningDailyTargetInput?.value) || 40);

  while (days.length < 5) {
    const dateKey = formatLocalDate(cursor);
    const isToday = dateKey === todayKey;
    const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
    if (isToday || !isWeekend) {
      const stats = getDashboardDayStats(dateKey, todayKey);
      days.push({
        dateKey,
        isToday,
        relativeLabel: getRelativeDashboardDayLabel(dateKey, todayKey),
        title: formatDashboardWeekDayTitle(cursor),
        meta: stats.meta,
        dailyTarget,
        overdueCount: stats.overdueCount,
        reminderCount: stats.reminderCount,
        plannedCount: stats.plannedCount
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

function getDashboardDayStats(dateKey, todayKey) {
  const reminderCount = state.data.reminders.filter((reminder) => {
    const lead = findLead(reminder.leadId);
    return !reminder.completed && reminder.dueDate === dateKey && !lead?.isDeleted;
  }).length;
  const overdueCount = dateKey === todayKey
    ? state.data.reminders.filter((reminder) => {
      const lead = findLead(reminder.leadId);
      return !reminder.completed && reminder.dueDate && reminder.dueDate < todayKey && !lead?.isDeleted;
    }).length
    : 0;
  const plannedCount = state.data.scheduleItems.filter((item) => {
    const lead = findLead(item.leadId);
    return item.plannedDate === dateKey && !item.completed && !lead?.isDeleted;
  }).length;
  const parts = [];
  if (overdueCount) parts.push(`${overdueCount} försenade`);
  if (reminderCount) parts.push(`${reminderCount} påminnelser`);
  if (plannedCount) parts.push(`${plannedCount} planerade`);
  return {
    overdueCount,
    reminderCount,
    plannedCount,
    meta: parts.length ? parts.join(" · ") : "Inget bokat"
  };
}

function openDashboardWeekDay(day) {
  if (!day) {
    return;
  }
  state.selectedPlanningDate = day.dateKey;
  state.selectedReminderDate = day.dateKey;
  state.currentView = "reminders";
  state.reminderViewMode = "date";
  render();
}

function renderDashboardWeather() {
  if (!elements.dashboardWeatherValue || !elements.dashboardWeatherMeta) {
    return;
  }
  const weather = state.dashboardWeather;
  if (weather.loaded && !weather.error) {
    elements.dashboardWeatherValue.textContent = `${weather.temperature}° · ${describeWeatherCode(weather.code)}`;
    elements.dashboardWeatherMeta.textContent = `Stockholm · vind ${weather.windSpeed} m/s`;
    return;
  }
  if (weather.error) {
    elements.dashboardWeatherValue.textContent = "";
    elements.dashboardWeatherMeta.textContent = weather.error;
    return;
  }
  elements.dashboardWeatherValue.textContent = "";
  elements.dashboardWeatherMeta.textContent = "Stockholm";
}

async function loadDashboardWeather() {
  if (state.dashboardWeather.loaded || state.dashboardWeather.loading || typeof fetch !== "function") {
    return;
  }
  state.dashboardWeather.loading = true;
  try {
    const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=59.3293&longitude=18.0686&current=temperature_2m,weather_code,wind_speed_10m&timezone=Europe%2FStockholm");
    if (!response.ok) {
      throw new Error(`Väder API ${response.status}`);
    }
    const payload = await response.json();
    state.dashboardWeather = {
      loading: false,
      loaded: true,
      temperature: Math.round(Number(payload.current?.temperature_2m ?? 0)),
      windSpeed: Math.round(Number(payload.current?.wind_speed_10m ?? 0)),
      code: payload.current?.weather_code ?? null,
      error: ""
    };
  } catch (error) {
    state.dashboardWeather = {
      loading: false,
      loaded: false,
      temperature: "",
      windSpeed: "",
      code: null,
      error: "Kunde inte hämta väder"
    };
  }
  if (state.currentView === "dashboard") {
    renderDashboardWeather();
  }
}

function formatLongDashboardDate(date) {
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "long"
  }).format(date);
}

function formatDashboardWeekDayTitle(date) {
  const weekday = new Intl.DateTimeFormat("sv-SE", { weekday: "short" })
    .format(date)
    .replace(".", "");
  return `${weekday.charAt(0).toUpperCase()}${weekday.slice(1)} ${date.getDate()}`;
}

function getRelativeDashboardDayLabel(dateKey, todayKey) {
  const today = new Date(`${todayKey}T12:00:00`);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (dateKey === todayKey) {
    return "Idag";
  }
  if (dateKey === formatLocalDate(tomorrow)) {
    return "Imorgon";
  }
  return getDashboardWeekday(new Date(`${dateKey}T12:00:00`));
}

function getDashboardWeekday(date) {
  const weekday = new Intl.DateTimeFormat("sv-SE", { weekday: "long" }).format(date);
  return weekday.charAt(0).toUpperCase() + weekday.slice(1);
}

function formatActivityDateLabel(dateKey) {
  const today = formatLocalDate(new Date());
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = formatLocalDate(yesterday);
  if (dateKey === today) {
    return "Idag";
  }
  if (dateKey === yesterdayKey) {
    return "Igår";
  }
  return new Intl.DateTimeFormat("sv-SE", {
    day: "numeric",
    month: "short"
  }).format(new Date(`${dateKey}T12:00:00`));
}

function formatActivityTimeLabel(value, dateKey) {
  const time = new Intl.DateTimeFormat("sv-SE", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
  return `${formatActivityDateLabel(dateKey)} ${time}`;
}

function getSpecialDayText(date) {
  const key = `${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const days = {
    "01-01": "Nyårsdagen",
    "01-06": "Trettondedag jul",
    "02-14": "Alla hjärtans dag",
    "04-30": "Valborg och Kungens födelsedag",
    "05-01": "Första maj",
    "06-06": "Sveriges nationaldag",
    "10-31": "Halloween",
    "12-24": "Julafton",
    "12-31": "Nyårsafton"
  };
  return days[key] ? `Särskild dag: ${days[key]}` : "Ingen särskild dag i kalendern. Fokus på säljarbetet.";
}

function describeWeatherCode(code) {
  if ([0].includes(Number(code))) return "klart";
  if ([1, 2, 3].includes(Number(code))) return "molnigt";
  if ([45, 48].includes(Number(code))) return "dimma";
  if ([51, 53, 55, 56, 57].includes(Number(code))) return "duggregn";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(Number(code))) return "regn";
  if ([71, 73, 75, 77, 85, 86].includes(Number(code))) return "snö";
  if ([95, 96, 99].includes(Number(code))) return "åska";
  return "väder";
}

function renderPlanning() {
  const planning = state.planningData ?? derivePlanningDataFromState();
  renderCalendar(planning);
  renderSimpleList(
    elements.planningSummary,
    [
      ...(planning.branchSummaries || []).map((summary) => {
        const card = document.createElement("article");
        card.className = "planning-block";
        card.innerHTML = `
          <strong>${escapeHtml(summary.branch)}</strong>
          <p class="meta-line">${summary.totalLeads} leads · ${summary.estimatedDays} dagar</p>
          <p class="meta-line">${escapeHtml(summary.cityBreakdown.map((entry) => `${entry.city} ${entry.count}`).join(", ") || "Ingen stadssplit")}</p>
        `;
        return card;
      }),
      ...planning.blocks.map((block) => {
        const card = document.createElement("article");
        card.className = "planning-block";
        card.innerHTML = `
          <strong>${escapeHtml(block.fromDate)}–${escapeHtml(block.toDate)} · ${escapeHtml(block.branch)}</strong>
          <p class="meta-line">${block.totalLeads} leads</p>
          <p class="meta-line">${escapeHtml(block.cityBreakdown.map((entry) => `${entry.city} ${entry.count}`).join(", ") || "Ingen stadssplit")}</p>
        `;
        return card;
      })
    ],
    "Ingen planering för vald månad."
  );
}

function renderCalendar(planning) {
  const monthKey = elements.planningMonthInput.value || currentMonthKey();
  const cells = buildCalendarCells(monthKey, planning.dayPlans || []);
  elements.planningCalendar.innerHTML = "";
  ["Mån", "Tis", "Ons", "Tor", "Fre", "Lör", "Sön"].forEach((weekday) => {
    const header = document.createElement("div");
    header.className = "calendar-weekday";
    header.textContent = weekday;
    elements.planningCalendar.appendChild(header);
  });
  cells.forEach((cell) => {
    const node = document.createElement("article");
    const plannedLeadIds = cell.plan?.leadIds || [];
    const completedCount = state.data.scheduleItems.filter((item) => item.plannedDate === cell.dateKey && item.completed).length;
    const cityLabel = cell.plan?.cityBreakdown?.[0]?.city || "";
    node.className = `calendar-cell${cell.isCurrentMonth ? "" : " is-muted"}${cell.plan?.totalLeads ? " is-planned" : ""}${cell.isWeekend ? " is-weekend" : ""}`;
    node.innerHTML = `
      <p class="calendar-date">${cell.dateLabel}</p>
      <strong>${escapeHtml(cell.plan?.branch || "")}</strong>
      <p class="meta-line">${cell.plan?.totalLeads ? `${cell.plan.totalLeads} leads` : ""}</p>
      <p class="meta-line">${escapeHtml(cityLabel)}</p>
      <p class="meta-line">${cell.plan?.totalLeads ? `${completedCount}/${plannedLeadIds.length}` : ""}</p>
    `;
    if (cell.plan?.totalLeads) {
      node.type = "button";
      node.tabIndex = 0;
      node.addEventListener("click", () => startWorkFromPlannedDay(cell.dateKey));
      node.addEventListener("keydown", (event) => {
        if (event.key === "Enter" || event.key === " ") {
          startWorkFromPlannedDay(cell.dateKey);
        }
      });
    }
    elements.planningCalendar.appendChild(node);
  });
}

function renderReminders() {
  const today = formatLocalDate(new Date());
  const reminders = [...state.data.reminders]
    .filter((reminder) => {
      const lead = findLead(reminder.leadId);
      return lead && !lead.isDeleted;
    })
    .sort((left, right) => `${left.dueDate} ${left.dueTime}`.localeCompare(`${right.dueDate} ${right.dueTime}`));
  const overdueReminders = reminders.filter((reminder) => !reminder.completed && reminder.dueDate && reminder.dueDate < today);
  const selectedDate = state.selectedReminderDate || today;
  const plannedItemsForDate = state.data.scheduleItems
    .filter((item) => item.plannedDate === selectedDate && !item.completed)
    .filter((item) => {
      const lead = findLead(item.leadId);
      return lead && !lead.isDeleted;
    })
    .sort((left, right) => left.orderIndex - right.orderIndex);

  const groups = state.reminderViewMode === "date"
    ? [
        {
          title: "Försenade",
          type: "reminder",
          items: overdueReminders,
          urgent: true
        },
        {
          title: `Påminnelser ${formatWeekdayDate(selectedDate)}`,
          type: "reminder",
          items: reminders.filter((reminder) => !reminder.completed && reminder.dueDate === selectedDate)
        },
        {
          title: `Bokat ${formatWeekdayDate(selectedDate)}`,
          type: "planned",
          items: plannedItemsForDate
        }
      ]
    : [
        {
          title: "Försenade",
          type: "reminder",
          items: overdueReminders,
          urgent: true
        },
        {
          title: "Idag",
          type: "reminder",
          items: reminders.filter((reminder) => !reminder.completed && reminder.dueDate === today)
        },
        {
          title: "Kommande",
          type: "reminder",
          items: state.reminderViewMode === "due"
            ? []
            : reminders.filter((reminder) => !reminder.completed && reminder.dueDate && reminder.dueDate > today)
        }
      ];

  const cards = groups.flatMap((group) => {
    if (!group.items.length) {
      return [];
    }
    const header = document.createElement("article");
    header.className = `info-card reminder-group-header${group.urgent ? " is-urgent" : ""}`;
    header.innerHTML = `<strong>${escapeHtml(group.title)}</strong><p class="meta-line">${group.items.length} poster</p>`;
    return [
      header,
      ...group.items
        .map((item) => group.type === "planned" ? createPlannedDayCard(item) : createReminderTaskCard(item, today))
        .filter(Boolean)
    ];
  });

  renderSimpleList(elements.remindersList, cards, state.reminderViewMode === "date" ? "Inget bokat den dagen." : "Inga påminnelser.");
}

function createReminderTaskCard(reminder, today) {
  const lead = findLead(reminder.leadId);
  if (!lead) {
    return null;
  }
  const latestLog = getLeadLogs(lead.id)[0];
  const cityLabel = getLeadCityLabel(lead);
  const branchLabel = getLeadBranchLabel(lead);
  const reminderNote = reminder.note || "Ingen anteckning";
  const latestText = latestLog?.text || "";
  const noteText = [reminderNote, latestText && latestText !== reminderNote ? latestText : ""]
    .filter(Boolean)
    .join(" · ")
    .slice(0, 420);
  const card = document.createElement("article");
  const overdue = reminder.dueDate && reminder.dueDate < today && !reminder.completed;
  card.className = `list-card lead-work-card reminder-card${overdue ? " is-urgent" : ""}`;
  card.innerHTML = `
    <div class="lead-list-layout has-actions is-reminder">
      <div class="lead-list-content">
        <div class="lead-list-main">
          <div class="lead-list-header">
            <div class="lead-list-title-row">
              <strong class="lead-list-title">${escapeHtml(lead.companyName || "Okänd kund")}</strong>
              <div class="lead-list-badges">
                <span class="status-badge" data-status="${escapeHtml(lead.status || "Ny")}">${escapeHtml(lead.status || "Ny")}</span>
                ${renderReminderBadge(reminder)}
              </div>
            </div>
            <div class="lead-list-context-row">
              <span class="lead-list-city">${leadListIcon("map-pin")}${escapeHtml(cityLabel)}</span>
              <span class="lead-list-divider"></span>
              <span class="lead-list-branch">${escapeHtml(branchLabel)}</span>
            </div>
          </div>
          <div class="lead-list-meta-row">
            <span>${leadListIcon("user")}<b>Kontakt:</b><strong>${escapeHtml(lead.contactName || "saknas")}</strong></span>
            <span>${leadListIcon("clock")}<b>Påminnelse:</b><strong>${escapeHtml(`${formatWeekdayDate(reminder.dueDate)} ${reminder.dueTime || ""}`.trim())}</strong></span>
            <span>${leadListIcon("phone")}<b>Tel:</b><strong>${escapeHtml(lead.phone || "saknas")}</strong></span>
            <span>${leadListIcon("calendar")}<b>Typ:</b><strong>${escapeHtml(reminder.type)}</strong></span>
          </div>
          <p class="lead-list-note-line lead-list-note-line--long${noteText === "Ingen anteckning" ? " is-empty" : ""}">${leadListIcon("message")}<span><b>Anteckning:</b> ${escapeHtml(noteText)}</span></p>
        </div>
        <div class="lead-list-actions" data-reminder-actions></div>
      </div>
    </div>
  `;
  const actions = card.querySelector("[data-reminder-actions]");
  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "secondary-button";
  openButton.innerHTML = `${leadListIcon("external")}<span>Öppna kund</span>`;
  openButton.addEventListener("click", (event) => {
    event.stopPropagation();
    selectLead(lead.id, "work");
  });
  actions.appendChild(openButton);
  const doneButton = document.createElement("button");
  doneButton.type = "button";
  doneButton.className = "primary-button";
  doneButton.innerHTML = `${leadListIcon("check")}<span>Markera klar</span>`;
  doneButton.addEventListener("click", async (event) => {
    event.stopPropagation();
    await window.desktopApp.completeReminder({ reminderId: reminder.id, completed: true });
    await refreshState();
    render();
  });
  actions.appendChild(doneButton);
  card.addEventListener("click", () => selectLead(lead.id, "work"));
  return card;
}

function createPlannedDayCard(item) {
  const lead = findLead(item.leadId);
  if (!lead) {
    return null;
  }
  return createLeadListCard(lead, `Bokat ${formatWeekdayDate(item.plannedDate)} · plats ${item.orderIndex + 1}`, {
    actions: false,
    selectable: false
  });
}

function renderExport() {
  const monthKey = elements.planningMonthInput.value || currentMonthKey();
  const plannedItems = state.data.scheduleItems
    .filter((item) => item.plannedDate.startsWith(monthKey))
    .sort((left, right) => left.plannedDate.localeCompare(right.plannedDate) || left.orderIndex - right.orderIndex);

  renderSimpleList(
    elements.planningList,
    plannedItems
      .map((item) => {
        const lead = findLead(item.leadId);
        if (!lead) {
          return null;
        }
        return createLeadListCard(lead, `${item.plannedDate} · plats ${item.orderIndex + 1}`);
      })
      .filter(Boolean),
    "Ingen planering att exportera för vald månad."
  );
}

async function searchPlacesAction() {
  const apiKey = elements.apiKeyInput.value.trim();
  const branch = titleCase(elements.placesIndustryInput.value.trim());
  const cities = parseList(elements.placesCityInput.value).map(titleCase);
  const rawMaxResults = Number(elements.placesMaxResultsInput.value);
  const maxResults = Number.isFinite(rawMaxResults) && rawMaxResults > 0 ? rawMaxResults : undefined;

  elements.placesFeedback.textContent = "Kör multi-search via Google Places...";
  try {
    await window.desktopApp.saveSettings({
      apiKey,
      dailyTarget: Number(elements.planningDailyTargetInput.value) || 40,
      lastPlannedMonth: elements.planningMonthInput.value || currentMonthKey()
    });
    const response = await window.desktopApp.searchPlaces({
      apiKey,
      branch,
      cities: cities.join(", "),
      maxResults
    });
    state.placesResults = response.places;
    state.placesMeta = response.meta;
    state.placesSelection = Object.fromEntries(response.places.map((lead) => [lead.id, true]));
    elements.placesFeedback.textContent = response.places.length
      ? `${response.meta.queryCount} queries · ${response.meta.rawResults} råa träffar · ${response.meta.uniqueResults} unika leads · ${response.meta.duplicatesRemoved} dubletter · ${response.meta.filteredOut} bortfiltrerade · ${getSelectedPlacesResults().length} valda · ${response.meta.apiCalls} API-anrop${response.meta.notice ? ` · ${response.meta.notice}` : ""}`
      : "Tomt API-svar: inga träffar.";
    renderCampaigns();
  } catch (error) {
    state.placesResults = [];
    state.placesMeta = null;
    state.placesSelection = {};
    elements.placesFeedback.textContent = error.message;
    renderCampaigns();
  }
}

async function savePlacesAsCampaign() {
  const selectedLeads = getSelectedPlacesResults();
  if (!selectedLeads.length) {
    elements.placesFeedback.textContent = "Markera minst ett lead innan du sparar listan.";
    return;
  }

  const branch = titleCase(elements.placesIndustryInput.value.trim());
  const cities = parseList(elements.placesCityInput.value).map(titleCase);
  const campaign = await window.desktopApp.createCampaign({
    name: elements.campaignNameInput.value.trim() || [branch, cities.join(", ")].filter(Boolean).join(" ") || "Ny lista",
    sourceType: "google-places",
    searchQuery: [branch, cities.join(", ")].filter(Boolean).join(" "),
    cities,
    targetMarkets: cities,
    normalizedBranch: branch,
    dailyTarget: Number(elements.planningDailyTargetInput.value) || 40,
    startDate: formatLocalDate(new Date())
  });

  const result = await window.desktopApp.importLeads({
    leads: selectedLeads,
    options: { listId: campaign.id }
  });
  elements.placesFeedback.textContent = `Lista sparad. Importerade ${result.imported}, dubletter ${result.duplicates}, skippade ${result.skipped}.`;
  await refreshState();
  render();
}

async function importCsvAction(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  const rows = parseCsv(await file.text());
  const leads = rows.slice(1).map((row) => mapCsvRow(rows[0], row)).filter(Boolean);
  const result = await window.desktopApp.importLeads({
    leads,
    options: { listId: elements.csvCampaignSelect.value }
  });
  elements.csvFeedback.textContent = `Import klar. Importerade ${result.imported}, dubletter ${result.duplicates}, skippade ${result.skipped}.`;
  await refreshState();
  render();
  event.target.value = "";
}

async function saveTelavoxSettingsAction() {
  try {
    await window.desktopApp.saveSettings({
      apiKey: elements.apiKeyInput.value.trim(),
      telavoxToken: elements.telavoxTokenInput.value.trim(),
      telavoxFromDate: elements.telavoxFromDateInput.value || "",
      dailyTarget: Number(elements.planningDailyTargetInput.value) || 40,
      lastPlannedMonth: elements.planningMonthInput.value || currentMonthKey()
    });
    await refreshState();
    elements.telavoxSettingsFeedback.textContent = "Telavox-inställningarna sparades.";
    renderCampaigns();
  } catch (error) {
    elements.telavoxSettingsFeedback.textContent = error.message;
  }
}

async function createManualLeadAction() {
  const currentDraft = { ...state.workDraft };
  const manualContext = getManualCreateContext();
  const payload = {
    source: "manual",
    sourceQuery: "manuell",
    matchedQueries: ["manuell"],
    companyName: elements.manualCompanyNameInput.value.trim(),
    contactName: elements.manualContactInput.value.trim(),
    phone: elements.manualPhoneInput.value.trim(),
    website: elements.manualWebsiteInput.value.trim(),
    address: elements.manualAddressInput.value.trim(),
    city: manualContext.city,
    normalizedCity: manualContext.city,
    targetMarketCity: manualContext.city,
    category: manualContext.branch,
    normalizedBranch: manualContext.branch,
    listId: manualContext.listId,
    country: "Sweden",
    status: "Ny"
  };

  try {
    const result = await window.desktopApp.createLead(payload);
      elements.manualCreateFeedback.textContent = result.duplicate ? "Företaget finns redan och öppnades i stället." : "Kunden skapades.";
      clearManualCreateForm();
      await refreshState();
      state.selectedLeadId = result.lead.id;
      state.workMode = "manual";
      state.manualCreateOpen = false;
      state.workNotice = "";
      state.workDraft = {
        ...currentDraft,
        leadId: result.lead.id,
        contactName: currentDraft.contactName || result.lead.contactName || "",
        dirty: currentDraft.dirty
      };
      hydrateWorkDraftInputs();
      render();
      focusWorkNote();
  } catch (error) {
    elements.manualCreateFeedback.textContent = error.message;
  }
}

async function createManualLeadFromCommandDraft() {
  const companyName = elements.manualCompanyNameInput.value.trim() || elements.manualSearchInput.value.trim();
  if (!companyName) {
    elements.manualSearchResults.hidden = false;
    elements.manualSearchResults.innerHTML = `<div class="manual-empty-copy">Skriv företagsnamn i sökfältet eller klicka + Ny kund.</div>`;
    elements.manualSearchInput.focus();
    return null;
  }

  const draft = { ...state.workDraft };
  const manualContext = getManualCreateContext();
  const result = await window.desktopApp.createLead({
    source: "manual",
    sourceQuery: "manuell",
    matchedQueries: ["manuell"],
    companyName,
    contactName: draft.contactName || elements.manualContactInput.value.trim(),
    phone: elements.manualPhoneInput.value.trim(),
    website: elements.manualWebsiteInput.value.trim(),
    address: elements.manualAddressInput.value.trim(),
    city: manualContext.city,
    normalizedCity: manualContext.city,
    targetMarketCity: manualContext.city,
    category: manualContext.branch,
    normalizedBranch: manualContext.branch,
    listId: manualContext.listId,
    country: "Sweden",
    status: "Ny"
  });

  clearManualCreateForm();
  await refreshState();
  state.selectedLeadId = result.lead.id;
  state.workMode = "manual";
  state.manualCreateOpen = false;
  state.manualSearchTerm = "";
  elements.manualSearchInput.value = "";
  state.workDraft = {
    ...draft,
    leadId: result.lead.id,
    contactName: draft.contactName || result.lead.contactName || "",
    dirty: true
  };
  hydrateWorkDraftInputs();
  return findLead(result.lead.id);
}

async function saveWorkDraft(goNext) {
  let lead = getSelectedLead();
  if (!lead) {
    if (state.workMode !== "manual") {
      return;
    }
    lead = await createManualLeadFromCommandDraft();
    if (!lead) {
      return;
    }
  }

  await window.desktopApp.applyLeadAction({
    leadId: lead.id,
    status: state.workDraft.status || lead.status,
    contactName: state.workDraft.contactName.trim(),
    note: state.workDraft.note.trim(),
    logType: "note",
    reminder: buildDraftReminder(),
    completeScheduled: state.workMode === "flow"
  });

  await refreshState();
  if (goNext && state.workMode === "flow") {
    rememberQueueSkippedLead(lead.id);
    const nextLead = await window.desktopApp.getNextLead({ ...getActiveQueue(), excludeLeadIds: getQueueExcludeIds() });
    if (nextLead && nextLead.id !== lead.id) {
      rememberPreviousLead(lead.id);
    }
    state.selectedLeadId = nextLead?.id || "";
    state.workNotice = nextLead ? getLeadTransitionNotice(lead, nextLead) : "Listan är klar. Välj en ny lista eller gå till planering.";
    syncWorkDraftWithSelectedLead(true);
  } else {
    state.workNotice = "";
    syncWorkDraftWithSelectedLead(true);
  }
  render();
  if (state.selectedLeadId) {
    focusWorkNote();
  }
}

async function saveProfileNotes() {
  const lead = getSelectedLead();
  if (!lead) {
    return;
  }

  await window.desktopApp.updateLead({
    leadId: lead.id,
    patch: { notes: elements.profileNoteEditor.value.trim() }
  });
  await refreshState();
  render();
}

async function markLeadDone(leadId) {
  await window.desktopApp.applyLeadAction({
    leadId,
    status: "Closed",
    note: "",
    completeScheduled: true
  });
  await refreshState();
  render();
}

async function softDeleteLeadAction(leadId) {
  const lead = findLead(leadId);
  if (!lead || !window.confirm(`Flytta ${lead.companyName} till papperskorgen?`)) {
    return;
  }
  await window.desktopApp.deleteLead({ leadId });
  if (state.selectedLeadId === leadId) {
    state.selectedLeadId = "";
    state.workDraft = createEmptyWorkDraft();
  }
  await refreshState();
  render();
}

async function syncSelectedLeadTelavox() {
  const lead = getSelectedLead();
  if (!lead) {
    return;
  }

  elements.profileTelavoxFeedback.textContent = "Synkar Telavox-samtal...";
  try {
    const result = await window.desktopApp.syncTelavoxLead({
      leadId: lead.id,
      fromDate: elements.telavoxFromDateInput.value || state.data.settings.telavoxFromDate || ""
    });
    await refreshState();
    elements.profileTelavoxFeedback.textContent = `${result.matchedCount} samtal matchade mot ${lead.companyName}. Totalt hämtade Telavox ${result.totalFetched} samtal.`;
    renderProfile();
  } catch (error) {
    elements.profileTelavoxFeedback.textContent = error.message;
  }
}

async function handleTelavoxCallAction(event) {
  const button = event.target.closest("[data-telavox-action]");
  if (!button) {
    return;
  }

  const callRecordId = button.dataset.callRecordId;
  if (!callRecordId) {
    return;
  }

  if (button.dataset.telavoxAction === "download-recording") {
    elements.profileTelavoxFeedback.textContent = "Hämtar inspelning från Telavox...";
    try {
      const record = await window.desktopApp.downloadTelavoxRecording({ callRecordId });
      await refreshState();
      elements.profileTelavoxFeedback.textContent = `Inspelning sparad: ${record.localRecordingPath}`;
      renderProfile();
    } catch (error) {
      elements.profileTelavoxFeedback.textContent = error.message;
    }
  }

  if (button.dataset.telavoxAction === "open-recording") {
    const record = getLeadCallRecords(getSelectedLead()?.id).find((item) => item.id === callRecordId);
    if (record?.localRecordingPath) {
      const fileUrl = encodeURI(`file:///${record.localRecordingPath.replaceAll("\\", "/")}`);
      await window.desktopApp.openExternal(fileUrl);
    }
  }
}

async function planScheduleAction() {
  const payload = {
    campaignId: elements.planningCampaignSelect.value,
    month: elements.planningMonthInput.value || currentMonthKey(),
    dailyTarget: Number(elements.planningDailyTargetInput.value) || 40,
    priorityCities: parseList(elements.planningCitiesInput.value),
    priorityBranches: parseList(elements.planningBranchesInput.value)
  };

  await window.desktopApp.saveSettings({
    apiKey: elements.apiKeyInput.value.trim(),
    dailyTarget: payload.dailyTarget,
    lastPlannedMonth: payload.month
  });

  const result = await window.desktopApp.planSchedule(payload);
  state.planningData = result;
  elements.planningFeedback.textContent = `${result.plannedLeadCount} leads planerade för ${payload.month}.`;
  await refreshState();
  renderPlanning();
  renderExport();
}

async function clearScheduleAction() {
  const month = elements.planningMonthInput.value || currentMonthKey();
  await window.desktopApp.clearSchedule({ month });
  elements.planningFeedback.textContent = `Planeringen för ${month} är rensad.`;
  await refreshState();
  render();
}

function selectLead(leadId, view = state.currentView) {
  if (!leadId) {
    return;
  }
  if (leadId !== state.selectedLeadId && !confirmDiscardDraft()) {
    return;
  }
  activateLead(leadId, view);
}

function activateLead(leadId, view = state.currentView) {
  state.selectedLeadId = leadId;
  state.currentView = view;
  state.manualCreateOpen = false;
  state.workNotice = "";
  syncWorkDraftWithSelectedLead(true);
  render();
  focusWorkNote();
}

function openProfileModal() {
  if (!getSelectedLead()) {
    return;
  }
  elements.profileModal.hidden = false;
}

function closeProfileModal() {
  elements.profileModal.hidden = true;
}

function openEditLeadModal(leadId = state.selectedLeadId) {
  const lead = findLead(leadId);
  if (!lead || !elements.editLeadModal) {
    return;
  }

  state.editLeadId = lead.id;
  elements.editLeadTitle.textContent = lead.companyName || "Kunduppgifter";
  elements.editCompanyNameInput.value = lead.companyName || "";
  elements.editPhoneInput.value = lead.phone || "";
  elements.editContactInput.value = lead.contactName || "";
  elements.editWebsiteInput.value = lead.website || "";
  elements.editAddressInput.value = lead.address || "";
  elements.editCityInput.value = lead.targetMarketCity || lead.normalizedCity || lead.city || "";
  elements.editBranchInput.value = lead.normalizedBranch || lead.category || "";
  renderEditBranchSuggestions();
  renderEditCampaignOptions(lead.listId || "");
  elements.editLeadFeedback.textContent = "";
  elements.editLeadModal.hidden = false;
  window.requestAnimationFrame(() => elements.editCompanyNameInput?.focus());
}

function closeEditLeadModal() {
  if (elements.editLeadModal) {
    elements.editLeadModal.hidden = true;
  }
  state.editLeadId = "";
}

function renderEditBranchSuggestions() {
  if (!elements.editBranchSuggestions) {
    return;
  }
  elements.editBranchSuggestions.innerHTML = getManualBranchSuggestionOptions()
    .map((option) => `<option value="${escapeHtml(option.value)}" label="${escapeHtml(option.label)}"></option>`)
    .join("");
}

function renderEditCampaignOptions(currentCampaignId = "") {
  if (!elements.editCampaignSelect) {
    return;
  }

  elements.editCampaignSelect.innerHTML = `<option value="">Ingen lista</option>${state.data.campaigns.map((campaign) => {
    const context = getCampaignManualContext(campaign);
    return `<option value="${escapeHtml(campaign.id)}">${escapeHtml(formatManualCampaignOption(campaign, context))}</option>`;
  }).join("")}`;
  elements.editCampaignSelect.value = [...elements.editCampaignSelect.options].some((option) => option.value === currentCampaignId)
    ? currentCampaignId
    : "";
}

function handleEditCampaignSelect() {
  const campaign = state.data.campaigns.find((item) => item.id === elements.editCampaignSelect?.value);
  if (!campaign) {
    return;
  }
  const context = getCampaignManualContext(campaign);
  if (context.branch) {
    elements.editBranchInput.value = context.branch;
  }
  if (context.city) {
    elements.editCityInput.value = context.city;
  }
}

async function saveEditLeadAction() {
  const lead = findLead(state.editLeadId);
  if (!lead) {
    return;
  }

  const companyName = elements.editCompanyNameInput.value.trim();
  if (!companyName) {
    elements.editLeadFeedback.textContent = "Företagsnamn krävs.";
    elements.editCompanyNameInput.focus();
    return;
  }

  const city = titleCase(elements.editCityInput.value.trim());
  const branch = normalizeManualBranchLabel(elements.editBranchInput.value.trim() || lead.normalizedBranch || lead.category || "Okategoriserad");
  const listId = elements.editCampaignSelect?.value || "";

  await window.desktopApp.updateLead({
    leadId: lead.id,
    patch: {
      companyName,
      phone: elements.editPhoneInput.value.trim(),
      contactName: elements.editContactInput.value.trim(),
      website: elements.editWebsiteInput.value.trim(),
      address: elements.editAddressInput.value.trim(),
      city,
      normalizedCity: city,
      targetMarketCity: city,
      category: branch,
      normalizedBranch: branch,
      listId
    }
  });

  await refreshState();
  if (state.selectedLeadId === lead.id) {
    syncWorkDraftWithSelectedLead(true);
  }
  closeEditLeadModal();
  render();
  focusWorkNote();
}

function getSelectedLead() {
  return findLead(state.selectedLeadId);
}

function findLead(leadId) {
  return state.data.leads.find((lead) => lead.id === leadId) ?? null;
}

function getLeadLogs(leadId) {
  return state.data.logEntries
    .filter((entry) => entry.leadId === leadId)
    .sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));
}

function getLeadReminders(leadId) {
  return state.data.reminders
    .filter((reminder) => reminder.leadId === leadId)
    .sort((left, right) => `${left.dueDate} ${left.dueTime}`.localeCompare(`${right.dueDate} ${right.dueTime}`));
}

function getLeadCallRecords(leadId) {
  return (state.data.callRecords || [])
    .filter((record) => record.leadId === leadId)
    .sort((left, right) => new Date(right.happenedAt) - new Date(left.happenedAt));
}

function getNextOpenReminder(leadId) {
  return getLeadReminders(leadId).find((reminder) => !reminder.completed) ?? null;
}

function getLeadCityLabel(lead) {
  return lead?.targetMarketCity || lead?.normalizedCity || lead?.city || "Ort saknas";
}

function getLeadBranchLabel(lead) {
  return lead?.normalizedBranch || lead?.category || "Bransch saknas";
}

function getLatestLeadActivity(lead) {
  const latestLog = lead ? getLeadLogs(lead.id)[0] : null;
  return {
    log: latestLog,
    label: latestLog ? formatDateTime(latestLog.createdAt) : formatDateTime(lead?.updatedAt || new Date()),
    text: latestLog?.text || lead?.notes || "Ingen aktivitet"
  };
}

function getDueReminders() {
  const today = formatLocalDate(new Date());
  return state.data.reminders.filter((reminder) => {
    const lead = findLead(reminder.leadId);
    return !reminder.completed && reminder.dueDate && reminder.dueDate <= today && !lead?.isDeleted;
  });
}

function buildTodayActionCards() {
  const today = formatLocalDate(new Date());
  const reminderCards = state.data.reminders
    .filter((reminder) => !reminder.completed && reminder.dueDate && reminder.dueDate <= today)
    .map((reminder) => {
      const lead = findLead(reminder.leadId);
      if (!lead || lead.isDeleted) {
        return null;
      }
      const overdue = reminder.dueDate < today;
      return createActionListCard({
        lead,
        title: lead.companyName,
        badge: overdue ? "Försenad" : "Idag",
        urgent: overdue,
        meta: `${formatWeekdayDate(reminder.dueDate)} ${reminder.dueTime || ""} · ${reminder.type}`,
        note: reminder.note || getLeadLogs(lead.id)[0]?.text || "Ingen anteckning"
      });
    })
    .filter(Boolean);

  const plannedCards = state.data.scheduleItems
    .filter((item) => item.plannedDate === today && !item.completed)
    .slice(0, 6)
    .map((item) => {
      const lead = findLead(item.leadId);
      if (!lead || lead.isDeleted) {
        return null;
      }
      return createActionListCard({
        lead,
        title: lead.companyName,
        badge: "Planerad",
        meta: `${formatWeekdayDate(item.plannedDate)} · plats ${item.orderIndex + 1}`,
        note: `${lead.normalizedBranch || lead.category || "Bransch saknas"} · ${lead.targetMarketCity || lead.normalizedCity || lead.city || "Ort saknas"}`
      });
    })
    .filter(Boolean);

  return [...reminderCards, ...plannedCards];
}

function createActionListCard({ lead, title, badge, meta, note, urgent = false }) {
  const card = document.createElement("article");
  card.className = `list-card action-card${urgent ? " is-urgent" : ""}`;
  card.innerHTML = `
    <div class="row-header">
      <strong>${escapeHtml(title)}</strong>
      <span class="status-badge">${escapeHtml(badge)}</span>
    </div>
    <p class="meta-line">${escapeHtml(meta)}</p>
    <p class="meta-line">${escapeHtml(String(note || "").slice(0, 140))}</p>
  `;
  const actions = document.createElement("div");
  actions.className = "inline-actions compact-actions";
  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "secondary-button";
  openButton.textContent = "Öppna kund";
  openButton.addEventListener("click", () => selectLead(lead.id, "work"));
  actions.appendChild(openButton);
  card.appendChild(actions);
  return card;
}

function startReminderNotifications() {
  checkReminderNotifications();
  window.setInterval(checkReminderNotifications, 60_000);
}

async function checkReminderNotifications() {
  const now = new Date();
  const today = formatLocalDate(now);
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const due = state.data.reminders.filter((reminder) => {
    if (reminder.completed || !reminder.dueDate || state.notifiedReminderIds.has(reminder.id)) {
      return false;
    }
    if (reminder.dueDate < today) {
      return true;
    }
    return reminder.dueDate === today && (!reminder.dueTime || reminder.dueTime <= currentTime);
  });

  for (const reminder of due) {
    const lead = findLead(reminder.leadId);
    if (!lead || lead.isDeleted) {
      continue;
    }
    state.notifiedReminderIds.add(reminder.id);
    try {
      await window.desktopApp.showNotification({
        title: `${lead.companyName} · ${reminder.type}`,
        body: reminder.note || formatReminderLabel(reminder)
      });
    } catch (error) {
      console.warn("Reminder notification failed", error);
    }
  }
}

async function openSelectedLeadLink(field, useTel = false) {
  const lead = getSelectedLead();
  if (!lead?.[field]) {
    return;
  }

  const targetUrl = useTel ? `tel:${String(lead[field]).replace(/[^\d+]/g, "")}` : lead[field];
  if (useTel) {
    await window.desktopApp.logLeadEvent({
      leadId: lead.id,
      type: "call",
      text: "Ring-knapp klickad"
    });
    await refreshState();
    renderWorkMode();
    renderCustomers();
    renderProfile();
  }

  await window.desktopApp.openExternal(targetUrl);
}

function updateDraft(field, value) {
  state.workDraft[field] = value;
  state.workDraft.dirty = true;
}

function createEmptyWorkDraft() {
  return {
    leadId: "",
    status: "Ny",
    contactName: "",
    note: "",
    reminderType: "ring",
    reminderDate: "",
    reminderTime: "",
    reminderNote: "",
    dirty: false
  };
}

function syncWorkDraftWithSelectedLead(force = false) {
  const lead = getSelectedLead();
  if (!lead) {
    state.workDraft = createEmptyWorkDraft();
    return;
  }

  if (!force && state.workDraft.leadId === lead.id && state.workDraft.dirty) {
    return;
  }

  state.workDraft = {
    leadId: lead.id,
    status: lead.status || "Ny",
    contactName: lead.contactName || "",
    note: lead.notes || "",
    reminderType: "ring",
    reminderDate: "",
    reminderTime: "",
    reminderNote: "",
    dirty: false
  };
  hydrateWorkDraftInputs();
}

function hydrateWorkDraftInputs() {
  const draftInputs = [
    elements.workContactInput,
    elements.workNoteInput,
    elements.reminderTypeInput,
    elements.reminderDateInput,
    elements.reminderTimeInput,
    elements.reminderNoteInput
  ];
  const preserveFocusedDraft = draftInputs.some(
    (input) => document.activeElement === input && input.dataset.workDraftLeadId === state.workDraft.leadId
  );
  setInputValue(elements.workContactInput, state.workDraft.contactName, { preserveActive: preserveFocusedDraft });
  setInputValue(elements.workNoteInput, state.workDraft.note, { preserveActive: preserveFocusedDraft });
  setInputValue(elements.reminderTypeInput, state.workDraft.reminderType, { preserveActive: preserveFocusedDraft });
  setInputValue(elements.reminderDateInput, state.workDraft.reminderDate, { preserveActive: preserveFocusedDraft });
  setInputValue(elements.reminderTimeInput, state.workDraft.reminderTime, { preserveActive: preserveFocusedDraft });
  setInputValue(elements.reminderNoteInput, state.workDraft.reminderNote, { preserveActive: preserveFocusedDraft });
  draftInputs.forEach((input) => {
    input.dataset.workDraftLeadId = state.workDraft.leadId;
  });
  autoResizeTextarea();
}

function setInputValue(element, value, options = {}) {
  if (!element) {
    return;
  }
  if (options.preserveActive && document.activeElement === element) {
    return;
  }
  const nextValue = String(value ?? "");
  if (element.value !== nextValue) {
    element.value = nextValue;
  }
}

function buildDraftReminder() {
  if (!state.workDraft.reminderDate) {
    return undefined;
  }

  return {
    type: state.workDraft.reminderType,
    dueDate: state.workDraft.reminderDate,
    dueTime: state.workDraft.reminderTime,
    note: state.workDraft.reminderNote.trim()
  };
}

function updateStatusButtonSelection() {
  [...elements.statusButtons.querySelectorAll(".status-button")].forEach((button) => {
    button.classList.toggle("is-selected", button.dataset.status === state.workDraft.status);
  });
}

function renderStatusButtons() {
  elements.statusButtons.innerHTML = "";
  LEAD_STATUSES.forEach((status) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "status-button";
    button.dataset.status = status;
    button.textContent = status;
    button.addEventListener("click", () => {
      updateDraft("status", status);
      updateStatusButtonSelection();
    });
    elements.statusButtons.appendChild(button);
  });
  updateStatusButtonSelection();
}

function confirmDiscardDraft() {
  if (!state.workDraft.dirty) {
    return true;
  }
  return window.confirm("Du har osparade ändringar i arbetsläget. Vill du lämna utan att spara?");
}

function openCustomerFilter({ status = "", campaignId = "", resetTextFilters = true } = {}) {
  state.filters.customerStatus = status;
  state.filters.customerCampaignId = campaignId;
  if (resetTextFilters) {
    state.filters.customerSearch = "";
    state.filters.customerCategory = "";
    state.filters.customerCity = "";
  }
  state.customersMode = "all";
  state.currentView = "customers";
  render();
}

function getQueryPreviewCards() {
  const branchKey = normalizeText(elements.placesIndustryInput.value);
  const cities = parseList(elements.placesCityInput.value).map(titleCase);
  const templates = BRANCH_QUERY_TEMPLATES[branchKey] || (elements.placesIndustryInput.value.trim() ? [`${elements.placesIndustryInput.value.trim()} {city}`] : []);
  const queries = cities.flatMap((city) => templates.map((template) => template.replace("{city}", city))).filter(Boolean);
  const source = state.placesMeta?.perQuery?.length
    ? state.placesMeta.perQuery.map((entry) => ({
        query: entry.query,
        summary: `${entry.rawCount} råa · ${entry.relevantCount || entry.fetchedCount} relevanta · ${entry.apiCalls} API-anrop`
      }))
    : queries.map((query) => ({
        query,
        summary: "Förhandsvisning"
      }));

  return source.map((entry) => {
    const card = document.createElement("article");
    card.className = "info-card";
    card.innerHTML = `<strong>${escapeHtml(entry.query)}</strong><p class="meta-line">${escapeHtml(entry.summary)}</p>`;
    return card;
  });
}

function derivePlanningDataFromState() {
  const monthKey = elements.planningMonthInput?.value || state.data.settings.lastPlannedMonth || currentMonthKey();
  const dayMap = new Map();
  state.data.scheduleItems
    .filter((item) => item.plannedDate.startsWith(monthKey))
    .sort((left, right) => left.plannedDate.localeCompare(right.plannedDate) || left.orderIndex - right.orderIndex)
    .forEach((item) => {
      const lead = findLead(item.leadId);
      if (!lead) {
        return;
      }
      if (!dayMap.has(item.plannedDate)) {
        dayMap.set(item.plannedDate, {
          plannedDate: item.plannedDate,
          branch: lead.normalizedBranch || lead.category || "Okategoriserat",
          totalLeads: 0,
          cityBreakdown: [],
          leadIds: []
        });
      }
      const dayPlan = dayMap.get(item.plannedDate);
      dayPlan.totalLeads += 1;
      dayPlan.leadIds.push(lead.id);
      const city = lead.targetMarketCity || lead.normalizedCity || lead.city || "Okänd stad";
      const cityEntry = dayPlan.cityBreakdown.find((entry) => entry.city === city);
      if (cityEntry) {
        cityEntry.count += 1;
      } else {
        dayPlan.cityBreakdown.push({ city, count: 1 });
      }
    });

  const dayPlans = [...dayMap.values()];
  const blocks = [];
  dayPlans.forEach((dayPlan) => {
    const lastBlock = blocks[blocks.length - 1];
    if (lastBlock && lastBlock.branch === dayPlan.branch) {
      lastBlock.toDate = dayPlan.plannedDate;
      lastBlock.totalLeads += dayPlan.totalLeads;
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
      branch: dayPlan.branch,
      fromDate: dayPlan.plannedDate,
      toDate: dayPlan.plannedDate,
      totalLeads: dayPlan.totalLeads,
      cityBreakdown: dayPlan.cityBreakdown.map((entry) => ({ ...entry }))
    });
  });

  const branchSummaries = [];
  state.data.leads
    .filter((lead) => !isClosedLead(lead))
    .forEach((lead) => {
      const branch = lead.normalizedBranch || lead.category || "Okategoriserat";
      let branchSummary = branchSummaries.find((entry) => entry.branch === branch);
      if (!branchSummary) {
        branchSummary = {
          branch,
          totalLeads: 0,
          estimatedDays: 0,
          cityBreakdown: []
        };
        branchSummaries.push(branchSummary);
      }
      branchSummary.totalLeads += 1;
      const city = lead.targetMarketCity || lead.normalizedCity || lead.city || "Okänd stad";
      const cityEntry = branchSummary.cityBreakdown.find((entry) => entry.city === city);
      if (cityEntry) {
        cityEntry.count += 1;
      } else {
        branchSummary.cityBreakdown.push({ city, count: 1 });
      }
    });

  branchSummaries.forEach((summary) => {
    summary.estimatedDays = Math.ceil(summary.totalLeads / Math.max(1, Number(elements.planningDailyTargetInput?.value) || 40));
    summary.cityBreakdown.sort((left, right) => right.count - left.count || left.city.localeCompare(right.city, "sv"));
  });

  return { dayPlans, blocks, branchSummaries };
}

function buildCalendarCells(monthKey, dayPlans) {
  const [year, month] = monthKey.split("-").map(Number);
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const start = new Date(firstDay);
  start.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));
  const end = new Date(lastDay);
  end.setDate(lastDay.getDate() + (7 - ((lastDay.getDay() + 6) % 7) - 1));
  const dayLookup = new Map(dayPlans.map((dayPlan) => [dayPlan.plannedDate, dayPlan]));
  const cells = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const dateKey = formatLocalDate(cursor);
    cells.push({
      dateKey,
      dateLabel: String(cursor.getDate()),
      isCurrentMonth: cursor.getMonth() === month - 1,
      isWeekend: cursor.getDay() === 0 || cursor.getDay() === 6,
      plan: dayLookup.get(dateKey) ?? null
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return cells;
}

function getCampaignName(campaignId) {
  return state.data.campaigns.find((campaign) => campaign.id === campaignId)?.name ?? "";
}

function renderManualBranchSuggestions() {
  if (!elements.manualBranchSuggestions) {
    return;
  }
  const options = getManualBranchSuggestionOptions();
  elements.manualBranchSuggestions.innerHTML = options
    .map((option) => `<option value="${escapeHtml(option.value)}" label="${escapeHtml(option.label)}"></option>`)
    .join("");
  updateManualBranchHint();
}

function getManualBranchSuggestionOptions() {
  const options = [];
  const seen = new Set();
  const addOption = (value, label) => {
    const cleanValue = String(value || "").trim();
    if (!cleanValue) {
      return;
    }
    const key = normalizeText(cleanValue);
    if (seen.has(key)) {
      return;
    }
    seen.add(key);
    options.push({ value: cleanValue, label });
  };

  MANUAL_BRANCH_TAXONOMY.forEach((branch) => addOption(branch.label, "Bransch"));
  getKnownManualBranches().forEach((branch) => addOption(branch, "Befintlig bransch"));
  return options;
}

function getKnownManualBranches() {
  return [...new Set(
    state.data.leads
      .map((lead) => lead.normalizedBranch || lead.category)
      .concat(state.data.campaigns.map((campaign) => campaign.normalizedBranch))
      .map((value) => titleCase(value))
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, "sv"));
}

function renderManualCampaignOptions() {
  if (!elements.manualCampaignSelect) {
    return;
  }
  const currentValue = state.manualSelectedCampaignId || elements.manualCampaignSelect.value || "";
  elements.manualCampaignSelect.innerHTML = `<option value="">Ingen lista</option>${state.data.campaigns.map((campaign) => {
    const context = getCampaignManualContext(campaign);
    return `<option value="${escapeHtml(campaign.id)}">${escapeHtml(formatManualCampaignOption(campaign, context))}</option>`;
  }).join("")}`;
  elements.manualCampaignSelect.value = [...elements.manualCampaignSelect.options].some((option) => option.value === currentValue)
    ? currentValue
    : "";
  state.manualSelectedCampaignId = elements.manualCampaignSelect.value;
  updateManualCampaignHint();
}

function formatManualCampaignOption(campaign, context = getCampaignManualContext(campaign)) {
  const branch = context.branch || "Lista";
  const city = context.city || "Målområde saknas";
  const count = Number(campaign.totalLeads || 0);
  return `${branch} · ${city}${count ? ` · ${count} leads` : ""}`;
}

function getKnownManualCities() {
  return [...new Set(
    state.data.leads
      .map((lead) => lead.targetMarketCity || lead.normalizedCity || lead.city)
      .concat(state.data.campaigns.flatMap((campaign) => campaign.targetMarkets || campaign.cities || []))
      .map((value) => titleCase(value))
      .filter(Boolean)
  )].sort((left, right) => left.localeCompare(right, "sv"));
}

function getCampaignManualContext(campaign) {
  if (!campaign) {
    return { branch: "", city: "" };
  }
  const branch = normalizeManualBranchLabel(campaign.normalizedBranch || inferManualBranch(campaign.name));
  const market = (campaign.targetMarkets || campaign.cities || []).find(Boolean) || inferManualCity(campaign.name);
  return {
    branch,
    city: titleCase(market)
  };
}

function findManualCampaignSuggestion(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }
  return state.data.campaigns.find((campaign) => {
    const context = getCampaignManualContext(campaign);
    const candidates = [
      campaign.name,
      context.branch && context.city ? `${context.branch} ${context.city}` : "",
      context.branch && context.city ? `${context.branch} i ${context.city}` : ""
    ];
    return candidates.some((candidate) => normalizeText(candidate) === normalized);
  }) ?? null;
}

function handleManualBranchInput() {
  const selectedCampaign = state.data.campaigns.find((campaign) => campaign.id === state.manualSelectedCampaignId);
  if (selectedCampaign) {
    const context = getCampaignManualContext(selectedCampaign);
    if (context.branch && normalizeText(elements.manualBranchInput.value) !== normalizeText(context.branch)) {
      state.manualSelectedCampaignId = "";
      if (elements.manualCampaignSelect) {
        elements.manualCampaignSelect.value = "";
      }
    }
  }
  updateManualBranchHint();
  updateManualCampaignHint();
}

function handleManualCampaignSelect() {
  const campaign = state.data.campaigns.find((item) => item.id === elements.manualCampaignSelect.value);
  if (!campaign) {
    state.manualSelectedCampaignId = "";
    updateManualBranchHint();
    updateManualCampaignHint();
    return;
  }
  applyManualCampaignSuggestion(campaign);
}

function applyManualCampaignSuggestion(campaign) {
  const context = getCampaignManualContext(campaign);
  state.manualSelectedCampaignId = campaign.id;
  if (elements.manualCampaignSelect) {
    elements.manualCampaignSelect.value = campaign.id;
  }
  if (context.branch) {
    elements.manualBranchInput.value = context.branch;
  }
  if (context.city) {
    elements.manualCityInput.value = context.city;
  }
  updateManualBranchHint();
  updateManualCampaignHint();
}

function updateManualBranchHint() {
  if (!elements.manualBranchHint) {
    return;
  }
  const selectedCampaign = state.data.campaigns.find((campaign) => campaign.id === state.manualSelectedCampaignId);
  if (selectedCampaign) {
    const context = getCampaignManualContext(selectedCampaign);
    elements.manualBranchHint.textContent = `Fylls från vald lista: ${context.branch || "bransch saknas"}.`;
    return;
  }
  const branchValue = elements.manualBranchInput?.value?.trim() || "";
  if (branchValue) {
    elements.manualBranchHint.textContent = `Sparas som bransch: ${normalizeManualBranchLabel(branchValue)}.`;
    return;
  }
  const inferred = inferManualBranch(elements.manualCompanyNameInput?.value || elements.manualSearchInput?.value || "");
  elements.manualBranchHint.textContent = inferred
    ? `Förslag: ${inferred}. Välj förslaget om det stämmer.`
    : "Välj en ren bransch. Listor väljs i fältet under.";
}

function updateManualCampaignHint() {
  if (!elements.manualCampaignHint) {
    return;
  }
  const selectedCampaign = state.data.campaigns.find((campaign) => campaign.id === state.manualSelectedCampaignId);
  if (!selectedCampaign) {
    elements.manualCampaignHint.textContent = "Valfri. Välj lista för att fylla bransch och stad automatiskt.";
    return;
  }
  const context = getCampaignManualContext(selectedCampaign);
  elements.manualCampaignHint.textContent = `Kopplas till: ${formatManualCampaignOption(selectedCampaign, context)}.`;
}

function getManualCreateContext() {
  const selectedCampaign = state.data.campaigns.find((campaign) => campaign.id === state.manualSelectedCampaignId);
  const selectedContext = getCampaignManualContext(selectedCampaign);
  const branch = normalizeManualBranchLabel(
    elements.manualBranchInput.value ||
    selectedContext.branch ||
    inferManualBranch(elements.manualCompanyNameInput.value || elements.manualSearchInput.value) ||
    "Okategoriserad"
  );
  const city = titleCase(elements.manualCityInput.value || selectedContext.city || "");
  return {
    branch,
    city,
    listId: selectedCampaign?.id || ""
  };
}

function normalizeManualBranchLabel(value) {
  const inferred = inferManualBranch(value);
  return inferred || titleCase(value || "Okategoriserad");
}

function inferManualBranch(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }
  const exact = MANUAL_BRANCH_TAXONOMY.find((branch) =>
    normalizeText(branch.label) === normalized || branch.aliases.some((alias) => normalizeText(alias) === normalized)
  );
  if (exact) {
    return exact.label;
  }
  const known = getKnownManualBranches().find((branch) => normalizeText(branch) === normalized);
  if (known) {
    return known;
  }
  const fuzzy = MANUAL_BRANCH_TAXONOMY.find((branch) =>
    normalized.includes(normalizeText(branch.label)) || branch.aliases.some((alias) => normalized.includes(normalizeText(alias)))
  );
  if (fuzzy) {
    return fuzzy.label;
  }
  return getKnownManualBranches().find((branch) => normalized.includes(normalizeText(branch))) || "";
}

function inferManualCity(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return "";
  }
  return getKnownManualCities().find((city) => normalized.includes(normalizeText(city))) || "";
}

function getTimelineTypeLabel(type) {
  return {
    created: "Skapad",
    note: "Anteckning",
    update: "Kunddata",
    activity: "Bearbetad",
    status: "Status",
    reminder: "Reminder",
    "reminder-complete": "Reminder",
    call: "Ring",
    delete: "Papperskorg",
    restore: "Återställd",
    "telavox-sync": "Telavox",
    "telavox-recording": "Inspelning",
    event: "Händelse"
  }[type] || type;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let current = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      rows.push(row);
      row = [];
      current = "";
      continue;
    }

    current += char;
  }

  if (current || row.length) {
    row.push(current);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((cell) => String(cell).trim()));
}

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function formatReminderLabel(reminder) {
  if (!reminder) {
    return "Ingen";
  }
  return `${reminder.dueDate}${reminder.dueTime ? ` ${reminder.dueTime}` : ""} · ${reminder.type}`;
}

function getReminderBadgeText(reminder) {
  if (!reminder?.dueDate) {
    return "";
  }
  const today = formatLocalDate(new Date());
  if (reminder.dueDate < today) {
    return "FÖRSENAD";
  }
  if (reminder.dueDate === today) {
    return "IDAG";
  }
  return new Intl.DateTimeFormat("sv-SE", { weekday: "long" })
    .format(new Date(`${reminder.dueDate}T12:00:00`))
    .toUpperCase();
}

function formatReminderBadgeDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const today = new Date();
  const todayKey = formatLocalDate(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (value === todayKey) {
    return "IDAG";
  }
  if (value === formatLocalDate(tomorrow)) {
    return "IMORGON";
  }
  if (value === formatLocalDate(yesterday)) {
    return "IGÅR";
  }
  const weekday = new Intl.DateTimeFormat("sv-SE", { weekday: "long" }).format(date);
  const normalizedWeekday = weekday.charAt(0).toUpperCase() + weekday.slice(1);
  return `${normalizedWeekday} ${formatSwedishOrdinalDay(date.getDate())}`;
}

function formatSwedishOrdinalDay(day) {
  const number = Number(day);
  if (!Number.isFinite(number)) {
    return "";
  }
  const lastTwoDigits = number % 100;
  const suffix = lastTwoDigits === 11 || lastTwoDigits === 12
    ? ":e"
    : [1, 2].includes(number % 10)
      ? ":a"
      : ":e";
  return `${number}${suffix}`;
}

function renderReminderBadge(reminder) {
  if (!reminder?.dueDate) {
    return "";
  }
  const today = formatLocalDate(new Date());
  const dateLabel = formatReminderBadgeDate(reminder.dueDate);
  if (!dateLabel) {
    return "";
  }
  const tone = reminder.dueDate < today ? "overdue" : reminder.dueDate === today ? "today" : "upcoming";
  const label = tone === "overdue" ? `Försenad ${dateLabel}` : dateLabel;
  return `<span class="reminder-day-badge is-${tone}">${escapeHtml(label)}</span>`;
}

function leadListIcon(name) {
  const paths = {
    "map-pin": '<path d="M12 21s7-4.4 7-11a7 7 0 0 0-14 0c0 6.6 7 11 7 11Z"></path><circle cx="12" cy="10" r="2.5"></circle>',
    clock: '<circle cx="12" cy="12" r="9"></circle><path d="M12 7v5l3 2"></path>',
    user: '<path d="M20 21a8 8 0 0 0-16 0"></path><circle cx="12" cy="8" r="4"></circle>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.4 19.4 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.3 1.7.6 2.5a2 2 0 0 1-.5 2.1L8 9.5a16 16 0 0 0 6.5 6.5l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.5.6a2 2 0 0 1 1.7 2Z"></path>',
    message: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"></path><path d="M8 9h8M8 13h5"></path>',
    check: '<path d="m5 12 4 4L19 6"></path>',
    trash: '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="M19 6l-1 14H6L5 6"></path><path d="M10 11v6M14 11v6"></path>',
    calendar: '<path d="M8 2v4M16 2v4"></path><rect x="3" y="4" width="18" height="18" rx="2"></rect><path d="M3 10h18"></path>',
    external: '<path d="M7 17 17 7"></path><path d="M8 7h9v9"></path>'
  };
  return `<svg class="lead-list-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${paths[name] || ""}</svg>`;
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("sv-SE", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}

function formatWeekdayDate(value) {
  if (!value) {
    return "Datum saknas";
  }
  const date = new Date(`${value}T12:00:00`);
  return new Intl.DateTimeFormat("sv-SE", {
    weekday: "short",
    day: "numeric",
    month: "short"
  }).format(date);
}

function formatDuration(seconds) {
  const value = Number(seconds) || 0;
  if (!value) {
    return "0 sek";
  }
  if (value < 60) {
    return `${value} sek`;
  }
  const minutes = Math.floor(value / 60);
  const remainder = value % 60;
  return remainder ? `${minutes} min ${remainder} sek` : `${minutes} min`;
}

function formatTelavoxDirection(direction) {
  return {
    incoming: "Inkommande samtal",
    outgoing: "Utgående samtal",
    missed: "Missat samtal"
  }[direction] || "Samtal";
}

function isClosedLead(lead) {
  return ["Closed", "Inte intresserad"].includes(lead.status);
}

function currentMonthKey() {
  return formatLocalDate(new Date()).slice(0, 7);
}

function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date;
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function titleCase(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function renderSimpleList(container, items, emptyText) {
  container.innerHTML = "";
  if (!items.length) {
    container.innerHTML = `<div class="empty-state">${escapeHtml(emptyText)}</div>`;
    return;
  }
  items.forEach((item) => container.appendChild(item));
}

function exportScheduleCsv() {
  const monthKey = elements.planningMonthInput.value || currentMonthKey();
  const rows = [
    ["Datum", "Order", "Företag", "Stad", "Status", "Kategori"],
    ...state.data.scheduleItems
      .filter((item) => item.plannedDate.startsWith(monthKey))
      .sort((left, right) => left.plannedDate.localeCompare(right.plannedDate) || left.orderIndex - right.orderIndex)
      .map((item) => {
        const lead = findLead(item.leadId);
        return [item.plannedDate, item.orderIndex + 1, lead?.companyName, lead?.city, lead?.status, lead?.category];
      })
  ];
  downloadCsv(rows, `schema-${monthKey}.csv`);
}

function exportScheduleIcs() {
  const monthKey = elements.planningMonthInput.value || currentMonthKey();
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Outbound Sales System//SV"];
  state.data.scheduleItems
    .filter((item) => item.plannedDate.startsWith(monthKey))
    .sort((left, right) => left.plannedDate.localeCompare(right.plannedDate) || left.orderIndex - right.orderIndex)
    .forEach((item, index) => {
      const lead = findLead(item.leadId);
      const day = item.plannedDate.replaceAll("-", "");
      lines.push("BEGIN:VEVENT");
      lines.push(`UID:${day}-${index}@sales-system`);
      lines.push(`DTSTAMP:${new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}`);
      lines.push(`DTSTART:${day}T090000`);
      lines.push(`DTEND:${day}T170000`);
      lines.push(`SUMMARY:${escapeIcs(`${lead?.companyName || "Lead"} - ring`)}`);
      lines.push(`DESCRIPTION:${escapeIcs(`${lead?.category || ""} ${lead?.city || ""}`)}`);
      lines.push("END:VEVENT");
    });
  lines.push("END:VCALENDAR");
  downloadText(lines.join("\r\n"), `schema-${monthKey}.ics`, "text/calendar;charset=utf-8;");
}

function exportLeadsCsv() {
  const rows = [
    ["Företag", "Telefon", "Hemsida", "Adress", "Normalized stad", "Land", "Normalized bransch", "Google kategori", "Status", "Lista", "Planerad", "Första query", "Matchade queries"],
    ...state.data.leads.map((lead) => [
      lead.companyName,
      lead.phone,
      lead.website,
      lead.address,
      lead.normalizedCity || lead.city,
      lead.country,
      lead.normalizedBranch || lead.category,
      lead.rawGoogleCategory,
      lead.status,
      getCampaignName(lead.listId),
      lead.plannedDate,
      lead.sourceQuery,
      (lead.matchedQueries || []).join(" | ")
    ])
  ];
  downloadCsv(rows, `leads-${formatLocalDate(new Date())}.csv`);
}

function downloadCsv(rows, filename) {
  const csv = rows.map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
  downloadText(csv, filename, "text/csv;charset=utf-8;");
}

function downloadText(text, filename, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeIcs(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\n", "\\n")
    .replaceAll(",", "\\,")
    .replaceAll(";", "\\;");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function safeRenderSection(sectionName, renderer) {
  try {
    renderer();
  } catch (error) {
    console.error(`[render:${sectionName}]`, error);
    reportRuntimeError(`Fel i vy: ${sectionName}`, error);
  }
}

function reportRuntimeError(label, error) {
  const message = error instanceof Error ? error.message : String(error || "Okänt fel");
  console.error(label, error);
  if (elements.dashboardFocusCopy) {
    elements.dashboardFocusCopy.textContent = `${label}: ${message}`;
  }
}

function getSelectedPlacesResults() {
  return state.placesResults.filter((lead) => state.placesSelection[lead.id] !== false);
}

function syncCustomerFilterInputs() {
  [
    [elements.customerSearchInput, state.filters.customerSearch],
    [elements.customerCategoryFilter, state.filters.customerCategory],
    [elements.customerCityFilter, state.filters.customerCity]
  ].forEach(([element, value]) => {
    const nextValue = String(value || "");
    if (element && document.activeElement !== element && element.value !== nextValue) {
      element.value = nextValue;
    }
  });
}

function scheduleCustomerFilterRender() {
  window.clearTimeout(customerFilterRenderTimer);
  customerFilterRenderTimer = window.setTimeout(() => {
    customerFilterRenderTimer = null;
    renderCustomers();
  }, 120);
}

function clearScheduledCustomerFilterRender() {
  if (!customerFilterRenderTimer) {
    return;
  }
  window.clearTimeout(customerFilterRenderTimer);
  customerFilterRenderTimer = null;
}

function updatePlacesSelectionFeedback() {
  if (!state.placesMeta) {
    return;
  }
  const selectedCount = getSelectedPlacesResults().length;
  const ignoredCount = Math.max(0, state.placesResults.length - selectedCount);
  elements.placesFeedback.textContent = `${state.placesMeta.queryCount} queries · ${state.placesMeta.rawResults} råa träffar · ${state.placesMeta.uniqueResults} unika leads · ${state.placesMeta.duplicatesRemoved} dubletter · ${state.placesMeta.filteredOut + ignoredCount} bortfiltrerade/ignorerade · ${selectedCount} valda · ${state.placesMeta.apiCalls} API-anrop${state.placesMeta.notice ? ` · ${state.placesMeta.notice}` : ""}`;
}

function getActiveQueue() {
  const plannedDate = state.workQueue.plannedDate || "";
  return {
    campaignId: plannedDate ? "" : state.workQueue.campaignId || elements.workCampaignFilter.value || "",
    plannedDate
  };
}

function getActiveQueueLabel() {
  const queue = getActiveQueue();
  if (queue.plannedDate) {
    return formatWeekdayDate(queue.plannedDate);
  }
  if (queue.campaignId) {
    return getCampaignName(queue.campaignId) || "Vald lista";
  }
  return "Alla öppna leads";
}

function leadMatchesWorkQueue(lead, queue = getActiveQueue()) {
  if (!lead || lead.isDeleted) {
    return false;
  }
  if (queue.campaignId && lead.listId !== queue.campaignId) {
    return false;
  }
  if (queue.plannedDate) {
    return state.data.scheduleItems.some((item) => item.leadId === lead.id && item.plannedDate === queue.plannedDate && !item.completed);
  }
  return true;
}

function getWorkQueueProgress(lead = getSelectedLead()) {
  const queue = getActiveQueue();
  const skippedIds = [...new Set(state.workQueue.skippedLeadIds || [])];
  const skippedInQueue = skippedIds.filter((leadId) => leadMatchesWorkQueue(findLead(leadId), queue));
  const remainingLeads = state.data.leads.filter((item) =>
    leadMatchesWorkQueue(item, queue) && item.status === "Ny" && !skippedInQueue.includes(item.id)
  );
  const selectedInQueue = leadMatchesWorkQueue(lead, queue);
  const selectedAlreadyRemaining = selectedInQueue && remainingLeads.some((item) => item.id === lead.id);
  const current = skippedInQueue.length + (selectedInQueue ? 1 : 0);
  const total = skippedInQueue.length + remainingLeads.length + (selectedInQueue && !selectedAlreadyRemaining ? 1 : 0);
  return {
    current: Math.min(current || 0, total || current || 0),
    total,
    label: getActiveQueueLabel()
  };
}

function renderWorkQueueProgress(lead = getSelectedLead()) {
  if (!elements.workQueueProgress) {
    return;
  }
  const isFlow = state.workMode === "flow";
  const progress = getWorkQueueProgress(lead);
  elements.workQueueProgress.hidden = !isFlow || !progress.total;
  elements.workQueueProgress.textContent = progress.total
    ? `${progress.current || 0} av ${progress.total} · ${progress.label}`
    : "";
}

function getLeadQueueContext(lead) {
  return {
    listId: lead?.listId || "",
    listName: getCampaignName(lead?.listId) || "Ingen lista",
    city: getLeadCityLabel(lead),
    branch: getLeadBranchLabel(lead)
  };
}

function getLeadQueueContextLabel(lead) {
  const context = getLeadQueueContext(lead);
  return `${context.listName} · ${context.city} · ${context.branch}`;
}

function getLeadTransitionNotice(previousLead, nextLead) {
  if (!previousLead || !nextLead || previousLead.id === nextLead.id) {
    return "";
  }
  const previous = getLeadQueueContext(previousLead);
  const next = getLeadQueueContext(nextLead);
  const changedList = previous.listId !== next.listId;
  const changedMarket = previous.city !== next.city || previous.branch !== next.branch;
  if (!changedList && !changedMarket) {
    return "";
  }
  return `Ny lista/område: ${getLeadQueueContextLabel(next)}`;
}

function resetWorkQueueProgress() {
  state.workQueue.skippedLeadIds = [];
}

function rememberQueueSkippedLead(leadId) {
  if (!leadId) {
    return;
  }
  if (!state.workQueue.skippedLeadIds.includes(leadId)) {
    state.workQueue.skippedLeadIds.push(leadId);
  }
}

function rememberPreviousLead(leadId) {
  if (!leadId || state.previousLeadIds[state.previousLeadIds.length - 1] === leadId) {
    return;
  }
  state.previousLeadIds.push(leadId);
}

function getQueueExcludeIds(extraLeadIds = []) {
  const skippedLeadIds = Array.isArray(state.workQueue.skippedLeadIds) ? state.workQueue.skippedLeadIds : [];
  return [...new Set([...skippedLeadIds, ...extraLeadIds].filter(Boolean))];
}

function buildLeadSearchHaystack(lead) {
  const timelineText = getLeadLogs(lead.id)
    .slice(0, 8)
    .map((entry) => `${entry.title || ""} ${entry.text || ""}`)
    .join(" ");
  return normalizeText(
    [
      lead.companyName,
      lead.contactName,
      lead.phone,
      lead.targetMarketCity,
      lead.normalizedCity,
      lead.googleLocality,
      lead.normalizedBranch || lead.category,
      lead.notes,
      timelineText
    ].join(" ")
  );
}

function createCatalogLeadRow(lead) {
  const nextReminder = getNextOpenReminder(lead.id);
  const latestActivity = getLatestLeadActivity(lead);
  const selected = isCustomerSelected(lead.id);
  const row = document.createElement("article");
  row.className = `catalog-row${selected ? " is-selected" : ""}`;
  row.innerHTML = `
    <label class="selection-check" title="Markera kund">
      <input type="checkbox" data-customer-select="${escapeHtml(lead.id)}" ${selected ? "checked" : ""} />
    </label>
      <button class="catalog-row-main" type="button">
        <div class="lead-inline-head">
        <strong>${escapeHtml(lead.companyName)}</strong>
        <span class="status-badge" data-status="${escapeHtml(lead.status)}">${escapeHtml(lead.status)}</span>
        ${renderReminderBadge(nextReminder)}
      </div>
      <span class="catalog-row__meta">${escapeHtml(getLeadCityLabel(lead))} · ${escapeHtml(getLeadBranchLabel(lead))}</span>
      <span class="catalog-row__meta">Senast: ${escapeHtml(latestActivity.label)}</span>
    </button>
  `;
  row.querySelector("[data-customer-select]")?.addEventListener("change", (event) => {
    setCustomerSelected(lead.id, event.target.checked);
    renderCustomers();
  });
  row.querySelector(".catalog-row-main")?.addEventListener("click", () => selectLead(lead.id, "work"));
  return row;
}

function autoResizeTextarea() {
  const textarea = elements.workNoteInput;
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(textarea.scrollHeight, 440)}px`;
}

function clearManualCreateForm() {
  elements.manualCompanyNameInput.value = "";
  elements.manualPhoneInput.value = "";
  elements.manualContactInput.value = "";
  elements.manualWebsiteInput.value = "";
  elements.manualAddressInput.value = "";
  elements.manualCityInput.value = "";
  elements.manualBranchInput.value = "";
  state.manualSelectedCampaignId = "";
  if (elements.manualCampaignSelect) {
    elements.manualCampaignSelect.value = "";
  }
  updateManualBranchHint();
  updateManualCampaignHint();
}

function getFilteredCustomers() {
  return state.data.leads.filter((lead) => !lead.isDeleted && customerMatchesFilters(lead));
}

function getFilteredDeletedCustomers() {
  return state.data.leads
    .filter((lead) => lead.isDeleted && customerMatchesFilters(lead))
    .sort((left, right) => new Date(right.deletedAt || right.updatedAt) - new Date(left.deletedAt || left.updatedAt));
}

function customerMatchesFilters(lead) {
  const search = normalizeText(state.filters.customerSearch);
  const branchFilter = normalizeText(state.filters.customerCategory);
  const cityFilter = normalizeText(state.filters.customerCity);

  if (state.filters.customerStatus && lead.status !== state.filters.customerStatus) {
    return false;
  }
  if (state.filters.customerCampaignId && lead.listId !== state.filters.customerCampaignId) {
    return false;
  }
  if (branchFilter && !normalizeText(lead.normalizedBranch || lead.category).includes(branchFilter)) {
    return false;
  }
  if (cityFilter && !normalizeText(lead.targetMarketCity || lead.normalizedCity || lead.city).includes(cityFilter)) {
    return false;
  }
  if (!search) {
    return true;
  }
  return buildLeadSearchHaystack(lead).includes(search);
}

function getSelectedCustomerIds() {
  const trashMode = state.customersMode === "trash";
  return Object.entries(state.customerSelection)
    .filter(([, selected]) => selected)
    .map(([leadId]) => leadId)
    .filter((leadId) => {
      const lead = findLead(leadId);
      return lead && (trashMode ? lead.isDeleted : !lead.isDeleted);
    });
}

function isCustomerSelected(leadId) {
  return Boolean(state.customerSelection[leadId]);
}

function setCustomerSelected(leadId, selected) {
  if (!leadId) {
    return;
  }
  if (selected) {
    state.customerSelection[leadId] = true;
  } else {
    delete state.customerSelection[leadId];
  }
}

function clearCustomerSelection() {
  state.customerSelection = {};
}

function getVisibleCustomerIds() {
  if (state.customersMode === "trash") {
    return getFilteredDeletedCustomers().map((lead) => lead.id);
  }
  return getFilteredCustomers().map((lead) => lead.id);
}

function pruneCustomerSelection(visibleIds = getVisibleCustomerIds()) {
  const visibleSet = new Set(visibleIds);
  Object.keys(state.customerSelection).forEach((leadId) => {
    if (!visibleSet.has(leadId)) {
      delete state.customerSelection[leadId];
    }
  });
}

function selectVisibleCustomers() {
  getVisibleCustomerIds().forEach((leadId) => {
    state.customerSelection[leadId] = true;
  });
}

function updateCustomerBulkBar(visibleCount = getVisibleCustomerIds().length) {
  if (!elements.customerBulkBar) {
    return;
  }
  const selectedCount = getSelectedCustomerIds().length;
  const trashMode = state.customersMode === "trash";
  elements.customerBulkBar.hidden = !visibleCount && !selectedCount;
  elements.customerSelectionCount.textContent = `${selectedCount} markerade`;
  [
    elements.customerBulkStatusSelect,
    elements.customerBulkStatusButton,
    elements.customerBulkDoneButton,
    elements.customerBulkDeleteButton
  ].forEach((element) => {
    element.hidden = trashMode;
  });
  [elements.customerBulkRestoreButton, elements.customerBulkPurgeButton].forEach((element) => {
    element.hidden = !trashMode;
  });
  elements.customerBulkStatusButton.disabled = !selectedCount || !elements.customerBulkStatusSelect.value;
  elements.customerBulkDoneButton.disabled = !selectedCount;
  elements.customerBulkDeleteButton.disabled = !selectedCount;
  elements.customerBulkRestoreButton.disabled = !selectedCount;
  elements.customerBulkPurgeButton.disabled = !selectedCount;
  elements.customerClearSelectionButton.disabled = !selectedCount;
  elements.customerSelectVisibleButton.disabled = !visibleCount;
}

async function bulkUpdateSelectedCustomers(status) {
  const leadIds = getSelectedCustomerIds();
  if (!leadIds.length || !status) {
    return;
  }
  await Promise.all(
    leadIds.map((leadId) =>
      window.desktopApp.applyLeadAction({
        leadId,
        status,
        note: "",
        completeScheduled: status !== "Ny"
      })
    )
  );
  clearCustomerSelection();
  await refreshState();
  render();
}

async function bulkDeleteSelectedCustomers() {
  const leadIds = getSelectedCustomerIds();
  if (!leadIds.length) {
    return;
  }
  if (!window.confirm(`Flytta ${leadIds.length} markerade kunder till papperskorgen?`)) {
    return;
  }
  await Promise.all(leadIds.map((leadId) => window.desktopApp.deleteLead({ leadId })));
  clearCustomerSelection();
  await refreshState();
  render();
}

async function bulkRestoreSelectedCustomers() {
  const leadIds = getSelectedCustomerIds();
  if (!leadIds.length) {
    return;
  }
  await Promise.all(leadIds.map((leadId) => window.desktopApp.restoreLead({ leadId })));
  clearCustomerSelection();
  await refreshState();
  render();
}

async function bulkPurgeSelectedCustomers() {
  const leadIds = getSelectedCustomerIds();
  if (!leadIds.length) {
    return;
  }
  if (!window.confirm(`Radera ${leadIds.length} markerade kunder permanent? Det går inte att ångra.`)) {
    return;
  }
  await Promise.all(leadIds.map((leadId) => window.desktopApp.purgeLead({ leadId })));
  clearCustomerSelection();
  await refreshState();
  render();
}

function renderCustomers() {
  clearScheduledCustomerFilterRender();
  syncCustomerFilterInputs();
  const filtered = getFilteredCustomers();
  const deleted = getFilteredDeletedCustomers();
  const visibleIds = getVisibleCustomerIds();
  pruneCustomerSelection(visibleIds);
  elements.customersCatalogModeButton.classList.toggle("is-active", state.customersMode === "catalog");
  elements.customersAllModeButton.classList.toggle("is-active", state.customersMode === "all");
  elements.customersTrashModeButton.classList.toggle("is-active", state.customersMode === "trash");
  elements.customersCatalog.hidden = state.customersMode !== "catalog";
  elements.customersFlatList.hidden = state.customersMode !== "all";
  elements.customersTrashList.hidden = state.customersMode !== "trash";
  updateCustomerBulkBar(visibleIds.length);

  if (state.customersMode === "trash") {
    renderSimpleList(
      elements.customersTrashList,
      deleted.map((lead) => createDeletedLeadCard(lead)),
      "Papperskorgen är tom."
    );
    return;
  }

  renderSimpleList(
    elements.customersFlatList,
    filtered.map((lead) => createLeadListCard(lead)),
    "Inga kunder matchar filtren."
  );

  if (!filtered.length) {
    elements.customersCatalog.innerHTML = `<div class="empty-state">Inga kunder matchar filtren.</div>`;
    return;
  }

  const branchMap = new Map();
  filtered.forEach((lead) => {
    const branch = lead.normalizedBranch || lead.category || "Okategoriserat";
    const targetMarket = lead.targetMarketCity || lead.normalizedCity || lead.city || "Okänd ort";
    if (!branchMap.has(branch)) {
      branchMap.set(branch, new Map());
    }
    if (!branchMap.get(branch).has(targetMarket)) {
      branchMap.get(branch).set(targetMarket, []);
    }
    branchMap.get(branch).get(targetMarket).push(lead);
  });

  elements.customersCatalog.innerHTML = "";
  [...branchMap.entries()]
    .sort((left, right) => left[0].localeCompare(right[0], "sv"))
    .forEach(([branch, marketMap]) => {
      const totalCount = [...marketMap.values()].reduce((sum, leads) => sum + leads.length, 0);
      const branchNode = document.createElement("details");
      branchNode.className = "catalog-group";
      branchNode.open = true;
      branchNode.innerHTML = `<summary>${escapeHtml(branch)} <span>${totalCount}</span></summary>`;

      [...marketMap.entries()]
        .sort((left, right) => left[0].localeCompare(right[0], "sv"))
        .forEach(([targetMarket, marketLeads]) => {
          const marketNode = document.createElement("details");
          marketNode.className = "catalog-subgroup";
          marketNode.innerHTML = `<summary>${escapeHtml(targetMarket)} <span>${marketLeads.length}</span></summary>`;
          const rows = document.createElement("div");
          rows.className = "catalog-rows";
          marketLeads
            .sort((left, right) => left.companyName.localeCompare(right.companyName, "sv"))
            .forEach((lead) => rows.appendChild(createCatalogLeadRow(lead)));
          marketNode.appendChild(rows);
          branchNode.appendChild(marketNode);
        });

      elements.customersCatalog.appendChild(branchNode);
    });
}

function getVisibleCampaigns() {
  return state.data.campaigns;
}

function getVisibleCampaignIds() {
  return getVisibleCampaigns().map((campaign) => campaign.id);
}

function getSelectedCampaignIds() {
  return Object.entries(state.campaignSelection)
    .filter(([, selected]) => selected)
    .map(([campaignId]) => campaignId)
    .filter((campaignId) => state.data.campaigns.some((campaign) => campaign.id === campaignId));
}

function isCampaignSelected(campaignId) {
  return Boolean(state.campaignSelection[campaignId]);
}

function setCampaignSelected(campaignId, selected) {
  if (!campaignId) {
    return;
  }
  if (selected) {
    state.campaignSelection[campaignId] = true;
  } else {
    delete state.campaignSelection[campaignId];
  }
}

function clearCampaignSelection() {
  state.campaignSelection = {};
}

function pruneCampaignSelection(visibleIds = getVisibleCampaignIds()) {
  const visibleSet = new Set(visibleIds);
  Object.keys(state.campaignSelection).forEach((campaignId) => {
    if (!visibleSet.has(campaignId)) {
      delete state.campaignSelection[campaignId];
    }
  });
}

function selectVisibleCampaigns() {
  getVisibleCampaignIds().forEach((campaignId) => {
    state.campaignSelection[campaignId] = true;
  });
}

function updateCampaignBulkBar(visibleCount = getVisibleCampaignIds().length) {
  if (!elements.campaignBulkBar) {
    return;
  }
  const selectedCount = getSelectedCampaignIds().length;
  elements.campaignBulkBar.hidden = !visibleCount && !selectedCount;
  elements.campaignSelectionCount.textContent = `${selectedCount} markerade`;
  elements.campaignClearSelectionButton.disabled = !selectedCount;
  elements.campaignBulkDeleteButton.disabled = !selectedCount;
  elements.campaignSelectVisibleButton.disabled = !visibleCount;
}

function getCampaignLeadCounts(campaignId) {
  const attachedLeads = state.data.leads.filter((lead) => lead.listId === campaignId);
  return {
    active: attachedLeads.filter((lead) => !lead.isDeleted).length,
    deleted: attachedLeads.filter((lead) => lead.isDeleted).length,
    total: attachedLeads.length
  };
}

function getCampaignCatalogLabels(campaign) {
  const context = getCampaignManualContext(campaign);
  return {
    branch: campaign.normalizedBranch || context.branch || "Okategoriserat",
    market: (campaign.targetMarkets || campaign.cities || []).find(Boolean) || context.city || "Okänt målområde"
  };
}

function openCampaignCustomers(campaignId) {
  state.workQueue.campaignId = campaignId;
  state.workQueue.plannedDate = "";
  if (elements.workCampaignFilter) {
    elements.workCampaignFilter.value = campaignId;
  }
  openCustomerFilter({ campaignId });
}

function clearDeletedCampaignReferences(campaignIds) {
  const deletedSet = new Set(campaignIds);
  if (deletedSet.has(state.workQueue.campaignId)) {
    state.workQueue.campaignId = "";
  }
  if (deletedSet.has(state.filters.customerCampaignId)) {
    state.filters.customerCampaignId = "";
  }
  if (deletedSet.has(state.manualSelectedCampaignId)) {
    state.manualSelectedCampaignId = "";
  }
}

async function deleteCampaigns(campaignIds) {
  const campaigns = campaignIds
    .map((campaignId) => state.data.campaigns.find((campaign) => campaign.id === campaignId))
    .filter(Boolean);
  if (!campaigns.length) {
    return;
  }

  const campaignIdSet = new Set(campaigns.map((campaign) => campaign.id));
  const attachedLeadCount = state.data.leads.filter((lead) => campaignIdSet.has(lead.listId)).length;
  const message = campaigns.length === 1
    ? `Ta bort listan "${campaigns[0].name}"? ${attachedLeadCount ? `${attachedLeadCount} kunder behålls men kopplas loss från listan.` : "Listan är tom och tas bort."}`
    : `Ta bort ${campaigns.length} markerade listor? ${attachedLeadCount ? `${attachedLeadCount} kunder behålls men kopplas loss från listorna.` : "Listorna är tomma och tas bort."}`;
  if (!window.confirm(message)) {
    return;
  }

  for (const campaign of campaigns) {
    await window.desktopApp.deleteCampaign({ campaignId: campaign.id });
  }
  clearDeletedCampaignReferences(campaigns.map((campaign) => campaign.id));
  clearCampaignSelection();
  await refreshState();
  render();
}

async function bulkDeleteSelectedCampaigns() {
  await deleteCampaigns(getSelectedCampaignIds());
}

function createCampaignCard(campaign) {
  const counts = getCampaignLeadCounts(campaign.id);
  const selected = isCampaignSelected(campaign.id);
  const labels = getCampaignCatalogLabels(campaign);
  const card = document.createElement("article");
  card.className = `campaign-card${selected ? " is-selected" : ""}`;
  card.innerHTML = `
    <div class="lead-list-header">
      <label class="selection-check" title="Markera lista">
        <input type="checkbox" data-campaign-select="${escapeHtml(campaign.id)}" ${selected ? "checked" : ""} />
      </label>
      <strong class="lead-list-title">${escapeHtml(campaign.name)}</strong>
      <div class="lead-list-badges">
        <span class="count-badge">${counts.active}</span>
      </div>
    </div>
    <p class="meta-line">${escapeHtml(campaign.searchQuery || "Ingen sökfras")}</p>
    <p class="meta-line">Målområde: ${escapeHtml(labels.market)}</p>
    <p class="meta-line">Bransch: ${escapeHtml(labels.branch)}</p>
    ${counts.deleted ? `<p class="meta-line">Papperskorg: ${counts.deleted}</p>` : ""}
  `;
  card.querySelector("[data-campaign-select]")?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  card.querySelector("[data-campaign-select]")?.addEventListener("change", (event) => {
    event.stopPropagation();
    setCampaignSelected(campaign.id, event.target.checked);
    renderCampaigns();
  });

  const actions = document.createElement("div");
  actions.className = "inline-actions compact-actions";
  const openButton = document.createElement("button");
  openButton.type = "button";
  openButton.className = "secondary-button";
  openButton.textContent = "Visa kunder";
  openButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openCampaignCustomers(campaign.id);
  });
  actions.appendChild(openButton);

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "ghost-button danger-link";
  deleteButton.textContent = "Ta bort lista";
  deleteButton.addEventListener("click", async (event) => {
    event.stopPropagation();
    await deleteCampaigns([campaign.id]);
  });
  actions.appendChild(deleteButton);
  card.appendChild(actions);
  card.addEventListener("click", () => openCampaignCustomers(campaign.id));
  return card;
}

function renderCampaignCatalog(campaigns) {
  if (!campaigns.length) {
    elements.campaignsCatalogList.innerHTML = `<div class="empty-state">Inga kampanjer sparade.</div>`;
    return;
  }

  const branchMap = new Map();
  campaigns.forEach((campaign) => {
    const labels = getCampaignCatalogLabels(campaign);
    if (!branchMap.has(labels.branch)) {
      branchMap.set(labels.branch, new Map());
    }
    if (!branchMap.get(labels.branch).has(labels.market)) {
      branchMap.get(labels.branch).set(labels.market, []);
    }
    branchMap.get(labels.branch).get(labels.market).push(campaign);
  });

  elements.campaignsCatalogList.innerHTML = "";
  [...branchMap.entries()]
    .sort((left, right) => left[0].localeCompare(right[0], "sv"))
    .forEach(([branch, marketMap]) => {
      const totalCount = [...marketMap.values()].reduce((sum, campaignsInMarket) => sum + campaignsInMarket.length, 0);
      const branchNode = document.createElement("details");
      branchNode.className = "catalog-group";
      branchNode.open = true;
      branchNode.innerHTML = `<summary>${escapeHtml(branch)} <span>${totalCount}</span></summary>`;

      [...marketMap.entries()]
        .sort((left, right) => left[0].localeCompare(right[0], "sv"))
        .forEach(([market, campaignsInMarket]) => {
          const marketNode = document.createElement("details");
          marketNode.className = "catalog-subgroup";
          marketNode.open = true;
          marketNode.innerHTML = `<summary>${escapeHtml(market)} <span>${campaignsInMarket.length}</span></summary>`;
          const rows = document.createElement("div");
          rows.className = "catalog-rows";
          campaignsInMarket
            .sort((left, right) => left.name.localeCompare(right.name, "sv"))
            .forEach((campaign) => rows.appendChild(createCampaignCard(campaign)));
          marketNode.appendChild(rows);
          branchNode.appendChild(marketNode);
        });

      elements.campaignsCatalogList.appendChild(branchNode);
    });
}

function renderCampaigns() {
  renderSimpleList(
    elements.placesQueryStats,
    getQueryPreviewCards(),
    "Ingen query preview ännu."
  );

  renderSimpleList(
    elements.placesResultsList,
    state.placesResults.map((lead, index) => {
      const card = document.createElement("article");
      card.className = "list-card";
      const selected = state.placesSelection[lead.id] !== false;
      card.innerHTML = `
        <div class="row-header">
          <label class="checkbox-row">
            <input type="checkbox" data-place-select="${escapeHtml(lead.id)}" ${selected ? "checked" : ""} />
            <strong>${escapeHtml(lead.companyName)}</strong>
          </label>
          <span class="status-badge">${escapeHtml(lead.targetMarketCity || lead.normalizedCity || lead.city || "Okänd stad")}</span>
        </div>
        <p class="meta-line">${escapeHtml(lead.phone || "Telefon saknas")} · ${escapeHtml(lead.website || "Hemsida saknas")}</p>
        <p class="meta-line">Google-lokalitet: ${escapeHtml(lead.googleLocality || lead.city || "Saknas")}</p>
        <p class="meta-line">Google-kategori: ${escapeHtml(lead.rawGoogleCategory || "Saknas")}</p>
        <p class="meta-line">Första query: ${escapeHtml(lead.sourceQuery || lead.source || "Saknas")}</p>
        <p class="meta-line">Matchade queries: ${escapeHtml((lead.matchedQueries || []).join(", ") || "Saknas")}</p>
      `;
      card.querySelector("[data-place-select]")?.addEventListener("change", (event) => {
        state.placesSelection[lead.id] = event.target.checked;
        updatePlacesSelectionFeedback();
        renderCampaigns();
      });
      const actions = document.createElement("div");
      actions.className = "inline-actions";
      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "ghost-button";
      removeButton.textContent = "Ignorera";
      removeButton.addEventListener("click", (event) => {
        event.stopPropagation();
        state.placesResults.splice(index, 1);
        delete state.placesSelection[lead.id];
        updatePlacesSelectionFeedback();
        renderCampaigns();
      });
      actions.appendChild(removeButton);
      card.appendChild(actions);
      return card;
    }),
    "Inga sökresultat ännu."
  );

  elements.savePlacesCampaignButton.textContent = `Spara valda till lista (${getSelectedPlacesResults().length})`;

  const campaigns = getVisibleCampaigns();
  const visibleCampaignIds = getVisibleCampaignIds();
  pruneCampaignSelection(visibleCampaignIds);
  elements.campaignsCatalogModeButton.classList.toggle("is-active", state.campaignsMode === "catalog");
  elements.campaignsAllModeButton.classList.toggle("is-active", state.campaignsMode === "all");
  elements.campaignsCatalogList.hidden = state.campaignsMode !== "catalog";
  elements.campaignCards.hidden = state.campaignsMode !== "all";
  updateCampaignBulkBar(visibleCampaignIds.length);
  renderCampaignCatalog(campaigns);
  renderSimpleList(
    elements.campaignCards,
    campaigns.map((campaign) => createCampaignCard(campaign)),
    "Inga kampanjer sparade."
  );
}

async function openNextLead(switchToWork) {
  if (!confirmDiscardDraft()) {
    return;
  }

  const currentLeadId = state.selectedLeadId;
  const currentLead = getSelectedLead();
  rememberQueueSkippedLead(state.selectedLeadId);
  const lead = await window.desktopApp.getNextLead({ ...getActiveQueue(), excludeLeadIds: getQueueExcludeIds() });
  if (!lead) {
    state.selectedLeadId = "";
    state.workNotice = "Listan är klar. Välj en ny lista eller gå till planering.";
    if (switchToWork) {
      state.currentView = "work";
    }
    render();
    return;
  }

  state.workNotice = getLeadTransitionNotice(currentLead, lead);
  if (currentLeadId && currentLeadId !== lead.id) {
    rememberPreviousLead(currentLeadId);
  }
  activateLead(lead.id, switchToWork ? "work" : state.currentView);
}

function openPreviousLead() {
  if (!state.previousLeadIds.length) {
    renderWorkMode();
    return;
  }
  if (!confirmDiscardDraft()) {
    return;
  }
  let previousLeadId = state.previousLeadIds.pop();
  while (previousLeadId && !findLead(previousLeadId)) {
    previousLeadId = state.previousLeadIds.pop();
  }
  if (!previousLeadId) {
    renderWorkMode();
    return;
  }
  activateLead(previousLeadId, "work");
}

async function deleteCurrentWorkLead() {
  const lead = getSelectedLead();
  if (!lead) {
    return;
  }
  await softDeleteLeadAction(lead.id);
}

async function startWorkFromPlannedDay(plannedDate) {
  if (!confirmDiscardDraft()) {
    return;
  }
  state.workMode = "flow";
  state.workQueue.campaignId = "";
  state.workQueue.plannedDate = plannedDate;
  if (elements.workCampaignFilter) {
    elements.workCampaignFilter.value = "";
  }
  resetWorkQueueProgress();
  state.workNotice = `Arbetsdag: ${formatWeekdayDate(plannedDate)}`;
  state.currentView = "work";
  const lead = await window.desktopApp.getNextLead({ plannedDate, excludeLeadIds: getQueueExcludeIds() });
  state.selectedLeadId = lead?.id || "";
  if (!lead) {
    state.workNotice = "Dagens lista är klar.";
  }
  syncWorkDraftWithSelectedLead(true);
  render();
  if (lead) {
    focusWorkNote();
  }
}

function getNextLeadFromState() {
  return [...state.data.leads]
    .filter((lead) => !lead.isDeleted)
    .filter((lead) => lead.status === "Ny")
    .sort((left, right) => new Date(left.updatedAt) - new Date(right.updatedAt))[0] ?? null;
}

function renderProfile() {
  const lead = getSelectedLead();
  elements.profileMeta.innerHTML = "";
  elements.profileLogList.innerHTML = "";
  elements.profileReminderList.innerHTML = "";
  elements.profileTelavoxCalls.innerHTML = "";

  if (!lead) {
    elements.profileTitle.textContent = "Inget lead valt";
    elements.profileNoteEditor.value = "";
    elements.profileNoteEditor.dataset.profileLeadId = "";
    elements.profileMeta.innerHTML = `<div class="empty-state">Välj ett lead för att se kundkortet.</div>`;
    elements.profileTelavoxFeedback.textContent = "Välj ett lead för att synka Telavox.";
    return;
  }

  elements.profileTitle.textContent = lead.companyName;
  setInputValue(elements.profileNoteEditor, lead.notes || "", {
    preserveActive: elements.profileNoteEditor.dataset.profileLeadId === lead.id
  });
  elements.profileNoteEditor.dataset.profileLeadId = lead.id;
  elements.profileTelavoxFeedback.textContent = "Synka samtalshistorik och inspelningar mot vald kund.";

  [
    ["Status", lead.status],
    ["Kontaktperson", lead.contactName || "Saknas"],
    ["Telefon", lead.phone || "Saknas"],
    ["Hemsida", lead.website || "Saknas"],
    ["Google Maps", lead.googleMapsUrl || "Saknas"],
    ["Adress", lead.address || "Saknas"],
    ["Målområde", lead.targetMarketCity || lead.normalizedCity || "Saknas"],
    ["Google-lokalitet", lead.googleLocality || lead.city || "Saknas"],
    ["Land", lead.country || "Saknas"],
    ["Bransch", lead.normalizedBranch || lead.category || "Saknas"],
    ["Google-kategori", lead.rawGoogleCategory || "Saknas"],
    ["Lista", getCampaignName(lead.listId) || "Ingen lista"],
    ["Första query", lead.sourceQuery || lead.source || "Saknas"],
    ["Matchade queries", (lead.matchedQueries || []).join(", ") || "Saknas"]
  ].forEach(([label, value]) => {
    const meta = document.createElement("div");
    meta.className = "detail-card";
    meta.innerHTML = `<span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong>`;
    elements.profileMeta.appendChild(meta);
  });

  renderTimeline(lead.id, elements.profileLogList, "Ingen timeline än.");
  renderSimpleList(
    elements.profileReminderList,
    getLeadReminders(lead.id).map((reminder) => {
      const card = document.createElement("article");
      card.className = "info-card";
      card.innerHTML = `
        <strong>${escapeHtml(reminder.type)}</strong>
        <p class="meta-line">${escapeHtml(reminder.dueDate || "Saknas")} ${escapeHtml(reminder.dueTime || "")}</p>
        <p class="meta-line">${escapeHtml(reminder.note || "Ingen anteckning")}</p>
      `;
      return card;
    }),
    "Inga påminnelser."
  );

  renderSimpleList(
    elements.profileTelavoxCalls,
    getLeadCallRecords(lead.id).map((record) => {
      const card = document.createElement("article");
      card.className = "list-card";
      card.innerHTML = `
        <div class="row-header">
          <strong>${escapeHtml(formatTelavoxDirection(record.direction))}</strong>
          <span class="status-badge">${escapeHtml(formatDateTime(record.happenedAt))}</span>
        </div>
        <p class="meta-line">${escapeHtml(record.remoteNumber || "Nummer saknas")} · ${escapeHtml(formatDuration(record.durationSeconds))}</p>
        <p class="meta-line">${escapeHtml(record.recordingId ? "Inspelning finns i Telavox" : "Ingen inspelning kopplad")}</p>
      `;

      if (record.recordingId) {
        const actions = document.createElement("div");
        actions.className = "inline-actions";
        const actionButton = document.createElement("button");
        actionButton.type = "button";
        actionButton.className = record.localRecordingPath ? "secondary-button" : "primary-button";
        actionButton.dataset.callRecordId = record.id;
        actionButton.dataset.telavoxAction = record.localRecordingPath ? "open-recording" : "download-recording";
        actionButton.textContent = record.localRecordingPath ? "Öppna inspelning" : "Hämta inspelning";
        actions.appendChild(actionButton);
        card.appendChild(actions);
      }

      return card;
    }),
    "Inga Telavox-samtal synkade ännu."
  );
}

function createLeadListCard(lead, overrideMeta = "", options = {}) {
  const nextReminder = getNextOpenReminder(lead.id);
  const latestActivity = getLatestLeadActivity(lead);
  const cityLabel = getLeadCityLabel(lead);
  const branchLabel = getLeadBranchLabel(lead);
  const noteText = (lead.notes || latestActivity.text || "Ingen anteckning").slice(0, 300);
  const selectable = options.selectable ?? (state.currentView === "customers" && state.customersMode === "all" && !lead.isDeleted);
  const showActions = options.actions !== false;
  const selected = selectable && isCustomerSelected(lead.id);
  const card = document.createElement("article");
  card.className = `list-card lead-work-card${selected ? " is-selected" : ""}`;
  card.innerHTML = `
    <div class="lead-list-layout${selectable ? " is-selectable" : ""}${showActions ? " has-actions" : ""}">
      ${selectable ? `
        <label class="selection-check" title="Markera kund">
          <input type="checkbox" data-customer-select="${escapeHtml(lead.id)}" ${selected ? "checked" : ""} />
        </label>
      ` : ""}
      <div class="lead-list-content">
        <div class="lead-list-main">
          <div class="lead-list-header">
            <div class="lead-list-title-row">
              <strong class="lead-list-title">${escapeHtml(lead.companyName)}</strong>
              <div class="lead-list-badges">
                <span class="status-badge" data-status="${escapeHtml(lead.status)}">${escapeHtml(lead.status)}</span>
                ${renderReminderBadge(nextReminder)}
              </div>
            </div>
            <div class="lead-list-context-row">
              <span class="lead-list-city">${leadListIcon("map-pin")}${escapeHtml(cityLabel)}</span>
              <span class="lead-list-divider"></span>
              <span class="lead-list-branch">${escapeHtml(branchLabel)}</span>
            </div>
          </div>
          <div class="lead-list-meta-row">
            <span>${leadListIcon("user")}<b>Kontakt:</b><strong>${escapeHtml(lead.contactName || "saknas")}</strong></span>
            <span>${leadListIcon("clock")}<b>Senast:</b><strong>${escapeHtml(latestActivity.label)}</strong></span>
            <span>${leadListIcon("phone")}<b>Tel:</b><strong>${escapeHtml(lead.phone || "saknas")}</strong></span>
            ${overrideMeta ? `<span>${leadListIcon("calendar")}<b>Info:</b><strong>${escapeHtml(overrideMeta)}</strong></span>` : ""}
          </div>
          <p class="lead-list-note-line${noteText === "Ingen anteckning" ? " is-empty" : ""}">${leadListIcon("message")}<span><b>Anteckning:</b> ${escapeHtml(noteText)}</span></p>
        </div>
        ${showActions ? `<div class="lead-list-actions" data-lead-list-actions></div>` : ""}
      </div>
    </div>
  `;
  card.querySelector("[data-customer-select]")?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  card.querySelector("[data-customer-select]")?.addEventListener("change", (event) => {
    event.stopPropagation();
    setCustomerSelected(lead.id, event.target.checked);
    renderCustomers();
  });
  if (showActions) {
    let actions = card.querySelector("[data-lead-list-actions]");
    if (!actions) {
      actions = document.createElement("div");
      card.querySelector(".lead-list-content")?.appendChild(actions);
    }
    actions.className = "lead-list-actions";
    const doneButton = document.createElement("button");
    doneButton.type = "button";
    doneButton.className = "secondary-button";
    doneButton.innerHTML = `${leadListIcon("check")}<span>Markera klar</span>`;
    doneButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      await markLeadDone(lead.id);
    });
    actions.appendChild(doneButton);
    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "ghost-button";
    deleteButton.innerHTML = `${leadListIcon("trash")}<span>Ta bort</span>`;
    deleteButton.addEventListener("click", async (event) => {
      event.stopPropagation();
      await softDeleteLeadAction(lead.id);
    });
    actions.appendChild(deleteButton);
  }
  card.addEventListener("click", () => selectLead(lead.id, "work"));
  return card;
}

function createDeletedLeadCard(lead) {
  const selected = isCustomerSelected(lead.id);
  const card = document.createElement("article");
  card.className = `list-card${selected ? " is-selected" : ""}`;
  card.innerHTML = `
    <div class="row-header">
      <label class="selection-check" title="Markera kund">
        <input type="checkbox" data-customer-select="${escapeHtml(lead.id)}" ${selected ? "checked" : ""} />
      </label>
      <strong>${escapeHtml(lead.companyName)}</strong>
      <span class="status-badge">${escapeHtml(lead.status)}</span>
    </div>
    <p class="meta-line">${escapeHtml(lead.targetMarketCity || lead.normalizedCity || lead.city || "Ort saknas")} · borttagen ${escapeHtml(lead.deletedAt ? formatDateTime(lead.deletedAt) : "nyligen")}</p>
  `;
  card.querySelector("[data-customer-select]")?.addEventListener("click", (event) => {
    event.stopPropagation();
  });
  card.querySelector("[data-customer-select]")?.addEventListener("change", (event) => {
    event.stopPropagation();
    setCustomerSelected(lead.id, event.target.checked);
    renderCustomers();
  });
  const actions = document.createElement("div");
  actions.className = "inline-actions compact-actions";
  const restoreButton = document.createElement("button");
  restoreButton.type = "button";
  restoreButton.className = "secondary-button";
  restoreButton.textContent = "Återställ";
  restoreButton.addEventListener("click", async (event) => {
    event.stopPropagation();
    await window.desktopApp.restoreLead({ leadId: lead.id });
    await refreshState();
    render();
  });
  actions.appendChild(restoreButton);
  const purgeButton = document.createElement("button");
  purgeButton.type = "button";
  purgeButton.className = "ghost-button danger-link";
  purgeButton.textContent = "Radera permanent";
  purgeButton.addEventListener("click", async (event) => {
    event.stopPropagation();
    if (!window.confirm(`Radera ${lead.companyName} permanent? Det går inte att ångra.`)) {
      return;
    }
    await window.desktopApp.purgeLead({ leadId: lead.id });
    await refreshState();
    render();
  });
  actions.appendChild(purgeButton);
  card.appendChild(actions);
  return card;
}

function mapCsvRow(headers, row) {
  const lookup = Object.fromEntries(headers.map((header, index) => [normalizeText(header).replace(/\s+/g, ""), row[index] ?? ""]));
  const companyName = lookup.bolagsnamn || lookup.company || lookup.companyname || lookup.name || "";
  if (!companyName) {
    return null;
  }

  const branch = lookup.bransch || lookup.kategori || lookup.category || "";
  const targetMarket = lookup.malomrade || lookup.malomradestad || lookup.stad || lookup.city || "";

  return {
    source: "csv-import",
    sourceQuery: "csv-import",
    matchedQueries: ["csv-import"],
    externalId: lookup.externalid || "",
    companyName,
    contactName: lookup.kontaktperson || lookup.contact || lookup.contactname || "",
    phone: lookup.telefon || lookup.phone || "",
    website: lookup.hemsida || lookup.website || lookup.url || "",
    address: lookup.adress || lookup.address || "",
    city: lookup.googlelocality || lookup.locality || targetMarket,
    normalizedCity: targetMarket,
    targetMarketCity: targetMarket,
    googleLocality: lookup.googlelocality || lookup.locality || "",
    category: branch,
    normalizedBranch: branch,
    tags: parseList(lookup.taggar || lookup.tags || ""),
    priority: lookup.prioritet || "Medel",
    status: lookup.status || "Ny",
    plannedDate: lookup.planneddate || "",
    googleMapsUrl: lookup.googlemapsurl || ""
  };
}

function focusWorkNote() {
  window.requestAnimationFrame(() => {
    elements.workNoteInput?.focus();
  });
}

function shouldAutoOpenFlowLead(isFlow, lead) {
  if (state.currentView !== "work" || !isFlow || lead || state.autoOpeningNextLead) {
    return false;
  }
  return !["Listan är klar. Välj en ny lista eller gå till planering.", "Dagens lista är klar."].includes(state.workNotice);
}

function renderWorkMode() {
  const isFlow = state.workMode === "flow";
  const lead = getSelectedLead();
  const isManualEmpty = !isFlow && !lead;
  const isManualCreate = isManualEmpty && state.manualCreateOpen;
  if (shouldAutoOpenFlowLead(isFlow, lead)) {
    state.autoOpeningNextLead = true;
    state.workNotice = "Hämtar nästa lead...";
    window.setTimeout(() => {
      void openNextLead(false).finally(() => {
        state.autoOpeningNextLead = false;
      });
    }, 0);
  }
  const timelinePanel = elements.workTimelineList.closest(".subpanel");
  const contactField = elements.workContactInput.closest(".field");
  const noteField = elements.workNoteInput.closest(".field");
  const reminderNoteField = elements.reminderNoteInput.closest(".field");
  const footer = elements.workSaveButton.closest(".work-footer");
  const reminderRow = elements.reminderDateInput.closest(".reminder-inline");
  const workLayout = elements.workMain.closest(".work-layout");
  const workSide = elements.workTimelineList.closest(".work-side");
  const showCommandArea = Boolean(lead) || isManualEmpty;

  elements.workFlowModeButton.classList.toggle("is-active", isFlow);
  elements.workManualModeButton.classList.toggle("is-active", !isFlow);
  elements.workFlowToolbar.hidden = !isFlow;
  elements.workManualToolbar.hidden = isFlow;
  elements.workSaveAndNextButton.hidden = !isFlow;
  elements.manualBackButton.hidden = isFlow || !lead;
  elements.manualBackButton.textContent = "Klar / välj ny kund";
  elements.workPreviousLeadButton.disabled = state.previousLeadIds.length === 0;
  elements.workSaveButton.textContent = "Spara";
  elements.workSaveAndNextButton.textContent = "Nästa";
  elements.toggleManualCreateButton.textContent = "+ Ny kund";
  renderWorkQueueProgress(lead);
  elements.manualSearchResults.hidden = isFlow || Boolean(lead) || !state.manualSearchTerm.trim();
  elements.manualCreatePanel.hidden = !isManualCreate;
  elements.toggleManualCreateButton.hidden = isFlow || Boolean(lead);
  elements.workManualToolbar.classList.toggle("is-compact", !isFlow && Boolean(lead));
  elements.workManualToolbar.classList.toggle("is-empty", !isFlow && !lead);
  elements.workMain.classList.toggle("is-empty", isFlow && !lead);
  elements.workMain.classList.toggle("is-manual-empty", !isFlow && !lead);
  timelinePanel?.classList.toggle("timeline-panel", true);
  if (workLayout) {
    workLayout.hidden = false;
    workLayout.classList.toggle("is-command-only", false);
  }
  if (workSide) {
    workSide.hidden = false;
  }
  if (timelinePanel) {
    timelinePanel.hidden = !lead && !isManualEmpty;
  }
  if (contactField) {
    contactField.hidden = !showCommandArea;
  }
  if (noteField) {
    noteField.hidden = !showCommandArea;
  }
  if (reminderNoteField) {
    reminderNoteField.hidden = !showCommandArea;
  }
  if (reminderRow) {
    reminderRow.hidden = !showCommandArea;
  }
  elements.statusButtons.hidden = !showCommandArea;
  if (footer) {
    footer.hidden = !showCommandArea;
  }

  if (!lead) {
    elements.workLeadCard.hidden = isManualEmpty;
    elements.workLeadCard.className = "lead-card empty-card compact-empty-card";
    elements.workLeadCard.innerHTML = isFlow
      ? `<div class="empty-state compact-empty-state">${escapeHtml(state.workNotice || "Hämtar nästa lead...")}</div>`
      : "";
    renderSimpleList(elements.workTimelineList, [], "Ingen timeline än.");
    hydrateWorkDraftInputs();
    renderManualSearchResults();
    return;
  }

  const nextReminder = getNextOpenReminder(lead.id);
  const latestLog = getLeadLogs(lead.id)[0];
  const compactMeta = [
    ["Telefon", lead.phone || "Saknas"],
    ["Kontaktperson", lead.contactName || "Saknas"],
    ["Målområde", getLeadCityLabel(lead)],
    ["Bransch", getLeadBranchLabel(lead)],
    ["Adress", lead.address || "Saknas"],
    ["Nästa påminnelse", formatReminderLabel(nextReminder)]
  ];
  const detailMeta = [
    ["Google-lokalitet", lead.googleLocality || lead.city || "Saknas"],
    ["Google-kategori", lead.rawGoogleCategory || "Saknas"],
    ["Första query", lead.sourceQuery || lead.source || "Saknas"],
    ["Matchade queries", (lead.matchedQueries || []).join(", ") || "Saknas"],
    ["Senaste aktivitet", latestLog ? formatDateTime(latestLog.createdAt) : formatDateTime(lead.updatedAt)]
  ];

  elements.workLeadCard.hidden = false;
  elements.workLeadCard.className = `lead-card ${isFlow ? "is-flow" : "is-manual"}`;
  elements.workLeadCard.innerHTML = `
    ${state.workNotice ? `<p class="work-notice">${escapeHtml(state.workNotice)}</p>` : ""}
    <div class="lead-card__head lead-card__head--compact">
      <div class="lead-heading">
        <p class="section-label">${escapeHtml(getCampaignName(lead.listId) || "Ingen lista")}</p>
        <div class="lead-title-row">
          <h2 class="lead-title">${escapeHtml(lead.companyName)}</h2>
          <span class="status-badge" data-status="${escapeHtml(lead.status)}">${escapeHtml(lead.status)}</span>
        </div>
      </div>
      <div class="lead-actions lead-actions--compact">
        <button class="primary-button" type="button" data-work-action="call">Ring</button>
        <button class="secondary-button" type="button" data-work-action="website" ${lead.website ? "" : "disabled"}>Hemsida</button>
        <button class="secondary-button" type="button" data-work-action="maps" ${lead.googleMapsUrl ? "" : "disabled"}>Google Maps</button>
        <button class="ghost-button compact-edit-button" type="button" data-work-action="edit">Redigera</button>
      </div>
    </div>
    <div class="lead-meta-strip">
      ${compactMeta.map(([label, value]) => `<div class="detail-pill"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`).join("")}
    </div>
  `;

  hydrateWorkDraftInputs();
  updateStatusButtonSelection();
  renderTimeline(lead.id, elements.workTimelineList, "Ingen timeline än.");
  renderManualSearchResults();
};

function renderManualSearchResults() {
  const search = normalizeText(state.manualSearchTerm);
  const canShowResults = state.workMode === "manual" && !state.selectedLeadId && Boolean(search);
  elements.manualSearchResults.hidden = !canShowResults;
  if (!canShowResults) {
    elements.manualSearchResults.innerHTML = "";
    return;
  }

  const matches = state.data.leads
    .filter((lead) => !lead.isDeleted)
    .filter((lead) => buildLeadSearchHaystack(lead).includes(search))
    .slice(0, 8);

  renderSimpleList(
    elements.manualSearchResults,
    matches.map((lead) => {
      const row = document.createElement("button");
      row.type = "button";
      row.className = "manual-search-row";
      row.innerHTML = `
        <strong>${escapeHtml(lead.companyName)}</strong>
        <span>${escapeHtml(lead.targetMarketCity || lead.normalizedCity || lead.city || "Okänd ort")}</span>
        <span>${escapeHtml(lead.phone || "Telefon saknas")}</span>
      `;
      row.addEventListener("click", () => {
        state.selectedLeadId = lead.id;
        state.manualCreateOpen = false;
        state.manualSearchTerm = "";
        elements.manualSearchInput.value = "";
        elements.manualSearchResults.innerHTML = "";
        elements.manualSearchResults.hidden = true;
        syncWorkDraftWithSelectedLead(true);
        render();
        focusWorkNote();
      });
      return row;
    }),
    "Ingen träff i systemet. Klicka på Skapa ny kund."
  );
};

function renderTimeline(leadId, container, emptyText) {
  renderSimpleList(
    container,
    getLeadLogs(leadId).map((entry) => {
      const card = document.createElement("article");
      card.className = "info-card timeline-card";
      card.innerHTML = `
        <div class="timeline-card__head">
          <strong>${escapeHtml(entry.title || getTimelineTypeLabel(entry.type))}</strong>
          <span class="meta-line">${escapeHtml(formatDateTime(entry.createdAt))}</span>
        </div>
        <p class="meta-line">${escapeHtml(entry.text)}</p>
      `;
      return card;
    }),
    emptyText
  );
};
