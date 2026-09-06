import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Search } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { SkeletonCard } from '../components/ui/Skeleton';
import { getMyCustomers, GAS_URL } from '../lib/gasClient';

// 欄位對照 Customer_Data 試算表實際欄位（見 gas-updates/jltx_v9.30_full.gs
// 的 appendCustomerData／getMyCustomers），不要再發明畫面好看但後端沒有
// 的欄位（例如「客戶意願」高/中/低這種分級，Customer_Data 裡並不存在）
export interface Customer {
  customer_id: string;
  customer_name: string;
  phone: string;
  visit_date: string;
  visit_type: string; // '初訪' | '回籠'
  introduced_units: string;
  budget: string;
  deal_status: '未成交' | '已成交' | '退戶';
  deal_unit: string;
  district?: string;
  occupation_industry?: string;
  purchase_motive?: string;
  source?: string;
  status_note?: string;
  note?: string;
}

const DEAL_TONE: Record<Customer['deal_status'], 'success' | 'lake' | 'neutral'> = {
  已成交: 'success',
  未成交: 'lake',
  退戶: 'neutral',
};

export const MOCK_CUSTOMERS: Customer[] = [
  { customer_id: 'c1', customer_name: '王小姐', phone: '0912-345-678', visit_date: '2026/08/29', visit_type: '初訪', introduced_units: 'A3/3F', budget: '3,500 萬', deal_status: '未成交', deal_unit: '', district: '仁武區', occupation_industry: '科技資訊', purchase_motive: '自住改善', source: '現場來訪', status_note: '先生希望再確認高樓層景觀', note: '' },
  { customer_id: 'c2', customer_name: '陳先生', phone: '0928-118-220', visit_date: '2026/08/28', visit_type: '回籠', introduced_units: 'B2/2F', budget: '2,680 萬', deal_status: '未成交', deal_unit: '', district: '鳥松區', occupation_industry: '服務業', purchase_motive: '首購', source: '廣告來電', status_note: '考慮自住，想了解學區', note: '' },
  { customer_id: 'c3', customer_name: '林小姐', phone: '0937-660-410', visit_date: '2026/08/27', visit_type: '初訪', introduced_units: 'A1/9F', budget: '4,200 萬', deal_status: '未成交', deal_unit: '', district: '鳳山區', occupation_industry: '金融保險', purchase_motive: '投資置產', source: '親友介紹', status_note: '比較中，預計下週回覆', note: '' },
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
        // getMyCustomers 回傳裸陣列（ok(rows)），不是包在 {results:[...]} 裡
        const res = await getMyCustomers();
        setCustomers(res?.data || MOCK_CUSTOMERS);
      } catch {
        setCustomers(MOCK_CUSTOMERS);
      }
    })();
  }, []);

  const filtered = (customers || []).filter(
    (c) => !q || c.customer_name.includes(q) || c.phone.includes(q) || c.introduced_units?.includes(q)
  );

  return (
    <div>
      <h2 className="brand-font font-bold text-[22px] m-0 mb-1" style={{ color: 'var(--foreground)' }}>客戶管理</h2>
      <p className="text-sm m-0 mb-4.5" style={{ color: 'var(--muted-foreground)' }}>共 {customers?.length ?? '…'} 位客戶</p>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: 'var(--muted-foreground)' }} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜尋姓名、電話、介紹戶別…"
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
                      <Badge tone="neutral">{c.visit_type}</Badge>
                      <Badge tone={DEAL_TONE[c.deal_status]}>{c.deal_status}</Badge>
                    </div>
                    <div className="text-[13px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{c.introduced_units || '未指定戶別'}｜預算 {c.budget || '未填'}</div>
                    <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{c.visit_date}・「{c.status_note}」</div>
                  </div>
                  <ChevronRight size={16} style={{ color: 'var(--muted-foreground)', flexShrink: 0 }} />
                </Card>
              </Link>
            ))}
      </div>
    </div>
  );
}
