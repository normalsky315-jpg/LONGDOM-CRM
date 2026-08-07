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
    budget                  numeric,               -- 舊欄位相容，jltx 表單已不收集
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
-- 3. units / person_unit_interests  ← 新增，舊系統無結構化戶別主檔
-- ---------------------------------------------------------------------

create table units (
    id          uuid primary key default gen_random_uuid(),
    project_id  uuid not null references projects(id),
    building    text not null check (building in ('A','B')),
    unit_type   int not null,                      -- A: 1,2,3,5,6 / B: 1,2,3,5（無6型）
    floor       int not null,                      -- A: 1-15 / B: 1-9
    status      text not null default 'available' check (status in ('available','reserved','sold')),
    created_at  timestamptz not null default now(),
    unique (project_id, building, unit_type, floor)
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
    activity_type   text not null check (activity_type in ('visit','contact','deal','message')),
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
-- insert into projects (organization_id, name, code) values ('<上面回傳的 id>', '吉隆天曜', 'JLTX');

-- units seed（需在 projects 建好 jltx 那筆後，用其 project_id 執行）：
-- A 棟：戶型 1,2,3,5,6 × 樓層 1-15
-- insert into units (project_id, building, unit_type, floor)
-- select '<jltx project_id>', 'A', t, f
-- from unnest(array[1,2,3,5,6]) as t, generate_series(1,15) as f;
--
-- B 棟：戶型 1,2,3,5（無 6 型）× 樓層 1-9
-- insert into units (project_id, building, unit_type, floor)
-- select '<jltx project_id>', 'B', t, f
-- from unnest(array[1,2,3,5]) as t, generate_series(1,9) as f;
