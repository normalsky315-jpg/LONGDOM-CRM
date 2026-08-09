// ============================================================
//  龍登 CRM — 吉隆天曜專用版 v9.11
//  v9.11 變更：修正客戶登記重複建檔的 bug（appendCustomerData）：
//    根因：這支 API 要讀整張 Customer_Data 表查重複電話 + 寫 Sheets +
//    同步 Supabase（dwSyncVisitCreate_ 內有好幾支序列執行的 Supabase
//    REST 呼叫），耗時常常超過 jltx.html 的 gasFetch 10 秒逾時。逾時後
//    前端會自動重試一次，但 GAS 執行不會因為前端放棄等待就中止，於是
//    同一次送出真的被建立兩筆客戶資料（Sheets 兩列、Supabase 也可能
//    因此多一筆 visit）。
//    修法：client_request_id 當 idempotency key，配合 CacheService 做
//    「認領＋輪詢」：
//      1. 前端（jltx.html submitCustomer）每次送出產生一個
//         client_request_id，同一次送出如果因逾時自動重試，沿用同一個
//         id（gasFetch 重試用同一個 URL/payload）
//      2. 後端收到請求先檢查這個 key：已經有最終結果就直接回傳、不重
//         新建檔；還沒開始處理就存 PROCESSING 佔位再開始建檔（避免重試
//         送達時第一次執行還沒跑完，兩邊都查到空快取照樣建立兩筆）；
//         如果看到 PROCESSING，輪詢等第一次執行寫入最終結果（最多等
//         15 秒），不會自己重新建檔
//      3. 建檔失敗也要把失敗結果存進快取，釋放 PROCESSING 佔位，避免
//         真正重試時被誤判成「還在處理中」
//  v9.10 變更：Customer 360 總覽列表加上客戶背景輪廓統計：
//    新增 getMyCustomerStats（已接上 doGet 路由 case
//    'getMyCustomerStats'），跟 getMyCustomerOverview 同一份客戶名單、
//    同一套權限規則（業務限自己名下、主管/admin 看整個案場），統計：
//      - by_district：居住行政區分布（取每人最近一筆來訪的 district_at_visit）
//      - by_source：來源管道分布（取每人最近一筆來訪的 source）
//      - by_age_range：年齡區間分布（取每人最近一筆來訪的 age_range）
//      - by_unit_type：感興趣戶型分布（沿用既有 countByUnitField 模糊
//        比對規則，只看棟別＋戶型，暫不要求樓層）
//    用意是讓業務/主管打開總覽列表時，除了看到「誰要聯絡」，也能一眼
//    看出這批客戶的輪廓（哪個區域/媒體/年齡層/戶型特別集中），作為
//    後續開發方向的參考依據。抽出共用函式 dwGetVisibleProfiles_，
//    getMyCustomerOverview／getMyCustomerStats 共用同一套 ACL 篩選邏輯。
//    實際查詢邏輯都在 jltx_dualwrite_v1.gs
//  v9.9 變更：Customer 360 新增總覽列表：
//    新增 getMyCustomerOverview（已接上 doGet 路由 case
//    'getMyCustomerOverview'）：列出使用者權限範圍內的所有客戶，
//    依「最後互動距今天數」由久到近排序，最需要注意的排最前面，
//    沒有互動紀錄的視為最需要注意、排最前。業務只看自己名下、
//    主管/admin 看整個案場（跟其他 getMyCustomers 系列同一套規則）。
//    對應前端：customer360.html 打開頁面直接顯示總覽列表，不用先
//    搜尋姓名才有內容；搜尋框留空＝看總覽，輸入關鍵字才切換成搜尋
//    結果。實際查詢邏輯在 jltx_dualwrite_v1.gs 的 getMyCustomerOverview
//  v9.8 變更：客戶登記新增「回訪客人關聯」功能：
//    1. Customer_Data 新增 linked_customer_id／linked_customer_name／
//       linked_visit_date 三個欄位（透過 ensureCustomerExtraColumns
//       自動補表頭），appendCustomerData／updateCustomerData 都支援
//       讀寫
//    2. 新增 searchMyCustomers：讓業務登記回籠客人時，可以用姓名或
//       電話（都用模糊比對）搜尋自己權限範圍內的歷史客戶資料（跟
//       getMyCustomers 用同一套角色權限規則：業務限自己、主管限
//       案場、admin 不限），最多回傳 15 筆，依訪客日期新到舊排序，
//       已接上 doGet 路由
//    3. 對應前端：客戶登記表單選「回籠」時，訪客類別下方會跳出搜尋
//       欄位，選到符合的客戶後把 linked_customer_id 等資料存進這筆
//       新的回訪紀錄，客戶卡片上也會顯示「🔗 關聯：姓名（日期）」
//  v9.7 變更：銷售日報未提交 LINE 推播提醒改成「只在真的漏交時才通知」：
//    sendDailySalesReport（晚上9點觸發）原本不管當天有沒有交日報，
//    每天都會固定推播一則訊息（有交顯示統計、沒交顯示提醒），改成
//    只有「今天完全沒有人交日報」才推播，已經有交的話完全不推播，
//    避免每天固定跳訊息讓管理員養成忽略推播的習慣。★ 需要先在 Apps
//    Script 執行過一次 setupTriggers()，此觸發器才會真的被排程執行；
//    另外要在指令碼屬性設定 LINE_PUSH_TARGET（管理員的 LINE userId，
//    多人用逗號分隔）才會真的送出推播
//  v9.6 變更：getUserContext 效能優化（★ 這是目前系統「感覺很慢」
//    最主要的原因，強烈建議部署）：
//    1. getUserContext 在整份程式碼裡被呼叫超過 50 次，幾乎每一支 API
//       進來都會先呼叫一次，原本每次都重新完整讀一遍 User_Role_Table
//       整張表；光首頁一次載入前端就會平行發出 7、8 個 API 請求，
//       等於同一張表在一兩秒內被整張重複讀了 7、8 次
//    2. 改用 CacheService 快取 60 秒：同一使用者 60 秒內的後續請求
//       直接吃快取，不用再讀表；找不到使用者的結果不快取（避免新
//       使用者剛送出審核申請卻被「查無此人」的結果卡住）
//    3. 新增 invalidateUserContextCache，在 verifyAccess／
//       updateUserRole（含 approveUser／rejectUser）等會改到
//       User_Role_Table 的地方主動清快取，讓核准使用者、調整角色
//       這類操作可以馬上生效，不用等 60 秒快取過期
//  v9.5 變更：CONFIG.INDUSTRIES 新增「自營商」「餐飲業」兩個職業選項
//  v9.4 變更：LINE 官方帳號問答功能跟華雄天地 v9.31 同步更新（★ 目前
//    兩案場共用同一個 LINE 官方帳號，Webhook 網址現況指到華雄天地，
//    這份程式碼的 LINE 相關功能實際上收不到訊息，保留是為了將來
//    Webhook 改指過來時直接可用，細節見 handleWebhookEvent 上方註解）：
//    1. 只在跟官方帳號一對一私訊時回應，群組/多人聊天室訊息忽略
//    2. 新增跨案場路由 handleQaCommandRouted，指令前加「天地」/
//       「天曜」可以指定要查哪個案場的資料
//  v9.3 變更：新增「週報表」頁面，日報/週報/月報三個頁面互相加上
//    日／週／月切換 tabs，方便直接切換不同時間範圍的統計資料：
//    1. 新增 getWeeklyVisitorBreakdown：跟 getMonthlyVisitorBreakdown
//       同樣邏輯，接受 startDate/endDate（前端用 ISO 週次換算週一~
//       週日），統計居住行政區／來源管道／戶別反應分布，已接上
//       doGet 路由
//    2. ★ 前端 input[type=week] 用 ISO 週次字串（例如「2026-W31」），
//       跟 getWeeklyVisitorBreakdown 的 startDate/endDate 互轉都在
//       前端用 UTC 運算完成（純日期計算，不代表任何時間點，避免
//       使用者瀏覽器時區造成算出來的週一/週日日期跳掉一天）
//  v9.2 變更：補上前端一直有呼叫、但後端從未實作/接上路由的
//    updateDailyReport（「銷售日報」頁面的「✏️ 修改」按鈕，之前點下去
//    一定會失敗，因為後端根本沒有這支 action）：
//    1. 新增 updateDailyReport：僅限提交後3天內、manager 只能改自己
//       提交的、admin 不限，用 report_id 精準比對
//    2. 已接上 doGet/doPost 路由
//  v9.1 變更：修正 getCustomerList 的業務範圍篩選只比對
//    created_by_line_user_id 的 bug——admin 代填客戶資料時，建檔人是
//    admin，實際接待業務是 sales_line_user_id，業務自己看首頁「本月
//    接待共X組」會漏算這些代填的客戶，改成跟 getMyCustomers 一樣同時
//    比對 sales_line_user_id／created_by_line_user_id
//  v9.0 變更：
//    1. appendCustomerData 新增同電話重複建檔提醒：建檔時若同一支
//       電話已有客戶資料，不擋建檔（可能是換業務接手、客戶回訪等
//       正常情況），但會回傳既有資料（姓名/日期/業務），前端跳訊息
//       告知
//    2. 首頁「本月概況」改成「本月接待共 X 組」＋初訪／回籠／成交
//       三個統計卡（原本沒有單獨列出初訪數）
//  v8.9 變更：「戶別反應」統計（日報＋月報）改成用正規表示式直接掃
//    棟別＋戶型，不再限定新版下拉選單的固定格式，這樣舊資料手動填的
//    各種寫法（A3/13、A3.B3、A1-10/5、A5含車位，B5含車位…）也能正確
//    歸類成「A棟3型」「A棟1型」等統一分類，新舊資料統合在同一份統計
//  v8.8 變更：新增「月報表」頁面，統計整個月的接待/初訪/回籠/成交，
//    加上跟日報一樣的居住行政區／來源管道／戶別反應分布，直接連動
//    客戶資料表。新增 getMonthlyVisitorBreakdown 函式，把原本寫死在
//    getDailyVisitorBreakdown 裡的分類統計邏輯抽成 countByField／
//    countByUnitField 共用
//  v8.7 變更：日報頁「戶別反應」統計改成只看棟別＋戶型分類，樓層
//    不同不再算成不同筆（例如 A棟1型7樓、A棟1型8樓現在會合併成
//    「A棟1型」一筆計數）。已介紹產品本身（客戶資料裡實際記錄的
//    戶別清單，含樓層）不受影響，只有統計彙總的分類邏輯改變
//  v8.6 變更：修改客戶資料 Modal 新增「承辦業務員」欄位，主管/admin
//    可以直接改指派給哪位業務（業務本人仍不能改，只能看/改自己名下
//    客戶的其他欄位）。updateCustomerData 的可編輯欄位在非業務角色時
//    加入 sales_name／sales_line_user_id
//  ★ 從 v7.0 開始，客戶資料表（Customer_Data）跟客戶登記表單是
//  吉隆天曜專屬的客製化內容，跟華雄天地不再完全一樣（比對紙本
//  「訪客服務表」補齊了天地版本沒有的欄位）。之後若要用天地最新
//  版本重新同步吉隆天曜，要記得保留：
//    1. CUSTOMER_EXTRA_FIELDS / ensureCustomerExtraColumns()
//    2. appendCustomerData／updateCustomerData 裡用到這些欄位的部分
//    3. appendCustomerData 裡「只有 admin 能指派業務」的邏輯
//    4. generateWeeklyLeaveReport「不」排除 SKY 陳昭文（天地會排除，
//       吉隆天曜這裡刻意不排除）
//    5. CONFIG.INDUSTRIES / CONFIG.PURCHASE_MOTIVES 比天地多幾個選項
//    6. getDailyVisitorBreakdown／getWeeklyVisitorBreakdown／
//       getMonthlyVisitorBreakdown 的 by_unit（戶別反應）欄位與
//       countByUnitField——天地版本這幾支函式也有了（v9.28/v9.29 起
//       日報/週報/月報頁都有「來客分布」），但天地沒有結構化戶型
//       選單，只做 by_district／by_source，重新同步時要保留吉隆天曜
//       多出來的 by_unit 部分，不要整支被天地版本覆蓋掉
//  v8.5 變更：
//    1. 已介紹產品從自由輸入改成棟別／戶型／樓層下拉選單（可加入多筆），
//       B棟沒有6型，A棟樓層1~15，B棟樓層1~9
//    2. getDailyVisitorBreakdown 新增「戶別反應」統計（by_unit）：把
//       客戶的已介紹產品拆開分別計數，跟居住行政區／來源管道一起顯示
//       在日報頁面，方便對照廣告效益
//  v8.4 變更：銷售日報頁面新增「當日來客分布」，直接統計 Customer_Data
//    當天的客戶資料，顯示居住行政區／來源管道分布（不用另外手動填寫，
//    客戶資料本來就有記錄這些欄位，日報直接連動顯示即可）。新增
//    getDailyVisitorBreakdown 函式，權限規則比照既有的
//    getDailyReportSummary（業務看不到，只有主管/admin 看得到）
//  v8.3 變更：客戶資料表單簡化，只針對吉隆天曜：
//    1. 拿掉「地址」「購屋預算」「自備款」欄位（購屋預算是跟天地共用
//       的原始欄位，這裡沒有另外刪表格欄位，只是表單不再顯示/送出；
//       地址、自備款是吉隆天曜自己加的，已建立的舊資料欄位還在，不會
//       遺失）
//    2. 客戶職業新增：物流業、運輸業、上班族、農林漁牧業、技術設備類
//    3. 購屋動機新增：新婚準備
//    4. 坪數需求簡化成 3 個選項：20-30坪／30-40坪／40坪以上
//    5. 客戶癥結點新增：回去與家人討論
//  v8.2 變更：下週休假通報（generateWeeklyLeaveReport）不再排除
//    SKY 陳昭文，吉隆天曜這邊他的休假也要算進通報裡（天地維持排除，
//    只改吉隆天曜這份）
//  v8.1 變更：v8.0 的 getSalesByProject 去重改用 line_user_id，但
//    使用者回報還是有重複——代表 User_Role_Table 對同一個人有「同名
//    但不同 line_user_id」的多筆有效紀錄，改成依「姓名」去重才真的
//    擋得住
//  v8.0 變更：
//    1. 拿掉 v7.0 新增的電話（住家/公司）、交通方式、家庭結構、
//       來訪型態這 5 個欄位（已建立的舊資料如果剛好填過，欄位還在
//       試算表裡，只是表單不會再顯示/寫入了，不會遺失資料）
//    2. 來源管道選「親友介紹」時，新增「介紹人」欄位可以填姓名
//    3. 修正 getSalesByProject 業務下拉選單同一個人重複出現的 bug
//       （User_Role_Table 對同一人可能有多筆有效紀錄，現在依
//       line_user_id 去重）
//  v7.0 變更：
//    1. 新增「admin 可以代業務員填客戶資料」：appendCustomerData
//       現在只有 admin 送出 sales_line_user_id 才會生效（改指派給
//       別的業務），業務/主管送出這個欄位會被忽略，一律用自己的
//       身分，避免業務亂填別人名字
//    2. 比對紙本「訪客服務表」新增客戶資料欄位：性別、婚姻狀況、
//       地址、交通方式、電話（住家/公司，原本的電話欄位視為手機）、
//       來訪型態（個人/夫妻/家人/情侶/朋友/同事同行）、家庭結構、
//       來訪時段、坪數需求、房型需求備註、自備款、已介紹產品
//       （棟別/樓層），新增/編輯客戶都支援
//    3. 居住行政區選項改成吉隆天曜自己案場的區域（大寮/鳳山/林園/
//       小港/鳥松/大樹/前鎮/三民/苓雅/新興/仁武/楠梓/橋頭/外縣市），
//       原本沿用天地的左營/楠梓/鼓山那組不是吉隆天曜的商圈
//  以下沿用之前版本的功能（源自華雄天地）：
//  1. 客戶追蹤記錄模組（Contact_Log 分頁）：記錄每次接洽方式、備註、
//     選填下次追蹤日期，「我的客戶」「近期客戶」卡片可查看/新增；
//     電話號碼可一鍵撥打；首頁「待追蹤客戶」提醒
//  2. 排班：平日單日最多 2 人休假、六日禁休（主管排假不受此限制）
//  3. 客戶：刪除功能、電話/日期時間欄位文字保護
//  4. 每日日報：防重複提交、可刪除、主管3天內可修改
//  5. 任務／維修通報：都可刪除、都可編輯（不只改狀態）；維修通報
//     支援現場拍照上傳，優先度欄位已修正會正確存檔
//  6. 成交明細模組（Deal_Detail 分頁）：可編輯成交/延期簽約日期，
//     退戶會連動 Customer_Data 狀態 + 稽核紀錄
//  7. LINE 官方帳號「簡單問答」：查詢客戶、今日/本月業績、待簽約、
//     今日/下週休假、我的待辦
//  8. getSalesByProject、getTodayLeave 要求登入驗證；刪除功能共用
//     deleteRowById() helper
//  9. submitPublicLead：官網 EDM 表單（jltx-edm.html）專用的公開、
//     免登入陌客留資端點，這是天地沒有的吉隆天曜專屬功能，之後任何
//     一次同步都要記得保留（已含電話格式驗證/長度上限）
// ============================================================
//  ★ 這是既有帳號（吉隆天曜已經上線運作中），不是第一次部署：
//  1. 整份覆蓋貼上這個檔案到吉隆天曜的 Apps Script 專案
//     （CONFIG.SPREADSHEET_ID 已經是吉隆天曜自己的試算表 ID，不用改）
//  2. 部署 → 管理部署 → 編輯（鉛筆）→ 版本選「新版本」→ 部署
//     ★ 用「編輯現有部署」，不要「新增部署」，這樣網址不會變，
//       jltx.html / jltx-edm.html 的 GAS_URL 不用再改
// ============================================================

