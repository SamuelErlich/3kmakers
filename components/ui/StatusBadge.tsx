import { STATUS_INFO } from "@/lib/status";
import type { StatusOrcamento } from "@/lib/types";

export function StatusBadge({ status }: { status: StatusOrcamento }) {
  const info = STATUS_INFO[status];
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${info.cor}`}>
      {info.icone} {info.label}
    </span>
  );
}
