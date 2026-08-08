/**
 * LONGDOM CRM V2 — 吉隆天曜 (jltx) 一次性資料搬遷腳本
 *
 * 用途：把目前 Google Sheets 的 Customer_Data / Contact_Log / Deal_Detail /
 *       User_Role_Table 資料做身份解析（合併同一人的多次來訪）後寫入 Supabase。
 *
 * 使用方式：
 *   1. 貼到 jltx 的 Apps Script 專案（跟主程式 jltx_v9.8_full.gs 同一個專案，
 *      另存一個新檔即可，例如「Migration」）
 *   2. 確認 Script Properties 已設定 SUPABASE_URL / SUPABASE_SERVICE_KEY
 *      （Project Settings → Script Properties）
 *   3. 確認 Supabase 裡已經用 docs/jltx-supabase-schema.sql 建好表，且
 *      organizations（龍登國際）/ projects（吉隆天曜）/ units（105 戶）已 seed
 *   4. 在 Apps Script 編輯器選擇函式 runJltxMigration，按執行（▶）
 *   5. 執行完看「檢視 → 記錄」確認統計數字，並到 Google Sheet 新分頁
 *      「Migration_Report」查看需要人工覆核的清單（身份解析失敗、戶別解析失敗等）
 *
 * 安全設計：
 *   - 這是一次性腳本，執行前會先檢查 Supabase 的 visits 是否已有 jltx 資料，
 *     若有則直接中止，避免重複執行造成資料重複。
 *   - 只會讀取 Google Sheets、寫入 Supabase，不會修改任何現有 Google Sheets 資料。
 *   - 對照文件：docs/jltx-migration-mapping.md、docs/jltx-v2-rollout-plan.md
 *
 * 已知限制（詳見 migration mapping 文件 §13）：
 *   - introduced_units 這種「A3型」格式的舊資料通常沒有樓層資訊，無法定位到
 *     單一 units 列，這類資料 unit_id 會是 null、raw_text 保留原文，屬預期行為。
 *   - customer_name 模糊比對（同名不同 phone）本階段不自動合併，只會被列進
 *     Migration_Report 供人工判斷。
 */

var JLTX_MIGRATION_CONFIG = {
  PROJECT_NAME: '吉隆天曜',
  PROJECT_CODE: 'JLTX',
  SHEETS: {
    USER_ROLE: 'User_Role_Table',
    CUSTOMER: 'Customer_Data',
    CONTACT: 'Contact_Log',
    DEAL: 'Deal_Detail'
  }
};

// =====================================================================
// 入口函式
// =====================================================================

