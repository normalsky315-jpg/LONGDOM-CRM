# 吉隆天曜（jltx）速度與連線穩定優化 — 設計文件

- 日期：2026-09-19
- 案場：吉隆天曜（jltx.html / gas-updates/jltx_v9.35_full.gs / customer360.html）
- 範圍：**只動吉隆天曜**，華雄天地（hstd）這次不動

## 背景

使用者先前請 ChatGPT 對這個系統做過一輪認證與效能檢查，ChatGPT 的額度中途用完，整理出一份對話記錄。經比對 GitHub 上所有分支與 PR，**確認 ChatGPT 那輪的程式修改從未實際推送到這個 repo**——它是在自己的沙盒環境裡做的，額度用完前沒能整理成 branch/PR。因此那份記錄裡的「已修正」項目，必須重新對照目前 repo 的實際程式碼逐一驗證，不能照單全收。

## 驗證後的現況

### 已經修好、這次不用再動
- `getUserContext`：v9.6 已加上 60 秒 `CacheService` 快取，不會每支 API 都重讀整張 `User_Role_Table`
- `appendCustomerData`（客戶登記）：v9.11 已有完整的「逾時重試不重複建檔」防護——`client_request_id` 當 idempotency key，配合 `CacheService` 做「認領（PROCESSING 佔位）＋輪詢」
- 前端 `gasFetch`：已經是「10 秒逾時 + 重試 1 次」，且網路逾時/失敗不會清除登入 session、不會強制登出，只會顯示登入畫面讓使用者自行處理，不影響已存在的 session

### 目前仍然存在、這次要處理的問題

1. **重複寫入的破口沒補全**：`appendCustomerData` 的 idempotency 防護只做在那一支。以下三支寫入 API 一樣會同步呼叫 Supabase 雙寫（`dwSyncDeal_` / `dwSyncContact_` / `dwSyncVisitUpdate_`），一樣可能因為超過前端 10 秒逾時而被自動重試，但完全沒有防護：
   - `saveDealDetail`（記錄成交明細）
   - `appendContactLog`（新增客戶追蹤記錄）
   - `updateCustomerData`（編輯客戶資料）
2. **首頁登入後一次打 7-8 個 API**：`loadGlobalData`（`getProjectList` / `getIndustryList` / `getPurchaseMotiveList`）+ `renderHome`（`getConfigOptions` / `getUserList`（主管以上）/ `getTasks` / `getCustomerList` / `getTodayLeave`）都是各自獨立的網路請求。即使後端有快取，每一個仍是一趟完整的 HTTPS 來回，是「感覺變慢」的主因之一。
3. **`customer360.html` 有一個測試用後門**：`initApp()` 讀取網址參數 `?lineUserId=`，只要帶入任意一組 LINE user ID 就能不用密碼、不用登入直接看到該身份權限範圍內的完整客戶資料（姓名/電話/地址/來訪紀錄）。註解說明原意是給分支預覽網域測試用，但正式網域的 `customer360.html` 一樣吃這個後門。使用者已確認這次一併移除。

### 確認存在、但這次不處理（記錄下來，供之後排程）
- 後端完全信任前端傳來的 `lineUserId`，沒有驗證 LINE ID token 真偽（理論上知道規則的人可冒用他人身份呼叫 API）。這是獨立的認證強化題目，範圍與風險都比這次大，留待下一輪專門處理。
- Supabase 雙寫目前是同步阻塞呼叫，是三支寫入 API 偏慢、需要 idempotency 防護的根本原因。把它改成非同步（背景佇列 + 定時觸發器）能從根本解決，但改動同步機制本身風險較大，這次先用「補防護」的方式治標，不做架構層級的改動。

## 採用方案：方案 A（比照既有模式局部補洞）

在 `appendCustomerData` 已經驗證有效的既有寫法基礎上做局部擴充，不引入新架構、不改變現有錯誤處理習慣。

