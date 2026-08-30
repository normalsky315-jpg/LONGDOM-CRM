import { checkAutoLogin, GAS_URL } from './gasClient';

// role 對照後端 CONFIG.ROLES 的實際列舉值（sales/manager/admin），不是
// UI 顯示用的職稱字串。後端很多寫入類 action（appendDailyReport／
// updateSalesControlUnit／saveDealDetail／updateUserRole 等）會擋
// role==='sales'，前端沒有照這個列舉做權限判斷的話，業務登入後會看到
// 一堆點了才發現「無權限」的按鈕。
export type Role = 'sales' | 'manager' | 'admin';

export interface SessionUser {
  line_user_id?: string;
  display_name: string;
  role: Role;
  project_name: string;
}

// 對照 jltx.html 的 saveSession()／loadSession()：真正的系統故意只
// 長期保存 line_user_id，不快取 role/display_name，每次重新打開都
// 用 checkAutoLogin 向後端重新要一次即時角色——這是他們自己修過的
// 一個 bug（見 jltx.html 註解「★ 修正：只存 lineUserId，不存
// userData/role，避免角色變更後前端還在用舊快取」）。這裡的
// SessionUser 除了 line_user_id 以外的欄位只當作「當次 SPA 執行期間
// 的顯示快取」，不是長期真相來源；refreshSession() 才是每次重新整理
// 頁面時真正對過一次後端的結果。
const KEY = 'crm_session_v1';
const LINE_USER_ID_KEY = 'crm_line_user_id_v1';
const TTL_DAYS = 7;

interface StoredLineId { lineUserId: string; expiresAt: number }

export function loadSession(): SessionUser | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(user: SessionUser) {
  localStorage.setItem(KEY, JSON.stringify(user));
  if (user.line_user_id) {
    localStorage.setItem(
      LINE_USER_ID_KEY,
      JSON.stringify({ lineUserId: user.line_user_id, expiresAt: Date.now() + TTL_DAYS * 86400000 } as StoredLineId)
    );
  }
}

export function clearSession() {
  localStorage.removeItem(KEY);
  localStorage.removeItem(LINE_USER_ID_KEY);
}

export function loadStoredLineUserId(): string | null {
  try {
    const raw = localStorage.getItem(LINE_USER_ID_KEY);
    if (!raw) return null;
    const d: StoredLineId = JSON.parse(raw);
    if (Date.now() > d.expiresAt) {
      clearSession();
      return null;
    }
    return d.lineUserId;
  } catch {
    return null;
  }
}

// 對應 jltx.html 的 checkAutoLogin 流程：有存 lineUserId 就每次重開
// app 都重新問一次後端目前的真實角色/狀態，不是直接信任本地快取
export async function refreshSession(): Promise<SessionUser | null> {
  if (!GAS_URL) return loadSession();
  const lineUserId = loadStoredLineUserId();
  if (!lineUserId) return null;
  try {
    const res: any = await checkAutoLogin({ lineUserId });
    if (!res?.ok || res.data?.status !== 'active') {
      clearSession();
      return null;
    }
    const user: SessionUser = {
      line_user_id: lineUserId,
      display_name: res.data.displayName,
      role: res.data.role || 'sales',
      project_name: res.data.projectName || '',
    };
    saveSession(user);
    return user;
  } catch {
    // 網路問題不代表登入真的失效（同 jltx.html 的處理方式），保留
    // 目前快取讓使用者至少能繼續操作，而不是一時斷線就被踢回登入頁
    return loadSession();
  }
}

export function canManage(user: SessionUser | null): boolean {
  return user?.role === 'manager' || user?.role === 'admin';
}
