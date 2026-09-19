import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Field, Input, Select } from '../components/ui/Input';
import { appendCustomerData, GAS_URL } from '../lib/gasClient';
import { useToast } from '../components/ui/Toast';

// 欄位對照 appendCustomerData 實際必填／可選欄位（gas-updates/jltx_v9.30_full.gs）。
// customer_name／phone／status_note 三個是後端強制必填，漏了任何一個
// 送出一定會被 fail() 擋掉——之前這裡少了 status_note，串上真實後端
// 一定會提交失敗。
export function NewCustomer() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    visit_type: '初訪',
    introduced_units: '',
    budget: '',
    district: '',
    source: '現場來訪',
    status_note: '',
    note: '',
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim() || !form.phone.trim() || !form.status_note.trim()) {
      showToast('姓名、電話、接待狀況為必填', 'error');
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
        if (res.data?.duplicate_phone) {
          showToast('提醒：此電話已有其他來訪紀錄，仍已新增此筆', 'info');
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
            <Field label="來訪類型">
              <Select value={form.visit_type} onChange={set('visit_type')}>
                <option>初訪</option>
                <option>回籠</option>
              </Select>
            </Field>
            <Field label="居住區域">
              <Input value={form.district} onChange={set('district')} placeholder="仁武區" />
            </Field>
            <Field label="介紹戶別">
              <Input value={form.introduced_units} onChange={set('introduced_units')} placeholder="A3/3F" />
            </Field>
            <Field label="預算">
              <Input value={form.budget} onChange={set('budget')} placeholder="3,500 萬" />
            </Field>
            <Field label="來源管道">
              <Select value={form.source} onChange={set('source')}>
                <option>現場來訪</option>
                <option>廣告來電</option>
                <option>親友介紹</option>
                <option>網路媒體</option>
              </Select>
            </Field>
          </div>
          <Field label="接待狀況 *">
            <Input value={form.status_note} onChange={set('status_note')} placeholder="例：先生希望再確認高樓層景觀" />
          </Field>
          <Field label="備註（選填）">
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
