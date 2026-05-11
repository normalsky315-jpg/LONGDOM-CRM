# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**龍登 CRM v8.2** — A mobile-first customer relationship management SPA for 龍登國際廣告 (Long Dorn Advertising), deployed on GitHub Pages. The app is used by on-site sales staff at real estate show sites (案場) in Kaohsiung, Taiwan.

The UI language is Traditional Chinese (zh-TW). All user-facing labels, status values, and form field options are in Chinese.

## Architecture

The entire application is a single file: `index.html`. It contains all HTML structure, CSS, and JavaScript with no build step, no dependencies, and no package manager. Open it directly in a browser or serve it via GitHub Pages.

**Two-tier system:**
- **Frontend:** `index.html` — vanilla JS SPA served as a static file
- **Backend:** Google Apps Script (GAS) web app at `GAS_URL` — manages data persistence in Google Sheets. This backend is *external to this repository*.

All API calls go through two thin wrappers:
- `gasGet(action, params, onSuccess, onFail)` — HTTP GET to GAS
- `gasPost(action, payload, onSuccess, onFail)` — also uses HTTP GET (CORS workaround): the payload is JSON-encoded and passed as the `payload` query parameter

**No `fetch` POST is ever used** because GAS does not support CORS preflight for cross-origin POST requests.

## Constants to Know

```js
var GAS_URL     = '...';           // GAS /exec deploy URL — change when redeploying backend
var LIFF_ID     = '...';           // LINE LIFF app ID
var STORAGE_KEY = 'long_dorn_crm_v82';  // localStorage key — bump version if session schema changes
var TTL_DAYS    = 30;              // session lifetime
```

## App State

A single global `state` object holds all runtime data:

```js
state = {
  liffProfile,        // from liff.getProfile()
  user,               // { lineUserId, displayName, role, projectName, status }
  projects,           // string[]
  industries,         // string[]
  motives,            // string[]
  salesByProject,     // { [projectName]: [{lineUserId, name}] } — cached
  taskTab,            // 'pending' | 'done'
  maintTab,           // 'pending' | 'processing' | 'done'
  userTab,            // 'pending' | 'active' | 'inactive'
  allUsers            // User[] — fetched once per visit to /users
}
```

## Screens and Routing

The app has two layers of "screens" (full-page switches):

| Screen | ID | When shown |
|---|---|---|
| Loading | `#loadingScreen` | LIFF init |
| Login | `#loginScreen` | no valid session |
| Pending | `#pendingScreen` | user status = `pending` |
| App | `#appScreen` | authenticated |

Inside `#appScreen`, hash-based routing drives view visibility:

| Route | View | Role restriction |
|---|---|---|
| `#/home` | `#viewHome` | all |
| `#/customer` | `#viewCustomer` | all |
| `#/task` | `#viewTask` | all |
| `#/maint` | `#viewMaint` | all |
| `#/report` | `#viewReport` | manager, admin only |
| `#/users` | `#viewUsers` | manager, admin only |

Navigation: `route(hash)` hides all `.view` elements then unhides the target and calls its `render*()` function. A `hashchange` listener keeps browser history in sync.

## Authentication Flow

1. `liff.init()` → get LINE profile (silently skips if not in LINE browser)
2. Check `localStorage` for a saved `lineUserId` session
3. If found, call `checkAutoLogin` on GAS to re-verify
4. Otherwise show login screen → `verifyAccess` on GAS with password + LINE userId + selected project

**Session** is a JSON blob in localStorage (`{ lineUserId, expiresAt }`), keyed by `STORAGE_KEY`.

## Role System

Three roles control what features and routes are visible:

- `sales` — basic access (customer entry, tasks, maintenance reporting)
- `manager` — adds daily report submission + user management
- `admin` — adds cross-project visibility and can assign admin role to others

Role-gating happens in both `route()` (redirect if unauthorized) and `renderHome()` (show/hide feature cards).

## GAS API Endpoints

All actions are passed as `?action=<name>` query strings. Read operations use `gasGet`; write operations use `gasPost` (which is still a GET under the hood).

| Action | Direction | Purpose |
|---|---|---|
| `getProjectList` | GET | list all 案場 names |
| `getIndustryList` | GET | occupation dropdown options |
| `getPurchaseMotiveList` | GET | motive dropdown options |
| `getSalesByProject` | GET | staff list for a project |
| `checkAutoLogin` | GET | validate saved session |
| `verifyAccess` | POST | password login + registration |
| `getCustomerList` | GET | customer records for home stats |
| `appendCustomerData` | POST | create customer record |
| `getTasks` | GET | task list by status |
| `appendTask` | POST | create task |
| `updateTaskStatus` | POST | mark task done |
| `getDailyReportSummary` | GET | today's summary stats |
| `appendDailyReport` | POST | submit a daily report |
| `getMaintenanceList` | GET | maintenance tickets |
| `appendMaintenance` | POST | create maintenance ticket |
| `updateMaintenanceStatus` | POST | change ticket status |
| `getUserList` | GET | all users (manager/admin) |
| `approveUser` | POST | approve pending user |
| `rejectUser` | POST | reject pending user |
| `updateUserRole` | POST | change role, project, or active status |

GAS always returns `{ ok: true, data: ... }` or `{ ok: false, error: "..." }`.

## CSS Conventions

Colors are defined as CSS custom properties in `:root`:

```css
--cream, --ink, --ink-light, --ink-faint   /* neutral palette */
--gold, --gold-soft                         /* primary accent */
--rust, --rust-soft                         /* danger / deals */
--teal, --teal-soft                         /* success / active */
--border, --border-strong                   /* dividers */
```

Status pills use CSS classes: `.status-pending`, `.status-processing`, `.status-done`, `.status-active`, `.status-inactive`.

Priority pills: `.priority-urgent`, `.priority-high`, `.priority-normal`, `.priority-low`.

Mobile safe-area insets (`env(safe-area-inset-top/bottom)`) are used on all headers and fixed elements for iOS notch/home-bar support.

## Development Notes

- **No build step.** Edit `index.html` and refresh the browser.
- **Backend changes** require modifying and redeploying the GAS project (separate repo/script), then updating `GAS_URL` if the deployment URL changes.
- **LIFF** only works inside the LINE app or LINE browser. In a regular browser, `liff.init()` fails gracefully and sets `liffProfile = { userId: '', displayName: '' }`, which means backend operations that require a real LINE userId will fail or create anonymous records.
- **`escapeHtml()`** must be used whenever user-supplied strings are inserted into `innerHTML`. All `render*()` functions already do this; maintain this pattern for any new HTML generation.