被否決的替代方案：
- **方案 B**（Supabase 雙寫改非同步佇列）：能從根本解決寫入 API 偏慢的問題，但需要新增佇列表、定時觸發器、重試/卡住處理等新基礎設施，風險與工作量明顯更大，且本環境無法連到正式 GAS/Supabase 做端對端驗證。列為未來獨立階段。
- **方案 C**（只改前端防連點）：治標不治本，前端防連點擋不住「GAS 執行不因前端放棄等待而中止」這個重複寫入的真正成因，故不採用。

## 詳細設計

### 元件範圍

**後端 `gas-updates/jltx_v9.35_full.gs`：**
- `saveDealDetail`、`appendContactLog`、`updateCustomerData` 三支函式，各自加上與 `appendCustomerData` 相同結構的 idempotency 防護：
  - 前端傳入 `client_request_id` 時，用固定前綴組出 cache key（`dealdetail_` / `contactlog_` / `custupdate_`），避免與 `appendcust_` 系列或彼此互相碰撞
  - 已有最終結果 → 直接回傳快取；正在處理中（`PROCESSING`）→ 輪詢等待最終結果（最多 15 秒）；否則存 `PROCESSING` 佔位後才開始真正處理
  - 成功或失敗都要把結果存回快取（120 秒），失敗也要釋放 `PROCESSING` 佔位
- 新增 `getHomeBootstrap(payload)`：內部依序呼叫既有的 `getProjectList` / `getIndustryList` / `getPurchaseMotiveList` / `getConfigOptions` / `getTasks` / `getCustomerList` / `getTodayLeave`，主管以上再加 `getUserList`，組成單一物件回傳。**不重寫任何既有函式的邏輯**，只是在外面包一層彙整，每個子項目各自帶自己的 `ok`/`data`，單一子項目失敗不影響其他子項目回傳。
- 已接上 `doGet` 路由（沿用既有的 action 分派模式）

**前端 `jltx.html`：**
- `saveDealDetail`（含成交明細相關的兩個呼叫點）、`appendContactLog`、`updateCustomerData` 的 `gasPost` 呼叫，比照現有 `submitCustomer` 產生並傳遞 `client_request_id`（同一次送出因逾時重試時沿用同一個 id，讓後端能認得是同一筆）
- `loadGlobalData` 與 `renderHome` 改為呼叫 `getHomeBootstrap` 一次拿齊資料，再分派給原本各自的渲染邏輯（`state.projects` / `state.industries` / … 的賦值方式不變，UI 渲染函式不動）
- 若 `getHomeBootstrap` 呼叫失敗（例如逾時重試都失敗），退回原本個別呼叫的舊邏輯作為備援，避免新機制本身變成新的單點故障

**`customer360.html`：**
- 移除 `initApp()` 內讀取 `URLSearchParams(location.search).get('lineUserId')` 並據此設定 `state.lineUserId` 的判斷
- 只保留讀取 `localStorage`（`loadSession()`）取得 `lineUserId` 的路徑
- 找不到 session 時的提示文字移除「或是在網址後面加上 `?lineUserId=...`」那段說明

### 資料流（防重複寫入）

```
前端送出寫入 → 產生 client_request_id
  → gasFetch（10 秒逾時，逾時或失敗自動重試 1 次，沿用同一個 client_request_id / URL）
    → 後端第一次收到：認領 key（存 PROCESSING）→ 執行寫入 → 存最終結果（120 秒）
    → 後端第二次收到（重試送達時第一次還在跑）：看到 PROCESSING → 輪詢等最終結果 → 直接回傳，不重新執行
    → 後端第二次收到（重試送達時第一次已完成）：看到最終結果 → 直接回傳，不重新執行
```

### 錯誤處理

