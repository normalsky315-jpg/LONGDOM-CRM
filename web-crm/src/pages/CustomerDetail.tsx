import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Phone, MessageCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { getMyCustomers, getContactLogsByCustomer, GAS_URL } from '../lib/gasClient';
import { MOCK_CUSTOMERS, type Customer } from './Customers';

const TABS = [
  ['basic', '基本資料'],
  ['log', '接待記錄'],
  ['need', '需求條件'],
  ['memo', '備註'],
] as const;

const DEAL_TONE: Record<Customer['deal_status'], 'success' | 'lake' | 'neutral'> = {
  已成交: 'success',
  未成交: 'lake',
  退戶: 'neutral',
};

interface ContactLog {
  contact_id: string;
  contact_date: string;
  contact_method: string;
  note: string;
  next_followup_date?: string;
}

export function CustomerDetail() {
  const { id } = useParams();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('basic');
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [logs, setLogs] = useState<ContactLog[]>([]);

  useEffect(() => {
    (async () => {
      if (!GAS_URL) {
        setCustomer(MOCK_CUSTOMERS.find((c) => c.customer_id === id) || MOCK_CUSTOMERS[0]);
        setLogs([{ contact_id: 'l1', contact_date: '2026/08/29', contact_method: '現場接待', note: '先生希望再確認高樓層景觀' }]);
        return;
      }
      try {
        // 目前後端沒有「單一客戶」的查詢 API，getMyCustomers 抓自己權限
        // 範圍內全部客戶後在前端過濾——客戶數量大時應該請後端加一支
        // getCustomerById，這裡先用權宜作法避免打錯不存在的 action
        const [listRes, logRes] = await Promise.all([
          getMyCustomers(),
          getContactLogsByCustomer({ customer_id: id }),
        ]);
        const found = (listRes?.data || []).find((c: Customer) => c.customer_id === id);
        setCustomer(found || MOCK_CUSTOMERS[0]);
        setLogs(logRes?.data || []);
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
              <Badge tone="neutral">{customer.visit_type}</Badge>
              <Badge tone={DEAL_TONE[customer.deal_status]}>{customer.deal_status}</Badge>
            </div>
            <div className="text-[13px] mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{customer.phone}</div>
          </div>
          <div className="flex gap-2">
            <a
              href={`tel:${customer.phone}`}
              className="w-9.5 h-9.5 rounded-[10px] flex items-center justify-center no-underline"
              style={{ width: 38, height: 38, background: 'var(--success-soft)', color: 'var(--success)' }}
            >
              <Phone size={17} />
            </a>
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
                ['來訪日期', customer.visit_date],
                ['來訪類型', customer.visit_type],
                ['居住區域', customer.district],
                ['職業', customer.occupation_industry],
                ['預算', customer.budget],
                ['介紹戶別', customer.introduced_units],
                ['成交戶別', customer.deal_unit || '—'],
                ['來源管道', customer.source],
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
            {logs.length
              ? logs.map((l) => (
                  <div key={l.contact_id}>
                    {l.contact_date}・{l.contact_method}・{l.note}
                    {l.next_followup_date && <span> (下次追蹤：{l.next_followup_date})</span>}
                  </div>
                ))
              : '尚無接待記錄'}
          </div>
        )}
        {tab === 'need' && (
          <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {customer.purchase_motive || '尚未填寫購屋動機'}，偏好戶別 {customer.introduced_units || '尚未指定'}
          </div>
        )}
        {tab === 'memo' && <div className="text-sm" style={{ color: 'var(--muted-foreground)' }}>{customer.status_note || customer.note || '尚無備註'}</div>}

        <div className="flex gap-2.5 mt-5.5">
          <Button variant="secondary" className="flex-1">建立追蹤</Button>
          <Button variant="primary" className="flex-1">新增接待紀錄</Button>
        </div>
      </Card>
    </div>
  );
}
