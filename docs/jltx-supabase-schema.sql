-- =====================================================================
-- LONGDOM CRM V2 — 吉隆天曜 (jltx) 試點 Supabase Schema 草稿
--
-- 這是規劃階段的 DDL 草稿，尚未在任何 Supabase 專案上執行。
-- 對照文件：docs/jltx-migration-mapping.md
-- 設計原則：
--   1. 核心翻轉：Customer_Data「一次來訪 = 一列」→ persons（人）+ visits（事件）
--   2. project_name 字串 key 一律改用 project_id uuid FK
--   3. 新增 units 主檔，取代自由文字戶別欄位
--   4. 非客戶核心資料（tasks/daily_reports/maintenance/leave/calendar）
--      先建表但視為低優先，可延後搬遷或繼續留在 Google Sheets
--   5. customer_project_profiles：人（persons）與案場關係（stage/負責業務/來源/熱度）分層，
--      因為 hstd、jltx 未來共用同一批人時，同一人在不同案場可能有不同的 stage/owner
--   6. customer_identities：多重身份（電話/LINE/email）獨立於 persons，供去重與未來多管道識別
--   7. reservations：hstd 既有「預約賞屋」功能，jltx 目前沒有，但先預留同一張表，
--      避免未來 hstd 併入同一套 schema 時要臨時補表
--   8. Sales Pipeline 標準化 stage（NEW→...→CLOSED，side exits DORMANT/LOST/REFUND）
--      放在 customer_project_profiles，取代原本零散的 deal_status 快照
-- =====================================================================

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ---------------------------------------------------------------------
-- 1. organizations / projects / users
-- ---------------------------------------------------------------------

create table organizations (
    id          uuid primary key default gen_random_uuid(),
    name        text not null,
    created_at  timestamptz not null default now()
);

create table projects (
    id              uuid primary key default gen_random_uuid(),
    organization_id uuid not null references organizations(id),
    name            text not null,               -- 對應舊 Project_List.project_name，如「吉隆天曜」
    code            text,                         -- 對應舊 project_code，如「JLTX」
    status          text not null default 'active',
    manager_user_id uuid,                         -- FK 補在 users 建表後
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now(),
    unique (organization_id, name)
);