// ==================== CONFIG ====================
// ==================== CONFIG ====================
const CONFIG = {
  TIMEZONE: 'Asia/Taipei',

  PROP_KEYS: {
    COMPANY_PASSWORD:    'COMPANY_PASSWORD',
    LINE_TOKEN:          'LINE_CHANNEL_ACCESS_TOKEN',
    LINE_PUSH_TARGET:    'LINE_PUSH_TARGET',
    LINE_CHANNEL_SECRET: 'LINE_CHANNEL_SECRET'
  },

  SHEETS: {
    USER_ROLE:      'User_Role_Table',
    PROJECT:        'Project_List',
    CUSTOMER:       'Customer_Data',
    TASK:           'Task_List',
    DAILY_REPORT:   'Daily_Report',
    MAINTENANCE:    'Maintenance_Report',
    AUDIT_LOG:      'Audit_Log',
    CHANGE_LOG:     'Customer_Change_Log',
    LEAVE_SCHEDULE: 'Leave_Schedule',
    CALENDAR_NOTES: 'Calendar_Notes',
    DEAL_DETAIL:    'Deal_Detail',
    CONTACT_LOG:    'Contact_Log'
  },

  ROLES:  { SALES: 'sales', MANAGER: 'manager', ADMIN: 'admin' },
  STATUS: { ACTIVE: 'active', INACTIVE: 'inactive', PENDING: 'pending',
            PROCESSING: 'processing', DONE: 'done' },

  // ★ 吉隆天曜專屬：職業選項比天地多了物流業/運輸業/上班族/農林漁牧業/
  // 技術設備類，重新同步時記得保留
  INDUSTRIES: ['公教軍警','醫療生技','科技資訊','金融保險','服務業',
               '製造業','自由業','營建業','房仲業','物流業','運輸業',
               '上班族','農林漁牧業','技術設備類','自營商','餐飲業',
               '退休','家管','其他'],

  // ★ 吉隆天曜專屬：購屋動機比天地多了「新婚準備」，重新同步時記得保留
  PURCHASE_MOTIVES: ['首購','投資置產','換屋升級','自住改善','子女購置','新婚準備','退休養老','其他'],

  INITIAL_PROJECTS: [
    { name: '吉隆天曜', code: 'JLTX' }
  ],

  PROJECT_NAME:   '吉隆天曜',
  SPREADSHEET_ID: '1id0qeNApu_NNOoQ1H3sA0jws7NGuWo-UMwsFEhI73Gg'
};

// ==================== Helpers ====================
// 純日期欄位（yyyy-MM-dd）／時間戳欄位（yyyy-MM-dd HH:mm:ss）／強制文字欄位
// 統一在這裡維護，讀取與寫入共用，避免各處各自維護一份漏掉欄位
var DATE_ONLY_FIELDS  = ['visit_date','leave_date','report_date','due_date','note_date',
                          'expected_sign_date','signed_date','refund_date',
                          'contact_date','next_followup_date'];
var DATETIME_FIELDS   = ['created_at','updated_at','last_login_at','completed_at','changed_at','timestamp'];
var TEXT_FORCE_FIELDS = ['phone'];

function getCrmSS()     { return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID); }
function getSheet(name) { return getCrmSS().getSheetByName(name); }
function nowTW()   { return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd HH:mm:ss'); }
function todayTW() { return Utilities.formatDate(new Date(), CONFIG.TIMEZONE, 'yyyy-MM-dd'); }
function ok(data)  { return { ok: true,  data: (data == null ? null : data) }; }
function fail(msg) { return { ok: false, error: String(msg) }; }
function genId(prefix) {
  return prefix + '_' + new Date().getTime() + '_' + Math.floor(Math.random() * 1000);
}
function getProp(key)       { return PropertiesService.getScriptProperties().getProperty(key); }
function setProp(key, val)  { PropertiesService.getScriptProperties().setProperty(key, val); }

function jsonResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function readSheetAsObjects(sheetName) {
  var sh = getSheet(sheetName);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      var v = row[i];
      // 保險：不管是哪個欄位，只要 Sheets 把它存成了 Date 型別（沒被文字保護擋下來，
      // 或是舊資料在保護機制上線前就已經被自動轉掉），一律換算回台北時間文字再輸出。
      // 這裡如果直接把 Date 物件丟給 JSON.stringify，會被轉成 UTC 字串，
      // 造成前端看到的時間跟實際輸入時間差 8 小時（凌晨輸入的資料甚至會整個跳成前一天）。
      if (v instanceof Date) {
        var fmt = DATE_ONLY_FIELDS.indexOf(h) >= 0 ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss';
        v = Utilities.formatDate(v, CONFIG.TIMEZONE, fmt);
      }
      obj[h] = v;
    });
    return obj;
  });
}

function appendObjectToSheet(sheetName, obj) {
  var sh = getSheet(sheetName);
  if (!sh) throw new Error('Sheet not found: ' + sheetName);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var row = headers.map(function(h) { return obj[h] != null ? obj[h] : ''; });
  var lastRow = sh.getLastRow() + 1;
  sh.appendRow(row);
  // 修正日期／時間戳／電話號碼格式，防止 Sheets 自動轉換造成時區位移或開頭 0 遺失
  headers.forEach(function(h, i) {
    var isDateField = DATE_ONLY_FIELDS.indexOf(h) >= 0 && obj[h] && /^\d{4}-\d{2}-\d{2}$/.test(String(obj[h]));
    var isDatetimeField = DATETIME_FIELDS.indexOf(h) >= 0 && obj[h] && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(String(obj[h]));
    var isTextField = TEXT_FORCE_FIELDS.indexOf(h) >= 0 && obj[h] != null && obj[h] !== '';
    if (isDateField || isDatetimeField || isTextField) {
      var cell = sh.getRange(lastRow, i + 1);
      cell.setNumberFormat('@STRING@');
      cell.setValue(String(obj[h]));
    }
  });
}

function updateRowById(sheetName, idField, idValue, updates) {
  var sh = getSheet(sheetName);
  if (!sh) return false;
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf(idField);
  if (idCol < 0) return false;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) === String(idValue)) {
      Object.keys(updates).forEach(function(k) {
        var c = headers.indexOf(k);
        if (c < 0) return;
        var val = updates[k];
        var isDateField = DATE_ONLY_FIELDS.indexOf(k) >= 0 && val && /^\d{4}-\d{2}-\d{2}$/.test(String(val));
        var isDatetimeField = DATETIME_FIELDS.indexOf(k) >= 0 && val && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(String(val));
        var isTextField = TEXT_FORCE_FIELDS.indexOf(k) >= 0 && val != null && val !== '';
        if (isDateField || isDatetimeField || isTextField) {
          // 用 setNumberFormat('@') 強制文字格式再寫入，防止日期／時間位移
          var cell = sh.getRange(i + 1, c + 1);
          cell.setNumberFormat('@STRING@');
          cell.setValue(String(val));
        } else {
          sh.getRange(i + 1, c + 1).setValue(val);
        }
      });
      return true;
    }
  }
  return false;
}

// 找到 idField=idValue 的那一列，選擇性跑 opts.checkFn 做權限/業務規則檢查
// （回傳非 null 字串代表擋下、不刪除），檢查通過才真的刪除該列。
// 回傳 { notFound: true } / { error: '...' } / { row: {欄位:值...} }
function deleteRowById(sheetName, idField, idValue, opts) {
  var sh = getSheet(sheetName);
  if (!sh) return { error: '找不到分頁 ' + sheetName };
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf(idField);
  if (idCol < 0) return { error: '欄位設定錯誤：' + idField };
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][idCol]) !== String(idValue)) continue;
    var rowObj = {};
    headers.forEach(function(h, c) { rowObj[h] = data[i][c]; });
    if (opts && opts.checkFn) {
      var err = opts.checkFn(rowObj);
      if (err) return { error: err };
    }
    sh.deleteRow(i + 1);
    return { row: rowObj };
  }
  return { notFound: true };
}

// ==================== User Context ====================
// ★ 效能優化：getUserContext 在整份程式碼裡被呼叫了超過 50 次，幾乎
// 每一支 API 進來都會先呼叫一次，原本每次都重新完整讀一遍
// User_Role_Table 整張表——光是首頁一次載入就會平行發出 7、8 個
// API 請求，等於同一張表在一兩秒內被整張重複讀了 7、8 次，這是
// 目前系統「感覺很慢」最大的單一原因。
// 改用 CacheService 快取 60 秒：同一個使用者在 60 秒內的後續請求
// 直接吃快取，不用再讀表；60 秒後自動過期重新讀一次。另外在所有
// 會改到 User_Role_Table 的地方（登入、審核、修改角色）主動清快取，
// 讓「核准使用者」「調整角色」這種操作可以馬上生效，不用等 60 秒。
// 找不到使用者（best 為 null）的結果不快取，避免使用者剛送出審核
// 申請、資料才剛寫入表格，卻因為前一次查詢的「查無此人」被快取住。
function getUserContext(lineUserId) {
  if (!lineUserId) return null;
  var cache = CacheService.getScriptCache();
  var cacheKey = 'userctx_' + lineUserId;
  var cached = cache.get(cacheKey);
  if (cached) return JSON.parse(cached);

  var rows = readSheetAsObjects(CONFIG.SHEETS.USER_ROLE);
  var ROLE_PRIORITY = { admin: 3, manager: 2, sales: 1 };
  var best = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].line_user_id) !== String(lineUserId)) continue;
    if (!best) { best = rows[i]; continue; }
    // 優先取 active 狀態
    if (rows[i].status === 'active' && best.status !== 'active') { best = rows[i]; continue; }
    if (best.status === 'active' && rows[i].status !== 'active') continue;
    // 同樣狀態取最高權限
    var rp = ROLE_PRIORITY[rows[i].role] || 0;
    var bp = ROLE_PRIORITY[best.role]    || 0;
    if (rp > bp) best = rows[i];
  }
  if (!best) return null;
  var result = {
    lineUserId:  best.line_user_id,
    displayName: best.display_name,
    role:        best.role,
    projectName: best.project_name,
    jobTitle:    best.job_title,
    status:      best.status
  };
  cache.put(cacheKey, JSON.stringify(result), 60);
  return result;
}

function invalidateUserContextCache(lineUserId) {
  if (!lineUserId) return;
  try { CacheService.getScriptCache().remove('userctx_' + lineUserId); } catch (e) {}
}

