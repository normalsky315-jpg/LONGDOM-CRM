import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { MOCK_CUSTOMERS } from '../../pages/Customers';
import { searchMyCustomers, GAS_URL } from '../../lib/gasClient';

export function GlobalSearch({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState(MOCK_CUSTOMERS);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 30);
    else setQ('');
  }, [open]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!q.trim()) {
        setResults(MOCK_CUSTOMERS);
        return;
      }
      if (!GAS_URL) {
        setResults(
          MOCK_CUSTOMERS.filter(
            (c) => c.customer_name.includes(q) || c.phone.includes(q) || c.introduced_units?.includes(q)
          )
        );
        return;
      }
      try {
        const res = await searchMyCustomers({ keyword: q });
        if (!cancelled) setResults(res?.data || []);
      } catch {
        if (!cancelled) setResults([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [q]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center pt-24 px-4"
      style={{ background: 'rgba(14,27,36,.45)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-[480px] rounded-2xl overflow-hidden"
        style={{ background: 'var(--surface)', boxShadow: 'var(--shadow-md)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <Search size={17} style={{ color: 'var(--muted-foreground)' }} />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜尋客戶姓名、電話、戶別…"
            className="flex-1 bg-transparent border-none outline-none text-sm"
            style={{ color: 'var(--foreground)' }}
          />
          <button onClick={onClose} className="bg-transparent border-none cursor-pointer p-1" style={{ color: 'var(--muted-foreground)' }} aria-label="關閉">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[360px] overflow-y-auto">
          {results.length === 0 && (
            <div className="text-center text-sm py-8" style={{ color: 'var(--muted-foreground)' }}>找不到符合的客戶</div>
          )}
          {results.map((c) => (
            <button
              key={c.customer_id}
              onClick={() => {
                navigate(`/customers/${c.customer_id}`);
                onClose();
              }}
              className="w-full text-left px-4 py-3 flex items-center gap-3 bg-transparent border-none cursor-pointer"
              style={{ borderTop: '1px solid var(--border)' }}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0"
                style={{ background: 'var(--lake-soft)', color: 'var(--secondary)' }}
              >
                {c.customer_name[0]}
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{c.customer_name}</div>
                <div className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{c.phone}｜{c.visit_date}・{c.visit_type}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
