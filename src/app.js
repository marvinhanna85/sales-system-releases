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
const DASHBOARD_UPCOMING_WINDOW_MINUTES = 60;
const DASHBOARD_UPCOMING_LIMIT = 3;

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
  adStudio: {
    selectedLeadId: "",
    activeConceptId: "",
    assets: [],
    brief: null,
    concepts: [],
    research: null,
    appliedCreativeFeedback: "",
    imageProgress: {
      active: false,
      value: 0,
      label: ""
    },
    status: "material",
    fields: createDefaultAdStudioFields(),
    isBusy: false
  },
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
  placesSearchBusy: false,
  placesSaveBusy: false,
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
    workDraft: createEmptyWorkDraft(),
    invoiceLines: [createDefaultInvoiceLine()]
};

let customerFilterRenderTimer = null;
let adStudioImageProgressTimer = null;
const adStudioAssetDataUrlCache = new Map();

const elements = {
  navButtons: [...document.querySelectorAll(".nav-button")],
  views: {
    dashboard: document.querySelector("#dashboardView"),
    work: document.querySelector("#workView"),
    customers: document.querySelector("#customersView"),
    campaigns: document.querySelector("#campaignsView"),
    ads: document.querySelector("#adsView"),
    planning: document.querySelector("#planningView"),
    reminders: document.querySelector("#remindersView"),
    invoices: document.querySelector("#invoicesView"),
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
  dashboardUpcomingPanel: document.querySelector("#dashboardUpcomingPanel"),
  dashboardUpcomingTitle: document.querySelector("#dashboardUpcomingTitle"),
  dashboardUpcomingList: document.querySelector("#dashboardUpcomingList"),
  dashboardUpcomingAllButton: document.querySelector("#dashboardUpcomingAllButton"),
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
  placesCampaignSelect: document.querySelector("#placesCampaignSelect"),
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
  adsCustomerSelect: document.querySelector("#adsCustomerSelect"),
  adsOpenAiKeyInput: document.querySelector("#adsOpenAiKeyInput"),
  adsBrandInput: document.querySelector("#adsBrandInput"),
  adsHeadlineInput: document.querySelector("#adsHeadlineInput"),
  adsSubheadlineInput: document.querySelector("#adsSubheadlineInput"),
  adsBodyInput: document.querySelector("#adsBodyInput"),
  adsCtaInput: document.querySelector("#adsCtaInput"),
  adsPhoneInput: document.querySelector("#adsPhoneInput"),
  adsEmailInput: document.querySelector("#adsEmailInput"),
  adsWebsiteInput: document.querySelector("#adsWebsiteInput"),
  adsAccentInput: document.querySelector("#adsAccentInput"),
  adsInstructionsInput: document.querySelector("#adsInstructionsInput"),
  adsResearchInput: document.querySelector("#adsResearchInput"),
  adsResearchButton: document.querySelector("#adsResearchButton"),
  adsResearchPanel: document.querySelector("#adsResearchPanel"),
  adsCreativeFeedbackInput: document.querySelector("#adsCreativeFeedbackInput"),
  adsApplyFeedbackButton: document.querySelector("#adsApplyFeedbackButton"),
  adsFeedbackStatus: document.querySelector("#adsFeedbackStatus"),
  adsFilesInput: document.querySelector("#adsFilesInput"),
  adsAssetGrid: document.querySelector("#adsAssetGrid"),
  adsInterpretButton: document.querySelector("#adsInterpretButton"),
  adsGenerateButton: document.querySelector("#adsGenerateButton"),
  adsGenerateImageButton: document.querySelector("#adsGenerateImageButton"),
  adsRegenerateBriefButton: document.querySelector("#adsRegenerateBriefButton"),
  adsCopyBriefButton: document.querySelector("#adsCopyBriefButton"),
  adsExportBriefButton: document.querySelector("#adsExportBriefButton"),
  adsExportButton: document.querySelector("#adsExportButton"),
  adsResetButton: document.querySelector("#adsResetButton"),
  adsSendReviewButton: document.querySelector("#adsSendReviewButton"),
  adsActiveConceptTitle: document.querySelector("#adsActiveConceptTitle"),
  adsFeedback: document.querySelector("#adsFeedback"),
  adsQualityBadge: document.querySelector("#adsQualityBadge"),
  adsPreview: document.querySelector("#adsPreview"),
  adsGenerationProgress: document.querySelector("#adsGenerationProgress"),
  adsGenerationProgressLabel: document.querySelector("#adsGenerationProgressLabel"),
  adsGenerationProgressValue: document.querySelector("#adsGenerationProgressValue"),
  adsGenerationProgressBar: document.querySelector("#adsGenerationProgressBar"),
  adsVariantList: document.querySelector("#adsVariantList"),
  adsBriefPanel: document.querySelector("#adsBriefPanel"),
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
  invoiceLeadSelect: document.querySelector("#invoiceLeadSelect"),
  invoiceNumberInput: document.querySelector("#invoiceNumberInput"),
  invoiceCustomerNameInput: document.querySelector("#invoiceCustomerNameInput"),
  invoiceCustomerOrgInput: document.querySelector("#invoiceCustomerOrgInput"),
  invoiceCustomerAddressInput: document.querySelector("#invoiceCustomerAddressInput"),
  invoiceCustomerEmailInput: document.querySelector("#invoiceCustomerEmailInput"),
  invoiceCustomerReferenceInput: document.querySelector("#invoiceCustomerReferenceInput"),
  invoiceCustomerReferencePhoneInput: document.querySelector("#invoiceCustomerReferencePhoneInput"),
  invoiceOrderDateInput: document.querySelector("#invoiceOrderDateInput"),
  invoiceDueDateInput: document.querySelector("#invoiceDueDateInput"),
  invoiceReferenceNameInput: document.querySelector("#invoiceReferenceNameInput"),
  invoiceReferencePhoneInput: document.querySelector("#invoiceReferencePhoneInput"),
  invoiceReferenceEmailInput: document.querySelector("#invoiceReferenceEmailInput"),
  invoiceLinesList: document.querySelector("#invoiceLinesList"),
  addInvoiceLineButton: document.querySelector("#addInvoiceLineButton"),
  invoiceVatRateInput: document.querySelector("#invoiceVatRateInput"),
  invoiceSummary: document.querySelector("#invoiceSummary"),
  invoiceBankNameInput: document.querySelector("#invoiceBankNameInput"),
  invoiceBankgiroInput: document.querySelector("#invoiceBankgiroInput"),
  invoiceAccountNumberInput: document.querySelector("#invoiceAccountNumberInput"),
  invoiceAccountOwnerInput: document.querySelector("#invoiceAccountOwnerInput"),
  createInvoicePdfButton: document.querySelector("#createInvoicePdfButton"),
  invoiceFeedback: document.querySelector("#invoiceFeedback"),
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
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      openNavView(button.dataset.view);
    });
  });
  document.addEventListener("click", (event) => {
    const navButton = event.target.closest(".nav-button[data-view]");
    if (!navButton) {
      return;
    }
    openNavView(navButton.dataset.view);
  });

  elements.topbarNextLead.addEventListener("click", () => openNextLead(true));
  elements.dashboardNextLead.addEventListener("click", () => openNextLead(true));
  elements.dashboardOpenReminders.addEventListener("click", openDueReminders);
  elements.dashboardUpcomingAllButton?.addEventListener("click", openDueReminders);
  elements.dashboardUpcomingList?.addEventListener("click", handleDashboardUpcomingClick);
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

  elements.adsCustomerSelect?.addEventListener("change", handleAdStudioCustomerChange);
  [
    ["brand", elements.adsBrandInput],
    ["headline", elements.adsHeadlineInput],
    ["subheadline", elements.adsSubheadlineInput],
    ["body", elements.adsBodyInput],
    ["cta", elements.adsCtaInput],
    ["phone", elements.adsPhoneInput],
    ["email", elements.adsEmailInput],
    ["website", elements.adsWebsiteInput],
    ["accent", elements.adsAccentInput],
    ["instructions", elements.adsInstructionsInput],
    ["researchUrls", elements.adsResearchInput],
    ["creativeFeedback", elements.adsCreativeFeedbackInput]
  ].forEach(([field, element]) => {
    element?.addEventListener("input", (event) => updateAdStudioField(field, event.target.value));
  });
  elements.adsOpenAiKeyInput?.addEventListener("input", (event) => {
    state.data.settings.openaiApiKey = event.target.value.trim();
  });
  elements.adsFilesInput?.addEventListener("change", handleAdStudioFilesInput);
  elements.adsAssetGrid?.addEventListener("click", handleAdStudioAssetClick);
  elements.adsResearchButton?.addEventListener("click", () => researchAdStudioCustomer());
  elements.adsApplyFeedbackButton?.addEventListener("click", () => applyAdStudioFeedback());
  elements.adsInterpretButton?.addEventListener("click", () => generateAdStudioBrief());
  elements.adsRegenerateBriefButton?.addEventListener("click", () => generateAdStudioBrief({ force: true }));
  elements.adsCopyBriefButton?.addEventListener("click", copyAdStudioBrief);
  elements.adsExportBriefButton?.addEventListener("click", exportAdStudioBrief);
  elements.adsGenerateButton?.addEventListener("click", () => generateAdStudioConcepts());
  elements.adsGenerateImageButton?.addEventListener("click", generateAdStudioImageAsset);
  elements.adsExportButton?.addEventListener("click", exportAdStudioPng);
  elements.adsResetButton?.addEventListener("click", resetAdStudio);
  elements.adsVariantList?.addEventListener("click", handleAdVariantClick);
  elements.adsSendReviewButton?.addEventListener("click", markAdStudioForReview);

  elements.searchPlacesButton.addEventListener("click", searchPlacesAction);
  elements.placesCampaignSelect?.addEventListener("change", renderCampaigns);
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
  elements.invoiceLeadSelect?.addEventListener("change", () => hydrateInvoiceCustomerFromLead(elements.invoiceLeadSelect.value));
  elements.addInvoiceLineButton?.addEventListener("click", () => {
    state.invoiceLines.push(createDefaultInvoiceLine());
    renderInvoiceLines();
    renderInvoiceSummary();
  });
  elements.invoiceLinesList?.addEventListener("input", handleInvoiceLineInput);
  elements.invoiceLinesList?.addEventListener("click", handleInvoiceLineClick);
  elements.invoiceVatRateInput?.addEventListener("input", renderInvoiceSummary);
  elements.createInvoicePdfButton?.addEventListener("click", createInvoicePdfAction);

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