// ==================== HTTP Router ====================
function doGet(e) {
  var action = e && e.parameter && e.parameter.action;
  if (!action) return jsonResponse({ ok: false, error: 'action 必填' });

  var payload = {};
  try {
    if (e.parameter.payload) payload = JSON.parse(e.parameter.payload);
  } catch(pe) { Logger.log('payload parse error: ' + pe); }

  try {
    switch (action) {
      case 'getProjectList':
        return jsonResponse(getProjectList());
      case 'getSalesByProject':
        return jsonResponse(getSalesByProject(payload.project || e.parameter.project, payload.lineUserId || e.parameter.lineUserId));
      case 'getIndustryList':
        return jsonResponse(getIndustryList());
      case 'getPurchaseMotiveList':
        return jsonResponse(getPurchaseMotiveList());
      case 'getTasks':
        return jsonResponse(getTasks(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, status: e.parameter.status
        }));
      case 'getCustomerList':
        return jsonResponse(getCustomerList(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'getMyCustomers':
        return jsonResponse(getMyCustomers(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'searchMyCustomers':
        return jsonResponse(searchMyCustomers(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId, keyword: e.parameter.keyword }));
      case 'getMyCustomerOverview':
        return jsonResponse(getMyCustomerOverview(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'getMyCustomerStats':
        return jsonResponse(getMyCustomerStats(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'searchCustomer360':
        return jsonResponse(searchCustomer360(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId, query: e.parameter.query }));
      case 'getCustomer360Detail':
        return jsonResponse(getCustomer360Detail(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId, person_id: e.parameter.person_id }));
      case 'getRecentCustomers':
        return jsonResponse(getRecentCustomers(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'getCustomerChangeLogs':
        return jsonResponse(getCustomerChangeLogs(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId, customer_id: e.parameter.customer_id }));
      case 'updateCustomerData':
        return jsonResponse(updateCustomerData(payload));
      case 'deleteCustomerData':
        return jsonResponse(deleteCustomerData(payload));
      case 'getDailyReportSummary':
        return jsonResponse(getDailyReportSummary(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, date: e.parameter.date
        }));
      case 'getDailyVisitorBreakdown':
        return jsonResponse(getDailyVisitorBreakdown(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, date: e.parameter.date
        }));
      case 'getWeeklyVisitorBreakdown':
        return jsonResponse(getWeeklyVisitorBreakdown(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, startDate: e.parameter.startDate, endDate: e.parameter.endDate
        }));
      case 'getMonthlyVisitorBreakdown':
        return jsonResponse(getMonthlyVisitorBreakdown(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, month: e.parameter.month
        }));
      case 'getDailyReportRange':
        return jsonResponse(getDailyReportRange(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId, months: e.parameter.months
        }));
      case 'getMaintenanceList':
        return jsonResponse(getMaintenanceList(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'getUserList':
        return jsonResponse(getUserList(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'checkAutoLogin':
        return jsonResponse(checkAutoLogin(payload.lineUserId || e.parameter.lineUserId));
      case 'verifyAccess':
        return jsonResponse(verifyAccess(payload));
      case 'appendCustomerData':
        return jsonResponse(appendCustomerData(payload));
      case 'submitPublicLead':
        return jsonResponse(submitPublicLead(payload));
      case 'updateCustomerDeal':
        return jsonResponse(updateCustomerDeal(payload));
      case 'saveDealDetail':
        return jsonResponse(saveDealDetail(payload));
      case 'getDealDetailByCustomer':
        return jsonResponse(getDealDetailByCustomer(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId, customer_id: e.parameter.customer_id }));
      case 'markDealDetailRefund':
        return jsonResponse(markDealDetailRefund(payload));
      case 'getPendingSignatures':
        return jsonResponse(getPendingSignatures(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'getDealDetailsForDate':
        return jsonResponse(getDealDetailsForDate(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId, date: e.parameter.date }));
      case 'appendContactLog':
        return jsonResponse(appendContactLog(payload));
      case 'getContactLogsByCustomer':
        return jsonResponse(getContactLogsByCustomer(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId, customer_id: e.parameter.customer_id }));
      case 'deleteContactLog':
        return jsonResponse(deleteContactLog(payload));
      case 'getPendingFollowups':
        return jsonResponse(getPendingFollowups(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      case 'appendTask':
        return jsonResponse(appendTask(payload));
      case 'updateTaskStatus':
        return jsonResponse(updateTaskStatus(payload));
      case 'updateTask':
        return jsonResponse(updateTask(payload));
      case 'deleteTask':
        return jsonResponse(deleteTask(payload));
      case 'appendDailyReport':
        return jsonResponse(appendDailyReport(payload));
      case 'deleteDailyReport':
        return jsonResponse(deleteDailyReport(payload));
      case 'updateDailyReport':
        return jsonResponse(updateDailyReport(payload));
      case 'appendMaintenance':
        return jsonResponse(appendMaintenance(payload));
      case 'updateMaintenanceStatus':
        return jsonResponse(updateMaintenanceStatus(payload));
      case 'updateMaintenance':
        return jsonResponse(updateMaintenance(payload));
      case 'deleteMaintenance':
        return jsonResponse(deleteMaintenance(payload));
      case 'updateUserRole':
        return jsonResponse(updateUserRole(payload));
      case 'approveUser':
        return jsonResponse(approveUser(payload));
      case 'rejectUser':
        return jsonResponse(rejectUser(payload));
      case 'getLeaveSchedule':
        return jsonResponse(getLeaveSchedule(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId,
          startDate:  e.parameter.startDate,
          endDate:    e.parameter.endDate
        }));
      case 'getTodayLeave':
        return jsonResponse(getTodayLeave(payload.lineUserId || e.parameter.lineUserId));
      case 'appendLeave':
        return jsonResponse(appendLeave(payload));
      case 'deleteLeave':
        return jsonResponse(deleteLeave(payload));
      case 'getCalendarNotes':
        return jsonResponse(getCalendarNotes(payload.lineUserId ? payload : {
          lineUserId: e.parameter.lineUserId,
          startDate:  e.parameter.startDate,
          endDate:    e.parameter.endDate
        }));
      case 'addCalendarNote':
        return jsonResponse(addCalendarNote(payload));
      case 'deleteCalendarNote':
        return jsonResponse(deleteCalendarNote(payload));
      case 'generateWeeklyLeaveReport':
        return jsonResponse(generateWeeklyLeaveReport(payload.lineUserId ? payload : { lineUserId: e.parameter.lineUserId }));
      default:
        return jsonResponse({ ok: false, error: '未知 action: ' + action });
    }
  } catch (err) {
    Logger.log('doGet error: ' + err);
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doPost(e) {
  try {
    // LINE Webhook Verify 會發空 body，直接回 OK
    if (!e || !e.postData || !e.postData.contents) {
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    }

    var body = JSON.parse(e.postData.contents);

    if (body.events && Array.isArray(body.events)) {
      body.events.forEach(handleWebhookEvent);
      return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
    }

    var action  = body.action;
    var payload = body.payload || {};

    if (!action) return jsonResponse({ ok: false, error: 'action 必填' });

    switch (action) {
      case 'verifyAccess':            return jsonResponse(verifyAccess(payload));
      case 'appendCustomerData':      return jsonResponse(appendCustomerData(payload));
      case 'submitPublicLead':        return jsonResponse(submitPublicLead(payload));
      case 'updateCustomerData':      return jsonResponse(updateCustomerData(payload));
      case 'deleteCustomerData':      return jsonResponse(deleteCustomerData(payload));
      case 'updateCustomerDeal':      return jsonResponse(updateCustomerDeal(payload));
      case 'saveDealDetail':          return jsonResponse(saveDealDetail(payload));
      case 'getDealDetailByCustomer': return jsonResponse(getDealDetailByCustomer(payload));
      case 'markDealDetailRefund':    return jsonResponse(markDealDetailRefund(payload));
      case 'getPendingSignatures':    return jsonResponse(getPendingSignatures(payload));
      case 'getDealDetailsForDate':   return jsonResponse(getDealDetailsForDate(payload));
      case 'appendContactLog':        return jsonResponse(appendContactLog(payload));
      case 'getContactLogsByCustomer': return jsonResponse(getContactLogsByCustomer(payload));
      case 'deleteContactLog':        return jsonResponse(deleteContactLog(payload));
      case 'getPendingFollowups':     return jsonResponse(getPendingFollowups(payload));
      case 'appendTask':              return jsonResponse(appendTask(payload));
      case 'updateTaskStatus':        return jsonResponse(updateTaskStatus(payload));
      case 'updateTask':              return jsonResponse(updateTask(payload));
      case 'deleteTask':              return jsonResponse(deleteTask(payload));
      case 'appendDailyReport':       return jsonResponse(appendDailyReport(payload));
      case 'deleteDailyReport':       return jsonResponse(deleteDailyReport(payload));
      case 'updateDailyReport':       return jsonResponse(updateDailyReport(payload));
      case 'appendMaintenance':       return jsonResponse(appendMaintenance(payload));
      case 'uploadMaintenancePhoto':  return jsonResponse(uploadMaintenancePhoto(payload));
      case 'updateMaintenanceStatus': return jsonResponse(updateMaintenanceStatus(payload));
      case 'updateMaintenance':       return jsonResponse(updateMaintenance(payload));
      case 'deleteMaintenance':       return jsonResponse(deleteMaintenance(payload));
      case 'getUserList':             return jsonResponse(getUserList(payload));
      case 'updateUserRole':          return jsonResponse(updateUserRole(payload));
      case 'approveUser':             return jsonResponse(approveUser(payload));
      case 'rejectUser':              return jsonResponse(rejectUser(payload));
      case 'appendLeave':             return jsonResponse(appendLeave(payload));
      case 'deleteLeave':             return jsonResponse(deleteLeave(payload));
      default:
        return jsonResponse({ ok: false, error: '未知 action: ' + action });
    }
  } catch (err) {
    Logger.log('doPost error: ' + err);
    // 錯誤時也回 OK，避免 LINE Verify 失敗
    return ContentService.createTextOutput('OK').setMimeType(ContentService.MimeType.TEXT);
  }
}

// ==================== Auth API ====================
function verifyAccess(payload) {
  try {
    var lineUserId      = String(payload.lineUserId  || '').trim();
    var displayName     = String(payload.displayName || '').trim();
    var password        = String(payload.password    || '');
    var selectedProject = String(payload.selectedProject || '').trim();

    if (!password) return fail('請輸入密碼');

    var expected = getProp(CONFIG.PROP_KEYS.COMPANY_PASSWORD);
    if (!expected) return fail('系統尚未設定密碼，請管理員執行 firstTimeSetup()');
    if (password !== expected) {
      if (lineUserId) writeAuditLog(lineUserId, 'LOGIN_FAIL', CONFIG.SHEETS.USER_ROLE, lineUserId, 'wrong password');
      return fail('密碼錯誤');
    }

    if (!lineUserId) {
      return fail('無法取得 LINE 使用者身份，請確認從 LINE 開啟本頁面');
    }

    var ctx = getUserContext(lineUserId);

    if (!ctx) {
      appendObjectToSheet(CONFIG.SHEETS.USER_ROLE, {
        line_user_id: lineUserId,
        display_name: displayName || lineUserId,
        role: CONFIG.ROLES.SALES,
        status: CONFIG.STATUS.PENDING,
        project_name: selectedProject || '',
        job_title: '',
        last_login_at: '',
        created_at: nowTW(),
        updated_at: nowTW()
      });
      writeAuditLog(lineUserId, 'LOGIN', CONFIG.SHEETS.USER_ROLE, lineUserId, '新使用者待審核: ' + displayName);
      return ok({ status: 'pending' });
    }

    if (ctx.status === CONFIG.STATUS.INACTIVE) {
      return fail('您的帳號已停用，請聯絡管理員');
    }

    if (ctx.status === CONFIG.STATUS.PENDING) {
      if (selectedProject && !ctx.projectName) {
        updateRowById(CONFIG.SHEETS.USER_ROLE, 'line_user_id', lineUserId, {
          project_name: selectedProject, updated_at: nowTW()
        });
        invalidateUserContextCache(lineUserId);
      }
      return ok({ status: 'pending' });
    }

    updateRowById(CONFIG.SHEETS.USER_ROLE, 'line_user_id', lineUserId, {
      last_login_at: nowTW(),
      display_name: displayName || ctx.displayName,
      updated_at: nowTW()
    });
    invalidateUserContextCache(lineUserId);
    writeAuditLog(lineUserId, 'LOGIN', CONFIG.SHEETS.USER_ROLE, lineUserId, 'login success: ' + (displayName || ctx.displayName));

    return ok({
      status: 'active',
      lineUserId: lineUserId,
      displayName: displayName || ctx.displayName,
      role: ctx.role,
      projectName: ctx.projectName,
      jobTitle: ctx.jobTitle
    });

  } catch (err) {
    Logger.log('verifyAccess error: ' + err);
    return fail('驗證失敗: ' + err.message);
  }
}

// ★ 修正：每次都重新從試算表抓 role，不使用快取
function checkAutoLogin(lineUserId) {
  try {
    if (!lineUserId) return fail('lineUserId 為空');
    var ctx = getUserContext(String(lineUserId).trim());
    if (!ctx)                                      return fail('使用者不在名單');
    if (ctx.status === CONFIG.STATUS.INACTIVE)     return fail('帳號已停用');
    if (ctx.status === CONFIG.STATUS.PENDING)      return ok({ status: 'pending' });

    updateRowById(CONFIG.SHEETS.USER_ROLE, 'line_user_id', lineUserId, { last_login_at: nowTW() });

    return ok({
      status: 'active',
      lineUserId: lineUserId,
      displayName: ctx.displayName,
      role: ctx.role,
      projectName: ctx.projectName,
      jobTitle: ctx.jobTitle
    });
  } catch (err) { return fail('自動登入失敗: ' + err.message); }
}

// ==================== User Management ====================
function getUserList(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var rows = readSheetAsObjects(CONFIG.SHEETS.USER_ROLE);
    if (ctx.role !== CONFIG.ROLES.ADMIN) {
      rows = rows.filter(function(r) {
        return r.project_name === ctx.projectName || r.status === CONFIG.STATUS.PENDING;
      });
    }
    rows.sort(function(a, b) {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (a.status !== 'pending' && b.status === 'pending') return 1;
      return String(b.created_at).localeCompare(String(a.created_at));
    });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

function updateUserRole(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var targetId = payload.targetUserId;
    if (!targetId) return fail('targetUserId 必填');

    if (ctx.role === CONFIG.ROLES.MANAGER) {
      var target = getUserContext(targetId);
      if (!target) return fail('找不到使用者');
      if (payload.role === 'admin') return fail('Manager 無法指派 Admin 角色');
    }

    var updates = { updated_at: nowTW() };
    if (payload.role        !== undefined) updates.role         = payload.role;
    if (payload.projectName !== undefined) updates.project_name = payload.projectName;
    if (payload.status      !== undefined) updates.status       = payload.status;
    if (payload.displayName !== undefined) updates.display_name = payload.displayName;
    if (payload.jobTitle    !== undefined) updates.job_title    = payload.jobTitle;

    var success = updateRowById(CONFIG.SHEETS.USER_ROLE, 'line_user_id', targetId, updates);
    if (!success) return fail('使用者不存在');
    invalidateUserContextCache(targetId);

    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.USER_ROLE, targetId,
      ctx.displayName + ' 修改 ' + targetId);
    return ok({ targetUserId: targetId });
  } catch (err) { return fail(err.message); }
}

function approveUser(payload) {
  payload.status = CONFIG.STATUS.ACTIVE;
  return updateUserRole(payload);
}

function rejectUser(payload) {
  payload.status = CONFIG.STATUS.INACTIVE;
  return updateUserRole(payload);
}

// ==================== Lookup APIs ====================
function getProjectList() {
  try {
    var rows = readSheetAsObjects(CONFIG.SHEETS.PROJECT)
      .filter(function(r) { return r.status === CONFIG.STATUS.ACTIVE; })
      .map(function(r) { return r.project_name; });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

function getSalesByProject(projectName, lineUserId) {
  try {
    var ctx = getUserContext(lineUserId);
    if (!ctx) return fail('未授權');
    var seen = {};
    var rows = readSheetAsObjects(CONFIG.SHEETS.USER_ROLE)
      .filter(function(r) {
        if (r.status !== CONFIG.STATUS.ACTIVE) return false;
        if (r.role !== CONFIG.ROLES.SALES && r.role !== CONFIG.ROLES.MANAGER) return false;
        if (r.project_name !== projectName) return false;
        // User_Role_Table 可能對同一個人有多筆重複的有效紀錄（例如
        // 重新授權 LINE、重新審核過，導致同一個人對到不同的 line_user_id）
        // ——光依 line_user_id 去重抓不到這種情況，改成依姓名去重
        var key = String(r.display_name || '').trim();
        if (!key || seen[key]) return false;
        seen[key] = true;
        return true;
      })
      .map(function(r) { return { name: r.display_name, lineUserId: r.line_user_id, jobTitle: r.job_title || '' }; });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

function getIndustryList()       { return ok(CONFIG.INDUSTRIES); }
function getPurchaseMotiveList() { return ok(CONFIG.PURCHASE_MOTIVES); }

// ==================== Customer Module ====================
function submitPublicLead(payload) {
  try {
    if (!payload.customer_name) return fail('姓名必填');
    if (String(payload.customer_name).length > 50) return fail('姓名過長');
    if (!payload.phone)         return fail('電話必填');
    if (!/^[0-9+#\-\s]{6,20}$/.test(String(payload.phone))) return fail('電話格式錯誤');
    if (payload.message && String(payload.message).length > 500) return fail('訊息過長');
    if (payload.hp)              return fail('提交失敗，請重新整理後再試'); // honeypot：正常訪客看不到這個欄位，機器人才會填

    var customerId = genId('CUST');
    appendObjectToSheet(CONFIG.SHEETS.CUSTOMER, {
      customer_id: customerId,
      created_at: nowTW(),
      updated_at: nowTW(),
      created_by_line_user_id: '',
      created_by_name: '官網EDM表單',
      sales_line_user_id: '',
      sales_name: '',
      project_name: CONFIG.PROJECT_NAME,
      visit_date: todayTW(),
      visit_type: '官網詢問',
      customer_name: payload.customer_name,
      phone: payload.phone,
      age_range: '',
      district: '',
      occupation_industry: '',
      purchase_motive: payload.purchase_motive || '',
      source: '官網EDM',
      room_types: payload.room_types || '',
      budget: '',
      issues: payload.message || '',
      revisit_plan: payload.contact_time ? ('方便聯絡時間：' + payload.contact_time) : '',
      deal_status: '未成交',
      deal_unit: '',
      status_note: '官網表單詢問，尚未接待',
      note: payload.email ? ('Email：' + payload.email) : ''
    });
    writeAuditLog('', 'CREATE', CONFIG.SHEETS.CUSTOMER, customerId, '官網EDM表單新增客戶: ' + payload.customer_name);
    return ok({ customer_id: customerId });
  } catch (err) { Logger.log('submitPublicLead error: ' + err); return fail(err.message); }
}

// ★ 吉隆天曜專屬：客戶資料表額外欄位（對照紙本「訪客服務表」補齊的
// 欄位，天地版本沒有這些）。之後如果要用天地的版本重新同步吉隆
// 天曜，記得保留這整段跟 appendCustomerData/updateCustomerData 裡
// 用到這些欄位的部分，不要被覆蓋掉。
var CUSTOMER_EXTRA_FIELDS = ['gender','marital_status','visit_time_slot',
  'sqft_requirement','room_requirement_note','introduced_units','referrer_name',
  'linked_customer_id','linked_customer_name','linked_visit_date'];

function ensureCustomerExtraColumns() {
  var sh = getSheet(CONFIG.SHEETS.CUSTOMER);
  if (!sh) return;
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var missing = CUSTOMER_EXTRA_FIELDS.filter(function(h){ return headers.indexOf(h) < 0; });
  if (!missing.length) return;
  sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
}

function appendCustomerData(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.customer_name) return fail('客戶姓名必填');
    if (!payload.phone)         return fail('電話必填');
    if (!payload.status_note)   return fail('接待狀況必填');

    // 防止重複建檔：這支 API 要讀整張表查重複電話 + 寫 Sheets + 同步
    // Supabase，耗時常常超過前端 gasFetch 的 10 秒逾時，逾時後前端會
    // 自動重試一次（同一個 client_request_id）。但 GAS 執行不會因為
    // 前端放棄等待就中止，如果重試送達時第一次執行還沒跑完，光靠
    // 「查快取有沒有結果」會兩邊都查到空的、照樣建立兩筆。所以在真正
    // 開始建檔前先「認領」這個 key（存 PROCESSING），重試那邊如果看到
    // PROCESSING，就輪詢等第一次執行寫入最終結果，而不是自己重新跑一次
    var idemKey = payload.client_request_id ? 'appendcust_' + payload.client_request_id : null;
    var idemCache = idemKey ? CacheService.getScriptCache() : null;
    if (idemKey) {
      var existing = idemCache.get(idemKey);
      if (existing && existing !== 'PROCESSING') return JSON.parse(existing);
      if (existing === 'PROCESSING') {
        for (var waitMs = 0; waitMs < 15000; waitMs += 500) {
          Utilities.sleep(500);
          var polled = idemCache.get(idemKey);
          if (polled && polled !== 'PROCESSING') return JSON.parse(polled);
        }
        return fail('前一筆送出仍處理中，請稍後查看客戶名單確認是否已建立，避免重複建檔');
      }
      idemCache.put(idemKey, 'PROCESSING', 120);
    }

    var projectName = ctx.role === CONFIG.ROLES.ADMIN
      ? (payload.project_name || ctx.projectName || '') : ctx.projectName;
    if (!projectName) return fail('案場未指定');

    // 接待業務：一般只能是自己；只有 admin 可以指派給別的業務員
    // （幫業務員代填客戶資料），避免業務自己亂填別人名字
    var salesLineUserId = ctx.lineUserId;
    var salesName = ctx.displayName;
    if (ctx.role === CONFIG.ROLES.ADMIN && payload.sales_line_user_id) {
      salesLineUserId = payload.sales_line_user_id;
      salesName = payload.sales_name || salesLineUserId;
    }

    // 同電話號碼已有客戶資料時不擋建檔（可能是換業務接手、客戶回訪等
    // 正常情況），但回傳提示讓前端跳訊息告知，避免業務不知道已經有人
    // 接過這位客戶
    var phone = String(payload.phone).trim();
    var dupRecords = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER)
      .filter(function(r) { return String(r.phone || '').trim() === phone; })
      .map(function(r) { return { customer_name: r.customer_name, visit_date: String(r.visit_date || '').substring(0, 10), sales_name: r.sales_name }; });

    ensureCustomerExtraColumns();
    var customerId = genId('CUST');
    var customerRow = {
      customer_id: customerId,
      created_at: nowTW(),
      updated_at: nowTW(),
      created_by_line_user_id: ctx.lineUserId,
      created_by_name: ctx.displayName,
      sales_line_user_id: salesLineUserId,
      sales_name: salesName,
      project_name: projectName,
      visit_date: payload.visit_date || todayTW(),
      visit_type: payload.visit_type || '',
      customer_name: payload.customer_name,
      phone: payload.phone,
      age_range: payload.age_range || '',
      district: payload.district || '',
      occupation_industry: payload.occupation_industry || '',
      purchase_motive: payload.purchase_motive || '',
      source: payload.source || '',
      room_types: payload.room_types || '',
      budget: payload.budget || '',
      issues: payload.issues || '',
      revisit_plan: payload.revisit_plan || '',
      deal_status: '未成交',
      deal_unit: '',
      status_note: payload.status_note,
      note: payload.note || '',
      gender: payload.gender || '',
      marital_status: payload.marital_status || '',
      visit_time_slot: payload.visit_time_slot || '',
      sqft_requirement: payload.sqft_requirement || '',
      room_requirement_note: payload.room_requirement_note || '',
      introduced_units: payload.introduced_units || '',
      referrer_name: payload.referrer_name || '',
      linked_customer_id: payload.linked_customer_id || '',
      linked_customer_name: payload.linked_customer_name || '',
      linked_visit_date: payload.linked_visit_date || ''
    };
    appendObjectToSheet(CONFIG.SHEETS.CUSTOMER, customerRow);
    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.CUSTOMER, customerId,
      ctx.displayName + ' 新增客戶: ' + payload.customer_name);
    dwSyncVisitCreate_(customerRow); // Supabase 雙寫（失敗不影響上面的 Sheets 寫入結果）
    var result = ok({ customer_id: customerId, duplicate_phone: dupRecords.length > 0, duplicate_records: dupRecords });
    if (idemKey) {
      // 存 2 分鐘：遠超過前端「10 秒逾時 + 700ms 後重試一次」的時間窗，
      // 重試那次一定拿得到快取；2 分鐘後自動過期，不會佔用快取空間
      try { CacheService.getScriptCache().put(idemKey, JSON.stringify(result), 120); } catch (e) {}
    }
    return result;
  } catch (err) {
    Logger.log('appendCustomerData error: ' + err);
    var failResult = fail(err.message);
    // 建檔失敗要釋放 PROCESSING 認領，不然真的重試時會被誤判成
    // 「前一次還在處理中」，白白卡 15 秒又拿到假的處理中訊息
    if (idemKey) { try { CacheService.getScriptCache().put(idemKey, JSON.stringify(failResult), 120); } catch (e2) {} }
    return failResult;
  }
}

// 主管標記成交
// 標記成交／退戶。退戶時（deal_status='退戶'）保留原本的 deal_unit（除非另外傳新值），
// 並把狀態變化寫進 Customer_Change_Log，讓「修改紀錄」看得到是誰、何時、為何改的
function updateCustomerDeal(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限，需主管以上');
    if (!payload.customer_id) return fail('customer_id 必填');

    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER);
    var original = null;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].customer_id) === String(payload.customer_id)) { original = rows[i]; break; }
    }
    if (!original) return fail('找不到客戶資料');

    var newStatus = payload.deal_status || '已成交';
    var updates = {
      deal_status: newStatus,
      deal_unit:   payload.deal_unit != null && payload.deal_unit !== '' ? payload.deal_unit : (original.deal_unit || ''),
      updated_at:  nowTW()
    };
    updateRowById(CONFIG.SHEETS.CUSTOMER, 'customer_id', payload.customer_id, updates);

    var logId = genId('CLOG');
    appendObjectToSheet(CONFIG.SHEETS.CHANGE_LOG, {
      log_id:                  logId,
      customer_id:             payload.customer_id,
      customer_name:           original.customer_name,
      changed_by_line_user_id: ctx.lineUserId,
      changed_by_name:         ctx.displayName,
      changed_at:              nowTW(),
      changes_json:            JSON.stringify([{
        field: 'deal_status', before: original.deal_status || '', after: newStatus,
        note: payload.reason || ''
      }])
    });

    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.CUSTOMER, payload.customer_id,
      ctx.displayName + ' 變更成交狀態為「' + newStatus + '」: ' + payload.customer_id +
      (payload.reason ? '（原因：' + payload.reason + '）' : ''));
    return ok({ customer_id: payload.customer_id });
  } catch (err) { return fail(err.message); }
}

