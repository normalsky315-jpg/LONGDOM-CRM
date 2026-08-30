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

## 架構審查結論（已修正 vs. 待決策）

這份專案曾經有一整批頁面的欄位／回傳格式是憑印象編的，跟真實後端
（`gas-updates/jltx_v9.30_full.gs`）逐一核對後已經修正，細節見 git log；
還有一項是產品層級的決定，不是程式碼可以自己選的：

**認證模型未定案**：真正的吉隆天曜是 LINE LIFF 應用——身份來自
`liff.getProfile()` 取得的 `lineUserId`，不是帳號密碼；`verifyAccess`
只驗證「一組全案場共用密碼」+ 這個 LINE 身份 + 選擇的案場。這個
React 版本目前只修正了登入畫面的欄位（拿掉不存在的「帳號」欄位、
案場清單改成動態載入），但沒有整合 `@line/liff`，所以在瀏覽器直接
開啟時串不上真實後端登入（後端會回「無法取得 LINE 使用者身份」）。
要讓真實登入可用，需要先決定：
1. 整合 `@line/liff`，讓這個 React 版本也只能從 LINE 內開啟（跟現有系統一致）
2. 或者幫這個新架構額外做一支不綁 LINE 身份的登入 action（等於後端要加新功能）

在決定之前，示範模式（不設定 `VITE_GAS_URL`）仍可完整操作所有畫面。