function runJltxMigration() {
  var props = PropertiesService.getScriptProperties();
  var supabaseUrl = props.getProperty('SUPABASE_URL');
  var supabaseKey = props.getProperty('SUPABASE_SERVICE_KEY');
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('請先在 Script Properties 設定 SUPABASE_URL 與 SUPABASE_SERVICE_KEY');
  }

  var ss = SpreadsheetApp.getActive();
  var projectId = getProjectId_(supabaseUrl, supabaseKey, JLTX_MIGRATION_CONFIG.PROJECT_NAME);

  var existingVisits = sbGet_(supabaseUrl, supabaseKey, 'visits',
    'project_id=eq.' + projectId + '&select=id&limit=1');
  if (existingVisits.length > 0) {
    throw new Error('偵測到 Supabase visits 已有吉隆天曜資料，為避免重複搬遷已中止。' +
      '若要重跑，請先在 Supabase 手動清空 visits/contacts/deals/person_unit_interests/' +
      'customer_project_profiles/customer_identities/persons 這些表（順序：先刪子表再刪 persons）。');
  }

  var reviewRows = [];
  var unitsCache = loadUnitsCache_(supabaseUrl, supabaseKey, projectId);

  Logger.log('讀取 Google Sheets...');
  var userRows = readSheetAsObjects_(ss, JLTX_MIGRATION_CONFIG.SHEETS.USER_ROLE);
  var customerRows = readSheetAsObjects_(ss, JLTX_MIGRATION_CONFIG.SHEETS.CUSTOMER);
  var contactRows = readSheetAsObjects_(ss, JLTX_MIGRATION_CONFIG.SHEETS.CONTACT);
  var dealRows = readSheetAsObjects_(ss, JLTX_MIGRATION_CONFIG.SHEETS.DEAL);
  Logger.log('Customer_Data: ' + customerRows.length + ' 列, Contact_Log: ' +
    contactRows.length + ' 列, Deal_Detail: ' + dealRows.length + ' 列');

  Logger.log('搬遷使用者 (User_Role_Table)...');
  var userIdMap = migrateUsers_(supabaseUrl, supabaseKey, userRows);

  Logger.log('身份解析 + 建立 persons / visits...');
  var personStageInfo = {};
  var groups = buildPersonGroups_(customerRows);
  var legacyToPersonId = createPersonsAndVisits_(
    supabaseUrl, supabaseKey, groups, projectId, userIdMap, reviewRows, unitsCache, personStageInfo);
  Logger.log('建立 ' + groups.length + ' 位客戶 (persons)，' + customerRows.length + ' 筆來訪 (visits)');

  Logger.log('搬遷 Contact_Log...');
  var contactStats = migrateContacts_(
    supabaseUrl, supabaseKey, contactRows, legacyToPersonId, projectId, userIdMap, reviewRows, personStageInfo);
  Logger.log('建立 ' + contactStats.contacts + ' 筆 contacts，' + contactStats.followups + ' 筆 followups');

  Logger.log('搬遷 Deal_Detail...');
  var dealCount = migrateDeals_(
    supabaseUrl, supabaseKey, dealRows, legacyToPersonId, projectId, userIdMap, reviewRows, unitsCache, personStageInfo);
  Logger.log('建立 ' + dealCount + ' 筆 deals');

  Logger.log('計算並寫入 customer_project_profiles...');
  var profileCount = upsertCustomerProjectProfiles_(supabaseUrl, supabaseKey, personStageInfo, projectId);
  Logger.log('建立/更新 ' + profileCount + ' 筆 customer_project_profiles');

  writeMigrationReport_(ss, reviewRows);
  Logger.log('搬遷完成，需人工覆核項目共 ' + reviewRows.length + ' 筆，詳見 Migration_Report 分頁');
}

// =====================================================================
// Supabase REST 輔助函式
// =====================================================================

function sbFetch_(method, base, key, path, payload, extraHeaders) {
  var headers = {
    apikey: key,
    Authorization: 'Bearer ' + key,
    'Content-Type': 'application/json',
    // Supabase 新版 secret key 會擋掉「看起來像瀏覽器」的請求（偵測 User-Agent 是否含
    // Mozilla/Chrome 等字樣），GAS UrlFetchApp 預設 User-Agent 會觸發這個保護機制，
    // 這裡明確指定一個非瀏覽器字串繞過誤判（這是伺服器對伺服器的合法呼叫）。
    'User-Agent': 'LONGDOM-CRM-Migration-Script/1.0 (Google Apps Script)'
  };
  if (extraHeaders) {
    for (var k in extraHeaders) headers[k] = extraHeaders[k];
  }
  var options = { method: method, headers: headers, muteHttpExceptions: true };
  if (payload !== undefined) options.payload = JSON.stringify(payload);

  var res = UrlFetchApp.fetch(base + '/rest/v1/' + path, options);
  var code = res.getResponseCode();
  if (code >= 300) {
    throw new Error('Supabase ' + method.toUpperCase() + ' ' + path + ' 失敗 (' + code + '): ' + res.getContentText());
  }
  var text = res.getContentText();
  return text ? JSON.parse(text) : null;
}

function sbGet_(base, key, table, query) {
  return sbFetch_('get', base, key, table + (query ? '?' + query : ''));
}