// ==================== 成交明細模組（Deal_Detail） ====================
// 存放每一筆成交/退戶的詳細資料：戶別、房屋底價、車位底價、溢價、成交價、
// 訂金、簽約狀態（待簽約/已簽約）、預定簽約日期。跟 Customer_Data 的
// deal_status/deal_unit（客戶卡片上的小標籤）是互補關係：Customer_Data
// 存快速狀態，這裡存完整交易細節，兩者用 customer_id 對起來。
var DEAL_DETAIL_HEADERS = ['deal_id','customer_id','customer_name','project_name','unit',
  'house_base_price','parking_base_price','premium','deal_price','deposit_amount',
  'contract_status','expected_sign_date','signed_date','salesperson','sales_line_user_id',
  'created_by_line_user_id','status','refund_reason','refund_date','created_at','created_by','updated_at'];

// 會自動補齊缺少的欄位（例如之後版本新增欄位時，既有的 Deal_Detail 分頁
// 不用手動改表頭），不會動到既有資料列
function ensureDealDetailSheet() {
  var ss = getCrmSS();
  var name = CONFIG.SHEETS.DEAL_DETAIL;
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1,1,1,DEAL_DETAIL_HEADERS.length).setValues([DEAL_DETAIL_HEADERS]);
    sh.getRange(1,1,1,DEAL_DETAIL_HEADERS.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    Logger.log('✓ Deal_Detail 分頁已建立');
    return sh;
  }
  var existing = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var missing = DEAL_DETAIL_HEADERS.filter(function(h){ return existing.indexOf(h) < 0; });
  if (missing.length) {
    sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
    sh.getRange(1, existing.length + 1, 1, missing.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  }
  return sh;
}

// 新增或更新一筆成交明細。有帶 deal_id 就是更新（會先讀出原本的資料當底，
// payload 沒帶到的欄位不會被清空，例如「首頁提醒點一下標記已簽約」這種
// 只想改簽約狀態、不想被迫重打一次房價的情境），沒帶就是新增一筆。
function saveDealDetail(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限，需主管以上');

    ensureDealDetailSheet();

    var existing = null;
    if (payload.deal_id) {
      existing = readSheetAsObjects(CONFIG.SHEETS.DEAL_DETAIL).filter(function(r) {
        return String(r.deal_id) === String(payload.deal_id);
      })[0];
      if (!existing) return fail('找不到成交明細');
    }
    var base = existing || {};

    function pick(key, fallback) {
      return (payload[key] != null && payload[key] !== '') ? payload[key]
        : (base[key] != null && base[key] !== '' ? base[key] : fallback);
    }

    var housePrice = +pick('house_base_price', 0) || 0;
    var parkPrice  = +pick('parking_base_price', 0) || 0;
    var premium    = +pick('premium', 0) || 0;
    var dealPrice  = (payload.deal_price != null && payload.deal_price !== '')
      ? (+payload.deal_price || 0) : (housePrice + parkPrice + premium);
    var contractStatus = pick('contract_status', '待簽約') === '已簽約' ? '已簽約' : '待簽約';

    var row = {
      deal_id:              existing ? existing.deal_id : genId('DEAL'),
      customer_id:          pick('customer_id', ''),
      customer_name:        pick('customer_name', ''),
      project_name:         base.project_name || ctx.projectName || '',
      unit:                 pick('unit', ''),
      house_base_price:     housePrice,
      parking_base_price:   parkPrice,
      premium:              premium,
      deal_price:           dealPrice,
      deposit_amount:       +pick('deposit_amount', 0) || 0,
      contract_status:      contractStatus,
      expected_sign_date:   contractStatus === '待簽約' ? pick('expected_sign_date', '') : '',
      signed_date:          contractStatus === '已簽約' ? (base.signed_date || todayTW()) : '',
      salesperson:          pick('salesperson', ctx.displayName || ''),
      sales_line_user_id:   pick('sales_line_user_id', ctx.lineUserId),
      created_by_line_user_id: base.created_by_line_user_id || ctx.lineUserId,
      status:               base.status || 'active',
      refund_reason:        base.refund_reason || '',
      refund_date:          base.refund_date || '',
      created_at:           base.created_at || nowTW(),
      created_by:           base.created_by || ctx.displayName || ctx.lineUserId,
      updated_at:           nowTW()
    };

    if (existing) {
      updateRowById(CONFIG.SHEETS.DEAL_DETAIL, 'deal_id', row.deal_id, row);
    } else {
      appendObjectToSheet(CONFIG.SHEETS.DEAL_DETAIL, row);
    }

    writeAuditLog(ctx.lineUserId, existing ? 'UPDATE' : 'CREATE', CONFIG.SHEETS.DEAL_DETAIL, row.deal_id,
      ctx.displayName + ' 記錄成交明細：' + row.unit + ' / ' + row.customer_name);
    dwSyncDeal_(row); // Supabase 雙寫（失敗不影響上面的 Sheets 寫入結果）
    return ok(row);
  } catch (err) { return fail(err.message); }
}

// 依 customer_id 找最新一筆有效成交明細（標記退戶時，先帶出原本填過的
// 戶別/價格資料讓使用者確認/調整，不用整筆重打）
function getDealDetailByCustomer(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.customer_id) return fail('customer_id 必填');
    var rows = readSheetAsObjects(CONFIG.SHEETS.DEAL_DETAIL).filter(function(r) {
      return String(r.customer_id) === String(payload.customer_id) && r.status === 'active';
    });
    rows.sort(function(a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
    return ok(rows[0] || null);
  } catch (err) { return fail(err.message); }
}

// 標記一筆成交明細為退戶（跟 updateCustomerDeal 一起呼叫，一個改
// Customer_Data 的快速狀態，一個改這裡的完整交易紀錄）
function markDealDetailRefund(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限，需主管以上');
    if (!payload.deal_id) return fail('deal_id 必填');
    var found = updateRowById(CONFIG.SHEETS.DEAL_DETAIL, 'deal_id', payload.deal_id, {
      status: '退戶',
      refund_reason: payload.reason || '',
      refund_date: todayTW(),
      updated_at: nowTW()
    });
    if (!found) return fail('找不到成交明細');
    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.DEAL_DETAIL, payload.deal_id,
      ctx.displayName + ' 標記成交明細退戶：' + payload.deal_id);
    return ok({ deal_id: payload.deal_id });
  } catch (err) { return fail(err.message); }
}

// 待簽約提醒（首頁用）：業務只看自己的，主管看同案場全部業務的，
// admin 看全部案場。已逾期（predicted_sign_date 已過但還沒簽約）
// 前端會用紅字標示、持續顯示，不會因為日期過了就悄悄消失——
// 只有真的改成「已簽約」或被標記退戶，才會從清單中消失。
function getPendingSignatures(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    var rows = readSheetAsObjects(CONFIG.SHEETS.DEAL_DETAIL).filter(function(r) {
      if (r.status !== 'active' || r.contract_status !== '待簽約') return false;
      if (ctx.role === CONFIG.ROLES.ADMIN) return true;
      if (ctx.role === CONFIG.ROLES.MANAGER) return r.project_name === ctx.projectName;
      return String(r.sales_line_user_id) === String(ctx.lineUserId);
    });
    rows.sort(function(a, b) { return String(a.expected_sign_date).localeCompare(String(b.expected_sign_date)); });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// 查某一天「這個人自己已經記錄過」的成交明細筆數（用 created_by_line_user_id
// 判斷，也就是誰實際操作表單記錄的，不是 salesperson 掛名欄位）。
// 提交日報表時用來判斷：已經在「近期客戶」用「標記成交」填過的，
// 交日報就不用再跳窗重填一次，避免同一筆成交被記錄兩次。
function getDealDetailsForDate(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    var date = String(payload.date || todayTW()).substring(0, 10);
    var rows = readSheetAsObjects(CONFIG.SHEETS.DEAL_DETAIL).filter(function(r) {
      if (r.status !== 'active') return false;
      if (String(r.created_at).substring(0, 10) !== date) return false;
      return String(r.created_by_line_user_id) === String(ctx.lineUserId);
    });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// ==================== Contact Log Module（客戶追蹤記錄） ====================
var CONTACT_LOG_HEADERS = ['contact_id','customer_id','customer_name','phone','project_name',
  'sales_line_user_id','sales_name','contact_date','contact_method','note',
  'next_followup_date','created_at','created_by_line_user_id'];

function ensureContactLogSheet() {
  var ss = getCrmSS();
  var name = CONFIG.SHEETS.CONTACT_LOG;
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1,1,1,CONTACT_LOG_HEADERS.length).setValues([CONTACT_LOG_HEADERS]);
    sh.getRange(1,1,1,CONTACT_LOG_HEADERS.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    Logger.log('✓ Contact_Log 分頁已建立');
    return sh;
  }
  var existing = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var missing = CONTACT_LOG_HEADERS.filter(function(h){ return existing.indexOf(h) < 0; });
  if (missing.length) {
    sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
    sh.getRange(1, existing.length + 1, 1, missing.length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
  }
  return sh;
}

// 新增一筆追蹤記錄。業務只能記自己的客戶（sales_line_user_id 或
// created_by_line_user_id 是自己），主管/admin 在自己權限範圍內的
// 客戶都能記。填了 next_followup_date 就會在首頁提醒，下一筆記錄
// （不管有沒有再填 next_followup_date）送出後就會取代掉上一筆的提醒。
function appendContactLog(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.customer_id)    return fail('customer_id 必填');
    if (!payload.contact_method) return fail('聯絡方式必填');

    var cust = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      return String(r.customer_id) === String(payload.customer_id);
    })[0];
    if (!cust) return fail('找不到客戶資料');
    if (ctx.role === CONFIG.ROLES.SALES &&
        String(cust.sales_line_user_id) !== String(ctx.lineUserId) &&
        String(cust.created_by_line_user_id) !== String(ctx.lineUserId)) {
      return fail('只能記錄自己的客戶');
    }

    ensureContactLogSheet();
    var row = {
      contact_id:          genId('CONTACT'),
      customer_id:         cust.customer_id,
      customer_name:       cust.customer_name,
      phone:               cust.phone || '',
      project_name:        cust.project_name || ctx.projectName || '',
      sales_line_user_id:  cust.sales_line_user_id || ctx.lineUserId,
      sales_name:          cust.sales_name || ctx.displayName,
      contact_date:        payload.contact_date || todayTW(),
      contact_method:      payload.contact_method,
      note:                payload.note || '',
      next_followup_date:  payload.next_followup_date || '',
      created_at:          nowTW(),
      created_by_line_user_id: ctx.lineUserId
    };
    appendObjectToSheet(CONFIG.SHEETS.CONTACT_LOG, row);
    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.CONTACT_LOG, row.contact_id,
      ctx.displayName + ' 新增客戶追蹤記錄：' + row.customer_name + ' / ' + row.contact_method);
    dwSyncContact_(row); // Supabase 雙寫（失敗不影響上面的 Sheets 寫入結果）
    return ok(row);
  } catch (err) { return fail(err.message); }
}

// 某客戶的追蹤記錄（新到舊）
function getContactLogsByCustomer(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.customer_id) return fail('customer_id 必填');
    var rows = readSheetAsObjects(CONFIG.SHEETS.CONTACT_LOG).filter(function(r) {
      return String(r.customer_id) === String(payload.customer_id);
    });
    rows.sort(function(a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// 業務只能刪自己記錄的追蹤；主管/admin 可以刪任何一筆
function deleteContactLog(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.contact_id) return fail('contact_id 必填');

    var result = deleteRowById(CONFIG.SHEETS.CONTACT_LOG, 'contact_id', payload.contact_id, {
      checkFn: function(row) {
        if (ctx.role === CONFIG.ROLES.SALES &&
            String(row.created_by_line_user_id) !== String(ctx.lineUserId)) {
          return '只能刪除自己記錄的追蹤';
        }
        return null;
      }
    });
    if (result.notFound) return fail('找不到該筆追蹤記錄');
    if (result.error) return fail(result.error);

    writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.CONTACT_LOG, payload.contact_id,
      ctx.displayName + ' 刪除客戶追蹤記錄');
    return ok({ contact_id: payload.contact_id });
  } catch (err) { return fail(err.message); }
}

// 待追蹤提醒（首頁用）：業務只看自己的，主管看同案場全部業務的，
// admin 看全部案場。同一位客戶只看「最新一筆」記錄的 next_followup_date
// ——只要業務再記一筆新的（不管有沒有再填下次日期），舊的提醒就會
// 自然被取代，不用另外手動清除
function getPendingFollowups(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    var rows = readSheetAsObjects(CONFIG.SHEETS.CONTACT_LOG);

    var latestByCustomer = {};
    rows.forEach(function(r) {
      var existing = latestByCustomer[r.customer_id];
      if (!existing || String(r.created_at).localeCompare(String(existing.created_at)) > 0) {
        latestByCustomer[r.customer_id] = r;
      }
    });

    var today = todayTW();
    var pending = Object.keys(latestByCustomer)
      .map(function(cid) { return latestByCustomer[cid]; })
      .filter(function(r) { return r.next_followup_date && String(r.next_followup_date) <= today; });

    pending = filterByCtx(pending, ctx, 'sales_line_user_id');
    pending.sort(function(a, b) { return String(a.next_followup_date).localeCompare(String(b.next_followup_date)); });
    return ok(pending);
  } catch (err) { return fail(err.message); }
}

function getCustomerList(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    // 業務的客戶不能只看 created_by_line_user_id：admin 代填客戶資料時，
    // 建檔人是 admin，實際接待業務是 sales_line_user_id，只比對
    // created_by 會漏掉這些代填的客戶，導致業務自己的統計數字偏低
    // （跟 getMyCustomers 的規則保持一致）
    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      if (ctx.role === CONFIG.ROLES.ADMIN) return true;
      if (ctx.role === CONFIG.ROLES.MANAGER) return r.project_name === ctx.projectName;
      return String(r.sales_line_user_id) === String(ctx.lineUserId) ||
             String(r.created_by_line_user_id) === String(ctx.lineUserId);
    });
    rows.sort(function(a,b){ return String(b.created_at).localeCompare(String(a.created_at)); });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// 近14天客戶資料（主管用）
function getRecentCustomers(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var daysAgo = new Date();
    daysAgo.setDate(daysAgo.getDate() - 14);
    var cutoff = Utilities.formatDate(daysAgo, CONFIG.TIMEZONE, 'yyyy-MM-dd');

    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      var vd = String(r.visit_date || r.created_at || '').substring(0,10);
      if (vd < cutoff) return false;
      if (ctx.role === CONFIG.ROLES.ADMIN) return true;
      return r.project_name === ctx.projectName;
    });

    rows.sort(function(a,b){
      var da = String(a.visit_date || a.created_at || '').substring(0,10);
      var db = String(b.visit_date || b.created_at || '').substring(0,10);
      return db.localeCompare(da);
    });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// 業務查看自己所有客戶
function getMyCustomers(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');

    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      if (ctx.role === CONFIG.ROLES.ADMIN) return true;
      if (ctx.role === CONFIG.ROLES.MANAGER) return r.project_name === ctx.projectName;
      return String(r.sales_line_user_id) === String(ctx.lineUserId) ||
             String(r.created_by_line_user_id) === String(ctx.lineUserId);
    });

    rows.sort(function(a,b){
      var da = String(a.visit_date || a.created_at || '').substring(0,10);
      var db = String(b.visit_date || b.created_at || '').substring(0,10);
      return db.localeCompare(da);
    });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// ★ 回訪客人關聯：業務登記回籠客人時，可以用姓名／電話搜尋自己權限
