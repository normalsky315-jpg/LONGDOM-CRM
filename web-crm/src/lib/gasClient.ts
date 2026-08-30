// GAS 後端串接層。沿用吉隆天曜現有 jltx.html 的協定：
// gasPost 實際上是 GET + payload query param（避開 GAS 無法處理 CORS 預檢的限制），
// 因此每個 action 都必須同時存在於後端 doGet() 的 switch 裡才會生效。
export const GAS_URL = import.meta.env.VITE_GAS_URL || '';

async function gasGet<T = any>(action: string, params?: Record<string, any>): Promise<T> {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (v != null) url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString());
  return res.json();
}

async function gasPost<T = any>(action: string, payload?: Record<string, any>): Promise<T> {
  const url = new URL(GAS_URL);
  url.searchParams.set('action', action);
  url.searchParams.set('payload', JSON.stringify(payload || {}));
  const res = await fetch(url.toString());
  return res.json();
}

// ---- Auth ----
export const verifyAccess = (payload: any) => gasPost('verifyAccess', payload);
export const checkAutoLogin = (payload: any) => gasPost('checkAutoLogin', payload);
export const approveUser = (payload: any) => gasPost('approveUser', payload);
export const rejectUser = (payload: any) => gasPost('rejectUser', payload);
export const updateUserRole = (payload: any) => gasPost('updateUserRole', payload);
export const getUserList = (payload?: any) => gasPost('getUserList', payload);

// ---- Customer_Data ----
export const appendCustomerData = (payload: any) => gasPost('appendCustomerData', payload);
export const updateCustomerData = (payload: any) => gasPost('updateCustomerData', payload);
export const deleteCustomerData = (payload: any) => gasPost('deleteCustomerData', payload);
export const getMyCustomers = (payload?: any) => gasPost('getMyCustomers', payload);
export const searchMyCustomers = (payload: any) => gasPost('searchMyCustomers', payload);
export const getRecentCustomers = (payload?: any) => gasPost('getRecentCustomers', payload);
export const getMyCustomerStats = (payload?: any) => gasPost('getMyCustomerStats', payload);
export const getMyCustomerOverview = (payload?: any) => gasPost('getMyCustomerOverview', payload);
export const getPendingFollowups = (payload?: any) => gasPost('getPendingFollowups', payload);
export const getPendingSignatures = (payload?: any) => gasPost('getPendingSignatures', payload);
export const updateCustomerDealStage = (payload: any) => gasPost('updateCustomerDealStage', payload);
export const updateCustomerDeal = (payload: any) => gasPost('updateCustomerDeal', payload);
export const getCustomerList = (payload?: any) => gasPost('getCustomerList', payload);
export const getCustomerChangeLogs = (payload: any) => gasPost('getCustomerChangeLogs', payload);
export const searchCustomer360 = (payload: any) => gasPost('searchCustomer360', payload);
export const getCustomer360Detail = (payload: any) => gasPost('getCustomer360Detail', payload);
export const submitPublicLead = (payload: any) => gasPost('submitPublicLead', payload);

// ---- Contact_Log ----
export const appendContactLog = (payload: any) => gasPost('appendContactLog', payload);
export const deleteContactLog = (payload: any) => gasPost('deleteContactLog', payload);
export const getContactLogsByCustomer = (payload: any) => gasPost('getContactLogsByCustomer', payload);

// ---- Deal_Detail ----
export const saveDealDetail = (payload: any) => gasPost('saveDealDetail', payload);
export const getDealDetailByCustomer = (payload: any) => gasPost('getDealDetailByCustomer', payload);
export const getDealDetailsForDate = (payload: any) => gasPost('getDealDetailsForDate', payload);
export const markDealDetailRefund = (payload: any) => gasPost('markDealDetailRefund', payload);

// ---- Sales_Control ----
export const appendSalesControlUnit = (payload: any) => gasPost('appendSalesControlUnit', payload);
export const updateSalesControlUnit = (payload: any) => gasPost('updateSalesControlUnit', payload);
export const deleteSalesControlUnit = (payload: any) => gasPost('deleteSalesControlUnit', payload);
export const getSalesControlList = (payload?: any) => gasPost('getSalesControlList', payload);

