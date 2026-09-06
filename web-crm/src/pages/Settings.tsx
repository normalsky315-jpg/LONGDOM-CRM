import { useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Input';
import { getUserList, approveUser, rejectUser, updateUserRole, GAS_URL } from '../lib/gasClient';
import { useToast } from '../components/ui/Toast';

// 欄位對照 User_Role_Table 實際欄位（gas-updates/jltx_v9.30_full.gs 的
// getUserList／updateUserRole）。「待審核」是獨立的 status 欄位
// （pending/active/inactive），不是塞在 role 裡的一個值；
// approveUser／rejectUser／updateUserRole 三支 API 認的目標使用者
// 參數叫 targetUserId，不是 line_user_id——用錯欄位名稱送出去後端
// 會直接回「targetUserId 必填」，之前這裡三個操作全部是壞的。
interface UserRow {
  line_user_id: string;
  display_name: string;
  role: 'sales' | 'manager' | 'admin';
  status: 'pending' | 'active' | 'inactive';
  job_title?: string;
}

const ROLE_LABEL: Record<string, string> = { sales: '業務', manager: '主管', admin: '管理員' };

const MOCK_USERS: UserRow[] = [
  { line_user_id: 'u1', display_name: '林小美', role: 'sales', status: 'pending', job_title: '新進業務' },
  { line_user_id: 'u2', display_name: '陳昭文', role: 'manager', status: 'active' },
  { line_user_id: 'u3', display_name: '王維澤', role: 'sales', status: 'active' },
  { line_user_id: 'u4', display_name: '李甯宸', role: 'sales', status: 'active' },
];

export function Settings() {
  const showToast = useToast();
  const [users, setUsers] = useState<UserRow[] | null>(null);

  const load = async () => {
    if (!GAS_URL) {
      setUsers(MOCK_USERS);
      return;
    }
    try {
      const res = await getUserList();
      setUsers(res?.data || MOCK_USERS);
    } catch {
      setUsers(MOCK_USERS);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const pending = (users || []).filter((u) => u.status === 'pending');
  const active = (users || []).filter((u) => u.status !== 'pending');

  const doApprove = async (u: UserRow) => {
    const prev = users;
    setUsers((p) => (p || []).map((x) => (x.line_user_id === u.line_user_id ? { ...x, status: 'active' } : x)));
    if (!GAS_URL) {
      showToast(`已核准 ${u.display_name}`, 'success');
      return;
    }
    try {
      const res: any = await approveUser({ targetUserId: u.line_user_id });
      if (!res?.ok) {
        setUsers(prev);
        showToast(res?.error || '核准失敗', 'error');
        return;
      }
      showToast(`已核准 ${u.display_name}`, 'success');
    } catch {
      setUsers(prev);
      showToast('連線失敗，請重新整理確認', 'error');
    }
  };

  const doReject = async (u: UserRow) => {
    const prev = users;
    setUsers((p) => (p || []).filter((x) => x.line_user_id !== u.line_user_id));
    if (!GAS_URL) {
      showToast(`已拒絕 ${u.display_name}`, 'info');
      return;
    }
    try {
      const res: any = await rejectUser({ targetUserId: u.line_user_id });
      if (!res?.ok) {
        setUsers(prev);
        showToast(res?.error || '拒絕失敗', 'error');
        return;
      }
      showToast(`已拒絕 ${u.display_name}`, 'info');
    } catch {
      setUsers(prev);
      showToast('連線失敗，請重新整理確認', 'error');
    }
  };

  const onRoleChange = async (u: UserRow, role: string) => {
    const prev = users;
    setUsers((p) => (p || []).map((x) => (x.line_user_id === u.line_user_id ? { ...x, role: role as UserRow['role'] } : x)));
    if (!GAS_URL) {
      showToast(`已將 ${u.display_name} 設為${ROLE_LABEL[role]}`, 'success');
      return;
    }
    try {
      const res: any = await updateUserRole({ targetUserId: u.line_user_id, role });
      if (!res?.ok) {
        setUsers(prev);
        showToast(res?.error || '更新失敗', 'error');
        return;
      }
      showToast(`已將 ${u.display_name} 設為${ROLE_LABEL[role]}`, 'success');
    } catch {
      setUsers(prev);
      showToast('連線失敗，角色已還原', 'error');
    }
  };

  return (
    <div>
      <h2 className="brand-font font-bold text-[22px] m-0 mb-4.5" style={{ color: 'var(--foreground)' }}>系統管理</h2>

      {pending.length > 0 && (
        <div className="mb-6">
          <div className="font-bold text-sm mb-3" style={{ color: 'var(--foreground)' }}>待審核帳號</div>
          <div className="flex flex-col gap-2.5">
            {pending.map((u) => (
              <Card key={u.line_user_id} className="p-4 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>{u.display_name}</div>
                  {u.job_title && <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{u.job_title}</div>}
                </div>
                <button
                  onClick={() => doApprove(u)}
                  className="w-9 h-9 rounded-[10px] border-none cursor-pointer flex items-center justify-center"
                  style={{ background: 'var(--success-soft)', color: 'var(--success)' }}
                  aria-label="核准"
                >
                  <Check size={17} />
                </button>
                <button
                  onClick={() => doReject(u)}
                  className="w-9 h-9 rounded-[10px] border-none cursor-pointer flex items-center justify-center"
                  style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}
                  aria-label="拒絕"
                >
                  <X size={17} />
                </button>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="font-bold text-sm mb-3" style={{ color: 'var(--foreground)' }}>團隊成員</div>
      <Card className="overflow-hidden">
        {active.map((u, i) => (
          <div key={u.line_user_id} className="flex items-center gap-3 px-4.5 py-3.5" style={{ borderTop: i ? '1px solid var(--border)' : 'none' }}>
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>{u.display_name}</span>
              <Badge tone={u.role === 'admin' ? 'gold' : u.role === 'manager' ? 'lake' : 'neutral'}>{ROLE_LABEL[u.role]}</Badge>
              {u.status === 'inactive' && <Badge tone="danger">已停用</Badge>}
            </div>
            <Select value={u.role} onChange={(e) => onRoleChange(u, e.target.value)} className="!w-auto text-xs py-1.5">
              <option value="sales">業務</option>
              <option value="manager">主管</option>
              <option value="admin">管理員</option>
            </Select>
          </div>
        ))}
      </Card>
    </div>
  );
}
