# 吉隆天曜（jltx）→ Supabase 欄位對照表（Migration Mapping）

> 本文件是純規劃文件，**不影響任何現有程式碼**。來源盤點自 `gas-updates/jltx_v9.8_full.gs`（含
> `jltx.html` 對照），並與 `gas-updates/hstd_v9.35_full.gs` 做過差異比對。
>
> 型別慣例對應：舊 GAS 的 `DATE_ONLY_FIELDS` → Postgres `date`；`DATETIME_FIELDS` → `timestamptz`；
> `TEXT_FORCE_FIELDS`（如 `phone`，避免手機號碼開頭 0 被 Sheets 當數字吃掉）→ Postgres `text`。

## 目錄

1. [Customer_Data → persons + visits](#1-customer_data--persons--visits)
2. [Contact_Log → contacts](#2-contact_log--contacts)
3. [Deal_Detail → deals](#3-deal_detail--deals)
4. [User_Role_Table → users](#4-user_role_table--users)
5. [Project_List → projects](#5-project_list--projects)
6. [Task_List → tasks](#6-task_list--tasks)
7. [Daily_Report → daily_reports](#7-daily_report--daily_reports)
8. [Maintenance_Report → maintenance_reports](#8-maintenance_report--maintenance_reports)
9. [Audit_Log → audit_log](#9-audit_log--audit_log)
10. [Customer_Change_Log → 併入 audit trail](#10-customer_change_log--併入-audit-trail)
11. [Leave_Schedule → leave_schedule](#11-leave_schedule--leave_schedule)
12. [Calendar_Notes → calendar_notes](#12-calendar_notes--calendar_notes)
13. [新增：units（戶別主檔，舊系統沒有對應表）](#13-新增units戶別主檔舊系統沒有對應表)
14. [新增：person_unit_interests（客戶興趣戶別）](#14-新增person_unit_interests客戶興趣戶別)
15. [新增：activities（統一時間軸，AI 專用）](#15-新增activities統一時間軸ai-專用)
16. [跨表清理事項總表](#16-跨表清理事項總表)

---

## 1. Customer_Data → persons + visits

這是整個改造最核心的一步：舊系統「一列 = 一次來訪」，新系統拆成「一個真人一筆（`persons`）+
每次來訪一筆事件（`visits`）」。

### 1.1 拆分邏輯

- **不是逐欄搬移**，而是先做「身份解析」：把歷史上屬於同一人的多筆 `Customer_Data` 列合併成一個
  `persons` 列，原本的每一列變成一筆 `visits`（`person_id` 指回合併後的人）。
- 身份解析優先順序（詳見 rollout plan 文件）：
  1. `phone` 正規化後完全相同 → 視為同一人（主要信號，`appendCustomerData` 已內建的
     `duplicate_phone` 偵測證明這是目前系統認為最可靠的判斷依據）
  2. 有填 `linked_customer_id` 鏈 → 沿鏈合併（輔助信號，因為是選填、可能漏填或串錯）
  3. `customer_name` 模糊比對（去空白、同音字）→ 僅作為人工覆核提示，不自動合併

### 1.2 欄位對照

| 舊欄位（Customer_Data） | 新表.新欄位 | 型別 | 備註 |
|---|---|---|---|
| `customer_id` | `visits.legacy_customer_id` | text | 保留舊 ID 供追溯，不再是主鍵 |
| （身份解析產生） | `persons.id` | uuid PK | 新增，一人一筆 |
| `customer_name` | `persons.name`（首次出現值）+ `visits.customer_name_at_visit` | text | persons 存目前姓名，visits 存當次登記姓名（可能有誤植/曾用名） |
| `phone` | `persons.phone`（正規化後）+ `visits.phone_at_visit` | text | 正規化：去除非數字字元、補齊開頭 0 |
| `age_range` | `visits.age_range` | text | 每次來訪可能認知不同，留在 visit 層 |
| `gender` | `visits.gender` | text | jltx 專屬欄位，hstd 對應留空 |
| `marital_status` | `visits.marital_status` | text | jltx 專屬 |
| `district` | `persons.district`（最新值）+ `visits.district_at_visit` | text | |
| `occupation_industry` | `visits.occupation_industry` | text | |
| `purchase_motive` | `visits.purchase_motive` | text | |
| `source` | `visits.source` | text | 首次來訪的 source 最重要，建議 `persons.first_source` 額外存一份 |
| `room_types` | `visits.room_types` | text[] | 舊資料是 `、` join 字串，需拆成陣列 |
| `budget` | `visits.budget` | numeric，nullable | 舊欄位，jltx 表單已不收集，僅供歷史資料相容 |
| `issues` | `visits.objections` | text[] | 同 room_types 拆陣列 |
| `revisit_plan` | `followups.plan_note`（見 followups 表） | text | 移到 followups，而非留在 visit |
| `deal_status` | `visits.deal_status_snapshot` | text | 僅作快照，真正狀態以 `deals` 表為準 |
| `deal_unit` | 併入 `person_unit_interests` / `deals.unit_id` | — | 見 §13、§14 |
| `status_note` | `visits.status_note` | text | 必填欄位，原樣搬 |
| `note` | `visits.note` | text | |
| `visit_time_slot` | `visits.visit_time_slot` | text | jltx 專屬 |
| `sqft_requirement` | `visits.sqft_requirement` | text | jltx 專屬 |
| `room_requirement_note` | `visits.room_requirement_note` | text | jltx 專屬 |
| `introduced_units` | `person_unit_interests`（正規化，見 §14） | — | 不留自由文字，改用 FK 表 |
| `referrer_name` | `visits.referrer_name` | text | jltx 專屬，僅 `source = 親友介紹` 時有值 |
| `linked_customer_id` / `linked_customer_name` / `linked_visit_date` | **廢除** | — | 由身份解析後的 `visits.person_id` 直接取代，不再需要手動關聯欄位 |
| `visit_date` | `visits.visited_at` | date | |
| `visit_type` | `visits.visit_type` | text (`初訪`/`回籠`) | 合併後仍保留，用於統計 |
| `project_name` | `visits.project_id` | uuid FK → projects | 字串換成真正外鍵 |
| `sales_line_user_id` / `sales_name` | `visits.sales_user_id` | uuid FK → users | 姓名不重複存，join users 取得 |
| `created_by_line_user_id` / `created_by_name` | `visits.created_by_user_id` | uuid FK → users | |
| `created_at` / `updated_at` | `visits.created_at` / `visits.updated_at` | timestamptz | |

**未搬移欄位**（v7.0 實驗後已停用，舊資料若存在僅供人工查詢，不建新表）：地址、自備款、住家/公司電話、
交通方式、家庭結構、來訪型態。

---

## 2. Contact_Log → contacts

| 舊欄位 | 新表.新欄位 | 型別 | 備註 |
|---|---|---|---|
| `contact_id` | `contacts.legacy_contact_id` | text | |
| `customer_id` | `contacts.visit_id` 或 `contacts.person_id` | uuid FK | **建議改成 `person_id`**（見下方說明） |
| `customer_name` / `phone` / `project_name` / `sales_line_user_id` / `sales_name` | 移除（denormalized 欄位不再需要） | — | 一律 join `persons`/`projects`/`users` 取得 |
| `contact_date` | `contacts.contacted_at` | timestamptz | |
| `contact_method` | `contacts.method` | text | 必填 |
| `note` | `contacts.note` | text | |
| `next_followup_date` | `followups.due_at`（新增獨立 `followups` 表） | date | 目前系統用「該客戶最新一筆 Contact_Log 的 next_followup_date」判斷待追蹤，新設計改用獨立 `followups` 表，一人可有多筆待辦不互相覆蓋 |
| `created_at` / `created_by_line_user_id` | `contacts.created_at` / `contacts.created_by_user_id` | timestamptz / uuid FK | |

> **重要決策點**：舊系統 `Contact_Log.customer_id` 對應到的是「某一次來訪列」的 `customer_id`，
> 但追蹤聯絡其實是對「人」而非對「某次來訪」。建議 `contacts.person_id` 直接 FK 到 `persons`，
> 而非 FK 到某一筆 `visits`，這樣同一人不論哪次來訪產生的追蹤紀錄都會正確歸戶。

---

## 3. Deal_Detail → deals

| 舊欄位 | 新表.新欄位 | 型別 | 備註 |
|---|---|---|---|
| `deal_id` | `deals.legacy_deal_id` | text | |
| `customer_id` | `deals.person_id` | uuid FK → persons | 同上，改成對人不對某次來訪 |
| `customer_name` | 移除 | — | join persons |
| `project_name` | `deals.project_id` | uuid FK → projects | |
| `unit` | `deals.unit_id` | uuid FK → units | 見 §13，需靠 `countByUnitField` 同款 regex 回填歷史資料 |
| `house_base_price` / `parking_base_price` / `premium` / `deal_price` | 對應同名 numeric 欄位 | numeric | 原樣搬 |
| `deposit_amount` | `deals.deposit_amount` | numeric | |
| `contract_status` | `deals.contract_status` | text (`待簽約`/`已簽約`) | |
| `expected_sign_date` / `signed_date` | 同名 date 欄位 | date | |
| `salesperson` / `sales_line_user_id` | `deals.sales_user_id` | uuid FK → users | |
| `created_by_line_user_id` | `deals.created_by_user_id` | uuid FK | |
| `status` | `deals.status` | text (`active`/`退戶`) | |
| `refund_reason` / `refund_date` | 同名欄位 | text / date | |
| `created_at` / `created_by` / `updated_at` | 同名時間欄位 | timestamptz | |

---

## 4. User_Role_Table → users

| 舊欄位 | 新表.新欄位 | 型別 | 備註 |
|---|---|---|---|
| `line_user_id` | `users.line_user_id` | text，唯一索引 | **清理重複列**：舊表同一 line_user_id 可能有多筆（重新授權產生），搬遷時只取 `status='active'` 且最新 `updated_at` 的一筆 |
| `display_name` | `users.display_name` | text | |
| `role` | `users.role` | text (`sales`/`manager`/`admin`) | |
| `status` | `users.status` | text | |
| `project_name` | `users.project_id`（可多對多，見備註） | uuid FK 或關聯表 | 若未來一人可跨案場（hstd+jltx 都要登入），建議改成 `user_project_access` 關聯表而非單一欄位 |
| `job_title` | `users.job_title` | text | |
| `last_login_at` | `users.last_login_at` | timestamptz | |
| `created_at` / `updated_at` | 同名 | timestamptz | |

---

## 5. Project_List → projects

| 舊欄位 | 新表.新欄位 | 型別 | 備註 |
|---|---|---|---|
| `project_name` | `projects.id`（新 uuid）+ `projects.name`（保留原字串） | uuid PK / text | 所有其他表原本用字串 `project_name` 當 key，改用 `project_id` |
| `project_code` | `projects.code` | text | |
| `status` | `projects.status` | text | |
| `manager_line_user_id` | `projects.manager_user_id` | uuid FK → users | |
| `created_at` / `updated_at` | 同名 | timestamptz | |

> 本階段只需 seed 一筆：`吉隆天曜 / JLTX`。之後 hstd 加入時再 seed 第二筆，`organizations` 表可先固定一筆
> 龍登國際即可。

---

## 6. Task_List → tasks

逐欄同名搬遷，`assigned_to_line_user_id`/`created_by_line_user_id` 改成 `assigned_to_user_id`/
`created_by_user_id`（uuid FK → users），`project_name` 改 `project_id`。優先度低，可延後搬遷。

## 7. Daily_Report → daily_reports

逐欄同名搬遷。這張表是人工彙總數字，不是核心客戶資料，且系統本身也有 `getDailyVisitorBreakdown` 等
即時統計函式可以之後直接改用 `visits` 表 `GROUP BY` 取代人工填報表。**建議列為低優先，可與 Google
Sheets 並存到 V2.2 之後再評估是否要保留這張表**。

## 8. Maintenance_Report → maintenance_reports

逐欄同名搬遷，`photo_url` 保留 Google Drive 連結（不搬圖片本體）。非客戶核心資料，低優先。

## 9. Audit_Log → audit_log

逐欄同名搬遷，唯一例外：**`display_name` 欄位目前有 bug**（`writeAuditLog` 實際存的是
`line_user_id` 而非真名，見 jltx_v9.8_full.gs:2419），**不搬這個錯誤值**，新表改成不存
`display_name`，改由 `line_user_id` join `users.display_name` 即時取得。

## 10. Customer_Change_Log → 併入 audit trail

`changes_json` 是半結構化 JSON diff blob。建議不建獨立正規化表，直接搬進通用 `audit_log`（
`target_table='visits'`, `target_id=<visit legacy id>`, `detail=changes_json` 原樣存 jsonb 欄位）。

## 11. Leave_Schedule → leave_schedule

逐欄同名搬遷，`line_user_id`/`created_by_line_user_id` 改 uuid FK。非客戶核心資料，低優先。

## 12. Calendar_Notes → calendar_notes

逐欄同名搬遷。非客戶核心資料，低優先。

---

## 13. 新增：units（戶別主檔，舊系統沒有對應表）

舊系統完全沒有結構化戶別主檔，只在 `Customer_Data.introduced_units`、`deal_unit`、
`Deal_Detail.unit` 存自由文字，報表時靠 `countByUnitField` 正規表示式即時解析。

新表依 jltx 前端 picker 的組合規則（jltx.html:2224–2235）預先 seed：

- A 棟：戶型 ∈ {1, 2, 3, 5, 6}，樓層 1–15 → 5 × 15 = 75 戶
- B 棟：戶型 ∈ {1, 2, 3, 5}（**無 6 型**），樓層 1–9 → 4 × 9 = 36 戶

歷史資料回填：對舊 `Deal_Detail.unit`／`Customer_Data.introduced_units`／`deal_unit` 的自由文字，
套用與 `countByUnitField` 相同的正規表示式（`/([AB])\s*棟?\s*(\d)/gi`）解析出棟別+戶型，
搭配文字中可辨識的樓層資訊，比對回 `units.id`；無法可靠解析的舊資料標記
`unit_id = NULL` + 保留原始文字於 `raw_text` 欄位，供人工事後核對，不強制清空。

## 14. 新增：person_unit_interests（客戶興趣戶別）

取代自由文字 `introduced_units`。欄位：`person_id`（FK）、`unit_id`（FK）、`visit_id`（FK，記錄是哪次
來訪介紹的）、`interest_level`（可選，預設 null）、`created_at`。一人可對多戶感興趣，一戶可被多人看過。

## 15. 新增：activities（統一時間軸，AI 專用）

本階段**只設計 schema，不寫入資料**，為 V2.3 AI Assistant 預留。欄位：`person_id`、`project_id`、
`activity_type`（`visit`/`contact`/`deal`/`message`）、`ref_table`、`ref_id`、`occurred_at`、
`summary_text`（供 AI 摘要寫入）、`created_at`。之後可用資料庫 trigger 或應用層在寫入
`visits`/`contacts`/`deals` 時同步寫一筆到這裡，作為 AI 讀取的單一入口，不用同時查四五張表。

---

## 16. 跨表清理事項總表

| 問題 | 影響範圍 | 處理方式 |
|---|---|---|
| 同一人多筆來訪被當成多個獨立客戶 | Customer_Data | 身份解析合併成 persons + visits |
| `linked_customer_id` 選填、易漏填/串錯 | Customer_Data | 廢除，改用身份解析後的 person_id |
| 手機號碼開頭 0 遺失 | Customer_Data.phone 及所有引用 phone 的表 | 沿用現有 `fixLeadingZeroPhones` 邏輯，搬遷前先修正 |
| 沒有結構化戶別主檔 | introduced_units / deal_unit / Deal_Detail.unit | 新增 units 表，用 regex 回填歷史資料 |
| `project_name` 到處當字串外鍵用 | 幾乎所有表 | 一律改用 `project_id` uuid FK |
| `User_Role_Table` 同一人可能有多筆重複列 | User_Role_Table | 搬遷時只取 active + 最新一筆 |
| `Audit_Log.display_name` 實際存錯值 | Audit_Log | 不搬這個欄位值，join users 即時取得 |
| jltx 專屬 6 欄位 vs hstd 沒有 | Customer_Data | 保留在 visits 表，hstd 資料這些欄位留空即可，未來相容 |
| `Contact_Log`/`Deal_Detail` 目前對 `customer_id`（某次來訪）而非對人 | Contact_Log, Deal_Detail | 新表一律改成對 `person_id`，避免同人不同來訪的追蹤/成交紀錄被切散 |
