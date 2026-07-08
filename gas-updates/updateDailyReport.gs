/**
 * 新增 API：主管修改日報（僅限提交後 3 天內）
 *
 * 用途：
 *   「銷售日報」頁面選定日期後，reportList 裡每一筆日報旁邊，主管／admin
 *   會看到一顆「✏️ 修改」按鈕（業務本人看不到，前端 state.user.role==='sales'
 *   會隱藏該按鈕），可以修改已提交日報的業績數字、成交戶別、備註。若日報日期
 *   距今已超過 3 天，按鈕會自動隱藏；本函式在後端也會再檢查一次天數與角色，
 *   不能只靠前端擋（前端檢查只是 UX，任何人都能直接呼叫這支 API）。
 *
 * 部署方式（比照既有 SOP）：
 *   1. 把這支 function 貼進「華雄天地」與「華雄音樂匯」兩個 Apps Script 專案
 *      （CONFIG.SPREADSHEET_ID 已經在專案內設定好，不用改）。
 *   2. 部署 → 管理部署 → 編輯（鉛筆圖示）→ 版本選「新版本」→ 部署。
 *   3. 若專案的 doGet/doPost 是用一個 action 白名單陣列或 switch 手動列出可呼叫的
 *      function 名稱（而不是用 this[action](payload) 動態呼叫），
 *      要記得把 'updateDailyReport' 加進那個白名單/switch，否則前端呼叫會得到
 *      「未知的 action」之類的錯誤。
 *
 * 找到要修改的那一列（比對方式）：
 *   Daily_Report 分頁目前沒有唯一 ID 欄位，這裡用「report_date + 提交人姓名」
 *   找列（姓名欄位可能叫 salesperson 或 created_by，兩種都會嘗試比對，取其中
 *   有值的那一個）。如果同一人同一天有重複提交多筆，只會修改「最後（最新）」
 *   的一筆。如果貴公司的 Daily_Report 分頁其實有唯一 ID 欄位（例如
 *   report_id），改用該欄位比對會更準確、更保險，請自行調整
 *   nameCol/targetRow 那段邏輯。
 *
 * 角色驗證：
 *   從 Users 分頁用 line_user_id 找出呼叫者（payload.lineUserId）的 role，
 *   只有 manager / admin 可以呼叫成功，sales 會被拒絕。若 Users 分頁欄位
 *   名稱不同，請自行調整 lidCol / roleCol 對應的欄位名稱。
 *
 * 假設的 Daily_Report 分頁欄位（依前端現有欄位推斷，若實際表頭不同請自行
 * 調整 headers.indexOf(...) 對應的欄位名稱）：
 *   report_date, salesperson 或 created_by, visitor_count, first_visit_count,
 *   revisit_count, deal_count, transaction_units, notes
 */
function updateDailyReport(payload) {
  try {
    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);

    // 1) 驗證呼叫者角色：僅 manager / admin 可修改日報
    var usersSheet = ss.getSheetByName('Users');
    if (!usersSheet) return { ok: false, error: '找不到 Users 分頁' };
    var uValues = usersSheet.getDataRange().getValues();
    var uHeaders = uValues[0];
    var lidCol = uHeaders.indexOf('line_user_id');
    var roleCol = uHeaders.indexOf('role');
    if (lidCol === -1 || roleCol === -1) return { ok: false, error: 'Users 分頁缺少 line_user_id 或 role 欄位' };
    var callerRole = '';
    for (var u = 1; u < uValues.length; u++) {
      if (String(uValues[u][lidCol]) === String(payload.lineUserId)) { callerRole = uValues[u][roleCol]; break; }
    }
    if (callerRole !== 'manager' && callerRole !== 'admin') {
      return { ok: false, error: '僅限主管修改日報' };
    }

    // 2) 找到 Daily_Report 分頁裡對應的那一列
    var sheet = ss.getSheetByName('Daily_Report');
    if (!sheet) return { ok: false, error: '找不到 Daily_Report 分頁' };
    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return { ok: false, error: '找不到該筆日報' };
    var headers = values[0];

    var dateCol = headers.indexOf('report_date');
    var nameCol = headers.indexOf('salesperson');
    if (nameCol === -1) nameCol = headers.indexOf('created_by');
    if (dateCol === -1 || nameCol === -1) return { ok: false, error: 'Daily_Report 缺少 report_date 或 salesperson/created_by 欄位' };

    var targetDate = String(payload.report_date || '').substring(0, 10);
    var targetName = String(payload.submitter_name || '');
    var targetRow = -1;
    for (var i = 1; i < values.length; i++) {
      var rowDate = String(values[i][dateCol]).substring(0, 10);
      var rowName = String(values[i][nameCol]);
      if (rowDate === targetDate && rowName === targetName) targetRow = i + 1; // 保留最後一筆符合的（sheet 列號從 1 起算）
    }
    if (targetRow === -1) return { ok: false, error: '找不到該筆日報' };

    // 3) 檢查是否已超過 3 天（用台灣時間的「日期」比較，不管時分秒）
    var todayStr = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd');
    var diffDays = Math.round((new Date(todayStr + 'T00:00:00Z') - new Date(targetDate + 'T00:00:00Z')) / 86400000);
    if (diffDays > 3) {
      return { ok: false, error: '此日報已超過3天，無法修改' };
    }

    // 4) 更新欄位（只更新業績數字／成交戶別／備註，不動 report_date 與提交人）
    var editable = {
      visitor_count: payload.visitor_count,
      first_visit_count: payload.first_visit_count,
      revisit_count: payload.revisit_count,
      deal_count: payload.deal_count,
      transaction_units: payload.transaction_units,
      notes: payload.notes
    };
    for (var key in editable) {
      var col = headers.indexOf(key);
      if (col !== -1 && editable[key] !== undefined) {
        sheet.getRange(targetRow, col + 1).setValue(editable[key]);
      }
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
