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
const MAX_PLACES_API_CALLS_PER_SEARCH = 500;
const STATISTICS_HANDLING_LOG_TYPES = new Set(["activity", "call", "status", "note", "reminder-complete", "update", "telavox-sync"]);
const STATISTICS_STATUS_COLORS = {
  Ny: "#2563eb",
  "Ej svar": "#64748b",
  "Ringa igen": "#d97706",
  "Skicka mail": "#0f9f9a",
  "Mail skickat": "#0891b2",
  "Återkoppling": "#4f46e5",
  Closed: "#059669",
  "Inte intresserad": "#dc2626"
};
const STATISTICS_CALL_COLORS = {
  outgoing: "#2563eb",
  incoming: "#059669",
  missed: "#dc2626",
  sales: "#0f9f9a",
  matchedCalls: "#4f46e5",
  unmatchedCalls: "#ef4444",
  inferredCalls: "#f59e0b",
  directSalesCalls: "#10b981",
  handled: "#0f9f9a",
  contacted: "#d97706",
  totalCalls: "#2563eb"
};
const STATISTICS_CHART_STATUS_PREFIX = "status:";
const STATISTICS_CHART_BASE_METRICS = [
  { value: "totalCalls", label: "Telavox totalt", color: "#2563eb" },
  { value: "callMix", label: "Samtalsmix", color: "#2563eb" },
  { value: "outgoing", label: "Utgående samtal", color: "#2563eb" },
  { value: "incoming", label: "Inkommande samtal", color: "#059669" },
  { value: "missed", label: "Missade samtal", color: "#dc2626" },
  { value: "matchedCalls", label: "CRM-matchade samtal", color: "#4f46e5" },
  { value: "unmatchedCalls", label: "Omatchade samtal", color: "#ef4444" },
  { value: "inferredCalls", label: "Antagna branscher", color: "#f59e0b" },
  { value: "directSalesCalls", label: "Direkta säljsamtal", color: "#10b981" },
  { value: "handled", label: "Hanterade kunder", color: "#0f9f9a" },
  { value: "contacted", label: "Kontaktade kunder", color: "#d97706" },
  { value: "sales", label: "Sälj", color: "#059669" }
];

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

const QUERY_SUGGESTION_GROUPS = [
  ["glassbutik", "gelateria", "gelato", "glassbar"],
  ["vvs", "rörmokare", "rörfirma", "vvs installatör", "vvs service"],
  ["poolfirma", "poolbyggare", "poolservice", "poolinstallation", "poolbutik"],
  ["plattsättare", "kakelsättare", "kakel och klinker", "kakelarbeten", "badrumsrenovering"],
  ["webbyrå", "webbdesign", "digitalbyrå", "reklambyrå"],
  ["optiker", "optik", "glasögonbutik", "synundersökning"]
];

const QUERY_SUGGESTION_SUFFIXES = ["butik", "firma", "företag", "service", "verkstad", "salong", "studio", "byrå", "mottagning", "center", "centrum"];

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
  placesProgress: null,
  placesQuerySuggestions: [],
  placesQuerySuggestionSelection: {},
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
  statistics: {
    rangePreset: "last30",
    groupBy: "week",
    chartMetric: "totalCalls",
    selectedSeries: ["rawTelavoxCalls", "outboundSalesDials", "connectedSalesCalls", "sales", "revenue"],
    attributionMode: "hard_inferred",
    hideEmptyBuckets: true,
    segmentSort: "priorityScore",
    pausedSegments: new Set(),
    fromDate: formatLocalDate(daysAgo(29)),
    toDate: formatLocalDate(new Date()),
    campaignId: "",
    syncBusy: false,
    feedback: "",
    summary: null,
    renderToken: 0
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
    statistics: document.querySelector("#statisticsView"),
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
  placesSeparateListsToggle: document.querySelector("#placesSeparateListsToggle"),
  placesCampaignSelect: document.querySelector("#placesCampaignSelect"),
  campaignNameInput: document.querySelector("#campaignNameInput"),
  generatePlaceQuerySuggestionsButton: document.querySelector("#generatePlaceQuerySuggestionsButton"),
  placesQuerySuggestionPanel: document.querySelector("#placesQuerySuggestionPanel"),
  placesQuerySuggestionSummary: document.querySelector("#placesQuerySuggestionSummary"),
  placesQuerySuggestionList: document.querySelector("#placesQuerySuggestionList"),
  applyPlaceQuerySuggestionsButton: document.querySelector("#applyPlaceQuerySuggestionsButton"),
  clearPlaceQuerySuggestionsButton: document.querySelector("#clearPlaceQuerySuggestionsButton"),
  searchPlacesButton: document.querySelector("#searchPlacesButton"),
  selectAllPlacesButton: document.querySelector("#selectAllPlacesButton"),
  clearAllPlacesButton: document.querySelector("#clearAllPlacesButton"),
  savePlacesCampaignButton: document.querySelector("#savePlacesCampaignButton"),
  placesFeedback: document.querySelector("#placesFeedback"),
  placesProgress: document.querySelector("#placesProgress"),
  placesProgressText: document.querySelector("#placesProgressText"),
  placesProgressPercent: document.querySelector("#placesProgressPercent"),
  placesProgressBar: document.querySelector("#placesProgressBar"),
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
  statisticsCampaignSelect: document.querySelector("#statisticsCampaignSelect"),
  statisticsRangePreset: document.querySelector("#statisticsRangePreset"),
  statisticsGroupBy: document.querySelector("#statisticsGroupBy"),
  statisticsAttributionMode: document.querySelector("#statisticsAttributionMode"),
  statisticsHideEmptyBuckets: document.querySelector("#statisticsHideEmptyBuckets"),
  statisticsChartMetric: document.querySelector("#statisticsChartMetric"),
  statisticsChartMetricButtons: document.querySelector("#statisticsChartMetricButtons"),
  statisticsFromDate: document.querySelector("#statisticsFromDate"),
  statisticsToDate: document.querySelector("#statisticsToDate"),
  statisticsSyncTelavoxButton: document.querySelector("#statisticsSyncTelavoxButton"),
  statisticsFeedback: document.querySelector("#statisticsFeedback"),
  statisticsKpis: document.querySelector("#statisticsKpis"),
  statisticsStatusRange: document.querySelector("#statisticsStatusRange"),
  statisticsStatusBars: document.querySelector("#statisticsStatusBars"),
  statisticsInsights: document.querySelector("#statisticsInsights"),
  statisticsActivityLegend: document.querySelector("#statisticsActivityLegend"),
  statisticsCoverage: document.querySelector("#statisticsCoverage"),
  statisticsSeriesPicker: document.querySelector("#statisticsSeriesPicker"),
  statisticsActivityBars: document.querySelector("#statisticsActivityBars"),
  statisticsSegmentsTable: document.querySelector("#statisticsSegmentsTable"),
  statisticsSegmentSort: document.querySelector("#statisticsSegmentSort"),
  statisticsTelavoxSummary: document.querySelector("#statisticsTelavoxSummary"),
  statisticsTelavoxBreakdown: document.querySelector("#statisticsTelavoxBreakdown"),
  statisticsUnmatchedCalls: document.querySelector("#statisticsUnmatchedCalls"),
  statisticsExportRawButton: document.querySelector("#statisticsExportRawButton"),
  statisticsExportAttributedButton: document.querySelector("#statisticsExportAttributedButton"),
  statisticsExportSegmentsButton: document.querySelector("#statisticsExportSegmentsButton"),
  statisticsExportMetricsButton: document.querySelector("#statisticsExportMetricsButton"),
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
  editExtraPhonesInput: document.querySelector("#editExtraPhonesInput"),
  editContactInput: document.querySelector("#editContactInput"),
  editWebsiteInput: document.querySelector("#editWebsiteInput"),
  editAddressInput: document.querySelector("#editAddressInput"),
  editCityInput: document.querySelector("#editCityInput"),
  editBranchInput: document.querySelector("#editBranchInput"),
  editBranchSuggestions: document.querySelector("#editBranchSuggestions"),
  editCampaignSelect: document.querySelector("#editCampaignSelect"),
  editSaleValueInput: document.querySelector("#editSaleValueInput"),
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
  window.desktopApp?.onPlacesProgress?.((progress) => {
    if (state.placesProgress?.searchId && progress.searchId && progress.searchId !== state.placesProgress.searchId) {
      return;
    }
    state.placesProgress = { ...(state.placesProgress || {}), ...progress };
    renderPlacesProgress();
  });

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

  elements.statisticsCampaignSelect?.addEventListener("change", (event) => {
    state.statistics.campaignId = event.target.value;
    renderStatistics();
  });
  elements.statisticsRangePreset?.addEventListener("change", (event) => {
    state.statistics.rangePreset = event.target.value;
    applyStatisticsPreset();
    renderStatistics();
  });
  elements.statisticsGroupBy?.addEventListener("change", (event) => {
    state.statistics.groupBy = event.target.value;
    renderStatistics();
  });
  elements.statisticsAttributionMode?.addEventListener("change", (event) => {
    state.statistics.attributionMode = event.target.value || "hard_inferred";
    renderStatistics();
  });
  elements.statisticsHideEmptyBuckets?.addEventListener("change", (event) => {
    state.statistics.hideEmptyBuckets = event.target.checked;
    renderStatistics();
  });
  elements.statisticsChartMetric?.addEventListener("change", (event) => {
    state.statistics.chartMetric = event.target.value || "totalCalls";
    renderStatistics();
  });
  elements.statisticsChartMetricButtons?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-statistics-chart-metric]");
    if (!button) {
      return;
    }
    state.statistics.chartMetric = button.dataset.statisticsChartMetric || "totalCalls";
    renderStatistics();
  });
  elements.statisticsFromDate?.addEventListener("change", (event) => {
    state.statistics.rangePreset = "custom";
    state.statistics.fromDate = event.target.value || state.statistics.fromDate;
    renderStatistics();
  });
  elements.statisticsToDate?.addEventListener("change", (event) => {
    state.statistics.rangePreset = "custom";
    state.statistics.toDate = event.target.value || state.statistics.toDate;
    renderStatistics();
  });
  elements.statisticsSyncTelavoxButton?.addEventListener("click", syncStatisticsTelavox);
  elements.statisticsSeriesPicker?.addEventListener("change", (event) => {
    const checkbox = event.target.closest("[data-statistics-series]");
    if (!checkbox) {
      return;
    }
    const selected = new Set(state.statistics.selectedSeries);
    if (checkbox.checked) {
      selected.add(checkbox.dataset.statisticsSeries);
    } else {
      selected.delete(checkbox.dataset.statisticsSeries);
    }
    state.statistics.selectedSeries = [...selected];
    renderStatisticsFromSummary(state.statistics.summary);
  });
  elements.statisticsSegmentSort?.addEventListener("change", (event) => {
    state.statistics.segmentSort = event.target.value || "priorityScore";
    renderStatisticsFromSummary(state.statistics.summary);
  });
  elements.statisticsSegmentsTable?.addEventListener("click", handleStatisticsSegmentAction);
  elements.statisticsUnmatchedCalls?.addEventListener("click", handleStatisticsUnmatchedAction);
  elements.statisticsExportRawButton?.addEventListener("click", () => exportStatisticsDebug("raw"));
  elements.statisticsExportAttributedButton?.addEventListener("click", () => exportStatisticsDebug("attributed"));
  elements.statisticsExportSegmentsButton?.addEventListener("click", () => exportStatisticsDebug("segments"));
  elements.statisticsExportMetricsButton?.addEventListener("click", () => exportStatisticsDebug("metrics"));

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
  elements.generatePlaceQuerySuggestionsButton?.addEventListener("click", generatePlaceQuerySuggestionsAction);
  elements.applyPlaceQuerySuggestionsButton?.addEventListener("click", applySelectedPlaceQuerySuggestions);
  elements.clearPlaceQuerySuggestionsButton?.addEventListener("click", clearPlaceQuerySuggestions);
  elements.placesIndustryInput?.addEventListener("input", () => {
    if (state.placesQuerySuggestions.length) {
      state.placesQuerySuggestions = [];
      state.placesQuerySuggestionSelection = {};
      renderCampaigns();
    }
  });
  elements.placesCampaignSelect?.addEventListener("change", renderCampaigns);
  elements.placesSeparateListsToggle?.addEventListener("change", renderCampaigns);
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
      statistics: "Statistik",
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
      statistics: renderStatistics,
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
    { element: elements.planningCampaignSelect, label: "Alla öppna leads" },
    { element: elements.statisticsCampaignSelect, label: "Alla listor" }
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
  if (elements.statisticsCampaignSelect) {
    elements.statisticsCampaignSelect.value = state.statistics.campaignId || "";
  }

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

