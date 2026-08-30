import { useEffect, useState } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { getTasks, updateTaskStatus, GAS_URL } from '../lib/gasClient';
import { useToast } from '../components/ui/Toast';

// 狀態欄位對照 Task_List 實際值（CONFIG.STATUS: pending/done，英文
// 列舉，不是中文字串）。updateTaskStatus 沒有做白名單檢查，送中文字串
// 進去後端一樣會「成功」寫入，但寫進表裡的值跟 jltx.html 自己寫的
// pending/done 對不起來，之後任何依 status==='pending' 做的排序/篩選
// （getTasks 本身的排序就是這樣判斷）都會失準——這是那種後端不會報錯、
// 但資料默默壞掉的漏洞。
interface Task {
  task_id: string;
  title: string;
  due_date: string;
  status: 'pending' | 'done';
}

const STATUS_LABEL: Record<Task['status'], string> = { pending: '待處理', done: '已完成' };

const MOCK_TASKS: Task[] = [
  { task_id: 't1', title: '致電李先生確認今日簽約時間', due_date: '今天 14:00', status: 'pending' },
  { task_id: 't2', title: '準備陳小姐貸款試算資料', due_date: '明天', status: 'pending' },
  { task_id: 't3', title: '林小姐二訪邀約簡訊', due_date: '已完成', status: 'done' },
];

export function Tasks() {
  const showToast = useToast();
  const [tasks, setTasks] = useState<Task[] | null>(null);

  useEffect(() => {
    (async () => {
      if (!GAS_URL) {
        setTasks(MOCK_TASKS);
        return;
      }
      try {
        const res = await getTasks();
        setTasks(res?.data || MOCK_TASKS);
      } catch {
        setTasks(MOCK_TASKS);
      }
    })();
  }, []);

  const toggle = async (t: Task) => {
    const nextStatus: Task['status'] = t.status === 'done' ? 'pending' : 'done';
    const prevTasks = tasks;
    setTasks((prev) => (prev || []).map((x) => (x.task_id === t.task_id ? { ...x, status: nextStatus } : x)));

    if (!GAS_URL) {
      showToast(nextStatus === 'done' ? '任務已完成' : '已重新標記為待處理', 'success');
      return;
    }
    try {
      const res: any = await updateTaskStatus({ task_id: t.task_id, status: nextStatus });
      if (!res?.ok) {
        setTasks(prevTasks);
        showToast(res?.error || '更新失敗，狀態已還原', 'error');
        return;
      }
      showToast(nextStatus === 'done' ? '任務已完成' : '已重新標記為待處理', 'success');
    } catch {
      setTasks(prevTasks);
      showToast('連線失敗，狀態已還原', 'error');
    }
  };

  return (
    <div>
      <h2 className="brand-font font-bold text-[22px] m-0 mb-4.5" style={{ color: 'var(--foreground)' }}>任務管理</h2>
      <div className="flex flex-col gap-2.5">
        {(tasks || []).map((t) => (
          <Card key={t.task_id} className="p-4 flex items-center gap-3">
            <button
              onClick={() => toggle(t)}
              className="bg-transparent border-none cursor-pointer p-0 flex items-center justify-center flex-shrink-0"
              aria-label={t.status === 'done' ? '標記為待處理' : '標記為已完成'}
            >
              {t.status === 'done' ? <CheckSquare size={20} color="var(--success)" /> : <Square size={20} color="var(--muted-foreground)" />}
            </button>
            <div className="flex-1">
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--foreground)', textDecoration: t.status === 'done' ? 'line-through' : 'none' }}
              >
                {t.title}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{t.due_date}・{STATUS_LABEL[t.status]}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
