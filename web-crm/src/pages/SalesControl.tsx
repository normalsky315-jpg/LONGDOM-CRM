import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { getSalesControlList, updateSalesControlUnit, GAS_URL } from '../lib/gasClient';
import { useToast } from '../components/ui/Toast';
import { canManage, loadSession } from '../lib/session';

// 欄位／狀態值對照 Sales_Control 實際欄位（gas-updates/jltx_v9.30_full.gs
// 的 SALES_CONTROL_HEADERS／SALES_CONTROL_STATUSES）。真正的狀態欄位是
// `status`，合法值只有這 5 種；之前這裡誤把 `category`（其實是「住家/
// 店面」用途分類，不是銷售狀態）當狀態欄位在用，且自己發明了「可售/
// 已售/保留」3 個後端根本不存在的值，串上真實資料會整頁對不起來。
interface Unit {
  unit_id: string;
  building: string;
  floor: number;
  unit_type: string;
  unit_label: string;
  status: '待售' | '已保留' | '已收訂' | '已簽約' | '退戶';
  linked_customer_id?: string;
  linked_customer_name?: string;
  house_sale_price?: number;
  avg_unit_price?: number;
  house_sqft?: number;
  parking_id?: string;
}

const SALES_CONTROL_STATUSES: Unit['status'][] = ['待售', '已保留', '已收訂', '已簽約', '退戶'];

const STATUS_TONE: Record<Unit['status'], { bg: string; fg: string; badge: 'lake' | 'neutral' | 'warning' | 'success' | 'danger' }> = {
  待售: { bg: 'var(--lake-soft)', fg: 'var(--secondary)', badge: 'lake' },
  已保留: { bg: 'var(--gold-soft)', fg: 'var(--gold)', badge: 'warning' },
  已收訂: { bg: 'var(--warning-soft)', fg: 'var(--warning)', badge: 'warning' },
  已簽約: { bg: 'var(--success-soft)', fg: 'var(--success)', badge: 'success' },
  退戶: { bg: 'var(--danger-soft)', fg: 'var(--danger)', badge: 'danger' },
};

function mockUnits(): Unit[] {
  const units: Unit[] = [];
  const labels = ['A1', 'A2', 'A3', 'A5'];
  const statuses: Unit['status'][] = ['已簽約', '待售', '已保留', '待售'];
  [29, 28, 27, 26].forEach((floor, fi) => {
    labels.forEach((label, li) => {
      units.push({
        unit_id: `${label}-${floor}`,
        building: 'A',
        floor,
        unit_type: label,
        unit_label: label,
        status: statuses[(li + fi) % statuses.length],
        house_sale_price: 4688,
        avg_unit_price: 53.9,
        house_sqft: 86.72,
        parking_id: 'B2-12',
        linked_customer_id: li === 0 && fi === 0 ? 'c1' : undefined,
      });
    });
  });
  return units;
}

export function SalesControl() {
  const navigate = useNavigate();
  const showToast = useToast();
  const canEdit = canManage(loadSession());
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
        // getSalesControlList 回傳 ok({results:[...]})，不是 ok([...])——
        // 之前直接用 res.data 會拿到 {results:[...]} 這個物件而不是陣列，
        // 後面所有 .filter()/.map() 都會整頁壞掉
        const res = await getSalesControlList();
        setUnits(res?.data?.results || mockUnits());
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

  const setStatus = async (unit: Unit, status: Unit['status']) => {
    let reserved_until: string | undefined;
    let expected_sign_date: string | undefined;
    // 對應後端 validateSalesControlStatus_：已保留要填保留至日期、
    // 已收訂要填預計簽約時間，缺了後端會直接 fail() 擋掉存檔
    if (status === '已保留') {
      const v = window.prompt('保留至日期（YYYY-MM-DD）：');
      if (!v) return;
      reserved_until = v;
    } else if (status === '已收訂') {
      const v = window.prompt('預計簽約時間（YYYY-MM-DD）：');
      if (!v) return;
      expected_sign_date = v;
    }

    const prevUnits = units;
    const prevSelected = selected;
    setUnits((prev) => (prev || []).map((u) => (u.unit_id === unit.unit_id ? { ...u, status } : u)));
    setSelected((prev) => (prev ? { ...prev, status } : prev));

    if (!GAS_URL) {
      showToast(`已標記為「${status}」`, 'success');
      return;
    }
    try {
      const res: any = await updateSalesControlUnit({ unit_id: unit.unit_id, status, reserved_until, expected_sign_date });
      if (!res?.ok) {
        setUnits(prevUnits);
        setSelected(prevSelected);
        showToast(res?.error || '更新失敗', 'error');
        return;
      }
      showToast(`已標記為「${status}」`, 'success');
    } catch {
      setUnits(prevUnits);
      setSelected(prevSelected);
      showToast('連線失敗，狀態已還原', 'error');
    }
  };

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
      <div className="flex gap-3 flex-wrap text-[13px] my-4" style={{ color: 'var(--muted-foreground)' }}>
        {SALES_CONTROL_STATUSES.map((k) => (
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
                    const tone = STATUS_TONE[u.status];
                    const active = selected?.unit_id === u.unit_id;
                    return (
                      <button
                        key={u.unit_id}
                        onClick={() => setSelected(u)}
                        className="py-3 px-1.5 rounded-[10px] cursor-pointer text-center"
                        style={{ border: active ? '2px solid var(--primary)' : '1px solid var(--border)', background: tone.bg, color: tone.fg }}
                      >
                        <div className="font-bold text-[13px]">{u.unit_label}</div>
                        <div className="text-[11px] mt-0.5">{u.status}</div>
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
              <Badge tone={STATUS_TONE[selected.status].badge}>{selected.status}</Badge>
            </div>
            <div className="text-[13px] mt-1.5" style={{ color: 'var(--muted-foreground)' }}>{selected.house_sqft ? `${selected.house_sqft} 坪` : '坪數未填'}</div>
            <div className="flex gap-5 text-[13px] mt-1.5 flex-wrap" style={{ color: 'var(--muted-foreground)' }}>
              <span>開價 <b className="tabular" style={{ color: 'var(--foreground)' }}>{selected.house_sale_price ? `${selected.house_sale_price} 萬` : '未填'}</b></span>
              <span>單價 <b className="tabular" style={{ color: 'var(--foreground)' }}>{selected.avg_unit_price ? `${selected.avg_unit_price} 萬/坪` : '未填'}</b></span>
              <span>車位 <b style={{ color: 'var(--foreground)' }}>{selected.parking_id || '無'}</b></span>
            </div>
          </div>
          <div className="flex gap-2.5 items-center flex-wrap">
            <Button
              variant="secondary"
              onClick={() => {
                if (selected.linked_customer_id) navigate(`/customers/${selected.linked_customer_id}`);
                else showToast('此戶尚無關聯客戶', 'info');
              }}
            >
              查看客戶
            </Button>
            {canEdit && (
              <select
                value=""
                onChange={(e) => e.target.value && setStatus(selected, e.target.value as Unit['status'])}
                className="text-sm px-3 py-2.5 rounded-xl"
                style={{ border: 'none', background: 'var(--primary)', color: 'var(--primary-foreground)', fontWeight: 700, cursor: 'pointer' }}
              >
                <option value="">標記狀態…</option>
                {SALES_CONTROL_STATUSES.filter((s) => s !== selected.status).map((s) => (
                  <option key={s} value={s} style={{ color: 'initial', background: 'var(--surface)' }}>{s}</option>
                ))}
              </select>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