function applyStatisticsPreset() {
  const today = new Date();
  const preset = state.statistics.rangePreset;
  if (preset === "custom") {
    return;
  }
  if (preset === "today") {
    const key = formatLocalDate(today);
    state.statistics.fromDate = key;
    state.statistics.toDate = key;
    return;
  }
  if (preset === "week") {
    state.statistics.fromDate = formatLocalDate(getStartOfWeek(today));
    state.statistics.toDate = formatLocalDate(today);
    return;
  }
  if (preset === "month") {
    state.statistics.fromDate = formatLocalDate(new Date(today.getFullYear(), today.getMonth(), 1));
    state.statistics.toDate = formatLocalDate(today);
    return;
  }
  const days = { last7: 6, last30: 29, last90: 89 }[preset] ?? 29;
  state.statistics.fromDate = formatLocalDate(daysAgo(days));
  state.statistics.toDate = formatLocalDate(today);
}

function getStatisticsDateRange() {
  if (state.statistics.rangePreset !== "custom") {
    applyStatisticsPreset();
  }
  let startKey = state.statistics.fromDate || formatLocalDate(daysAgo(29));
  let endKey = state.statistics.toDate || formatLocalDate(new Date());
  if (startKey > endKey) {
    [startKey, endKey] = [endKey, startKey];
  }
  return {
    startKey,
    endKey,
    label: startKey === endKey ? formatWeekdayDate(startKey) : `${formatWeekdayDate(startKey)} – ${formatWeekdayDate(endKey)}`
  };
}

function renderLegacyStatistics() {
  if (!elements.statisticsKpis) {
    return;
  }
  const range = getStatisticsDateRange();
  syncLegacyStatisticsControls(range);
  const summary = buildStatisticsSummary(range);

  elements.statisticsFeedback.textContent = state.statistics.feedback || `Visar ${range.label}. Telavox räknas från sparade/synkade samtal i perioden.`;
  elements.statisticsStatusRange.textContent = state.statistics.campaignId ? "Vald lista, nuläge" : "Aktiva kunder just nu";
  renderLegacyStatisticsKpis(summary);
  renderLegacyStatisticsStatusBars(summary);
  renderLegacyStatisticsInsights(summary);
  renderLegacyStatisticsActivityBars(summary, range);
  renderLegacyStatisticsSegments(summary);
  renderLegacyStatisticsTelavoxBreakdown(summary);
  renderLegacyStatisticsUnmatchedCalls(summary);
}

function syncLegacyStatisticsControls(range = getStatisticsDateRange()) {
  if (elements.statisticsCampaignSelect) {
    elements.statisticsCampaignSelect.value = state.statistics.campaignId || "";
  }
  if (elements.statisticsRangePreset) {
    elements.statisticsRangePreset.value = state.statistics.rangePreset;
  }
  if (elements.statisticsGroupBy) {
    elements.statisticsGroupBy.value = state.statistics.groupBy;
  }
  if (elements.statisticsChartMetric) {
    const metrics = getStatisticsChartMetrics();
    if (!metrics.some((metric) => metric.value === state.statistics.chartMetric)) {
      state.statistics.chartMetric = "totalCalls";
    }
    elements.statisticsChartMetric.innerHTML = metrics
      .map((metric) => `<option value="${escapeHtml(metric.value)}">${escapeHtml(metric.label)}</option>`)
      .join("");
    elements.statisticsChartMetric.value = state.statistics.chartMetric;
  }
  if (elements.statisticsChartMetricButtons) {
    const metrics = getStatisticsPrimaryChartMetrics();
    if (!metrics.some((metric) => metric.value === state.statistics.chartMetric)) {
      state.statistics.chartMetric = "totalCalls";
    }
    elements.statisticsChartMetricButtons.innerHTML = metrics.map((metric) => `
      <button class="statistics-chart-mode ${state.statistics.chartMetric === metric.value ? "is-active" : ""}" type="button" data-statistics-chart-metric="${escapeHtml(metric.value)}">
        ${escapeHtml(metric.shortLabel || metric.label)}
      </button>
    `).join("");
  }
  if (elements.statisticsFromDate) {
    elements.statisticsFromDate.value = range.startKey;
  }
  if (elements.statisticsToDate) {
    elements.statisticsToDate.value = range.endKey;
  }
  if (elements.statisticsSyncTelavoxButton) {
    elements.statisticsSyncTelavoxButton.disabled = state.statistics.syncBusy;
    elements.statisticsSyncTelavoxButton.textContent = state.statistics.syncBusy ? "Synkar..." : "Synka Telavox";
  }
}

function getStatisticsChartMetrics() {
  return [
    ...STATISTICS_CHART_BASE_METRICS,
    ...LEAD_STATUSES.map((status) => ({
      value: `${STATISTICS_CHART_STATUS_PREFIX}${status}`,
      label: `Status: ${status}`,
      color: STATISTICS_STATUS_COLORS[status] || "#2563eb"
    }))
  ];
}

function getStatisticsPrimaryChartMetrics() {
  const wanted = ["totalCalls", "outgoing", "incoming", "missed", "matchedCalls", "inferredCalls", "directSalesCalls", "sales"];
  return wanted
    .map((value) => getStatisticsChartMetrics().find((metric) => metric.value === value))
    .filter(Boolean)
    .map((metric) => ({
      ...metric,
      shortLabel: {
        totalCalls: "Totalt",
        outgoing: "Utgående",
        incoming: "Inkommande",
        missed: "Missade",
        matchedCalls: "Matchade",
        inferredCalls: "Antagna",
        directSalesCalls: "Säljsamtal",
        sales: "Sälj"
      }[metric.value] || metric.label
    }));
}

function getStatisticsChartMetric(value = state.statistics.chartMetric) {
  return getStatisticsChartMetrics().find((metric) => metric.value === value) || getStatisticsChartMetrics()[0];
}

function buildStatisticsTelavoxAttributions(calls, leads, logEntries) {
  const leadById = new Map(leads.map((lead) => [lead.id, lead]));
  const logsByLeadId = new Map();
  logEntries.forEach((entry) => {
    if (!entry.leadId) {
      return;
    }
    if (!logsByLeadId.has(entry.leadId)) {
      logsByLeadId.set(entry.leadId, []);
    }
    logsByLeadId.get(entry.leadId).push(entry);
  });

  const firstPass = calls.map((record) => {
    const storedLead = record.leadId ? leadById.get(record.leadId) : null;
    const phoneLead = storedLead || leads.find((lead) => phonesMatchForStatistics(record.remoteNumber, lead.phone));
    if (phoneLead) {
      return decorateStatisticsCall(record, phoneLead, "crm", "Matchad via kundens telefonnummer");
    }

    const noteLead = leads.find((lead) => leadMentionsStatisticsPhone(lead, logsByLeadId.get(lead.id) || [], record.remoteNumber));
    if (noteLead) {
      return decorateStatisticsCall(record, noteLead, "note", "Kopplad via telefonnummer i anteckning");
    }

    return decorateStatisticsCall(record, null, "unmatched", "Ingen säker träff");
  });

  const dailyBranchStats = new Map();
  firstPass.forEach((record) => {
    if (!record.assignedLeadId || !record.branch) {
      return;
    }
    const dateKey = getDateKeyFromIso(record.happenedAt);
    if (!dateKey) {
      return;
    }
    if (!dailyBranchStats.has(dateKey)) {
      dailyBranchStats.set(dateKey, new Map());
    }
    const branchMap = dailyBranchStats.get(dateKey);
    if (!branchMap.has(record.branch)) {
      branchMap.set(record.branch, { count: 0, cityCounts: new Map() });
    }
    const branchStat = branchMap.get(record.branch);
    branchStat.count += 1;
    if (record.city) {
      branchStat.cityCounts.set(record.city, (branchStat.cityCounts.get(record.city) || 0) + 1);
    }
  });

  return firstPass.map((record) => {
    if (record.assignedLeadId) {
      return record;
    }
    const dateKey = getDateKeyFromIso(record.happenedAt);
    const inferred = inferStatisticsBranchForDate(dailyBranchStats.get(dateKey));
    if (!inferred) {
      return record;
    }
    return {
      ...record,
      matchType: "inferred",
      branch: inferred.branch,
      city: inferred.city,
      attributionLabel: `${formatWeekdayDate(dateKey)}: majoriteten var ${inferred.branch}`,
      attributionConfidence: "Antagen"
    };
  });
}

function decorateStatisticsCall(record, lead, matchType, attributionLabel) {
  return {
    ...record,
    assignedLeadId: lead?.id || "",
    branch: lead ? getStatisticsLeadBranch(lead) : "",
    city: lead ? getStatisticsLeadCity(lead) : "",
    matchType,
    attributionLabel,
    attributionConfidence: matchType === "crm" ? "Säker" : matchType === "note" ? "Anteckning" : "Olöst"
  };
}

function inferStatisticsBranchForDate(branchMap) {
  if (!branchMap || !branchMap.size) {
    return null;
  }
  const ranked = [...branchMap.entries()]
    .map(([branch, stat]) => ({
      branch,
      count: stat.count,
      city: [...stat.cityCounts.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] || "Okänd ort"
    }))
    .sort((left, right) => right.count - left.count);
  const top = ranked[0];
  const second = ranked[1];
  const total = ranked.reduce((sum, item) => sum + item.count, 0);
  if (!top || top.count < 2 || (second && top.count <= second.count) || top.count / Math.max(total, 1) < 0.5) {
    return null;
  }
  return top;
}

function getStatisticsLeadBranch(lead) {
  return lead?.normalizedBranch || lead?.category || "Okategoriserat";
}

function getStatisticsLeadCity(lead) {
  return lead?.targetMarketCity || lead?.normalizedCity || lead?.city || "Okänd ort";
}

function leadMentionsStatisticsPhone(lead, logEntries, phone) {
  const haystacks = [
    lead.notes,
    lead.contactName,
    lead.companyName,
    ...logEntries.map((entry) => `${entry.title || ""} ${entry.text || ""}`)
  ];
  return haystacks.some((text) => textMentionsStatisticsPhone(text, phone));
}

function textMentionsStatisticsPhone(text, phone) {
  const target = normalizeStatisticsPhone(phone);
  if (!target) {
    return false;
  }
  return extractStatisticsPhoneCandidates(text).some((candidate) => phonesMatchForStatistics(candidate, target));
}

function extractStatisticsPhoneCandidates(text) {
  return String(text || "").match(/(?:\+?\d[\d\s()./-]{5,}\d)/g) || [];
}

function phonesMatchForStatistics(left, right) {
  const a = normalizeStatisticsPhone(left);
  const b = normalizeStatisticsPhone(right);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  const tailLength = Math.min(9, a.length, b.length);
  return tailLength >= 7 && a.slice(-tailLength) === b.slice(-tailLength);
}

function normalizeStatisticsPhone(value) {
  return String(value || "").replace(/\D/g, "");
}

