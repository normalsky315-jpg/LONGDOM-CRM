# 建案銷售 CRM（React 重建版）

以吉隆天曜（jltx）現有功能為基礎、通用化案場名稱的 React + Tailwind 新架構重建專案。
沿用現有 Google Apps Script 後端（`gas-updates/jltx_v9.30_full.gs`）當資料層，不修改、不影響任何正式系統（`jltx.html` / `hstd.html` 維持原樣運作）。

## 開發

```bash
cd web-crm
npm install
npm run dev
```

複製 `.env.example` 為 `.env`，填入真實案場的 `VITE_GAS_URL`、`VITE_SITE_NAME` 即可串接真實資料；
未設定時自動走「示範模式」，用模擬資料展示介面。

## 預覽部署

這個 repo 用 Cloudflare Workers 的靜態資源模式部署（`wrangler.toml` 的 `[assets] directory = "."`），
沒有任何建置流程——推送到 GitHub 後只是把整個 repo 原封不動當靜態檔案發布，並不會執行 `npm run build`。
所以每次改完 `web-crm/` 底下的程式碼，要讓分支預覽網址反映最新內容，必須手動建置並把產物複製到
repo 根目錄的 `webapp/`（這個資料夾會被一併 commit 進 git，是唯一會被實際部署出去的版本）：

```bash
cd web-crm
npm run build
rm -rf ../webapp && cp -r dist ../webapp
```

用 `HashRouter`（不是 `BrowserRouter`）是因為靜態資源伺服器沒有設定 SPA fallback，
路由必須靠網址的 `#/xxx` 在瀏覽器端切換，不需要伺服器端 rewrite 規則。

部署後造訪 `<分支預覽網址>/webapp/` 即可看到最新畫面。

## 目前進度

- [x] 專案骨架、設計 token、UI 元件庫（Button/Card/Badge/Input/Skeleton）
- [x] API client：涵蓋 jltx GAS 後端全部現有 action
- [x] 登入
- [x] 首頁儀表板
- [x] 客戶管理（列表／詳情／新增來客）
- [x] 銷控表（含狀態切換、查看客戶）
- [x] 任務管理（可勾選完成）
- [x] 銷售日報（提交＋近期日報列表）
- [x] 來人分析（每日趨勢＋來源管道分布）
- [x] 系統管理（待審核帳號、角色管理）
- [x] 全域搜尋（⌘/Ctrl+K）、通知提醒、Toast 反饋

品牌名稱刻意保持通用（`示範建案`，可用環境變數覆寫），不寫死任何特定案場的中文或英文名稱。

## 架構審查結論

這份專案曾經有一整批頁面的欄位／回傳格式是憑印象編的，跟真實後端
（`gas-updates/jltx_v9.30_full.gs`）逐一核對後已經修正，細節見 git log。

**認證模型**：確認這個 React 版本的定位是取代 `jltx.html`、供現場業務
用手機操作，所以已整合真正的 LINE LIFF（`@line/liff`），流程對照
`jltx.html`：`liff.init()` → 未登入就 `liff.login()` 導轉 → 
`liff.getProfile()` 拿 `userId`/`displayName` → 帶著這個身份 + 全案場
共用密碼 + 選擇的案場呼叫 `verifyAccess`。session 只長期保存
`line_user_id`（不快取 role，跟 jltx.html 同樣的設計，避免主管改角色
後本地還在用舊權限），每次重新打開 app 都用 `checkAutoLogin` 重新驗證
一次即時角色。

部署到真實案場前記得：
1. 在 LINE Developers 後台建立該案場自己的 LIFF App，Endpoint URL 指向
   這個 web-crm 部署後的正式網址（不能用會變動的分支預覽網址）
2. 設定 `VITE_LIFF_ID` 環境變數為這個新的 LIFF App ID（不要沿用吉隆天曜的）

示範模式（不設定 `VITE_GAS_URL`）刻意不整合 LIFF，因為 LIFF 的固定
Endpoint URL 限制跟示範用的多組隨機預覽網址不相容；示範模式下所有
畫面仍可完整操作，只是不會有真實登入驗證。
