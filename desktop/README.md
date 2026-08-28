# 龍登 CRM — Windows 桌面軟體

把龍登 CRM（華雄天地 / 吉隆天曜）打包成 Windows 桌面軟體（`.exe` 安裝檔）。
內容打包在軟體內、以內建本機伺服器載入，開起來是獨立視窗的程式，**不是瀏覽器開網頁**。

> 注意：程式本體為本機自帶，但撈取／儲存客戶資料時仍需網路連線後端
> （Google Apps Script / Google Sheets），此為既有架構。

## 如何取得安裝檔（.exe）

因為 Windows 安裝檔必須在 Windows 環境建置，已設定 GitHub Actions 自動打包：

1. 到 GitHub 專案的 **Actions** 分頁 → 選「打包 Windows 桌面軟體」→ 按 **Run workflow**。
2. 建置完成後，在該次執行頁面底部的 **Artifacts** 下載 `longdom-crm-windows`，解壓即得 `.exe`。
3. 或推送 `v1.0.0` 之類的版本標籤，會自動建立 GitHub Release 並附上 `.exe`。

> 未做程式碼簽署（未購買憑證），首次安裝時 Windows SmartScreen 會顯示「未知發行者」
> 警告，點「其他資訊 → 仍要執行」即可。若要消除此警告需另購程式碼簽署憑證。

## 本機開發／測試

需先安裝 Node.js：

```bash
cd desktop
npm install
npm start        # 開發模式啟動軟體
npm run build:win  # 在 Windows 上打包出 dist/*.exe
```

## 架構說明

- `main.js` — Electron 主程序：啟動本機 HTTP 伺服器提供 `app/` 內容、建立視窗、
  啟動時清除 Service Worker 快取（避免更新後顯示舊版）但保留登入 session。
- `scripts/sync-web.js` — 把專案根目錄的前端檔（`index.html`、`hstd.html`、
  `jltx.html` 等 + `assets/`）複製進 `app/`。**根目錄為單一真實來源**，修改網站
  即修改軟體內容，重新打包即可。
- `build/icon.png` — 軟體圖示（由品牌 logo 生成）。
- `app/`、`dist/`、`node_modules/` 為建置產物，不納入版本控制。
