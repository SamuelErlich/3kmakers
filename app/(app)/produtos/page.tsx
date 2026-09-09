"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button, Field, Input, Select } from "@/components/ui/Field";
import { calcularVenda, formatBRL } from "@/lib/calc";
import type { Filamento, Plataforma, Produto } from "@/lib/types";

export default function ProdutosPage() {
  const supabase = createClient();
  const [lista, setLista] = useState<Produto[]>([]);
  const [filamentos, setFilamentos] = useState<Filamento[]>([]);
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    peso_g: "",
    horas: "0",
    minutos: "0",
    filamento_id: "",
    observacoes: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [erroForm, setErroForm] = useState<string | null>(null);

  // ---- venda rápida direto do produto ----
  const [vendendoId, setVendendoId] = useState<string | null>(null);
  const [venda, setVenda] = useState({
    cliente: "",
    plataformaId: "",
    qtde: "1",
    precoRealizado: "",
    statusPagamento: "pago" as "pago" | "aguardando" | "parcial",
    dataVenda: new Date().toISOString().slice(0, 10),
  });
  const [salvandoVenda, setSalvandoVenda] = useState(false);
  const [erroVenda, setErroVenda] = useState<string | null>(null);
  const [vendaConcluidaId, setVendaConcluidaId] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    const [{ data: prods }, { data: fils }, { data: plats }] = await Promise.all([
      supabase.from("produtos").select("*").order("criado_em", { ascending: false }),
      supabase.from("filamentos").select("*").order("material"),
      supabase.from("plataformas").select("*").eq("ativa", true).order("nome"),
    ]);
    setLista((prods as Produto[]) ?? []);
    setFilamentos((fils as Filamento[]) ?? []);
    setPlataformas((plats as Plataforma[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirNovo() {
    setEditando(null);
    setErroForm(null);
    setForm({ nome: "", peso_g: "", horas: "0", minutos: "0", filamento_id: "", observacoes: "" });
    setFoto(null);
    setFotoPreview(null);
    setMostrarForm(true);
  }

  function abrirEdicao(p: Produto) {
    setEditando(p);
    setErroForm(null);
    const min = p.tempo_impressao_min ?? 0;
    setForm({
      nome: p.nome,
      peso_g: p.peso_g ? String(p.peso_g) : "",
      horas: String(Math.floor(min / 60)),
      minutos: String(min % 60),
      filamento_id: p.filamento_id ?? "",
      observacoes: p.observacoes ?? "",
    });
    setFoto(null);
    setFotoPreview(p.foto_url);
    setMostrarForm(true);
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErroForm(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSalvando(false);
      return;
    }

    let fotoUrl = editando?.foto_url ?? null;
    if (foto) {
      const nomeArquivo = `${user.id}/produtos/${Date.now()}-${foto.name}`;
      const { error: upErr } = await supabase.storage.from("pecas").upload(nomeArquivo, foto);
      if (upErr) {
        setErroForm(`Não foi possível enviar a foto (${upErr.message}). Verifique se o bucket "pecas" existe e está público.`);
        setSalvando(false);
        return;
      }
      const { data: pub } = supabase.storage.from("pecas").getPublicUrl(nomeArquivo);
      fotoUrl = pub.publicUrl;
    }

    const payload = {
      nome: form.nome,
      foto_url: fotoUrl,
      peso_g: Number(form.peso_g) || null,
      tempo_impressao_min: (Number(form.horas) || 0) * 60 + (Number(form.minutos) || 0),
      filamento_id: form.filamento_id || null,
      observacoes: form.observacoes || null,
    };

    if (editando) {
      const { error } = await supabase.from("produtos").update(payload).eq("id", editando.id);
      if (error) {
        setErroForm(error.message);
        setSalvando(false);
        return;
      }
    } else {
      const { error } = await supabase.from("produtos").insert({ ...payload, usuario_id: user.id });
      if (error) {
        setErroForm(error.message);
        setSalvando(false);
        return;
      }
    }
    setSalvando(false);
    setMostrarForm(false);
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este produto?")) return;
    await supabase.from("produtos").delete().eq("id", id);
    carregar();
  }

  // ---- venda rápida ----
  function abrirVenda(p: Produto) {
    setVendendoId(p.id);
    setVendaConcluidaId(null);
    setErroVenda(null);
    setVenda({
      cliente: "",
      // já escolhe a primeira plataforma sozinho — senão a taxa fica em 0% e o
      // preço parece "não mudar" até escolher uma (mesmo motivo do bug da Calculadora)
      plataformaId: plataformas.length > 0 ? plataformas[0].id : "",
      qtde: "1",
      precoRealizado: p.preco_final_unit ? p.preco_final_unit.toFixed(2) : "",
      statusPagamento: "pago",
      dataVenda: new Date().toISOString().slice(0, 10),
    });
  }

  function fecharVenda() {
    setVendendoId(null);
    setErroVenda(null);
  }

  const produtoVendendo = lista.find((p) => p.id === vendendoId);
  const plataformaVenda = plataformas.find((p) => p.id === venda.plataformaId);

  const previaVenda = useMemo(() => {
    if (!produtoVendendo || produtoVendendo.custo_unitario == null) return null;
    return calcularVenda({
      qtde: Number(venda.qtde) || 0,
      precoUnit: Number(venda.precoRealizado) || 0,
      custoUnit: produtoVendendo.custo_unitario,
      taxaPercentual: plataformaVenda?.taxa_percentual,
      taxaFixa: plataformaVenda?.taxa_fixa,
    });
  }, [produtoVendendo, venda.qtde, venda.precoRealizado, plataformaVenda]);

  async function confirmarVenda() {
    if (!produtoVendendo || !previaVenda || produtoVendendo.custo_unitario == null) return;
    setSalvandoVenda(true);
    setErroVenda(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setErroVenda("Sessão expirada.");
      setSalvandoVenda(false);
      return;
    }

    const qtdeVendida = Number(venda.qtde) || 1;

    // cria o orçamento já como "vendido" — pula Orçamento/Pedido, direto pro resultado
    const { data: novoOrcamento, error: erroOrcamento } = await supabase
      .from("orcamentos")
      .insert({
        usuario_id: user.id,
        produto_id: produtoVendendo.id,
        nome_peca: produtoVendendo.nome,
        cliente: venda.cliente || null,
        foto_url: produtoVendendo.foto_url,
        qtde: qtdeVendida,
        peso_g: produtoVendendo.peso_g ?? 0,
        tempo_impressao_min: produtoVendendo.tempo_impressao_min ?? 0,
        filamento_id: produtoVendendo.filamento_id,
        lucro_desejado_pct: produtoVendendo.lucro_desejado_pct ?? 0,
        incluir_taxa_marketplace: !!venda.plataformaId,
        plataforma_id: venda.plataformaId || null,
        status: "vendido",
        custo_total: produtoVendendo.custo_unitario * qtdeVendida,
        preco_sugerido_unit: produtoVendendo.preco_final_unit,
        preco_final_unit: produtoVendendo.preco_final_unit,
      })
      .select()
      .single();

    if (erroOrcamento || !novoOrcamento) {
      setErroVenda(erroOrcamento?.message ?? "Não foi possível registrar a venda.");
      setSalvandoVenda(false);
      return;
    }

    const { error: erroVendaInsert } = await supabase.from("vendas").insert({
      orcamento_id: novoOrcamento.id,
      usuario_id: user.id,
      plataforma_id: venda.plataformaId || null,
      qtde_vendida: qtdeVendida,
      preco_realizado_unit: Number(venda.precoRealizado) || 0,
      receita: previaVenda.receita,
      custo_total: previaVenda.custoTotal,
      lucro: previaVenda.lucro,
      margem: previaVenda.margem,
      status_pagamento: venda.statusPagamento,
      data_venda: venda.dataVenda,
    });

    if (erroVendaInsert) {
      setErroVenda(erroVendaInsert.message);
      setSalvandoVenda(false);
      return;
    }

    // desconta o estoque do filamento padrão do produto, se houver
    if (produtoVendendo.filamento_id && produtoVendendo.peso_g) {
      const fil = filamentos.find((f) => f.id === produtoVendendo.filamento_id);
      if (fil) {
        const consumo = produtoVendendo.peso_g * qtdeVendida;
        await supabase
          .from("filamentos")
          .update({ estoque_atual_g: Math.max(fil.estoque_atual_g - consumo, 0) })
          .eq("id", fil.id);
      }
    }

    setSalvandoVenda(false);
    setVendaConcluidaId(produtoVendendo.id);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Meus Produtos</h1>
          <p className="text-sm text-base-muted mt-1">
            Modelos que você já calculou antes — reaproveite na Calculadora ou venda direto, sem recalcular.
          </p>
        </div>
        {!mostrarForm && (
          <Button onClick={abrirNovo} className="shrink-0">
            + Novo produto
          </Button>
        )}
      </div>

      {mostrarForm && (
        <Card title={editando ? "Editar produto" : "Novo produto"} icon="🧩">
          <form onSubmit={salvar} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Nome do produto">
                <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Yoda Baby" />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Foto (opcional)">
                <label className="block border border-dashed border-base-border rounded-xl p-4 text-center cursor-pointer hover:border-accent transition-colors">
                  {fotoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fotoPreview} alt="Prévia" className="mx-auto max-h-32 rounded-lg" />
                  ) : (
                    <p className="text-sm text-accent-hover">Clique para selecionar uma imagem</p>
                  )}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFoto} />
                </label>
              </Field>
            </div>

            <Field label="Peso (g)">
              <Input type="number" step="0.1" value={form.peso_g} onChange={(e) => setForm({ ...form, peso_g: e.target.value })} />
            </Field>
            <Field label="Filamento padrão">
              <Select value={form.filamento_id} onChange={(e) => setForm({ ...form, filamento_id: e.target.value })}>
                <option value="">Nenhum (informar na hora)</option>
                {filamentos.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.material} {f.cor_marca ? `— ${f.cor_marca}` : ""}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Tempo de impressão — horas">
              <Input type="number" min={0} value={form.horas} onChange={(e) => setForm({ ...form, horas: e.target.value })} />
            </Field>
            <Field label="Minutos">
              <Input type="number" min={0} max={59} value={form.minutos} onChange={(e) => setForm({ ...form, minutos: e.target.value })} />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Observações">
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={2}
                />
              </Field>
            </div>

            {!editando && (
              <p className="text-xs text-base-muted sm:col-span-2">
                Cadastrando manualmente aqui, o produto fica <strong>sem preço</strong> — o botão "Vender"
                só funciona em produtos salvos a partir de um cálculo feito na Calculadora.
              </p>
            )}

            {erroForm && <p className="text-sm text-bad sm:col-span-2">{erroForm}</p>}

            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Adicionar produto"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setMostrarForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Produtos cadastrados" icon="📋">
        {carregando ? (
          <p className="text-sm text-base-muted">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-base-muted">
            Nenhum produto salvo ainda. Você também pode salvar um direto da Calculadora depois de calcular.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {lista.map((p) => {
              const temPreco = p.preco_final_unit != null && p.custo_unitario != null;
              const vendaAberta = vendendoId === p.id;
              const vendida = vendaConcluidaId === p.id;
              return (
                <div key={p.id} className="border border-base-border rounded-xl p-3 space-y-3">
                  <div className="flex gap-3">
                    {p.foto_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.foto_url} alt={p.nome} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-base-surface2 flex items-center justify-center text-2xl shrink-0">
                        🧊
                      </div>
                    )}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div>
                        <p className="font-medium truncate">{p.nome}</p>
                        <p className="text-xs text-base-muted">
                          {p.peso_g ? `${p.peso_g}g` : "peso não informado"} ·{" "}
                          {p.tempo_impressao_min ? `${Math.floor(p.tempo_impressao_min / 60)}h${p.tempo_impressao_min % 60}min` : "tempo não informado"}
                        </p>
                        {temPreco ? (
                          <p className="text-sm font-medium text-accent-hover mt-0.5">{formatBRL(p.preco_final_unit)}</p>
                        ) : (
                          <p className="text-xs text-warn mt-0.5">sem preço calculado ainda</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          variant="primary"
                          className="!px-3 !py-1.5 text-xs !bg-good !bg-none"
                          disabled={!temPreco}
                          title={!temPreco ? "Calcule o preço primeiro na Calculadora" : undefined}
                          onClick={() => abrirVenda(p)}
                        >
                          💲 Vender
                        </Button>
                        <Link href={`/calculadora?produto=${p.id}`}>
                          <Button variant="secondary" className="!px-3 !py-1.5 text-xs">
                            Usar na Calculadora
                          </Button>
                        </Link>
                        <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => abrirEdicao(p)}>
                          Editar
                        </Button>
                        <Button variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => excluir(p.id)}>
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>

                  {vendida && (
                    <div className="flex items-center justify-between gap-2 text-good text-sm bg-good/10 rounded-xl px-3 py-2.5">
                      <span>✅ Venda registrada!</span>
                      <Link href="/vendas" className="font-medium underline shrink-0">
                        Ver em Vendas
                      </Link>
                    </div>
                  )}

                  {vendaAberta && !vendida && (
                    <div className="border-t border-base-border pt-3 space-y-3">
                      <div className="grid sm:grid-cols-2 gap-3">
                        <Field label="Quantidade vendida">
                          <Input
                            type="number"
                            min={1}
                            value={venda.qtde}
                            onChange={(e) => setVenda({ ...venda, qtde: e.target.value })}
                          />
                        </Field>
                        <Field label="Preço realizado (unitário)">
                          <Input
                            type="number"
                            step="0.01"
                            value={venda.precoRealizado}
                            onChange={(e) => setVenda({ ...venda, precoRealizado: e.target.value })}
                          />
                        </Field>
                        <Field label="Plataforma">
                          <Select value={venda.plataformaId} onChange={(e) => setVenda({ ...venda, plataformaId: e.target.value })}>
                            <option value="">Venda direta (sem taxa)</option>
                            {plataformas.map((pl) => (
                              <option key={pl.id} value={pl.id}>
                                {pl.nome} ({(pl.taxa_percentual * 100).toFixed(0)}% + {formatBRL(pl.taxa_fixa)})
                              </option>
                            ))}
                          </Select>
                        </Field>
                        <Field label="Data da venda">
                          <Input
                            type="date"
                            value={venda.dataVenda}
                            onChange={(e) => setVenda({ ...venda, dataVenda: e.target.value })}
                          />
                        </Field>
                        <Field label="Cliente (opcional)">
                          <Input value={venda.cliente} onChange={(e) => setVenda({ ...venda, cliente: e.target.value })} />
                        </Field>
                        <Field label="Status do pagamento">
                          <Select
                            value={venda.statusPagamento}
                            onChange={(e) => setVenda({ ...venda, statusPagamento: e.target.value as any })}
                          >
                            <option value="pago">Pago</option>
                            <option value="aguardando">Aguardando</option>
                            <option value="parcial">Parcial</option>
                          </Select>
                        </Field>
                      </div>

                      {previaVenda && (
                        <div className="rounded-xl bg-base-surface2 p-3 flex items-center justify-between text-sm">
                          <span className="text-base-muted">Lucro nessa venda</span>
                          <span className="font-semibold text-good">
                            {formatBRL(previaVenda.lucro)} ({(previaVenda.margem * 100).toFixed(1)}% margem)
                          </span>
                        </div>
                      )}

                      {erroVenda && <p className="text-sm text-bad">{erroVenda}</p>}

                      <div className="flex gap-2">
                        <Button onClick={confirmarVenda} disabled={salvandoVenda} className="!bg-good !bg-none">
                          {salvandoVenda ? "Registrando..." : "Confirmar venda"}
                        </Button>
                        <Button variant="secondary" onClick={fecharVenda}>
                          Cancelar
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
