# LONGDOM-CRM

這是一個純 HTML 的 CRM 系統，無需任何建置工具或套件管理器。

## 專案結構

目前維運中的案場只有兩個：

- `jltx.html` - 吉隆天曜 CRM（主力優化對象）
  - `jltx-edm.html` - 吉隆天曜 EDM 行銷頁
  - `customer360.html` - 吉隆天曜 Customer 360
- `hstd.html` - 華雄天地 CRM
- `index.html` - 龍登 CRM 舊版通用入口（多案場下拉選單架構，已被各案場獨立頁面取代）

其他案場（華雄音樂匯 hsyy、龍廷誠家 ltcj、遠見沐景 yjmj）已下線並從 repo 移除，不再維護。

`gas-updates/` 內為對應案場 Google Apps Script 後端的程式碼快照備份，實際部署在 Google Apps Script（不在此 repo 內執行）。

## 開發方式

直接編輯 HTML 檔案即可，無需執行任何安裝或建置指令。
可用瀏覽器直接開啟 HTML 檔案預覽，或用任何靜態伺服器托管。

## 部署

推送到 GitHub 後可透過 GitHub Pages 或任何靜態托管服務部署。