function sbInsert_(base, key, table, rows, onConflict) {
  if (!rows || !rows.length) return [];
  var headers = { Prefer: 'return=representation' + (onConflict ? ',resolution=merge-duplicates' : '') };
  var path = table + (onConflict ? '?on_conflict=' + onConflict : '');
  return sbFetch_('post', base, key, path, rows, headers);
}

function getProjectId_(base, key, name) {
  var rows = sbGet_(base, key, 'projects', 'name=eq.' + encodeURIComponent(name) + '&select=id');
  if (!rows.length) {
    throw new Error('找不到 project「' + name + '」，請先在 Supabase 執行 schema.sql 的 seed 區塊建立案場資料');
  }
  return rows[0].id;
}

function loadUnitsCache_(base, key, projectId) {
  return sbGet_(base, key, 'units',
    'project_id=eq.' + projectId + '&select=id,building,floor,unit_type,unit_category,unit_label');
}

// =====================================================================
// Google Sheets 讀取輔助函式
// =====================================================================

function readSheetAsObjects_(ss, sheetName) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    Logger.log('警告：找不到分頁「' + sheetName + '」，視為 0 筆資料');
    return [];
  }
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var hasData = row.some(function (c) { return c !== '' && c !== null; });
    if (!hasData) continue;
    var obj = {};
    for (var j = 0; j < headers.length; j++) obj[headers[j]] = row[j];
    rows.push(obj);
  }
  return rows;
}