function openNavView(view) {
  state.currentView = view;
  if (view === "customers") {
    state.filters.customerSearch = "";
    state.filters.customerStatus = "";
    state.filters.customerCategory = "";
    state.filters.customerCity = "";
    state.filters.customerCampaignId = "";
    clearCustomerSelection();
  }
  render();
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
  hydrateInvoiceDefaults();
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
    const activeView = state.currentView;
    trackViewHistory();
    document.body.dataset.view = activeView;
    document.body.classList.toggle("is-work-view", activeView === "work");
    elements.navButtons.forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === activeView);
    });
    Object.entries(elements.views).forEach(([key, view]) => {
      view.classList.toggle("is-active", key === activeView);
    });

    elements.topbarTitle.textContent = {
      dashboard: "Dashboard",
      work: "Arbetsläge",
      customers: "Kunder",
      campaigns: "Listor / kampanjer",
      ads: "Annonsstudio",
      planning: "Planering",
      reminders: "Påminnelser",
      invoices: "Fakturor",
      export: "Export"
    }[activeView];
    if (elements.topbarBackButton) {
      elements.topbarBackButton.hidden = state.viewHistory.length === 0;
    }
    renderUpdateControl();

    safeRenderSection("selectors", renderSelectors);
    if (activeView !== "ads") {
      deactivateAdStudioDom();
    }
    const activeRenderers = {
      dashboard: renderDashboard,
      work: renderWorkMode,
      customers: renderCustomers,
      campaigns: renderCampaigns,
      ads: renderAdStudio,
      planning: renderPlanning,
      reminders: renderReminders,
      invoices: renderInvoices,
      export: renderExport,
      profile: renderProfile
    };
    const activeRenderer = activeRenderers[activeView];
    if (activeRenderer) {
      safeRenderSection(activeView, activeRenderer);
    }
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
    { element: elements.placesCampaignSelect, label: "Skapa ny lista" },
    { element: elements.csvCampaignSelect, label: "Ingen lista" },
    { element: elements.planningCampaignSelect, label: "Alla öppna leads" }
  ];

  campaignSelects.forEach(({ element, label }) => {
    if (!element) {
      return;
    }
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
  renderInvoiceLeadOptions();
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
  renderDashboardUpcomingReminders();
  renderRecentActivity();
  void loadDashboardWeather();
}

function openDueReminders() {
  state.currentView = "reminders";
  state.reminderViewMode = "due";
  state.selectedReminderDate = "";
  render();
}

async function handleDashboardUpcomingClick(event) {
  const openButton = event.target.closest("[data-dashboard-upcoming-open]");
  if (openButton) {
    selectLead(openButton.dataset.dashboardUpcomingOpen, "work");
    return;
  }

  const doneButton = event.target.closest("[data-dashboard-upcoming-done]");
  if (!doneButton) {
    return;
  }
  await window.desktopApp.completeReminder({ reminderId: doneButton.dataset.dashboardUpcomingDone, completed: true });
  await refreshState();
  render();
}

function renderDashboardUpcomingReminders() {
  if (!elements.dashboardUpcomingPanel || !elements.dashboardUpcomingList) {
    return;
  }
  const reminders = getDashboardUpcomingReminders();
  elements.dashboardUpcomingPanel.hidden = reminders.length === 0;
  if (!reminders.length) {
    elements.dashboardUpcomingList.innerHTML = "";
    return;
  }

  const visibleReminders = reminders.slice(0, DASHBOARD_UPCOMING_LIMIT);
  const remainingCount = reminders.length - visibleReminders.length;
  if (elements.dashboardUpcomingTitle) {
    elements.dashboardUpcomingTitle.textContent = remainingCount > 0
      ? `Kommande p\u00e5minnelser (${reminders.length})`
      : "Kommande p\u00e5minnelser";
  }
  elements.dashboardUpcomingList.innerHTML = visibleReminders.map(({ reminder, lead, dueAt, tone }) => {
    const note = (reminder.note || getLeadLogs(lead.id)[0]?.text || "").slice(0, 92);
    return `
      <div class="dashboard-upcoming-item">
        <span class="dashboard-upcoming-time is-${tone}">${escapeHtml(formatDashboardUpcomingTime(dueAt))}</span>
        <span class="status-badge" data-status="${escapeHtml(lead.status || "Ny")}">${escapeHtml(lead.status || "Ny")}</span>
        <button class="dashboard-upcoming-main" type="button" data-dashboard-upcoming-open="${escapeHtml(lead.id)}">
          <strong>${escapeHtml(lead.companyName || "Ok\u00e4nd kund")}</strong>
          <span>${escapeHtml(note || `${reminder.type || "P\u00e5minnelse"} ${formatReminderLabel(reminder)}`)}</span>
        </button>
        <button class="secondary-button" type="button" data-dashboard-upcoming-open="${escapeHtml(lead.id)}">\u00d6ppna</button>
        <button class="ghost-button" type="button" data-dashboard-upcoming-done="${escapeHtml(reminder.id)}">Klar</button>
      </div>
    `;
  }).join("") + (remainingCount > 0 ? `<button class="dashboard-upcoming-more" type="button" data-dashboard-upcoming-more>${remainingCount}+ fler</button>` : "");
  elements.dashboardUpcomingList.querySelector("[data-dashboard-upcoming-more]")?.addEventListener("click", openDueReminders);
}

function getDashboardUpcomingReminders() {
  const now = new Date();
  const today = formatLocalDate(now);
  const windowEnd = new Date(now.getTime() + DASHBOARD_UPCOMING_WINDOW_MINUTES * 60 * 1000);
  return state.data.reminders
    .map((reminder) => {
      const lead = findLead(reminder.leadId);
      const dueAt = getReminderDueDateTime(reminder);
      return { reminder, lead, dueAt };
    })
    .filter(({ reminder, lead, dueAt }) => {
      if (!lead || lead.isDeleted || reminder.completed || !reminder.dueDate || !dueAt) {
        return false;
      }
      if (reminder.dueDate !== today) {
        return false;
      }
      return dueAt <= windowEnd;
    })
    .sort((left, right) => left.dueAt - right.dueAt)
    .map((item) => ({
      ...item,
      tone: getDashboardUpcomingTone(item.dueAt, now)
    }));
}

function getReminderDueDateTime(reminder) {
  if (!reminder?.dueDate) {
    return null;
  }
  const time = /^\d{2}:\d{2}$/.test(reminder.dueTime || "") ? reminder.dueTime : "23:59";
  const date = new Date(`${reminder.dueDate}T${time}:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getDashboardUpcomingTone(dueAt, now = new Date()) {
  const minutes = Math.ceil((dueAt.getTime() - now.getTime()) / 60000);
  if (minutes < 0) {
    return "overdue";
  }
  if (minutes <= 5) {
    return "now";
  }
  return "soon";
}

function formatDashboardUpcomingTime(dueAt, now = new Date()) {
  const minutes = Math.ceil((dueAt.getTime() - now.getTime()) / 60000);
  if (minutes < 0) {
    return "F\u00d6RSENAD";
  }
  if (minutes <= 1) {
    return "NU";
  }
  if (minutes <= DASHBOARD_UPCOMING_WINDOW_MINUTES) {
    return `OM ${minutes} MIN`;
  }
  return `KL ${String(dueAt.getHours()).padStart(2, "0")}:${String(dueAt.getMinutes()).padStart(2, "0")}`;
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

function renderInvoices() {
  renderInvoiceLines();
  renderInvoiceSummary();
}

function renderInvoiceLeadOptions() {
  if (!elements.invoiceLeadSelect) {
    return;
  }
  const currentValue = elements.invoiceLeadSelect.value;
  elements.invoiceLeadSelect.innerHTML = `<option value="">Välj kund</option>`;
  state.data.leads
    .filter((lead) => !lead.isDeleted)
    .sort((left, right) => (left.companyName || "").localeCompare(right.companyName || "", "sv"))
    .forEach((lead) => {
      const option = document.createElement("option");
      option.value = lead.id;
      option.textContent = [lead.companyName, lead.targetMarketCity || lead.normalizedCity || lead.city].filter(Boolean).join(" - ");
      elements.invoiceLeadSelect.appendChild(option);
    });
  if ([...elements.invoiceLeadSelect.options].some((option) => option.value === currentValue)) {
    elements.invoiceLeadSelect.value = currentValue;
  }
}

function hydrateInvoiceDefaults() {
  if (!elements.invoiceNumberInput) {
    return;
  }
  if (!elements.invoiceNumberInput.value) {
    elements.invoiceNumberInput.value = String(Date.now()).slice(-6);
  }
  if (!elements.invoiceOrderDateInput.value) {
    elements.invoiceOrderDateInput.value = formatLocalDate(new Date());
  }
  if (!elements.invoiceDueDateInput.value) {
    elements.invoiceDueDateInput.value = formatLocalDate(daysFromNow(60));
  }
  if (!elements.invoiceReferenceNameInput.value) {
    elements.invoiceReferenceNameInput.value = "Marvin Hanna";
  }
  if (!elements.invoiceReferencePhoneInput.value) {
    elements.invoiceReferencePhoneInput.value = "010-146-33 70";
  }
  if (!elements.invoiceReferenceEmailInput.value) {
    elements.invoiceReferenceEmailInput.value = "marvin@nordmediapartner.se";
  }
  if (!elements.invoiceVatRateInput.value) {
    elements.invoiceVatRateInput.value = "25";
  }
  if (!elements.invoiceBankNameInput.value) {
    elements.invoiceBankNameInput.value = "Swedbank";
  }
  if (!elements.invoiceBankgiroInput.value) {
    elements.invoiceBankgiroInput.value = "5821-0170";
  }
  if (!elements.invoiceAccountNumberInput.value) {
    elements.invoiceAccountNumberInput.value = "8270-1 4 865 317 4";
  }
  if (!elements.invoiceAccountOwnerInput.value) {
    elements.invoiceAccountOwnerInput.value = "Nord Mediapartner AB";
  }
}

function hydrateInvoiceCustomerFromLead(leadId) {
  const lead = findLead(leadId);
  if (!lead) {
    return;
  }
  elements.invoiceCustomerNameInput.value = lead.companyName || "";
  elements.invoiceCustomerAddressInput.value = lead.address || "";
  elements.invoiceCustomerReferenceInput.value = lead.contactName || "";
  elements.invoiceCustomerReferencePhoneInput.value = lead.phone || "";
  elements.invoiceFeedback.textContent = "";
}

function createDefaultInvoiceLine() {
  return {
    description: "Exponering Skärmar",
    name: "Sporthuset",
    period: `${formatLocalDate(new Date())} - ${formatLocalDate(daysFromNow(365))}`,
    quantity: "10 sekunder",
    amount: "3000"
  };
}

function handleInvoiceLineInput(event) {
  const field = event.target?.dataset?.invoiceField;
  const index = Number(event.target?.dataset?.invoiceIndex);
  if (!field || !Number.isInteger(index) || !state.invoiceLines[index]) {
    return;
  }
  state.invoiceLines[index][field] = event.target.value;
  renderInvoiceSummary();
}

function handleInvoiceLineClick(event) {
  const removeButton = event.target.closest("[data-remove-invoice-line]");
  if (!removeButton) {
    return;
  }
  const index = Number(removeButton.dataset.removeInvoiceLine);
  if (!Number.isInteger(index) || state.invoiceLines.length <= 1) {
    return;
  }
  state.invoiceLines.splice(index, 1);
  renderInvoiceLines();
  renderInvoiceSummary();
}

function renderInvoiceLines() {
  if (!elements.invoiceLinesList) {
    return;
  }
  elements.invoiceLinesList.innerHTML = "";
  state.invoiceLines.forEach((line, index) => {
    const row = document.createElement("div");
    row.className = "invoice-line-row";
    row.innerHTML = `
      <label class="field">
        <span>Beskrivning</span>
        <input class="input" type="text" data-invoice-index="${index}" data-invoice-field="description" value="${escapeHtml(line.description)}" />
      </label>
      <label class="field">
        <span>Benämning</span>
        <input class="input" type="text" data-invoice-index="${index}" data-invoice-field="name" value="${escapeHtml(line.name)}" />
      </label>
      <label class="field">
        <span>Period</span>
        <input class="input" type="text" data-invoice-index="${index}" data-invoice-field="period" value="${escapeHtml(line.period)}" />
      </label>
      <label class="field">
        <span>Längd</span>
        <input class="input" type="text" data-invoice-index="${index}" data-invoice-field="quantity" value="${escapeHtml(line.quantity)}" />
      </label>
      <label class="field">
        <span>Belopp</span>
        <input class="input" type="number" min="0" step="1" data-invoice-index="${index}" data-invoice-field="amount" value="${escapeHtml(line.amount)}" />
      </label>
      <button class="ghost-button invoice-remove-line" type="button" data-remove-invoice-line="${index}" ${state.invoiceLines.length <= 1 ? "disabled" : ""}>Ta bort</button>
    `;
    elements.invoiceLinesList.appendChild(row);
  });
}

function getInvoiceTotals() {
  const subtotal = state.invoiceLines.reduce((sum, line) => sum + parseInvoiceAmount(line.amount), 0);
  const vatRate = Math.max(0, Number(elements.invoiceVatRateInput?.value) || 0);
  const vat = subtotal * (vatRate / 100);
  return {
    subtotal,
    vatRate,
    vat,
    total: subtotal + vat
  };
}

function parseInvoiceAmount(value) {
  const amount = Number(String(value || "").replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(amount) ? amount : 0;
}

function formatSek(value) {
  return new Intl.NumberFormat("sv-SE", {
    style: "currency",
    currency: "SEK",
    minimumFractionDigits: 2
  }).format(Number(value) || 0);
}

function renderInvoiceSummary() {
  if (!elements.invoiceSummary) {
    return;
  }
  const totals = getInvoiceTotals();
  elements.invoiceSummary.innerHTML = `
    <div><span>Belopp exkl. moms</span><strong>${formatSek(totals.subtotal)}</strong></div>
    <div><span>Moms ${totals.vatRate}%</span><strong>${formatSek(totals.vat)}</strong></div>
    <div class="invoice-summary-total"><span>Totalt</span><strong>${formatSek(totals.total)}</strong></div>
  `;
}

function collectInvoicePayload() {
  return {
    invoiceNumber: elements.invoiceNumberInput.value.trim(),
    customerName: elements.invoiceCustomerNameInput.value.trim(),
    customerOrgNumber: elements.invoiceCustomerOrgInput.value.trim(),
    customerAddress: elements.invoiceCustomerAddressInput.value.trim(),
    customerEmail: elements.invoiceCustomerEmailInput.value.trim(),
    customerReference: elements.invoiceCustomerReferenceInput.value.trim(),
    customerReferencePhone: elements.invoiceCustomerReferencePhoneInput.value.trim(),
    orderDate: elements.invoiceOrderDateInput.value,
    dueDate: elements.invoiceDueDateInput.value,
    referenceName: elements.invoiceReferenceNameInput.value.trim(),
    referencePhone: elements.invoiceReferencePhoneInput.value.trim(),
    referenceEmail: elements.invoiceReferenceEmailInput.value.trim(),
    vatRate: Number(elements.invoiceVatRateInput.value) || 0,
    lines: state.invoiceLines.map((line) => ({ ...line })),
    bankName: elements.invoiceBankNameInput.value.trim(),
    bankgiro: elements.invoiceBankgiroInput.value.trim(),
    accountNumber: elements.invoiceAccountNumberInput.value.trim(),
    accountOwner: elements.invoiceAccountOwnerInput.value.trim(),
    companyOrgNumber: "559365-4709",
    companyVatNumber: "SE559365470901",
    companyAddress: "Solbackavägen 9F, 632 22, Eskilstuna"
  };
}

async function createInvoicePdfAction() {
  const payload = collectInvoicePayload();
  if (!payload.invoiceNumber || !payload.customerName || !payload.lines.some((line) => parseInvoiceAmount(line.amount) > 0)) {
    elements.invoiceFeedback.textContent = "Fyll i fakturanummer, kundnamn och minst en rad med belopp.";
    return;
  }

  elements.invoiceFeedback.textContent = "Skapar PDF...";
  elements.createInvoicePdfButton.disabled = true;
  try {
    const result = await window.desktopApp.createInvoicePdf(payload);
    elements.invoiceFeedback.textContent = result?.canceled ? "PDF-skapande avbrutet." : `PDF skapad: ${result.filePath}`;
  } catch (error) {
    elements.invoiceFeedback.textContent = error.message || "Kunde inte skapa PDF.";
  } finally {
    elements.createInvoicePdfButton.disabled = false;
  }
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

function createDefaultAdStudioFields() {
  return {
    brand: "",
    headline: "",
    subheadline: "",
    body: "",
    cta: "",
    phone: "",
    email: "",
    website: "",
    instructions: "",
    researchUrls: "",
    creativeFeedback: "",
    accent: "#f97316"
  };
}

function renderAdStudio() {
  if (state.currentView !== "ads" || !elements.adsPreview) {
    return;
  }
  markAdStudioDomActive();
  renderAdStudioCustomerOptions();
  syncAdStudioInputs();
  renderAdStudioStatus();
  renderAdStudioAssets();
  renderAdStudioResearch();
  renderAdStudioBrief();
  renderAdStudioBriefActions();
  renderAdStudioConcepts();
  renderAdPreview();
  renderAdStudioFeedbackState();
  renderAdStudioGenerationProgress();
  renderAdStudioBusyState();
}

function deactivateAdStudioDom() {
  if (!elements.adsPreview || elements.adsPreview.dataset.unloaded === "1") {
    return;
  }
  elements.adsPreview.innerHTML = "";
  elements.adsPreview.className = "ad-preview-v2";
  elements.adsPreview.dataset.finalAssetId = "";
  elements.adsPreview.dataset.unloaded = "1";
  if (elements.adsAssetGrid) {
    elements.adsAssetGrid.innerHTML = "";
  }
  if (elements.adsVariantList) {
    elements.adsVariantList.innerHTML = "";
  }
  releaseAdStudioFullImageData();
}

function markAdStudioDomActive() {
  if (elements.adsPreview) {
    elements.adsPreview.dataset.unloaded = "0";
  }
}

function renderAdStudioCustomerOptions() {
  if (!elements.adsCustomerSelect) {
    return;
  }
  const selectedValue = state.adStudio.selectedLeadId || "";
  const options = [
    `<option value="">Frist\u00e5ende annons</option>`,
    ...getAdStudioLeads().map((lead) => {
      const label = [lead.companyName || "Ok\u00e4nd kund", getLeadCityLabel(lead)].filter(Boolean).join(" - ");
      return `<option value="${escapeHtml(lead.id)}">${escapeHtml(label)}</option>`;
    })
  ];
  elements.adsCustomerSelect.innerHTML = options.join("");
  elements.adsCustomerSelect.value = selectedValue;
}

function syncAdStudioInputs() {
  const fields = state.adStudio.fields;
  syncAdStudioInput(elements.adsCustomerSelect, state.adStudio.selectedLeadId || "");
  syncAdStudioInput(elements.adsOpenAiKeyInput, state.data.settings.openaiApiKey || "");
  syncAdStudioInput(elements.adsBrandInput, fields.brand);
  syncAdStudioInput(elements.adsHeadlineInput, fields.headline);
  syncAdStudioInput(elements.adsSubheadlineInput, fields.subheadline);
  syncAdStudioInput(elements.adsBodyInput, fields.body);
  syncAdStudioInput(elements.adsCtaInput, fields.cta);
  syncAdStudioInput(elements.adsPhoneInput, fields.phone);
  syncAdStudioInput(elements.adsEmailInput, fields.email);
  syncAdStudioInput(elements.adsWebsiteInput, fields.website);
  syncAdStudioInput(elements.adsInstructionsInput, fields.instructions);
  syncAdStudioInput(elements.adsResearchInput, fields.researchUrls);
  syncAdStudioInput(elements.adsCreativeFeedbackInput, fields.creativeFeedback);
  syncAdStudioInput(elements.adsAccentInput, fields.accent || "#f97316");
}

function syncAdStudioInput(element, value) {
  if (!element || document.activeElement === element) {
    return;
  }
  const nextValue = String(value || "");
  if (element.value !== nextValue) {
    element.value = nextValue;
  }
}

function renderAdStudioStatus() {
  if (!elements.adsQualityBadge) {
    return;
  }
  const fields = state.adStudio.fields;
  const score = [
    Boolean(fields.brand.trim()),
    Boolean(fields.instructions.trim() || fields.creativeFeedback.trim() || state.adStudio.research),
    state.adStudio.assets.length > 0,
    Boolean(state.adStudio.brief),
    state.adStudio.concepts.length > 0,
    Boolean((fields.phone || fields.email || fields.website).trim())
  ].filter(Boolean).length;
  elements.adsQualityBadge.textContent = score >= 5 ? "Klar brief" : score >= 3 ? "Material redo" : "V\u00e4ntar";

  elements.views.ads?.querySelectorAll(".annonsstudio-status-card").forEach((card, index) => {
    const hasCompleteAd = state.adStudio.concepts.some((concept) => getAdStudioFinalAsset(concept));
    const activeIndex = hasCompleteAd ? 2 : state.adStudio.brief ? 1 : 0;
    card.classList.toggle("is-active", index <= activeIndex);
  });
}

function renderAdPreview() {
  if (!elements.adsPreview) {
    return;
  }
  const concept = getActiveAdStudioConcept();
  const finalAsset = getAdStudioFinalAsset(concept);
  if (finalAsset && !finalAsset.dataUrl && finalAsset.assetStorageId) {
    elements.adsPreview.dataset.finalAssetId = "";
    elements.adsPreview.className = "ad-preview-empty";
    elements.adsPreview.innerHTML = `
      <div>
        <strong>Laddar komplett annonsbild...</strong>
        <span>Originalbilden h&auml;mtas fr&aring;n lokal asset-cache.</span>
      </div>
    `;
    void resolveAdStudioAssetDataUrl(finalAsset).then(() => {
      if (state.currentView === "ads") {
        renderAdPreview();
      }
    }).catch(() => {});
    return;
  }
  if (finalAsset?.dataUrl) {
    if (elements.adsPreview.dataset.finalAssetId === finalAsset.id && elements.adsPreview.className === "ad-preview-final") {
      if (elements.adsActiveConceptTitle) {
        elements.adsActiveConceptTitle.textContent = `${concept?.title || "Komplett annons"} · komplett annons`;
      }
      return;
    }
    elements.adsPreview.dataset.finalAssetId = finalAsset.id;
    elements.adsPreview.className = "ad-preview-final";
    elements.adsPreview.innerHTML = `<img src="${escapeHtml(finalAsset.dataUrl)}" decoding="async" alt="" />`;
    if (elements.adsActiveConceptTitle) {
      elements.adsActiveConceptTitle.textContent = `${concept?.title || "Komplett annons"} · komplett annons`;
    }
    return;
  }
  elements.adsPreview.dataset.finalAssetId = "";
  elements.adsPreview.className = "ad-preview-empty";
  elements.adsPreview.innerHTML = `
    <div>
      <strong>Ingen komplett annonsbild genererad &auml;n.</strong>
      <span>V&auml;lj en AI-riktning och klicka p&aring; Generera komplett annonsbild. D&aring; skapar GPT Image 2 hela annonsen sj&auml;lv.</span>
    </div>
  `;
  if (elements.adsActiveConceptTitle) {
    elements.adsActiveConceptTitle.textContent = concept?.title ? `${concept.title} · riktning vald` : "V&auml;lj riktning och generera";
  }
}

function renderAdStudioLayer(layer, fields, concept) {
  const commonStyle = [
    `left:${layer.x}%`,
    `top:${layer.y}%`,
    `width:${layer.w}%`,
    `height:${layer.h}%`,
    `opacity:${layer.opacity ?? 1}`
  ].join(";");
  if (layer.type === "shape") {
    const radius = layer.shape === "circle" ? "999px" : `${layer.radius || 0}px`;
    return `<div class="ad-layer ad-layer-shape" style="${commonStyle};background:${escapeHtml(layer.color)};border-radius:${radius};"></div>`;
  }
  if (layer.type === "line") {
    return `<div class="ad-layer ad-layer-line" style="${commonStyle};background:${escapeHtml(layer.color)};border-radius:${layer.radius || 999}px;"></div>`;
  }
  const text = getAdStudioLayerText(layer, fields, concept);
  const fontSize = Math.max(0.7, (Number(layer.fontSize) || 40) / 19.2);
  const transformed = layer.transform === "uppercase" ? text.toUpperCase() : text;
  const alignItems = layer.align === "center" ? "center" : layer.align === "right" ? "flex-end" : "flex-start";
  const textAlign = layer.align || "left";
  return `
    <div class="ad-layer ad-layer-text" style="${commonStyle};color:${escapeHtml(layer.color)};font-size:${fontSize}cqw;font-weight:${Number(layer.weight) || 800};line-height:${Number(layer.lineHeight) || 1.12};text-align:${textAlign};align-items:${alignItems};">
      ${escapeHtml(transformed).replaceAll("\n", "<br />")}
    </div>
  `;
}

function renderAdStudioConcepts() {
  if (!elements.adsVariantList) {
    return;
  }
  const concepts = getAdStudioDisplayConcepts();
  if (!concepts.length) {
    elements.adsVariantList.innerHTML = `<div class="empty-state compact-empty-state">Tolka materialet f\u00f6r att skapa AI-riktningar.</div>`;
    return;
  }
  elements.adsVariantList.innerHTML = concepts
    .map((variant) => {
      const isActive = variant.id === state.adStudio.activeConceptId;
      const asset = getAdStudioFinalAsset(variant) || getAdStudioAssetForConcept(variant);
      return `
        <button class="annonsstudio-variant-v2${isActive ? " is-active" : ""}" type="button" data-ad-variant="${escapeHtml(variant.id)}">
          <span class="annonsstudio-variant-v2__thumb">${asset ? `<img src="${escapeHtml(getAdStudioAssetThumb(asset))}" loading="lazy" decoding="async" alt="" />` : ""}</span>
          <strong>${escapeHtml(variant.title)}</strong>
          <span>${escapeHtml(variant.rationale || "Originalriktning baserad p\u00e5 kundmaterialet.")}</span>
        </button>
      `;
    })
    .join("");
}

function renderAdStudioAssets() {
  if (!elements.adsAssetGrid) {
    return;
  }
  if (!state.adStudio.assets.length) {
    elements.adsAssetGrid.innerHTML = `<div class="empty-state compact-empty-state">Inga kundbilder inlagda &auml;n.</div>`;
    return;
  }
  elements.adsAssetGrid.innerHTML = state.adStudio.assets
    .map((asset, index) => `
      <button class="annonsstudio-asset${asset.selected ? " is-selected" : ""}" type="button" data-ad-asset="${escapeHtml(asset.id)}">
        <img src="${escapeHtml(getAdStudioAssetThumb(asset))}" loading="lazy" decoding="async" alt="" />
        <span>${escapeHtml(asset.name || `Bild ${index + 1}`)}</span>
      </button>
    `)
    .join("");
}

function getAdStudioAssetThumb(asset) {
  return asset?.thumbDataUrl || asset?.dataUrl || "";
}

function releaseAdStudioFullImageData() {
  adStudioAssetDataUrlCache.clear();
  state.adStudio.assets.forEach((asset) => {
    if (asset.assetStorageId && asset.dataUrl) {
      asset.dataUrl = "";
    }
  });
}

function renderAdStudioResearch() {
  if (!elements.adsResearchPanel) {
    return;
  }
  const research = state.adStudio.research;
  if (!research) {
    elements.adsResearchPanel.innerHTML = `<span>Ingen webbanalys h&auml;mtad &auml;n.</span>`;
    return;
  }
  const pages = Array.isArray(research.pages) ? research.pages : [];
  const images = Array.isArray(research.images) ? research.images : [];
  elements.adsResearchPanel.innerHTML = `
    <div class="annonsstudio-research-summary">
      <strong>${escapeHtml(pages.filter((page) => !page.error).length)} k&auml;llor l&auml;sta</strong>
      <span>${escapeHtml(images.length)} webb-bilder hittade som AI kan v&auml;lja mellan.</span>
    </div>
    ${pages.length ? `
      <ul>
        ${pages.slice(0, 4).map((page) => `
          <li>
            <strong>${escapeHtml(page.title || page.url)}</strong>
            <span>${escapeHtml(page.error || page.description || page.url)}</span>
          </li>
        `).join("")}
      </ul>
    ` : ""}
  `;
}

function renderAdStudioBrief() {
  if (!elements.adsBriefPanel) {
    return;
  }
  const brief = state.adStudio.brief;
  if (!brief) {
    elements.adsBriefPanel.innerHTML = `
      <div class="annonsstudio-brief-empty">
        <strong>Ingen AI-brief &auml;n.</strong>
        <span>Klistra in kundens mejl och klicka p&aring; Tolka material med AI.</span>
      </div>
    `;
    return;
  }
  const items = [
    ["M\u00e5lgrupp", brief.audience],
    ["Budskap", brief.offer || brief.objective],
    ["Ton", brief.tone],
    ["Format", brief.format],
    ["Kontakt", [brief.phone, brief.email, brief.website].filter(Boolean).join(" / ")]
  ];
  elements.adsBriefPanel.innerHTML = `
    ${items.map(([label, value]) => `
      <div class="annonsstudio-brief-row">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(value || "Saknas")}</strong>
      </div>
    `).join("")}
    ${brief.imageRead?.length ? `
      <div class="annonsstudio-brief-row">
        <span>Bildtolkning</span>
        <ul>${brief.imageRead.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </div>
    ` : ""}
  `;
}

function renderAdStudioBriefActions() {
  const hasBrief = Boolean(state.adStudio.brief);
  [elements.adsCopyBriefButton, elements.adsExportBriefButton].forEach((button) => {
    if (button) {
      button.disabled = !hasBrief;
    }
  });
}

async function copyAdStudioBrief() {
  const text = buildAdStudioBriefExportText();
  if (!text) {
    if (elements.adsFeedback) {
      elements.adsFeedback.textContent = "Tolka materialet f\u00f6rst, s\u00e5 finns en AI-tolkning att kopiera.";
    }
    return;
  }
  try {
    await writeAdStudioClipboardText(text);
    if (elements.adsFeedback) {
      elements.adsFeedback.textContent = "AI-tolkningen kopierades till urklipp.";
    }
  } catch (error) {
    if (elements.adsFeedback) {
      elements.adsFeedback.textContent = error.message || "Kunde inte kopiera AI-tolkningen.";
    }
  }
}

function exportAdStudioBrief() {
  const text = buildAdStudioBriefExportText();
  if (!text) {
    if (elements.adsFeedback) {
      elements.adsFeedback.textContent = "Tolka materialet f\u00f6rst, s\u00e5 finns en AI-tolkning att exportera.";
    }
    return;
  }
  const brand = sanitizeAdStudioFilename(state.adStudio.fields.brand || state.adStudio.brief?.customerName || "ai-tolkning");
  downloadText(text, `${brand}-ai-tolkning.md`, "text/markdown;charset=utf-8;");
  if (elements.adsFeedback) {
    elements.adsFeedback.textContent = "AI-tolkningen exporterades som Markdown.";
  }
}

function buildAdStudioBriefExportText() {
  const brief = state.adStudio.brief;
  if (!brief) {
    return "";
  }
  const fields = getAdStudioPreviewFields(getActiveAdStudioConcept());
  const concepts = getAdStudioDisplayConcepts();
  const activeConcept = getActiveAdStudioConcept();
  const lines = [
    `# AI-tolkning - ${fields.brand}`,
    "",
    "## Kund",
    `- F\u00f6retag: ${fields.brand}`,
    fields.phone ? `- Telefon: ${fields.phone}` : "",
    fields.email ? `- E-post: ${fields.email}` : "",
    fields.website ? `- Webb: ${fields.website}` : "",
    "",
    "## Brief",
    `- M\u00e5l: ${brief.objective || ""}`,
    `- M\u00e5lgrupp: ${brief.audience || ""}`,
    `- Budskap: ${brief.offer || ""}`,
    `- Ton: ${brief.tone || ""}`,
    `- Format: ${brief.format || "16:9 landskap"}`,
    brief.mustHave?.length ? `- M\u00e5ste vara med: ${brief.mustHave.join(", ")}` : "",
    brief.avoid?.length ? `- Undvik: ${brief.avoid.join(", ")}` : "",
    "",
    brief.imageRead?.length ? "## Bildtolkning" : "",
    ...(brief.imageRead || []).map((item) => `- ${item}`),
    "",
    "## AI-riktningar",
    ...concepts.flatMap((concept, index) => [
      "",
      `### ${index + 1}. ${concept.title}`,
      concept.rationale ? `- Varf\u00f6r: ${concept.rationale}` : "",
      `- Rubrik: ${concept.headline || ""}`,
      concept.subheadline ? `- Underrubrik: ${concept.subheadline}` : "",
      concept.cta ? `- CTA: ${concept.cta}` : "",
      concept.bullets?.length ? `- St\u00f6dpunkter: ${concept.bullets.join(" | ")}` : ""
    ]),
    "",
    activeConcept ? "## Aktiv riktning" : "",
    activeConcept ? `- ${activeConcept.title}` : "",
    "",
    state.adStudio.appliedCreativeFeedback ? "## Verkst\u00e4lld feedback" : "",
    state.adStudio.appliedCreativeFeedback || "",
    "",
    state.adStudio.research?.summary ? "## Webbunderslag" : "",
    state.adStudio.research?.summary || "",
    "",
    state.adStudio.fields.instructions ? "## Kundmejl / instruktioner" : "",
    state.adStudio.fields.instructions || ""
  ].filter((line, index, array) => line || array[index - 1]);
  return lines.join("\n").trim();
}

async function writeAdStudioClipboardText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  const ok = document.execCommand("copy");
  textarea.remove();
  if (!ok) {
    throw new Error("Urklipp kunde inte anv\u00e4ndas.");
  }
}