create table users (
    id              uuid primary key default gen_random_uuid(),
    line_user_id    text not null unique,         -- 對應 User_Role_Table.line_user_id
    display_name    text,
    role            text not null default 'sales' check (role in ('sales','manager','admin')),
    status          text not null default 'pending' check (status in ('pending','active','inactive')),
    job_title       text,
    last_login_at   timestamptz,
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

alter table projects
    add constraint projects_manager_user_id_fkey
    foreign key (manager_user_id) references users(id);

-- 一人可存取多案場（取代舊表單一 project_name 欄位的限制）
create table user_project_access (
    user_id     uuid not null references users(id),
    project_id  uuid not null references projects(id),
    created_at  timestamptz not null default now(),
    primary key (user_id, project_id)
);

-- ---------------------------------------------------------------------
-- 2. persons / visits  ← Customer_Data 拆分後的核心
-- ---------------------------------------------------------------------

create table persons (
    id              uuid primary key default gen_random_uuid(),
    name            text not null,                -- 目前姓名（取最新一次來訪值）
    phone           text,                          -- 正規化後手機號碼（TEXT_FORCE_FIELDS 慣例，保留開頭 0）
    district        text,                          -- 最新居住行政區
    first_source    text,                          -- 首次來訪的來源管道
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index persons_phone_idx on persons (phone);

create table visits (
    id                      uuid primary key default gen_random_uuid(),
    legacy_customer_id      text,                  -- 對應舊 Customer_Data.customer_id，供追溯
    person_id               uuid not null references persons(id),
    project_id              uuid not null references projects(id),
    visit_type              text not null check (visit_type in ('初訪','回籠')),
    visited_at              date not null,
    customer_name_at_visit  text,
    phone_at_visit          text,
    age_range               text,
    gender                  text,                  -- jltx 專屬（hstd 資料留空）
    marital_status          text,                  -- jltx 專屬
    district_at_visit       text,
    occupation_industry     text,
    purchase_motive         text,
    source                  text,
    room_types              text[],
    budget                  text,                  -- 舊欄位相容，jltx 表單已不收集；歷史資料常是「800-1000萬」這種區間文字，故用 text 不用 numeric
    objections              text[],
    deal_status_snapshot    text,
    status_note             text,
    note                    text,
    visit_time_slot         text,                  -- jltx 專屬
    sqft_requirement        text,                  -- jltx 專屬
    room_requirement_note   text,                  -- jltx 專屬
    referrer_name           text,                  -- jltx 專屬，source=親友介紹 時使用
    sales_user_id           uuid references users(id),
    created_by_user_id      uuid references users(id),
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);

create index visits_person_id_idx on visits (person_id);
create index visits_project_id_idx on visits (project_id);
create index visits_visited_at_idx on visits (visited_at);

-- ---------------------------------------------------------------------
-- 2.5 customer_identities / customer_project_profiles
--     多重身份表 + 客戶對案場的關係層（人與案場關係分開，而非全部塞在 persons）
-- ---------------------------------------------------------------------

create table customer_identities (
    id          uuid primary key default gen_random_uuid(),
    person_id   uuid not null references persons(id),
    type        text not null check (type in ('phone','line','email')),
    value       text not null,                     -- phone 存正規化後的值
    verified    boolean not null default false,
    created_at  timestamptz not null default now(),
    unique (type, value)                            -- 同一支手機/LINE ID 不會綁兩個人，去重靠這裡
);

create index customer_identities_person_id_idx on customer_identities (person_id);

create table customer_project_profiles (
    id                  uuid primary key default gen_random_uuid(),
    person_id           uuid not null references persons(id),
    project_id          uuid not null references projects(id),
    stage               text not null default 'NEW' check (stage in (
                             'NEW','CONTACTED','VISITED','INTERESTED','REVISIT',
                             'NEGOTIATION','RESERVED','PENDING_CONTRACT','SIGNED',
                             'CLOSED','DORMANT','LOST','REFUND'
                         )),
    assigned_sales_id   uuid references users(id),  -- 對應舊 Customer_Data.sales_line_user_id
    lead_source         text,                        -- 對應舊 Customer_Data.source（案場關係層，非單次來訪）
    lead_score          int,                         -- V2.3 Lead Score Rule Engine 寫入
    temperature         text check (temperature in ('HOT','WARM','NURTURE')),
    last_activity_at    timestamptz,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now(),
    unique (person_id, project_id)                  -- 一人在同一案場只有一筆關係記錄
);

create index customer_project_profiles_project_stage_idx on customer_project_profiles (project_id, stage);

-- ---------------------------------------------------------------------
-- 3. units / person_unit_interests  ← 新增，舊系統無結構化戶別主檔
-- ---------------------------------------------------------------------

-- 實際戶數共 105 戶（非單純 building×type×floor 全組合），例外規則：
--   A 棟 1 樓：只有 5、6 型（無 1/2/3 型）
--   B 棟 1 樓：非住宅戶型，是店面「B1」，不屬於 1/2/3/5 型體系
create table units (
    id              uuid primary key default gen_random_uuid(),
    project_id      uuid not null references projects(id),
    building        text not null check (building in ('A','B')),
    floor           int not null,                      -- A: 1-15 / B: 1-9
    unit_type       int,                               -- A: 1,2,3,5,6（1樓只有5,6）/ B: 1,2,3,5（無6型）；店面為 null
    unit_category   text not null default 'residential' check (unit_category in ('residential','store')),
    unit_label      text,                               -- 非標準戶型的顯示名稱，如店面「B1」
    status          text not null default 'available' check (status in ('available','reserved','sold')),
    created_at      timestamptz not null default now()
);

create unique index units_unique_idx on units (
    project_id, building, floor, coalesce(unit_type, -1), coalesce(unit_label, '')
);

create table person_unit_interests (
    id              uuid primary key default gen_random_uuid(),
    person_id       uuid not null references persons(id),
    unit_id         uuid references units(id),     -- 可為 null：歷史自由文字無法可靠解析時
    visit_id        uuid references visits(id),    -- 是哪次來訪介紹的
    raw_text        text,                          -- 保留原始自由文字（如「A3型」）供人工核對
    interest_level  text,
    created_at      timestamptz not null default now()
);

create index person_unit_interests_person_id_idx on person_unit_interests (person_id);

-- ---------------------------------------------------------------------
-- 4. contacts / followups  ← Contact_Log 拆分
-- ---------------------------------------------------------------------

create table contacts (
    id                  uuid primary key default gen_random_uuid(),
    legacy_contact_id   text,
    person_id           uuid not null references persons(id),  -- 對人，不對某次來訪
    project_id          uuid not null references projects(id),
    contacted_at        timestamptz not null,
    method              text not null,             -- 對應 contact_method
    note                text,
    created_by_user_id  uuid references users(id),
    created_at          timestamptz not null default now()
);

create index contacts_person_id_idx on contacts (person_id);

create table followups (
    id              uuid primary key default gen_random_uuid(),
    person_id       uuid not null references persons(id),
    project_id      uuid not null references projects(id),
    due_at          date not null,
    plan_note       text,                          -- 對應舊 Customer_Data.revisit_plan / Contact_Log.next_followup_date
    status          text not null default 'pending' check (status in ('pending','done','skipped')),
    source_contact_id uuid references contacts(id),
    created_at      timestamptz not null default now(),
    updated_at      timestamptz not null default now()
);

create index followups_due_at_idx on followups (due_at) where status = 'pending';

-- ---------------------------------------------------------------------
-- 4.5 reservations  ← hstd 既有「預約賞屋」，jltx 目前沒有，先預留同一張表
-- ---------------------------------------------------------------------

create table reservations (
    id                      uuid primary key default gen_random_uuid(),
    legacy_reservation_id   text,
    person_id               uuid not null references persons(id),
    project_id              uuid not null references projects(id),
    scheduled_date          date not null,
    scheduled_time          text,
    source                  text,
    note                    text,
    status                  text not null default '預約' check (status in ('預約','已到訪','取消','爽約')),
    converted_visit_id      uuid references visits(id),  -- 對應 hstd markReservationConverted 邏輯
    sales_user_id           uuid references users(id),
    created_by_user_id      uuid references users(id),
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);

create index reservations_person_id_idx on reservations (person_id);
create index reservations_scheduled_date_idx on reservations (scheduled_date);

-- ---------------------------------------------------------------------
-- 5. deals  ← Deal_Detail
-- ---------------------------------------------------------------------

create table deals (
    id                  uuid primary key default gen_random_uuid(),
    legacy_deal_id      text,
    person_id           uuid not null references persons(id),
    project_id          uuid not null references projects(id),
    unit_id             uuid references units(id),
    house_base_price    numeric,
    parking_base_price  numeric,
    premium             numeric,
    deal_price          numeric,
    deposit_amount      numeric,
    contract_status     text check (contract_status in ('待簽約','已簽約')),
    expected_sign_date  date,
    signed_date         date,
    sales_user_id       uuid references users(id),
    created_by_user_id  uuid references users(id),
    status              text not null default 'active' check (status in ('active','退戶')),
    refund_reason       text,
    refund_date         date,
    created_at          timestamptz not null default now(),
    updated_at          timestamptz not null default now()
);

create index deals_person_id_idx on deals (person_id);

-- ---------------------------------------------------------------------
-- 6. activities  ← 統一時間軸，本階段只建表不寫資料，為 V2.3 AI 預留
-- ---------------------------------------------------------------------

create table activities (
    id              uuid primary key default gen_random_uuid(),
    person_id       uuid not null references persons(id),
    project_id      uuid not null references projects(id),
    activity_type   text not null check (activity_type in ('visit','contact','deal','message','reservation')),
    ref_table       text not null,                 -- 'visits' / 'contacts' / 'deals' / ...
    ref_id          uuid not null,
    occurred_at     timestamptz not null,
    summary_text    text,                          -- 供 AI 摘要寫入
    created_at      timestamptz not null default now()
);

create index activities_person_id_idx on activities (person_id, occurred_at desc);

-- ---------------------------------------------------------------------
-- 7. 低優先／非客戶核心資料表（可延後搬遷，先建表對齊 schema）
-- ---------------------------------------------------------------------

create table tasks (
    id                      uuid primary key default gen_random_uuid(),
    legacy_task_id          text,
    project_id              uuid not null references projects(id),
    type                    text not null default 'sales_task',
    title                   text not null,
    description             text,
    priority                text not null default 'normal',
    status                  text not null default 'pending' check (status in ('pending','processing','done')),
    assigned_to_user_id     uuid references users(id),
    created_by_user_id      uuid references users(id),
    due_date                date,
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now()
);

create table daily_reports (
    id                  uuid primary key default gen_random_uuid(),
    legacy_report_id    text,
    report_date         date not null,
    project_id          uuid not null references projects(id),
    sales_user_id       uuid references users(id),
    visitor_count       int,
    first_visit_count   int,
    revisit_count       int,
    call_count          int,
    deal_count          int,
    transaction_units   text,
    viewed_units         text,
    notes               text,
    created_by_user_id  uuid references users(id),
    created_at          timestamptz not null default now(),
    unique (report_date, sales_user_id)
);

create table maintenance_reports (
    id                      uuid primary key default gen_random_uuid(),
    legacy_maintenance_id   text,
    project_id              uuid not null references projects(id),
    location                text,
    issue_type              text not null,
    description             text not null,
    priority                text not null default 'normal',
    photo_url               text,                  -- 沿用 Google Drive 連結，不搬圖片本體
    reported_by_user_id     uuid references users(id),
    assigned_to             text,
    status                  text not null default 'pending' check (status in ('pending','processing','done')),
    created_at              timestamptz not null default now(),
    updated_at              timestamptz not null default now(),
    completed_at            timestamptz
);

create table leave_schedule (
    id                  uuid primary key default gen_random_uuid(),
    legacy_leave_id     text,
    user_id             uuid not null references users(id),
    project_id          uuid not null references projects(id),
    leave_date          date not null,
    created_by_user_id  uuid references users(id),
    created_at          timestamptz not null default now()
);

create table calendar_notes (
    id                  uuid primary key default gen_random_uuid(),
    legacy_note_id      text,
    project_id          uuid not null references projects(id),
    note_date           date not null,
    content             text,
    created_by_user_id  uuid references users(id),
    created_at          timestamptz not null default now()
);

-- 通用稽核紀錄，取代 Audit_Log + Customer_Change_Log
-- 注意：不搬 Audit_Log.display_name 原值（舊系統該欄位有 bug，實際存的是 line_user_id）
create table audit_log (
    id              uuid primary key default gen_random_uuid(),
    user_id         uuid references users(id),
    action          text not null,                 -- CREATE/UPDATE/DELETE/LOGIN/LOGIN_FAIL
    target_table    text not null,
    target_id       text not null,
    detail          jsonb,                         -- Customer_Change_Log.changes_json 原樣併入
    created_at      timestamptz not null default now()
);

create index audit_log_target_idx on audit_log (target_table, target_id);

-- =====================================================================
-- Seed data（本階段僅 seed jltx 一個案場 + 依 picker 規則的 units）
-- =====================================================================

insert into organizations (name) values ('龍登國際') returning id;

insert into projects (organization_id, name, code)
select id, '吉隆天曜', 'JLTX' from organizations where name = '龍登國際'
returning id;

-- units seed，實際共 105 戶：
-- A 棟 2-15 樓：戶型 1,2,3,5,6
insert into units (project_id, building, floor, unit_type, unit_category)
select p.id, 'A', f, t, 'residential'
from projects p, unnest(array[1,2,3,5,6]) as t, generate_series(2,15) as f
where p.name = '吉隆天曜';

-- A 棟 1 樓例外：只有 5、6 型
insert into units (project_id, building, floor, unit_type, unit_category)
select p.id, 'A', 1, t, 'residential'
from projects p, unnest(array[5,6]) as t
where p.name = '吉隆天曜';

-- B 棟 2-9 樓：戶型 1,2,3,5（無 6 型）
insert into units (project_id, building, floor, unit_type, unit_category)
select p.id, 'B', f, t, 'residential'
from projects p, unnest(array[1,2,3,5]) as t, generate_series(2,9) as f
where p.name = '吉隆天曜';

-- B 棟 1 樓例外：非住宅戶型，是店面「B1」
insert into units (project_id, building, floor, unit_type, unit_category, unit_label)
select p.id, 'B', 1, null, 'store', 'B1'
from projects p
where p.name = '吉隆天曜';

-- 驗證：應該剛好 105 戶
-- select count(*) from units u join projects p on p.id = u.project_id where p.name = '吉隆天曜';

-- customer_project_profiles 不需手動 seed，資料搬遷腳本在建立每個 person 時，
-- 依其 visits.project_id 自動為每個「人 × 案場」組合建一筆，stage 依最新 visit/deal 狀態推算。
