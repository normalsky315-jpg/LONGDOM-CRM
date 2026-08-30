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

const KEY = 'crm_session_v1';

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
}

export function clearSession() {
  localStorage.removeItem(KEY);
}

export function canManage(user: SessionUser | null): boolean {
  return user?.role === 'manager' || user?.role === 'admin';
}
