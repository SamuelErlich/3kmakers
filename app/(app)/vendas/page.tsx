"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button, Field, Input, Select } from "@/components/ui/Field";
import { calcularVenda, formatBRL } from "@/lib/calc";
import type { Orcamento, Plataforma } from "@/lib/types";

interface Venda {
  id: string;
  orcamento_id: string;
  usuario_id: string;
  plataforma_id: string | null;
  qtde_vendida: number;
  preco_realizado_unit: number;
  receita: number | null;
  custo_total: number | null;
  lucro: number | null;
  margem: number | null;
  status_pagamento: "aguardando" | "pago" | "parcial" | "cancelado";
  data_venda: string;
  observacoes: string | null;
}

const STATUS_PAGAMENTO_INFO: Record<string, { label: string; cor: string }> = {
  aguardando: { label: "Aguardando", cor: "bg-warn/20 text-warn" },
  pago: { label: "Pago", cor: "bg-good/20 text-good" },
  parcial: { label: "Parcial", cor: "bg-accent/20 text-accent-hover" },
  cancelado: { label: "Cancelado", cor: "bg-bad/20 text-bad" },
};

export default function VendasPage() {
  const supabase = createClient();

  const [pedidosDisponiveis, setPedidosDisponiveis] = useState<Orcamento[]>([]);
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [nomesPeca, setNomesPeca] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);

  const [orcamentoId, setOrcamentoId] = useState("");
  const [plataformaId, setPlataformaId] = useState("");
  const [qtdeVendida, setQtdeVendida] = useState("1");
  const [precoRealizado, setPrecoRealizado] = useState("");
  const [statusPagamento, setStatusPagamento] = useState<"aguardando" | "pago" | "parcial">("pago");
  const [dataVenda, setDataVenda] = useState(new Date().toISOString().slice(0, 10));
  const [observacoes, setObservacoes] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCarregando(false);
      return;
    }

    const { data: plats } = await supabase.from("plataformas").select("*").eq("ativa", true).order("nome");
    setPlataformas((plats as Plataforma[]) ?? []);

    // pedidos que ainda não têm venda registrada (qualquer status exceto cancelado)
    const { data: todosOrcamentos } = await supabase
      .from("orcamentos")
      .select("*")
      .eq("usuario_id", user.id)
      .neq("status", "cancelado")
      .neq("status", "orcamento")
      .order("criado_em", { ascending: false });

    const { data: vendasExistentes } = await supabase.from("vendas").select("orcamento_id");
    const idsComVenda = new Set((vendasExistentes ?? []).map((v: any) => v.orcamento_id));
    setPedidosDisponiveis(((todosOrcamentos as Orcamento[]) ?? []).filter((o) => !idsComVenda.has(o.id)));

    const { data: vendasData } = await supabase
      .from("vendas")
      .select("*")
      .eq("usuario_id", user.id)
      .order("data_venda", { ascending: false });
    setVendas((vendasData as Venda[]) ?? []);

    if (vendasData && vendasData.length > 0) {
      const orcIds = Array.from(new Set(vendasData.map((v: any) => v.orcamento_id)));
      const { data: orcs } = await supabase.from("orcamentos").select("id, nome_peca").in("id", orcIds);
      const mapaNomes: Record<string, string> = {};
      (orcs ?? []).forEach((o: any) => (mapaNomes[o.id] = o.nome_peca));
      setNomesPeca(mapaNomes);
    }

    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orcamentoSelecionado = pedidosDisponiveis.find((o) => o.id === orcamentoId);
  const plataformaSelecionada = plataformas.find((p) => p.id === plataformaId);

  function selecionarOrcamento(id: string) {
    setOrcamentoId(id);
    const o = pedidosDisponiveis.find((x) => x.id === id);
    if (o) {
      setQtdeVendida(String(o.qtde));
      setPrecoRealizado(o.preco_final_unit ? String(o.preco_final_unit.toFixed(2)) : "");
      if (o.incluir_taxa_marketplace && o.plataforma_id) setPlataformaId(o.plataforma_id);
    }
  }

  const previa = useMemo(() => {
    if (!orcamentoSelecionado) return null;
    const custoUnitOriginal =
      orcamentoSelecionado.qtde > 0 ? (orcamentoSelecionado.custo_total ?? 0) / orcamentoSelecionado.qtde : 0;
    return calcularVenda({
      qtde: Number(qtdeVendida) || 0,
      precoUnit: Number(precoRealizado) || 0,
      custoUnit: custoUnitOriginal,
      taxaPercentual: plataformaSelecionada?.taxa_percentual,
      taxaFixa: plataformaSelecionada?.taxa_fixa,
    });
  }, [orcamentoSelecionado, qtdeVendida, precoRealizado, plataformaSelecionada]);

  async function registrarVenda(e: React.FormEvent) {
    e.preventDefault();
    if (!orcamentoSelecionado || !previa) {
      setErro("Escolha um pedido válido.");
      return;
    }
    setSalvando(true);
    setErro(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErro("Sessão expirada.");
      setSalvando(false);
      return;
    }

    const { error: insertErr } = await supabase.from("vendas").insert({
      orcamento_id: orcamentoSelecionado.id,
      usuario_id: user.id,
      plataforma_id: plataformaId || null,
      qtde_vendida: Number(qtdeVendida) || 1,
      preco_realizado_unit: Number(precoRealizado) || 0,
      receita: previa.receita,
      custo_total: previa.custoTotal,
      lucro: previa.lucro,
      margem: previa.margem,
      status_pagamento: statusPagamento,
      data_venda: dataVenda,
      observacoes: observacoes || null,
    });

    if (insertErr) {
      setErro(insertErr.message);
      setSalvando(false);
      return;
    }

    if (orcamentoSelecionado.status !== "entregue") {
      await supabase.from("orcamentos").update({ status: "vendido", atualizado_em: new Date().toISOString() }).eq("id", orcamentoSelecionado.id);
    }

    setOrcamentoId("");
    setPlataformaId("");
    setQtdeVendida("1");
    setPrecoRealizado("");
    setObservacoes("");
    setSalvando(false);
    carregar();
  }

  async function mudarStatusPagamento(v: Venda, status: string) {
    setVendas((old) => old.map((x) => (x.id === v.id ? { ...x, status_pagamento: status as any } : x)));
    await supabase.from("vendas").update({ status_pagamento: status }).eq("id", v.id);
  }

  async function excluirVenda(id: string) {
    if (!confirm("Excluir esta venda? Isso não muda o status do pedido de volta automaticamente.")) return;
    await supabase.from("vendas").delete().eq("id", id);
    carregar();
  }

  const totalReceita = vendas.reduce((acc, v) => acc + (v.receita ?? 0), 0);
  const totalLucro = vendas.reduce((acc, v) => acc + (v.lucro ?? 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Vendas</h1>
        <p className="text-sm text-base-muted mt-1">
          Registre a venda de um Pedido já pronto. O status dele é atualizado sozinho pra "Vendido".
        </p>
      </div>

      <Card title="Registrar venda" icon="💲">
        <form onSubmit={registrarVenda} className="space-y-4">
          <Field label="Pedido" hint="Só aparecem pedidos que ainda não têm venda registrada.">
            <Select value={orcamentoId} onChange={(e) => selecionarOrcamento(e.target.value)}>
              <option value="">Escolha um pedido</option>
              {pedidosDisponiveis.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.nome_peca} {o.cliente ? `— ${o.cliente}` : ""} (qtde {o.qtde})
                </option>
              ))}
            </Select>
          </Field>

          {orcamentoSelecionado && (
            <>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Plataforma">
                  <Select value={plataformaId} onChange={(e) => setPlataformaId(e.target.value)}>
                    <option value="">Venda direta (sem taxa)</option>
                    {plataformas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome} ({(p.taxa_percentual * 100).toFixed(0)}% + {formatBRL(p.taxa_fixa)})
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Data da venda">
                  <Input type="date" required value={dataVenda} onChange={(e) => setDataVenda(e.target.value)} />
                </Field>
                <Field label="Quantidade vendida">
                  <Input type="number" min={1} value={qtdeVendida} onChange={(e) => setQtdeVendida(e.target.value)} />
                </Field>
                <Field label="Preço realizado (unitário)">
                  <Input type="number" step="0.01" value={precoRealizado} onChange={(e) => setPrecoRealizado(e.target.value)} />
                </Field>
                <Field label="Status do pagamento">
                  <Select value={statusPagamento} onChange={(e) => setStatusPagamento(e.target.value as any)}>
                    <option value="pago">Pago</option>
                    <option value="aguardando">Aguardando</option>
                    <option value="parcial">Parcial</option>
                  </Select>
                </Field>
              </div>
              <Field label="Observações (opcional)">
                <Input value={observacoes} onChange={(e) => setObservacoes(e.target.value)} />
              </Field>

              {previa && (
                <div className="rounded-xl bg-base-surface2 p-4 grid sm:grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-base-muted">Receita bruta</span>
                    <span>{formatBRL(previa.receitaBruta)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-muted">Taxa da plataforma</span>
                    <span className="text-warn">-{formatBRL(previa.taxaValor)}</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Receita líquida</span>
                    <span>{formatBRL(previa.receita)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-base-muted">Custo</span>
                    <span>{formatBRL(previa.custoTotal)}</span>
                  </div>
                  <div className="flex justify-between font-medium text-good sm:col-span-2">
                    <span>Lucro ({(previa.margem * 100).toFixed(1)}% de margem)</span>
                    <span>{formatBRL(previa.lucro)}</span>
                  </div>
                </div>
              )}

              {erro && <p className="text-sm text-bad">{erro}</p>}

              <Button type="submit" disabled={salvando}>
                {salvando ? "Registrando..." : "Registrar venda"}
              </Button>
            </>
          )}
        </form>
      </Card>

      <Card title={`Vendas registradas — receita ${formatBRL(totalReceita)} · lucro ${formatBRL(totalLucro)}`} icon="📋">
        {carregando ? (
          <p className="text-sm text-base-muted">Carregando...</p>
        ) : vendas.length === 0 ? (
          <p className="text-sm text-base-muted">Nenhuma venda registrada ainda.</p>
        ) : (
          <div className="space-y-3">
            {vendas.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 border border-base-border rounded-xl px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{nomesPeca[v.orcamento_id] ?? "Peça"}</p>
                  <p className="text-xs text-base-muted mt-0.5">
                    {new Date(v.data_venda + "T00:00:00").toLocaleDateString("pt-BR")} · qtde {v.qtde_vendida} ·{" "}
                    {formatBRL(v.receita)} receita · {formatBRL(v.lucro)} lucro
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Select
                    value={v.status_pagamento}
                    onChange={(e) => mudarStatusPagamento(v, e.target.value)}
                    className={`!w-auto text-xs !py-1.5 ${STATUS_PAGAMENTO_INFO[v.status_pagamento].cor}`}
                  >
                    <option value="pago">Pago</option>
                    <option value="aguardando">Aguardando</option>
                    <option value="parcial">Parcial</option>
                    <option value="cancelado">Cancelado</option>
                  </Select>
                  <Button variant="danger" className="!px-2.5 !py-1 text-xs" onClick={() => excluirVenda(v.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