function renderAdStudioFeedbackState() {
  if (!elements.adsFeedbackStatus) {
    return;
  }
  const current = String(state.adStudio.fields.creativeFeedback || "").trim();
  const applied = String(state.adStudio.appliedCreativeFeedback || "").trim();
  if (!current) {
    elements.adsFeedbackStatus.textContent = "Ingen feedback verkst\u00e4lld.";
    elements.adsFeedbackStatus.dataset.state = "empty";
  } else if (current === applied) {
    elements.adsFeedbackStatus.textContent = "Feedback verkst\u00e4lld. N\u00e4sta bild anv\u00e4nder den.";
    elements.adsFeedbackStatus.dataset.state = "applied";
  } else {
    elements.adsFeedbackStatus.textContent = "Ny feedback ej verkst\u00e4lld \u00e4n.";
    elements.adsFeedbackStatus.dataset.state = "pending";
  }
  if (elements.adsApplyFeedbackButton) {
    elements.adsApplyFeedbackButton.disabled = state.adStudio.isBusy || !current || current === applied;
  }
}

function startAdStudioImageProgress(isRevision = false) {
  stopAdStudioImageProgressTimer();
  state.adStudio.imageProgress = {
    active: true,
    value: 7,
    label: isRevision ? "Verkst\u00e4ller feedback och f\u00f6rbereder ny version..." : "F\u00f6rbereder material till GPT Image 2..."
  };
  renderAdStudioGenerationProgress();
  adStudioImageProgressTimer = setInterval(() => {
    const progress = state.adStudio.imageProgress;
    if (!progress.active) {
      stopAdStudioImageProgressTimer();
      return;
    }
    const nextValue = Math.min(92, progress.value + (progress.value < 35 ? 8 : progress.value < 70 ? 5 : 2));
    state.adStudio.imageProgress = {
      active: true,
      value: nextValue,
      label: getAdStudioProgressLabel(nextValue)
    };
    renderAdStudioGenerationProgress();
  }, 1200);
}

