import liff from '@line/liff';

// LIFF_ID 對照 jltx.html 目前使用的同一個 LIFF App（見 jltx.html 的
// `var LIFF_ID = '2009971664-r6Xh3Gfi'`）。這個 ID 綁定特定案場的
// LINE 官方帳號，換案場部署時要用 VITE_LIFF_ID 覆寫成該案場自己的
// LIFF App ID，不能整批沿用吉隆天曜這組。
const LIFF_ID = import.meta.env.VITE_LIFF_ID || '2009971664-r6Xh3Gfi';

export interface LiffProfile {
  userId: string;
  displayName: string;
}

let initPromise: Promise<LiffProfile | null> | null = null;

// 對照 jltx.html 的 initApp()：liff.init 逾時或失敗時不擋住整個 app，
// 讓呼叫端自己決定要不要繼續用示範模式；liff.isLoggedIn() 為 false
// 時呼叫 liff.login() 會整頁導去 LINE 登入，導回來後 liff.init 會
// 直接判定為已登入，不需要額外處理返回值
export function initLiff(): Promise<LiffProfile | null> {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      await Promise.race([
        liff.init({ liffId: LIFF_ID }),
        new Promise((_, reject) => setTimeout(() => reject(new Error('LIFF init timeout')), 6000)),
      ]);
      if (!liff.isLoggedIn()) {
        liff.login();
        // liff.login() 會整頁導轉，這裡回傳前 return 不會真的被用到
        return null;
      }
      const profile = await liff.getProfile();
      return { userId: profile.userId, displayName: profile.displayName };
    } catch (err) {
      console.warn('LIFF init failed:', err);
      return null;
    }
  })();
  return initPromise;
}

export function liffLogout() {
  try {
    if (liff.isLoggedIn()) liff.logout();
  } catch {
    /* noop */
  }
}
