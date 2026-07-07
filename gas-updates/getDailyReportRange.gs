/**
 * 新增 API：銷售日報歷史區間查詢
 *
 * 用途：
 *   前端「銷售日報」頁面新增了「近3個月／近6個月」歷史清單，以及「本週vs上週」
 *   「本月vs上月」比較卡片，資料統計全部在前端（hstd.html / hsyy.html）即時運算，
 *   這支 function 只負責把 Daily_Report 分頁裡「N 個月內」的原始列資料整批回傳，
 *   不需要在後端做任何彙總或排程觸發。
 *
 * 部署方式（比照既有 SOP）：
 *   1. 把這支 function 貼進「華雄天地」與「華雄音樂匯」兩個 Apps Script 專案
 *      （CONFIG.SPREADSHEET_ID 已經在專案內設定好，不用改）。
 *   2. 部署 → 管理部署 → 編輯（鉛筆圖示）→ 版本選「新版本」→ 部署。
 *   3. 若專案的 doGet/doPost 是用一個 action 白名單陣列或 switch 手動列出可呼叫的
 *      function 名稱（而不是用 this[action](payload) 動態呼叫），
 *      要記得把 'getDailyReportRange' 加進那個白名單/switch，否則前端呼叫會得到
 *      「未知的 action」之類的錯誤。
 *
 * 假設的 Daily_Report 分頁欄位（依前端現有欄位推斷，若實際表頭不同請自行調整
 * headers[j] 對應的欄位名稱）：
 *   report_date, salesperson 或 created_by, visitor_count, first_visit_count,
 *   revisit_count, call_count, deal_count, transaction_units, notes
 */
function getDailyReportRange(payload) {
  try {
    var months = Math.max(1, Math.min(12, Number(payload.months) || 3));
    var cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    var cutoffStr = Utilities.formatDate(cutoff, 'Asia/Taipei', 'yyyy-MM-dd');

    var ss = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    var sheet = ss.getSheetByName('Daily_Report');
    if (!sheet) return { ok: false, error: '找不到 Daily_Report 分頁' };

    var values = sheet.getDataRange().getValues();
    if (values.length < 2) return { ok: true, data: [] };

    var headers = values[0];
    var rows = [];
    for (var i = 1; i < values.length; i++) {
      var row = values[i];
      var obj = {};
      for (var j = 0; j < headers.length; j++) obj[headers[j]] = row[j];
      var reportDate = String(obj.report_date || '').substring(0, 10);
      if (reportDate && reportDate >= cutoffStr) rows.push(obj);
    }
    return { ok: true, data: rows };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