function buildStatisticsSummary(range) {
  const campaignId = state.statistics.campaignId || "";
  const allActiveLeads = state.data.leads.filter((lead) => !lead.isDeleted);
  const activeLeads = allActiveLeads.filter((lead) => (campaignId ? lead.listId === campaignId : true));
  const activeLeadIds = new Set(activeLeads.map((lead) => lead.id));
  const allActiveLeadById = new Map(allActiveLeads.map((lead) => [lead.id, lead]));
  const leadById = new Map(activeLeads.map((lead) => [lead.id, lead]));
  const periodLogs = (state.data.logEntries || []).filter((entry) => isIsoInStatisticsRange(entry.createdAt, range));
  const rawTelavoxCallsInRange = (state.data.callRecords || [])
    .filter((record) => record.provider === "telavox")
    .filter((record) => isIsoInStatisticsRange(record.happenedAt, range));
  const attributedTelavoxCalls = buildStatisticsTelavoxAttributions(rawTelavoxCallsInRange, allActiveLeads, state.data.logEntries || []);
  const telavoxCallsInRange = attributedTelavoxCalls
    .filter((record) => (campaignId ? activeLeadIds.has(record.assignedLeadId) : true));
  const hardMatchedTelavoxCalls = telavoxCallsInRange.filter((record) => record.matchType === "crm");
  const noteMatchedTelavoxCalls = telavoxCallsInRange.filter((record) => record.matchType === "note");
  const inferredTelavoxCalls = telavoxCallsInRange.filter((record) => record.matchType === "inferred");
  const unresolvedTelavoxCalls = telavoxCallsInRange.filter((record) => record.matchType === "unmatched");
  const matchedTelavoxCalls = telavoxCallsInRange.filter((record) => record.assignedLeadId && allActiveLeadById.has(record.assignedLeadId));
  const unmatchedTelavoxCalls = telavoxCallsInRange.filter((record) => !record.assignedLeadId || !allActiveLeadById.has(record.assignedLeadId));
  const softMatchedTelavoxCalls = telavoxCallsInRange.filter((record) => record.matchType !== "crm");
  const handlingLeadIds = new Set();

  periodLogs.forEach((entry) => {
    if (activeLeadIds.has(entry.leadId) && STATISTICS_HANDLING_LOG_TYPES.has(entry.type)) {
      handlingLeadIds.add(entry.leadId);
    }
  });
  matchedTelavoxCalls.forEach((record) => {
    if (activeLeadIds.has(record.assignedLeadId)) {
      handlingLeadIds.add(record.assignedLeadId);
    }
  });
  activeLeads.forEach((lead) => {
    if (lead.status !== "Ny" && isIsoInStatisticsRange(lead.updatedAt, range)) {
      handlingLeadIds.add(lead.id);
    }
  });

  const contactedLeadIds = new Set(
    activeLeads
      .filter((lead) => lead.status !== "Ny")
      .filter((lead) => handlingLeadIds.has(lead.id) || isIsoInStatisticsRange(lead.updatedAt, range))
      .map((lead) => lead.id)
  );
  const salesLeadIds = new Set(
    activeLeads
      .filter((lead) => lead.status === "Closed")
      .filter((lead) => handlingLeadIds.has(lead.id) || isIsoInStatisticsRange(lead.updatedAt, range))
      .map((lead) => lead.id)
  );
  periodLogs.forEach((entry) => {
    if (activeLeadIds.has(entry.leadId) && logMentionsStatus(entry, "Closed")) {
      salesLeadIds.add(entry.leadId);
      contactedLeadIds.add(entry.leadId);
      handlingLeadIds.add(entry.leadId);
    }
  });
  const directSalesCalls = telavoxCallsInRange.filter((record) =>
    record.direction === "outgoing" && record.assignedLeadId && salesLeadIds.has(record.assignedLeadId)
  );

  const statusCounts = Object.fromEntries(LEAD_STATUSES.map((status) => [status, 0]));
  activeLeads.forEach((lead) => {
    statusCounts[lead.status] = (statusCounts[lead.status] || 0) + 1;
  });

  const telavoxDirectionCounts = telavoxCallsInRange.reduce((counts, record) => {
    counts[record.direction] = (counts[record.direction] || 0) + 1;
    return counts;
  }, { incoming: 0, outgoing: 0, missed: 0 });
  const totalTelavoxDuration = telavoxCallsInRange.reduce((sum, record) => sum + (Number(record.durationSeconds) || 0), 0);
  const appCallLogs = periodLogs.filter((entry) => entry.type === "call" && activeLeadIds.has(entry.leadId));
  const mailLeadCount = activeLeads.filter((lead) => ["Skicka mail", "Mail skickat"].includes(lead.status)).length;

  return {
    range,
    campaignId,
    activeLeads,
    allActiveLeads,
    activeLeadIds,
    leadById,
    periodLogs,
    statusCounts,
    handlingLeadIds,
    contactedLeadIds,
    salesLeadIds,
    telavoxCalls: telavoxCallsInRange,
    attributedTelavoxCalls,
    matchedTelavoxCalls,
    hardMatchedTelavoxCalls,
    noteMatchedTelavoxCalls,
    unmatchedTelavoxCalls,
    inferredTelavoxCalls,
    unresolvedTelavoxCalls,
    softMatchedTelavoxCalls,
    directSalesCalls,
    telavoxDirectionCounts,
    totalTelavoxDuration,
    appCallLogs,
    mailLeadCount
  };
}

function renderLegacyStatisticsKpis(summary) {
  const totalLeads = summary.activeLeads.length;
  const handled = summary.handlingLeadIds.size;
  const contacted = summary.contactedLeadIds.size;
  const sales = summary.salesLeadIds.size;
  const telavoxTotal = summary.telavoxCalls.length;
  const ratio = sales ? contacted / sales : 0;
  const cards = [
    { label: "Leads totalt", value: totalLeads, sub: `${summary.statusCounts.Ny || 0} nya väntar`, tone: "" },
    { label: "Hanterade kunder", value: handled, sub: "CRM-aktivitet eller Telavox-träff", tone: "" },
    { label: "Kontaktade", value: contacted, sub: `${formatStatisticsPercent(contacted, Math.max(totalLeads, 1))} av leads`, tone: "warn" },
    { label: "Sälj", value: sales, sub: `${formatStatisticsPercent(sales, Math.max(contacted, 1))} av kontaktade`, tone: "good" },
    { label: "Telavox totalt", value: telavoxTotal, sub: `${summary.matchedTelavoxCalls.length} matchade · ${summary.inferredTelavoxCalls.length} antagna · ${summary.unresolvedTelavoxCalls.length} olösta`, tone: "" },
    { label: "Snitt till sälj", value: sales ? formatDecimal(ratio) : "–", sub: sales ? "kontaktade kunder per sälj" : "väntar på sälj i perioden", tone: "" }
  ];

  elements.statisticsKpis.innerHTML = cards.map((card) => `
    <article class="statistics-kpi ${card.tone ? `is-${card.tone}` : ""}">
      <span>${escapeHtml(card.label)}</span>
      <strong>${escapeHtml(String(card.value))}</strong>
      <small>${escapeHtml(card.sub)}</small>
    </article>
  `).join("");
}

function renderLegacyStatisticsStatusBars(summary) {
  const maxValue = Math.max(1, ...Object.values(summary.statusCounts));
  elements.statisticsStatusBars.innerHTML = LEAD_STATUSES.map((status) => {
    const count = summary.statusCounts[status] || 0;
    const width = count ? Math.max(2, Math.round((count / maxValue) * 100)) : 0;
    return `
      <div class="statistics-bar-row">
        <label>${escapeHtml(status)}</label>
        <div class="statistics-bar-track"><i style="width:${width}%;background:${STATISTICS_STATUS_COLORS[status] || "#2563eb"}"></i></div>
        <b>${count}</b>
      </div>
    `;
  }).join("");
}

function renderLegacyStatisticsInsights(summary) {
  const contacted = summary.contactedLeadIds.size;
  const sales = summary.salesLeadIds.size;
  const totalTelavox = summary.telavoxCalls.length;
  const outgoing = summary.telavoxDirectionCounts.outgoing || 0;
  const directSalesCalls = summary.directSalesCalls.length;
  const insights = [
    {
      title: "Kontakt till sälj",
      body: "Kontaktade kunder per sälj.",
      badge: sales ? `${formatDecimal(contacted / sales)} : 1` : "–",
      tone: "green"
    },
    {
      title: "Råa Telavox-samtal till sälj",
      body: "Alla Telavox-samtal i perioden.",
      badge: sales ? `${formatDecimal(totalTelavox / sales)} : 1` : `${totalTelavox} samtal`,
      tone: "blue"
    },
    {
      title: "Utgående samtal till sälj",
      body: "Dina aktiva ringförsök.",
      badge: sales ? `${formatDecimal(outgoing / sales)} : 1` : `${outgoing} utgående`,
      tone: "amber"
    },
    {
      title: "Direkta säljsamtal",
      body: "Utgående samtal till kunder som blev sälj.",
      badge: sales ? `${formatDecimal(directSalesCalls / sales)} : 1` : `${directSalesCalls} samtal`,
      tone: "green"
    },
    {
      title: "Olösta nummer",
      body: "Samtal utan kund eller rimlig bransch.",
      badge: `${summary.unresolvedTelavoxCalls.length}`,
      tone: summary.unresolvedTelavoxCalls.length ? "red" : "green"
    }
  ];

  elements.statisticsInsights.innerHTML = insights.map((item) => `
    <article class="statistics-insight">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.body)}</span>
      </div>
      <b class="statistics-badge is-${escapeHtml(item.tone)}">${escapeHtml(item.badge)}</b>
    </article>
  `).join("");
}

function renderLegacyStatisticsActivityBars(summary, range) {
  const buckets = buildStatisticsBuckets(summary, range);
  const metric = getStatisticsChartMetric();
  const series = getStatisticsChartSeries(metric);
  const maxValue = Math.max(1, ...buckets.flatMap((bucket) => series.map((item) => getStatisticsBucketMetricValue(bucket, item.value))));
  const isDense = buckets.length > 18;
  const bucketMinWidth = isDense ? 42 : buckets.length > 10 ? 58 : 88;
  const maxBarHeight = isDense ? 92 : 118;
  elements.statisticsActivityBars.innerHTML = `
    <div class="statistics-bucket-grid ${isDense ? "is-dense" : ""}" style="grid-template-columns: repeat(${Math.max(buckets.length, 1)}, minmax(${bucketMinWidth}px, 1fr));">
      ${buckets.map((bucket) => `
        <div class="statistics-bucket">
          <div class="statistics-bucket-bars">
            ${series.map((item) => {
              const value = getStatisticsBucketMetricValue(bucket, item.value);
              const height = value ? Math.max(3, Math.round((value / maxValue) * maxBarHeight)) : 0;
              return `
                <span class="statistics-bucket-bar" title="${escapeHtml(item.label)}: ${value}">
                  <b>${value || ""}</b>
                  <i style="height:${height}px;background:${item.color}"></i>
                </span>
              `;
            }).join("")}
          </div>
          <strong>${escapeHtml(bucket.label)}</strong>
          <span>${bucket.totalCalls} samtal · ${bucket.sales} sälj</span>
        </div>
      `).join("")}
    </div>
    <div class="statistics-legend">
      ${series.map((item) => `<span><i style="background:${item.color}"></i>${escapeHtml(item.label)}</span>`).join("")}
    </div>
  `;
  elements.statisticsActivityLegend.textContent = `${range.label} · ${state.statistics.groupBy === "day" ? "daglig vy" : state.statistics.groupBy === "week" ? "veckovy" : "månadsvis"}`;
}

function getStatisticsChartSeries(metric) {
  if (metric.value === "callMix") {
    return [
      { value: "outgoing", label: "Utgående", color: STATISTICS_CALL_COLORS.outgoing },
      { value: "incoming", label: "Inkommande", color: STATISTICS_CALL_COLORS.incoming },
      { value: "missed", label: "Missade", color: STATISTICS_CALL_COLORS.missed }
    ];
  }
  return [metric];
}

function getStatisticsBucketMetricValue(bucket, metricValue) {
  if (metricValue.startsWith(STATISTICS_CHART_STATUS_PREFIX)) {
    const status = metricValue.slice(STATISTICS_CHART_STATUS_PREFIX.length);
    return bucket.statusCounts?.[status] || 0;
  }
  const value = bucket[metricValue];
  if (value instanceof Set) {
    return value.size;
  }
  return Number(value) || 0;
}

