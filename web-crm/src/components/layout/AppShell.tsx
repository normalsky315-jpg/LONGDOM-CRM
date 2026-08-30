import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Home, Users, Grid3x3, ClipboardList, FileBarChart, Map, Settings,
  Bell, Search, LogOut, Building2, Plus,
} from 'lucide-react';
import { SITE_NAME } from '../../lib/siteConfig';
import { clearSession, loadSession } from '../../lib/session';

const NAV_ITEMS = [
  { to: '/', icon: Home, label: '首頁', end: true },
  { to: '/customers', icon: Users, label: '客戶管理' },
  { to: '/sales-control', icon: Grid3x3, label: '銷控表' },
  { to: '/tasks', icon: ClipboardList, label: '任務管理' },
  { to: '/reports', icon: FileBarChart, label: '銷售日報' },
  { to: '/analytics', icon: Map, label: '來人分析' },
  { to: '/settings', icon: Settings, label: '系統管理' },
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

  const onLogout = () => {
    clearSession();
    navigate('/login', { replace: true });
  };

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
          {NAV_ITEMS.map((item) => (
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
            <div className="flex items-center gap-2.5">
              <button className="p-2 rounded-[10px] cursor-pointer border-none" style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                <Search size={17} />
              </button>
              <button className="relative p-2 rounded-[10px] cursor-pointer border-none" style={{ background: 'var(--surface-soft)', border: '1px solid var(--border)', color: 'var(--muted-foreground)' }}>
                <Bell size={17} />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full" style={{ background: 'var(--danger)' }} />
              </button>
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
    </div>
  );
}
