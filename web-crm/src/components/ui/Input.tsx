import type { InputHTMLAttributes, SelectHTMLAttributes, LabelHTMLAttributes } from 'react';

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label style={{ color: 'var(--muted-foreground)' }} className="text-xs font-semibold">
        {label}
      </label>
      {children}
    </div>
  );
}

const fieldStyle: React.CSSProperties = {
  border: '1px solid var(--border)',
  background: 'var(--surface)',
  color: 'var(--foreground)',
  borderRadius: 'var(--radius-md)',
};

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...fieldStyle, ...props.style }} className={`px-3.5 py-2.5 text-sm w-full ${props.className || ''}`} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      style={{ ...fieldStyle, appearance: 'none', ...props.style }}
      className={`px-3.5 py-2.5 text-sm w-full ${props.className || ''}`}
    />
  );
}

export function LabelText(props: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label {...props} className={`text-xs font-semibold ${props.className || ''}`} style={{ color: 'var(--muted-foreground)' }} />;
}
