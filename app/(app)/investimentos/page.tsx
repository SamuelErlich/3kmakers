"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button, Field, Input, Toggle } from "@/components/ui/Field";
import { formatBRL } from "@/lib/calc";

interface Investimento {
  id: string;
  usuario_id: string;
  descricao: string;
  categoria: string | null;
  valor: number;
  data: string;
  observacoes: string | null;
}

export default function InvestimentosPage() {
  const supabase = createClient();
  const [papel, setPapel] = useState<"admin" | "operador">("operador");
  const [verTodos, setVerTodos] = useState(false);
  const [lista, setLista] = useState<Investimento[]>([]);
  const [nomesUsuarios, setNomesUsuarios] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [form, setForm] = useState({
    descricao: "",
    categoria: "",
    valor: "",
    data: new Date().toISOString().slice(0, 10),
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
    let query = supabase.from("investimentos").select("*").order("data", { ascending: false });
    if (!(souAdmin && verTodos) && user) query = query.eq("usuario_id", user.id);
    const { data } = await query;
    setLista((data as Investimento[]) ?? []);

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
    await supabase.from("investimentos").insert({
      usuario_id: user.id,
      descricao: form.descricao,
      categoria: form.categoria || null,
      valor: Number(form.valor) || 0,
      data: form.data,
    });
    setForm({ descricao: "", categoria: "", valor: "", data: new Date().toISOString().slice(0, 10) });
    setSalvando(false);
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este investimento?")) return;
    await supabase.from("investimentos").delete().eq("id", id);
    carregar();
  }

  const total = lista.reduce((acc, i) => acc + i.valor, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Investimentos</h1>
          <p className="text-sm text-base-muted mt-1">
            Aportes de capital — impressora nova, upgrade, ferramentas. Separado do gasto operacional do dia a dia.
          </p>
        </div>
        {papel === "admin" && <Toggle checked={verTodos} onChange={setVerTodos} label="Ver de todos" />}
      </div>

      <Card title="Novo investimento" icon="📈">
        <form onSubmit={salvar} className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <Field label="Descrição">
              <Input required value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex: Segunda impressora Bambu Lab A1" />
            </Field>
          </div>
          <Field label="Categoria (opcional)">
            <Input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Ex: Equipamento" />
          </Field>
          <Field label="Valor (R$)">
            <Input type="number" step="0.01" required value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          </Field>
          <Field label="Data">
            <Input type="date" required value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={salvando}>
              {salvando ? "Salvando..." : "Adicionar investimento"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={`Investimentos registrados — total ${formatBRL(total)}`} icon="📋">
        {carregando ? (
          <p className="text-sm text-base-muted">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-base-muted">Nenhum investimento registrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {lista.map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 border border-base-border rounded-xl px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium truncate">{i.descricao}</p>
                  <p className="text-xs text-base-muted mt-0.5">
                    {new Date(i.data + "T00:00:00").toLocaleDateString("pt-BR")}
                    {i.categoria && ` · ${i.categoria}`}
                    {papel === "admin" && verTodos && nomesUsuarios[i.usuario_id] && ` · ${nomesUsuarios[i.usuario_id]}`}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="font-medium">{formatBRL(i.valor)}</span>
                  <Button variant="danger" className="!px-2.5 !py-1 text-xs" onClick={() => excluir(i.id)}>
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
