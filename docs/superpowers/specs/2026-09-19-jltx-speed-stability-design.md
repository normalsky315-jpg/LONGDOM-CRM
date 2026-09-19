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

**需要使用者手動完成的部分**（會在實作完成後明確列出清單）：
- 把修改後的 `gas-updates/jltx_v9.35_full.gs` 內容貼回 Google Apps Script 編輯器，部署新版本
- 部署後實際操作驗收：正常送出一筆成交明細/追蹤記錄/客戶編輯，確認沒有重複寫入；刻意在網路很慢的情況下測試逾時重試情境（若能重現）
- 確認 `getUserList` 相關的主管專屬資料在 `getHomeBootstrap` 回傳中權限判斷正確（一般業務不該拿到）

前端 `jltx.html` / `customer360.html` 屬於 Cloudflare Workers 直接從 repo 讀取的靜態檔案，PR 合併後自動部署，不需要使用者手動處理。

### 部署與交付方式

- 開新分支／沿用目前 `claude/sweet-thompson-lb0tvg` 分支繼續做，改完開 PR（draft），列清楚上述「需要手動完成」的部署清單
- `.gs` 檔案變更只更新 repo 內的快照備份，不會、也無法自動同步到正式 Google Apps Script 部署

## 範圍外（Out of scope）

- LINE ID token 驗證 / 後端簽署 session（認證強化，留待下一輪）
- Supabase 雙寫改非同步佇列（方案 B，留待下一輪）
- 華雄天地（hstd）的任何修改
- 舊版 `index.html` 通用入口的任何修改