function finishAdStudioImageProgress(label = "Komplett annonsbild skapad.") {
  stopAdStudioImageProgressTimer();
  state.adStudio.imageProgress = {
    active: true,
    value: 100,
    label
  };
  renderAdStudioGenerationProgress();
  setTimeout(() => {
    state.adStudio.imageProgress = { active: false, value: 0, label: "" };
    renderAdStudioGenerationProgress();
  }, 1400);
}

function cancelAdStudioImageProgress() {
  stopAdStudioImageProgressTimer();
  state.adStudio.imageProgress = { active: false, value: 0, label: "" };
  renderAdStudioGenerationProgress();
}

function stopAdStudioImageProgressTimer() {
  if (adStudioImageProgressTimer) {
    clearInterval(adStudioImageProgressTimer);
    adStudioImageProgressTimer = null;
  }
}

function getAdStudioProgressLabel(value) {
  if (value < 28) {
    return "Paketerar brief, bilder och feedback...";
  }
  if (value < 55) {
    return "GPT Image 2 komponerar annonsen...";
  }
  if (value < 78) {
    return "Finputsar layout, text och visuellt fokus...";
  }
  return "Tar emot och f\u00f6rbereder annonsbilden...";
}

function renderAdStudioGenerationProgress() {
  if (!elements.adsGenerationProgress) {
    return;
  }
  const progress = state.adStudio.imageProgress || { active: false, value: 0, label: "" };
  elements.adsGenerationProgress.hidden = !progress.active;
  if (elements.adsGenerationProgressLabel) {
    elements.adsGenerationProgressLabel.textContent = progress.label || "Genererar annonsbild...";
  }
  if (elements.adsGenerationProgressValue) {
    elements.adsGenerationProgressValue.textContent = `${Math.round(progress.value || 0)}%`;
  }
  if (elements.adsGenerationProgressBar) {
    elements.adsGenerationProgressBar.style.width = `${Math.max(0, Math.min(100, progress.value || 0))}%`;
  }
}

