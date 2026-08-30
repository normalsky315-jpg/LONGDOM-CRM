import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { UserPlus, Repeat, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { IconTile } from '../components/ui/IconTile';
import { SkeletonCard } from '../components/ui/Skeleton';
import { getMyCustomers, getPendingFollowups, GAS_URL } from '../lib/gasClient';
import { loadSession } from '../lib/session';
import type { Customer } from './Customers';

interface Stats { today_first_visit: number; today_revisit: number; today_deal: number }
interface Followup { customer_id: string; customer_name: string; note: string; next_followup_date: string }

const MOCK_STATS: Stats = { today_first_visit: 4, today_revisit: 3, today_deal: 1 };
const MOCK_FOLLOWUPS: Followup[] = [
  { customer_id: 'c1', customer_name: '李先生', note: '約看夜景戶', next_followup_date: '2026-08-30' },
  { customer_id: 'c2', customer_name: '陳小姐', note: '貸款方案', next_followup_date: '2026-08-31' },
  { customer_id: 'c3', customer_name: '王先生', note: '二次回籠邀約', next_followup_date: '2026-09-01' },
];

export function Home() {
  const user = loadSession();
  const [stats, setStats] = useState<Stats | null>(null);
  const [followups, setFollowups] = useState<Followup[] | null>(null);

  useEffect(() => {
    (async () => {
      if (!GAS_URL) {
        setStats(MOCK_STATS);
        setFollowups(MOCK_FOLLOWUPS);
        return;
      }
      try {
        // 後端沒有現成的「今日初訪/回籠/成交」統計 API（getMyCustomerStats
        // 實際回傳的是 {total, by_district, by_source, by_age_range}，
        // 跟這裡要的每日 KPI 完全是兩回事），改成用 getMyCustomers 抓
        // 權限範圍內的客戶清單，前端依今天日期自己算
        const [listRes, followupRes] = await Promise.all([getMyCustomers(), getPendingFollowups()]);
        const rows: Customer[] = listRes?.data || [];
        const today = new Date().toISOString().slice(0, 10).replace(/-/g, '/');
        const todayRows = rows.filter((r) => r.visit_date === today);
        setStats({
          today_first_visit: todayRows.filter((r) => r.visit_type === '初訪').length,
          today_revisit: todayRows.filter((r) => r.visit_type === '回籠').length,
          today_deal: todayRows.filter((r) => r.deal_status === '已成交').length,
        });
        setFollowups(followupRes?.data || []);
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
        {(followups || []).length === 0 && (
          <div className="text-center text-sm py-8" style={{ color: 'var(--muted-foreground)' }}>目前沒有需要追蹤的客戶</div>
        )}
        {(followups || []).map((f, i) => (
          <Link
            key={f.customer_id}
            to={`/customers/${f.customer_id}`}
            className="flex items-center gap-3 px-4.5 py-3.5 no-underline"
            style={{ borderTop: i ? '1px solid var(--border)' : 'none', color: 'inherit' }}
          >
            <div
              className="w-1 self-stretch rounded"
              style={{ background: f.next_followup_date <= new Date().toISOString().slice(0, 10) ? 'var(--danger)' : 'var(--secondary)' }}
            />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>{f.customer_name}</div>
              <div className="text-[13px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{f.note}・下次追蹤 {f.next_followup_date}</div>
            </div>
            <ChevronRight size={16} style={{ color: 'var(--muted-foreground)' }} />
          </Link>
        ))}
      </Card>
    </div>
  );
}
