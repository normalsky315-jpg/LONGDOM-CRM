# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

龍登 CRM (Long Dorn CRM) is a mobile-first customer relationship management system for a Taiwanese real estate advertising company. It is a **single-file vanilla JS/HTML/CSS application** deployed on GitHub Pages, with Google Apps Script (GAS) as the backend API and LINE LIFF for user identity.

There is no build system, no package manager, no test framework, and no linting pipeline. The entire codebase lives in `index.html`.

## Development Workflow

Since this is a static single-file app, development requires only a browser. To preview locally:

```bash
# Open the file directly in a browser
open index.html
# or serve it locally to avoid file:// restrictions with LIFF
python3 -m http.server 8080
```

To deploy, commit and push `index.html` to the `main` branch — GitHub Pages serves it automatically.

## Architecture

### Single-file SPA Pattern

All CSS (`:root` variables → component styles), HTML (screen divs), and JavaScript are inline in `index.html`. The app has two layers of screens:

1. **Pre-auth screens**: `#loadingScreen`, `#loginScreen`, `#pendingScreen` — toggled by `showScreen(id)`.
2. **App views inside `#appScreen`**: `#viewHome`, `#viewCustomer`, `#viewTask`, `#viewReport`, `#viewMaint`, `#viewUsers` — toggled by `route(hash)` using hash-based routing (`#/home`, `#/customer`, etc.).

### State Management

A single global `state` object holds all runtime state (user, projects list, cached sales-by-project, tab selections, etc.). Session persistence uses `localStorage` under `STORAGE_KEY` with a 30-day TTL.

### Backend Communication

The GAS backend is called exclusively via two functions:

- `gasGet(action, params, onSuccess, onFail)` — sends a `fetch()` GET to `GAS_URL?action=<action>&key=val...`
- `gasPost(action, payload, onSuccess, onFail)` — also sends a GET (not POST) with `payload=<JSON-encoded>` to bypass CORS limitations

All responses follow `{ ok: boolean, data: any, error?: string }`.

### Key Configuration Constants (top of `<script>`)

```js
var GAS_URL     = '...';   // Google Apps Script /exec deployment URL
var LIFF_ID     = '...';   // LINE LIFF app ID
var TTL_DAYS    = 30;      // session TTL
var STORAGE_KEY = 'long_dorn_crm_v82';  // localStorage key
```

These are the only values that need to change when deploying to a new environment.

### Authentication Flow

1. `initApp()` → `liff.init()` to get LINE profile; falls back gracefully for non-LINE browsers.
2. If `localStorage` has a valid session, calls `checkAutoLogin` on GAS; otherwise shows `#loginScreen`.
3. `doLogin()` calls `verifyAccess` on GAS with LINE userId + password. Returns `status: 'pending' | 'active'`.
4. On success, `onLoginSuccess(user)` stores user data in `state.user` and calls `loadGlobalData()` then `route('#/home')`.

### Role-Based Access Control

Three roles: `sales`, `manager`, `admin`. Enforced both in the router (redirects `sales` away from `/report` and `/users`) and in rendered UI (manager/admin actions on maintenance, user management tabs).

### GAS API Actions Reference

| Action | HTTP | Description |
|---|---|---|
| `getProjectList` | GET | List all project names |
| `getIndustryList` | GET | Customer occupation options |
| `getPurchaseMotiveList` | GET | Purchase motive options |
| `getSalesByProject` | GET | Sales staff for a project |
| `checkAutoLogin` | GET | Validate stored session |
| `getCustomerList` | GET | Customer records for current user |
| `getTasks` | GET | Tasks filtered by status |
| `getDailyReportSummary` | GET | Today's report summary |
| `getMaintenanceList` | GET | Maintenance tickets |
| `getUserList` | GET | All users (manager/admin) |
| `verifyAccess` | POST→GET | Login/register |
| `appendCustomerData` | POST→GET | Submit customer record |
| `appendTask` | POST→GET | Create task |
| `updateTaskStatus` | POST→GET | Mark task done |
| `appendDailyReport` | POST→GET | Submit daily sales report |
| `appendMaintenance` | POST→GET | Submit maintenance ticket |
| `updateMaintenanceStatus` | POST→GET | Update ticket status |
| `approveUser` | POST→GET | Approve pending user |
| `rejectUser` | POST→GET | Reject pending user |
| `updateUserRole` | POST→GET | Change role/project/status |

### CSS Design Tokens

All colors and spacing derive from CSS custom properties on `:root`. The palette uses `--cream`, `--ink`, `--gold`, `--rust`, `--teal` as semantic tokens — prefer these over hardcoded values.
