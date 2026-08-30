import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { SITE_NAME, SITE_TAGLINE } from '../lib/siteConfig';
import { verifyAccess, GAS_URL } from '../lib/gasClient';
import { saveSession } from '../lib/session';

export function Login() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (!GAS_URL) {
        // 未設定 VITE_GAS_URL 時走示範模式，不打真實後端。role 預設給
        // manager 是為了讓示範時看得到全部功能；實際串接後端時
        // verifyAccess 回傳的 role 才是後端 CONFIG.ROLES 認的真正權限，
        // sales 角色會被後端擋掉銷控表狀態異動/日報提交/系統管理等操作
        saveSession({ display_name: account || '示範使用者', role: 'manager', project_name: SITE_NAME });
        navigate('/', { replace: true });
        return;
      }
      const res: any = await verifyAccess({ account, password });
      if (res && res.ok) {
        saveSession({
          display_name: res.display_name || account,
          role: res.role || 'sales',
          project_name: SITE_NAME,
        });
        navigate('/', { replace: true });
      } else {
        setError(res?.error || '帳號或密碼錯誤');
      }
    } catch {
      setError('連線失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-[1.05fr_1fr]" style={{ background: 'var(--background)' }}>
      <div className="relative overflow-hidden min-h-[280px] flex flex-col justify-end p-10 md:p-12" style={{ color: '#F5F8FA' }}>
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(1200px 500px at 20% -10%, #2B7793 0%, transparent 60%), linear-gradient(165deg,#0E2A40,#123B5D 45%,#1D5A78 100%)',
          }}
        />
        <svg className="absolute inset-0 w-full h-full opacity-35" preserveAspectRatio="none" viewBox="0 0 800 600">
          <path d="M0 420 Q200 380 400 430 T800 400 V600 H0 Z" fill="#0B2233" opacity="0.6" />
          <path d="M0 470 Q220 440 420 480 T800 460 V600 H0 Z" fill="#123B5D" opacity="0.7" />
          <circle cx="660" cy="120" r="70" fill="#B9A16B" opacity="0.18" />
        </svg>
        <div className="relative">
          <div className="flex items-center gap-2.5 mb-5.5">
            <div className="w-9.5 h-9.5 rounded-[10px] flex items-center justify-center" style={{ width: 38, height: 38, background: 'rgba(245,248,250,.14)', border: '1px solid rgba(245,248,250,.28)' }}>
              <Building2 size={20} color="#EFE3C4" />
            </div>
            <span className="text-[13px] font-semibold" style={{ letterSpacing: '0.16em', color: '#DCEEF3' }}>{SITE_TAGLINE}</span>
          </div>
          <h1 className="brand-font font-bold m-0" style={{ fontSize: 'clamp(34px,4.4vw,52px)', lineHeight: 1.15 }}>{SITE_NAME}</h1>
          <p className="mt-3.5 max-w-[420px]" style={{ fontSize: 16, color: '#C7DCE4', lineHeight: 1.8 }}>
            案場的每一天，交給一套看得懂全局的控台。初訪、回籠、成交，一眼追蹤到底。
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center p-8">
        <form onSubmit={onSubmit} className="w-full max-w-[380px]">
          <div className="mb-7">
            <div className="brand-font font-bold text-[22px]" style={{ color: 'var(--foreground)' }}>登入控台</div>
            <div className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>請輸入帳號密碼</div>
          </div>

          <label className="block text-[13px] font-semibold mb-1.5" style={{ color: 'var(--muted-foreground)' }}>帳號</label>
          <input
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            className="w-full px-3.5 py-3 rounded-xl text-[15px] mb-4.5"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)' }}
          />

          <label className="block text-[13px] font-semibold mb-1.5" style={{ color: 'var(--muted-foreground)' }}>密碼</label>
          <div className="relative mb-6.5">
            <input
              type={showPw ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3.5 py-3 pr-11 rounded-xl text-[15px]"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)' }}
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-1"
              style={{ color: 'var(--muted-foreground)' }}
            >
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && (
            <div className="text-[13px] mb-4 px-3 py-2 rounded-lg" style={{ color: 'var(--danger)', background: 'var(--danger-soft)' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl text-[15px] font-bold border-none cursor-pointer"
            style={{ background: 'var(--primary)', color: 'var(--primary-foreground)', boxShadow: 'var(--shadow-sm)' }}
          >
            {loading ? '登入中…' : '登入'}
          </button>

          {!GAS_URL && (
            <div className="mt-5 text-xs text-center" style={{ color: 'var(--muted-foreground)' }}>
              示範模式・尚未設定 VITE_GAS_URL，輸入任意帳密即可進入
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
