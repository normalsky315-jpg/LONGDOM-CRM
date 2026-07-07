/**
 * ⚠️ 這是「補充片段」，不是完整檔案！
 *
 * 強烈建議：與其自己手動改 3 個地方，不如把你 hsyy（華雄音樂匯）現在
 * Apps Script 裡完整的程式碼複製貼給 Claude，讓它比照 hstd 的做法，
 * 產生一份完整版檔案給你「整份覆蓋貼上」即可，比較不會漏改東西。
 *
 * 如果你還是想自己手動加，請照下面 4 步做：
 *
 * 【步驟 1】在你現有的主檔案裡，找到 CONFIG.SHEETS 裡的這一行：
 *     LEAVE_SCHEDULE: 'Leave_Schedule'
 *   改成：
 *     LEAVE_SCHEDULE: 'Leave_Schedule',
 *     CALENDAR_NOTES: 'Calendar_Notes'
 *
 * 【步驟 2】在 doGet 的 switch 裡，找到 case 'deleteLeave': 那一段，
 *   在它後面（default: 之前）加上：
 *
 *     case 'getCalendarNotes':
 *       return jsonResponse(getCalendarNotes(payload.lineUserId ? payload : {
 *         lineUserId: e.parameter.lineUserId,
 *         startDate:  e.parameter.startDate,
 *         endDate:    e.parameter.endDate
 *       }));
 *     case 'addCalendarNote':
 *       return jsonResponse(addCalendarNote(payload));
 *     case 'deleteCalendarNote':
 *       return jsonResponse(deleteCalendarNote(payload));
 *
 * 【步驟 3】把游標移到你主檔案「最後一行的最後面」，Enter 換行，
 *   把下面這一整段（到檔案結尾）貼上去 —— 只能加在最後面，
 *   絕對不要整份覆蓋、也不要覆蓋掉中間的任何內容！
 *
 * 【步驟 4】貼完後存檔，執行一次 ensureCalendarNotesSheet()
 *   （只會新增 Calendar_Notes 這一個分頁，不會動到其他資料，
 *   絕對不要執行 initAllSheets()，那個會清空所有分頁的既有資料！）
 *   最後部署 → 管理部署 → 編輯 → 新版本 → 部署。
 */

// ★ 既有帳號升級用：只新增 Calendar_Notes 分頁，不會動到其他分頁的資料
function ensureCalendarNotesSheet() {
  var ss = getCrmSS();
  var name = CONFIG.SHEETS.CALENDAR_NOTES;
  var sh = ss.getSheetByName(name);
  if (sh) { Logger.log('Calendar_Notes 已存在，不需要重建'); return; }
  sh = ss.insertSheet(name);
  var headers = ['note_id','project_name','note_date','content','created_by_line_user_id','created_by_name','created_at'];
  sh.getRange(1,1,1,headers.length).setValues([headers]);
  sh.getRange(1,1,1,headers.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  Logger.log('✓ Calendar_Notes 分頁已建立');
}

// ==================== Calendar Notes（行事曆重要事項） ====================
function getCalendarNotes(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx && payload && payload.lineUserId === 'DEV') {
      ctx = { lineUserId: 'DEV', role: 'admin', projectName: '', status: 'active' };
    }
    if (!ctx) return fail('未授權');

    var startDate = String(payload.startDate || '').substring(0, 10);
    var endDate   = String(payload.endDate   || '').substring(0, 10);

    var rows = readSheetAsObjects(CONFIG.SHEETS.CALENDAR_NOTES).filter(function(r) {
      var d = String(r.note_date).substring(0, 10);
      if (startDate && d < startDate) return false;
      if (endDate   && d > endDate)   return false;
      if (ctx.role === CONFIG.ROLES.ADMIN) return true;
      return r.project_name === ctx.projectName;
    });

    rows.sort(function(a, b) { return String(a.note_date).localeCompare(String(b.note_date)); });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

function addCalendarNote(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx && payload.lineUserId === 'DEV') {
      ctx = { lineUserId: 'DEV', displayName: '測試', role: 'admin', projectName: '', status: 'active' };
    }
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限，需主管以上');
    if (!payload.note_date) return fail('note_date 必填');
    if (!payload.content)   return fail('內容必填');

    var projectName = ctx.role === CONFIG.ROLES.ADMIN
      ? (payload.project_name || ctx.projectName || '') : ctx.projectName;

    var noteId = genId('NOTE');
    appendObjectToSheet(CONFIG.SHEETS.CALENDAR_NOTES, {
      note_id: noteId,
      project_name: projectName,
      note_date: String(payload.note_date).substring(0, 10),
      content: payload.content,
      created_by_line_user_id: ctx.lineUserId,
      created_by_name: ctx.displayName,
      created_at: nowTW()
    });
    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.CALENDAR_NOTES, noteId,
      ctx.displayName + ' 新增重要事項: ' + payload.content);
    return ok({ note_id: noteId });
  } catch (err) { return fail(err.message); }
}

function deleteCalendarNote(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx && payload.lineUserId === 'DEV') {
      ctx = { lineUserId: 'DEV', role: 'admin', projectName: '', status: 'active' };
    }
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');
    if (!payload.note_id) return fail('note_id 必填');

    var sh      = getSheet(CONFIG.SHEETS.CALENDAR_NOTES);
    var data    = sh.getDataRange().getValues();
    var headers = data[0];
    var idCol   = headers.indexOf('note_id');

    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) !== String(payload.note_id)) continue;
      sh.deleteRow(i + 1);
      writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.CALENDAR_NOTES,
        payload.note_id, ctx.displayName + ' 刪除重要事項');
      return ok({ note_id: payload.note_id });
    }
    return fail('找不到該筆事項');
  } catch (err) { return fail(err.message); }
}
