import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input } from '../components/ui/Input';
import { appendDailyReport, getDailyReportRange, GAS_URL } from '../lib/gasClient';
import { useToast } from '../components/ui/Toast';

interface Report {
  report_id: string;
  report_date: string;
  salesperson: string;
  visitor_count: number;
  first_visit_count: number;
  revisit_count: number;
  deal_count: number;
  transaction_units?: string;
  notes?: string;
}

const MOCK_REPORTS: Report[] = [
  { report_id: 'r1', report_date: '2026/08/29', salesperson: '昭文', visitor_count: 6, first_visit_count: 4, revisit_count: 2, deal_count: 0, notes: '下午客潮較多' },
  { report_id: 'r2', report_date: '2026/08/28', salesperson: '昭文', visitor_count: 4, first_visit_count: 2, revisit_count: 2, deal_count: 1, transaction_units: 'A5/12F', notes: '' },
];

const emptyForm = { visitor_count: '', first_visit_count: '', revisit_count: '', call_count: '', deal_count: '', transaction_units: '', notes: '' };

export function DailyReport() {
  const showToast = useToast();
  const [reports, setReports] = useState<Report[] | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!GAS_URL) {
      setReports(MOCK_REPORTS);
      return;
    }
    try {
      // getDailyReportRange 的參數是 months（抓最近幾個月），不是
      // from/to 日期區間——之前送 from/to 後端根本不認得，會被忽略、
      // 直接回傳預設的最近 3 個月，不是原本以為的「最近 14 天」
      const res = await getDailyReportRange({ months: 1 });
      setReports(res?.data || MOCK_REPORTS);
    } catch {
      setReports(MOCK_REPORTS);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (GAS_URL) {
        const res: any = await appendDailyReport(form);
        if (!res?.ok) {
          showToast(res?.error || '提交失敗', 'error');
          setSaving(false);
          return;
        }
      }
      showToast('日報已提交', 'success');
      setForm(emptyForm);
      load();
    } catch {
      showToast('連線失敗，請稍後再試', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h2 className="brand-font font-bold text-[22px] m-0 mb-4.5" style={{ color: 'var(--foreground)' }}>銷售日報</h2>

      <Card className="p-5 mb-6">
        <div className="font-bold text-sm mb-3.5" style={{ color: 'var(--foreground)' }}>提交今日日報</div>
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <Field label="來客組數"><Input type="number" min={0} value={form.visitor_count} onChange={set('visitor_count')} /></Field>
            <Field label="初訪組數"><Input type="number" min={0} value={form.first_visit_count} onChange={set('first_visit_count')} /></Field>
            <Field label="回籠組數"><Input type="number" min={0} value={form.revisit_count} onChange={set('revisit_count')} /></Field>
            <Field label="成交組數"><Input type="number" min={0} value={form.deal_count} onChange={set('deal_count')} /></Field>
          </div>
          <Field label="成交戶別（選填）">
            <Input value={form.transaction_units} onChange={set('transaction_units')} placeholder="A5/12F" />
          </Field>
          <Field label="備註">
            <Input value={form.notes} onChange={set('notes')} placeholder="今日接待概況…" />
          </Field>
          <Button type="submit" variant="primary" disabled={saving} className="self-start">
            {saving ? '送出中…' : '提交日報'}
          </Button>
        </form>
      </Card>

      <div className="font-bold text-sm mb-3" style={{ color: 'var(--foreground)' }}>近期日報</div>
      <div className="flex flex-col gap-2.5">
        {(reports || []).map((r) => (
          <Card key={r.report_id} className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>{r.report_date}</span>
              <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{r.salesperson}</span>
            </div>
            <div className="flex gap-4 text-[13px] mt-2 tabular" style={{ color: 'var(--muted-foreground)' }}>
              <span>來客 <b style={{ color: 'var(--foreground)' }}>{r.visitor_count}</b></span>
              <span>初訪 <b style={{ color: 'var(--foreground)' }}>{r.first_visit_count}</b></span>
              <span>回籠 <b style={{ color: 'var(--foreground)' }}>{r.revisit_count}</b></span>
              <span>成交 <b style={{ color: 'var(--success)' }}>{r.deal_count}</b></span>
            </div>
            {r.notes && <div className="text-[13px] mt-1.5" style={{ color: 'var(--muted-foreground)' }}>{r.notes}</div>}
          </Card>
        ))}
      </div>
    </div>
  );
}
