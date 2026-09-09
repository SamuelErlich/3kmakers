export type Papel = "admin" | "operador";

export interface Profile {
  id: string;
  nome: string;
  empresa_nome: string | null;
  papel: Papel;
  criado_em: string;
}

export interface Config {
  id: 1;
  custo_mao_obra_hora: number;
  margem_padrao: number;
  alerta_estoque_pct: number;
}

export interface Impressora {
  id: string;
  nome: string;
  valor_compra: number;
  vida_util_horas: number;
  consumo_w: number;
  ativa: boolean;
}

export interface Filamento {
  id: string;
  material: string;
  cor_marca: string | null;
  peso_bobina_g: number;
  preco_bobina: number;
  frete: number;
  estoque_inicial_g: number;
  estoque_atual_g: number;
}

export interface Insumo {
  id: string;
  nome: string;
  unidade: string;
  preco_unitario: number;
  estoque_atual: number;
  estoque_minimo: number;
}

export interface Plataforma {
  id: string;
  nome: string;
  taxa_percentual: number;
  taxa_fixa: number;
  ativa: boolean;
}

export type StatusOrcamento =
  | "orcamento"
  | "em_producao"
  | "pronto"
  | "vendido"
  | "entregue"
  | "cancelado";

export interface Produto {
  id: string;
  usuario_id: string;
  nome: string;
  foto_url: string | null;
  peso_g: number | null;
  tempo_impressao_min: number | null;
  filamento_id: string | null;
  observacoes: string | null;
  custo_unitario: number | null;
  preco_final_unit: number | null;
  lucro_desejado_pct: number | null;
  criado_em: string;
}

export interface Orcamento {
  id: string;
  usuario_id: string;
  produto_id: string | null;
  nome_peca: string;
  cliente: string | null;
  foto_url: string | null;
  qtde: number;
  peso_g: number;
  link_stl: string | null;
  observacoes: string | null;
  tempo_impressao_min: number;
  impressora_id: string | null;
  energia_modo: "consumo" | "medido";
  energia_preco_kwh: number;
  energia_wh_total: number | null;
  filamento_id: string | null;
  filamento_preco_kg_manual: number | null;
  taxa_falha_pct: number;
  valor_hora_pessoal: number;
  pos_processamento_modo: "peca" | "lote";
  tempo_pos_processamento_min: number;
  custos_extra: number;
  frete: number;
  lucro_desejado_pct: number;
  incluir_taxa_marketplace: boolean;
  plataforma_id: string | null;
  status: StatusOrcamento;
  data_entrega_prevista: string | null;
  consumo_filamento_g: number | null;
  custo_filamento: number | null;
  custo_energia: number | null;
  custo_impressora: number | null;
  custo_mao_obra: number | null;
  custo_total: number | null;
  preco_sugerido_unit: number | null;
  preco_sugerido_marketplace_unit: number | null;
  preco_final_unit: number | null;
  criado_em: string;
  atualizado_em: string;
}
