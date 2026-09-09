import { ReactNode } from "react";

export function Card({
  title,
  icon,
  children,
  className = "",
}: {
  title?: string;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-base-border bg-base-surface overflow-hidden ${className}`}>
      {title && (
        <div className="bg-accent-gradient px-5 py-3.5 flex items-center gap-2.5">
          {icon}
          <h2 className="text-white font-semibold text-[15px]">{title}</h2>
        </div>
      )}
      <div className="p-5 space-y-5">{children}</div>
    </div>
  );
}

export function PlainCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-2xl border border-base-border bg-base-surface p-5 ${className}`}>
      {children}
    </div>
  );
}
