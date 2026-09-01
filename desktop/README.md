# 龍登 CRM — Windows 桌面軟體

把龍登 CRM（華雄天地 / 吉隆天曜）包成 Windows 桌面軟體（`.exe` 安裝檔）。
以獨立視窗載入**正式站**（`longdomcrm.realestatesky315.workers.dev`），
連線行為、LINE 登入、UI 皆與平常在瀏覽器/LINE 使用時**完全一致**，且永遠最新。
外觀為獨立軟體（自有圖示、視窗、精簡選單，無瀏覽器網址列）。

- 啟動先顯示本機選單頁選擇案場（華雄天地 / 吉隆天曜），點選後於視窗內載入對應正式站。
- LINE 登入的 OAuth 導向於視窗內完成，登入狀態跨啟動保留。
- 選單「功能」提供：切換案場（回首頁）、重新整理、上一頁。

## 如何取得安裝檔（.exe）

Windows 安裝檔須在 Windows 環境建置，已設定 GitHub Actions 自動打包：

1. GitHub 專案的 **Actions** 分頁 → 「打包 Windows 桌面軟體」→ 對應執行頁面。
2. 頁面底部 **Artifacts** 下載 `longdom-crm-windows`，解壓即得 `.exe`。
3. 或推送 `v1.0.0` 之類標籤，自動建立 GitHub Release 並附上 `.exe`。

> 未做程式碼簽署，首次安裝 Windows SmartScreen 會顯示「未知發行者」，
> 點「其他資訊 → 仍要執行」即可。要消除需另購程式碼簽署憑證。

## 本機開發／測試

```bash
cd desktop
npm install
npm start          # 開發模式啟動
npm run build:win  # 在 Windows 上打包 dist/*.exe
```

## 架構

- `main.js` — Electron 主程序：建立視窗、載入選單頁、管理選單與外部連結；
  設定標準 Chrome User-Agent 以相容 LINE 登入。
- `launcher.html` — 本機選單頁（選擇案場，連向正式站對應網址）。
- `build/icon.png` — 軟體圖示。
- 若正式站網域變更，改 `main.js` 的 `SITE_HOST` 與 `launcher.html` 的連結即可。
