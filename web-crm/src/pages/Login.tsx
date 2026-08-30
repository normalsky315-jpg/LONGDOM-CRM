import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { SITE_NAME, SITE_TAGLINE } from '../lib/siteConfig';
import { verifyAccess, getProjectList, GAS_URL } from '../lib/gasClient';
import { saveSession } from '../lib/session';

// ⚠ 架構備註：真正的吉隆天曜後端是 LINE LIFF 應用（jltx.html 用
// liff.init()／liff.getProfile() 取得 lineUserId，這是識別使用者的
// 唯一依據，不是帳號密碼），verifyAccess 只驗證「一組全案場共用的
// 密碼」+ lineUserId + 選擇的案場，並沒有「帳號」這個概念——之前這裡
// 做的「帳號」輸入框是完全虛構的欄位，真實系統裡不存在。
// 這裡已經改成貼近真實流程（密碼 + 動態載入案場清單，不再有帳號
// 欄位），但沒有整合 LIFF SDK：在瀏覽器直接開啟（不是從 LINE 內開）
// 拿不到真正的 lineUserId，verifyAccess 會直接被後端擋掉
// （「無法取得 LINE 使用者身份，請確認從 LINE 開啟本頁面」）。
// 要讓這個 React 版本真的能對接後端登入，需要先決定：(a) 加入
// @line/liff 走一樣的 LIFF 流程，或 (b) 幫這個新架構另外做一支不綁
// LINE 身份的登入 action——這是產品層級的決定，不是我能自己選的，
// 所以先維持示範模式可用、真實模式會誠實顯示後端錯誤，而不是假裝
// 登入成功。
export function Login() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState('');
  const [projects, setProjects] = useState<string[]>([]);
  const [project, setProject] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      if (!GAS_URL) {
        setProjects([SITE_NAME]);
        setProject(SITE_NAME);
        return;
      }
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
        // 未設定 VITE_GAS_URL 時走示範模式，不打真實後端
        saveSession({ display_name: '示範使用者', role: 'manager', project_name: project || SITE_NAME });
        navigate('/', { replace: true });
        return;
      }
      // 真實模式下沒有 LIFF 取得的 lineUserId，這裡誠實送空字串讓
      // 後端回傳真正的錯誤，而不是自己假造一個 id 騙過驗證
      const res: any = await verifyAccess({ lineUserId: '', displayName: '', password, selectedProject: project });
      if (res?.ok && res.data?.status === 'active') {
        saveSession({
          display_name: res.data.displayName,
          role: res.data.role || 'sales',
          project_name: res.data.projectName || project,
        });
        navigate('/', { replace: true });
      } else if (res?.ok && res.data?.status === 'pending') {
        setError('帳號待審核，請聯絡主管核准後再登入');
      } else {
        setError(res?.error || '登入失敗');
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
            <div className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>請選擇案場並輸入密碼</div>
          </div>

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
