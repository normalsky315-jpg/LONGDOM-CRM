# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LONGDOM-CRM is a mobile-first CRM for LINE-authenticated sales teams in Taiwan, built entirely in vanilla HTML/CSS/JS with no build system. The backend is Google Apps Script (GAS) writing to Google Sheets. There are three standalone HTML files, each a complete independent SPA:

- `index.html` — Main CRM for 龍登國際廣告 (LONGDOM Advertising)
- `hstd.html` — Variant for 華雄天地 (HSXZ real estate project)
- `hsyy.html` — Variant for 華雄音樂匯 (HSYY music/events project)

## Running the App

No build step. Open any HTML file directly in a browser, or serve from a static host. The app requires:
1. A valid LINE LIFF ID (`LIFF_ID` constant at top of each file's `<script>` block)
2. A deployed Google Apps Script URL (`GAS_URL` constant in the same location)

Without real LIFF/GAS credentials, authentication will fail. To test UI-only changes, you can temporarily bypass the `liff.init()` call and seed the `state` object manually.

## Architecture

Each HTML file is self-contained: `<style>` block → HTML markup → single `<script>` block containing all application logic.

### Screen System
Three fullscreen overlay screens transition sequentially:
- `#loadingScreen` → `#loginScreen` → `#appScreen`

Navigation within the app uses hash-based routing (`#/home`, `#/customer`, `#/task`, `#/report`, `#/maintenance`, `#/admin`). The `hashchange` listener calls `renderView(hash)`.

### State Management
A single global `state` object holds all runtime data (user profile, project list, industry options, form selections, active tab). Session is persisted to `localStorage` under key `long_dorn_crm_v82` with a 30-day TTL.

### API Layer
All backend communication goes through two functions:
- `gasGet(action, params, onSuccess, onFail)` — appends params to `GAS_URL` as query string
- `gasPost(action, payload, onSuccess, onFail)` — encodes JSON payload as a URL param to bypass CORS (GAS does not support request bodies from browser `fetch`)

GAS actions are string-named operations (e.g., `'appendCustomerData'`, `'getUserList'`, `'updateTaskStatus'`).

### Role System
Users have one of three roles: `sales`, `manager`, `admin`. Role is stored in `state.user.role` after login and gates UI sections (admin panel, manager reports, etc.).

### Key Patterns
- **Form inputs**: `getRadio(name)` and `getChecks(name)` helpers read grouped radio/checkbox inputs by name attribute
- **XSS protection**: `escapeHtml(str)` must be used when inserting user-supplied strings into `innerHTML`
- **CSS variables**: Theme colors are `--cream`, `--ink`, `--gold`, `--rust`, `--teal` — use these, not hardcoded hex values
- **Modal system**: Bottom-sheet modals (e.g., `#taskModal`) are shown/hidden by toggling a CSS class; always reset form state on open
- **Chip UI**: Quick-select options rendered as tappable chips; selection state toggled via class and synced to `state`

## Conventions

- All three HTML files share the same architecture and patterns — changes to shared features typically need to be replicated across all three files
- ES5-style `var` declarations and `function` declarations throughout; do not introduce `const`/`let`/arrow functions unless modernizing deliberately
- No external JS libraries except the LINE LIFF SDK loaded from CDN
- Mobile-first: use `env(safe-area-inset-*)` for bottom padding on notched devices
- Version string (e.g., `CRM v8.2`) appears in the UI header — update when making significant changes
