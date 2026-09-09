"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button, Input, Select } from "@/components/ui/Field";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { STATUS_INFO, STATUS_ORDEM } from "@/lib/status";
import { formatBRL } from "@/lib/calc";
import type { Orcamento, StatusOrcamento } from "@/lib/types";

export default function OrcamentosPage() {
  const supabase = createClient();
  const [lista, setLista] = useState<Orcamento[]>([]);
  const [carregando, setCarregando] = useState(true);

  const [filtroStatus, setFiltroStatus] = useState<string>("todos");
  const [busca, setBusca] = useState("");

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
      .from("orcamentos")
      .select("*")
      .eq("usuario_id", user.id)
      .order("criado_em", { ascending: false });
    setLista((data as Orcamento[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function mudarStatus(id: string, status: StatusOrcamento) {
    setLista((old) => old.map((o) => (o.id === id ? { ...o, status } : o)));
    await supabase.from("orcamentos").update({ status, atualizado_em: new Date().toISOString() }).eq("id", id);
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este orçamento? Essa ação não pode ser desfeita.")) return;
    await supabase.from("orcamentos").delete().eq("id", id);
    carregar();
  }

  async function duplicar(o: Orcamento) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const copia = { ...o };
    delete (copia as any).id;
    delete (copia as any).criado_em;
    delete (copia as any).atualizado_em;
    await supabase.from("orcamentos").insert({
      ...copia,
      usuario_id: user.id,
      nome_peca: `${o.nome_peca} (cópia)`,
      status: "orcamento",
    });
    carregar();
  }

  const listaFiltrada = useMemo(() => {
    return lista.filter((o) => {
      if (filtroStatus !== "todos" && o.status !== filtroStatus) return false;
      if (busca.trim()) {
        const alvo = `${o.nome_peca} ${o.cliente ?? ""}`.toLowerCase();
        if (!alvo.includes(busca.toLowerCase())) return false;
      }
      return true;
    });
  }, [lista, filtroStatus, busca]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Meus Orçamentos</h1>
        <p className="text-sm text-base-muted mt-1">
          Histórico completo. Quando aprovar um orçamento, mude o status para "Em produção" — ele passa a
          aparecer também nos Pedidos.
        </p>
      </div>

      <Card>
        <div className="grid sm:grid-cols-[1fr_200px] gap-3">
          <Input placeholder="Buscar por peça ou cliente..." value={busca} onChange={(e) => setBusca(e.target.value)} />
          <Select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
            <option value="todos">Todos os status</option>
            {STATUS_ORDEM.map((s) => (
              <option key={s} value={s}>
                {STATUS_INFO[s].label}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {carregando ? (
        <p className="text-sm text-base-muted">Carregando...</p>
      ) : listaFiltrada.length === 0 ? (
        <Card>
          <p className="text-sm text-base-muted">Nenhum orçamento encontrado. Comece pela Calculadora.</p>
        </Card>
      ) : (
        <div className="space-y-3">
          {listaFiltrada.map((o) => (
            <Card key={o.id} className="!p-0">
              <div className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
                {o.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={o.foto_url} alt={o.nome_peca} className="w-14 h-14 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-lg bg-base-surface2 flex items-center justify-center text-2xl shrink-0">
                    🧊
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium">{o.nome_peca}</p>
                    <StatusBadge status={o.status} />
                  </div>
                  <p className="text-xs text-base-muted mt-0.5">
                    {o.cliente && `${o.cliente} · `}
                    qtde {o.qtde} · {formatBRL(o.preco_final_unit)}/un
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Select
                    value={o.status}
                    onChange={(e) => mudarStatus(o.id, e.target.value as StatusOrcamento)}
                    className="!w-auto text-xs !py-1.5"
                  >
                    {STATUS_ORDEM.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_INFO[s].label}
                      </option>
                    ))}
                  </Select>
                  <Link href={`/calculadora?editar=${o.id}`}>
                    <Button variant="secondary" className="!px-3 !py-1.5 text-xs">
                      Editar
                    </Button>
                  </Link>
                  <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => duplicar(o)}>
                    Duplicar
                  </Button>
                  <Button variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => excluir(o.id)}>
                    Excluir
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
