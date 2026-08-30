import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { getMyCustomers, GAS_URL } from '../lib/gasClient';

export interface Customer {
  customer_id: string;
  customer_name: string;
  phone: string;
  intent_unit: string;
  budget: string;
  intent_level: string;
  last_visit_date: string;
  note: string;
  area_requirement?: string;
  purpose?: string;
  deal_stage?: string;
  source?: string;
}

const INTENT_TONE: Record<string, 'danger' | 'warning' | 'lake' | 'neutral'> = {
  高意願: 'danger',
  中意願: 'warning',
  待追蹤: 'lake',
  低意願: 'neutral',
};

export const MOCK_CUSTOMERS: Customer[] = [
  { customer_id: 'c1', customer_name: '王小姐', phone: '0912-345-678', intent_unit: 'A3・3房', budget: '3,500 萬', intent_level: '高意願', last_visit_date: '2026/08/29', note: '先生希望再確認高樓層景觀', area_requirement: '70-90 坪', purpose: '自住', deal_stage: '持續追蹤中', source: '現場來訪' },
  { customer_id: 'c2', customer_name: '陳先生', phone: '0928-118-220', intent_unit: 'B2・2房', budget: '2,680 萬', intent_level: '中意願', last_visit_date: '2026/08/28', note: '考慮自住，想了解學區', area_requirement: '45-55 坪', purpose: '自住', deal_stage: '追蹤中', source: '廣告來電' },
  { customer_id: 'c3', customer_name: '林小姐', phone: '0937-660-410', intent_unit: 'A1・4房', budget: '4,200 萬', intent_level: '待追蹤', last_visit_date: '2026/08/27', note: '比較中，預計下週回覆', area_requirement: '95-110 坪', purpose: '置產', deal_stage: '比較中', source: '朋友介紹' },
];

export function Customers() {
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      if (!GAS_URL) {
        setCustomers(MOCK_CUSTOMERS);
        return;
      }
      try {
        const res = await getMyCustomers();
        setCustomers(res?.data || MOCK_CUSTOMERS);
      } catch {
        setCustomers(MOCK_CUSTOMERS);
      }
    })();
  }, []);

  const filtered = (customers || []).filter(
    (c) => !q || c.customer_name.includes(q) || c.phone.includes(q) || c.intent_unit?.includes(q)
  );

  return (
    <div>
      <h2 className="brand-font font-bold text-[22px] m-0 mb-1" style={{ color: 'var(--foreground)' }}>客戶管理</h2>
      <p className="text-sm m-0 mb-4.5" style={{ color: 'var(--muted-foreground)' }}>共 {customers?.length ?? '…'} 位追蹤中客戶</p>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜尋姓名、電話、戶別…"
          className="w-full pl-10 pr-3.5 py-2.5 rounded-xl text-sm"
          style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)' }}
        />
      </div>

      <div className="flex flex-col gap-3">
        {!customers
          ? [1, 2, 3].map((i) => <SkeletonCard key={i} />)
          : filtered.map((c) => (
              <Link key={c.customer_id} to={`/customers/${c.customer_id}`} className="no-underline" style={{ color: 'inherit' }}>
                <Card className="p-4 flex gap-3.5 items-center cursor-pointer hover:shadow-md">
                  <div
                    className="w-11 h-11 rounded-full flex items-center justify-center font-bold text-[15px] flex-shrink-0"
                    style={{ background: 'var(--lake-soft)', color: 'var(--secondary)' }}
                  >
                    {c.customer_name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[15px]" style={{ color: 'var(--foreground)' }}>{c.customer_name}</span>
                      <Badge tone={INTENT_TONE[c.intent_level] || 'neutral'}>{c.intent_level}</Badge>
                    </div>
                    <div className="text-[13px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{c.intent_unit}｜預算 {c.budget}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>上次接待：{c.last_visit_date}・「{c.note}」</div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                </Card>
              </Link>
            ))}
      </div>
    </div>
  );
}