function handleAdStudioCustomerChange(event) {
  const leadId = event.target.value || "";
  state.adStudio.selectedLeadId = leadId;
  const lead = findLead(leadId);
  if (!lead) {
    state.adStudio.fields = createDefaultAdStudioFields();
    state.adStudio.brief = null;
    state.adStudio.concepts = [];
    state.adStudio.research = null;
    state.adStudio.appliedCreativeFeedback = "";
    state.adStudio.activeConceptId = "";
    if (elements.adsFeedback) {
      elements.adsFeedback.textContent = "Frist\u00e5ende annons vald.";
    }
    renderAdStudio();
    return;
  }

  state.adStudio.fields = {
    ...createDefaultAdStudioFields(),
    brand: lead.companyName || "",
    phone: lead.phone || "",
    email: lead.email || "",
    website: normalizeAdStudioWebsite(lead.website || ""),
    researchUrls: normalizeAdStudioWebsite(lead.website || ""),
    instructions: [getLeadBranchLabel(lead), getLeadCityLabel(lead)].filter(Boolean).join(". ")
  };
  state.adStudio.brief = null;
  state.adStudio.concepts = [];
  state.adStudio.research = null;
  state.adStudio.appliedCreativeFeedback = "";
  state.adStudio.activeConceptId = "";
  if (elements.adsFeedback) {
    elements.adsFeedback.textContent = "Kunddata h\u00e4mtad. Klistra in mejlet och ladda upp bilderna s\u00e5 tolkar AI:n resten.";
  }
  renderAdStudio();
}

function updateAdStudioField(field, value) {
  state.adStudio.fields[field] = value;
  if (["headline", "subheadline", "body", "cta", "accent"].includes(field)) {
    updateActiveAdStudioConceptFromFields();
  }
  renderAdStudioStatus();
  if (field === "creativeFeedback") {
    renderAdStudioFeedbackState();
  }
  renderAdPreview();
}

function applyAdStudioFeedback(options = {}) {
  collectAdStudioFieldsFromInputs();
  const feedback = String(state.adStudio.fields.creativeFeedback || "").trim();
  state.adStudio.appliedCreativeFeedback = feedback;
  renderAdStudioFeedbackState();
  if (!options.silent && elements.adsFeedback) {
    elements.adsFeedback.textContent = feedback
      ? "Feedback verkst\u00e4lld. N\u00e4sta kompletta annonsbild anv\u00e4nder den."
      : "Feedback rensad.";
  }
  return feedback;
}

async function handleAdStudioFilesInput(event) {
  const files = [...(event.target.files || [])].filter((file) => file.type.startsWith("image/"));
  const shouldSelectFirstAsset = state.adStudio.assets.length === 0;
  const assets = await Promise.all(files.map(async (file, index) => {
    const dataUrl = await readFileAsDataUrl(file);
    const saved = await saveAdStudioAssetDataUrl(dataUrl, file.name, "customer");
    return {
      id: createAdStudioId("asset"),
      name: file.name,
      thumbDataUrl: await createAdStudioThumbnail(dataUrl, 320),
      assetStorageId: saved.assetStorageId || "",
      dataUrl: saved.assetStorageId ? "" : dataUrl,
      selected: shouldSelectFirstAsset && index === 0,
      type: "customer"
    };
  }));
  state.adStudio.assets.push(...assets);
  if (elements.adsFeedback) {
    elements.adsFeedback.textContent = `${assets.length} bild${assets.length === 1 ? "" : "er"} inlagda. AI:n kan nu tolka dem tillsammans med instruktionerna.`;
  }
  event.target.value = "";
  renderAdStudio();
}

function handleAdStudioAssetClick(event) {
  const button = event.target.closest("[data-ad-asset]");
  if (!button) {
    return;
  }
  state.adStudio.assets.forEach((asset) => {
    asset.selected = asset.id === button.dataset.adAsset;
  });
  const concept = getActiveAdStudioConcept();
  if (concept) {
    concept.imageIndex = state.adStudio.assets.findIndex((asset) => asset.selected);
  }
  renderAdStudio();
}

async function researchAdStudioCustomer(options = {}) {
  collectAdStudioFieldsFromInputs();
  const lead = findLead(state.adStudio.selectedLeadId);
  const urls = parseAdStudioResearchUrls(state.adStudio.fields.researchUrls || state.adStudio.fields.website);
  if (!urls.length && !state.adStudio.fields.brand && !lead?.companyName) {
    if (elements.adsFeedback) {
      elements.adsFeedback.textContent = "L\u00e4gg in f\u00f6retagsnamn, hemsida eller publik l\u00e4nk f\u00f6rst.";
    }
    return null;
  }
  state.adStudio.isBusy = true;
  if (!options.quiet && elements.adsFeedback) {
    elements.adsFeedback.textContent = "AI h\u00e4mtar publik f\u00f6retagsprofil, texter och anv\u00e4ndbara webb-bilder...";
  }
  renderAdStudioBusyState();
  try {
    const result = await window.desktopApp.researchAdCustomer({
      brand: state.adStudio.fields.brand || lead?.companyName || "",
      city: lead ? getLeadCityLabel(lead) : "",
      category: lead ? getLeadBranchLabel(lead) : "",
      website: state.adStudio.fields.website,
      researchUrls: state.adStudio.fields.researchUrls,
      urls
    });
    state.adStudio.research = result;
    const shouldSelectFirstResearchAsset = state.adStudio.assets.length === 0;
    const researchAssets = await Promise.all((result.images || []).map(async (image, index) => {
      const saved = await saveAdStudioAssetDataUrl(image.dataUrl, image.name || "webb-bild", "research");
      return {
        id: createAdStudioId("asset"),
        name: image.name || "webb-bild",
        thumbDataUrl: image.thumbDataUrl || await createAdStudioThumbnail(image.dataUrl, 320),
        assetStorageId: saved.assetStorageId || "",
        dataUrl: saved.assetStorageId ? "" : image.dataUrl,
        sourceUrl: image.sourceUrl || "",
        selected: shouldSelectFirstResearchAsset && index === 0,
        type: "research"
      };
    }));
    if (researchAssets.length) {
      state.adStudio.assets.push(...researchAssets);
    }
    if (elements.adsFeedback) {
      elements.adsFeedback.textContent = `Webbunderslag klart: ${result.pages?.filter((page) => !page.error).length || 0} k\u00e4llor och ${researchAssets.length} bilder hittade.`;
    }
    return result;
  } catch (error) {
    if (elements.adsFeedback) {
      elements.adsFeedback.textContent = error.message || "Kunde inte h\u00e4mta webbunderslag.";
    }
    return null;
  } finally {
    state.adStudio.isBusy = false;
    renderAdStudio();
  }
}