- 三支新增防護的 API：失敗結果一樣要存進快取並釋放 `PROCESSING` 佔位，避免真的重試時被誤判成「還在處理中」而白等 15 秒
- `getHomeBootstrap`：整包呼叫失敗（網路層級）時前端退回逐一呼叫舊路徑；整包呼叫成功但個別子項目 `ok:false` 時，各自的渲染邏輯沿用現有「該區塊顯示空狀態/不顯示」的既有行為，不新增錯誤 UX
- `customer360.html` 移除後門後，沒有 session 時維持原本「請先登入 jltx.html」提示（只移除網址帶 ID 那條路徑與其說明文字）

### 測試與驗證計畫（含限制說明）

這個開發環境**連不到使用者正式的 Google Apps Script 專案或 Supabase**，無法做端對端的正式部署測試。實際可執行的驗證：

- 程式碼審查／邏輯走查：逐一比對三支新增防護的函式與 `appendCustomerData` 既有實作是否結構一致
- `.gs` 檔案語法檢查：用 Node 對修改後的 `.gs` 做語法層級檢查（GAS 語法本質上是 ES5/ES6），可抓出低級語法錯誤，但無法驗證 `SpreadsheetApp`／`CacheService` 等 GAS 專屬 API 的實際執行結果
- 前端本地驗證：本地開啟 `jltx.html`，視需要 mock `GAS_URL` 回應，走一次 `getHomeBootstrap` 的呼叫路徑與失敗退回舊路徑的邏輯、確認畫面渲染沒有壞掉

**需要使用者手動完成的部分**：
- 依照本專案既有慣例（每次修改 GAS 都建新版本檔，不覆蓋舊版），實作結果存成新檔 `gas-updates/jltx_v9.36_full.gs`（`v9.35` 保留為未改動的歷史紀錄）。把 `jltx_v9.36_full.gs` 的內容貼回 Google Apps Script 編輯器，用「編輯現有部署」（不要「新增部署」，網址才不會變）部署新版本
- 部署後實際操作驗收：正常送出一筆成交明細/追蹤記錄/客戶編輯，確認沒有重複寫入；刻意在網路很慢的情況下測試逾時重試情境（若能重現）
- 確認 `getUserList` 相關的主管專屬資料在 `getHomeBootstrap` 回傳中權限判斷正確（一般業務不該拿到）

前端 `jltx.html` / `customer360.html` 屬於 Cloudflare Workers 直接從 repo 讀取的靜態檔案，PR 合併後自動部署，不需要使用者手動處理。

### 部署與交付方式

- 開新分支／沿用目前 `claude/sweet-thompson-lb0tvg` 分支繼續做，改完開 PR（draft），列清楚上述「需要手動完成」的部署清單
- `.gs` 檔案變更只更新 repo 內的快照備份，不會、也無法自動同步到正式 Google Apps Script 部署

## 追加項目（使用者實際操作時回報，一併納入本輪）

這兩項是功能／UX 問題，不屬於速度穩定性，但同樣是 `jltx.html` 的修改、時機一致，經使用者確認一併納入這次實作。

### 追加 1：回籠客人連結後沒有自動帶入基本資料

**現況**：客戶登記表單選「回籠」→ 搜尋並選擇要連結的舊客戶（`pickLinkCustomer`）後，只記錄 `linked_customer_id`／`linked_customer_name`／`linked_visit_date`，姓名、電話、居住區域、職業、購屋動機、性別、婚姻狀況等全部要重新手動輸入一次。後端 `searchMyCustomers` 目前回傳的欄位也只有 `customer_id`／`customer_name`／`phone`／`visit_date`／`visit_type`／`project_name`，不夠拿來自動帶入。

**修復方向**（使用者已確認）：
- 後端 `searchMyCustomers`：`results` 的 map 補上 `age`／`district`／`detailed_address`／`occupation_industry`／`purchase_motive`／`source`／`gender`／`marital_status`（沿用同一筆 `readSheetAsObjects` 結果，不加新查詢、不影響效能）
- 前端 `pickLinkCustomer`：選中後，把上述欄位帶入表單對應輸入框／chips／select（`cust_name`／`cust_phone`／`cust_age`／`cust_detailedAddress`／`cust_industry`／`cust_motive`／`cust_gender`／`cust_marital`／`cust_dist`／`cust_source`），含「外縣市：ＸＸ」「其他：ＸＸ」這類帶額外文字的欄位要正確拆回主選項＋額外輸入框。帶入後**欄位仍可編輯**，不鎖定。
- 刻意不帶入的欄位（本次接待才會變動的資訊，維持空白讓業務重填）：`status_note`（接待狀況）、`visit_time_slot`、`sqft_requirement`、`room_types`、`budget`、`issues`、`introduced_units`、`referrer_name`、`revisit_plan`

