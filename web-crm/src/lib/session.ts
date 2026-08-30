export interface SessionUser {
  line_user_id?: string;
  display_name: string;
  role: string;
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
