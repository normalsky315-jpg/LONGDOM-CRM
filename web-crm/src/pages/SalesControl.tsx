import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { getSalesControlList, updateSalesControlUnit, GAS_URL } from '../lib/gasClient';
import { useToast } from '../components/ui/Toast';

interface Unit {
  unit_id: string;
  building: string;
  floor: number;
  unit_type: string;
  unit_label: string;
  category: '可售' | '已售' | '保留';
  price?: string;
  unit_price?: string;
  area?: string;
  parking_id?: string;
}

const STATUS_TONE: Record<Unit['category'], { bg: string; fg: string; badge: 'lake' | 'neutral' | 'warning' }> = {
  可售: { bg: 'var(--lake-soft)', fg: 'var(--secondary)', badge: 'lake' },
  已售: { bg: 'var(--muted)', fg: 'var(--muted-foreground)', badge: 'neutral' },
  保留: { bg: 'var(--gold-soft)', fg: 'var(--gold)', badge: 'warning' },
};

function mockUnits(): Unit[] {
  const units: Unit[] = [];
  const labels = ['A1', 'A2', 'A3', 'A5'];
  const cats: Unit['category'][] = ['已售', '可售', '保留', '可售'];
  [29, 28, 27, 26].forEach((floor, fi) => {
    labels.forEach((label, li) => {
      units.push({
        unit_id: `${label}-${floor}`,
        building: 'A',
        floor,
        unit_type: label,
        unit_label: label,
        category: cats[(li + fi) % cats.length],
        price: '4,688 萬',
        unit_price: '53.9 萬/坪',
        area: '86.72 坪',
        parking_id: 'B2-12',
      });
    });
  });
  return units;
}

const NEXT_STATUS: Record<Unit['category'], Unit['category']> = { 可售: '保留', 保留: '已售', 已售: '可售' };

export function SalesControl() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [units, setUnits] = useState<Unit[] | null>(null);
  const [selected, setSelected] = useState<Unit | null>(null);
  const [building, setBuilding] = useState('A');

  useEffect(() => {
    (async () => {
      if (!GAS_URL) {
        setUnits(mockUnits());
        return;
      }
      try {
        const res = await getSalesControlList();
        setUnits(res?.data || mockUnits());
      } catch {
        setUnits(mockUnits());
      }
    })();
  }, []);

  const buildings = useMemo(() => [...new Set((units || []).map((u) => u.building))].sort(), [units]);
  const floors = useMemo(() => {
    const byFloor = new Map<number, Unit[]>();
    (units || [])
      .filter((u) => u.building === building)
      .forEach((u) => {
        if (!byFloor.has(u.floor)) byFloor.set(u.floor, []);
        byFloor.get(u.floor)!.push(u);
      });
    return [...byFloor.entries()].sort((a, b) => b[0] - a[0]);
  }, [units, building]);

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="brand-font font-bold text-[22px] m-0" style={{ color: 'var(--foreground)' }}>銷控表</h2>
        {buildings.length > 1 && (
          <div className="flex gap-1.5">
            {buildings.map((b) => (
              <button
                key={b}
                onClick={() => setBuilding(b)}
                className="px-3 py-1.5 rounded-lg text-sm font-semibold border-none cursor-pointer"
                style={{ background: b === building ? 'var(--primary)' : 'var(--surface-soft)', color: b === building ? 'var(--primary-foreground)' : 'var(--muted-foreground)' }}
              >
                {b}棟
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex gap-4 text-[13px] my-4" style={{ color: 'var(--muted-foreground)' }}>
        {(Object.keys(STATUS_TONE) as Unit['category'][]).map((k) => (
          <span key={k} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: STATUS_TONE[k].fg }} />
            {k}
          </span>
        ))}
      </div>

      <Card className="p-5">
        <div className="overflow-x-auto">
          <div className="flex flex-col gap-2.5 min-w-[460px]">
            {floors.map(([floor, list]) => (
              <div key={floor} className="flex items-center gap-3">
                <div className="w-9 text-[13px] font-bold flex-shrink-0" style={{ color: 'var(--muted-foreground)' }}>{floor}F</div>
                <div className="grid gap-2.5 flex-1" style={{ gridTemplateColumns: `repeat(${list.length},1fr)` }}>
                  {list.map((u) => {
                    const tone = STATUS_TONE[u.category];
                    const active = selected?.unit_id === u.unit_id;
                    return (
                      <button
                        key={u.unit_id}
                        onClick={() => setSelected(u)}
                        className="py-3 px-1.5 rounded-[10px] cursor-pointer text-center"
                        style={{ border: active ? '2px solid var(--primary)' : '1px solid var(--border)', background: tone.bg, color: tone.fg }}
                      >
                        <div className="font-bold text-[13px]">{u.unit_label}</div>
                        <div className="text-[11px] mt-0.5">{u.category}</div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {selected && (
        <Card className="p-5 mt-4 flex flex-wrap gap-5 items-center">
          <div className="w-[120px] h-20 rounded-xl flex-shrink-0" style={{ background: 'linear-gradient(160deg,var(--lake-soft),var(--accent))' }} />
          <div className="flex-1 min-w-[200px]">
            <div className="flex items-center gap-2">
              <span className="brand-font font-bold text-[17px]" style={{ color: 'var(--foreground)' }}>{selected.unit_label} 棟・{selected.floor}F</span>
              <Badge tone={STATUS_TONE[selected.category].badge}>{selected.category}</Badge>
            </div>
            <div className="text-[13px] mt-1.5" style={{ color: 'var(--muted-foreground)' }}>{selected.area}</div>
            <div className="flex gap-5 text-[13px] mt-1.5" style={{ color: 'var(--muted-foreground)' }}>
              <span>開價 <b className="tabular" style={{ color: 'var(--foreground)' }}>{selected.price}</b></span>
              <span>單價 <b className="tabular" style={{ color: 'var(--foreground)' }}>{selected.unit_price}</b></span>
              <span>車位 <b style={{ color: 'var(--foreground)' }}>{selected.parking_id}</b></span>
            </div>
          </div>
          <div className="flex gap-2.5">
            <Button
              variant="secondary"
              onClick={() => {
                if ((selected as any).customer_id) navigate(`/customers/${(selected as any).customer_id}`);
                else showToast('此戶尚無關聯客戶', 'info');
              }}
            >
              查看客戶
            </Button>
            <Button
              variant="primary"
              onClick={async () => {
                const next = NEXT_STATUS[selected.category];
                setUnits((prev) => (prev || []).map((u) => (u.unit_id === selected.unit_id ? { ...u, category: next } : u)));
                setSelected((prev) => (prev ? { ...prev, category: next } : prev));
                showToast(`已標記為「${next}」`, 'success');
                if (GAS_URL) {
                  try {
                    await updateSalesControlUnit({ unit_id: selected.unit_id, category: next });
                  } catch {
                    showToast('同步後端失敗，請重新整理確認', 'error');
                  }
                }
              }}
            >
              標記狀態
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
