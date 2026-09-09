import type { StatusOrcamento } from "@/lib/types";

export const STATUS_ORDEM: StatusOrcamento[] = [
  "orcamento",
  "em_producao",
  "pronto",
  "vendido",
  "entregue",
  "cancelado",
];

export const STATUS_INFO: Record<StatusOrcamento, { label: string; cor: string; icone: string }> = {
  orcamento: { label: "Orçamento", cor: "bg-base-surface2 text-base-muted border border-base-border", icone: "📝" },
  em_producao: { label: "Em produção", cor: "bg-warn/20 text-warn", icone: "🖨️" },
  pronto: { label: "Pronto", cor: "bg-accent/20 text-accent-hover", icone: "📦" },
  vendido: { label: "Vendido", cor: "bg-good/20 text-good", icone: "💲" },
  entregue: { label: "Entregue", cor: "bg-good/30 text-good", icone: "✅" },
  cancelado: { label: "Cancelado", cor: "bg-bad/20 text-bad", icone: "✖️" },
};

// status que aparecem no board de Pedidos (tudo que já saiu de "orçamento")
export const STATUS_PEDIDO: StatusOrcamento[] = ["em_producao", "pronto", "vendido", "entregue", "cancelado"];

export function proximoStatus(atual: StatusOrcamento): StatusOrcamento | null {
  const i = STATUS_ORDEM.indexOf(atual);
  if (i === -1 || i >= STATUS_ORDEM.length - 2) return null; // não avança automaticamente para "cancelado"
  return STATUS_ORDEM[i + 1];
}

export function statusAnterior(atual: StatusOrcamento): StatusOrcamento | null {
  const i = STATUS_ORDEM.indexOf(atual);
  if (i <= 0) return null;
  const anterior = STATUS_ORDEM[i - 1];
  return anterior === "orcamento" ? null : anterior; // Pedidos não volta pra "orçamento"
}