### 追加 2：銷售控制表「待主管確認」提示看不出是哪幾筆

**現況**：`renderHome` 計算 `sales_deal_stage` 已進入下訂/保留等階段、但 `deal_status` 還不是「已成交」的筆數，顯示成「N 筆待主管確認」，但只有數字，沒有名單、沒有連結，主管不知道要點哪裡確認。

**修復方向**（使用者已確認）：
- 文字改清楚：「N 筆已下訂/保留但尚未標記成交，點此查看」
- 這個提示卡片改成可點擊，導向一個依同樣條件（`sales_deal_stage` 有值且 ≠ 未成交、`deal_status` ≠ 已成交）過濾出的客戶清單畫面，清單項目可直接點進去用既有的「標記成交」動作處理，不新增後端 API（複用首頁已經抓到的 `getCustomerList` 資料在前端過濾即可）

## 追加項目二（v9.36 部署後，使用者實際使用時回報，一併納入）

### 追加 3：週報表客戶反應統計「累計成交」數字兜不起來

**現況**：`gatherWeeklyReportData_()` 裡，行業別反應／年齡反應的統計，只要那筆客戶資料的職業或年齡欄位是空白，或存的是「其他：ＸＸ」這種自由文字（客戶登記表單職業/年齡都不是必填，標記成交也不檢查這兩欄），原本的比對邏輯（完全比對固定選項清單）就會直接跳過、不算進任何一欄——資料庫裡是 3 組成交，統計表卻可能只顯示 1 組，總和對不上實際成交數。

**修復方向**：新增 `weeklyReportBucketLabel_` 統一處理：對得到清單裡的值就算那一欄；「已知欄位：自由文字」算進對應的已知欄位；兩者都對不到（含空白）才歸類「未填寫」。行業別反應／年齡反應兩張表都加上「未填寫」欄，確保總和永遠等於實際成交數。

### 追加 4：客戶反應統計新增「區域反應」

跟行業別反應／年齡反應同一套邏輯，用「居住行政區」欄位新增第三張統計表（週報試算表「客戶反應統計」分頁新增列 16~21）。居住行政區選項是 `Config_Options` 動態設定（不像職業是寫死在 `CONFIG.INDUSTRIES`），每次同步報表時現抓一次目前的選項清單。

### 追加 5：銷控表反查客戶

**現況**：銷控表戶別卡片本來就會顯示連結的客戶姓名（「客戶：王小明」），但只是純文字，沒有辦法點擊跳過去，要反查是哪位客人買的戶別，得自己記住名字再去客戶列表手動搜尋。

**修復方向**：把戶別卡片上的客戶姓名改成可點擊連結，點下去導向客戶列表（`#/mycustomers`）並自動帶入姓名搜尋（複用既有的 `applyCustomerSearch` 模糊比對邏輯），直接定位到那張客戶卡片，不新增後端 API。

## 部署記錄

- **v9.36**：追加項目一（`saveDealDetail`／`appendContactLog`／`updateCustomerData` 防重複寫入、`getHomeBootstrap`、`searchMyCustomers` 回籠自動帶入欄位）。使用者已於 2026-09-19 部署到正式 Apps Script。
- **v9.37**：追加項目二（週報表統計修正、新增區域反應、銷控表反查客戶）。`gas-updates/jltx_v9.36_full.gs` 保留為 v9.36 已部署版本的歷史紀錄，不再修改。

## 追加項目三：統一「已簽約＝已成交」同步邏輯

