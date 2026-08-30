import { useEffect, useState } from 'react';
import { CheckSquare, Square } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { getTasks, updateTaskStatus, GAS_URL } from '../lib/gasClient';
import { useToast } from '../components/ui/Toast';

interface Task {
  task_id: string;
  title: string;
  due_date: string;
  status: '待處理' | '已完成';
}

const MOCK_TASKS: Task[] = [
  { task_id: 't1', title: '致電李先生確認今日簽約時間', due_date: '今天 14:00', status: '待處理' },
  { task_id: 't2', title: '準備陳小姐貸款試算資料', due_date: '明天', status: '待處理' },
  { task_id: 't3', title: '林小姐二訪邀約簡訊', due_date: '已完成', status: '已完成' },
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
    const nextStatus = t.status === '已完成' ? '待處理' : '已完成';
    const prevTasks = tasks;
    setTasks((prev) => (prev || []).map((x) => (x.task_id === t.task_id ? { ...x, status: nextStatus } : x)));

    if (!GAS_URL) {
      showToast(nextStatus === '已完成' ? '任務已完成' : '已重新標記為待處理', 'success');
      return;
    }
    try {
      const res: any = await updateTaskStatus({ task_id: t.task_id, status: nextStatus });
      if (!res?.ok) {
        setTasks(prevTasks);
        showToast(res?.error || '更新失敗，狀態已還原', 'error');
        return;
      }
      showToast(nextStatus === '已完成' ? '任務已完成' : '已重新標記為待處理', 'success');
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
              aria-label={t.status === '已完成' ? '標記為待處理' : '標記為已完成'}
            >
              {t.status === '已完成' ? <CheckSquare size={20} color="var(--success)" /> : <Square size={20} color="var(--muted-foreground)" />}
            </button>
            <div className="flex-1">
              <div
                className="text-sm font-semibold"
                style={{ color: 'var(--foreground)', textDecoration: t.status === '已完成' ? 'line-through' : 'none' }}
              >
                {t.title}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted-foreground)' }}>{t.due_date}</div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
