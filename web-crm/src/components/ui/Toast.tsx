import { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

type ToastTone = 'success' | 'error' | 'info';
interface ToastItem { id: number; text: string; tone: ToastTone }

const ToastContext = createContext<(text: string, tone?: ToastTone) => void>(() => {});

const TONE_STYLE: Record<ToastTone, { bg: string; fg: string; icon: typeof CheckCircle2 }> = {
  success: { bg: 'var(--success)', fg: '#fff', icon: CheckCircle2 },
  error: { bg: 'var(--danger)', fg: '#fff', icon: AlertCircle },
  info: { bg: 'var(--primary)', fg: 'var(--primary-foreground)', icon: Info },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const show = useCallback((text: string, tone: ToastTone = 'info') => {
    const id = Date.now() + Math.random();
    setItems((prev) => [...prev, { id, text, tone }]);
    setTimeout(() => setItems((prev) => prev.filter((t) => t.id !== id)), 3200);
  }, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 items-center pointer-events-none px-4">
        {items.map((t) => {
          const s = TONE_STYLE[t.tone];
          const Icon = s.icon;
          return (
            <div
              key={t.id}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg pointer-events-auto"
              style={{ background: s.bg, color: s.fg, boxShadow: 'var(--shadow-md)' }}
            >
              <Icon size={16} /> {t.text}
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
