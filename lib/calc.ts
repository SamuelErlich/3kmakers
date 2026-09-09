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
 * - O "Lucro desejado (%)" é MARKUP sobre o custo de produção
 *   (material + energia + depreciação da impressora), não margem
 *   sobre o preço final. Ou seja: lucro = custo_producao × (pct/100).
 *   Isso é o que permite o slider ir até 300% sem quebrar a conta —
 *   margem sobre preço final trava perto de 100% (divisão por zero).
 * - Mão de obra, custos extras e frete entram DEPOIS do lucro, sem
 *   markup em cima deles (você já embutiu seu valor/hora ali).
 * - O preço sugerido é sempre um valor UNITÁRIO (tudo dividido pela
 *   quantidade no final).
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

  lucro_desejado_pct: number; // markup sobre o custo de produção, sem limite prático (ex: 150 = 150%)

  incluir_taxa_marketplace: boolean;
  plataforma_taxa_percentual?: number; // 0-1 (ex: 0.20)
  plataforma_taxa_fixa?: number;
}

export interface CalculoResultado {
  consumo_filamento_g: number;
  custo_filamento: number;
  custo_energia: number;
  custo_impressora: number;
  custo_producao_unit: number; // material + energia + depreciação, por unidade
  lucro_unit: number; // markup em cima do custo de produção, por unidade
  custo_mao_obra: number; // total do lote
  custo_total: number; // total do lote (produção + mão de obra + extras + frete)
  preco_sugerido_unit: number;
  preco_sugerido_marketplace_unit: number | null;
}

export function calcularOrcamento(input: CalculoInput): CalculoResultado {
  const qtde = input.qtde > 0 ? input.qtde : 1;
  const tempoImpressaoH = input.tempo_impressao_min / 60;

  // --- filamento (total do lote) ---
  const fatorFalha = 1 + input.taxa_falha_pct / 100;
  const consumo_filamento_g = input.peso_g * qtde * fatorFalha;
  const custo_filamento = consumo_filamento_g * input.filamento_custo_por_g;

  // --- energia (total do lote) ---
  let custo_energia = 0;
  if (input.energia_modo === "medido") {
    const wh = input.energia_wh_total ?? 0;
    custo_energia = (wh / 1000) * input.energia_preco_kwh;
  } else {
    const custoHoraEnergia = (input.energia_preco_kwh * input.impressora_consumo_w) / 1000;
    custo_energia = tempoImpressaoH * custoHoraEnergia;
  }

  // --- depreciação da impressora (total do lote) ---
  const custoHoraImpressora =
    input.impressora_vida_util_horas > 0
      ? input.impressora_valor_compra / input.impressora_vida_util_horas
      : 0;
  const custo_impressora = tempoImpressaoH * custoHoraImpressora;

  // --- custo de produção: base sobre a qual o lucro é calculado ---
  const custo_producao_total = custo_filamento + custo_energia + custo_impressora;
  const custo_producao_unit = custo_producao_total / qtde;

  // --- lucro (markup sobre o custo de produção, por unidade) ---
  const lucro_unit = custo_producao_unit * (input.lucro_desejado_pct / 100);

  // --- mão de obra (pós-processamento, total do lote) — sem markup ---
  const tempoPosH = input.tempo_pos_processamento_min / 60;
  const tempoPosTotalH =
    input.pos_processamento_modo === "peca" ? tempoPosH * qtde : tempoPosH;
  const custo_mao_obra = tempoPosTotalH * input.valor_hora_pessoal;

  // --- custo total do lote (pra relatório/registro, sem lucro) ---
  const custo_total =
    custo_producao_total + custo_mao_obra + input.custos_extra + input.frete;

  // --- preço sugerido (unitário): produção com lucro + mão de obra + extras + frete rateados ---
  const preco_sugerido_unit =
    custo_producao_unit +
    lucro_unit +
    custo_mao_obra / qtde +
    input.custos_extra / qtde +
    input.frete / qtde;

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
    custo_producao_unit,
    lucro_unit,
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

/**
 * Cálculo de uma venda — usado tanto pela tela de Vendas (a partir de um Pedido)
 * quanto pelo botão "Vender" em Meus Produtos (venda direta, sem passar pela
 * Calculadora de novo). Mantido num lugar só pra nunca haver duas fórmulas
 * diferentes calculando a mesma coisa.
 */
export interface CalculoVendaInput {
  qtde: number;
  precoUnit: number;
  custoUnit: number;
  taxaPercentual?: number; // 0-1 (ex: 0.20)
  taxaFixa?: number;
}

export interface CalculoVendaResultado {
  receitaBruta: number;
  taxaValor: number;
  receita: number;
  custoTotal: number;
  lucro: number;
  margem: number;
}

export function calcularVenda(input: CalculoVendaInput): CalculoVendaResultado {
  const qtde = input.qtde > 0 ? input.qtde : 0;
  const receitaBruta = qtde * input.precoUnit;
  const taxaPct = input.taxaPercentual ?? 0;
  const taxaFixa = input.taxaFixa ?? 0;
  const taxaValor = receitaBruta * taxaPct + qtde * taxaFixa;
  const receita = receitaBruta - taxaValor;
  const custoTotal = qtde * input.custoUnit;
  const lucro = receita - custoTotal;
  const margem = receita > 0 ? lucro / receita : 0;
  return { receitaBruta, taxaValor, receita, custoTotal, lucro, margem };
}