// 範圍內的歷史客戶資料，把這筆新的回訪紀錄跟原本初訪的那筆連結
// 起來（存 linked_customer_id/name/visit_date 在新的那筆客戶資料
// 上）。搜尋範圍跟 getMyCustomers 用同一套角色權限規則：業務只搜得到
// 自己的客戶、主管限案場、admin 不限。姓名用模糊比對、電話也用模糊
// 比對（方便只記得後幾碼的情況），最多回傳 15 筆、依訪客日期新到舊
function searchMyCustomers(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    var keyword = String((payload && payload.keyword) || '').trim();
    if (!keyword) return ok([]);

    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      if (ctx.role === CONFIG.ROLES.ADMIN) return true;
      if (ctx.role === CONFIG.ROLES.MANAGER) return r.project_name === ctx.projectName;
      return String(r.sales_line_user_id) === String(ctx.lineUserId) ||
             String(r.created_by_line_user_id) === String(ctx.lineUserId);
    }).filter(function(r) {
      var name  = String(r.customer_name || '');
      var phone = String(r.phone || '');
      return name.indexOf(keyword) >= 0 || phone.indexOf(keyword) >= 0;
    });

    rows.sort(function(a,b){ return String(b.visit_date||'').localeCompare(String(a.visit_date||'')); });

    var results = rows.slice(0, 15).map(function(r) {
      return {
        customer_id:   r.customer_id,
        customer_name: r.customer_name,
        phone:         r.phone,
        visit_date:    String(r.visit_date || '').substring(0, 10),
        visit_type:    r.visit_type,
        project_name:  r.project_name
      };
    });
    return ok(results);
  } catch (err) { return fail(err.message); }
}

// 查詢客戶修改紀錄
function getCustomerChangeLogs(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.customer_id) return fail('customer_id 必填');

    var rows = readSheetAsObjects(CONFIG.SHEETS.CHANGE_LOG).filter(function(r) {
      return String(r.customer_id) === String(payload.customer_id);
    });
    rows.sort(function(a,b){ return String(b.changed_at).localeCompare(String(a.changed_at)); });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// 業務修改客戶資料（14天內）
function updateCustomerData(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.customer_id) return fail('customer_id 必填');

    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER);
    var original = null;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].customer_id) === String(payload.customer_id)) { original = rows[i]; break; }
    }
    if (!original) return fail('找不到客戶資料');

    if (ctx.role === CONFIG.ROLES.SALES) {
      if (String(original.sales_line_user_id) !== String(ctx.lineUserId) &&
          String(original.created_by_line_user_id) !== String(ctx.lineUserId)) {
        return fail('只能修改自己的客戶資料');
      }
      var createdAt = new Date(original.created_at);
      var diffDays = (new Date() - createdAt) / (1000 * 60 * 60 * 24);
      if (diffDays > 14) return fail('超過14天，無法修改');
    }

    ensureCustomerExtraColumns();
    var editableFields = [
      'visit_date','visit_type','customer_name','phone','age_range','district',
      'occupation_industry','purchase_motive','source','room_types',
      'budget','issues','revisit_plan','status_note','note'
    ].concat(CUSTOMER_EXTRA_FIELDS);
    if (ctx.role !== CONFIG.ROLES.SALES) {
      editableFields = editableFields.concat(['sales_name','sales_line_user_id']);
    }

    var changes = [];
    var updates = { updated_at: nowTW() };
    editableFields.forEach(function(field) {
      if (payload[field] !== undefined && String(payload[field]) !== String(original[field] || '')) {
        changes.push({
          field: field,
          before: String(original[field] || ''),
          after:  String(payload[field])
        });
        updates[field] = payload[field];
      }
    });

    if (!changes.length) return ok({ customer_id: payload.customer_id, message: '無變更' });

    updateRowById(CONFIG.SHEETS.CUSTOMER, 'customer_id', payload.customer_id, updates);
    dwSyncVisitUpdate_(payload.customer_id, updates); // Supabase 雙寫（失敗不影響上面的 Sheets 寫入結果）

    var logId = genId('CLOG');
    appendObjectToSheet(CONFIG.SHEETS.CHANGE_LOG, {
      log_id:                  logId,
      customer_id:             payload.customer_id,
      customer_name:           original.customer_name,
      changed_by_line_user_id: ctx.lineUserId,
      changed_by_name:         ctx.displayName,
      changed_at:              nowTW(),
      changes_json:            JSON.stringify(changes)
    });

    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.CUSTOMER, payload.customer_id,
      ctx.displayName + ' 修改客戶 ' + original.customer_name + '，共 ' + changes.length + ' 個欄位');

    return ok({ customer_id: payload.customer_id, changes_count: changes.length });
  } catch (err) { Logger.log('updateCustomerData error: ' + err); return fail(err.message); }
}

// 業務刪除自己建立的客戶資料（14天內，跟修改資料同一個時間限制）
function deleteCustomerData(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.customer_id) return fail('customer_id 必填');

    var result = deleteRowById(CONFIG.SHEETS.CUSTOMER, 'customer_id', payload.customer_id, {
      checkFn: function(row) {
        if (ctx.role === CONFIG.ROLES.SALES) {
          if (String(row.sales_line_user_id) !== String(ctx.lineUserId) &&
              String(row.created_by_line_user_id) !== String(ctx.lineUserId)) {
            return '只能刪除自己的客戶資料';
          }
          var diffDays = (new Date() - new Date(row.created_at)) / (1000 * 60 * 60 * 24);
          if (diffDays > 14) return '超過14天，無法刪除';
        }
        return null;
      }
    });
    if (result.notFound) return fail('找不到客戶資料');
    if (result.error) return fail(result.error);

    writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.CUSTOMER, payload.customer_id,
      ctx.displayName + ' 刪除客戶 ' + result.row.customer_name);
    return ok({ customer_id: payload.customer_id });
  } catch (err) { return fail(err.message); }
}

function filterByCtx(rows, ctx, ownerField) {
  if (!ctx) return [];
  if (ctx.role === CONFIG.ROLES.ADMIN) return rows;
  return rows.filter(function(r) {
    if (r.project_name !== ctx.projectName) return false;
    if (ctx.role === CONFIG.ROLES.MANAGER) return true;
    return String(r[ownerField]) === String(ctx.lineUserId);
  });
}

// ==================== Task Module ====================
function appendTask(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.title) return fail('任務標題必填');

    var projectName = ctx.role === CONFIG.ROLES.ADMIN
      ? (payload.project_name || ctx.projectName || '') : ctx.projectName;
    if (!projectName) return fail('案場未指定');

    var taskId = genId('TASK');
    appendObjectToSheet(CONFIG.SHEETS.TASK, {
      task_id:                 taskId,
      project_name:            projectName,
      type:                    payload.type || 'sales_task',
      title:                   payload.title,
      description:             payload.description || '',
      priority:                payload.priority || 'normal',
      status:                  CONFIG.STATUS.PENDING,
      assigned_to:             payload.assigned_to || ctx.displayName,
      assigned_to_line_user_id: payload.assigned_to_line_user_id || '',
      created_by:              ctx.displayName,
      created_by_line_user_id: ctx.lineUserId,
      due_date:                payload.due_date || '',
      created_at:              nowTW(),
      updated_at:              nowTW()
    });
    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.TASK, taskId, ctx.displayName + ' 建立任務: ' + payload.title);
    return ok({ task_id: taskId });
  } catch (err) { return fail(err.message); }
}

function getTasks(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    var rows = readSheetAsObjects(CONFIG.SHEETS.TASK);

    if (ctx.role === CONFIG.ROLES.ADMIN) {
      // 全部
    } else if (ctx.role === CONFIG.ROLES.MANAGER) {
      rows = rows.filter(function(r){ return r.project_name === ctx.projectName; });
    } else {
      rows = rows.filter(function(r){
        return r.project_name === ctx.projectName &&
          (String(r.created_by_line_user_id) === String(ctx.lineUserId) ||
           String(r.assigned_to_line_user_id) === String(ctx.lineUserId));
      });
    }
    if (payload.status) rows = rows.filter(function(r){ return r.status === payload.status; });
    rows.sort(function(a,b){
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      return String(a.due_date).localeCompare(String(b.due_date));
    });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

function updateTaskStatus(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.task_id) return fail('task_id 必填');

    updateRowById(CONFIG.SHEETS.TASK, 'task_id', payload.task_id, {
      status: payload.status || CONFIG.STATUS.DONE, updated_at: nowTW()
    });
    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.TASK, payload.task_id,
      ctx.displayName + ' 變更狀態: ' + (payload.status || 'done'));
    return ok({ task_id: payload.task_id });
  } catch (err) { return fail(err.message); }
}

// 修改任務內容（標題／說明／優先度／截止日期／指派對象等），跟
// updateTaskStatus 分開，那支只改狀態。業務只能改自己建立的任務，
// 主管/admin 可以改任何一筆。
function updateTask(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.task_id) return fail('task_id 必填');

    var sh = getSheet(CONFIG.SHEETS.TASK);
    if (!sh) return fail('找不到 Task_List 分頁');
    var data = sh.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('task_id');
    var createdByCol = headers.indexOf('created_by_line_user_id');

    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(payload.task_id)) { rowIndex = i; break; }
    }
    if (rowIndex < 0) return fail('找不到該筆任務');
    if (ctx.role === CONFIG.ROLES.SALES && String(data[rowIndex][createdByCol]) !== String(ctx.lineUserId)) {
      return fail('只能修改自己建立的任務');
    }

    var updates = { updated_at: nowTW() };
    if (payload.title != null)        updates.title = payload.title;
    if (payload.description != null)  updates.description = payload.description;
    if (payload.priority != null)     updates.priority = payload.priority;
    if (payload.due_date != null)     updates.due_date = payload.due_date;
    if (payload.type != null)         updates.type = payload.type;
    if (payload.assigned_to != null)  updates.assigned_to = payload.assigned_to;
    if (payload.assigned_to_line_user_id != null) updates.assigned_to_line_user_id = payload.assigned_to_line_user_id;

    updateRowById(CONFIG.SHEETS.TASK, 'task_id', payload.task_id, updates);
    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.TASK, payload.task_id,
      ctx.displayName + ' 修改任務: ' + (payload.title || ''));
    return ok({ task_id: payload.task_id });
  } catch (err) { return fail(err.message); }
}

function deleteTask(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.task_id) return fail('task_id 必填');

    // 業務只能刪自己建立的任務；主管/admin 可以刪任何任務
    var result = deleteRowById(CONFIG.SHEETS.TASK, 'task_id', payload.task_id, {
      checkFn: function(row) {
        if (ctx.role === CONFIG.ROLES.SALES &&
            String(row.created_by_line_user_id) !== String(ctx.lineUserId)) {
          return '只能刪除自己建立的任務';
        }
        return null;
      }
    });
    if (result.notFound) return fail('找不到該筆任務');
    if (result.error) return fail(result.error);

    writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.TASK, payload.task_id,
      ctx.displayName + ' 刪除任務: ' + result.row.title);
    return ok({ task_id: payload.task_id });
  } catch (err) { return fail(err.message); }
}

// ==================== Daily Report Module ====================
function appendDailyReport(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('業務無權限提交日報');

    var projectName = ctx.role === CONFIG.ROLES.ADMIN
      ? (payload.project_name || ctx.projectName || '') : ctx.projectName;
    if (!projectName) return fail('案場未指定');

    var reportDate      = payload.report_date || todayTW();
    var salesLineUserId = payload.sales_line_user_id || ctx.lineUserId;

    // 防重複：同一人同一天只能有一筆日報，避免不小心重複建立又刪不掉
    var dup = readSheetAsObjects(CONFIG.SHEETS.DAILY_REPORT).some(function(r) {
      return String(r.sales_line_user_id) === String(salesLineUserId) &&
             String(r.report_date).substring(0, 10) === reportDate;
    });
    if (dup) return fail('這天已經提交過日報了，如需修改請先刪除舊的再重新提交');

    var reportId = genId('RPT');
    appendObjectToSheet(CONFIG.SHEETS.DAILY_REPORT, {
      report_id:           reportId,
      report_date:         reportDate,
      project_name:        projectName,
      salesperson:         payload.salesperson || ctx.displayName,
      sales_line_user_id:  salesLineUserId,
      visitor_count:       Number(payload.visitor_count || 0),
      first_visit_count:   Number(payload.first_visit_count || 0),
      revisit_count:       Number(payload.revisit_count || 0),
      call_count:          Number(payload.call_count || 0),
      deal_count:          Number(payload.deal_count || 0),
      transaction_units:   payload.transaction_units || '',
      viewed_units:        payload.viewed_units || '',
      notes:               payload.notes || '',
      created_by:          ctx.displayName,
      created_at:          nowTW()
    });
    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.DAILY_REPORT, reportId, ctx.displayName + ' 提交日報');
    return ok({ report_id: reportId });
  } catch (err) { return fail(err.message); }
}

function deleteDailyReport(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('業務無權限');
    if (!payload.report_id) return fail('report_id 必填');

    // 主管只能刪自己提交的日報；admin 可以刪任何人的
    var result = deleteRowById(CONFIG.SHEETS.DAILY_REPORT, 'report_id', payload.report_id, {
      checkFn: function(row) {
        if (ctx.role === CONFIG.ROLES.MANAGER &&
            String(row.sales_line_user_id) !== String(ctx.lineUserId)) {
          return '只能刪除自己提交的日報';
        }
        return null;
      }
    });
    if (result.notFound) return fail('找不到該筆日報');
    if (result.error) return fail(result.error);

    writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.DAILY_REPORT,
      payload.report_id, ctx.displayName + ' 刪除日報');
    return ok({ report_id: payload.report_id });
  } catch (err) { return fail(err.message); }
}

// 修改已提交的日報（業績數字、成交戶別、備註），僅限提交後3天內。
// 主管只能改自己提交的日報；admin 可以改任何一筆。用 report_id 精準
// 比對（不是日期+姓名），避免同一人同一天多筆或姓名打法不一致對錯列
function updateDailyReport(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('業務無權限');
    if (!payload.report_id) return fail('report_id 必填');

    var rows = readSheetAsObjects(CONFIG.SHEETS.DAILY_REPORT);
    var original = null;
    for (var i = 0; i < rows.length; i++) {
      if (String(rows[i].report_id) === String(payload.report_id)) { original = rows[i]; break; }
    }
    if (!original) return fail('找不到該筆日報');
    if (ctx.role === CONFIG.ROLES.MANAGER && String(original.sales_line_user_id) !== String(ctx.lineUserId)) {
      return fail('只能修改自己提交的日報');
    }

    var reportDate = String(original.report_date).substring(0, 10);
    var diffDays = Math.round((new Date(todayTW() + 'T00:00:00Z') - new Date(reportDate + 'T00:00:00Z')) / 86400000);
    if (diffDays > 3) return fail('此日報已超過3天，無法修改');

    updateRowById(CONFIG.SHEETS.DAILY_REPORT, 'report_id', payload.report_id, {
      visitor_count:     Number(payload.visitor_count || 0),
      first_visit_count: Number(payload.first_visit_count || 0),
      revisit_count:     Number(payload.revisit_count || 0),
      deal_count:        Number(payload.deal_count || 0),
      transaction_units: payload.transaction_units || '',
      notes:             payload.notes || ''
    });
    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.DAILY_REPORT, payload.report_id,
      ctx.displayName + ' 修改日報: ' + reportDate);
    return ok({ report_id: payload.report_id });
  } catch (err) { return fail(err.message); }
}

function getDailyReportSummary(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var date = (payload && payload.date) || todayTW();
    var rows = readSheetAsObjects(CONFIG.SHEETS.DAILY_REPORT).filter(function(r){
      try {
        var rd = Utilities.formatDate(new Date(r.report_date), CONFIG.TIMEZONE, 'yyyy-MM-dd');
        return rd === date && (ctx.role === CONFIG.ROLES.ADMIN || r.project_name === ctx.projectName);
      } catch(e){ return false; }
    });

    var s = { report_date: date, total_visitors: 0, total_first_visit: 0, total_revisit: 0, total_calls: 0, total_deals: 0, reports: rows };
    rows.forEach(function(r){
      s.total_visitors    += Number(r.visitor_count    || 0);
      s.total_first_visit += Number(r.first_visit_count || 0);
      s.total_revisit     += Number(r.revisit_count    || 0);
      s.total_calls       += Number(r.call_count       || 0);
      s.total_deals       += Number(r.deal_count       || 0);
    });
    return ok(s);
  } catch (err) { return fail(err.message); }
}

// ★ 吉隆天曜專屬：日報／月報頁面的來客分布統計，直接統計 Customer_Data
// （居住行政區／來源管道／戶別反應），跟 getDailyReportSummary 同一個
// 權限規則（業務不能看，只有主管/admin 看得到），不用另外手動填寫，
// 直接連動客戶資料表。重新同步時記得保留這兩個函式跟 doGet/doPost
// 裡對應的 case
function countByField(rows, field) {
  var counts = {};
  rows.forEach(function(r) {
    var v = String(r[field] || '').trim();
    if (!v) return;
    counts[v] = (counts[v] || 0) + 1;
  });
  return Object.keys(counts).map(function(k) { return { label: k, count: counts[k] }; })
    .sort(function(a, b) { return b.count - a.count; });
}