function parseAdStudioResearchUrls(value) {
  return String(value || "")
    .split(/[\n,;\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

async function getAdStudioBriefImagePayloads() {
  const assets = state.adStudio.assets.filter((asset) => ["customer", "research"].includes(asset.type)).slice(0, 8);
  const payloads = [];
  for (const asset of assets) {
    const dataUrl = await resolveAdStudioAssetDataUrl(asset, { hydrate: false });
    if (dataUrl) {
      payloads.push({ name: asset.name, dataUrl });
    }
  }
  return payloads;
}

async function generateAdStudioBrief(options = {}) {
  collectAdStudioFieldsFromInputs();
  hydrateAdStudioFieldsFromInstructions();
  const openaiApiKey = elements.adsOpenAiKeyInput?.value.trim() || state.data.settings.openaiApiKey || "";
  if (!openaiApiKey) {
    elements.adsFeedback.textContent = "OpenAI API-nyckel saknas. Klistra in nyckeln i f\u00e4ltet och k\u00f6r igen.";
    return;
  }
  state.adStudio.isBusy = true;
  elements.adsFeedback.textContent = "AI agerar mediateam: tolkar kundmaterial, webbunderslag, bildval och budskap...";
  renderAdStudioBusyState();
  try {
    if (!state.adStudio.research && (state.adStudio.fields.researchUrls || state.adStudio.fields.website) && !options.skipResearch) {
      state.adStudio.isBusy = false;
      await researchAdStudioCustomer({ quiet: true });
      state.adStudio.isBusy = true;
      renderAdStudioBusyState();
    }
    await window.desktopApp.saveSettings({ openaiApiKey });
    state.data.settings.openaiApiKey = openaiApiKey;
    const lead = findLead(state.adStudio.selectedLeadId);
    const result = await window.desktopApp.generateAdBrief({
      openaiApiKey,
      lead,
      brand: state.adStudio.fields.brand,
      phone: state.adStudio.fields.phone,
      email: state.adStudio.fields.email,
      website: state.adStudio.fields.website,
      instructions: state.adStudio.fields.instructions,
      creativeFeedback: state.adStudio.fields.creativeFeedback,
      webResearch: state.adStudio.research,
      images: await getAdStudioBriefImagePayloads()
    });
    state.adStudio.brief = result.brief;
    state.adStudio.concepts = result.concepts.map((concept, index) => ({
      ...concept,
      id: concept.id || createAdStudioId("concept"),
      imageIndex: Number.isInteger(concept.imageIndex) ? Math.max(0, Math.min(concept.imageIndex, state.adStudio.assets.length - 1)) : index % Math.max(state.adStudio.assets.length, 1)
    }));
    state.adStudio.activeConceptId = state.adStudio.concepts[0]?.id || "";
    hydrateAdStudioFieldsFromBrief();
    applyAdStudioConcept(state.adStudio.activeConceptId, { render: false });
    elements.adsFeedback.textContent = options.force ? "AI-riktningar regenererade." : "AI-riktningar klara. V\u00e4lj riktning och generera en komplett annonsbild.";
  } catch (error) {
    elements.adsFeedback.textContent = error.message || "Kunde inte tolka materialet.";
  } finally {
    state.adStudio.isBusy = false;
    renderAdStudio();
  }
}

async function generateAdStudioConcepts() {
  await generateAdStudioBrief({ force: Boolean(state.adStudio.brief) });
}

function handleAdVariantClick(event) {
  const button = event.target.closest("[data-ad-variant]");
  if (!button) {
    return;
  }
  applyAdStudioConcept(button.dataset.adVariant);
}

function applyAdStudioConcept(variantId, options = {}) {
  const variant = getAdStudioDisplayConcepts().find((item) => item.id === variantId);
  if (!variant) {
    return;
  }
  state.adStudio.activeConceptId = variant.id;
  state.adStudio.fields = {
    ...state.adStudio.fields,
    headline: variant.headline,
    subheadline: variant.subheadline,
    cta: variant.cta,
    body: (variant.bullets || []).join("\n"),
    accent: variant.palette?.accent || state.adStudio.fields.accent || "#f97316"
  };
  if (options.render !== false) {
    renderAdStudio();
  }
}

function resetAdStudio() {
  cancelAdStudioImageProgress();
  state.adStudio = {
    selectedLeadId: "",
    activeConceptId: "",
    assets: [],
    brief: null,
    concepts: [],
    research: null,
    appliedCreativeFeedback: "",
    imageProgress: {
      active: false,
      value: 0,
      label: ""
    },
    status: "material",
    fields: createDefaultAdStudioFields(),
    isBusy: false
  };
  if (elements.adsFilesInput) {
    elements.adsFilesInput.value = "";
  }
  if (elements.adsFeedback) {
    elements.adsFeedback.textContent = "Annonsstudion \u00e4r nollst\u00e4lld.";
  }
  renderAdStudio();
}

function collectAdStudioFieldsFromInputs() {
  state.adStudio.fields = {
    brand: getAdStudioInputValue(elements.adsBrandInput, state.adStudio.fields.brand),
    headline: getAdStudioInputValue(elements.adsHeadlineInput, state.adStudio.fields.headline),
    subheadline: getAdStudioInputValue(elements.adsSubheadlineInput, state.adStudio.fields.subheadline),
    body: getAdStudioInputValue(elements.adsBodyInput, state.adStudio.fields.body),
    cta: getAdStudioInputValue(elements.adsCtaInput, state.adStudio.fields.cta),
    phone: getAdStudioInputValue(elements.adsPhoneInput, state.adStudio.fields.phone),
    email: getAdStudioInputValue(elements.adsEmailInput, state.adStudio.fields.email),
    website: normalizeAdStudioWebsite(getAdStudioInputValue(elements.adsWebsiteInput, state.adStudio.fields.website)),
    instructions: getAdStudioInputValue(elements.adsInstructionsInput, state.adStudio.fields.instructions),
    researchUrls: getAdStudioInputValue(elements.adsResearchInput, state.adStudio.fields.researchUrls),
    creativeFeedback: getAdStudioInputValue(elements.adsCreativeFeedbackInput, state.adStudio.fields.creativeFeedback),
    accent: elements.adsAccentInput?.value || state.adStudio.fields.accent || "#f97316"
  };
}

function getAdStudioInputValue(element, fallback) {
  return element ? element.value.trim() : String(fallback || "").trim();
}

function getAdStudioLeads() {
  return [...state.data.leads]
    .filter((lead) => !lead.isDeleted)
    .sort((left, right) => String(left.companyName || "").localeCompare(String(right.companyName || ""), "sv"));
}

function getAdStudioDisplayConcepts() {
  return state.adStudio.concepts.length ? state.adStudio.concepts : [];
}

function getActiveAdStudioConcept() {
  return getAdStudioDisplayConcepts().find((item) => item.id === state.adStudio.activeConceptId) || getAdStudioDisplayConcepts()[0] || null;
}

function getAdStudioPreviewFields(concept = null) {
  const fields = state.adStudio.fields;
  return {
    brand: fields.brand.trim() || state.adStudio.brief?.customerName || "Kundens varum\u00e4rke",
    headline: fields.headline.trim() || concept?.headline || "Tydligt budskap",
    subheadline: fields.subheadline.trim() || concept?.subheadline || "Skapat f\u00f6r lokal synlighet",
    body: fields.body.trim() || (concept?.bullets || []).join("\n"),
    cta: fields.cta.trim() || concept?.cta || "Kontakta oss",
    phone: fields.phone.trim(),
    email: fields.email.trim(),
    website: normalizeAdStudioWebsite(fields.website),
    accent: fields.accent || concept?.palette?.accent || "#f97316"
  };
}

function getAdStudioDesign(concept, fields) {
  if (concept?.design?.layers?.length) {
    return {
      background: {
        imageIndex: Number.isInteger(concept.design.background?.imageIndex) ? concept.design.background.imageIndex : concept.imageIndex || 0,
        color: concept.design.background?.color || concept.palette?.primary || "#0f172a",
        fit: concept.design.background?.fit || "cover",
        focalX: clampAdStudioNumber(concept.design.background?.focalX, 0, 100, 50),
        focalY: clampAdStudioNumber(concept.design.background?.focalY, 0, 100, 50),
        overlayColor: concept.design.background?.overlayColor || "#000000",
        overlayOpacity: clampAdStudioNumber(concept.design.background?.overlayOpacity, 0, 0.9, 0.3)
      },
      layers: concept.design.layers.map((layer) => normalizeClientAdStudioLayer(layer)).filter(Boolean)
    };
  }
  return buildClientFallbackAdStudioDesign(concept, fields);
}

function normalizeClientAdStudioLayer(layer = {}) {
  const type = ["text", "shape", "line"].includes(layer.type) ? layer.type : "";
  if (!type) {
    return null;
  }
  const normalized = {
    type,
    role: String(layer.role || ""),
    x: clampAdStudioNumber(layer.x, 0, 100, 6),
    y: clampAdStudioNumber(layer.y, 0, 100, 8),
    w: clampAdStudioNumber(layer.w, 2, 100, 35),
    h: clampAdStudioNumber(layer.h, 1, 100, 10),
    color: isHexColor(layer.color) ? layer.color : type === "text" ? "#ffffff" : "#000000",
    opacity: clampAdStudioNumber(layer.opacity, 0, 1, 1),
    radius: clampAdStudioNumber(layer.radius, 0, 24, 0)
  };
  if (type === "text") {
    normalized.text = String(layer.text || "");
    normalized.fontSize = clampAdStudioNumber(layer.fontSize, 14, 150, 46);
    normalized.weight = clampAdStudioNumber(layer.weight, 300, 950, 800);
    normalized.align = ["left", "center", "right"].includes(layer.align) ? layer.align : "left";
    normalized.lineHeight = clampAdStudioNumber(layer.lineHeight, 0.9, 1.65, 1.12);
    normalized.transform = ["none", "uppercase"].includes(layer.transform) ? layer.transform : "none";
  }
  if (type === "shape") {
    normalized.shape = layer.shape === "circle" ? "circle" : "rect";
  }
  return normalized;
}

function buildClientFallbackAdStudioDesign(concept, fields) {
  const palette = concept?.palette || { primary: "#0f172a", accent: fields.accent || "#f97316", surface: "#ffffff", text: "#ffffff" };
  const panelX = concept?.imageIndex % 2 === 0 ? 6 : 54;
  return {
    background: {
      imageIndex: Number.isInteger(concept?.imageIndex) ? concept.imageIndex : 0,
      color: palette.primary || "#0f172a",
      fit: "cover",
      focalX: 50,
      focalY: 50,
      overlayColor: "#000000",
      overlayOpacity: 0.22
    },
    layers: [
      { type: "shape", shape: "rect", x: panelX, y: 8, w: 40, h: 78, color: palette.surface || "#ffffff", opacity: 0.9, radius: 2 },
      { type: "line", x: panelX + 4, y: 18, w: 12, h: 0.6, color: palette.accent || fields.accent || "#f97316", opacity: 1, radius: 1 },
      { type: "text", role: "brand", text: "", x: panelX + 4, y: 22, w: 32, h: 8, fontSize: 34, weight: 850, color: palette.primary || "#0f172a", align: "left", lineHeight: 1.05, transform: "none", opacity: 1 },
      { type: "text", role: "headline", text: "", x: panelX + 4, y: 35, w: 32, h: 24, fontSize: 68, weight: 900, color: palette.primary || "#0f172a", align: "left", lineHeight: 1.02, transform: "none", opacity: 1 },
      { type: "text", role: "subheadline", text: "", x: panelX + 4, y: 62, w: 32, h: 11, fontSize: 31, weight: 850, color: palette.accent || fields.accent || "#f97316", align: "left", lineHeight: 1.12, transform: "none", opacity: 1 },
      { type: "text", role: "cta", text: "", x: panelX + 4, y: 80, w: 32, h: 7, fontSize: 28, weight: 900, color: palette.primary || "#0f172a", align: "left", lineHeight: 1.1, transform: "uppercase", opacity: 1 }
    ]
  };
}

function getAdStudioLayerText(layer, fields, concept) {
  if (layer.role === "brand") {
    return fields.brand;
  }
  if (layer.role === "headline") {
    return fields.headline;
  }
  if (layer.role === "subheadline") {
    return fields.subheadline;
  }
  if (layer.role === "bullets") {
    return getAdStudioBullets(fields.body, concept).join("\n");
  }
  if (layer.role === "cta") {
    return fields.cta;
  }
  if (layer.role === "contact") {
    return [fields.phone, fields.email, fields.website].filter(Boolean).join("   ");
  }
  return layer.text || "";
}

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || ""));
}

function clampAdStudioNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, number));
}

