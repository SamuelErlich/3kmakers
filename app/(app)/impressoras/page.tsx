"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button, Field, Input } from "@/components/ui/Field";
import type { Impressora } from "@/lib/types";
import { formatBRL } from "@/lib/calc";

export default function ImpressorasPage() {
  const supabase = createClient();
  const [lista, setLista] = useState<Impressora[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Impressora | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [form, setForm] = useState({ nome: "", valor_compra: "", vida_util_horas: "5000", consumo_w: "200" });
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
    const { data } = await supabase
      .from("impressoras")
      .select("*")
      .eq("usuario_id", user.id)
      .order("criado_em", { ascending: false });
    setLista((data as Impressora[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirNova() {
    setEditando(null);
    setForm({ nome: "", valor_compra: "", vida_util_horas: "5000", consumo_w: "200" });
    setMostrarForm(true);
  }

  function abrirEdicao(imp: Impressora) {
    setEditando(imp);
    setForm({
      nome: imp.nome,
      valor_compra: String(imp.valor_compra),
      vida_util_horas: String(imp.vida_util_horas),
      consumo_w: String(imp.consumo_w),
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
    const payload = {
      nome: form.nome,
      valor_compra: Number(form.valor_compra) || 0,
      vida_util_horas: Number(form.vida_util_horas) || 1,
      consumo_w: Number(form.consumo_w) || 0,
    };
    if (editando) {
      await supabase.from("impressoras").update(payload).eq("id", editando.id);
    } else {
      await supabase.from("impressoras").insert({ ...payload, usuario_id: user.id });
    }
    setSalvando(false);
    setMostrarForm(false);
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta impressora?")) return;
    await supabase.from("impressoras").delete().eq("id", id);
    carregar();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Impressoras</h1>
          <p className="text-sm text-base-muted mt-1">
            O custo de máquina por hora é calculado automaticamente (valor ÷ vida útil).
          </p>
        </div>
        {!mostrarForm && <Button onClick={abrirNova}>+ Nova impressora</Button>}
      </div>

      {mostrarForm && (
        <Card title={editando ? "Editar impressora" : "Nova impressora"} icon="🖨️">
          <form onSubmit={salvar} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Nome / modelo">
                <Input
                  required
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  placeholder="Ex: Bambu Lab A1"
                />
              </Field>
            </div>
            <Field label="Valor de compra (R$)">
              <Input
                type="number"
                step="0.01"
                required
                value={form.valor_compra}
                onChange={(e) => setForm({ ...form, valor_compra: e.target.value })}
              />
            </Field>
            <Field label="Vida útil estimada (horas)">
              <Input
                type="number"
                required
                value={form.vida_util_horas}
                onChange={(e) => setForm({ ...form, vida_util_horas: e.target.value })}
              />
            </Field>
            <Field label="Consumo médio (W)">
              <Input
                type="number"
                required
                value={form.consumo_w}
                onChange={(e) => setForm({ ...form, consumo_w: e.target.value })}
              />
            </Field>
            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Adicionar impressora"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setMostrarForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Impressoras cadastradas" icon="📋">
        {carregando ? (
          <p className="text-sm text-base-muted">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-base-muted">Nenhuma impressora cadastrada ainda.</p>
        ) : (
          <div className="space-y-3">
            {lista.map((imp) => {
              const custoHora = imp.vida_util_horas > 0 ? imp.valor_compra / imp.vida_util_horas : 0;
              return (
                <div
                  key={imp.id}
                  className="flex items-center justify-between gap-3 border border-base-border rounded-xl px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{imp.nome}</p>
                    <p className="text-xs text-base-muted mt-0.5">
                      {formatBRL(imp.valor_compra)} · {imp.vida_util_horas}h de vida útil ·{" "}
                      {imp.consumo_w}W · custo/h: {formatBRL(custoHora)}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button variant="secondary" onClick={() => abrirEdicao(imp)}>
                      Editar
                    </Button>
                    <Button variant="danger" onClick={() => excluir(imp.id)}>
                      Excluir
                    </Button>
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