// 已介紹產品裡直接掃出「棟別＋戶型」，不管樓層、分隔符號、舊資料的
// 各種寫法（新版下拉選單存的是「A棟1型5樓」，舊資料手動輸入過
// 「A3/13」「A3.B3」「A1-10/5」「A5含車位，B5含車位」等各種格式），
// 統一只看棟別＋戶型分類，樓層/車位/分隔符號一律忽略，這樣新舊資料
// 才能統合成同一種分類（例如 A3/13、A3.B3 的 A3、A2/6 都會歸類成
// 「A棟3型」「A棟2型」）
function countByUnitField(rows) {
  var counts = {};
  var re = /([AB])\s*棟?\s*(\d)/gi;
  rows.forEach(function(r) {
    var raw = String(r.introduced_units || '');
    var m;
    re.lastIndex = 0;
    while ((m = re.exec(raw)) !== null) {
      var key = m[1].toUpperCase() + '棟' + m[2] + '型';
      counts[key] = (counts[key] || 0) + 1;
    }
  });
  return Object.keys(counts).map(function(k) { return { label: k, count: counts[k] }; })
    .sort(function(a, b) { return b.count - a.count; });
}

function getDailyVisitorBreakdown(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var date = String((payload && payload.date) || todayTW()).substring(0, 10);
    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      if (String(r.visit_date).substring(0, 10) !== date) return false;
      return ctx.role === CONFIG.ROLES.ADMIN || r.project_name === ctx.projectName;
    });

    return ok({ total: rows.length, by_district: countByField(rows, 'district'), by_source: countByField(rows, 'source'), by_unit: countByUnitField(rows) });
  } catch (err) { return fail(err.message); }
}

// ★ 吉隆天曜專屬：月報表頁面，統計整個月（YYYY-MM）的接待/初訪/回籠/
// 成交總數，加上跟日報一樣的居住行政區／來源管道／戶別反應分布，
// 直接連動客戶資料表，不用另外手動彙整。權限規則同 getDailyVisitorBreakdown
function getMonthlyVisitorBreakdown(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var month = String((payload && payload.month) || todayTW()).substring(0, 7);
    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      if (String(r.visit_date).substring(0, 7) !== month) return false;
      return ctx.role === CONFIG.ROLES.ADMIN || r.project_name === ctx.projectName;
    });

    return ok({
      month: month,
      total: rows.length,
      first_visit: rows.filter(function(r) { return r.visit_type === '初訪'; }).length,
      revisit: rows.filter(function(r) { return r.visit_type === '回籠'; }).length,
      deal: rows.filter(function(r) { return r.deal_status === '已成交'; }).length,
      by_district: countByField(rows, 'district'),
      by_source: countByField(rows, 'source'),
      by_unit: countByUnitField(rows)
    });
  } catch (err) { return fail(err.message); }
}

// ★ 吉隆天曜專屬：週報表頁面，統計指定週次（startDate~endDate，
// 前端用 ISO 週次換算週一~週日）的接待/初訪/回籠/成交總數，加上跟
// 日報/月報一樣的居住行政區／來源管道／戶別反應分布，權限規則同
// getDailyVisitorBreakdown
function getWeeklyVisitorBreakdown(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var startDate = String((payload && payload.startDate) || todayTW()).substring(0, 10);
    var endDate   = String((payload && payload.endDate)   || todayTW()).substring(0, 10);
    var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
      var vd = String(r.visit_date).substring(0, 10);
      if (vd < startDate || vd > endDate) return false;
      return ctx.role === CONFIG.ROLES.ADMIN || r.project_name === ctx.projectName;
    });

    return ok({
      start_date: startDate,
      end_date: endDate,
      total: rows.length,
      first_visit: rows.filter(function(r) { return r.visit_type === '初訪'; }).length,
      revisit: rows.filter(function(r) { return r.visit_type === '回籠'; }).length,
      deal: rows.filter(function(r) { return r.deal_status === '已成交'; }).length,
      by_district: countByField(rows, 'district'),
      by_source: countByField(rows, 'source'),
      by_unit: countByUnitField(rows)
    });
  } catch (err) { return fail(err.message); }
}

// 銷售日報歷史區間查詢（近3~6個月歷史清單／週比較／月比較 用）
function getDailyReportRange(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var months = Math.max(1, Math.min(12, Number(payload && payload.months) || 3));
    var cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - months);
    var cutoff = Utilities.formatDate(cutoffDate, CONFIG.TIMEZONE, 'yyyy-MM-dd');

    var rows = readSheetAsObjects(CONFIG.SHEETS.DAILY_REPORT).filter(function(r) {
      var rd = String(r.report_date || '').substring(0, 10);
      if (!rd || rd < cutoff) return false;
      return ctx.role === CONFIG.ROLES.ADMIN || r.project_name === ctx.projectName;
    });

    rows.sort(function(a, b) { return String(a.report_date).localeCompare(String(b.report_date)); });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

// ==================== Maintenance Module ====================
// 確保 Maintenance_Report 分頁有 photo_url 這個欄位（既有分頁可能是
// 更早之前建立的，沒有這個欄位），沒有的話自動補上，不會動到既有資料
// 確保 Maintenance_Report 分頁有 photo_url／priority 這兩個欄位（既有
// 分頁可能是更早之前建立的，沒有這兩個欄位），沒有的話自動補上，
// 不會動到既有資料。priority 欄位補上是因為之前 appendMaintenance
// 漏掉沒寫，前端表單選的優先度其實一直沒有被存進去，這次一併修正。
function ensureMaintenancePhotoColumn() {
  var sh = getSheet(CONFIG.SHEETS.MAINTENANCE);
  if (!sh) return;
  var need = ['photo_url', 'priority'];
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var missing = need.filter(function(h){ return headers.indexOf(h) < 0; });
  if (!missing.length) return;
  sh.getRange(1, headers.length + 1, 1, missing.length).setValues([missing]);
}

// 上傳維修通報的現場照片：base64 圖片資料先存進 Google Drive，
// 回傳可公開檢視的網址，前端再把這個網址帶進 appendMaintenance 的
// photo_url 欄位。因為圖片資料量大，這支一定要透過真正的 POST
// （gasPostJson）呼叫，不能走原本 GET+payload 那一套（網址長度會爆掉）。
function uploadMaintenancePhoto(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.photo_base64) return fail('缺少照片資料');

    var mimeType = payload.mime_type || 'image/jpeg';
    var ext = mimeType.indexOf('png') >= 0 ? 'png' : 'jpg';
    var bytes = Utilities.base64Decode(payload.photo_base64);
    var blob = Utilities.newBlob(bytes, mimeType, 'maint_' + Date.now() + '.' + ext);

    var folderName = '維修通報照片';
    var folders = DriveApp.getFoldersByName(folderName);
    var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

    var file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    var url = 'https://drive.google.com/uc?export=view&id=' + file.getId();
    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.MAINTENANCE, file.getId(), ctx.displayName + ' 上傳維修照片');
    return ok({ photo_url: url });
  } catch (err) { return fail('照片上傳失敗：' + err.message); }
}

function appendMaintenance(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.issue_type)  return fail('問題類型必填');
    if (!payload.description) return fail('問題描述必填');

    var projectName = ctx.role === CONFIG.ROLES.ADMIN
      ? (payload.project_name || ctx.projectName || '') : ctx.projectName;
    if (!projectName) return fail('案場未指定');

    ensureMaintenancePhotoColumn();

    var maintId = genId('MAINT');
    appendObjectToSheet(CONFIG.SHEETS.MAINTENANCE, {
      maintenance_id:          maintId,
      project_name:            projectName,
      location:                payload.location || '',
      issue_type:              payload.issue_type,
      description:             payload.description,
      priority:                payload.priority || 'normal',
      photo_url:               payload.photo_url || '',
      reported_by:             ctx.displayName,
      reported_by_line_user_id: ctx.lineUserId,
      assigned_to:             payload.assigned_to || '',
      status:                  CONFIG.STATUS.PENDING,
      created_at:              nowTW(),
      updated_at:              nowTW(),
      completed_at:            ''
    });

    var token      = getProp(CONFIG.PROP_KEYS.LINE_TOKEN);
    var pushTarget = getProp(CONFIG.PROP_KEYS.LINE_PUSH_TARGET);
    if (token && pushTarget) {
      sendLinePushToAll(
        '案場：' + CONFIG.PROJECT_NAME + '\n🔧 維修通報\n位置：' + (payload.location || '未指定') +
        (projectName !== CONFIG.PROJECT_NAME ? '\n子案場：' + projectName : '') +
        '\n類型：' + payload.issue_type +
        '\n描述：' + payload.description +
        '\n通報人：' + ctx.displayName);
    }
    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.MAINTENANCE, maintId, ctx.displayName + ' 通報: ' + payload.issue_type);
    return ok({ maintenance_id: maintId });
  } catch (err) { return fail(err.message); }
}

function getMaintenanceList(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    var rows = readSheetAsObjects(CONFIG.SHEETS.MAINTENANCE);
    if (ctx.role === CONFIG.ROLES.SALES) {
      rows = rows.filter(function(r){ return r.project_name === ctx.projectName && String(r.reported_by_line_user_id) === String(ctx.lineUserId); });
    } else if (ctx.role === CONFIG.ROLES.MANAGER) {
      rows = rows.filter(function(r){ return r.project_name === ctx.projectName; });
    }
    rows.sort(function(a,b){ return String(b.created_at).localeCompare(String(a.created_at)); });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

function updateMaintenanceStatus(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.maintenance_id) return fail('maintenance_id 必填');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');

    var updates = { status: payload.status || CONFIG.STATUS.DONE, updated_at: nowTW() };
    if (payload.status === CONFIG.STATUS.DONE) updates.completed_at = nowTW();

    updateRowById(CONFIG.SHEETS.MAINTENANCE, 'maintenance_id', payload.maintenance_id, updates);
    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.MAINTENANCE, payload.maintenance_id,
      ctx.displayName + ' 變更維修狀態: ' + (payload.status || 'done'));
    return ok({ maintenance_id: payload.maintenance_id });
  } catch (err) { return fail(err.message); }
}

// 修改維修通報內容（問題類型／位置／描述／優先度／照片），跟
// updateMaintenanceStatus 分開，那支只改處理狀態。業務只能改自己
// 通報的，主管/admin 可以改任何一筆。
function updateMaintenance(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.maintenance_id) return fail('maintenance_id 必填');

    var sh = getSheet(CONFIG.SHEETS.MAINTENANCE);
    if (!sh) return fail('找不到 Maintenance_Report 分頁');
    var data = sh.getDataRange().getValues();
    var headers = data[0];
    var idCol = headers.indexOf('maintenance_id');
    var reportedByCol = headers.indexOf('reported_by_line_user_id');

    var rowIndex = -1;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][idCol]) === String(payload.maintenance_id)) { rowIndex = i; break; }
    }
    if (rowIndex < 0) return fail('找不到該筆維修通報');
    if (ctx.role === CONFIG.ROLES.SALES && String(data[rowIndex][reportedByCol]) !== String(ctx.lineUserId)) {
      return fail('只能修改自己通報的維修');
    }

    ensureMaintenancePhotoColumn();
    var updates = { updated_at: nowTW() };
    if (payload.issue_type != null)  updates.issue_type = payload.issue_type;
    if (payload.location != null)    updates.location = payload.location;
    if (payload.description != null) updates.description = payload.description;
    if (payload.priority != null)    updates.priority = payload.priority;
    if (payload.photo_url)           updates.photo_url = payload.photo_url;

    updateRowById(CONFIG.SHEETS.MAINTENANCE, 'maintenance_id', payload.maintenance_id, updates);
    writeAuditLog(ctx.lineUserId, 'UPDATE', CONFIG.SHEETS.MAINTENANCE, payload.maintenance_id,
      ctx.displayName + ' 修改維修通報');
    return ok({ maintenance_id: payload.maintenance_id });
  } catch (err) { return fail(err.message); }
}

function deleteMaintenance(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.maintenance_id) return fail('maintenance_id 必填');

    // 業務只能刪自己通報的維修；主管/admin 可以刪任何一筆
    var result = deleteRowById(CONFIG.SHEETS.MAINTENANCE, 'maintenance_id', payload.maintenance_id, {
      checkFn: function(row) {
        if (ctx.role === CONFIG.ROLES.SALES &&
            String(row.reported_by_line_user_id) !== String(ctx.lineUserId)) {
          return '只能刪除自己通報的維修';
        }
        return null;
      }
    });
    if (result.notFound) return fail('找不到該筆維修通報');
    if (result.error) return fail(result.error);

    writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.MAINTENANCE, payload.maintenance_id,
      ctx.displayName + ' 刪除維修通報: ' + result.row.issue_type);
    return ok({ maintenance_id: payload.maintenance_id });
  } catch (err) { return fail(err.message); }
}

// ==================== Leave Schedule Module ====================
function getLeaveSchedule(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');

    var startDate = String(payload.startDate || '').substring(0, 10);
    var endDate   = String(payload.endDate   || '').substring(0, 10);

    var rows = readSheetAsObjects(CONFIG.SHEETS.LEAVE_SCHEDULE).filter(function(r) {
      var d = String(r.leave_date).substring(0, 10);
      if (startDate && d < startDate) return false;
      if (endDate   && d > endDate)   return false;
      return true;
    });

    rows.sort(function(a, b) {
      return String(a.leave_date).localeCompare(String(b.leave_date));
    });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

function getTodayLeave(lineUserId) {
  try {
    var ctx = getUserContext(lineUserId);
    if (!ctx) return fail('未授權');
    var today = todayTW().substring(0, 10);
    var rows  = readSheetAsObjects(CONFIG.SHEETS.LEAVE_SCHEDULE).filter(function(r) {
      return String(r.leave_date).substring(0, 10) === today;
    });
    return ok(rows);
  } catch (err) { return fail(err.message); }
}

function appendLeave(payload) {
  // ★ 吉隆天曜專屬排假限制：平日（一~五）單日最多 2 人休假，六日禁休
  // （除非由主管/admin 排假）。用 LockService 鎖住，避免同時送出時
  // 兩筆request 都讀到「還沒滿」而一起超額。
  var lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');

    var targetUid  = payload.targetLineUserId  || ctx.lineUserId;
    var targetName = payload.targetDisplayName || ctx.displayName;
    var dates      = Array.isArray(payload.dates) ? payload.dates : [payload.dates];
    if (!dates.length) return fail('dates 必填');

    // 權限：業務只能排自己；主管/admin 可排任何人
    if (ctx.role === CONFIG.ROLES.SALES && targetUid !== ctx.lineUserId) {
      return fail('業務只能排自己的假');
    }

    // 案場一律以「被排假的人」自己的案場為準，不要用操作者（可能是不綁案場的
    // admin）自己的案場，否則寫進去的紀錄會因為案場對不上而在當事人自己的
    // 行事曆上完全不顯示
    var projectName = ctx.projectName;
    if (targetUid !== ctx.lineUserId) {
      var targetCtxForProject = getUserContext(targetUid);
      if (targetCtxForProject) projectName = targetCtxForProject.projectName || projectName;
    }
    projectName = projectName || payload.project_name || '';

    var allLeaves = readSheetAsObjects(CONFIG.SHEETS.LEAVE_SCHEDULE);
    var existingDates = {};
    allLeaves.forEach(function(r) {
      if (String(r.line_user_id) === String(targetUid)) existingDates[String(r.leave_date).substring(0,10)] = true;
    });

    var added = 0;
    var blockedWeekend = [];
    var blockedFull = [];
    dates.forEach(function(d) {
      var ds = String(d).substring(0, 10);
      if (existingDates[ds]) return; // 已存在跳過

      var dow = new Date(ds + 'T00:00:00').getDay(); // 0=日 6=六
      if (dow === 0 || dow === 6) {
        // 六日禁休，除非是主管/admin 幫忙排假
        if (ctx.role === CONFIG.ROLES.SALES) { blockedWeekend.push(ds); return; }
      } else {
        // 平日單日最多 2 人（含這批次前面已經加進去的）
        var countThatDay = allLeaves.filter(function(r) {
          return String(r.leave_date).substring(0,10) === ds;
        }).length;
        if (countThatDay >= 2) { blockedFull.push(ds); return; }
      }

      appendObjectToSheet(CONFIG.SHEETS.LEAVE_SCHEDULE, {
        leave_id:              genId('LV'),
        line_user_id:          targetUid,
        display_name:          targetName,
        project_name:          projectName,
        leave_date:            ds,
        created_by_line_user_id: ctx.lineUserId,
        created_at:            nowTW()
      });
      allLeaves.push({ leave_date: ds, line_user_id: targetUid }); // 讓同批次後面的日期也算進當日人數
      added++;
    });

    writeAuditLog(ctx.lineUserId, 'CREATE', CONFIG.SHEETS.LEAVE_SCHEDULE, targetUid,
      ctx.displayName + ' 排假 ' + targetName + ' x' + added + ' 天');

    var msgParts = [];
    if (blockedWeekend.length) msgParts.push('六日禁休（除非主管排假）：' + blockedWeekend.join('、'));
    if (blockedFull.length) msgParts.push('當日已達 2 人上限：' + blockedFull.join('、'));

    return ok({ added: added, blocked: blockedWeekend.concat(blockedFull), message: msgParts.join('；') });
  } catch (err) { return fail(err.message); } finally { lock.releaseLock(); }
}

function deleteLeave(payload) {
  try {
    var ctx = getUserContext(payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (!payload.leave_id) return fail('leave_id 必填');

    // 業務只能刪自己的
    var result = deleteRowById(CONFIG.SHEETS.LEAVE_SCHEDULE, 'leave_id', payload.leave_id, {
      checkFn: function(row) {
        if (ctx.role === CONFIG.ROLES.SALES &&
            String(row.line_user_id) !== String(ctx.lineUserId)) {
          return '只能取消自己的假';
        }
        return null;
      }
    });
    if (result.notFound) return fail('找不到該筆假別');
    if (result.error) return fail(result.error);

    writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.LEAVE_SCHEDULE,
      payload.leave_id, ctx.displayName + ' 取消排假');
    return ok({ leave_id: payload.leave_id });
  } catch (err) { return fail(err.message); }
}