// ---- Task_List ----
export const appendTask = (payload: any) => gasPost('appendTask', payload);
export const updateTask = (payload: any) => gasPost('updateTask', payload);
export const updateTaskStatus = (payload: any) => gasPost('updateTaskStatus', payload);
export const deleteTask = (payload: any) => gasPost('deleteTask', payload);
export const getTasks = (payload?: any) => gasPost('getTasks', payload);

// ---- Daily_Report ----
export const appendDailyReport = (payload: any) => gasPost('appendDailyReport', payload);
export const updateDailyReport = (payload: any) => gasPost('updateDailyReport', payload);
export const deleteDailyReport = (payload: any) => gasPost('deleteDailyReport', payload);
export const getDailyReportRange = (payload: any) => gasPost('getDailyReportRange', payload);
export const getDailyReportSummary = (payload: any) => gasPost('getDailyReportSummary', payload);
export const getDailyVisitorBreakdown = (payload: any) => gasPost('getDailyVisitorBreakdown', payload);
export const getWeeklyVisitorBreakdown = (payload?: any) => gasPost('getWeeklyVisitorBreakdown', payload);
export const getMonthlyVisitorBreakdown = (payload: any) => gasPost('getMonthlyVisitorBreakdown', payload);
export const getWeeklyReceptionList = (payload: any) => gasPost('getWeeklyReceptionList', payload);
export const getSalesByProject = (payload?: any) => gasPost('getSalesByProject', payload);

// ---- Maintenance_Report ----
export const appendMaintenance = (payload: any) => gasPost('appendMaintenance', payload);
export const updateMaintenance = (payload: any) => gasPost('updateMaintenance', payload);
export const updateMaintenanceStatus = (payload: any) => gasPost('updateMaintenanceStatus', payload);
export const deleteMaintenance = (payload: any) => gasPost('deleteMaintenance', payload);
export const getMaintenanceList = (payload?: any) => gasPost('getMaintenanceList', payload);
export const uploadMaintenancePhoto = (payload: any) => gasPost('uploadMaintenancePhoto', payload);

// ---- Leave_Schedule ----
export const appendLeave = (payload: any) => gasPost('appendLeave', payload);
export const deleteLeave = (payload: any) => gasPost('deleteLeave', payload);
export const getLeaveSchedule = (payload?: any) => gasPost('getLeaveSchedule', payload);
export const getTodayLeave = (payload?: any) => gasPost('getTodayLeave', payload);
export const generateWeeklyLeaveReport = (payload?: any) => gasPost('generateWeeklyLeaveReport', payload);

// ---- Calendar_Notes ----
export const addCalendarNote = (payload: any) => gasPost('addCalendarNote', payload);
export const deleteCalendarNote = (payload: any) => gasPost('deleteCalendarNote', payload);
export const getCalendarNotes = (payload?: any) => gasPost('getCalendarNotes', payload);

// ---- Config / Project / Lists ----
export const getConfigOptions = (payload?: any) => gasPost('getConfigOptions', payload);
export const getProjectList = (payload?: any) => gasPost('getProjectList', payload);
export const getIndustryList = (payload?: any) => gasPost('getIndustryList', payload);
export const getPurchaseMotiveList = (payload?: any) => gasPost('getPurchaseMotiveList', payload);
export const getGeoPoints = (payload?: any) => gasPost('getGeoPoints', payload);

// ---- Weekly Hot Picks ----
export const getWeeklyHotPicks = (payload?: any) => gasPost('getWeeklyHotPicks', payload);
export const submitWeeklyHotPicks = (payload: any) => gasPost('submitWeeklyHotPicks', payload);
export const getMyWeekCustomersForPick = (payload?: any) => gasPost('getMyWeekCustomersForPick', payload);

export { gasGet, gasPost };
