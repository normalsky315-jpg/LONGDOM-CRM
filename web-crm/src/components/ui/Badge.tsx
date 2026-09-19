import type { ReactNode } from 'react';

type Tone = 'lake' | 'gold' | 'success' | 'warning' | 'danger' | 'neutral';

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  lake: { bg: 'var(--lake-soft)', fg: 'var(--secondary)' },
  gold: { bg: 'var(--gold-soft)', fg: 'var(--gold)' },
  success: { bg: 'var(--success-soft)', fg: 'var(--success)' },
  warning: { bg: 'var(--warning-soft)', fg: 'var(--warning)' },
  danger: { bg: 'var(--danger-soft)', fg: 'var(--danger)' },
  neutral: { bg: 'var(--muted)', fg: 'var(--muted-foreground)' },
};

export function Badge({ tone = 'lake', children }: { tone?: Tone; children: ReactNode }) {
  const t = TONE_STYLES[tone];
  return (
    <span
      style={{ background: t.bg, color: t.fg }}
      className="text-xs font-bold px-2.5 py-1 rounded-full whitespace-nowrap"
    >
      {children}
    </span>
  );
}
