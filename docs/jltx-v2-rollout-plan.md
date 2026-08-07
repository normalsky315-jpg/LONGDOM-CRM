# 吉隆天曜（jltx）V2 落地步驟

> 本文件只描述「接下來要怎麼做」，本階段**不執行**任何一步。對照文件：
> `docs/jltx-migration-mapping.md`（欄位對照）、`docs/jltx-supabase-schema.sql`（DDL 草稿）。

## 整體順序

```
現在（純 Google Sheets）
      │
      ▼
Step 1  建立 Supabase 專案，跑 schema.sql
      │
      ▼
Step 2  一次性歷史資料搬遷 + 身份解析（把舊 Customer_Data 轉成 persons + visits）
      │
      ▼
Step 3  GAS 雙寫：新資料同時寫 Google Sheets（照舊）+ Supabase（新增）
      │
      ▼
Step 4  驗證：跑比對腳本確認兩邊資料一致
      │
      ▼
Step 5  切換讀取：新頁面（Customer 360）改讀 Supabase；舊頁面仍讀 Sheets
      │
      ▼
Step 6  確認穩定後，Google Sheets 降級為報表/備份角色
```

只有 Step 1（Supabase 專案本身的建立）需要使用者在 supabase.com 網站上手動操作，其餘步驟都是
規劃中，待使用者確認要往下走才會實際動 GAS/HTML 程式碼。

---

## Step 1：建立 Supabase 專案（使用者自行操作）

