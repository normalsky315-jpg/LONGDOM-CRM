/**
 * LONGDOM CRM V2 — 吉隆天曜 (jltx) GAS ↔ Supabase 雙寫模組
 *
 * 用途：在既有 appendCustomerData / updateCustomerData / appendContactLog /
 *       saveDealDetail 成功寫入 Google Sheets 之後，額外同步一份到 Supabase，
 *       讓 Step 2（jltx_migration_v1.gs）搬遷過去的資料能持續跟上新資料，
 *       而不是搬遷當下那一刻的靜態快照。
 *
 * 對應文件：docs/jltx-v2-rollout-plan.md Step 3
 *
 * 設計原則：
 *   - Supabase 寫入失敗絕對不能影響 Google Sheets 的主流程。所有對外的
 *     dwSyncXxx_() 函式內部都自己 try/catch，失敗只寫 Logger.log，不會
 *     throw 出去，也不會擋住原本的 Sheets 寫入。
 *   - 函式命名刻意加 dw 前綴（dwFetch_/dwGet_/dwInsert_/dwPatch_...），
 *     避免跟 jltx_migration_v1.gs 裡同名的 sbFetch_/sbGet_/sbInsert_ 在
 *     同一個 Apps Script 專案裡撞名（GAS 同專案內所有 .gs 檔共用全域作用域）。
 *     若之後要把 migration 那份腳本從專案裡刪掉，這份可以獨立運作。
 *   - 身份解析邏輯跟搬遷腳本一致：以正規化後的 phone 為主要依據找/建 person。
 *   - customer_project_profiles.stage 只會往「更進階」的方向更新，不會讓
 *     已經到 SIGNED 的人被一筆新的初訪修改打回 VISITED（見 dwUpsertProfile_）。
 *
 * 安裝方式：
 *   1. 這份檔案跟 jltx_v9.8_full.gs 貼在同一個 Apps Script 專案（新增一個檔案，
 *      例如命名「DualWrite」），整份貼上即可。
 *   2. jltx_v9.8_full.gs 裡的四個呼叫點已經在 repo 這份副本裡加好對應的
 *      dwSyncXxx_() 呼叫，直接把整份 jltx_v9.8_full.gs 覆蓋貼上即可，
 *      跟你平常更新主程式的方式一樣。
 *   3. Script Properties 沿用 jltx_migration_v1.gs 已設定好的
 *      SUPABASE_URL / SUPABASE_SERVICE_KEY，不用重新設定。
 */

var DW_PROJECT_NAME = '吉隆天曜';
var DW_STAGE_RANK = {
  NEW: 0, CONTACTED: 1, VISITED: 2, INTERESTED: 3, REVISIT: 4,
  NEGOTIATION: 5, RESERVED: 6, PENDING_CONTRACT: 7, SIGNED: 8, CLOSED: 9,
  DORMANT: 0, LOST: 0, REFUND: 0
};

// =====================================================================
// Supabase REST 輔助函式
// =====================================================================

