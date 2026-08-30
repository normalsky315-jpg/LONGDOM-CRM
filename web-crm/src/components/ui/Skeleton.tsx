export function Skeleton({ className = '', style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={`animate-pulse rounded-lg ${className}`}
      style={{ background: 'var(--muted)', ...style }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border p-4 flex flex-col gap-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
      <Skeleton style={{ width: 36, height: 36, borderRadius: 10 }} />
      <Skeleton style={{ width: '60%', height: 14 }} />
      <Skeleton style={{ width: '40%', height: 12 }} />
    </div>
  );
}
