# web-crm 剩餘模組實作計畫

本文件是 `web-crm/`（React 重建版）補完剩餘功能前的施工計畫，目的是先把「要做什麼」「每個按鈕實際要接上什麼」「哪些動作有風險、能不能撤銷」想清楚，再動手寫，避免重演「做完一部分才發現另一部分沒做」的狀況。

對照基準是吉隆天曜正式系統 `jltx.html` + `gas-updates/jltx_v9.30_full.gs`，這是唯一的事實來源——本文件每一項都已經對照過後端程式碼確認欄位與規則，不是憑印象寫的。

## 現況

**已完成**：首頁儀表板、客戶管理（列表／詳情／新增）、銷控表（列表／新增戶別／狀態變更）、任務管理（列表／新增／完成切換）、銷售日報（單日提交／列表）、來人分析（簡化版）、系統管理（帳號審核／角色）、LINE LIFF 登入。

**本文件涵蓋的待完成模組**：熱點地圖、週報表／月報表、本週熱推、排休管理、維修通報、行事曆備註、客戶修改紀錄、客戶編輯、接待記錄新增／編輯。

## 撤銷能力總原則（先讀這段，下面每個模組都會引用）

後端沒有任何垃圾桶或版本回復機制。所有「刪除」類 action（`deleteContactLog`／`deleteCustomerData`／`deleteTask`／`deleteDailyReport`／`deleteSalesControlUnit`／`deleteMaintenance`／`deleteLeave`／`deleteCalendarNote`）都是呼叫 `deleteRowById()`，內部直接 `sheet.deleteRow()`——**資料列從試算表上物理刪除，沒有任何復原路徑**。這是後端既有的行為，這次不打算、也不應該去改後端邏輯來加軟刪除，那是另一個層級的工程。

因此前端的撤銷能力只能分三種等級，每個動作對照下面表格分類：

| 等級 | 意思 | 前端該做的事 |
|---|---|---|
| **A. 天然可逆** | 新增後可以直接刪掉自己剛建的、或狀態改回去就等於撤銷 | 正常送出即可，不需要額外確認框 |
| **B. 邏輯可逆但要小心** | 例如成交狀態改「退戶」不會真的刪資料，但會牽動關聯的銷控表狀態同步 | 送出前用一般確認（不用嚇人字眼），成功後 toast 要講清楚牽動了什麼 |
| **C. 不可逆** | 呼叫任何 `delete*` action | 一定要二次確認 modal，文案明講「刪除後無法復原」，不能只是瀏覽器內建的 `confirm()`（使用者容易手滑點過去） |

## 模組清單

### 1. 客戶編輯（補齊客戶詳情頁）

- **對應 action**：`updateCustomerData`（`customer_id` 必填；業務只能改自己名下客戶，見 `ctx.role===SALES` 檢查）
- **UI 進入點**：客戶詳情頁「基本資料」分頁加一顆編輯按鈕，開啟表單複用 `NewCustomer.tsx` 的欄位集合
- **等級**：A（改壞了可以再改一次改回來，後端也有 `Customer_Change_Log` 留痕）
- **備註**：現在客戶詳情頁的「建立追蹤」「新增接待紀錄」兩顆按鈕是裝飾用、完全沒接 onClick，屬於同一批要修的

### 2. 接待記錄新增／刪除

- **對應 action**：`appendContactLog`（`customer_id`／`contact_method` 必填）、`deleteContactLog`
- **UI 進入點**：客戶詳情頁「接待記錄」分頁補一顆「新增接待紀錄」開小表單（聯絡方式／備註／下次追蹤日期）；每筆記錄旁加刪除
- **等級**：新增＝A；刪除＝**C（不可逆，要二次確認）**

### 3. 客戶修改紀錄（唯讀）

- **對應 action**：`getCustomerChangeLogs`
- **UI 進入點**：客戶詳情頁新增一個「修改紀錄」分頁，純顯示（時間／誰改的／改了什麼欄位）
- **等級**：唯讀，無風險

### 4. 週報表／月報表

- **對應 action**：`getWeeklyReceptionList`（經理視角接待明細表）、`getMyWeekCustomersForPick`＋`submitWeeklyHotPicks`（本週熱推，見下一項）、`getMonthlyVisitorBreakdown`
- **UI 進入點**：「銷售日報」頁加分頁籤（日報／週報／月報），週報／月報是唯讀彙整表格，不是新的送出表單
- **等級**：唯讀，無風險。權限比照現有日報頁的 `RequireManager`（後端本來就擋 SALES）

