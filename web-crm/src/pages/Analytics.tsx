import { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { getWeeklyVisitorBreakdown, GAS_URL } from '../lib/gasClient';

interface DayPoint { label: string; visitors: number; deals: number }
interface SourceRow { source: string; count: number }

const MOCK_WEEK: DayPoint[] = [
  { label: '8/24', visitors: 5, deals: 0 },
  { label: '8/25', visitors: 8, deals: 1 },
  { label: '8/26', visitors: 6, deals: 0 },
  { label: '8/27', visitors: 9, deals: 1 },
  { label: '8/28', visitors: 7, deals: 0 },
  { label: '8/29', visitors: 11, deals: 2 },
  { label: '8/30', visitors: 4, deals: 0 },
];
const MOCK_SOURCES: SourceRow[] = [
  { source: '現場來訪', count: 18 },
  { source: '廣告來電', count: 12 },
  { source: '朋友介紹', count: 9 },
  { source: '網路媒體', count: 6 },
];

function BarChart({ data }: { data: DayPoint[] }) {
  const max = Math.max(...data.map((d) => d.visitors), 1);
  return (
    <div className="flex items-end gap-3 h-[180px] pt-2">
      {data.map((d) => (
        <div key={d.label} className="flex-1 flex flex-col items-center gap-2 h-full justify-end">
          <div className="w-full flex flex-col items-center justify-end h-full">
            <div
              className="w-full rounded-t-md relative"
              style={{ height: `${(d.visitors / max) * 100}%`, background: 'var(--lake-soft)', minHeight: 4 }}
            >
              {d.deals > 0 && (
                <div
                  className="absolute bottom-0 left-0 right-0 rounded-t-md"
                  style={{ height: `${Math.min(100, (d.deals / d.visitors) * 100)}%`, background: 'var(--success)' }}
                />
              )}
            </div>
          </div>
          <span className="text-[11px] tabular" style={{ color: 'var(--muted-foreground)' }}>{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export function Analytics() {
  const [week, setWeek] = useState<DayPoint[] | null>(null);
  const [sources, setSources] = useState<SourceRow[] | null>(null);

  useEffect(() => {
    (async () => {
      if (!GAS_URL) {
        setWeek(MOCK_WEEK);
        setSources(MOCK_SOURCES);
        return;
      }
      try {
        const res = await getWeeklyVisitorBreakdown();
        setWeek(res?.data?.days || MOCK_WEEK);
        setSources(res?.data?.sources || MOCK_SOURCES);
      } catch {
        setWeek(MOCK_WEEK);
        setSources(MOCK_SOURCES);
      }
    })();
  }, []);

  const totalVisitors = (week || []).reduce((s, d) => s + d.visitors, 0);
  const totalDeals = (week || []).reduce((s, d) => s + d.deals, 0);
  const maxSource = Math.max(...(sources || []).map((s) => s.count), 1);

  return (
    <div>
      <h2 className="brand-font font-bold text-[22px] m-0 mb-4.5" style={{ color: 'var(--foreground)' }}>來人分析</h2>

      <div className="grid grid-cols-2 gap-3.5 mb-5">
        <Card className="p-4.5">
          <div className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>本週來客</div>
          <div className="tabular text-2xl font-bold mt-1" style={{ color: 'var(--foreground)' }}>{totalVisitors}</div>
        </Card>
        <Card className="p-4.5">
          <div className="text-[13px]" style={{ color: 'var(--muted-foreground)' }}>本週成交</div>
          <div className="tabular text-2xl font-bold mt-1" style={{ color: 'var(--success)' }}>{totalDeals}</div>
        </Card>
      </div>

      <Card className="p-5 mb-5">
        <div className="flex items-center justify-between mb-1">
          <div className="font-bold text-sm" style={{ color: 'var(--foreground)' }}>每日來客趨勢</div>
          <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--muted-foreground)' }}>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'var(--lake-soft)' }} />來客</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: 'var(--success)' }} />成交</span>
          </div>
        </div>
        <BarChart data={week || MOCK_WEEK} />
      </Card>

      <Card className="p-5">
        <div className="font-bold text-sm mb-3.5" style={{ color: 'var(--foreground)' }}>來源管道分布</div>
        <div className="flex flex-col gap-3">
          {(sources || []).map((s) => (
            <div key={s.source} className="flex items-center gap-3">
              <span className="text-[13px] w-20 flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>{s.source}</span>
              <div className="flex-1 h-2 rounded-full" style={{ background: 'var(--muted)' }}>
                <div className="h-full rounded-full" style={{ width: `${(s.count / maxSource) * 100}%`, background: 'var(--secondary)' }} />
              </div>
              <span className="tabular text-[13px] font-semibold w-6 text-right" style={{ color: 'var(--foreground)' }}>{s.count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
