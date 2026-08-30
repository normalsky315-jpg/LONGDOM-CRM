import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Input';
import { appendCustomerData, GAS_URL } from '../lib/gasClient';
import { useToast } from '../components/ui/Toast';

export function NewCustomer() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    intent_unit: '',
    budget: '',
    purpose: '自住',
    source: '現場來訪',
    note: '',
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.phone.trim()) {
      showToast('姓名與電話為必填', 'error');
      return;
    }
    setSaving(true);
    try {
      if (GAS_URL) {
        const res: any = await appendCustomerData(form);
        if (!res?.ok) {
          showToast(res?.error || '新增失敗', 'error');
          setSaving(false);
          return;
        }
      }
      showToast('已新增來客', 'success');
      navigate('/customers');
    } catch {
      showToast('連線失敗，請稍後再試', 'error');
      setSaving(false);
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-1.5 text-[13px] font-semibold mb-4 bg-transparent border-none cursor-pointer p-0"
        style={{ color: 'var(--muted-foreground)' }}
      >
        <ArrowLeft size={16} /> 返回
      </button>
      <h2 className="brand-font font-bold text-[22px] m-0 mb-4.5" style={{ color: 'var(--foreground)' }}>新增來客</h2>
      <Card className="p-5.5">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="客戶姓名 *">
              <Input value={form.customer_name} onChange={set('customer_name')} placeholder="王小姐" />
            </Field>
            <Field label="電話 *">
              <Input value={form.phone} onChange={set('phone')} placeholder="0912-345-678" />
            </Field>
            <Field label="意向戶別">
              <Input value={form.intent_unit} onChange={set('intent_unit')} placeholder="A3・3房" />
            </Field>
            <Field label="預算">
              <Input value={form.budget} onChange={set('budget')} placeholder="3,500 萬" />
            </Field>
            <Field label="購屋目的">
              <Select value={form.purpose} onChange={set('purpose')}>
                <option>自住</option>
                <option>置產</option>
                <option>投資</option>
              </Select>
            </Field>
            <Field label="來源管道">
              <Select value={form.source} onChange={set('source')}>
                <option>現場來訪</option>
                <option>廣告來電</option>
                <option>朋友介紹</option>
                <option>網路媒體</option>
              </Select>
            </Field>
          </div>
          <Field label="接待備註">
            <textarea
              value={form.note}
              onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
              rows={3}
              className="w-full px-3.5 py-2.5 text-sm rounded-xl resize-none"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--foreground)' }}
            />
          </Field>
          <div className="flex gap-2.5 mt-1">
            <Button type="button" variant="secondary" className="flex-1" onClick={() => navigate(-1)}>取消</Button>
            <Button type="submit" variant="primary" className="flex-1" disabled={saving}>
              {saving ? '儲存中…' : '新增來客'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