function dwFetch_(method, path, payload, extraHeaders) {
  var props = PropertiesService.getScriptProperties();
  var base = props.getProperty('SUPABASE_URL');
  var key = props.getProperty('SUPABASE_SERVICE_KEY');
  if (!base || !key) throw new Error('缺少 Script Properties: SUPABASE_URL / SUPABASE_SERVICE_KEY');

  var headers = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  if (extraHeaders) { for (var k in extraHeaders) headers[k] = extraHeaders[k]; }
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

function dwGet_(table, query) {
  return dwFetch_('get', table + (query ? '?' + query : ''));
}

function dwInsert_(table, rows, onConflict) {
  if (!rows || !rows.length) return [];
  var headers = { Prefer: 'return=representation' + (onConflict ? ',resolution=merge-duplicates' : '') };
  var path = table + (onConflict ? '?on_conflict=' + onConflict : '');
  return dwFetch_('post', path, rows, headers);
}

function dwPatch_(table, filterQuery, updates) {
  return dwFetch_('patch', table + '?' + filterQuery, updates, { Prefer: 'return=representation' });
}

function dwFormatDate_(v) {
  if (!v) return null;
  var d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return null;
  return Utilities.formatDate(d, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function dwToIso_(v) {
  if (!v) return null;
  var d = (v instanceof Date) ? v : new Date(v);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function dwNormalizePhone_(raw) {
  if (!raw) return '';
  var s = String(raw).replace(/[^0-9]/g, '');
  if (s.length === 9 && s.charAt(0) === '9') s = '0' + s;
  return s;
}

function dwGetProjectId_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('dw_project_id');
  if (cached) return cached;
  var rows = dwGet_('projects', 'name=eq.' + encodeURIComponent(DW_PROJECT_NAME) + '&select=id');
  if (!rows.length) throw new Error('Supabase 找不到 project「' + DW_PROJECT_NAME + '」，請先確認 seed 資料存在');
  cache.put('dw_project_id', rows[0].id, 300);
  return rows[0].id;
}

// 依 phone 找到既有 person，找不到就新建（跟搬遷腳本的身份解析邏輯一致）
function dwFindOrCreatePerson_(name, phone, district, source) {
  var normPhone = dwNormalizePhone_(phone);
  if (normPhone) {
    var idRows = dwGet_('customer_identities',
      'type=eq.phone&value=eq.' + encodeURIComponent(normPhone) + '&select=person_id&limit=1');
    if (idRows.length) return idRows[0].person_id;
  }
  var personRes = dwInsert_('persons', [{
    name: name || '', phone: normPhone || null, district: district || null, first_source: source || null
  }]);
  var personId = personRes[0].id;
  if (normPhone) {
    dwInsert_('customer_identities',
      [{ person_id: personId, type: 'phone', value: normPhone, verified: false }], 'type,value');
  }
  return personId;
}

function dwFindUserId_(lineUserId, displayName) {
  if (!lineUserId) return null;
  var rows = dwGet_('users', 'line_user_id=eq.' + encodeURIComponent(lineUserId) + '&select=id');
  if (rows.length) return rows[0].id;
  var inserted = dwInsert_('users',
    [{ line_user_id: lineUserId, display_name: displayName || '', role: 'sales', status: 'active' }], 'line_user_id');
  return inserted[0].id;
}

// 只往「更進階」的方向更新 stage，避免舊資料的一筆小修改把已經到 SIGNED 的人打回去
function dwUpsertProfile_(personId, projectId, opts) {
  var existing = dwGet_('customer_project_profiles',
    'person_id=eq.' + personId + '&project_id=eq.' + projectId + '&select=*');
  var cur = existing[0];
  var nextStage = opts.stage;
  if (cur && DW_STAGE_RANK[cur.stage] > DW_STAGE_RANK[nextStage]) {
    nextStage = cur.stage;
  }
  var payload = {
    person_id: personId,
    project_id: projectId,
    stage: nextStage,
    assigned_sales_id: opts.assignedSalesId || (cur ? cur.assigned_sales_id : null),
    lead_source: (cur && cur.lead_source) ? cur.lead_source : (opts.leadSource || null),
    last_activity_at: opts.lastActivityAt || new Date().toISOString()
  };
  dwInsert_('customer_project_profiles', [payload], 'person_id,project_id');
}

// =====================================================================
// Hook：appendCustomerData 成功寫入 Sheets 後呼叫
// =====================================================================

function dwSyncVisitCreate_(row) {
  try {
    var projectId = dwGetProjectId_();
    var personId = dwFindOrCreatePerson_(row.customer_name, row.phone, row.district, row.source);
    var salesUserId = dwFindUserId_(row.sales_line_user_id, row.sales_name);
    var createdByUserId = dwFindUserId_(row.created_by_line_user_id, row.created_by_name);

    dwInsert_('visits', [{
      legacy_customer_id: String(row.customer_id || ''),
      person_id: personId,
      project_id: projectId,
      visit_type: row.visit_type === '回籠' ? '回籠' : '初訪',
      visited_at: dwFormatDate_(row.visit_date) || dwFormatDate_(new Date()),
      customer_name_at_visit: row.customer_name || null,
      phone_at_visit: row.phone ? String(row.phone) : null,
      age_range: row.age_range || null,
      gender: row.gender || null,
      marital_status: row.marital_status || null,
      district_at_visit: row.district || null,
      occupation_industry: row.occupation_industry || null,
      purchase_motive: row.purchase_motive || null,
      source: row.source || null,
      room_types: row.room_types ? String(row.room_types).split('、').filter(function (s) { return s; }) : null,
      budget: row.budget || null,
      objections: row.issues ? String(row.issues).split('、').filter(function (s) { return s; }) : null,
      deal_status_snapshot: row.deal_status || null,
      status_note: row.status_note || null,
      note: row.note || null,
      visit_time_slot: row.visit_time_slot || null,
      sqft_requirement: row.sqft_requirement || null,
      room_requirement_note: row.room_requirement_note || null,
      referrer_name: row.referrer_name || null,
      sales_user_id: salesUserId,
      created_by_user_id: createdByUserId
    }]);

    if (row.introduced_units) {
      String(row.introduced_units).split(/[、,\/]/).map(function (s) { return s.trim(); })
        .filter(function (s) { return s; }).forEach(function (piece) {
          dwInsert_('person_unit_interests', [{ person_id: personId, unit_id: null, raw_text: piece }]);
        });
    }

    dwUpsertProfile_(personId, projectId, {
      stage: row.visit_type === '回籠' ? 'REVISIT' : 'VISITED',
      assignedSalesId: salesUserId,
      leadSource: row.source,
      lastActivityAt: new Date().toISOString()
    });
  } catch (err) {
    Logger.log('[Supabase雙寫失敗] dwSyncVisitCreate_ (customer_id=' + row.customer_id + '): ' + err);
  }
}

// =====================================================================
// Hook：updateCustomerData 成功寫入 Sheets 後呼叫
// customerId：payload.customer_id；changedFields：只包含實際變更的欄位（含 updated_at）
// =====================================================================

function dwSyncVisitUpdate_(customerId, changedFields) {
  try {
    var projectId = dwGetProjectId_();
    var patchPayload = {};
    var fieldMap = {
      visit_date: 'visited_at', customer_name: 'customer_name_at_visit', phone: 'phone_at_visit',
      age_range: 'age_range', district: 'district_at_visit', occupation_industry: 'occupation_industry',
      purchase_motive: 'purchase_motive', source: 'source', status_note: 'status_note', note: 'note',
      visit_time_slot: 'visit_time_slot', sqft_requirement: 'sqft_requirement',
      room_requirement_note: 'room_requirement_note', referrer_name: 'referrer_name'
    };
    Object.keys(fieldMap).forEach(function (k) {
      if (changedFields[k] !== undefined) {
        patchPayload[fieldMap[k]] = k === 'visit_date' ? dwFormatDate_(changedFields[k]) : changedFields[k];
      }
    });
    if (changedFields.visit_type !== undefined) {
      patchPayload.visit_type = changedFields.visit_type === '回籠' ? '回籠' : '初訪';
    }
    if (changedFields.room_types !== undefined) {
      patchPayload.room_types = changedFields.room_types
        ? String(changedFields.room_types).split('、').filter(function (s) { return s; }) : null;
    }
    if (changedFields.issues !== undefined) {
      patchPayload.objections = changedFields.issues
        ? String(changedFields.issues).split('、').filter(function (s) { return s; }) : null;
    }
    if (changedFields.budget !== undefined) patchPayload.budget = changedFields.budget || null;

    if (!Object.keys(patchPayload).length) return; // 這次變更的欄位跟 visits 無關（例如業務指派），不用打 API

    dwPatch_('visits', 'legacy_customer_id=eq.' + encodeURIComponent(String(customerId)), patchPayload);

    var visitRows = dwGet_('visits',
      'legacy_customer_id=eq.' + encodeURIComponent(String(customerId)) + '&select=person_id&limit=1');
    if (visitRows.length) {
      dwUpsertProfile_(visitRows[0].person_id, projectId, {
        stage: changedFields.visit_type === '回籠' ? 'REVISIT' : 'VISITED',
        lastActivityAt: new Date().toISOString()
      });
    }
  } catch (err) {
    Logger.log('[Supabase雙寫失敗] dwSyncVisitUpdate_ (customer_id=' + customerId + '): ' + err);
  }
}

// =====================================================================
// Hook：appendContactLog 成功寫入 Sheets 後呼叫
// =====================================================================

function dwSyncContact_(row) {
  try {
    var projectId = dwGetProjectId_();
    var visitRows = dwGet_('visits',
      'legacy_customer_id=eq.' + encodeURIComponent(String(row.customer_id)) + '&select=person_id&limit=1');
    if (!visitRows.length) {
      Logger.log('[Supabase雙寫] dwSyncContact_ 找不到對應 person，customer_id=' + row.customer_id);
      return;
    }
    var personId = visitRows[0].person_id;
    var createdByUserId = dwFindUserId_(row.created_by_line_user_id, null);

    dwInsert_('contacts', [{
      legacy_contact_id: String(row.contact_id || ''),
      person_id: personId,
      project_id: projectId,
      contacted_at: dwToIso_(row.contact_date) || new Date().toISOString(),
      method: row.contact_method || '',
      note: row.note || null,
      created_by_user_id: createdByUserId
    }]);

    if (row.next_followup_date) {
      dwInsert_('followups', [{
        person_id: personId, project_id: projectId,
        due_at: dwFormatDate_(row.next_followup_date), plan_note: row.note || null, status: 'pending'
      }]);
    }

    dwUpsertProfile_(personId, projectId, { stage: 'CONTACTED', lastActivityAt: new Date().toISOString() });
  } catch (err) {
    Logger.log('[Supabase雙寫失敗] dwSyncContact_ (customer_id=' + row.customer_id + '): ' + err);
  }
}

// =====================================================================
// Hook：saveDealDetail 成功寫入 Sheets 後呼叫
// =====================================================================

function dwSyncDeal_(row) {
  try {
    var projectId = dwGetProjectId_();
    var visitRows = dwGet_('visits',
      'legacy_customer_id=eq.' + encodeURIComponent(String(row.customer_id)) + '&select=person_id&limit=1');
    if (!visitRows.length) {
      Logger.log('[Supabase雙寫] dwSyncDeal_ 找不到對應 person，customer_id=' + row.customer_id);
      return;
    }
    var personId = visitRows[0].person_id;
    var salesUserId = dwFindUserId_(row.sales_line_user_id, row.salesperson);
    var createdByUserId = dwFindUserId_(row.created_by_line_user_id, null);

    var dealPayload = {
      legacy_deal_id: String(row.deal_id || ''),
      person_id: personId,
      project_id: projectId,
      unit_id: null, // 舊 Deal_Detail.unit 是自由文字，精確比對留給之後補做，先保留 null
      house_base_price: row.house_base_price || null,
      parking_base_price: row.parking_base_price || null,
      premium: row.premium || null,
      deal_price: row.deal_price || null,
      deposit_amount: row.deposit_amount || null,
      contract_status: row.contract_status || null,
      expected_sign_date: dwFormatDate_(row.expected_sign_date),
      signed_date: dwFormatDate_(row.signed_date),
      sales_user_id: salesUserId,
      created_by_user_id: createdByUserId,
      status: row.status === '退戶' ? '退戶' : 'active',
      refund_reason: row.refund_reason || null,
      refund_date: dwFormatDate_(row.refund_date)
    };

    var existing = dwGet_('deals',
      'legacy_deal_id=eq.' + encodeURIComponent(String(row.deal_id)) + '&select=id');
    if (existing.length) {
      dwPatch_('deals', 'legacy_deal_id=eq.' + encodeURIComponent(String(row.deal_id)), dealPayload);
    } else {
      dwInsert_('deals', [dealPayload]);
    }

    var stage = 'RESERVED';
    if (row.status !== '退戶') {
      stage = row.contract_status === '已簽約' ? 'SIGNED' : 'PENDING_CONTRACT';
    }
    dwUpsertProfile_(personId, projectId, {
      stage: stage, assignedSalesId: salesUserId, lastActivityAt: new Date().toISOString()
    });
  } catch (err) {
    Logger.log('[Supabase雙寫失敗] dwSyncDeal_ (deal_id=' + row.deal_id + '): ' + err);
  }
}
