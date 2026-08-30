import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { getCustomer360Detail, getContactLogsByCustomer, GAS_URL } from '../lib/gasClient';
import { MOCK_CUSTOMERS, type Customer } from './Customers';

const TABS = [
  ['basic', '基本資料'],
  ['log', '接待記錄'],
  ['need', '需求條件'],
  ['memo', '備註'],
] as const;

const INTENT_TONE: Record<string, 'danger' | 'warning' | 'lake' | 'neutral'> = {
  高意願: 'danger',
  中意願: 'warning',
  待追蹤: 'lake',
  低意願: 'neutral',
};

export function CustomerDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('basic');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      if (!GAS_URL) {
        setCustomer(MOCK_CUSTOMERS.find((c) => c.customer_id === id) || MOCK_CUSTOMERS[0]);
        setLogs(['2026/08/29 現場接待・先生希望再確認高樓層景觀']);
        return;
      }
      try {
        const [detail, logRes] = await Promise.all([
          getCustomer360Detail({ customer_id: id }),
          getContactLogsByCustomer({ customer_id: id }),
        ]);
        setCustomer(detail?.data || MOCK_CUSTOMERS[0]);
        setLogs((logRes?.data || []).map((l: any) => `${l.contact_date}・${l.summary}`));
      } catch {
        setCustomer(MOCK_CUSTOMERS.find((c) => c.customer_id === id) || MOCK_CUSTOMERS[0]);
      }
    })();
  }, [id]);

  if (!customer) return null;

  return (
    <div>
      <Link to="/customers" className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-4 no-underline" style={{ color: 'var(--muted-foreground)' }}>
        <ArrowLeft size={16} /> 返回客戶列表
      </Link>
      <Card className="p-5.5">
        <div className="flex items-center gap-3.5 mb-5">
          <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xl flex-shrink-0" style={{ background: 'var(--lake-soft)', color: 'var(--secondary)' }}>
            {customer.customer_name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="brand-font font-bold text-[19px]" style={{ color: 'var(--foreground)' }}>{customer.customer_name}</span>
              <Badge tone={INTENT_TONE[customer.intent_level] || 'neutral'}>{customer.intent_level}</Badge>
            </div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{customer.phone}</div>
          </div>
          <div className="flex gap-2">
            <button className="w-9.5 h-9.5 rounded-[10px] border-none cursor-pointer flex items-center justify-center" style={{ width: 38, height: 38, background: 'var(--success-soft)', color: 'var(--success)' }}>
              <Phone size={17} />
            </button>
            <button className="w-9.5 h-9.5 rounded-[10px] border-none cursor-pointer flex items-center justify-center" style={{ width: 38, height: 38, background: 'var(--lake-soft)', color: 'var(--secondary)' }}>
              <MessageCircle size={17} />
            </button>
          </div>
        </div>

        <div className="flex gap-4.5 mb-4.5" style={{ borderBottom: '1px solid var(--border)' }}>
          {TABS.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="bg-transparent border-none cursor-pointer py-2.5 text-sm"
              style={{
                fontWeight: tab === key ? 700 : 500,
                color: tab === key ? 'var(--secondary)' : 'var(--muted-foreground)',
                borderBottom: tab === key ? '2px solid var(--secondary)' : '2px solid transparent',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'basic' && (
          <table className="w-full border-collapse text-sm">
            <tbody>
              {[
                ['預算', customer.budget],
                ['意向戶別', customer.intent_unit],
                ['坪數需求', customer.area_requirement],
                ['購屋目的', customer.purpose],
                ['目前狀態', customer.deal_stage],
                ['來源介紹', customer.source],
              ].map(([k, v]) => (
                <tr key={k} style={{ borderTop: '1px solid var(--border)' }}>
                  <td className="py-2.5 px-1 w-28" style={{ color: 'var(--muted-foreground)' }}>{k}</td>
                  <td className="py-2.5 px-1 font-semibold" style={{ color: 'var(--foreground)' }}>{v || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {tab === 'log' && (
          <div className="flex flex-col gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {logs.length ? logs.map((l, i) => <div key={i}>{l}</div>) : '尚無接待記錄'}
          </div>
        )}
        {tab === 'need' && (
          <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {customer.area_requirement}，偏好{customer.intent_unit}格局，{customer.purpose}導向
          </div>
        )}
        {tab === 'memo' && <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{customer.note || '尚無備註'}</div>}

        <div className="flex gap-2.5 mt-5.5">
          <Button variant="secondary" className="flex-1">建立追蹤</Button>
          <Button variant="primary" className="flex-1">新增接待紀錄</Button>
        </div>
      </Card>
    </div>
  );
}