使用者實測週報表後，發現銷控表顯示 2 戶已簽約，但週報表/業務統計都只算到 1 筆成交，追查後發現這是比週報表統計本身更深一層的問題：「成交」相關的三張表（`Customer_Data`／`Sales_Control`／`Deal_Detail`）原本由 4 個各自獨立的入口各自決定要同步哪些欄位：

| 入口 | 會同步的表 |
|---|---|
| 業務「成交階段」（`updateCustomerDealStage`） | `Customer_Data.sales_deal_stage` + `Sales_Control.status`（已下訂/已保留，無「已簽約」選項） |
| 客戶列表「標記成交」完整流程（前端 `confirmDeal()`） | 前端連續呼叫 `saveDealDetail`（寫 `Deal_Detail` + 同步 `Sales_Control`）與 `updateCustomerDeal`（寫 `Customer_Data.deal_status`）兩支 API，中間任一步失敗就不一致 |
| 首頁「待簽約提醒→標記已簽約」快速按鈕（`quickMarkSigned`） | 只呼叫 `saveDealDetail`，**未呼叫** `updateCustomerDeal`，`Customer_Data.deal_status` 不會更新 ← 本次確認的漏洞 |
| 銷控表直接編輯戶別狀態（`updateSalesControlUnit`/`appendSalesControlUnit`） | 直接同步 `Customer_Data.deal_status`（透過 `syncCustomerFromSalesControl_`），但不會建立/更新 `Deal_Detail` |

**修復方向**（使用者已確認、已比照「已簽約＝已成交」的原則實作）：`saveDealDetail` 只要合約狀態確定是「已簽約」，自己就直接把 `Customer_Data.deal_status` 同步成「已成交」，不再依賴前端另外呼叫 `updateCustomerDeal` 補這一步。這樣「客戶列表標記成交」與「首頁快速標記已簽約」兩個入口都統一收斂到 `saveDealDetail` 內部處理，保證只要合約狀態是已簽約，客戶正式成交狀態一定同步，不會再有分歧。

銷控表直接編輯入口本來就會正確同步 `deal_status`，這次沒有變動；它「不會建立成交明細」這個資料完整性缺口（用這個入口成交的話，價格/訂金/簽約日不會留紀錄）記錄下來，留待之後有需要再處理，這次不在範圍內。

**目前卡住的舊資料**：使用者已確認自行到客戶列表找出對應客戶、手動點一次既有的「標記成交」按鈕修正，不需要額外寫一次性修復腳本。

## 追加項目四：週報表視覺設計套用 GPT 優化版配色

使用者請 GPT 優化週報表 Excel 的可讀性，並提供優化後的版本（xlsx）。比對後確認 GPT 版本**資料欄位與版面結構完全沒有更動**（列/欄位置、公式邏輯跟現有程式碼產生的一致），純粹加上一套配色/字體/框線/欄寬。

**套用範圍**：全部 5 個分頁（週報總表／客戶反應統計／銷售控制表／業務統計／設定說明），新增 `WR_STYLE` 統一定義顏色（深藍主色、中藍區塊標題、藍灰欄位標題、淺藍/淺灰/淺綠交替資料列、琥珀色合計欄），`wrStyle_` 共用樣式工具套用到各分頁。

**額外發現並確認一併處理**：銷售控制表的戶別格子既有的狀態上色功能（`SALES_CONTROL_STATUS_COLOR_`）配色改成跟新設計一致；GPT 版本雖然畫了圖例但沒有實際的圖例列（現有程式碼也沒有），這次一併新增圖例列本身，讓格子顏色跟圖例對得上。

## 追加項目五：銷控表格子連動「標記成交」確認流程

