import type { ButtonHTMLAttributes } from 'react';
import clsx from '../../lib/clsx';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

const BASE = 'inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold px-4 py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer';

export function Button({
  variant = 'secondary',
  className,
  style,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  const variantStyle: Record<Variant, React.CSSProperties> = {
    primary: { background: 'var(--primary)', color: 'var(--primary-foreground)', border: 'none' },
    secondary: { background: 'var(--surface)', color: 'var(--foreground)', border: '1px solid var(--border)' },
    ghost: { background: 'var(--lake-soft)', color: 'var(--secondary)', border: 'none' },
    danger: { background: 'var(--danger-soft)', color: 'var(--danger)', border: 'none' },
  };
  return <button className={clsx(BASE, className)} style={{ ...variantStyle[variant], ...style }} {...rest} />;
}
