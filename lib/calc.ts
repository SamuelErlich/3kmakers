/**
 * Motor de cálculo da Calculadora.
 *
 * Premissas (documentadas aqui de propósito, porque mudam o resultado):
 * - "Tempo de impressão" é o tempo TOTAL do trabalho na impressora
 *   (todas as peças da mesa juntas), NÃO multiplicado pela quantidade.
 *   Isso é o que acontece na prática: você imprime várias peças na
 *   mesma mesa e paga o tempo de máquina uma vez só.
 * - "Peso" é o peso de 1 peça. O consumo de filamento é multiplicado
 *   pela quantidade.
 * - Pós-processamento "por peça" multiplica pela quantidade;
 *   "total do lote" não multiplica (é o tempo already do lote todo).
 * - O preço sugerido é sempre um valor UNITÁRIO (custo total do lote
 *   dividido pela quantidade, depois aplicada a margem).
 */

export interface CalculoInput {
  qtde: number;
  peso_g: number;
  taxa_falha_pct: number; // 0-100

  tempo_impressao_min: number;

  // impressora
  impressora_valor_compra: number;
  impressora_vida_util_horas: number;
  impressora_consumo_w: number;

  // energia
  energia_modo: "consumo" | "medido";
  energia_preco_kwh: number;
  energia_wh_total?: number | null; // usado só se modo = "medido"

  // filamento
  filamento_custo_por_g: number; // já resolvido (do estoque ou manual)

  // mão de obra / pós-processamento
  valor_hora_pessoal: number;
  pos_processamento_modo: "peca" | "lote";
  tempo_pos_processamento_min: number;

  custos_extra: number;
  frete: number;

  lucro_desejado_pct: number; // 0-100

  incluir_taxa_marketplace: boolean;
  plataforma_taxa_percentual?: number; // 0-1 (ex: 0.20)
  plataforma_taxa_fixa?: number;
}

export interface CalculoResultado {
  consumo_filamento_g: number;
  custo_filamento: number;
  custo_energia: number;
  custo_impressora: number;
  custo_mao_obra: number;
  custo_total: number;
  preco_sugerido_unit: number;
  preco_sugerido_marketplace_unit: number | null;
}

export function calcularOrcamento(input: CalculoInput): CalculoResultado {
  const qtde = input.qtde > 0 ? input.qtde : 1;
  const tempoImpressaoH = input.tempo_impressao_min / 60;

  // --- filamento ---
  const fatorFalha = 1 + input.taxa_falha_pct / 100;
  const consumo_filamento_g = input.peso_g * qtde * fatorFalha;
  const custo_filamento = consumo_filamento_g * input.filamento_custo_por_g;

  // --- energia ---
  let custo_energia = 0;
  if (input.energia_modo === "medido") {
    const wh = input.energia_wh_total ?? 0;
    custo_energia = (wh / 1000) * input.energia_preco_kwh;
  } else {
    const custoHoraEnergia = (input.energia_preco_kwh * input.impressora_consumo_w) / 1000;
    custo_energia = tempoImpressaoH * custoHoraEnergia;
  }

  // --- depreciação da impressora ---
  const custoHoraImpressora =
    input.impressora_vida_util_horas > 0
      ? input.impressora_valor_compra / input.impressora_vida_util_horas
      : 0;
  const custo_impressora = tempoImpressaoH * custoHoraImpressora;

  // --- mão de obra (pós-processamento) ---
  const tempoPosH = input.tempo_pos_processamento_min / 60;
  const tempoPosTotalH =
    input.pos_processamento_modo === "peca" ? tempoPosH * qtde : tempoPosH;
  const custo_mao_obra = tempoPosTotalH * input.valor_hora_pessoal;

  // --- total ---
  const custo_total =
    custo_filamento +
    custo_energia +
    custo_impressora +
    custo_mao_obra +
    input.custos_extra +
    input.frete;

  // --- preço sugerido (unitário) ---
  const margem = Math.min(Math.max(input.lucro_desejado_pct / 100, 0), 0.9999);
  const custoUnitario = custo_total / qtde;
  const preco_sugerido_unit = margem < 1 ? custoUnitario / (1 - margem) : custoUnitario;

  // --- preço sugerido com taxa de marketplace ---
  let preco_sugerido_marketplace_unit: number | null = null;
  if (input.incluir_taxa_marketplace) {
    const taxaPct = input.plataforma_taxa_percentual ?? 0;
    const taxaFixa = input.plataforma_taxa_fixa ?? 0;
    const base = preco_sugerido_unit + taxaFixa;
    preco_sugerido_marketplace_unit = taxaPct < 1 ? base / (1 - taxaPct) : base;
  }

  return {
    consumo_filamento_g,
    custo_filamento,
    custo_energia,
    custo_impressora,
    custo_mao_obra,
    custo_total,
    preco_sugerido_unit,
    preco_sugerido_marketplace_unit,
  };
}

export function formatBRL(valor: number | null | undefined): string {
  if (valor === null || valor === undefined || Number.isNaN(valor)) return "R$ 0,00";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
