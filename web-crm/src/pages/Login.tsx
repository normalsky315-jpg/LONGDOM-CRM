import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { SITE_NAME, SITE_TAGLINE } from '../lib/siteConfig';
import { verifyAccess, getProjectList, GAS_URL } from '../lib/gasClient';
import { saveSession } from '../lib/session';
import { initLiff, type LiffProfile } from '../lib/liff';

// 對照 jltx.html 的登入流程：身份來自 LIFF 的 liff.getProfile()
// （userId／displayName），密碼是全案場共用的一組密碼，不是每人一組
// 帳密。畫面上完全沒有「帳號」欄位可以打——LINE 顯示名稱是唯讀的、
// 從 LIFF 自動帶出來，使用者只需要選案場、輸入共用密碼。
export function Login() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState('');
  const [projects, setProjects] = useState<string[]>([]);
  const [project, setProject] = useState('');
  const [profile, setProfile] = useState<LiffProfile | null>(null);
  const [liffReady, setLiffReady] = useState(!GAS_URL);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      if (!GAS_URL) {
        // 示範模式不整合 LIFF：LIFF 需要在 LINE 開發者後台登記固定的
        // Endpoint URL，跟示範用的多組隨機預覽網址不相容，示範模式
        // 只需要能操作畫面，不需要真的驗證身份
        setProjects([SITE_NAME]);
        setProject(SITE_NAME);
        return;
      }
      const p = await initLiff();
      setProfile(p);
      setLiffReady(true);
      try {
        const res: any = await getProjectList();
        const list = res?.data || [];
        setProjects(list);
        if (list.length === 1) setProject(list[0]);
      } catch {
        setProjects([]);
      }
    })();
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password) {
      setError('請輸入密碼');
      return;
    }
    setLoading(true);
    try {
      if (!GAS_URL) {
        saveSession({ display_name: '示範使用者', role: 'manager', project_name: project || SITE_NAME });
        navigate('/', { replace: true });
        return;
      }
      if (!profile?.userId) {
        setError('無法取得 LINE 使用者身份，請確認從 LINE 開啟本頁面');
        return;
      }
      const res: any = await verifyAccess({
        lineUserId: profile.userId,
        displayName: profile.displayName,
        password,
        selectedProject: project,
      });
      if (!res?.ok) {
        setError(res?.error || '登入失敗');
        return;
      }
      if (res.data?.status === 'pending') {
        setPending(true);
        return;
      }
      saveSession({
        line_user_id: profile.userId,
        display_name: res.data.displayName,
        role: res.data.role || 'sales',
        project_name: res.data.projectName || project,
      });
      navigate('/', { replace: true });
    } catch {
      setError('連線失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  if (GAS_URL && !liffReady) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--background)', color: 'var(--muted-foreground)' }}>
        連接 LINE 中…
      </div>
    );
  }

  if (pending) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8" style={{ background: 'var(--background)' }}>
        <div className="text-center max-w-sm">
          <div className="brand-font font-bold text-xl mb-2" style={{ color: 'var(--foreground)' }}>帳號待審核</div>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>您的帳號已建立，請聯絡主管完成核准後再重新登入。</p>
        </div>
      </div>
    );
  }

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
            <div className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>請選擇案場並輸入密碼</div>
          </div>

          {profile?.displayName && (
            <div className="flex items-center gap-2.5 mb-4.5 px-3.5 py-2.5 rounded-xl" style={{ background: 'var(--lake-soft)' }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: 'var(--secondary)', color: '#fff' }}>
                {profile.displayName.charAt(0)}
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--secondary)' }}>LINE 帳號：{profile.displayName}</span>
            </div>
          )}

          <label className="block text-[13px] font-semibold mb-1.5" style={{ color: 'var(--muted-foreground)' }}>案場</label>
          <select
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="w-full px-3.5 py-3 rounded-xl text-[15px] mb-4.5"
            style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)' }}
          >
            <option value="">請選擇案場</option>
            {projects.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

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
              示範模式・尚未設定 VITE_GAS_URL，輸入任意密碼即可進入
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
