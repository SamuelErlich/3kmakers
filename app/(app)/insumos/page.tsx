"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button, Field, Input } from "@/components/ui/Field";
import type { Insumo, Papel } from "@/lib/types";
import { formatBRL } from "@/lib/calc";

export default function InsumosPage() {
  const supabase = createClient();
  const [papel, setPapel] = useState<Papel>("operador");
  const [lista, setLista] = useState<Insumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Insumo | null>(null);
  const [form, setForm] = useState({ nome: "", unidade: "un", preco_unitario: "", estoque_atual: "0", estoque_minimo: "0" });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("papel").eq("id", user.id).single();
      setPapel((profile?.papel as Papel) ?? "operador");
    }
    const { data } = await supabase.from("insumos").select("*").order("criado_em", { ascending: false });
    setLista((data as Insumo[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirNovo() {
    setEditando(null);
    setForm({ nome: "", unidade: "un", preco_unitario: "", estoque_atual: "0", estoque_minimo: "0" });
  }

  function abrirEdicao(i: Insumo) {
    setEditando(i);
    setForm({
      nome: i.nome,
      unidade: i.unidade,
      preco_unitario: String(i.preco_unitario),
      estoque_atual: String(i.estoque_atual),
      estoque_minimo: String(i.estoque_minimo),
    });
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const payload = {
      nome: form.nome,
      unidade: form.unidade,
      preco_unitario: Number(form.preco_unitario) || 0,
      estoque_atual: Number(form.estoque_atual) || 0,
      estoque_minimo: Number(form.estoque_minimo) || 0,
    };
    if (editando) {
      await supabase.from("insumos").update(payload).eq("id", editando.id);
    } else {
      await supabase.from("insumos").insert(payload);
    }
    setSalvando(false);
    abrirNovo();
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este insumo?")) return;
    await supabase.from("insumos").delete().eq("id", id);
    carregar();
  }

  const podeEditar = papel === "admin";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Insumos</h1>
        <p className="text-sm text-base-muted mt-1">
          Embalagem, etiqueta, suporte etc. Aqui é só controle de estoque — não entra automaticamente no
          cálculo do orçamento.
        </p>
      </div>

      {podeEditar && (
        <Card title={editando ? "Editar insumo" : "Novo insumo"} icon="📦">
          <form onSubmit={salvar} className="grid sm:grid-cols-2 gap-4">
            <Field label="Nome">
              <Input
                required
                value={form.nome}
                onChange={(e) => setForm({ ...form, nome: e.target.value })}
                placeholder="Ex: Caixa de papelão P"
              />
            </Field>
            <Field label="Unidade">
              <Input value={form.unidade} onChange={(e) => setForm({ ...form, unidade: e.target.value })} placeholder="un, m, par..." />
            </Field>
            <Field label="Preço unitário (R$)">
              <Input
                type="number"
                step="0.01"
                value={form.preco_unitario}
                onChange={(e) => setForm({ ...form, preco_unitario: e.target.value })}
              />
            </Field>
            <Field label="Estoque atual">
              <Input
                type="number"
                value={form.estoque_atual}
                onChange={(e) => setForm({ ...form, estoque_atual: e.target.value })}
              />
            </Field>
            <Field label="Estoque mínimo (alerta)">
              <Input
                type="number"
                value={form.estoque_minimo}
                onChange={(e) => setForm({ ...form, estoque_minimo: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Adicionar insumo"}
              </Button>
              {editando && (
                <Button type="button" variant="secondary" onClick={abrirNovo}>
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </Card>
      )}

      <Card title="Estoque de insumos" icon="📋">
        {carregando ? (
          <p className="text-sm text-base-muted">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-base-muted">Nenhum insumo cadastrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {lista.map((i) => {
              const precisaComprar = i.estoque_atual <= i.estoque_minimo;
              return (
                <div
                  key={i.id}
                  className="flex items-center justify-between gap-3 border border-base-border rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{i.nome}</p>
                    <p className="text-xs text-base-muted mt-0.5">
                      {formatBRL(i.preco_unitario)}/{i.unidade} · estoque: {i.estoque_atual} {i.unidade}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                        precisaComprar ? "bg-warn/20 text-warn" : "bg-good/20 text-good"
                      }`}
                    >
                      {precisaComprar ? "Comprar" : "OK"}
                    </span>
                    {podeEditar && (
                      <div className="flex gap-2">
                        <Button variant="secondary" onClick={() => abrirEdicao(i)}>
                          Editar
                        </Button>
                        <Button variant="danger" onClick={() => excluir(i.id)}>
                          Excluir
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
