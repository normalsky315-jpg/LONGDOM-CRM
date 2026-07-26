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
 * 部署方式：
 *   1. 把這支 function 貼進「華雄天地」與「華雄音樂匯」兩個 Apps Script 專案
 *      （直接沿用專案裡既有的 CONFIG / getUserContext / updateRowById /
 *      readSheetAsObjects / todayTW / ok / fail 等共用函式，不用重複定義）。
 *   2. 在 doPost 的 switch 裡加一行：
 *        case 'updateDailyReport': return jsonResponse(updateDailyReport(payload));
 *   3. 部署 → 管理部署 → 編輯（鉛筆圖示）→ 版本選「新版本」→ 部署（用「編輯
 *      現有部署」，exec 網址不會變，不用改 hstd.html / hsyy.html 的 GAS_URL）。
 *
 * 找到要修改的那一列：
 *   Daily_Report 分頁本來就有唯一的 report_id 欄位（appendDailyReport 用
 *   genId('RPT') 產生），直接用 report_id 比對即可，不需要用日期+姓名猜。
 *
 * 權限：
 *   - 只有 manager / admin 能呼叫，sales 會被拒絕
 *   - manager 只能修改自己案場（project_name）的日報，admin 不限案場
 */
function updateDailyReport(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('僅限主管修改日報');
    if (!payload.report_id) return fail('report_id 必填');

    var rows = readSheetAsObjects(CONFIG.SHEETS.DAILY_REPORT);
    var original = null;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].report_id) === String(payload.report_id)) { original = rows[i]; break; }
    }
    if (!original) return fail('找不到該筆日報');

    if (ctx.role !== CONFIG.ROLES.ADMIN && original.project_name !== ctx.projectName) {
      return fail('無權限修改其他案場的日報');
    }

    var reportDate = String(original.report_date || '').substring(0, 10);
    var diffDays = Math.round(
      (new Date(todayTW() + 'T00:00:00Z') - new Date(reportDate + 'T00:00:00Z')) / 86400000
    );
    if (diffDays > 3) return fail('此日報已超過3天，無法修改');

    var updates = {};
    ['visitor_count', 'first_visit_count', 'revisit_count', 'deal_count', 'transaction_units', 'notes']
      .forEach(function(field) {
        if (payload[field] !== undefined) updates[field] = payload[field];
      });

    updateRowById(CONFIG.SHEETS.DAILY_REPORT, 'report_id', payload.report_id, updates);

    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.DAILY_REPORT, payload.report_id,
      ctx.displayName + ' 修改日報: ' + (original.salesperson || original.created_by || '') + ' ' + reportDate);

    return ok({ report_id: payload.report_id });
  } catch (err) {
    return fail(err.message);
  }
}
