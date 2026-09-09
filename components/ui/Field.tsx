import { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Field({
  label,
  hint,
  badge,
  children,
}: {
  label: string;
  hint?: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-base-text">{label}</label>
        {badge}
      </div>
      {children}
      {hint && <p className="text-xs text-base-muted">{hint}</p>}
    </div>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} />;
}

export function Badge({ children, tone = "info" }: { children: ReactNode; tone?: "info" | "new" | "warn" }) {
  const tones: Record<string, string> = {
    info: "bg-accent/20 text-accent-hover",
    new: "bg-good/20 text-good",
    warn: "bg-warn/20 text-warn",
  };
  return (
    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${tones[tone]}`}>{children}</span>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer select-none">
      {label && <span className="text-sm text-base-text">{label}</span>}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
          checked ? "bg-accent" : "bg-base-border"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </label>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`py-2.5 rounded-xl text-sm font-medium transition-colors ${
            value === opt.value
              ? "bg-accent text-white"
              : "bg-base-surface2 text-base-muted border border-base-border"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const variants: Record<string, string> = {
    primary: "bg-accent-gradient text-white hover:opacity-90",
    secondary: "bg-base-surface2 text-base-text border border-base-border hover:border-accent",
    danger: "bg-bad/10 text-bad border border-bad/30 hover:bg-bad/20",
  };
  return (
    <button
      {...props}
      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