我沒有辦法幫你點網頁按鈕，需要你自己在 [supabase.com](https://supabase.com) 建立一個新專案，
完成後把以下三項資訊準備好（下一階段我需要這些才能接程式）：

1. **Project URL**：類似 `https://xxxxx.supabase.co`
2. **anon public key**：前端/LIFF 之後若要直接呼叫會用到（本階段先不用）
3. **service role key**：GAS 後端雙寫時要用（**這把 key 權限很高，不要貼在前端或公開 repo，
   建議存在 GAS 的 Script Properties**，做法跟現有 `LINE_CHANNEL_ACCESS_TOKEN` 一樣）

建好之後，把 `docs/jltx-supabase-schema.sql` 貼到 Supabase 的 SQL Editor 執行一次，即可建好所有表。

---

## Step 2：歷史資料一次性搬遷 + 身份解析

這一步是把現有 jltx 的 Google Sheets 資料轉存進 Supabase 的一次性腳本（跑一次，不是常駐程式）。

### 2.1 身份解析邏輯（把「多筆來訪」合併成「一個人」）

```
讀取 Customer_Data 全部列
  → 依 phone 正規化（去除非數字、補開頭 0）分組
    → 同一 phone 組內，若有 linked_customer_id 鏈，用來確認分組正確性
    → 同一 phone 組內，取最新一筆的 customer_name/district 當作 persons 主檔值
    → 該組所有列各自轉成一筆 visits，person_id 指向同一個新 person
  → phone 為空或明顯無效的列：退回用 customer_name 模糊比對 + 人工覆核清單
    （產出一份「無法自動判斷」名單，交給使用者人工確認要不要合併）
```

### 2.2 戶別回填

對 `introduced_units` / `deal_unit` / `Deal_Detail.unit` 的自由文字，套用與現有
`countByUnitField`（jltx_v9.8_full.gs:1839–1853）相同的正規表示式 `/([AB])\s*棟?\s*(\d)/gi`
解析出棟別+戶型，比對回 `units` 表；解析不出來的保留 `raw_text`，`unit_id` 留空。

### 2.3 產出檢查清單

搬遷腳本跑完後，需人工確認：
- 「無法自動判斷身份」名單（同名不同 phone、或 phone 缺漏的個案）
- 「戶別文字解析失敗」名單

這兩份名單過一輪人工確認後才視為 Step 2 完成。

---

## Step 3：GAS 雙寫

在 `jltx_v9.8_full.gs` 的四個既有寫入點加上「同時寫一份到 Supabase」的邏輯（**本階段僅示意，
不實際修改**）：

| 既有函式 | 位置 | 雙寫目標 |
|---|---|---|
| `appendCustomerData` | jltx_v9.8_full.gs:879–951 | 寫入 Supabase `visits`（先確保對應 `person_id` 存在，不存在則先建立 `persons`） |
| `updateCustomerData` | jltx_v9.8_full.gs:1436–1502 | 更新 Supabase `visits` 對應列 |
| `appendContactLog` | jltx_v9.8_full.gs:1204–1236 | 寫入 Supabase `contacts` |
| `saveDealDetail` | jltx_v9.8_full.gs:1035–1099 | 寫入 Supabase `deals` |

示意程式碼片段（GAS 呼叫 Supabase REST API，實際實作時再補完整錯誤處理）：

```javascript
function writeToSupabase_(table, payload) {
  var SUPABASE_URL = getProp('SUPABASE_URL');       // Script Properties，跟 LINE token 存法一樣
  var SERVICE_KEY  = getProp('SUPABASE_SERVICE_KEY');
  var res = UrlFetchApp.fetch(SUPABASE_URL + '/rest/v1/' + table, {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'apikey': SERVICE_KEY,
      'Authorization': 'Bearer ' + SERVICE_KEY,
      'Prefer': 'return=representation'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true   // 雙寫失敗不能擋住原本寫 Sheets 的主流程
  });
  if (res.getResponseCode() >= 300) {
    writeAuditLog({ action: 'SUPABASE_WRITE_FAILED', target_sheet: table, detail: res.getContentText() });
  }
}
```

原則：**Supabase 寫入失敗絕不能影響 Google Sheets 的主流程**（try/catch 包起來，失敗只記
log，不 throw），因為現階段 Sheets 仍是唯一權威資料源。

---

## Step 4：驗證雙寫一致性

雙寫上線跑一段時間（建議至少 1–2 週，涵蓋一次完整的日/週報表週期）後，寫一支比對腳本：

- 筆數比對：Google Sheets `Customer_Data` 列數 vs Supabase `visits` 列數（需扣掉合併後理論上的
  對應關係，不是單純數字相等，而是「每一筆 Sheets 列都能在 Supabase 找到對應 visits 列」）
- 關鍵欄位比對：抽樣比對 `phone`、`visit_date`、`sales_line_user_id` 是否一致
- 新增資料延遲檢查：確認雙寫沒有明顯延遲或漏寫（用 `created_at` 時間戳比對）

全部通過才進入 Step 5。

---

## Step 5：切換讀取源（Customer 360 頁面）

先做一個新的、獨立的 Customer 360 頁面（不動現有 jltx.html 既有功能），這個新頁面直接讀
Supabase：輸入客戶姓名/電話，顯示這個人合併後的完整時間軸（多次來訪、聯絡紀錄、成交狀態）。

這一步只新增功能、不移除舊功能，業務可以繼續用原本的 jltx.html 操作，新頁面是額外提供的視圖，
降低切換風險。

---

## Step 6：Google Sheets 降級為報表/備份角色

確認 Supabase 穩定運作一段時間、Customer 360 頁面被實際使用且沒有資料落差後，才評估：
- 是否讓 GAS 主要寫入目標反轉（Supabase 為主、Sheets 變成定期匯出的報表）
- 是否需要繼續維護 Sheets 雙寫，或只保留定期批次匯出

這個決策留到那時候再做，不在本階段規劃範圍內。

---

## 明確排除（這次不做）

- ❌ 不做 AI 相關功能（摘要、成交機率、話術推薦）——這些是 V2.3 之後的範疇，需要先有乾淨的
  Customer 360 資料才有意義
- ❌ 不同步處理 hstd（華雄天地）——先在 jltx 驗證整套流程可行後，才把同一套 schema/腳本套用到
  hstd（hstd 缺少的 jltx 專屬欄位在 schema 中留空即可，相容性已在 migration mapping 文件中處理）
- ❌ 不做五案場（hstd/hsyy/jltx/ltcj/yjmj）收斂成單一 CRM 的工作——這是更後面 V2.1 的範疇，
  且使用者目前只需要維運 hstd 與 jltx 兩個案場
- ❌ 不在本階段實際修改 `jltx_v9.8_full.gs` 或 `jltx.html`——Step 3 的程式碼片段僅供之後實作
  參考，需等 Step 1（Supabase 專案就緒）與使用者確認後才會真的動手改
