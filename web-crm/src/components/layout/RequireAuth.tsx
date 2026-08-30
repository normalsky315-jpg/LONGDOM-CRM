import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { refreshSession, type SessionUser } from '../../lib/session';

// 對照 jltx.html 的 proceedAfterProfile()：每次重新開啟 app 都要向
// 後端重新驗證一次目前的真實角色/狀態，不是單純信任 localStorage
// 裡快取的值——避免主管改了某人的角色，那個人的畫面卻因為本地快取
// 還沒過期而繼續看到舊權限。
export function RequireAuth({ children }: { children: React.ReactElement }) {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    refreshSession().then((u) => {
      if (!cancelled) {
        setUser(u);
        setReady(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!ready) return null;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}
