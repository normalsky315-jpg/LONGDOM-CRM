import type { LucideIcon } from 'lucide-react';

type Tone = 'lake' | 'gold' | 'success';

const TONE_STYLES: Record<Tone, { bg: string; fg: string }> = {
  lake: { bg: 'var(--lake-soft)', fg: 'var(--secondary)' },
  gold: { bg: 'var(--gold-soft)', fg: 'var(--gold)' },
  success: { bg: 'var(--success-soft)', fg: 'var(--success)' },
};

export function IconTile({ icon: Icon, tone = 'lake', size = 36 }: { icon: LucideIcon; tone?: Tone; size?: number }) {
  const t = TONE_STYLES[tone];
  return (
    <div
      style={{ width: size, height: size, borderRadius: size * 0.28, background: t.bg, color: t.fg }}
      className="flex items-center justify-center flex-shrink-0"
    >
      <Icon size={size * 0.5} strokeWidth={1.8} />
    </div>
  );
}