function renderLegacyStatisticsSegments(summary) {
  const segments = new Map();
  const ensureSegment = (branch) => {
    const key = branch || "Okategoriserat";
    if (!segments.has(key)) {
      segments.set(key, {
        branch: key,
        callCities: new Map(),
        handled: 0,
        contacted: 0,
        sales: 0,
        total: 0,
        telavox: 0,
        inferred: 0,
        noteMatched: 0,
        unresolved: 0
      });
    }
    return segments.get(key);
  };

  summary.activeLeads.forEach((lead) => {
    const segment = ensureSegment(getStatisticsLeadBranch(lead));
    segment.total += 1;
    if (summary.handlingLeadIds.has(lead.id)) {
      segment.handled += 1;
    }
    if (summary.contactedLeadIds.has(lead.id)) {
      segment.contacted += 1;
    }
    if (summary.salesLeadIds.has(lead.id)) {
      segment.sales += 1;
    }
  });
  summary.telavoxCalls.forEach((record) => {
    const branch = record.branch || (record.matchType === "unmatched" ? "Omatchat" : "Okategoriserat");
    const segment = ensureSegment(branch);
    segment.telavox += 1;
    incrementStatisticsCallCity(segment, record.city || "Okänd ort");
    if (record.matchType === "inferred") {
      segment.inferred += 1;
    }
    if (record.matchType === "note") {
      segment.noteMatched += 1;
    }
    if (record.matchType === "unmatched") {
      segment.unresolved += 1;
    }
  });
  const rows = [...segments.values()]
    .filter((segment) => segment.telavox || segment.handled || segment.contacted || segment.sales)
    .sort((left, right) => right.telavox - left.telavox || right.sales - left.sales || right.handled - left.handled)
    .slice(0, 8);

  if (!rows.length) {
    elements.statisticsSegmentsTable.innerHTML = `<div class="empty-state">Inga hanterade segment i perioden.</div>`;
    return;
  }

  elements.statisticsSegmentsTable.innerHTML = `
    <table class="statistics-table">
      <thead><tr><th>Bransch</th><th>Samtal</th><th>Matchade</th><th>Antagna</th><th>Sälj</th><th>Rate</th></tr></thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td><strong>${escapeHtml(row.branch)}</strong><br><span>${escapeHtml(formatStatisticsTopCities(row))}</span></td>
            <td><strong>${row.telavox}</strong></td>
            <td>${Math.max(0, row.telavox - row.inferred - row.unresolved)}</td>
            <td>${row.inferred}</td>
            <td>${row.sales}</td>
            <td><strong>${formatStatisticsPercent(row.sales, Math.max(row.telavox || row.contacted, 1))}</strong></td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function incrementStatisticsCallCity(segment, city) {
  const key = city || "Okänd ort";
  segment.callCities.set(key, (segment.callCities.get(key) || 0) + 1);
}

function formatStatisticsTopCities(segment) {
  const cities = [...segment.callCities.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 3)
    .map(([city, count]) => `${city} ${count}`);
  return cities.length ? cities.join(" · ") : "Inga samtal";
}

function renderLegacyStatisticsTelavoxBreakdown(summary) {
  const total = summary.telavoxCalls.length;
  const totalDuration = summary.totalTelavoxDuration;
  const avgDuration = total ? Math.round(totalDuration / total) : 0;
  const cards = [
    ["Utgående", summary.telavoxDirectionCounts.outgoing || 0],
    ["Inkommande", summary.telavoxDirectionCounts.incoming || 0],
    ["Missade", summary.telavoxDirectionCounts.missed || 0],
    ["CRM-matchade", summary.hardMatchedTelavoxCalls.length],
    ["Via anteckning", summary.noteMatchedTelavoxCalls.length],
    ["Antagna branscher", summary.inferredTelavoxCalls.length],
    ["Olösta", summary.unresolvedTelavoxCalls.length],
    ["Total samtalstid", formatDuration(totalDuration)],
    ["Snittlängd", formatDuration(avgDuration)]
  ];
  elements.statisticsTelavoxSummary.textContent = total
    ? `${total} samtal · ${summary.matchedTelavoxCalls.length} matchade · ${summary.inferredTelavoxCalls.length} antagna`
    : "Inga Telavox-samtal i perioden";
  elements.statisticsTelavoxBreakdown.innerHTML = `
    <article class="statistics-telavox-total-card">
      <span>Totalt enligt Telavox</span>
      <strong>${total}</strong>
      <small>${formatDuration(totalDuration)} total samtalstid · ${formatDuration(avgDuration)} snitt</small>
    </article>
    ${cards.map(([label, value]) => `
      <article class="statistics-mini-card">
        <span>${escapeHtml(label)}</span>
        <strong>${escapeHtml(String(value))}</strong>
      </article>
    `).join("")}
  `;
}

function renderLegacyStatisticsUnmatchedCalls(summary) {
  const rows = [...summary.softMatchedTelavoxCalls]
    .sort((left, right) => new Date(right.happenedAt) - new Date(left.happenedAt))
    .slice(0, 12);
  if (!rows.length) {
    elements.statisticsUnmatchedCalls.innerHTML = `<div class="empty-state">Alla Telavox-samtal har säker CRM-träff i perioden.</div>`;
    return;
  }
  elements.statisticsUnmatchedCalls.innerHTML = `
    <table class="statistics-table">
      <thead><tr><th>Nummer</th><th>Typ</th><th>När</th><th>Bransch / källa</th><th>Längd</th></tr></thead>
      <tbody>
        ${rows.map((record) => `
          <tr>
            <td><strong>${escapeHtml(record.remoteNumber || "Saknas")}</strong></td>
            <td>${escapeHtml(formatTelavoxDirection(record.direction))}</td>
            <td>${escapeHtml(formatDateTime(record.happenedAt))}</td>
            <td><strong>${escapeHtml(record.branch || "Okänd")}</strong><br><span>${escapeHtml(record.attributionLabel || formatStatisticsCallMatchType(record.matchType))}</span></td>
            <td>${escapeHtml(formatDuration(record.durationSeconds))}</td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function formatStatisticsCallMatchType(matchType) {
  return {
    crm: "Säker CRM-träff",
    note: "Kopplad via anteckning",
    inferred: "Antagen bransch",
    unmatched: "Olöst"
  }[matchType] || "Okänd";
}

function buildStatisticsBuckets(summary, range) {
  const buckets = createStatisticsBucketRange(range, state.statistics.groupBy);
  const bucketMap = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  summary.telavoxCalls.forEach((record) => {
    const dateKey = getDateKeyFromIso(record.happenedAt);
    if (!dateKey) {
      return;
    }
    const bucket = bucketMap.get(getStatisticsBucketKey(dateKey, state.statistics.groupBy));
    if (!bucket) {
      return;
    }
    bucket[record.direction] = (bucket[record.direction] || 0) + 1;
    bucket.totalCalls += 1;
    if (record.assignedLeadId) {
      bucket.matchedCalls += 1;
    } else {
      bucket.unmatchedCalls += 1;
    }
    if (record.matchType === "inferred") {
      bucket.inferredCalls += 1;
    }
    if (record.assignedLeadId && summary.salesLeadIds.has(record.assignedLeadId) && record.direction === "outgoing") {
      bucket.directSalesCalls += 1;
    }
    if (record.assignedLeadId) {
      bucket.handledLeadIds.add(record.assignedLeadId);
    }
  });

  summary.periodLogs.forEach((entry) => {
    const dateKey = getDateKeyFromIso(entry.createdAt);
    const bucket = bucketMap.get(getStatisticsBucketKey(dateKey, state.statistics.groupBy));
    if (!bucket || !summary.activeLeadIds.has(entry.leadId)) {
      return;
    }
    if (STATISTICS_HANDLING_LOG_TYPES.has(entry.type)) {
      bucket.handledLeadIds.add(entry.leadId);
    }
  });
  summary.activeLeads.forEach((lead) => {
    const dateKey = getDateKeyFromIso(lead.updatedAt);
    const bucket = bucketMap.get(getStatisticsBucketKey(dateKey, state.statistics.groupBy));
    if (!bucket || !isIsoInStatisticsRange(lead.updatedAt, range)) {
      return;
    }
    bucket.statusCounts[lead.status] = (bucket.statusCounts[lead.status] || 0) + 1;
    if (lead.status !== "Ny") {
      bucket.handledLeadIds.add(lead.id);
      bucket.contactedLeadIds.add(lead.id);
    }
  });

  const salesByBucket = new Map();
  summary.activeLeads.forEach((lead) => {
    if (lead.status !== "Closed" || !isIsoInStatisticsRange(lead.updatedAt, range)) {
      return;
    }
    const dateKey = getDateKeyFromIso(lead.updatedAt);
    const bucketKey = getStatisticsBucketKey(dateKey, state.statistics.groupBy);
    if (!salesByBucket.has(bucketKey)) {
      salesByBucket.set(bucketKey, new Set());
    }
    salesByBucket.get(bucketKey).add(lead.id);
  });
  summary.periodLogs.forEach((entry) => {
    if (!summary.activeLeadIds.has(entry.leadId) || !logMentionsStatus(entry, "Closed")) {
      return;
    }
    const dateKey = getDateKeyFromIso(entry.createdAt);
    const bucketKey = getStatisticsBucketKey(dateKey, state.statistics.groupBy);
    if (!salesByBucket.has(bucketKey)) {
      salesByBucket.set(bucketKey, new Set());
    }
    salesByBucket.get(bucketKey).add(entry.leadId);
  });
  salesByBucket.forEach((leadIds, bucketKey) => {
    const bucket = bucketMap.get(bucketKey);
    if (bucket) {
      bucket.sales = leadIds.size;
    }
  });

  return buckets.map((bucket) => ({
    ...bucket,
    handled: bucket.handledLeadIds.size,
    contacted: bucket.contactedLeadIds.size
  }));
}

function createStatisticsBucketRange(range, groupBy) {
  const buckets = [];
  let cursor = parseLocalDateKey(range.startKey);
  const end = parseLocalDateKey(range.endKey);
  if (groupBy === "week") {
    cursor = getStartOfWeek(cursor);
  }
  if (groupBy === "month") {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  }
  while (cursor <= end) {
    const key = getStatisticsBucketKey(formatLocalDate(cursor), groupBy);
    if (!buckets.some((bucket) => bucket.key === key)) {
      buckets.push({
        key,
        label: getStatisticsBucketLabel(cursor, groupBy),
        outgoing: 0,
        incoming: 0,
        missed: 0,
        totalCalls: 0,
        matchedCalls: 0,
        unmatchedCalls: 0,
        inferredCalls: 0,
        directSalesCalls: 0,
        handledLeadIds: new Set(),
        contactedLeadIds: new Set(),
        statusCounts: Object.fromEntries(LEAD_STATUSES.map((status) => [status, 0])),
        sales: 0
      });
    }
    cursor = groupBy === "month"
      ? new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
      : addDays(cursor, groupBy === "week" ? 7 : 1);
  }
  return buckets;
}

function getStatisticsBucketKey(dateKey, groupBy) {
  if (!dateKey) {
    return "";
  }
  const date = parseLocalDateKey(dateKey);
  if (groupBy === "week") {
    return formatLocalDate(getStartOfWeek(date));
  }
  if (groupBy === "month") {
    return formatLocalDate(new Date(date.getFullYear(), date.getMonth(), 1)).slice(0, 7);
  }
  return dateKey;
}

function getStatisticsBucketLabel(date, groupBy) {
  if (groupBy === "week") {
    return `v.${getWeekNumber(date)}`;
  }
  if (groupBy === "month") {
    return new Intl.DateTimeFormat("sv-SE", { month: "short" }).format(date);
  }
  return new Intl.DateTimeFormat("sv-SE", { weekday: "short", day: "numeric" }).format(date);
}

async function syncLegacyStatisticsTelavox() {
  if (state.statistics.syncBusy) {
    return;
  }
  const range = getStatisticsDateRange();
  state.statistics.syncBusy = true;
  state.statistics.feedback = `Synkar Telavox-samtal ${range.label}...`;
  renderStatistics();
  try {
    const result = await window.desktopApp.syncTelavoxPeriod({
      fromDate: range.startKey,
      toDate: range.endKey,
      token: elements.telavoxTokenInput?.value?.trim() || state.data.settings.telavoxToken || ""
    });
    await refreshState();
    state.statistics.feedback = `Telavox synkad: ${result.totalFetched} samtal hämtade, ${result.matchedCount} matchade, ${result.unmatchedCount} omatchade.`;
  } catch (error) {
    state.statistics.feedback = error.message || "Telavox-synken misslyckades.";
  } finally {
    state.statistics.syncBusy = false;
    renderStatistics();
  }
}

function isIsoInStatisticsRange(value, range) {
  const key = getDateKeyFromIso(value);
  return Boolean(key) && key >= range.startKey && key <= range.endKey;
}

function getDateKeyFromIso(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return formatLocalDate(date);
}

function parseLocalDateKey(value) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function getStartOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setDate(copy.getDate() - day + 1);
  copy.setHours(12, 0, 0, 0);
  return copy;
}

function addDays(date, amount) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + amount);
  return copy;
}

function getWeekNumber(date) {
  const target = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = target.getUTCDay() || 7;
  target.setUTCDate(target.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  return Math.ceil((((target - yearStart) / 86400000) + 1) / 7);
}

function logMentionsStatus(entry, status) {
  const haystack = normalizeText(`${entry.title || ""} ${entry.text || ""}`);
  return haystack.includes(normalizeText(`Status ändrad till ${status}`)) || haystack.includes(normalizeText(status));
}

function formatStatisticsPercent(value, total) {
  if (!total) {
    return "0%";
  }
  return `${formatDecimal((value / total) * 100)}%`;
}

async function renderStatistics() {
  if (!elements.statisticsKpis) {
    return;
  }
  const range = getStatisticsDateRange();
  syncStatisticsControls(range);
  const token = Date.now();
  state.statistics.renderToken = token;
  if (!state.statistics.summary) {
    elements.statisticsFeedback.textContent = "Bygger statistikmotor...";
  }
  try {
    const summary = await window.desktopApp.getStatistics({
      fromDate: range.startKey,
      toDate: range.endKey,
      groupBy: state.statistics.groupBy,
      campaignId: state.statistics.campaignId,
      attributionMode: state.statistics.attributionMode,
      activeQueue: getStatisticsActiveQueue()
    });
    if (state.statistics.renderToken !== token) {
      return;
    }
    state.statistics.summary = summary;
    renderStatisticsFromSummary(summary);
  } catch (error) {
    elements.statisticsFeedback.textContent = error.message || "Statistiken kunde inte byggas.";
  }
}

function getStatisticsActiveQueue() {
  if (state.workMode !== "flow" || !state.workQueue.campaignId) {
    return null;
  }
  const campaign = state.data.campaigns.find((item) => item.id === state.workQueue.campaignId);
  const today = formatLocalDate(new Date());
  return {
    selectedListId: state.workQueue.campaignId,
    selectedIndustry: campaign?.normalizedBranch || campaign?.categories?.[0] || "",
    selectedCity: campaign?.targetMarkets?.[0] || campaign?.cities?.[0] || "",
    fromDate: today,
    toDate: today
  };
}

function renderStatisticsFromSummary(summary) {
  if (!summary) {
    return;
  }
  const range = summary.range || getStatisticsDateRange();
  elements.statisticsFeedback.textContent =
    state.statistics.feedback ||
    `Visar ${range.label}. Hard data, inferred data och raw Telavox hålls separerade.`;
  syncStatisticsControls(range);
  renderStatisticsKpis(summary);
  renderStatisticsCoverage(summary);
  renderStatisticsInsights(summary);
  renderStatisticsSeriesPicker(summary);
  renderStatisticsActivityBars(summary);
  renderStatisticsSegments(summary);
  renderStatisticsTelavoxBreakdown(summary);
  renderStatisticsUnmatchedCalls(summary);
}

function syncStatisticsControls(range = getStatisticsDateRange()) {
  if (elements.statisticsCampaignSelect) {
    elements.statisticsCampaignSelect.value = state.statistics.campaignId || "";
  }
  if (elements.statisticsRangePreset) {
    elements.statisticsRangePreset.value = state.statistics.rangePreset;
  }
  if (elements.statisticsGroupBy) {
    elements.statisticsGroupBy.value = state.statistics.groupBy;
  }
  if (elements.statisticsAttributionMode) {
    elements.statisticsAttributionMode.value = state.statistics.attributionMode || "hard_inferred";
  }
  if (elements.statisticsHideEmptyBuckets) {
    elements.statisticsHideEmptyBuckets.checked = state.statistics.hideEmptyBuckets !== false;
  }
  if (elements.statisticsFromDate) {
    elements.statisticsFromDate.value = range.startKey;
  }
  if (elements.statisticsToDate) {
    elements.statisticsToDate.value = range.endKey;
  }
  if (elements.statisticsSegmentSort) {
    elements.statisticsSegmentSort.value = state.statistics.segmentSort || "priorityScore";
  }
  if (elements.statisticsSyncTelavoxButton) {
    elements.statisticsSyncTelavoxButton.disabled = state.statistics.syncBusy;
    elements.statisticsSyncTelavoxButton.textContent = state.statistics.syncBusy ? "Synkar..." : "Synka Telavox";
  }
}

function renderStatisticsKpis(summary) {
  const cards = [
    ["Leads totalt", summary.kpis.totalLeads, `${summary.kpis.newLeads} nya i perioden`],
    ["Nya leads", summary.kpis.newLeads, "Skapade i valt intervall"],
    ["Hanterade CRM-kunder", summary.kpis.handledCRMCustomers, "Status, note, reminder, ringlogg eller Telavox-match"],
    ["Kontaktade CRM-kunder", summary.kpis.contactedCRMCustomers, "Kontaktstatus eller connected call"],
    ["Sälj", summary.kpis.sales, `${formatSek(summary.kpis.revenue)} revenue`, "good"],
    ["Revenue", formatSek(summary.kpis.revenue), `${formatSek(summary.kpis.averageOrderValue)} avg order`, "good"],
    ["Average order value", formatSek(summary.kpis.averageOrderValue), "Från lead sale/order value"],
    ["Raw Telavox total", summary.kpis.rawTelavoxTotal, "Allt sparat från Telavox"],
    ["Outbound total", summary.kpis.outboundTotal, "Alla utgående Telavox-samtal"],
    ["Outbound sales dials", summary.kpis.outboundSalesDials, "Hard + inferred säljdials"],
    ["Connected sales calls", summary.kpis.connectedSalesCalls, "Över threshold"],
    ["Hard matched calls", summary.kpis.hardMatchedCalls, "Exact, extra, notes eller call intent"],
    ["Inferred calls", summary.kpis.inferredCalls, "Aktiv kö eller tidsblock", "warn"],
    ["Unmatched calls", summary.kpis.unmatchedCalls, "Inte hanterade som CRM-kunder", summary.kpis.unmatchedCalls ? "warn" : "good"],
    ["Dials per sale", formatStatNumber(summary.kpis.dialsPerSale), "Hard säljdials per sälj"],
    ["Connected/sale", formatStatNumber(summary.kpis.connectedCallsPerSale), "Connected calls per sälj"],
    ["Revenue/dial", formatSek(summary.kpis.revenuePerDial), "Hard säljdials"],
    ["Revenue/hour", formatSek(summary.kpis.revenuePerHour), "Samtalstid"],
    ["Expected kr/dial baseline", formatSek(summary.kpis.expectedKrPerDialBaseline), "Bayesian baseline"]
  ];
  elements.statisticsKpis.innerHTML = cards.map(([label, value, sub, tone]) => `
    <article class="statistics-kpi ${tone ? `is-${tone}` : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      <small>${escapeHtml(sub || "")}</small>
    </article>
  `).join("");
}

function renderStatisticsCoverage(summary) {
  if (!elements.statisticsCoverage) {
    return;
  }
  const coverage = summary.coverage || {};
  elements.statisticsTelavoxSummary.textContent = coverage.lastSync
    ? `Senaste synk ${formatDateTime(coverage.lastSync)}`
    : "Ingen sync registrerad";
  const rows = [
    ["Valt intervall", `${coverage.selectedFromDate || summary.range.startKey} - ${coverage.selectedToDate || summary.range.endKey}`],
    ["Sparade samtal i intervallet", coverage.storedCallsInSelectedRange ?? 0],
    ["Hämtade i matchande syncar", coverage.fetchedCallsInMatchingSyncs ?? 0],
    ["Endpoint", coverage.apiEndpoint || "GET https://api.telavox.se/calls"],
    ["API-begränsning", coverage.apiLimitation || "Okänd"],
    ["Datavarning", coverage.warning || "Ingen varning"]
  ];
  elements.statisticsCoverage.innerHTML = rows.map(([label, value]) => `
    <article class="statistics-mini-card ${label === "Datavarning" ? "is-warning" : ""}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value || "Saknas"))}</strong>
    </article>
  `).join("");
}

function renderStatisticsInsights(summary) {
  elements.statisticsInsights.innerHTML = (summary.insights || []).map((item) => `
    <article class="statistics-insight">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.detail)}</span>
      </div>
      <b class="statistics-badge is-${item.money ? "green" : "blue"}">${escapeHtml(item.money ? formatSek(item.value) : formatStatNumber(item.value))}</b>
    </article>
  `).join("");
}

function renderStatisticsSeriesPicker(summary) {
  if (!elements.statisticsSeriesPicker) {
    return;
  }
  const selected = new Set(state.statistics.selectedSeries);
  const groups = new Map();
  (summary.seriesDefinitions || []).forEach((series) => {
    if (!groups.has(series.group)) {
      groups.set(series.group, []);
    }
    groups.get(series.group).push(series);
  });
  elements.statisticsSeriesPicker.innerHTML = [...groups.entries()].map(([group, series]) => `
    <fieldset>
      <legend>${escapeHtml(group)}</legend>
      ${series.map((item) => `
        <label>
          <input type="checkbox" data-statistics-series="${escapeHtml(item.key)}" ${selected.has(item.key) ? "checked" : ""} />
          <span style="--series-color:${escapeHtml(item.color)}">${escapeHtml(item.label)}</span>
        </label>
      `).join("")}
    </fieldset>
  `).join("");
}

function renderStatisticsActivityBars(summary) {
  const definitions = new Map((summary.seriesDefinitions || []).map((series) => [series.key, series]));
  const selectedSeries = state.statistics.selectedSeries
    .map((key) => definitions.get(key))
    .filter(Boolean);
  const series = selectedSeries.length ? selectedSeries : (summary.seriesDefinitions || []).slice(0, 1);
  const buckets = (summary.buckets || []).filter((bucket) => !state.statistics.hideEmptyBuckets || !bucket.isEmpty);
  const chartGroups = groupStatisticsSeriesByScale(series);

  if (!buckets.length || !series.length) {
    elements.statisticsActivityBars.innerHTML = `<div class="empty-state">Inga datapunkter i vald vy.</div>`;
    return;
  }

  elements.statisticsActivityBars.innerHTML = chartGroups.map(([scale, groupSeries]) => {
    const maxValue = Math.max(1, ...buckets.flatMap((bucket) => groupSeries.map((item) => Number(bucket[item.key]) || 0)));
    const isDense = buckets.length > 18 || groupSeries.length > 4;
    const bucketMinWidth = isDense ? 48 : buckets.length > 10 ? 66 : 96;
    const maxBarHeight = isDense ? 105 : 132;
    return `
      <div class="statistics-chart-block">
        <div class="statistics-chart-scale">${escapeHtml(formatStatisticsScaleLabel(scale))}</div>
        <div class="statistics-bucket-grid ${isDense ? "is-dense" : ""}" style="grid-template-columns: repeat(${Math.max(buckets.length, 1)}, minmax(${bucketMinWidth}px, 1fr));">
          ${buckets.map((bucket) => `
            <div class="statistics-bucket ${bucket.isEmpty ? "is-empty" : ""}">
              <div class="statistics-bucket-bars">
                ${groupSeries.map((item) => {
                  const value = Number(bucket[item.key]) || 0;
                  const height = value ? Math.max(4, Math.round((value / maxValue) * maxBarHeight)) : 1;
                  return `
                    <span class="statistics-bucket-bar" title="${escapeHtml(item.label)}: ${escapeHtml(formatStatisticsSeriesValue(value, item.scale))}">
                      <b>${escapeHtml(value ? formatStatisticsCompactValue(value, item.scale) : "")}</b>
                      <i style="height:${height}px;background:${escapeHtml(item.color)}"></i>
                    </span>
                  `;
                }).join("")}
              </div>
              <strong>${escapeHtml(bucket.label)}</strong>
              <span>${bucket.rawTelavoxCalls} raw · ${bucket.sales} sälj</span>
            </div>
          `).join("")}
        </div>
        <div class="statistics-legend">
          ${groupSeries.map((item) => `<span><i style="background:${escapeHtml(item.color)}"></i>${escapeHtml(item.label)}</span>`).join("")}
        </div>
      </div>
    `;
  }).join("");
  elements.statisticsActivityLegend.textContent = `${summary.range.label} · ${summary.groupBy === "day" ? "daglig vy" : summary.groupBy === "week" ? "veckovy" : "månadsvy"} · ${formatStatisticsAttributionMode(summary.attributionMode)}`;
}

function renderStatisticsSegments(summary) {
  const rows = sortStatisticsSegments(summary.segmentStats || []).filter((row) => !state.statistics.pausedSegments.has(row.segmentKey)).slice(0, 40);
  if (!rows.length) {
    elements.statisticsSegmentsTable.innerHTML = `<div class="empty-state">Inga segment med aktivitet i perioden.</div>`;
    return;
  }
  elements.statisticsSegmentsTable.innerHTML = `
    <table class="statistics-table statistics-segment-table">
      <thead>
        <tr>
          <th>Segment</th>
          <th>Bransch</th>
          <th>Stad</th>
          <th>Leads kvar</th>
          <th>Hårda säljdials</th>
          <th>Antagna</th>
          <th>Kontaktade</th>
          <th>Sälj</th>
          <th>Revenue</th>
          <th>Avg order</th>
          <th>Dials/sälj</th>
          <th>Kr/dial</th>
          <th>Kr/timme</th>
          <th>Datakvalitet</th>
          <th>Confidence</th>
          <th>Varför</th>
          <th>Åtgärd</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((row) => `
          <tr>
            <td><strong>${escapeHtml(row.segmentLabel)}</strong><br><span>${escapeHtml(formatSegmentType(row.segmentType))}</span></td>
            <td>${escapeHtml(row.industry || "Alla")}</td>
            <td>${escapeHtml(row.city || "Alla")}</td>
            <td>${row.availableLeads}</td>
            <td>${row.outboundSalesDialsHard}</td>
            <td>${row.outboundSalesDialsInferred}</td>
            <td>${row.contactedLeads}</td>
            <td>${row.salesCount}</td>
            <td>${escapeHtml(formatSek(row.revenue))}</td>
            <td>${escapeHtml(formatSek(row.averageOrderValue))}</td>
            <td>${escapeHtml(formatStatNumber(row.dialsPerSale))}</td>
            <td>${escapeHtml(formatSek(row.expectedKrPerDial))}</td>
            <td>${escapeHtml(formatSek(row.revenuePerHour))}</td>
            <td><span class="statistics-quality is-${escapeHtml(row.dataQuality)}">${escapeHtml(row.dataQuality)}</span><br><span>${escapeHtml((row.warnings || []).join(", ") || "OK")}</span></td>
            <td>${formatStatisticsPercent(row.confidenceScore, 1)}<br><span>${formatStatisticsPercent(row.hardDataShare, 1)} hard</span></td>
            <td><span>${escapeHtml(row.why)}</span></td>
            <td>
              <div class="statistics-actions">
                <button type="button" class="secondary-button" data-stat-segment-action="plan" data-segment-key="${escapeHtml(row.segmentKey)}">Använd i plan</button>
                <button type="button" class="ghost-button" data-stat-segment-action="test" data-segment-key="${escapeHtml(row.segmentKey)}">Testa mer</button>
                <button type="button" class="ghost-button" data-stat-segment-action="pause" data-segment-key="${escapeHtml(row.segmentKey)}">Pausa</button>
                <button type="button" class="ghost-button" data-stat-segment-action="customers" data-segment-key="${escapeHtml(row.segmentKey)}">Visa kunder</button>
                <button type="button" class="ghost-button" data-stat-segment-action="calls" data-segment-key="${escapeHtml(row.segmentKey)}">Visa samtal</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

function renderStatisticsTelavoxBreakdown(summary) {
  const total = summary.telavoxTotals || {};
  const coverage = summary.coverage || {};
  const cards = [
    ["Raw calls total", total.rawCallsTotal || 0],
    ["Outgoing total", total.outgoingTotal || 0],
    ["Incoming total", total.incomingTotal || 0],
    ["Missed", total.missed || 0],
    ["Outbound sales dials", total.outboundSalesDials || 0],
    ["Connected sales calls", total.connectedSalesCalls || 0],
    ["Matched hard", total.matchedHard || 0],
    ["Matched inferred", total.matchedInferred || 0],
    ["Unmatched", total.unmatched || 0],
    ["Ignored/private/internal", total.ignoredPrivateInternal || 0],
    ["Total call time", formatDuration(Math.round(total.totalCallTimeSeconds || 0))],
    ["Average call length", formatDuration(Math.round(total.averageCallLengthSeconds || 0))],
    ["Average connected length", formatDuration(Math.round(total.averageConnectedCallLengthSeconds || 0))],
    ["Sync coverage", coverage.storedCallsInSelectedRange ?? 0],
    ["Last sync", coverage.lastSync ? formatDateTime(coverage.lastSync) : "Saknas"],
    ["API warning", coverage.hasLimitationWarning ? "Kan vara ofullständig" : "OK"]
  ];
  elements.statisticsTelavoxBreakdown.innerHTML = cards.map(([label, value], index) => `
    <article class="${index === 0 ? "statistics-telavox-total-card" : "statistics-mini-card"}">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(String(value))}</strong>
      ${index === 0 ? `<small>${escapeHtml(coverage.apiLimitation || "Legacy /calls sparas lokalt historiskt.")}</small>` : ""}
    </article>
  `).join("");
}

function renderStatisticsUnmatchedCalls(summary) {
  const rows = summary.unmatchedCalls || [];
  if (!rows.length) {
    elements.statisticsUnmatchedCalls.innerHTML = `<div class="empty-state">Inga omatchade eller antagna samtal i vald vy.</div>`;
    return;
  }
  elements.statisticsUnmatchedCalls.innerHTML = `
    <table class="statistics-table">
      <thead><tr><th>Nummer</th><th>Datum/tid</th><th>Typ</th><th>Längd</th><th>Föreslagen match</th><th>Föreslagen bransch/stad</th><th>Confidence</th><th>Matchorsak</th><th>Åtgärd</th></tr></thead>
      <tbody>
        ${rows.slice(0, 60).map((call) => `
          <tr>
            <td><strong>${escapeHtml(call.displayNumber || call.originalNumber || "Saknas")}</strong><br><span>${escapeHtml(call.normalizedNumber || "")}</span></td>
            <td>${escapeHtml(formatDateTime(call.datetime))}</td>
            <td>${escapeHtml(formatTelavoxDirection(call.direction))}</td>
            <td>${escapeHtml(formatDuration(call.durationSeconds))}</td>
            <td>${escapeHtml(call.matchedLeadName || "Ingen säker")}</td>
            <td><strong>${escapeHtml(call.matchedIndustry || "Okänd")}</strong><br><span>${escapeHtml(call.matchedCity || "Okänd stad")}</span></td>
            <td>${formatStatisticsPercent(call.matchConfidence, 1)}</td>
            <td><span>${escapeHtml(formatStatisticsMatchType(call.matchType))}</span><br><span>${escapeHtml(call.attributionReason || "")}</span></td>
            <td>
              <div class="statistics-actions">
                <button type="button" class="secondary-button" data-stat-call-action="link" data-call-id="${escapeHtml(call.id)}">Koppla</button>
                <button type="button" class="ghost-button" data-stat-call-action="extra" data-call-id="${escapeHtml(call.id)}">Extra nummer</button>
                <button type="button" class="ghost-button" data-stat-call-action="create" data-call-id="${escapeHtml(call.id)}">Ny kund</button>
                <button type="button" class="ghost-button" data-stat-call-action="ignore" data-call-id="${escapeHtml(call.id)}">Ignorera</button>
                <button type="button" class="ghost-button" data-stat-call-action="private" data-call-id="${escapeHtml(call.id)}">Privat/internt</button>
              </div>
            </td>
          </tr>
        `).join("")}
      </tbody>
    </table>
  `;
}

async function syncStatisticsTelavox() {
  if (state.statistics.syncBusy) {
    return;
  }
  const range = getStatisticsDateRange();
  state.statistics.syncBusy = true;
  state.statistics.feedback = `Synkar Telavox-samtal ${range.label}...`;
  renderStatisticsFromSummary(state.statistics.summary);
  try {
    const result = await window.desktopApp.syncTelavoxPeriod({
      fromDate: range.startKey,
      toDate: range.endKey,
      token: elements.telavoxTokenInput?.value?.trim() || state.data.settings.telavoxToken || ""
    });
    await refreshState();
    state.statistics.feedback = `Telavox synkad: ${result.totalFetched} samtal hämtade, ${result.matchedCount} matchade, ${result.unmatchedCount} omatchade. Legacy /calls kan vara begränsad, historik raderas inte lokalt.`;
  } catch (error) {
    state.statistics.feedback = error.message || "Telavox-synken misslyckades.";
  } finally {
    state.statistics.syncBusy = false;
    state.statistics.summary = null;
    renderStatistics();
  }
}

async function handleStatisticsUnmatchedAction(event) {
  const button = event.target.closest("[data-stat-call-action]");
  if (!button) {
    return;
  }
  const callId = button.dataset.callId;
  const action = button.dataset.statCallAction;
  const call = state.statistics.summary?.unmatchedCalls?.find((item) => item.id === callId);
  try {
    if (action === "ignore" || action === "private") {
      await window.desktopApp.resolveTelavoxCall({
        callRecordId: callId,
        action: action === "private" ? "private_internal" : "ignore"
      });
    } else if (action === "create") {
      const companyName = window.prompt("Företagsnamn för ny kund?", call?.displayNumber || call?.originalNumber || "");
      if (!companyName) {
        return;
      }
      await window.desktopApp.resolveTelavoxCall({
        callRecordId: callId,
        action: "create_customer",
        companyName,
        industry: call?.matchedIndustry || "",
        city: call?.matchedCity || "",
        listId: call?.matchedListId || ""
      });
    } else {
      const leadQuery = window.prompt("Skriv företagsnamn att koppla numret till:");
      if (!leadQuery) {
        return;
      }
      const lead = findLeadByPrompt(leadQuery);
      if (!lead) {
        window.alert("Hittade ingen kund med det namnet.");
        return;
      }
      await window.desktopApp.resolveTelavoxCall({
        callRecordId: callId,
        action: action === "extra" ? "add_extra_phone" : "link_lead",
        leadId: lead.id
      });
    }
    await refreshState();
    state.statistics.summary = null;
    state.statistics.feedback = "Omatchat nummer löst. Statistiken räknas om.";
    renderStatistics();
  } catch (error) {
    state.statistics.feedback = error.message || "Kunde inte lösa numret.";
    renderStatisticsFromSummary(state.statistics.summary);
  }
}

function handleStatisticsSegmentAction(event) {
  const button = event.target.closest("[data-stat-segment-action]");
  if (!button || !state.statistics.summary) {
    return;
  }
  const segment = state.statistics.summary.segmentStats.find((item) => item.segmentKey === button.dataset.segmentKey);
  if (!segment) {
    return;
  }
  const action = button.dataset.statSegmentAction;
  if (action === "pause") {
    state.statistics.pausedSegments.add(segment.segmentKey);
    state.statistics.feedback = `${segment.segmentLabel} pausat i rankingvyn.`;
    renderStatisticsFromSummary(state.statistics.summary);
    return;
  }
  if (action === "customers") {
    state.filters.customerCategory = segment.industry || "";
    state.filters.customerCity = segment.city || "";
    state.filters.customerCampaignId = segment.listId || "";
    state.currentView = "customers";
    render();
    return;
  }
  if (action === "calls") {
    state.statistics.selectedSeries = ["rawTelavoxCalls", "outboundSalesDials", "connectedSalesCalls", "unmatchedCalls"];
    state.statistics.feedback = `Visar samtalsserier för ${segment.segmentLabel}.`;
    renderStatisticsFromSummary(state.statistics.summary);
    return;
  }
  if (action === "plan" || action === "test") {
    if (elements.planningBranchesInput && segment.industry) {
      elements.planningBranchesInput.value = segment.industry;
    }
    if (elements.planningCitiesInput && segment.city) {
      elements.planningCitiesInput.value = segment.city;
    }
    if (elements.planningCampaignSelect && segment.listId) {
      elements.planningCampaignSelect.value = segment.listId;
    }
    state.currentView = "planning";
    render();
  }
}

function exportStatisticsDebug(type) {
  const summary = state.statistics.summary;
  if (!summary) {
    return;
  }
  const date = formatLocalDate(new Date());
  if (type === "segments") {
    const rows = [
      ["Segment", "Typ", "Bransch", "Stad", "Lista", "Leads kvar", "Hard dials", "Inferred dials", "Sälj", "Revenue", "Expected kr/dial", "Priority", "Datakvalitet", "Confidence", "Varför"],
      ...(summary.exports?.segmentStats || summary.segmentStats || []).map((row) => [
        row.segmentLabel,
        row.segmentType,
        row.industry,
        row.city,
        row.listName,
        row.availableLeads,
        row.outboundSalesDialsHard,
        row.outboundSalesDialsInferred,
        row.salesCount,
        row.revenue,
        row.expectedKrPerDial,
        row.priorityScore,
        row.dataQuality,
        row.confidenceScore,
        row.why
      ])
    ];
    downloadCsv(rows, `segment-stats-${date}.csv`);
    return;
  }
  const payload = {
    raw: summary.exports?.rawTelavoxCalls,
    attributed: summary.exports?.attributedCalls,
    metrics: summary.exports?.generatedMetrics,
    unmatched: summary.exports?.unmatchedCalls
  }[type] || summary.exports;
  downloadText(JSON.stringify(payload, null, 2), `statistics-${type}-${date}.json`, "application/json;charset=utf-8;");
}

function findLeadByPrompt(query) {
  const normalized = normalizeText(query);
  return state.data.leads.find((lead) => normalizeText(lead.companyName) === normalized) ||
    state.data.leads.find((lead) => normalizeText(lead.companyName).includes(normalized));
}

function sortStatisticsSegments(segments) {
  const key = state.statistics.segmentSort || "priorityScore";
  const qualityRank = { good: 3, medium: 2, low: 1 };
  return [...segments].sort((left, right) => {
    if (key === "dataQuality") {
      return (qualityRank[right.dataQuality] || 0) - (qualityRank[left.dataQuality] || 0);
    }
    if (key === "dialsPerSale") {
      const leftValue = Number(left[key]) || Number.MAX_SAFE_INTEGER;
      const rightValue = Number(right[key]) || Number.MAX_SAFE_INTEGER;
      return leftValue - rightValue;
    }
    return (Number(right[key]) || 0) - (Number(left[key]) || 0);
  });
}

function groupStatisticsSeriesByScale(series) {
  const map = new Map();
  series.forEach((item) => {
    const scale = item.scale || "count";
    if (!map.has(scale)) {
      map.set(scale, []);
    }
    map.get(scale).push(item);
  });
  return [...map.entries()];
}

function formatStatisticsSeriesValue(value, scale) {
  if (scale === "money") {
    return formatSek(value);
  }
  if (scale === "minutes") {
    return `${formatStatNumber(value)} min`;
  }
  if (scale === "seconds") {
    return formatDuration(Math.round(value));
  }
  return formatStatNumber(value);
}

function formatStatisticsCompactValue(value, scale) {
  if (scale === "money") {
    return Number(value) >= 1000 ? `${Math.round(Number(value) / 1000)}k` : `${Math.round(Number(value))}`;
  }
  if (scale === "seconds") {
    return `${Math.round(value)}s`;
  }
  if (scale === "minutes") {
    return formatStatNumber(value);
  }
  return formatStatNumber(value);
}

function formatStatisticsScaleLabel(scale) {
  return {
    count: "Antal",
    money: "Kronor",
    minutes: "Minuter",
    seconds: "Sekunder"
  }[scale] || scale;
}

function formatStatisticsAttributionMode(mode) {
  return {
    hard: "hard only",
    hard_inferred: "hard + inferred",
    raw: "raw all"
  }[mode] || mode;
}

function formatStatisticsMatchType(matchType) {
  return {
    exact_phone: "Exakt telefon",
    extra_phone: "Extra telefon",
    notes_phone: "Telefon i anteckning",
    call_intent: "Ring-klick i appen",
    active_queue_inferred: "Antagen via aktiv kö",
    timeblock_inferred: "Antagen via tidsblock",
    unmatched: "Omatchad",
    ignored_private_or_internal: "Ignorerad/privat/internt"
  }[matchType] || "Okänd";
}

function formatSegmentType(type) {
  return {
    industry: "Bransch",
    city: "Stad",
    list: "Lista",
    industry_city: "Bransch + stad",
    industry_list: "Bransch + lista",
    city_list: "Stad + lista"
  }[type] || type;
}

function formatStatNumber(value) {
  const numeric = Number(value) || 0;
  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: numeric >= 10 ? 0 : 1,
    minimumFractionDigits: numeric && numeric < 10 ? 1 : 0
  }).format(numeric);
}

function formatDecimal(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return new Intl.NumberFormat("sv-SE", {
    maximumFractionDigits: value >= 10 ? 0 : 1,
    minimumFractionDigits: value && value < 10 ? 1 : 0
  }).format(value);
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

function createSearchId(prefix = "places") {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function getPlacesBranches() {
  return parseList(elements.placesIndustryInput.value);
}

function getPlacesCities() {
  return parseList(elements.placesCityInput.value).map(titleCase);
}

function getPlacesBranchKeys() {
  return new Set(getPlacesBranches().map((branch) => normalizeText(branch)));
}

function isPlacesSegmentedSaveMode() {
  return Boolean(elements.placesSeparateListsToggle?.checked);
}

function addUniqueSuggestion(suggestions, seen, value, source, currentKeys) {
  const cleanValue = String(value || "").trim();
  if (!cleanValue) {
    return;
  }
  const key = normalizeText(cleanValue);
  if (!key || seen.has(key) || currentKeys.has(key)) {
    return;
  }
  seen.add(key);
  suggestions.push({ value: cleanValue, source });
}

function suggestionGroupMatchesTerm(group, term) {
  const key = normalizeText(term);
  if (!key) {
    return false;
  }
  return group.some((candidate) => {
    const candidateKey = normalizeText(candidate);
    return candidateKey === key || (key.length >= 4 && candidateKey.includes(key)) || (candidateKey.length >= 4 && key.includes(candidateKey));
  });
}

function addCompoundQuerySuggestions(suggestions, seen, term, currentKeys) {
  const cleanTerm = String(term || "").trim();
  const normalized = normalizeText(cleanTerm);
  const suffix = QUERY_SUGGESTION_SUFFIXES.find((candidate) => normalized.endsWith(normalizeText(candidate)) && normalized.length > normalizeText(candidate).length + 2);
  if (!suffix || /\s/.test(cleanTerm)) {
    return;
  }
  const base = cleanTerm.slice(0, cleanTerm.length - suffix.length).trim().replace(/[-\s]+$/g, "");
  if (base.length > 2) {
    addUniqueSuggestion(suggestions, seen, `${base} ${suffix}`, "Variant", currentKeys);
  }
}

function buildPlaceQuerySuggestions(branches = getPlacesBranches()) {
  const sourceBranches = branches.filter(Boolean);
  const currentKeys = getPlacesBranchKeys();
  const suggestions = [];
  const seen = new Set();

  sourceBranches.forEach((branch) => {
    QUERY_SUGGESTION_GROUPS
      .filter((group) => suggestionGroupMatchesTerm(group, branch))
      .flatMap((group) => group)
      .forEach((term) => addUniqueSuggestion(suggestions, seen, term, "Förslag", currentKeys));

    MANUAL_BRANCH_TAXONOMY
      .filter((entry) => suggestionGroupMatchesTerm([entry.label, ...entry.aliases], branch))
      .flatMap((entry) => [entry.label, ...entry.aliases])
      .forEach((term) => addUniqueSuggestion(suggestions, seen, term, "Branschalias", currentKeys));

    getKnownManualBranches()
      .filter((term) => suggestionGroupMatchesTerm([term], branch))
      .forEach((term) => addUniqueSuggestion(suggestions, seen, term, "Befintlig bransch", currentKeys));

    addCompoundQuerySuggestions(suggestions, seen, branch, currentKeys);
  });

  return suggestions.slice(0, 18);
}

function generatePlaceQuerySuggestionsAction() {
  const branches = getPlacesBranches();
  if (!branches.length) {
    elements.placesFeedback.textContent = "Skriv minst en bransch först.";
    return;
  }

  const suggestions = buildPlaceQuerySuggestions(branches);
  state.placesQuerySuggestions = suggestions;
  state.placesQuerySuggestionSelection = Object.fromEntries(suggestions.map((suggestion) => [normalizeText(suggestion.value), true]));
  elements.placesFeedback.textContent = suggestions.length
    ? `${suggestions.length} queryförslag genererade. Välj de du vill lägga till.`
    : "Inga lokala queryförslag hittades. Lägg till fler sökord manuellt i branschfältet.";
  renderCampaigns();
}

function applySelectedPlaceQuerySuggestions() {
  const selectedSuggestions = state.placesQuerySuggestions
    .filter((suggestion) => state.placesQuerySuggestionSelection[normalizeText(suggestion.value)] !== false)
    .map((suggestion) => suggestion.value);
  if (!selectedSuggestions.length) {
    elements.placesFeedback.textContent = "Välj minst ett queryförslag att lägga till.";
    return;
  }

  const currentBranches = getPlacesBranches();
  const mergedBranches = [];
  const seen = new Set();
  [...currentBranches, ...selectedSuggestions].forEach((branch) => {
    const cleanBranch = String(branch || "").trim();
    const key = normalizeText(cleanBranch);
    if (!cleanBranch || seen.has(key)) {
      return;
    }
    seen.add(key);
    mergedBranches.push(cleanBranch);
  });
  elements.placesIndustryInput.value = mergedBranches.join(", ");
  state.placesQuerySuggestions = [];
  state.placesQuerySuggestionSelection = {};
  elements.placesFeedback.textContent = `${selectedSuggestions.length} queryförslag lades till i branschfältet.`;
  renderCampaigns();
}

function clearPlaceQuerySuggestions() {
  state.placesQuerySuggestions = [];
  state.placesQuerySuggestionSelection = {};
  renderCampaigns();
}

function buildGenericBranchTemplates(branch) {
  const term = String(branch || "").trim();
  if (!term) {
    return [];
  }
  return [`${term} {city}`];
}

function getBranchQueryTemplatesForPreview(branch) {
  return buildGenericBranchTemplates(branch);
}

function getPlannedPlacesQueries(branches = getPlacesBranches(), cities = getPlacesCities()) {
  return branches
    .flatMap((branch) =>
      cities.flatMap((city) =>
        getBranchQueryTemplatesForPreview(branch).map((template) => template.replace("{city}", city))
      )
    )
    .filter(Boolean);
}

function estimatePlacesApiCalls(queryCount, maxResults) {
  const effectiveMax = Math.min(Math.max(1, Number(maxResults) || 60), 60);
  const pageCalls = Math.ceil(effectiveMax / 20);
  return queryCount * (pageCalls + effectiveMax);
}

function getPlacesProgressPercent(progress) {
  if (!progress) {
    return 0;
  }
  if (progress.stage === "complete") {
    return 100;
  }
  if (progress.stage === "error") {
    return 0;
  }
  const total = Math.max(1, Number(progress.totalQueries) || 1);
  const completed = Math.max(0, Number(progress.completedQueries) || 0);
  const partial = Math.min(1, Math.max(0, Number(progress.queryProgress) || 0));
  return Math.min(99, Math.max(0, Math.round(((completed + partial) / total) * 100)));
}

function formatPlacesProgressText(progress) {
  if (!progress) {
    return "Förbereder sökning...";
  }
  const total = Number(progress.totalQueries) || 0;
  const current = Number(progress.currentQueryIndex) || 0;
  const query = progress.query ? `"${progress.query}"` : "";

  if (progress.stage === "complete") {
    return "Klar. Resultaten är inlästa.";
  }
  if (progress.stage === "error") {
    return progress.error || "Sökningen avbröts på grund av ett fel.";
  }
  if (progress.stage === "started") {
    const estimate = progress.estimatedApiCalls ? ` Upp till cirka ${progress.estimatedApiCalls} API-anrop.` : "";
    return `Startar ${total} queries.${estimate}`;
  }
  if (progress.stage === "details-start") {
    return `Query ${current}/${total}: hämtar detaljer för ${progress.detailTotal || 0} träffar ${query}`;
  }
  if (progress.stage === "details") {
    return `Query ${current}/${total}: detaljer ${progress.detailIndex || 0}/${progress.detailTotal || 0} ${query}`;
  }
  if (progress.stage === "page") {
    return `Query ${current}/${total}: hämtar träffar (${progress.rawCount || 0} råa) ${query}`;
  }
  if (progress.stage === "query-complete") {
    return `Klar med query ${progress.completedQueries || current}/${total}: ${progress.relevantCount || 0} relevanta träffar`;
  }
  return `Query ${current}/${total}: ${query || "förbereder"}`;
}

function renderPlacesProgress() {
  if (!elements.placesProgress) {
    return;
  }
  const progress = state.placesProgress;
  elements.placesProgress.hidden = !progress;
  if (!progress) {
    return;
  }
  const percent = getPlacesProgressPercent(progress);
  if (elements.placesProgressText) {
    elements.placesProgressText.textContent = formatPlacesProgressText(progress);
  }
  if (elements.placesProgressPercent) {
    elements.placesProgressPercent.textContent = `${percent}%`;
  }
  if (elements.placesProgressBar) {
    elements.placesProgressBar.style.width = `${percent}%`;
  }
}

async function searchPlacesAction() {
  if (state.placesSearchBusy || state.placesSaveBusy) {
    return;
  }
  const apiKey = elements.apiKeyInput.value.trim();
  const branches = getPlacesBranches();
  const cities = getPlacesCities();
  const rawMaxResults = Number(elements.placesMaxResultsInput.value);
  const maxResults = Number.isFinite(rawMaxResults) && rawMaxResults > 0 ? rawMaxResults : undefined;
  const plannedQueries = getPlannedPlacesQueries(branches, cities);
  const searchId = createSearchId();
  const estimatedApiCalls = estimatePlacesApiCalls(plannedQueries.length, maxResults);

  if (estimatedApiCalls > MAX_PLACES_API_CALLS_PER_SEARCH) {
    elements.placesFeedback.textContent =
      `Sökningen stoppades innan Google debiterades: den kan kräva upp till cirka ${estimatedApiCalls} API-anrop. ` +
      `Dela upp sökningen i färre branscher/städer eller sänk max träffar per query. Säkerhetsgräns: ${MAX_PLACES_API_CALLS_PER_SEARCH} API-anrop.`;
    return;
  }

  state.placesSearchBusy = true;
  state.placesProgress = {
    searchId,
    stage: "started",
    totalQueries: plannedQueries.length,
    completedQueries: 0,
    currentQueryIndex: 0,
    queryProgress: 0,
    estimatedApiCalls
  };
  elements.placesFeedback.textContent = `Kör multi-search via Google Places: ${plannedQueries.length} queries, upp till cirka ${estimatedApiCalls} API-anrop.`;
  renderCampaigns();
  try {
    await window.desktopApp.saveSettings({
      apiKey,
      dailyTarget: Number(elements.planningDailyTargetInput.value) || 40,
      lastPlannedMonth: elements.planningMonthInput.value || currentMonthKey()
    });
    const response = await window.desktopApp.searchPlaces({
      apiKey,
      branches,
      cities,
      maxResults,
      searchId
    });
    state.placesResults = response.places;
    state.placesMeta = response.meta;
    state.placesSelection = Object.fromEntries(response.places.map((lead) => [lead.id, true]));
    state.placesProgress = {
      ...(state.placesProgress || {}),
      stage: "complete",
      totalQueries: response.meta.queryCount,
      completedQueries: response.meta.queryCount,
      currentQueryIndex: response.meta.queryCount,
      queryProgress: 1
    };
    const segmentCount = response.meta.segmentBreakdown?.length || 0;
    const segmentLabel = segmentCount ? ` · ${segmentCount} listsegment` : "";
    elements.placesFeedback.textContent = response.places.length
      ? `${response.meta.queryCount} queries · ${response.meta.rawResults} råa träffar · ${response.meta.uniqueResults} unika leads${segmentLabel} · ${response.meta.duplicatesRemoved} dubletter · ${response.meta.filteredOut} bortfiltrerade · ${getSelectedPlacesResults().length} valda · ${response.meta.apiCalls} API-anrop${response.meta.notice ? ` · ${response.meta.notice}` : ""}`
      : "Tomt API-svar: inga träffar.";
    renderCampaigns();
  } catch (error) {
    state.placesResults = [];
    state.placesMeta = null;
    state.placesSelection = {};
    state.placesProgress = {
      ...(state.placesProgress || { searchId }),
      stage: "error",
      error: error.message
    };
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
    const branches = getPlacesBranches();
    const cities = getPlacesCities();
    const selectedCampaignId = elements.placesCampaignSelect?.value || "";

    if (isPlacesSegmentedSaveMode()) {
      const result = await savePlacesAsSegmentedCampaigns(selectedLeads, branches, cities);
      elements.placesFeedback.textContent =
        `Skapade/uppdaterade ${result.listCount} listor. ` +
        `Importerade ${result.imported}, redan i listan ${result.alreadyInList}, dubletter i andra listor ${result.duplicates}, skippade ${result.skipped}.`;
      await refreshState();
      return;
    }

    let campaign = state.data.campaigns.find((item) => item.id === selectedCampaignId);

    if (!campaign) {
      campaign = await window.desktopApp.createCampaign({
        name: elements.campaignNameInput.value.trim() || [branches.join(", "), cities.join(", ")].filter(Boolean).join(" ") || "Ny lista",
        sourceType: "google-places",
        searchQuery: [branches.join(", "), cities.join(", ")].filter(Boolean).join(" "),
        cities,
        targetMarkets: cities,
        categories: branches,
        normalizedBranch: branches[0] || "",
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

function getPlacesLeadSegment(lead, fallbackBranches = [], fallbackCities = []) {
  const branch = titleCase(lead.normalizedBranch || lead.category || fallbackBranches[0] || "Okategoriserat");
  const city = titleCase(lead.targetMarketCity || lead.normalizedCity || lead.city || fallbackCities[0] || "Okänd stad");
  return { branch, city, key: `${normalizeText(branch)}|${normalizeText(city)}` };
}

function findCampaignForPlacesSegment(campaigns, branch, city) {
  const branchKey = normalizeText(branch);
  const cityKey = normalizeText(city);
  return campaigns.find((campaign) => {
    const context = getCampaignManualContext(campaign);
    const campaignBranch = normalizeText(campaign.normalizedBranch || context.branch);
    const campaignCities = (campaign.targetMarkets || campaign.cities || [])
      .concat(context.city || "")
      .map((value) => normalizeText(value))
      .filter(Boolean);
    return campaignBranch === branchKey && campaignCities.includes(cityKey);
  });
}

function groupPlacesLeadsBySegment(leads, fallbackBranches, fallbackCities) {
  const groups = new Map();
  leads.forEach((lead) => {
    const segment = getPlacesLeadSegment(lead, fallbackBranches, fallbackCities);
    if (!groups.has(segment.key)) {
      groups.set(segment.key, { ...segment, leads: [] });
    }
    groups.get(segment.key).leads.push(lead);
  });
  return [...groups.values()].sort((left, right) =>
    left.branch.localeCompare(right.branch, "sv") ||
    left.city.localeCompare(right.city, "sv")
  );
}

async function savePlacesAsSegmentedCampaigns(selectedLeads, branches, cities) {
  const groups = groupPlacesLeadsBySegment(selectedLeads, branches, cities);
  const availableCampaigns = [...state.data.campaigns];
  const totals = {
    listCount: groups.length,
    imported: 0,
    alreadyInList: 0,
    duplicates: 0,
    skipped: 0
  };

  for (const group of groups) {
    let campaign = findCampaignForPlacesSegment(availableCampaigns, group.branch, group.city);
    if (!campaign) {
      campaign = await window.desktopApp.createCampaign({
        name: `${group.branch} - ${group.city}`,
        sourceType: "google-places",
        searchQuery: [group.branch, group.city].filter(Boolean).join(" "),
        cities: [group.city],
        targetMarkets: [group.city],
        categories: [group.branch],
        normalizedBranch: group.branch,
        dailyTarget: Number(elements.planningDailyTargetInput.value) || 40,
        startDate: formatLocalDate(new Date())
      });
      availableCampaigns.unshift(campaign);
    }

    const result = await window.desktopApp.importLeads({
      leads: group.leads,
      options: { listId: campaign.id }
    });
    totals.imported += result.imported || 0;
    totals.alreadyInList += result.alreadyInList || 0;
    totals.duplicates += result.duplicates || 0;
    totals.skipped += result.skipped || 0;
  }

  return totals;
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
  if (elements.editExtraPhonesInput) {
    elements.editExtraPhonesInput.value = (lead.extraPhones || []).join(", ");
  }
  elements.editContactInput.value = lead.contactName || "";
  elements.editWebsiteInput.value = lead.website || "";
  elements.editAddressInput.value = lead.address || "";
  elements.editCityInput.value = lead.targetMarketCity || lead.normalizedCity || lead.city || "";
  elements.editBranchInput.value = lead.normalizedBranch || lead.category || "";
  renderEditBranchSuggestions();
  renderEditCampaignOptions(lead.listId || "");
  if (elements.editSaleValueInput) {
    elements.editSaleValueInput.value = Number(lead.saleValue || lead.orderValue || 0) || "";
  }
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
      extraPhones: parseList(elements.editExtraPhonesInput?.value || ""),
      contactName: elements.editContactInput.value.trim(),
      website: elements.editWebsiteInput.value.trim(),
      address: elements.editAddressInput.value.trim(),
      city,
      normalizedCity: city,
      targetMarketCity: city,
      category: branch,
      normalizedBranch: branch,
      listId,
      saleValue: Number(elements.editSaleValueInput?.value || 0) || 0,
      orderValue: Number(elements.editSaleValueInput?.value || 0) || 0
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
    await window.desktopApp.createCallIntent({
      leadId: lead.id,
      number: lead[field],
      selectedIndustry: getLeadBranchLabel(lead),
      selectedCity: getLeadCityLabel(lead),
      selectedListId: lead.listId || "",
      currentQueueId: state.workMode === "flow" ? [state.workQueue.campaignId, state.workQueue.plannedDate].filter(Boolean).join(":") : ""
    });
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
  const branches = getPlacesBranches();
  const cities = getPlacesCities();
  const queries = branches
    .flatMap((branch) =>
      cities.flatMap((city) =>
        getBranchQueryTemplatesForPreview(branch).map((template) => template.replace("{city}", city))
      )
    )
    .filter(Boolean);
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

function renderPlaceQuerySuggestions(placesBusy = false) {
  if (!elements.placesQuerySuggestionPanel || !elements.placesQuerySuggestionList) {
    return;
  }

  const suggestions = state.placesQuerySuggestions;
  elements.placesQuerySuggestionPanel.hidden = !suggestions.length;
  if (!suggestions.length) {
    elements.placesQuerySuggestionList.innerHTML = "";
    return;
  }

  elements.placesQuerySuggestionList.innerHTML = "";
  suggestions.forEach((suggestion) => {
    const key = normalizeText(suggestion.value);
    const selected = state.placesQuerySuggestionSelection[key] !== false;
    const label = document.createElement("label");
    label.className = "query-suggestion-chip";
    label.innerHTML = `
      <input type="checkbox" data-query-suggestion="${escapeHtml(key)}" ${selected ? "checked" : ""} ${placesBusy ? "disabled" : ""} />
      <span>${escapeHtml(suggestion.value)}</span>
      <em>${escapeHtml(suggestion.source)}</em>
    `;
    label.querySelector("input")?.addEventListener("change", (event) => {
      state.placesQuerySuggestionSelection[key] = event.target.checked;
      renderCampaigns();
    });
    elements.placesQuerySuggestionList.appendChild(label);
  });

  const selectedCount = suggestions.filter((suggestion) => state.placesQuerySuggestionSelection[normalizeText(suggestion.value)] !== false).length;
  const queryCount = selectedCount * Math.max(1, getPlacesCities().length || 1);
  if (elements.placesQuerySuggestionSummary) {
    elements.placesQuerySuggestionSummary.textContent = `${selectedCount}/${suggestions.length} valda · ${queryCount} query${queryCount === 1 ? "" : "s"}`;
  }
  if (elements.applyPlaceQuerySuggestionsButton) {
    elements.applyPlaceQuerySuggestionsButton.disabled = placesBusy || !selectedCount;
  }
  if (elements.clearPlaceQuerySuggestionsButton) {
    elements.clearPlaceQuerySuggestionsButton.disabled = placesBusy;
  }
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
    .split(/[,;\n\r]+/)
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
    const result = renderer();
    if (result && typeof result.catch === "function") {
      result.catch((error) => {
        console.error(`[render:${sectionName}]`, error);
        reportRuntimeError(`Fel i vy: ${sectionName}`, error);
      });
    }
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
  const selectedLeads = getSelectedPlacesResults();
  const selectedCount = selectedLeads.length;
  const ignoredCount = Math.max(0, state.placesResults.length - selectedCount);
  const segmentCount = isPlacesSegmentedSaveMode()
    ? groupPlacesLeadsBySegment(selectedLeads, getPlacesBranches(), getPlacesCities()).length
    : state.placesMeta.segmentBreakdown?.length || 0;
  const segmentLabel = segmentCount ? ` · ${segmentCount} listsegment` : "";
  elements.placesFeedback.textContent = `${state.placesMeta.queryCount} queries · ${state.placesMeta.rawResults} råa träffar · ${state.placesMeta.uniqueResults} unika leads${segmentLabel} · ${state.placesMeta.duplicatesRemoved} dubletter · ${state.placesMeta.filteredOut + ignoredCount} bortfiltrerade/ignorerade · ${selectedCount} valda · ${state.placesMeta.apiCalls} API-anrop${state.placesMeta.notice ? ` · ${state.placesMeta.notice}` : ""}`;
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
      const branchNode = document.createElement("section");
      branchNode.className = "customer-catalog-group";
      branchNode.innerHTML = `
        <header class="customer-catalog-head">
          <strong>${escapeHtml(branch)}</strong>
          <span>${marketMap.size} ${marketMap.size === 1 ? "stad" : "städer"}</span>
          <b>${totalCount}</b>
        </header>
      `;
      const marketRows = document.createElement("div");
      marketRows.className = "customer-catalog-markets";

      [...marketMap.entries()]
        .sort((left, right) => left[0].localeCompare(right[0], "sv"))
        .forEach(([targetMarket, marketLeads]) => {
          const marketNode = document.createElement("details");
          marketNode.className = "customer-market-row";
          marketNode.innerHTML = `
            <summary>
              <span>${escapeHtml(targetMarket)}</span>
              <b>${marketLeads.length}</b>
            </summary>
          `;
          const rows = document.createElement("div");
          rows.className = "catalog-rows";
          marketLeads
            .sort((left, right) => left.companyName.localeCompare(right.companyName, "sv"))
            .forEach((lead) => rows.appendChild(createCatalogLeadRow(lead)));
          marketNode.appendChild(rows);
          marketRows.appendChild(marketNode);
        });

      branchNode.appendChild(marketRows);
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
  renderPlacesProgress();
  renderPlaceQuerySuggestions(placesBusy);
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
          <span class="status-badge">${escapeHtml(lead.normalizedBranch || lead.category || "Okänd bransch")}</span>
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
  const segmentedSaveMode = isPlacesSegmentedSaveMode();
  const selectedSegmentCount = segmentedSaveMode
    ? groupPlacesLeadsBySegment(getSelectedPlacesResults(), getPlacesBranches(), getPlacesCities()).length
    : 0;
  const targetCampaign = segmentedSaveMode
    ? null
    : state.data.campaigns.find((campaign) => campaign.id === (elements.placesCampaignSelect?.value || ""));
  elements.searchPlacesButton.disabled = placesBusy;
  elements.searchPlacesButton.textContent = state.placesSearchBusy ? "Söker..." : "Kör multi-search";
  if (elements.generatePlaceQuerySuggestionsButton) {
    elements.generatePlaceQuerySuggestionsButton.disabled = placesBusy;
  }
  elements.selectAllPlacesButton.disabled = placesBusy || !state.placesResults.length;
  elements.clearAllPlacesButton.disabled = placesBusy || !state.placesResults.length;
  elements.savePlacesCampaignButton.disabled = placesBusy || !selectedPlacesCount;
  elements.savePlacesCampaignButton.textContent = state.placesSaveBusy
    ? "Sparar..."
    : segmentedSaveMode
      ? `Skapa ${selectedSegmentCount} listor (${selectedPlacesCount} leads)`
      : targetCampaign
      ? `Lägg till valda i ${targetCampaign.name} (${selectedPlacesCount})`
      : `Spara valda till ny lista (${selectedPlacesCount})`;
  if (elements.placesCampaignSelect) {
    elements.placesCampaignSelect.disabled = placesBusy || segmentedSaveMode;
  }
  if (elements.placesSeparateListsToggle) {
    elements.placesSeparateListsToggle.disabled = placesBusy;
  }
  if (elements.campaignNameInput) {
    elements.campaignNameInput.disabled = placesBusy || segmentedSaveMode || Boolean(targetCampaign);
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
