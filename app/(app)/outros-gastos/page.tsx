"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button, Field, Input, Select, Toggle } from "@/components/ui/Field";
import { formatBRL } from "@/lib/calc";

const CATEGORIAS = ["Manutenção", "Peças", "Embalagem", "Ferramentas", "Marketing", "Frete", "Software", "Conta fixa", "Outros"];

interface Gasto {
  id: string;
  usuario_id: string;
  data: string;
  categoria: string | null;
  descricao: string | null;
  valor: number;
  pago: boolean;
  observacoes: string | null;
}

export default function OutrosGastosPage() {
  const supabase = createClient();
  const [papel, setPapel] = useState<"admin" | "operador">("operador");
  const [verTodos, setVerTodos] = useState(false);
  const [lista, setLista] = useState<Gasto[]>([]);
  const [nomesUsuarios, setNomesUsuarios] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState({
    data: new Date().toISOString().slice(0, 10),
    categoria: CATEGORIAS[0],
    descricao: "",
    valor: "",
    pago: true,
  });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    let souAdmin = false;
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("papel").eq("id", user.id).single();
      souAdmin = profile?.papel === "admin";
      setPapel(souAdmin ? "admin" : "operador");
    }

    let query = supabase.from("outros_gastos").select("*").order("data", { ascending: false });
    if (!(souAdmin && verTodos) && user) query = query.eq("usuario_id", user.id);
    const { data } = await query;
    setLista((data as Gasto[]) ?? []);

    if (souAdmin && data && data.length > 0) {
      const ids = Array.from(new Set(data.map((g: any) => g.usuario_id)));
      const { data: perfis } = await supabase.from("profiles").select("id, nome").in("id", ids);
      const mapa: Record<string, string> = {};
      (perfis ?? []).forEach((p: any) => (mapa[p.id] = p.nome));
      setNomesUsuarios(mapa);
    }
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verTodos]);

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
    await supabase.from("outros_gastos").insert({
      usuario_id: user.id,
      data: form.data,
      categoria: form.categoria,
      descricao: form.descricao || null,
      valor: Number(form.valor) || 0,
      pago: form.pago,
    });
    setForm({ data: new Date().toISOString().slice(0, 10), categoria: CATEGORIAS[0], descricao: "", valor: "", pago: true });
    setSalvando(false);
    carregar();
  }

  async function alternarPago(g: Gasto) {
    setLista((old) => old.map((x) => (x.id === g.id ? { ...x, pago: !x.pago } : x)));
    await supabase.from("outros_gastos").update({ pago: !g.pago }).eq("id", g.id);
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este gasto?")) return;
    await supabase.from("outros_gastos").delete().eq("id", id);
    carregar();
  }

  const total = lista.reduce((acc, g) => acc + g.valor, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Outros Gastos</h1>
          <p className="text-sm text-base-muted mt-1">Despesas soltas que não entram no cálculo de uma peça específica.</p>
        </div>
        {papel === "admin" && (
          <Toggle checked={verTodos} onChange={setVerTodos} label="Ver de todos" />
        )}
      </div>

      <Card title="Novo gasto" icon="💸">
        <form onSubmit={salvar} className="grid sm:grid-cols-2 gap-4">
          <Field label="Data">
            <Input type="date" required value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </Field>
          <Field label="Categoria">
            <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="Descrição">
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Bico de nozzle 0.4mm" />
            </Field>
          </div>
          <Field label="Valor (R$)">
            <Input type="number" step="0.01" required value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </Field>
          <div className="flex items-end pb-2">
            <Toggle checked={form.pago} onChange={(v) => setForm({ ...form, pago: v })} label="Já pago" />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Adicionar gasto"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={`Gastos registrados — total ${formatBRL(total)}`} icon="📋">
        {carregando ? (
          <p className="text-sm text-base-muted">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-base-muted">Nenhum gasto registrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {lista.map((g) => (
              <div key={g.id} className="flex items-center justify-between gap-3 border border-base-border rounded-xl px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{g.descricao || g.categoria}</p>
                  <p className="text-xs text-base-muted mt-0.5">
                    {new Date(g.data + "T00:00:00").toLocaleDateString("pt-BR")} · {g.categoria}
                    {papel === "admin" && verTodos && nomesUsuarios[g.usuario_id] && ` · ${nomesUsuarios[g.usuario_id]}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-medium">{formatBRL(g.valor)}</span>
                  <button
                    onClick={() => alternarPago(g)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full ${g.pago ? "bg-good/20 text-good" : "bg-warn/20 text-warn"}`}
                  >
                    {g.pago ? "Pago" : "Pendente"}
                  </button>
                  <Button variant="danger" className="!px-2.5 !py-1 text-xs" onClick={() => excluir(g.id)}>
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
