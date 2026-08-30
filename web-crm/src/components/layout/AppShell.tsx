import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home, Users, Grid3x3, ClipboardList, FileBarChart, Map, Settings,
  Bell, Search, LogOut, Building2, Plus,
} from 'lucide-react';
import { SITE_NAME } from '../../lib/siteConfig';
import { canManage, clearSession, loadSession } from '../../lib/session';
import { GlobalSearch } from './GlobalSearch';

const MOCK_ALERTS = [
  { id: 'a1', text: '李先生今日到期・約看夜景戶', to: '/customers/c1' },
  { id: 'a2', text: '陳小姐明日追蹤・貸款方案', to: '/customers/c2' },
  { id: 'a3', text: '王先生2天後・二次回籠邀約', to: '/customers/c3' },
];

// managerOnly 對照後端實際權限：appendDailyReport 擋 role==='sales'
// （「業務無權限提交日報」），getUserList／updateUserRole 也擋 sales
// （「無權限」），所以這兩個入口業務帳號本來就進不去，導覽列先不顯示
// 比讓他們點進去才看到錯誤訊息更合理
const NAV_ITEMS = [
  { to: '/', icon: Home, label: '首頁', end: true },
  { to: '/customers', icon: Users, label: '客戶管理' },
  { to: '/sales-control', icon: Grid3x3, label: '銷控表' },
  { to: '/tasks', icon: ClipboardList, label: '任務管理' },
  { to: '/reports', icon: FileBarChart, label: '銷售日報', managerOnly: true },
  { to: '/analytics', icon: Map, label: '來人分析' },
  { to: '/settings', icon: Settings, label: '系統管理', managerOnly: true },
];

const BOTTOM_ITEMS = [
  { to: '/', icon: Home, label: '首頁', end: true },
  { to: '/customers', icon: Users, label: '客戶' },
  { to: '/customers/new', icon: Plus, label: '' },
  { to: '/sales-control', icon: Grid3x3, label: '銷控' },
  { to: '/tasks', icon: ClipboardList, label: '任務' },
];

export function AppShell() {
  const navigate = useNavigate();
  const user = loadSession();
  const [searchOpen, setSearchOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);

  const onLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
      if (e.key === 'Escape') {
        setSearchOpen(false);
        setAlertsOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--background)' }}>
      <nav
        className="hidden md:flex flex-col w-[230px] flex-shrink-0 p-3.5"
        style={{ background: 'var(--surface)', borderRight: '1px solid var(--border)' }}
      >
        <div className="flex items-center gap-2.5 px-2 mb-7">
          <div className="w-8.5 h-8.5 rounded-[9px] flex items-center justify-center" style={{ background: 'var(--primary)', width: 34, height: 34 }}>
            <Building2 size={17} color="var(--gold)" />
          </div>
          <div>
            <div className="brand-font font-bold text-[15px] leading-tight" style={{ color: 'var(--foreground)' }}>{SITE_NAME}</div>
            <div className="text-[11px]" style={{ color: 'var(--muted-foreground)' }}>{user?.display_name || '訪客'}・{user?.role || '銷售顧問'}</div>
          </div>
        </div>
        <div className="flex flex-col gap-0.5">
          {NAV_ITEMS.filter((item) => !item.managerOnly || canManage(user)).map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2.5 rounded-[10px] text-sm no-underline ${isActive ? 'font-bold' : 'font-medium'}`
              }
              style={({ isActive }) => ({
                background: isActive ? 'var(--lake-soft)' : 'transparent',
                color: isActive ? 'var(--secondary)' : 'var(--muted-foreground)',
              })}
            >
              <item.icon size={18} strokeWidth={1.8} /> {item.label}
            </NavLink>
          ))}
        </div>
      </nav>

      <div className="flex-1 min-w-0">
        <header className="sticky top-0 z-10" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <div className="px-5 py-3.5 flex items-center justify-between gap-3">
            <span className="brand-font font-bold text-base md:hidden" style={{ color: 'var(--foreground)' }}>{SITE_NAME}控台</span>
            <span className="hidden md:block" />
            <div className="flex items-center gap-2.5 relative">
              <button
                onClick={() => setSearchOpen(true)}
                aria-label="搜尋（⌘K）"
                className="p-2 rounded-[10px] cursor-pointer border-none"
                style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
              >
                <Search size={17} />
              </button>
              <button
                onClick={() => setAlertsOpen((v) => !v)}
                aria-label="通知"
                className="relative p-2 rounded-[10px] cursor-pointer border-none"
                style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}
              >
                <Bell size={17} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--danger)' }} />
              </button>
              {alertsOpen && (
                <div
                  className="absolute top-11 right-0 w-72 rounded-xl overflow-hidden z-30"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}
                >
                  <div className="px-3.5 py-2.5 text-xs font-bold" style={{ borderBottom: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                    待處理提醒
                  </div>
                  {MOCK_ALERTS.map((a, i) => (
                    <button
                      key={a.id}
                      onClick={() => {
                        navigate(a.to);
                        setAlertsOpen(false);
                      }}
                      className="w-full text-left px-3.5 py-2.5 text-[13px] bg-transparent border-none cursor-pointer"
                      style={{ borderTop: i ? '1px solid var(--border)' : 'none', color: 'var(--foreground)' }}
                    >
                      {a.text}
                    </button>
                  ))}
                </div>
              )}
              <button
                onClick={onLogout}
                className="flex items-center gap-1.5 text-[13px] font-semibold rounded-lg px-3 py-1.5 border-none cursor-pointer"
                style={{ color: 'var(--secondary)', background: 'var(--lake-soft)' }}
              >
                <LogOut size={15} /> 登出
              </button>
            </div>
          </div>
        </header>

        <main className="max-w-[980px] mx-auto px-5 pt-6 pb-24">
          <Outlet />
        </main>

        <nav
          className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex justify-around items-center px-2.5 py-2"
          style={{ background: 'var(--surface)', borderTop: '1px solid var(--border)', paddingBottom: 'calc(8px + env(safe-area-inset-bottom))' }}
        >
          {BOTTOM_ITEMS.map((item) =>
            item.label === '' ? (
              <NavLink key={item.to} to={item.to} className="flex items-center justify-center rounded-full -mt-4.5 no-underline" style={{ width: 46, height: 46, background: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: 'var(--shadow-md)' }}>
                <item.icon size={20} />
              </NavLink>
            ) : (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className="flex flex-col items-center gap-0.5 no-underline text-[10px] font-semibold px-1"
                style={({ isActive }) => ({ color: isActive ? 'var(--secondary)' : 'var(--muted-foreground)' })}
              >
                <item.icon size={20} strokeWidth={1.8} />
                {item.label}
              </NavLink>
            )
          )}
        </nav>
      </div>

      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      {alertsOpen && <div className="fixed inset-0 z-20" onClick={() => setAlertsOpen(false)} />}
    </div>
  );
}
