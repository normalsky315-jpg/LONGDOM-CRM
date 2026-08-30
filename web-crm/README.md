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

## 目前進度

- [x] 專案骨架、設計 token、UI 元件庫（Button/Card/Badge/Input/Skeleton）
- [x] API client：涵蓋 jltx GAS 後端全部現有 action
- [x] 登入
- [x] 首頁儀表板
- [x] 客戶管理（列表／詳情）
- [x] 銷控表
- [x] 任務管理（列表）
- [ ] 銷售日報
- [ ] 來人分析
- [ ] 系統管理（帳號審核／角色）

品牌名稱刻意保持通用（`示範建案`，可用環境變數覆寫），不寫死任何特定案場的中文或英文名稱。