### 5. 本週熱推

- **對應 action**：`getMyWeekCustomersForPick`（列出本週自己的客戶供勾選）、`submitWeeklyHotPicks`
- **UI 進入點**：新頁面或週報表分頁裡的一個區塊，勾選客戶＋填備註送出
- **等級**：A（可重複送出更新內容，非破壞性）

### 6. 排休管理

- **對應 action**：`getLeaveSchedule`、`appendLeave`（業務只能排自己的；有週末限制邏輯 `blockedWeekend`）、`deleteLeave`、`getTodayLeave`（首頁用）
- **UI 進入點**：新頁面「排休」，月曆式勾選日期送出；主管視角要看得到全案場排休總表（`openLeaveAssignModal` 對應的主管指派功能）
- **等級**：新增＝A；刪除＝**C（不可逆）**

### 7. 維修通報

- **對應 action**：`getMaintenanceList`、`appendMaintenance`（`issue_type`／`description` 必填）、`updateMaintenance`、`updateMaintenanceStatus`（管理端專用，SALES 被擋）、`deleteMaintenance`、`uploadMaintenancePhoto`
- **UI 進入點**：新頁面「維修通報」，列表＋新增表單（問題類型／描述／優先度／照片上傳）；管理端多一個狀態下拉
- **等級**：新增／更新＝A；刪除＝**C**；照片上傳走 `gasPostJson`（真 POST，見 `gasClient.ts` 目前只做了 GET 型的 `gasPost`，這支要另外實作）

### 8. 行事曆備註

- **對應 action**：`getCalendarNotes`、`addCalendarNote`（SALES 被擋，需主管以上）、`deleteCalendarNote`
- **UI 進入點**：新頁面「行事曆」，月曆格狀檢視，點日期新增備註
- **等級**：新增＝A；刪除＝**C**

### 9. 熱點地圖

- **對應 action**：`getGeoPoints`
- **UI 進入點**：新頁面「來人分析」下的地圖分頁，或獨立頁面，用地址地理座標畫熱點圖
- **等級**：唯讀，無風險
- **備註**：這個工作量比其他模組大，需要地圖繪製套件（jltx.html 用 Leaflet），且要確認 `getGeoPoints` 回傳的座標資料完整度（部分客戶地址可能還沒做過地理編碼）

## 建議優先順序

1. **客戶編輯＋接待記錄新增**（第1、2項）：這是目前客戶管理最明顯的斷點，詳情頁看得到資料卻改不了、也不能記錄新的接待
2. **維修通報＋排休管理**（第6、7項）：業務日常會用到的獨立模組，跟現有頁面不重疊，做完立刻可用
3. **週報表／月報表／本週熱推**（第4、5項）：主管視角，依賴的資料源（客戶清單）已經在用，開發成本相對低
4. **客戶修改紀錄**（第3項）：唯讀、風險低，可以搭配第1項一起做
5. **行事曆備註**（第8項）：獨立、简单
6. **熱點地圖**（第9項）：放最後，因為需要額外套件評估

## 每個模組的完成定義（Definition of Done）

做完一個模組，要同時滿足：
- [ ] 對應的 action 欄位名稱已對照 `jltx_v9.30_full.gs` 逐一確認（不是憑印象猜的）
- [ ] 所有會寫入資料的按鈕都有接上真正的 API 呼叫，不是裝飾用的按鈕
- [ ] 屬於等級 C（呼叫 `delete*`）的動作都有二次確認 modal，文案明講「無法復原」
- [ ] 角色權限比照後端的 `ctx.role===SALES` 檢查做前端隱藏／擋下（不是每個功能都要業務能用）
- [ ] `npx tsc --noEmit` 與 `npm run build` 通過
- [ ] Playwright 截圖驗證至少一次「新增」「查看」「（如果有刪除）刪除確認」三種互動

## 本次不處理

- 後端本身不會被修改（不加軟刪除、不加新 action），除非確認某個功能後端真的缺 API
- 不做「復原刪除」的新機制——後端沒有垃圾桶，前端假裝有只會誤導使用者
