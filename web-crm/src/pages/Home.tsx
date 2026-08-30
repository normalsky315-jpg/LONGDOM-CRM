import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Repeat, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { IconTile } from '../components/ui/IconTile';
import { SkeletonCard } from '../components/ui/Skeleton';
import { getMyCustomerStats, getPendingFollowups, GAS_URL } from '../lib/gasClient';
import { loadSession } from '../lib/session';

const MOCK_STATS = { today_first_visit: 4, today_revisit: 3, today_deal: 1 };
const MOCK_FOLLOWUPS = [
  { customer_id: 'c1', customer_name: '李先生', unit: 'A棟 5F・2型', note: '今日到期・約看夜景戶', tone: 'danger' as const },
  { customer_id: 'c2', customer_name: '陳小姐', unit: 'B棟 3F・1型', note: '明日追蹤・貸款方案', tone: 'warning' as const },
  { customer_id: 'c3', customer_name: '王先生', unit: 'A棟 12F・3型', note: '2天後・二次回籠邀約', tone: 'lake' as const },
];

export function Home() {
  const user = loadSession();
  const [stats, setStats] = useState<typeof MOCK_STATS | null>(null);
  const [followups, setFollowups] = useState<typeof MOCK_FOLLOWUPS | null>(null);

  useEffect(() => {
    (async () => {
      if (!GAS_URL) {
        setStats(MOCK_STATS);
        setFollowups(MOCK_FOLLOWUPS);
        return;
      }
      try {
        const [s, f] = await Promise.all([getMyCustomerStats(), getPendingFollowups()]);
        setStats(s?.data || MOCK_STATS);
        setFollowups(f?.data || MOCK_FOLLOWUPS);
      } catch {
        setStats(MOCK_STATS);
        setFollowups(MOCK_FOLLOWUPS);
      }
    })();
  }, []);

  return (
    <div>
      <div className="text-[13px] font-semibold mb-1.5" style={{ color: 'var(--gold)', letterSpacing: '0.05em' }}>
        {new Date().toLocaleDateString('zh-TW', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
      </div>
      <h2 className="brand-font font-bold text-[26px] m-0" style={{ color: 'var(--foreground)' }}>
        午安，{user?.display_name || '訪客'}
      </h2>
      <p className="mt-1.5 text-sm" style={{ color: 'var(--muted-foreground)' }}>
        今天有 {followups?.length ?? '…'} 位客戶待追蹤
      </p>

      <div className="grid grid-cols-3 gap-3.5 mt-6">
        {!stats
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
          : (
            <>
              <Card className="p-4.5">
                <IconTile icon={UserPlus} tone="lake" />
                <div className="tabular text-[28px] font-bold mt-3" style={{ color: 'var(--foreground)' }}>{stats.today_first_visit}</div>
                <div className="text-[13px] mt-1" style={{ color: 'var(--muted-foreground)' }}>今日初訪</div>
              </Card>
              <Card className="p-4.5">
                <IconTile icon={Repeat} tone="gold" />
                <div className="tabular text-[28px] font-bold mt-3" style={{ color: 'var(--foreground)' }}>{stats.today_revisit}</div>
                <div className="text-[13px] mt-1" style={{ color: 'var(--muted-foreground)' }}>今日回籠</div>
              </Card>
              <Card className="p-4.5">
                <IconTile icon={CheckCircle2} tone="success" />
                <div className="tabular text-[28px] font-bold mt-3" style={{ color: 'var(--foreground)' }}>{stats.today_deal}</div>
                <div className="text-[13px] mt-1" style={{ color: 'var(--muted-foreground)' }}>今日成交</div>
              </Card>
            </>
          )}
      </div>

      <div className="flex items-center justify-between mt-8 mb-3">
        <h3 className="text-base font-bold m-0" style={{ color: 'var(--foreground)' }}>待追蹤客戶</h3>
        <Link to="/customers" className="text-[13px] font-semibold no-underline" style={{ color: 'var(--secondary)' }}>查看全部</Link>
      </div>
      <Card className="overflow-hidden">
        {(followups || []).map((f, i) => (
          <Link
            key={f.customer_id}
            to={`/customers/${f.customer_id}`}
            className="flex items-center gap-3 px-4.5 py-3.5 no-underline"
            style={{ borderTop: i ? '1px solid var(--border)' : 'none', color: 'inherit' }}
          >
            <div className="w-1 self-stretch rounded" style={{ background: `var(--${f.tone === 'lake' ? 'secondary' : f.tone})` }} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>
                {f.customer_name} <span className="font-medium" style={{ color: 'var(--muted-foreground)' }}>・{f.unit}</span>
              </div>
              <div className="text-[13px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{f.note}</div>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--muted-foreground)' }} />
          </Link>
        ))}
      </Card>
    </div>
  );
}