function normalizeAdStudioWebsite(value) {
  return String(value || "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "www.")
    .replace(/\/$/, "");
}

function shortenAdStudioText(value, maxLength) {
  const text = String(value || "").trim();
  if (text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength - 1).trim()}...`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("Kunde inte l\u00e4sa filen.")));
    reader.readAsDataURL(file);
  });
}

async function createAdStudioThumbnail(dataUrl, maxSize = 320) {
  const image = await loadAdStudioImage(dataUrl);
  if (!image) {
    return dataUrl;
  }
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, maxSize / Math.max(image.naturalWidth || maxSize, image.naturalHeight || maxSize));
  canvas.width = Math.max(1, Math.round((image.naturalWidth || maxSize) * scale));
  canvas.height = Math.max(1, Math.round((image.naturalHeight || maxSize) * scale));
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.72);
}

async function saveAdStudioAssetDataUrl(dataUrl, name, type) {
  if (!window.desktopApp?.saveAdAsset) {
    return { assetStorageId: "", dataUrl };
  }
  try {
    return await window.desktopApp.saveAdAsset({ dataUrl, name, type });
  } catch {
    return { assetStorageId: "", dataUrl };
  }
}

async function resolveAdStudioAssetDataUrl(asset, options = {}) {
  if (!asset) {
    return "";
  }
  if (asset.dataUrl) {
    return asset.dataUrl;
  }
  if (!asset.assetStorageId || !window.desktopApp?.getAdAssetDataUrl) {
    return "";
  }
  const cacheKey = asset.assetStorageId;
  if (adStudioAssetDataUrlCache.has(cacheKey)) {
    const cached = adStudioAssetDataUrlCache.get(cacheKey);
    if (options.hydrate !== false) {
      asset.dataUrl = cached;
    }
    return cached;
  }
  const dataUrl = await window.desktopApp.getAdAssetDataUrl({ assetStorageId: asset.assetStorageId });
  adStudioAssetDataUrlCache.set(cacheKey, dataUrl);
  if (options.hydrate !== false) {
    asset.dataUrl = dataUrl;
  }
  return dataUrl;
}

async function exportAdStudioPng() {
  collectAdStudioFieldsFromInputs();
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  const concept = getActiveAdStudioConcept();
  const fields = getAdStudioPreviewFields(concept);
  const finalAsset = getAdStudioFinalAsset(concept);
  if (!finalAsset) {
    if (elements.adsFeedback) {
      elements.adsFeedback.textContent = "Generera en komplett annonsbild f\u00f6rst. Exporten ska inte anv\u00e4nda gamla mallager.";
    }
    return;
  }
  const finalDataUrl = await resolveAdStudioAssetDataUrl(finalAsset, { hydrate: false });
  const finalImage = await loadAdStudioImage(finalDataUrl);

  elements.adsExportButton.disabled = true;
  try {
    if (!finalImage) {
      throw new Error("Den kompletta annonsbilden kunde inte l\u00e4sas. Generera en ny bild och f\u00f6rs\u00f6k igen.");
    }
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1920, 1080);
    drawImageCover(ctx, finalImage, 0, 0, 1920, 1080);
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${sanitizeAdStudioFilename(fields.brand)}-16x9.png`;
    link.click();
    if (elements.adsFeedback) {
      elements.adsFeedback.textContent = "PNG exporterad i 1920 x 1080.";
    }
  } catch (error) {
    if (elements.adsFeedback) {
      elements.adsFeedback.textContent = error.message || "Kunde inte exportera PNG.";
    }
  } finally {
    elements.adsExportButton.disabled = false;
  }
}

function loadAdStudioImage(dataUrl) {
  if (!dataUrl) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => resolve(null));
    image.src = dataUrl;
  });
}

function drawAdStudioCanvas(ctx, concept, fields, mediaImage, design) {
  const spec = design || getAdStudioDesign(concept, fields);
  ctx.fillStyle = spec.background.color || "#0f172a";
  ctx.fillRect(0, 0, 1920, 1080);
  if (mediaImage) {
    drawImageCoverWithFocal(ctx, mediaImage, 0, 0, 1920, 1080, spec.background.focalX, spec.background.focalY);
  } else {
    drawAdStudioFallback(ctx, 0, 0, 1920, 1080, spec.background.color || "#0f172a", "#334155");
  }
  ctx.fillStyle = hexToRgba(spec.background.overlayColor || "#000000", spec.background.overlayOpacity || 0);
  ctx.fillRect(0, 0, 1920, 1080);
  spec.layers.forEach((layer) => drawAdStudioCanvasLayer(ctx, layer, fields, concept));
}

function drawAdStudioBackground(ctx, mediaImage, fallbackColor) {
  if (mediaImage) {
    drawImageCover(ctx, mediaImage, 0, 0, 1920, 1080);
    return;
  }
  drawAdStudioFallback(ctx, 0, 0, 1920, 1080, fallbackColor, "#334155");
}

function drawAdStudioFallback(ctx, x, y, width, height, fromColor, toColor) {
  const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
  gradient.addColorStop(0, fromColor);
  gradient.addColorStop(1, toColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(x, y, width, height);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
  ctx.lineWidth = 2;
  for (let offset = -height; offset < width; offset += 92) {
    ctx.beginPath();
    ctx.moveTo(x + offset, y + height);
    ctx.lineTo(x + offset + height, y);
    ctx.stroke();
  }
}

function drawAdStudioCanvasLayer(ctx, layer, fields, concept) {
  const x = (layer.x / 100) * 1920;
  const y = (layer.y / 100) * 1080;
  const width = (layer.w / 100) * 1920;
  const height = (layer.h / 100) * 1080;
  ctx.save();
  ctx.globalAlpha = layer.opacity ?? 1;
  if (layer.type === "shape") {
    ctx.fillStyle = layer.color;
    if (layer.shape === "circle") {
      ctx.beginPath();
      ctx.ellipse(x + width / 2, y + height / 2, width / 2, height / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    } else {
      fillAdStudioRoundRect(ctx, x, y, width, height, layer.radius || 0);
    }
    ctx.restore();
    return;
  }
  if (layer.type === "line") {
    ctx.fillStyle = layer.color;
    fillAdStudioRoundRect(ctx, x, y, width, height, layer.radius || height / 2);
    ctx.restore();
    return;
  }
  const text = getAdStudioLayerText(layer, fields, concept);
  drawAdStudioTextBox(ctx, text, x, y, width, height, layer);
  ctx.restore();
}

function drawAdStudioContactBar(ctx, fields, x, y, width, height, background, color) {
  const contactItems = [fields.phone, fields.email, fields.website].filter(Boolean);
  ctx.fillStyle = background;
  fillAdStudioRoundRect(ctx, x, y, width, height, 22);
  ctx.fillStyle = color;
  ctx.font = "800 42px Arial, sans-serif";
  const itemWidth = width / Math.max(contactItems.length, 1);
  contactItems.forEach((item, index) => {
    const textX = x + 48 + index * itemWidth;
    ctx.fillText(item, textX, y + height / 2 + 15);
    if (index < contactItems.length - 1) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.35)";
      ctx.fillRect(x + (index + 1) * itemWidth, y + 22, 3, height - 44);
      ctx.fillStyle = color;
    }
  });
}

function drawAdStudioAccentLine(ctx, x, y, width, color) {
  ctx.fillStyle = color;
  fillAdStudioRoundRect(ctx, x, y, width, 8, 4);
}

function drawAdStudioWrappedText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  let line = "";
  let linesDrawn = 0;
  words.forEach((word) => {
    if (linesDrawn >= maxLines) {
      return;
    }
    const testLine = line ? `${line} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, y + linesDrawn * lineHeight);
      line = word;
      linesDrawn += 1;
    } else {
      line = testLine;
    }
  });
  if (line && linesDrawn < maxLines) {
    ctx.fillText(line, x, y + linesDrawn * lineHeight);
  }
}

function drawAdStudioTextBox(ctx, text, x, y, width, height, layer) {
  const transformText = layer.transform === "uppercase" ? String(text || "").toUpperCase() : String(text || "");
  const paragraphs = transformText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  let fontSize = Number(layer.fontSize) || 42;
  const lineHeightRatio = Number(layer.lineHeight) || 1.12;
  let lines = [];
  while (fontSize >= 14) {
    ctx.font = `${Number(layer.weight) || 800} ${fontSize}px Arial, sans-serif`;
    lines = paragraphs.flatMap((paragraph) => wrapCanvasLine(ctx, paragraph, width));
    if (lines.length * fontSize * lineHeightRatio <= height) {
      break;
    }
    fontSize -= 2;
  }
  ctx.font = `${Number(layer.weight) || 800} ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = layer.color;
  ctx.textBaseline = "top";
  const lineHeight = fontSize * lineHeightRatio;
  const maxLines = Math.max(1, Math.floor(height / lineHeight));
  lines.slice(0, maxLines).forEach((line, index) => {
    const metrics = ctx.measureText(line);
    const offset = layer.align === "center" ? (width - metrics.width) / 2 : layer.align === "right" ? width - metrics.width : 0;
    ctx.fillText(line, x + offset, y + index * lineHeight);
  });
}

function wrapCanvasLine(ctx, text, maxWidth) {
  const words = String(text || "").split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) {
    lines.push(line);
  }
  return lines;
}

function drawImageCover(ctx, image, x, y, width, height) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawImageCoverWithFocal(ctx, image, x, y, width, height, focalX = 50, focalY = 50) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  const extraX = Math.max(0, drawWidth - width);
  const extraY = Math.max(0, drawHeight - height);
  const offsetX = -extraX * (clampAdStudioNumber(focalX, 0, 100, 50) / 100);
  const offsetY = -extraY * (clampAdStudioNumber(focalY, 0, 100, 50) / 100);
  ctx.drawImage(image, x + offsetX, y + offsetY, drawWidth, drawHeight);
}

function drawImageContain(ctx, image, x, y, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  ctx.drawImage(image, x, y + (maxHeight - drawHeight) / 2, drawWidth, drawHeight);
}