function formatDate_(v) {
  if (!v) return null;
  var d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return null;
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function toIso_(v) {
  if (!v) return null;
  var d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function chunk_(arr, size) {
  var out = [];
  for (var i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

// =====================================================================
// 手機號碼正規化（對應 fixLeadingZeroPhones 邏輯）
// =====================================================================

function normalizePhone_(raw) {
  if (!raw) return '';
  var s = String(raw).replace(/[^0-9]/g, '');
  if (s.length === 9 && s.charAt(0) === '9') s = '0' + s; // Sheets 常把手機號碼開頭 0 吃掉
  return s;
}

// =====================================================================
// 使用者搬遷（User_Role_Table → users）
// =====================================================================

function migrateUsers_(base, key, userRows) {
  var byLineId = {};
  userRows.forEach(function (r) {
    var lid = r.line_user_id;
    if (!lid) return;
    var cur = byLineId[lid];
    if (!cur) { byLineId[lid] = r; return; }
    var curActive = cur.status === 'active';
    var rActive = r.status === 'active';
    if (rActive && !curActive) { byLineId[lid] = r; return; }
    if (rActive === curActive) {
      var curT = cur.updated_at ? new Date(cur.updated_at).getTime() : 0;
      var rT = r.updated_at ? new Date(r.updated_at).getTime() : 0;
      if (rT > curT) byLineId[lid] = r;
    }
  });

  var payload = Object.keys(byLineId).map(function (lid) {
    var r = byLineId[lid];
    var role = ['sales', 'manager', 'admin'].indexOf(r.role) >= 0 ? r.role : 'sales';
    var status = ['pending', 'active', 'inactive'].indexOf(r.status) >= 0 ? r.status : 'pending';
    return {
      line_user_id: lid,
      display_name: r.display_name || '',
      role: role,
      status: status,
      job_title: r.job_title || null
    };
  });

  var inserted = sbInsert_(base, key, 'users', payload, 'line_user_id');
  var map = {};
  inserted.forEach(function (u) { map[u.line_user_id] = u.id; });
  return map;
}

// Customer_Data / Contact_Log / Deal_Detail 裡出現、但不在 User_Role_Table 的使用者，補一筆最小資料
function ensureUserId_(base, key, userIdMap, lineUserId, displayName) {
  if (!lineUserId) return null;
  if (userIdMap[lineUserId]) return userIdMap[lineUserId];
  var inserted = sbInsert_(base, key, 'users', [{
    line_user_id: lineUserId, display_name: displayName || '', role: 'sales', status: 'active'
  }], 'line_user_id');
  var id = inserted[0].id;
  userIdMap[lineUserId] = id;
  return id;
}

// =====================================================================
// 身份解析：依 phone 分組（主要信號），無 phone 的另外標記待覆核
// =====================================================================

function buildPersonGroups_(customerRows) {
  var byPhone = {};
  var groups = [];
  var noPhone = [];

  customerRows.forEach(function (row) {
    var phone = normalizePhone_(row.phone);
    if (!phone) { noPhone.push(row); return; }
    if (!byPhone[phone]) {
      byPhone[phone] = { phone: phone, rows: [] };
      groups.push(byPhone[phone]);
    }
    byPhone[phone].rows.push(row);
  });

  noPhone.forEach(function (row) {
    groups.push({ phone: '', rows: [row], needsReview: 'no_phone' });
  });

  groups.forEach(function (g) {
    g.rows.sort(function (a, b) { return new Date(a.visit_date) - new Date(b.visit_date); });
  });

  return groups;
}

// =====================================================================
// 建立 persons / customer_identities / visits / person_unit_interests
// =====================================================================

function createPersonsAndVisits_(base, key, groups, projectId, userIdMap, reviewRows, unitsCache, personStageInfo) {
  var legacyToPersonId = {};

  groups.forEach(function (group) {
    var rows = group.rows;
    var first = rows[0];
    var latest = rows[rows.length - 1];

    var personRes = sbInsert_(base, key, 'persons', [{
      name: latest.customer_name || '',
      phone: group.phone || null,
      district: latest.district || null,
      first_source: first.source || null
    }]);
    var personId = personRes[0].id;

    if (group.phone) {
      sbInsert_(base, key, 'customer_identities', [{
        person_id: personId, type: 'phone', value: group.phone, verified: false
      }], 'type,value');
    }

    if (group.needsReview) {
      reviewRows.push(['身份解析', group.needsReview, latest.customer_name || '', latest.phone || '',
        rows.map(function (r) { return r.customer_id; }).join(',')]);
    }

    rows.forEach(function (r) {
      if (r.linked_customer_id) {
        reviewRows.push(['linked_customer_id 對照（僅記錄，未強制合併）', '', r.customer_name || '',
          r.phone || '', r.customer_id + ' -> ' + r.linked_customer_id]);
      }
    });

    var hasRevisit = rows.some(function (r) { return r.visit_type === '回籠'; });
    var lastSalesUserId = ensureUserId_(base, key, userIdMap, latest.sales_line_user_id, latest.sales_name);
    personStageInfo[personId] = {
      firstSource: first.source || null,
      lastActivityAt: toIso_(latest.visit_date) || new Date().toISOString(),
      hasRevisit: hasRevisit,
      hasDealActive: false,
      hasSignedDeal: false,
      dealContractStatus: null,
      lastSalesUserId: lastSalesUserId
    };

    var visitPayload = rows.map(function (r) {
      return {
        legacy_customer_id: String(r.customer_id || ''),
        person_id: personId,
        project_id: projectId,
        visit_type: r.visit_type === '回籠' ? '回籠' : '初訪',
        visited_at: formatDate_(r.visit_date) || formatDate_(new Date()),
        customer_name_at_visit: r.customer_name || null,
        phone_at_visit: r.phone ? String(r.phone) : null,
        age_range: r.age_range || null,
        gender: r.gender || null,
        marital_status: r.marital_status || null,
        district_at_visit: r.district || null,
        occupation_industry: r.occupation_industry || null,
        purchase_motive: r.purchase_motive || null,
        source: r.source || null,
        room_types: r.room_types ? String(r.room_types).split('、').filter(Boolean) : null,
        budget: r.budget || null,
        objections: r.issues ? String(r.issues).split('、').filter(Boolean) : null,
        deal_status_snapshot: r.deal_status || null,
        status_note: r.status_note || null,
        note: r.note || null,
        visit_time_slot: r.visit_time_slot || null,
        sqft_requirement: r.sqft_requirement || null,
        room_requirement_note: r.room_requirement_note || null,
        referrer_name: r.referrer_name || null,
        sales_user_id: ensureUserId_(base, key, userIdMap, r.sales_line_user_id, r.sales_name),
        created_by_user_id: ensureUserId_(base, key, userIdMap, r.created_by_line_user_id, r.created_by_name)
      };
    });

    var visitRes = sbInsert_(base, key, 'visits', visitPayload);

    rows.forEach(function (r, i) {
      legacyToPersonId[String(r.customer_id)] = { personId: personId, visitId: visitRes[i].id };

      var texts = [r.introduced_units, r.deal_unit].filter(Boolean);
      texts.forEach(function (text) {
        String(text).split(/[、,\/]/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (piece) {
          var parsed = parseUnitText_(piece);
          var unitId = parsed ? findUnitId_(unitsCache, parsed) : null;
          sbInsert_(base, key, 'person_unit_interests', [{
            person_id: personId, unit_id: unitId, visit_id: visitRes[i].id, raw_text: piece
          }]);
          if (!unitId) {
            reviewRows.push(['戶別解析失敗', piece, r.customer_name || '', r.phone || '', r.customer_id]);
          }
        });
      });
    });
  });

  return legacyToPersonId;
}

// 對應 countByUnitField 的解析邏輯（jltx_v9.8_full.gs:1839–1853），
// 但舊資料通常只有「A3型」這種棟別+戶型，沒有樓層，所以 floor 常會是 null。
function parseUnitText_(text) {
  var m = /([AaBb])\s*棟?\s*(\d)/.exec(text); // 大小寫都接受，對應手打資料常見的 a1/b1 寫法
  if (!m) return null;
  var building = m[1].toUpperCase();
  var unitType = parseInt(m[2], 10);
  var floor = null;
  var floorM = /(\d{1,2})\s*[Ff樓]/.exec(text);
  if (floorM) floor = parseInt(floorM[1], 10);
  return { building: building, unitType: unitType, floor: floor };
}

function findUnitId_(unitsCache, parsed) {
  if (parsed.floor == null) return null; // 沒有樓層資訊，無法定位到單一 units 列
  var found = unitsCache.filter(function (u) {
    return u.building === parsed.building && u.unit_type === parsed.unitType && u.floor === parsed.floor;
  })[0];
  return found ? found.id : null;
}

// =====================================================================
// Contact_Log → contacts + followups
// =====================================================================

function migrateContacts_(base, key, contactRows, legacyToPersonId, projectId, userIdMap, reviewRows, personStageInfo) {
  var contactPayload = [];
  var followupPayload = [];

  contactRows.forEach(function (r) {
    var ref = legacyToPersonId[String(r.customer_id)];
    if (!ref) {
      reviewRows.push(['Contact_Log 找不到對應 person（customer_id 可能已被刪除）', '',
        r.customer_name || '', r.phone || '', r.customer_id]);
      return;
    }
    contactPayload.push({
      legacy_contact_id: String(r.contact_id || ''),
      person_id: ref.personId,
      project_id: projectId,
      contacted_at: toIso_(r.contact_date) || new Date().toISOString(),
      method: r.contact_method || '',
      note: r.note || null,
      created_by_user_id: ensureUserId_(base, key, userIdMap, r.created_by_line_user_id, null)
    });

    if (r.next_followup_date) {
      followupPayload.push({
        person_id: ref.personId,
        project_id: projectId,
        due_at: formatDate_(r.next_followup_date),
        plan_note: r.note || null,
        status: 'pending'
      });
    }

    var info = personStageInfo[ref.personId];
    if (info) {
      var t = toIso_(r.contact_date);
      if (t && (!info.lastActivityAt || t > info.lastActivityAt)) info.lastActivityAt = t;
    }
  });

  var insertedContacts = sbInsert_(base, key, 'contacts', contactPayload);
  chunk_(followupPayload, 200).forEach(function (batch) { sbInsert_(base, key, 'followups', batch); });

  return { contacts: insertedContacts.length, followups: followupPayload.length };
}

// =====================================================================
// Deal_Detail → deals
// =====================================================================

function migrateDeals_(base, key, dealRows, legacyToPersonId, projectId, userIdMap, reviewRows, unitsCache, personStageInfo) {
  var payload = [];

  dealRows.forEach(function (r) {
    var ref = legacyToPersonId[String(r.customer_id)];
    if (!ref) {
      reviewRows.push(['Deal_Detail 找不到對應 person（customer_id 可能已被刪除）', '',
        r.customer_name || '', '', r.customer_id]);
      return;
    }

    var unitId = null;
    if (r.unit) {
      var parsed = parseUnitText_(String(r.unit));
      unitId = parsed ? findUnitId_(unitsCache, parsed) : null;
      if (!unitId) reviewRows.push(['Deal_Detail 戶別解析失敗', String(r.unit), r.customer_name || '', '', r.deal_id]);
    }

    payload.push({
      legacy_deal_id: String(r.deal_id || ''),
      person_id: ref.personId,
      project_id: projectId,
      unit_id: unitId,
      house_base_price: r.house_base_price || null,
      parking_base_price: r.parking_base_price || null,
      premium: r.premium || null,
      deal_price: r.deal_price || null,
      deposit_amount: r.deposit_amount || null,
      contract_status: r.contract_status || null,
      expected_sign_date: formatDate_(r.expected_sign_date),
      signed_date: formatDate_(r.signed_date),
      sales_user_id: ensureUserId_(base, key, userIdMap, r.sales_line_user_id, r.salesperson),
      created_by_user_id: ensureUserId_(base, key, userIdMap, r.created_by_line_user_id, null),
      status: r.status === '退戶' ? '退戶' : 'active',
      refund_reason: r.refund_reason || null,
      refund_date: formatDate_(r.refund_date)
    });

    var info = personStageInfo[ref.personId];
    if (info && r.status !== '退戶') {
      if (r.contract_status === '已簽約') info.hasSignedDeal = true;
      info.hasDealActive = true;
      info.dealContractStatus = r.contract_status || info.dealContractStatus;
    }
    var t = toIso_(r.signed_date) || toIso_(r.expected_sign_date);
    if (info && t && (!info.lastActivityAt || t > info.lastActivityAt)) info.lastActivityAt = t;
  });

  var inserted = sbInsert_(base, key, 'deals', payload);
  return inserted.length;
}

// =====================================================================
// customer_project_profiles：依收集到的 stage 資訊 upsert
// =====================================================================

function upsertCustomerProjectProfiles_(base, key, personStageInfo, projectId) {
  var payload = Object.keys(personStageInfo).map(function (personId) {
    var info = personStageInfo[personId];
    var stage = 'VISITED';
    if (info.hasSignedDeal) stage = 'SIGNED';
    else if (info.hasDealActive) stage = info.dealContractStatus === '待簽約' ? 'PENDING_CONTRACT' : 'RESERVED';
    else if (info.hasRevisit) stage = 'REVISIT';

    return {
      person_id: personId,
      project_id: projectId,
      stage: stage,
      assigned_sales_id: info.lastSalesUserId || null,
      lead_source: info.firstSource || null,
      last_activity_at: info.lastActivityAt || null
    };
  });

  var count = 0;
  chunk_(payload, 200).forEach(function (batch) {
    var res = sbInsert_(base, key, 'customer_project_profiles', batch, 'person_id,project_id');
    count += res.length;
  });
  return count;
}

// =====================================================================
// 覆核清單輸出（Migration_Report 分頁）
// =====================================================================

function writeMigrationReport_(ss, reviewRows) {
  var sheetName = 'Migration_Report';
  var sheet = ss.getSheetByName(sheetName);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(sheetName);
  sheet.appendRow(['類型', '內容', '客戶姓名', '電話', '備註/來源ID']);
  if (reviewRows.length) {
    sheet.getRange(2, 1, reviewRows.length, 5).setValues(reviewRows);
  }
  sheet.setFrozenRows(1);
}