// ==================== Calendar Notes（行事曆重要事項） ====================
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

function getCalendarNotes(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
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
    if (!ctx) return fail('未授權');
    if (ctx.role === CONFIG.ROLES.SALES) return fail('無權限');
    if (!payload.note_id) return fail('note_id 必填');

    var result = deleteRowById(CONFIG.SHEETS.CALENDAR_NOTES, 'note_id', payload.note_id);
    if (result.notFound) return fail('找不到該筆事項');
    if (result.error) return fail(result.error);

    writeAuditLog(ctx.lineUserId, 'DELETE', CONFIG.SHEETS.CALENDAR_NOTES,
      payload.note_id, ctx.displayName + ' 刪除重要事項');
    return ok({ note_id: payload.note_id });
  } catch (err) { return fail(err.message); }
}

// ★ 吉隆天曜專屬：跟天地不一樣，這裡「不」排除 SKY 陳昭文（天地會
// 排除，吉隆天曜要把他的休假也一起算進通報裡）。重新同步時記得保留
// 這個差異，不要被天地的版本覆蓋掉
// ★ 產生下週休假通報，並推播給案場管理員
function generateWeeklyLeaveReport(payload) {
  try {
    var ctx = getUserContext(payload && payload.lineUserId);
    if (!ctx) return fail('未授權');
    if (ctx.role !== CONFIG.ROLES.ADMIN) return fail('無權限，僅限管理員');

    // 計算下週一~下週日
    var now = new Date();
    var dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
    var thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dow);
    var nextMonday = new Date(thisMonday.getFullYear(), thisMonday.getMonth(), thisMonday.getDate() + 7);

    var days = [];
    for (var i = 0; i < 7; i++) {
      days.push(new Date(nextMonday.getFullYear(), nextMonday.getMonth(), nextMonday.getDate() + i));
    }

    var rows = readSheetAsObjects(CONFIG.SHEETS.LEAVE_SCHEDULE);

    var wd = ['日','一','二','三','四','五','六'];
    var lines = [];
    days.forEach(function(d, idx) {
      var ds = Utilities.formatDate(d, CONFIG.TIMEZONE, 'yyyy-MM-dd');
      var isWeekend = idx >= 5;
      var names = rows.filter(function(r) {
        return String(r.leave_date).substring(0, 10) === ds;
      }).map(function(r) { return r.display_name; });

      if (isWeekend && !names.length) return;

      var label = d.getFullYear() + '/' + (d.getMonth()+1) + '/' + d.getDate() + '(' + wd[d.getDay()] + ')';
      lines.push(label + '　休假人員　' + (names.length ? names.join(' ') : '無'));
    });

    var rangeLabel = Utilities.formatDate(days[0], CONFIG.TIMEZONE, 'yyyy/M/d') + '~' + Utilities.formatDate(days[6], CONFIG.TIMEZONE, 'yyyy/M/d');
    var msg = '案場：' + CONFIG.PROJECT_NAME + '\n📋 下週休假通報（' + rangeLabel + '）\n\n' + lines.join('\n');

    var pushed = sendLinePushToAll(msg);

    writeAuditLog(ctx.lineUserId, 'CREATE', 'WeeklyLeaveReport', rangeLabel, ctx.displayName + ' 產生下週休假通報');

    return ok({ message: msg, pushed: pushed });
  } catch (err) { return fail(err.message); }
}

// ==================== Audit Log ====================
function writeAuditLog(lineUserId, action, targetSheet, targetId, detail) {
  try {
    var sh = getSheet(CONFIG.SHEETS.AUDIT_LOG);
    if (!sh) return;
    appendObjectToSheet(CONFIG.SHEETS.AUDIT_LOG, {
      log_id:       genId('LOG'),
      timestamp:    nowTW(),
      line_user_id: lineUserId || '',
      display_name: lineUserId || '',
      action:       action,
      target_sheet: targetSheet,
      target_id:    targetId,
      detail:       String(detail || '').substring(0, 500)
    });
  } catch (err) { Logger.log('writeAuditLog error: ' + err); }
}

// ==================== LINE Messaging ====================
function sendLinePush(toId, text) {
  try {
    var token = getProp(CONFIG.PROP_KEYS.LINE_TOKEN);
    if (!token) { Logger.log('sendLinePush: LINE_CHANNEL_ACCESS_TOKEN 未設定，無法推播'); return; }
    var resp = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/push', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({ to: toId, messages: [{ type: 'text', text: String(text) }] }),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    if (code !== 200) {
      Logger.log('sendLinePush 失敗，HTTP ' + code + '：' + resp.getContentText());
    } else {
      Logger.log('sendLinePush 成功送出給 ' + toId);
    }
  } catch (err) { Logger.log('sendLinePush error: ' + err); }
}

// ★ 手動測試推播功能是否正常：不用等 LINE 傳訊息進來，直接執行這個
// 函式，就會推播一則測試訊息給 LINE_PUSH_TARGET 設定的對象。執行完
// 看下面「執行記錄」：
//   ・如果寫「sendLinePush 成功送出給 ...」→ Token／頻道都正常，
//     去 LINE 看看是不是真的收到這則測試訊息（如果記錄說成功、但
//     LINE 上完全沒收到，代表 LINE_PUSH_TARGET 這個 userId 填錯，
//     或者你的 LINE 帳號沒有加這個官方帳號好友）
//   ・如果寫「sendLinePush 失敗，HTTP ...」→ 把完整錯誤內容截圖給我
function testLinePush() {
  var raw = getProp(CONFIG.PROP_KEYS.LINE_PUSH_TARGET);
  if (!raw) { Logger.log('❌ LINE_PUSH_TARGET 未設定，無法測試'); return; }
  var targets = String(raw).split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
  targets.forEach(function(id) {
    sendLinePush(id, '🔔 這是 testLinePush() 的測試訊息，如果你在 LINE 收到這則，代表推播 Token 正常運作。');
  });
}

// ★ 支援多個推播對象：LINE_PUSH_TARGET 可用逗號分隔多個 userId
function sendLinePushToAll(text) {
  var raw = getProp(CONFIG.PROP_KEYS.LINE_PUSH_TARGET);
  if (!raw) return false;
  var targets = String(raw).split(',').map(function(s) { return s.trim(); }).filter(function(s) { return s; });
  if (!targets.length) return false;
  targets.forEach(function(id) { sendLinePush(id, text); });
  return true;
}

function sendLineReply(replyToken, text) {
  try {
    var token = getProp(CONFIG.PROP_KEYS.LINE_TOKEN);
    if (!token) { Logger.log('sendLineReply: LINE_CHANNEL_ACCESS_TOKEN 未設定，無法回覆'); return; }
    var resp = UrlFetchApp.fetch('https://api.line.me/v2/bot/message/reply', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + token },
      payload: JSON.stringify({ replyToken: replyToken, messages: [{ type: 'text', text: String(text) }] }),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode();
    if (code !== 200) {
      Logger.log('sendLineReply 失敗，HTTP ' + code + '：' + resp.getContentText());
    }
  } catch (err) { Logger.log('sendLineReply error: ' + err); }
}

// ==================== Webhook ====================
// ★★ 目前華雄天地跟吉隆天曜共用同一個 LINE 官方帳號，Webhook 網址
// 現況是指到「華雄天地」的 Apps Script，所以這份吉隆天曜程式碼裡的
// handleWebhookEvent／handleQaCommandRouted 目前實際上收不到任何
// LINE 訊息（LINE 平台根本不會呼叫到這裡）。保留並跟華雄天地那份
// 同步更新，是為了將來如果 Webhook 改指到這份吉隆天曜的網址、或是
// 申請了第二個官方帳號各自獨立時，這裡已經是可以直接運作的版本，
// 不用重新補寫。實際運作中的版本以 Webhook 網址目前指到的那份為準。
function handleWebhookEvent(event) {
  try {
    if (event.type !== 'message' || event.message.type !== 'text') return;
    // 只在跟官方帳號一對一私訊時回應。如果官方帳號被加進群組/多人
    // 聊天室，裡面任何人打指令都會讓「查詢 王小明」這種查詢連同回覆
    // 一起被全部組員看到（客戶資料、業績數字、誰請假…），群組/聊天室
    // 訊息一律忽略，避免這種資料外洩風險
    if (event.source.type !== 'user') return;

    var text       = String(event.message.text || '').trim();
    // 固定指令比對前先去掉所有空白、轉小寫，避免使用者打「我的ID」
    // 沒有空格，卻對不到程式碼裡寫的「我的 ID」(中間有空格) 這種
    // 純粹因為打字差異就完全不回應的情況
    var norm       = text.replace(/\s+/g, '').toLowerCase();
    var replyToken = event.replyToken;
    var userId     = event.source.userId;

    if (norm === '案場維修通報' || norm === '維修通報') {
      sendLineReply(replyToken, '🔧 維修通報入口\n請點擊圖文選單的「維修通報」開啟系統填寫。');
      return;
    }
    if (norm === '我的id' || norm === 'myid') {
      sendLineReply(replyToken, '您的 LINE userId：\n' + userId);
      return;
    }
    if (norm === '問答' || norm === '?' || norm === '幫助' || norm === 'help') {
      sendLineReply(replyToken, QA_HELP_TEXT);
      return;
    }

    var qaReply = handleQaCommandRouted(text, userId);
    if (qaReply != null) { sendLineReply(replyToken, qaReply); return; }
  } catch (err) { Logger.log('handleWebhookEvent error: ' + err); }
}

// ==================== 跨案場路由（v9.4 新增，同步華雄天地 v9.31） ====================
// 詳細背景說明見上面 handleWebhookEvent 的註解，以及華雄天地程式碼
// 裡同一段的說明。邏輯完全一致，只是這份是吉隆天曜視角。
var LINE_SITES = {
  '天地': { spreadsheetId: '16Rz6s_nj0BkP4dBDtoIUdgtvsFnlNQY8BvlZutDhoHM', label: '華雄天地' },
  '天曜': { spreadsheetId: '1id0qeNApu_NNOoQ1H3sA0jws7NGuWo-UMwsFEhI73Gg', label: '吉隆天曜' }
};

function readSheetAsObjectsFromSS(ss, sheetName) {
  var sh = ss.getSheetByName(sheetName);
  if (!sh) return [];
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  return data.slice(1).map(function(row) {
    var obj = {};
    headers.forEach(function(h, i) {
      var v = row[i];
      if (v instanceof Date) {
        var fmt = DATE_ONLY_FIELDS.indexOf(h) >= 0 ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss';
        v = Utilities.formatDate(v, CONFIG.TIMEZONE, fmt);
      }
      obj[h] = v;
    });
    return obj;
  });
}

function getUserContextFromSS(ss, lineUserId) {
  if (!lineUserId) return null;
  var rows = readSheetAsObjectsFromSS(ss, CONFIG.SHEETS.USER_ROLE);
  var ROLE_PRIORITY = { admin: 3, manager: 2, sales: 1 };
  var best = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].line_user_id) !== String(lineUserId)) continue;
    if (!best) { best = rows[i]; continue; }
    if (rows[i].status === 'active' && best.status !== 'active') { best = rows[i]; continue; }
    if (best.status === 'active' && rows[i].status !== 'active') continue;
    var rp = ROLE_PRIORITY[rows[i].role] || 0;
    var bp = ROLE_PRIORITY[best.role]    || 0;
    if (rp > bp) best = rows[i];
  }
  if (!best) return null;
  return {
    lineUserId: best.line_user_id, displayName: best.display_name, role: best.role,
    projectName: best.project_name, jobTitle: best.job_title, status: best.status
  };
}

function handleQaCommandRouted(rawText, userId) {
  var text = rawText.trim();
  var forcedSite = null;
  var prefixMatch = text.match(/^(天地|天曜|華雄天地|吉隆天曜)\s*(.*)$/);
  if (prefixMatch) {
    forcedSite = (prefixMatch[1] === '天地' || prefixMatch[1] === '華雄天地') ? '天地' : '天曜';
    text = prefixMatch[2].trim();
  }

  var matched = [];
  Object.keys(LINE_SITES).forEach(function(key) {
    if (forcedSite && key !== forcedSite) return;
    var ss = SpreadsheetApp.openById(LINE_SITES[key].spreadsheetId);
    if (getUserContextFromSS(ss, userId)) matched.push(key);
  });

  if (!matched.length) {
    Logger.log('handleQaCommandRouted: userId=' + userId +
      (forcedSite ? ' 在「' + LINE_SITES[forcedSite].label + '」' : '') + ' 查無使用者，不回應');
    return null;
  }
  if (matched.length > 1) {
    return '您在「華雄天地」跟「吉隆天曜」都有帳號，請在指令前加上案場名稱，例如：\n・天地 下週休假\n・天曜 下週休假';
  }
  if (!text) return QA_HELP_TEXT;

  var site = matched[0];
  var savedSpreadsheetId = CONFIG.SPREADSHEET_ID;
  var savedProjectName   = CONFIG.PROJECT_NAME;
  try {
    CONFIG.SPREADSHEET_ID = LINE_SITES[site].spreadsheetId;
    CONFIG.PROJECT_NAME   = LINE_SITES[site].label;
    return handleQaCommand(text, userId);
  } finally {
    CONFIG.SPREADSHEET_ID = savedSpreadsheetId;
    CONFIG.PROJECT_NAME   = savedProjectName;
  }
}

// ==================== 簡單問答（固定指令查資料庫，不是自由對話 AI） ====================
// 用法：使用者在 LINE 官方帳號輸入固定格式的文字，系統直接查 Google
// Sheets 現有資料回答，不需要串接任何外部 AI 服務、不用額外費用。
// 只回答查詢者「有權限看」的範圍：業務只看自己的，主管看同案場，
// admin 看全部案場，跟系統其他地方的權限邏輯一致。
var QA_HELP_TEXT =
  '📱 可以問我的問題（請照格式輸入）：\n\n' +
  '・查詢 王小明　→ 查客戶資料\n' +
  '・今日業績　→ 今天的接待/成交數字\n' +
  '・本月業績　→ 這個月累計數字\n' +
  '・待簽約　→ 待簽約清單\n' +
  '・今日休假　→ 今天誰休假\n' +
  '・下週休假　→ 下週一到週日誰休假\n' +
  '・我的待辦　→ 我的待處理任務\n\n' +
  '如果你在華雄天地跟吉隆天曜都有帳號，指令前面可以加案場名稱指定要查哪邊，例如「天地 今日業績」「天曜 今日業績」，只在單一案場有帳號的話不用加。\n\n' +
  '輸入「問答」隨時可以再看到這份說明。';

function handleQaCommand(text, userId) {
  var ctx = getUserContext(userId);
  if (!ctx) { Logger.log('handleQaCommand: 查無使用者 userId=' + userId + '，不回應'); return null; }

  var norm = text.replace(/\s+/g, '');
  if (norm === '今日業績' || norm === '今天業績') return qaPerformance(ctx, 'today');
  if (norm === '本月業績' || norm === '這個月業績') return qaPerformance(ctx, 'month');
  if (norm === '待簽約') return qaPendingSignatures(ctx);
  if (norm === '今日休假' || norm === '誰休假' || norm === '今天誰休假') return qaTodayLeave();
  if (norm === '下週休假' || norm === '下周休假' || norm === '下星期休假') return qaNextWeekLeave();
  if (norm === '我的待辦' || norm === '待辦' || norm === '我的任務') return qaMyTasks(ctx);

  var m = text.match(/^查詢?\s*(.+)$/);
  if (m && m[1]) return qaSearchCustomer(m[1].trim(), ctx);

  Logger.log('handleQaCommand: 文字「' + text + '」沒有對應到任何指令，不回應');
  return null;
}

function qaSumReportFields(rows) {
  var t = { visitor: 0, first: 0, revisit: 0, deal: 0 };
  rows.forEach(function(r) {
    t.visitor += (+r.visitor_count || 0);
    t.first   += (+r.first_visit_count || 0);
    t.revisit += (+r.revisit_count || 0);
    t.deal    += (+r.deal_count || 0);
  });
  return t;
}

function qaPerformance(ctx, range) {
  var label, matches;
  if (range === 'today') {
    var d = todayTW();
    label = '今日業績（' + d + '）';
    matches = function(r) { return String(r.report_date).substring(0,10) === d; };
  } else {
    var ym = todayTW().substring(0,7);
    label = '本月業績（' + ym + '）';
    matches = function(r) { return String(r.report_date).substring(0,7) === ym; };
  }
  var rows = readSheetAsObjects(CONFIG.SHEETS.DAILY_REPORT).filter(function(r) {
    if (!matches(r)) return false;
    if (ctx.role === CONFIG.ROLES.ADMIN) return true;
    return r.project_name === ctx.projectName;
  });
  if (!rows.length) return '📊 ' + label + '\n目前還沒有日報資料。';
  var t = qaSumReportFields(rows);
  return '📊 ' + label + '\n接待：' + t.visitor + '　初訪：' + t.first + '　回籠：' + t.revisit + '　成交：' + t.deal;
}

function qaPendingSignatures(ctx) {
  var rows = readSheetAsObjects(CONFIG.SHEETS.DEAL_DETAIL).filter(function(r) {
    if (r.status !== 'active' || r.contract_status !== '待簽約') return false;
    if (ctx.role === CONFIG.ROLES.ADMIN) return true;
    if (ctx.role === CONFIG.ROLES.MANAGER) return r.project_name === ctx.projectName;
    return String(r.sales_line_user_id) === String(ctx.lineUserId);
  });
  if (!rows.length) return '📋 目前沒有待簽約的案件。';
  rows.sort(function(a,b){ return String(a.expected_sign_date).localeCompare(String(b.expected_sign_date)); });
  var lines = rows.slice(0, 10).map(function(d) {
    var overdue = d.expected_sign_date && d.expected_sign_date < todayTW();
    return (overdue ? '⚠️ ' : '・') + (d.unit || '（未填戶別）') + '　預定：' + (d.expected_sign_date || '未填') + '　' + (d.salesperson || '');
  });
  var extra = rows.length > 10 ? '\n…還有 ' + (rows.length - 10) + ' 筆' : '';
  return '📋 待簽約清單（共 ' + rows.length + ' 筆）\n\n' + lines.join('\n') + extra;
}