function fillAdStudioRoundRect(ctx, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + safeRadius, y);
  ctx.lineTo(x + width - safeRadius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  ctx.lineTo(x + width, y + height - safeRadius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  ctx.lineTo(x + safeRadius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  ctx.lineTo(x, y + safeRadius);
  ctx.quadraticCurveTo(x, y, x + safeRadius, y);
  ctx.closePath();
  ctx.fill();
}

function sanitizeAdStudioFilename(value) {
  return String(value || "annonsstudio")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "annonsstudio";
}

function getAdStudioAssetForConcept(concept, design = null) {
  if (!state.adStudio.assets.length) {
    return null;
  }
  const finalAsset = getAdStudioFinalAsset(concept);
  if (finalAsset) {
    return finalAsset;
  }
  const selected = state.adStudio.assets.find((asset) => asset.selected && asset.type !== "finished-ad") || state.adStudio.assets.find((asset) => asset.selected);
  if (!concept) {
    return selected || state.adStudio.assets[0];
  }
  const designIndex = Number.isInteger(design?.background?.imageIndex) ? design.background.imageIndex : null;
  const candidates = [state.adStudio.assets[designIndex], state.adStudio.assets[concept.imageIndex], selected, state.adStudio.assets[0]];
  return candidates.find((asset) => asset && asset.type !== "finished-ad") || candidates.find(Boolean) || null;
}

function getAdStudioFinalAsset(concept) {
  if (concept?.finalImageAssetId) {
    return state.adStudio.assets.find((asset) => asset.id === concept.finalImageAssetId && asset.type === "finished-ad") || null;
  }
  if (!concept) {
    return state.adStudio.assets.find((asset) => asset.selected && asset.type === "finished-ad") || null;
  }
  return null;
}

async function getAdStudioImageReferenceAssets(concept, options = {}) {
  const references = [];
  const usableReferenceTypes = new Set(["customer", "research"]);
  const addReference = (asset) => {
    if (!asset?.dataUrl?.startsWith("data:image/") || references.some((item) => item.id === asset.id)) {
      return;
    }
    references.push(asset);
  };
  const previousFinalAsset = getAdStudioFinalAsset(concept);
  const conceptAsset = state.adStudio.assets[concept?.imageIndex];
  if (usableReferenceTypes.has(conceptAsset?.type)) {
    addReference(conceptAsset);
  }
  state.adStudio.assets.filter((asset) => asset.selected && usableReferenceTypes.has(asset.type)).forEach(addReference);
  state.adStudio.assets.filter((asset) => usableReferenceTypes.has(asset.type)).forEach(addReference);
  if (options.includePreviousFinal) {
    addReference(previousFinalAsset);
  }
  const payloads = [];
  for (const asset of references.slice(0, 6)) {
    const dataUrl = await resolveAdStudioAssetDataUrl(asset, { hydrate: false });
    if (dataUrl) {
      payloads.push({
        id: asset.id,
        name: asset.name,
        dataUrl,
        type: asset.type
      });
    }
  }
  return payloads;
}

function getAdStudioBullets(body, concept) {
  const fromBody = String(body || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (fromBody.length) {
    return fromBody;
  }
  return Array.isArray(concept?.bullets) ? concept.bullets : [];
}

function updateActiveAdStudioConceptFromFields() {
  const concept = getActiveAdStudioConcept();
  if (!concept) {
    return;
  }
  concept.headline = state.adStudio.fields.headline;
  concept.subheadline = state.adStudio.fields.subheadline;
  concept.cta = state.adStudio.fields.cta;
  concept.bullets = String(state.adStudio.fields.body || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  concept.palette = {
    ...(concept.palette || {}),
    accent: state.adStudio.fields.accent || "#f97316"
  };
}

function hydrateAdStudioFieldsFromInstructions() {
  const text = state.adStudio.fields.instructions || "";
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0] || "";
  const phone = text.match(/(?:\+46|0)[\d\s-]{7,}/)?.[0]?.trim() || "";
  const website = text.match(/(?:https?:\/\/)?(?:www\.)?[a-z0-9-]+\.[a-z]{2,}(?:\/[^\s]*)?/i)?.[0] || "";
  if (!state.adStudio.fields.email && email) {
    state.adStudio.fields.email = email;
  }
  if (!state.adStudio.fields.phone && phone) {
    state.adStudio.fields.phone = phone;
  }
  if (!state.adStudio.fields.website && website && !website.includes("@")) {
    state.adStudio.fields.website = normalizeAdStudioWebsite(website);
  }
}

function hydrateAdStudioFieldsFromBrief() {
  const brief = state.adStudio.brief;
  if (!brief) {
    return;
  }
  state.adStudio.fields.brand = state.adStudio.fields.brand || brief.customerName || "";
  state.adStudio.fields.phone = state.adStudio.fields.phone || brief.phone || "";
  state.adStudio.fields.email = state.adStudio.fields.email || brief.email || "";
  state.adStudio.fields.website = state.adStudio.fields.website || normalizeAdStudioWebsite(brief.website || "");
}

async function generateAdStudioImageAsset() {
  collectAdStudioFieldsFromInputs();
  const openaiApiKey = elements.adsOpenAiKeyInput?.value.trim() || state.data.settings.openaiApiKey || "";
  if (!openaiApiKey) {
    elements.adsFeedback.textContent = "OpenAI API-nyckel saknas.";
    return;
  }
  const concept = getActiveAdStudioConcept();
  const appliedFeedback = applyAdStudioFeedback({ silent: true });
  const hasRevisionFeedback = Boolean(appliedFeedback);
  const hasPreviousFinal = Boolean(getAdStudioFinalAsset(concept));
  state.adStudio.isBusy = true;
  startAdStudioImageProgress(hasRevisionFeedback && hasPreviousFinal);
  elements.adsFeedback.textContent = hasRevisionFeedback && hasPreviousFinal
    ? "AI skapar en ny version utifr\u00e5n din feedback..."
    : "AI komponerar en komplett 16:9-annons fr\u00e5n kundens material...";
  renderAdStudioBusyState();
  try {
    await window.desktopApp.saveSettings({ openaiApiKey });
    const image = await window.desktopApp.generateAdImage({
      openaiApiKey,
      brand: state.adStudio.fields.brand,
      fields: state.adStudio.fields,
      brief: state.adStudio.brief || state.adStudio.fields.instructions,
      concept: concept || "",
      creativeFeedback: appliedFeedback,
      webResearch: state.adStudio.research,
      revisionId: createAdStudioId("revision"),
      images: await getAdStudioImageReferenceAssets(concept, { includePreviousFinal: hasRevisionFeedback })
    });
    const savedImage = await saveAdStudioAssetDataUrl(image.dataUrl, image.name || "AI-genererad komplett annons", "finished-ad");
    const asset = {
      id: createAdStudioId("asset"),
      name: image.name || "AI-genererad komplett annons",
      dataUrl: image.dataUrl,
      thumbDataUrl: await createAdStudioThumbnail(image.dataUrl, 480),
      assetStorageId: savedImage.assetStorageId || "",
      selected: true,
      type: image.completeAd ? "finished-ad" : "generated"
    };
    state.adStudio.assets.forEach((item) => {
      item.selected = false;
    });
    state.adStudio.assets.push(asset);
    if (concept) {
      concept.imageIndex = state.adStudio.assets.length - 1;
      if (asset.type === "finished-ad") {
        concept.finalImageAssetId = asset.id;
      }
    }
    elements.adsFeedback.textContent = "Komplett AI-annons skapad. Du kan exportera den direkt eller skriva feedback i instruktionerna och generera en ny version.";
    finishAdStudioImageProgress("Komplett annonsbild skapad.");
  } catch (error) {
    cancelAdStudioImageProgress();
    elements.adsFeedback.textContent = error.message || "Kunde inte generera AI-bild.";
  } finally {
    state.adStudio.isBusy = false;
    renderAdStudio();
  }
}

function renderAdStudioBusyState() {
  [
    elements.adsInterpretButton,
    elements.adsGenerateButton,
    elements.adsGenerateImageButton,
    elements.adsRegenerateBriefButton,
    elements.adsResearchButton,
    elements.adsExportButton
  ].forEach((button) => {
    if (button) {
      button.disabled = state.adStudio.isBusy;
    }
  });
  renderAdStudioFeedbackState();
}

function markAdStudioForReview() {
  state.adStudio.status = "review";
  if (elements.adsFeedback) {
    elements.adsFeedback.textContent = "Utkastet markerades f\u00f6r granskning.";
  }
  renderAdStudioStatus();
}

function createAdStudioId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function hexToRgba(hex, opacity = 1) {
  const safe = isHexColor(hex) ? hex : "#000000";
  const r = Number.parseInt(safe.slice(1, 3), 16);
  const g = Number.parseInt(safe.slice(3, 5), 16);
  const b = Number.parseInt(safe.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${clampAdStudioNumber(opacity, 0, 1, 1)})`;
}

async function searchPlacesAction() {
  if (state.placesSearchBusy || state.placesSaveBusy) {
    return;
  }
  const apiKey = elements.apiKeyInput.value.trim();
  const branch = titleCase(elements.placesIndustryInput.value.trim());
  const cities = parseList(elements.placesCityInput.value).map(titleCase);
  const rawMaxResults = Number(elements.placesMaxResultsInput.value);
  const maxResults = Number.isFinite(rawMaxResults) && rawMaxResults > 0 ? rawMaxResults : undefined;

  state.placesSearchBusy = true;
  elements.placesFeedback.textContent = "Kör multi-search via Google Places...";
  renderCampaigns();
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
  } finally {
    state.placesSearchBusy = false;
    renderCampaigns();
  }
}

async function savePlacesAsCampaign() {
  if (state.placesSearchBusy || state.placesSaveBusy) {
    return;
  }
  const selectedLeads = getSelectedPlacesResults();
  if (!selectedLeads.length) {
    elements.placesFeedback.textContent = "Markera minst ett lead innan du sparar listan.";
    return;
  }

  state.placesSaveBusy = true;
  renderCampaigns();
  try {
    const branch = titleCase(elements.placesIndustryInput.value.trim());
    const cities = parseList(elements.placesCityInput.value).map(titleCase);
    const selectedCampaignId = elements.placesCampaignSelect?.value || "";
    let campaign = state.data.campaigns.find((item) => item.id === selectedCampaignId);

    if (!campaign) {
      campaign = await window.desktopApp.createCampaign({
        name: elements.campaignNameInput.value.trim() || [branch, cities.join(", ")].filter(Boolean).join(" ") || "Ny lista",
        sourceType: "google-places",
        searchQuery: [branch, cities.join(", ")].filter(Boolean).join(" "),
        cities,
        targetMarkets: cities,
        normalizedBranch: branch,
        dailyTarget: Number(elements.planningDailyTargetInput.value) || 40,
        startDate: formatLocalDate(new Date())
      });
      if (elements.placesCampaignSelect) {
        elements.placesCampaignSelect.value = campaign.id;
      }
    }

    const result = await window.desktopApp.importLeads({
      leads: selectedLeads,
      options: { listId: campaign.id }
    });
    const action = selectedCampaignId ? `Lade till i "${campaign.name}".` : `Lista "${campaign.name}" sparad.`;
    elements.placesFeedback.textContent = `${action} Importerade ${result.imported}, redan i listan ${result.alreadyInList || 0}, dubletter i andra listor ${result.duplicates}, skippade ${result.skipped}.`;
    await refreshState();
  } catch (error) {
    elements.placesFeedback.textContent = error.message;
  } finally {
    state.placesSaveBusy = false;
    render();
  }
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

function daysFromNow(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
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
  const placesBusy = state.placesSearchBusy || state.placesSaveBusy;
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
            <input type="checkbox" data-place-select="${escapeHtml(lead.id)}" ${selected ? "checked" : ""} ${placesBusy ? "disabled" : ""} />
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
      removeButton.disabled = placesBusy;
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

  const selectedPlacesCount = getSelectedPlacesResults().length;
  const targetCampaign = state.data.campaigns.find((campaign) => campaign.id === (elements.placesCampaignSelect?.value || ""));
  elements.searchPlacesButton.disabled = placesBusy;
  elements.selectAllPlacesButton.disabled = placesBusy || !state.placesResults.length;
  elements.clearAllPlacesButton.disabled = placesBusy || !state.placesResults.length;
  elements.savePlacesCampaignButton.disabled = placesBusy || !selectedPlacesCount;
  elements.savePlacesCampaignButton.textContent = state.placesSaveBusy
    ? "Sparar..."
    : targetCampaign
      ? `Lägg till valda i ${targetCampaign.name} (${selectedPlacesCount})`
      : `Spara valda till ny lista (${selectedPlacesCount})`;
  if (elements.placesCampaignSelect) {
    elements.placesCampaignSelect.disabled = placesBusy;
  }
  if (elements.campaignNameInput) {
    elements.campaignNameInput.disabled = placesBusy || Boolean(targetCampaign);
  }

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