使用者期望的流程：業務把客戶成交階段改成已下訂/已保留時，銷控表應該自動反映狀態，主管在銷控表就能直接確認並進入成交明細輸入。查證後確認：狀態同步（`updateCustomerDealStage` 即時同步 `Sales_Control.status`）與確認後要求填成交明細（「待主管確認」清單點「標記成交」開的就是完整成交明細表單）**本來就已經存在**，唯一缺口是「銷控表頁面本身」點已收訂/已保留格子時，只會開「編輯戶別」，沒有路徑直接進確認流程，得先跳回首頁才找得到入口。

**修復方向**（使用者已確認）：新增 `handleSalesControlCellClick_`，點已收訂/已保留且已連結客戶的格子時，先詢問是否要直接標記成交，是則開既有「標記成交」表單（與待主管確認清單同一入口），否則照原邏輯開編輯戶別。業務看到的行為不變（業務本來就不能標記成交）。

## 追加項目六：銷控表已簽約同步缺漏 + 週報表分頁彈出視窗被封鎖

使用者實測時發現兩個獨立問題，查證後都確認是真的 bug：

**1. 銷控表直接改「已簽約」，客戶卡片「成交階段」沒跟著同步**

`syncCustomerFromSalesControl_`（銷控表狀態變動時反向同步回客戶資料的函式）三個狀態分支寫法不一致：已保留／已收訂分支都會同步 `sales_deal_stage`／`sales_deal_unit_id`／`sales_deal_unit_label`，但已簽約分支只寫了 `deal_status`／`deal_unit`，漏了成交階段欄位。結果：從銷控表直接把某戶改成已簽約（不是走客戶列表「標記成交」）時，該客戶卡片的「成交階段」仍停在原本狀態，看起來像沒標記過，戶別選單（只顯示待售或已連結這位客戶的戶別）也因此正確地把這戶排除在其他客戶的可選清單外——選單邏輯本身沒問題，問題在客戶卡片沒同步更新，造成主管誤判。

**修復**（`gas-updates/jltx_v9.40_full.gs`）：已簽約分支比照已保留／已收訂分支，一併寫入 `sales_deal_stage='已簽約'`、`sales_deal_unit_id`、`sales_deal_unit_label`。

**2. 週報表「同步」後顯示已開啟試算表，實際上分頁被瀏覽器擋下**

`syncWeeklyReportSheet()` 原本在 `gasGet` 的非同步 callback 裡才呼叫 `window.open(res.data.url)`。這時已經脫離使用者點擊當下的同步呼叫堆疊，多數瀏覽器（尤其 LINE 內建瀏覽器）會把它當成彈出視窗靜默擋掉——不會報錯，所以 toast 仍顯示「已同步，正在開啟試算表」，但分頁其實沒開。

**修復**（`jltx.html`）：改成在點擊當下（同步呼叫堆疊內）先開一個空白分頁 `window.open('', '_blank')`，通過瀏覽器的使用者手勢檢查；等 `refreshWeeklyReport` 回應的網址回來後，再把該分頁 `location.href` 導過去。如果連同步開空白分頁都被擋（部分瀏覽器環境更嚴格），改在同步按鈕下方顯示一個使用者可以自己點的連結（真人點擊的 `<a target="_blank">` 幾乎不會被任何瀏覽器擋掉）。

## 範圍外（Out of scope）

- LINE ID token 驗證 / 後端簽署 session（認證強化，留待下一輪）
- Supabase 雙寫改非同步佇列（方案 B，留待下一輪）
- 華雄天地（hstd）的任何修改
- 舊版 `index.html` 通用入口的任何修改
- 銷控表直接編輯入口未建立成交明細的資料完整性缺口（記錄在追加項目三，留待下一輪）
- 週報表總表「預訂戶數／預訂車位」的近似值邏輯（`gatherWeeklyReportData_` 用 `Sales_Control.updated_at` 剛好落在當天，且目前狀態是已保留/已收訂/已簽約來推算，不是真正的狀態變更歷史，已知會因為任何欄位更動而把天數算錯）——使用者已明確表示**不要隨意跟改這個邏輯**，維持現狀，之後如果要做也要先討論方案（例如靠 `writeAuditLog` 反推真正的狀態轉換日）