function qaTodayLeave() {
  var today = todayTW();
  var rows = readSheetAsObjects(CONFIG.SHEETS.LEAVE_SCHEDULE).filter(function(r) {
    return String(r.leave_date).substring(0,10) === today;
  });
  if (!rows.length) return '📅 今日休假（' + today + '）\n今日全員出勤 ✓';
  var names = rows.map(function(r){ return r.display_name || r.line_user_id; });
  return '📅 今日休假（' + today + '）\n' + names.join('、');
}

// 下週一~週日（跟前端排班頁 getWeekDates(1) 定義的「下週」一致）
function qaNextWeekLeave() {
  var now = new Date();
  var dow = now.getDay() === 0 ? 6 : now.getDay() - 1;
  var mon = new Date(now);
  mon.setDate(now.getDate() - dow + 7);
  var sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  var monStr = Utilities.formatDate(mon, CONFIG.TIMEZONE, 'yyyy-MM-dd');
  var sunStr = Utilities.formatDate(sun, CONFIG.TIMEZONE, 'yyyy-MM-dd');

  var rows = readSheetAsObjects(CONFIG.SHEETS.LEAVE_SCHEDULE).filter(function(r) {
    var d = String(r.leave_date).substring(0,10);
    return d >= monStr && d <= sunStr;
  });
  if (!rows.length) return '📅 下週休假（' + monStr + ' ～ ' + sunStr + '）\n目前沒有人排休。';

  var byDate = {};
  rows.forEach(function(r) {
    var d = String(r.leave_date).substring(0,10);
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(r.display_name || r.line_user_id);
  });
  var lines = Object.keys(byDate).sort().map(function(d) {
    return d + '：' + byDate[d].join('、');
  });
  return '📅 下週休假（' + monStr + ' ～ ' + sunStr + '）\n' + lines.join('\n');
}

function qaMyTasks(ctx) {
  var rows = readSheetAsObjects(CONFIG.SHEETS.TASK).filter(function(r) {
    return r.status === CONFIG.STATUS.PENDING && String(r.assigned_to_line_user_id) === String(ctx.lineUserId);
  });
  if (!rows.length) return '✅ 你目前沒有待處理的任務。';
  var lines = rows.slice(0, 10).map(function(t) {
    return '・' + t.title + (t.due_date ? '（期限：' + t.due_date + '）' : '');
  });
  var extra = rows.length > 10 ? '\n…還有 ' + (rows.length - 10) + ' 項' : '';
  return '📝 你的待辦（共 ' + rows.length + ' 項）\n\n' + lines.join('\n') + extra;
}

function qaSearchCustomer(keyword, ctx) {
  if (!keyword) return '請輸入要查詢的客戶姓名，例如：查詢 王小明';
  var rows = readSheetAsObjects(CONFIG.SHEETS.CUSTOMER).filter(function(r) {
    if (String(r.customer_name || '').indexOf(keyword) < 0) return false;
    if (ctx.role === CONFIG.ROLES.ADMIN) return true;
    if (ctx.role === CONFIG.ROLES.MANAGER) return r.project_name === ctx.projectName;
    return String(r.sales_line_user_id) === String(ctx.lineUserId);
  });
  if (!rows.length) return '🔍 查無「' + keyword + '」的客戶資料（只會查得到你有權限看的範圍）。';
  rows.sort(function(a,b){ return String(b.visit_date||'').localeCompare(String(a.visit_date||'')); });
  var top = rows.slice(0, 5);
  var lines = top.map(function(c) {
    var status = c.deal_status === '退戶' ? '🔙退戶' : (c.deal_status === '已成交' ? '✓已成交' : '未成交');
    return '・' + c.customer_name + '（' + (c.phone || '無電話') + '）\n  訪客日期：' + String(c.visit_date||'').substring(0,10) + '　狀態：' + status + '　業務：' + (c.sales_name || '');
  });
  var extra = rows.length > 5 ? '\n\n…還有 ' + (rows.length - 5) + ' 筆，請用更精確的姓名查詢' : '';
  return '🔍 查詢「' + keyword + '」找到 ' + rows.length + ' 筆：\n\n' + lines.join('\n\n') + extra;
}

// ==================== Daily Triggers ====================
function sendDailyTaskReminder() {
  try {
    var rows = readSheetAsObjects(CONFIG.SHEETS.TASK).filter(function(r){ return r.status === CONFIG.STATUS.PENDING; });
    if (!getProp(CONFIG.PROP_KEYS.LINE_PUSH_TARGET)) return;

    var msg = '案場：' + CONFIG.PROJECT_NAME + '\n🔔 今日任務提醒（' + todayTW() + '）\n\n';
    if (!rows.length) { msg += '✅ 目前沒有待辦任務'; }
    else {
      var byProject = {};
      rows.forEach(function(r){ var k = r.project_name || '未指定'; if(!byProject[k]) byProject[k]=[]; byProject[k].push(r); });
      Object.keys(byProject).forEach(function(proj){
        msg += '【' + proj + '】\n';
        byProject[proj].slice(0,5).forEach(function(t){ msg += '・' + t.title + (t.due_date ? '（'+t.due_date+'）' : '') + '\n'; });
        if (byProject[proj].length > 5) msg += '  …還有 ' + (byProject[proj].length-5) + ' 項\n';
        msg += '\n';
      });
    }
    sendLinePushToAll(msg);
  } catch (err) { Logger.log('sendDailyTaskReminder error: ' + err); }
}

// ★ 修正：晚上 9 點觸發時，只有「今天完全沒有人交日報」才推播提醒
// 管理員/主管，已經有交的話就不推播——原本不管有沒有交都會每天固定
// 推一則訊息（有交就顯示統計、沒交就顯示提醒），改成只在真的漏交
// 時才通知，避免每天固定跳出訊息讓人養成忽略推播的習慣
function sendDailySalesReport() {
  try {
    var date = todayTW();
    var rows = readSheetAsObjects(CONFIG.SHEETS.DAILY_REPORT).filter(function(r){
      try { return Utilities.formatDate(new Date(r.report_date), CONFIG.TIMEZONE, 'yyyy-MM-dd') === date; }
      catch(e){ return false; }
    });
    if (rows.length) return; // 今天已經有人交過日報，不用推播
    if (!getProp(CONFIG.PROP_KEYS.LINE_PUSH_TARGET)) return;

    var msg = '案場：' + CONFIG.PROJECT_NAME + '\n⚠️ 銷售日報尚未提交提醒（' + date + '）\n\n' +
      '今天晚上9點了，還沒有任何業務提交今日銷售日報，麻煩提醒業務盡快補交。';
    sendLinePushToAll(msg);
  } catch (err) { Logger.log('sendDailySalesReport error: ' + err); }
}

// ==================== Initialization ====================
function initAllSheets() {
  var ss = getCrmSS();
  var schemas = {};
  schemas[CONFIG.SHEETS.USER_ROLE]    = ['line_user_id','display_name','role','status','project_name','job_title','last_login_at','created_at','updated_at'];
  schemas[CONFIG.SHEETS.PROJECT]      = ['project_name','project_code','status','manager_line_user_id','created_at','updated_at'];
  schemas[CONFIG.SHEETS.CUSTOMER]     = ['customer_id','created_at','updated_at','created_by_line_user_id','created_by_name','sales_line_user_id','sales_name','project_name','visit_date','visit_type','customer_name','phone','age_range','district','occupation_industry','purchase_motive','source','room_types','budget','issues','revisit_plan','deal_status','deal_unit','status_note','note'];
  schemas[CONFIG.SHEETS.TASK]         = ['task_id','project_name','type','title','description','priority','status','assigned_to','assigned_to_line_user_id','created_by','created_by_line_user_id','due_date','created_at','updated_at'];
  schemas[CONFIG.SHEETS.DAILY_REPORT] = ['report_id','report_date','project_name','salesperson','sales_line_user_id','visitor_count','first_visit_count','revisit_count','call_count','deal_count','transaction_units','viewed_units','notes','created_by','created_at'];
  schemas[CONFIG.SHEETS.MAINTENANCE]  = ['maintenance_id','project_name','location','issue_type','description','photo_url','reported_by','reported_by_line_user_id','assigned_to','status','created_at','updated_at','completed_at'];
  schemas[CONFIG.SHEETS.AUDIT_LOG]    = ['log_id','timestamp','line_user_id','display_name','action','target_sheet','target_id','detail'];
  schemas[CONFIG.SHEETS.CHANGE_LOG]   = ['log_id','customer_id','customer_name','changed_by_line_user_id','changed_by_name','changed_at','changes_json'];
  schemas[CONFIG.SHEETS.LEAVE_SCHEDULE] = ['leave_id','line_user_id','display_name','project_name','leave_date','created_by_line_user_id','created_at'];
  schemas[CONFIG.SHEETS.CALENDAR_NOTES]  = ['note_id','project_name','note_date','content','created_by_line_user_id','created_by_name','created_at'];

  Object.keys(schemas).forEach(function(name) {
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.clear();
    sh.getRange(1,1,1,schemas[name].length).setValues([schemas[name]]);
    sh.getRange(1,1,1,schemas[name].length).setFontWeight('bold').setBackground('#1a1a2e').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  });

  CONFIG.INITIAL_PROJECTS.forEach(function(p) {
    appendObjectToSheet(CONFIG.SHEETS.PROJECT, {
      project_name: p.name, project_code: p.code,
      status: CONFIG.STATUS.ACTIVE, manager_line_user_id: '',
      created_at: nowTW(), updated_at: nowTW()
    });
  });

  Logger.log('✓ 8 張工作表已建立');
}

function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(function(t) {
    var fn = t.getHandlerFunction();
    if (fn === 'sendDailyTaskReminder' || fn === 'sendDailySalesReport') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('sendDailyTaskReminder').timeBased().atHour(9).everyDays(1).inTimezone(CONFIG.TIMEZONE).create();
  ScriptApp.newTrigger('sendDailySalesReport').timeBased().atHour(21).everyDays(1).inTimezone(CONFIG.TIMEZONE).create();
  Logger.log('✓ 觸發器設定完成');
}

// ★ 修正：防止重複新增，已存在就更新
function addUser(lineUserId, displayName, role, projectName) {
  if (!lineUserId || !displayName || !role) {
    Logger.log('用法：addUser("U...", "姓名", "admin/manager/sales", "案場")'); return;
  }
  var existing = getUserContext(lineUserId);
  if (existing) {
    updateRowById(CONFIG.SHEETS.USER_ROLE, 'line_user_id', lineUserId, {
      display_name: displayName,
      role: role,
      project_name: projectName || '',
      status: CONFIG.STATUS.ACTIVE,
      updated_at: nowTW()
    });
    Logger.log('✓ 已更新（非重複新增）：' + displayName + '（' + role + '）');
    return;
  }
  appendObjectToSheet(CONFIG.SHEETS.USER_ROLE, {
    line_user_id: lineUserId,
    display_name: displayName,
    role: role,
    status: CONFIG.STATUS.ACTIVE,
    project_name: projectName || '',
    job_title: '',
    last_login_at: '',
    created_at: nowTW(),
    updated_at: nowTW()
  });
  Logger.log('✓ 已新增：' + displayName + '（' + role + '）');
}

// ★ 一次性修復用：把已經被 Sheets 轉成數字、開頭 0 被吃掉的手機號碼補回來
// 只處理 9 碼、以 9 開頭的純數字（符合台灣手機號碼去掉開頭 0 後的樣子），
// 執行一次即可，不影響其他資料
function fixLeadingZeroPhones() {
  var sh = getSheet(CONFIG.SHEETS.CUSTOMER);
  var data = sh.getDataRange().getValues();
  var headers = data[0];
  var col = headers.indexOf('phone');
  if (col < 0) { Logger.log('找不到 phone 欄位'); return; }
  var fixed = 0;
  for (var i = 1; i < data.length; i++) {
    var val = data[i][col];
    if (typeof val === 'number' && /^9\d{8}$/.test(String(val))) {
      var cell = sh.getRange(i + 1, col + 1);
      cell.setNumberFormat('@STRING@');
      cell.setValue('0' + val);
      fixed++;
    }
  }
  Logger.log('✓ 已修復 ' + fixed + ' 筆手機號碼（補回開頭的 0）');
}

// ★ 一次性修復用：掃描所有分頁的日期／時間戳欄位，把已經被 Sheets 自動轉成
// Date 型別的儲存格（在文字保護機制上線前寫入的舊資料）換算回台北時間文字後
// 重新寫回去，避免舊資料在試算表裡打開來看時跟 API 讀出來的時間對不上。
// 不影響其他資料，執行一次即可。
function fixDateTimeFormats() {
  var fixed = 0;
  Object.keys(CONFIG.SHEETS).forEach(function(key) {
    var sh = getSheet(CONFIG.SHEETS[key]);
    if (!sh) return;
    var data = sh.getDataRange().getValues();
    if (data.length < 2) return;
    var headers = data[0];
    headers.forEach(function(h, col) {
      var isDateField = DATE_ONLY_FIELDS.indexOf(h) >= 0;
      var isDatetimeField = DATETIME_FIELDS.indexOf(h) >= 0;
      if (!isDateField && !isDatetimeField) return;
      var fmt = isDateField ? 'yyyy-MM-dd' : 'yyyy-MM-dd HH:mm:ss';
      for (var i = 1; i < data.length; i++) {
        var val = data[i][col];
        if (val instanceof Date) {
          var cell = sh.getRange(i + 1, col + 1);
          cell.setNumberFormat('@STRING@');
          cell.setValue(Utilities.formatDate(val, CONFIG.TIMEZONE, fmt));
          fixed++;
        }
      }
    });
  });
  Logger.log('✓ 已修復 ' + fixed + ' 個日期／時間欄位（換算回台北時間文字）');
}

function setCompanyPassword(pwd) { setProp(CONFIG.PROP_KEYS.COMPANY_PASSWORD, pwd); Logger.log('✓ 密碼已設定'); }
function setLineToken(token)     { setProp(CONFIG.PROP_KEYS.LINE_TOKEN, token);     Logger.log('✓ LINE Token 設定完成'); }
function setLinePushTarget(id)   { setProp(CONFIG.PROP_KEYS.LINE_PUSH_TARGET, id);  Logger.log('✓ 推播目標設定完成（多人請用逗號分隔，例如 U111,U222）'); }
function setLineChannelSecret(s) { setProp(CONFIG.PROP_KEYS.LINE_CHANNEL_SECRET, s); Logger.log('✓ Channel Secret 設定完成'); }

// ★ 第一次設定執行這個就好
function firstTimeSetup() {
  setCompanyPassword('075500888');
  initAllSheets();
  Logger.log('✓ 完成！吉隆天曜專用版已初始化。');
  Logger.log('下一步：');
  Logger.log('1. 部署 Web App，把 exec 網址貼到 jltx.html 的 GAS_URL');
  Logger.log('2. 執行 setLineToken(你的Token) 設定推播');
  Logger.log('3. 執行 setLinePushTarget(你的userId) 設定推播目標');
  Logger.log('4. 執行 addUser(你的userId,你的名字,admin,吉隆天曜) 加入第一位管理員');
}

function testCheckProps() {
  Object.values(CONFIG.PROP_KEYS).forEach(function(k) {
    var v = getProp(k);
    Logger.log(k + ' = ' + (v ? '已設定（' + v.substring(0,4) + '…）' : '❌ 未設定'));
  });
}

// ★ LINE 問答除錯用：不用透過 LINE 傳訊息，直接在編輯器裡執行這個函式
// 就能立刻看到結果。把下面 YOUR_LINE_USER_ID 換成你自己的 LINE userId
// （對 LINE 官方帳號輸入「我的ID」就會回傳，或是查 User_Role_Table
// 分頁裡你自己那一列的 line_user_id 欄位），儲存後執行，看下面
// 「執行記錄」跳出來的內容
function testQaCommand() {
  var myLineUserId = 'YOUR_LINE_USER_ID';
  var ctx = getUserContext(myLineUserId);
  if (!ctx) {
    Logger.log('❌ 查無使用者。可能原因：myLineUserId 還是預設的 YOUR_LINE_USER_ID 沒換掉，' +
      '或是這個 userId 在 User_Role_Table 裡沒有 active 狀態的紀錄。');
    return;
  }
  Logger.log('✓ 查到使用者：' + ctx.displayName + '（' + ctx.role + '／' + ctx.projectName + '）');
  var reply = handleQaCommand('今日休假', myLineUserId);
  Logger.log('handleQaCommand 回傳結果：\n' + reply);
}

// ★ 以下執行完後建議從程式碼中刪除，避免 Token 外洩
function setupLine() {
  setLineToken('QcAjXh7Yu8jtbHUcgcii9+bCBE0ZbfTrxLXSDJ0W7KQydHtAfthh7uISDAoxA1yPTZby4GQMlbb701rDnLzCPAI+mlurWeOogR3cf7YKEfq0Ew+9jOKtMXJw9pPxJEX26rRFc24CKuAriwQcIZTLwdB04t891Ow1cDnyilFU=');
  setLinePushTarget('U4bf4bf6035e402e4d5a17a01915812bc');
}
function setupSecret() { setLineChannelSecret('9456425e307c7419f2f0571e1f0199ec'); }
function addMyself() {
  addUser('U4bf4bf6035e402e4d5a17a01915812bc', 'SKY 陳昭文', 'admin', '吉隆天曜');
}
