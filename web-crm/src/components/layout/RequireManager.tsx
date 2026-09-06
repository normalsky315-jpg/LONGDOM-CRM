import { Card } from '../ui/Card';
import { canManage, loadSession } from '../../lib/session';

// 對應後端會直接擋 role==='sales' 的功能（appendDailyReport／
// getUserList／updateUserRole）。這裡只是提前告知、避免使用者填完
// 表單送出才在 toast 裡看到「無權限」——真正的權限判斷仍在後端，
// 這層只是體驗上的提早攔截，不是安全邊界。
export function RequireManager({ children }: { children: React.ReactElement }) {
  const user = loadSession();
  if (canManage(user)) return children;
  return (
    <Card className="p-8 text-center" style={{ color: 'var(--muted-foreground)' }}>
      此功能僅開放主管以上權限使用
    </Card>
  );
}
