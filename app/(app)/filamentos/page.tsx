"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button, Field, Input } from "@/components/ui/Field";
import type { Filamento } from "@/lib/types";
import { formatBRL } from "@/lib/calc";

const MATERIAIS = ["PLA", "PETG", "ABS", "TPU", "Nylon", "Resina", "Outro"];

export default function FilamentosPage() {
  const supabase = createClient();
  const [alertaPct, setAlertaPct] = useState(0.2);
  const [lista, setLista] = useState<Filamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Filamento | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({
    material: MATERIAIS[0],
    cor_marca: "",
    peso_bobina_g: "1000",
    preco_bobina: "",
    frete: "0",
    estoque_inicial_g: "1000",
  });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCarregando(false);
      return;
    }
    const { data: cfg } = await supabase.from("config").select("alerta_estoque_pct").single();
    if (cfg) setAlertaPct(cfg.alerta_estoque_pct);

    const { data } = await supabase
      .from("filamentos")
      .select("*")
      .eq("usuario_id", user.id)
      .order("criado_em", { ascending: false });
    setLista((data as Filamento[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirNovo() {
    setEditando(null);
    setForm({ material: MATERIAIS[0], cor_marca: "", peso_bobina_g: "1000", preco_bobina: "", frete: "0", estoque_inicial_g: "1000" });
    setMostrarForm(true);
  }

  function abrirEdicao(f: Filamento) {
    setEditando(f);
    setForm({
      material: f.material,
      cor_marca: f.cor_marca ?? "",
      peso_bobina_g: String(f.peso_bobina_g),
      preco_bobina: String(f.preco_bobina),
      frete: String(f.frete),
      estoque_inicial_g: String(f.estoque_inicial_g),
    });
    setMostrarForm(true);
  }

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setSalvando(false);
      return;
    }
    const estoqueInicial = Number(form.estoque_inicial_g) || 0;
    if (editando) {
      await supabase
        .from("filamentos")
        .update({
          material: form.material,
          cor_marca: form.cor_marca || null,
          peso_bobina_g: Number(form.peso_bobina_g) || 1,
          preco_bobina: Number(form.preco_bobina) || 0,
          frete: Number(form.frete) || 0,
          estoque_inicial_g: estoqueInicial,
        })
        .eq("id", editando.id);
    } else {
      await supabase.from("filamentos").insert({
        usuario_id: user.id,
        material: form.material,
        cor_marca: form.cor_marca || null,
        peso_bobina_g: Number(form.peso_bobina_g) || 1,
        preco_bobina: Number(form.preco_bobina) || 0,
        frete: Number(form.frete) || 0,
        estoque_inicial_g: estoqueInicial,
        estoque_atual_g: estoqueInicial,
      });
    }
    setSalvando(false);
    setMostrarForm(false);
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este filamento?")) return;
    await supabase.from("filamentos").delete().eq("id", id);
    carregar();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Filamentos</h1>
          <p className="text-sm text-base-muted mt-1">
            O custo por grama é calculado automaticamente e usado direto na Calculadora.
          </p>
        </div>
        {!mostrarForm && <Button onClick={abrirNovo}>+ Novo filamento</Button>}
      </div>

      {mostrarForm && (
        <Card title={editando ? "Editar filamento" : "Novo filamento"} icon="🧵">
          <form onSubmit={salvar} className="grid sm:grid-cols-2 gap-4">
            <Field label="Material">
              <select value={form.material} onChange={(e) => setForm({ ...form, material: e.target.value })}>
                {MATERIAIS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Cor / marca">
              <Input
                value={form.cor_marca}
                onChange={(e) => setForm({ ...form, cor_marca: e.target.value })}
                placeholder="Ex: Preto - Voolt3D"
              />
            </Field>
            <Field label="Peso da bobina (g)">
              <Input
                type="number"
                value={form.peso_bobina_g}
                onChange={(e) => setForm({ ...form, peso_bobina_g: e.target.value })}
              />
            </Field>
            <Field label="Preço da bobina (R$)">
              <Input
                type="number"
                step="0.01"
                value={form.preco_bobina}
                onChange={(e) => setForm({ ...form, preco_bobina: e.target.value })}
              />
            </Field>
            <Field label="Frete / impostos (R$)">
              <Input type="number" step="0.01" value={form.frete} onChange={(e) => setForm({ ...form, frete: e.target.value })} />
            </Field>
            <Field label={editando ? "Estoque inicial (g) — não altera o estoque atual" : "Estoque inicial (g)"}>
              <Input
                type="number"
                value={form.estoque_inicial_g}
                onChange={(e) => setForm({ ...form, estoque_inicial_g: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Adicionar filamento"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setMostrarForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Estoque de filamentos" icon="📋">
        {carregando ? (
          <p className="text-sm text-base-muted">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-base-muted">Nenhum filamento cadastrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {lista.map((f) => {
              const custoTotal = f.preco_bobina + f.frete;
              const custoG = f.peso_bobina_g > 0 ? custoTotal / f.peso_bobina_g : 0;
              const precisaComprar = f.estoque_atual_g <= f.estoque_inicial_g * alertaPct;
              return (
                <div
                  key={f.id}
                  className="flex items-center justify-between gap-3 border border-base-border rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="font-medium">
                      {f.material} {f.cor_marca && `— ${f.cor_marca}`}
                    </p>
                    <p className="text-xs text-base-muted mt-0.5">
                      {formatBRL(custoG)}/g · estoque atual: {f.estoque_atual_g.toFixed(0)}g de{" "}
                      {f.estoque_inicial_g.toFixed(0)}g
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
                    <div className="flex gap-2">
                      <Button variant="secondary" onClick={() => abrirEdicao(f)}>
                        Editar
                      </Button>
                      <Button variant="danger" onClick={() => excluir(f.id)}>
                        Excluir
                      </Button>
                    </div>
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
