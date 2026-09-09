"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Field";
import { STATUS_INFO, STATUS_PEDIDO, proximoStatus, statusAnterior } from "@/lib/status";
import { formatBRL } from "@/lib/calc";
import type { Orcamento, Papel, StatusOrcamento } from "@/lib/types";

export default function PedidosPage() {
  const supabase = createClient();
  const [papel, setPapel] = useState<Papel>("operador");
  const [lista, setLista] = useState<Orcamento[]>([]);
  const [nomesUsuarios, setNomesUsuarios] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);

  async function carregar() {
    setCarregando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("papel").eq("id", user.id).single();
      setPapel((profile?.papel as Papel) ?? "operador");
    }

    const { data } = await supabase
      .from("orcamentos")
      .select("*")
      .in("status", STATUS_PEDIDO)
      .order("atualizado_em", { ascending: false });
    setLista((data as Orcamento[]) ?? []);

    if (data && data.length > 0) {
      const ids = Array.from(new Set(data.map((o: any) => o.usuario_id)));
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
  }, []);

  async function moverPara(id: string, status: StatusOrcamento) {
    setLista((old) => old.map((o) => (o.id === id ? { ...o, status } : o)));
    await supabase.from("orcamentos").update({ status, atualizado_em: new Date().toISOString() }).eq("id", id);
  }

  if (carregando) return <p className="text-sm text-base-muted">Carregando...</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Pedidos</h1>
        <p className="text-sm text-base-muted mt-1">
          Tudo que já foi aprovado (a partir de "Em produção"). Pra aprovar um orçamento novo, mude o status em
          Meus Orçamentos.
        </p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:mx-0 sm:px-0">
        {STATUS_PEDIDO.map((status) => {
          const cards = lista.filter((o) => o.status === status);
          return (
            <div key={status} className="w-72 shrink-0 space-y-3">
              <div className="flex items-center justify-between px-1">
                <h2 className="text-sm font-medium flex items-center gap-1.5">
                  {STATUS_INFO[status].icone} {STATUS_INFO[status].label}
                </h2>
                <span className="text-xs text-base-muted bg-base-surface2 px-2 py-0.5 rounded-full">
                  {cards.length}
                </span>
              </div>

              <div className="space-y-3">
                {cards.map((o) => {
                  const proximo = proximoStatus(o.status);
                  const anterior = statusAnterior(o.status);
                  return (
                    <div key={o.id} className="rounded-xl border border-base-border bg-base-surface p-3 space-y-2">
                      <div className="flex gap-2">
                        {o.foto_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={o.foto_url} alt={o.nome_peca} className="w-10 h-10 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-base-surface2 flex items-center justify-center text-lg shrink-0">
                            🧊
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{o.nome_peca}</p>
                          <p className="text-xs text-base-muted truncate">{o.cliente || "sem cliente"}</p>
                        </div>
                      </div>
                      <p className="text-xs text-base-muted">
                        qtde {o.qtde} · {formatBRL(o.preco_final_unit)}/un
                        {papel === "admin" && nomesUsuarios[o.usuario_id] && (
                          <span className="block">por {nomesUsuarios[o.usuario_id]}</span>
                        )}
                      </p>
                      <div className="flex gap-1.5 pt-1">
                        {anterior && (
                          <Button variant="secondary" className="!px-2 !py-1 text-xs flex-1" onClick={() => moverPara(o.id, anterior)}>
                            ◀ Voltar
                          </Button>
                        )}
                        {proximo && (
                          <Button variant="primary" className="!px-2 !py-1 text-xs flex-1" onClick={() => moverPara(o.id, proximo)}>
                            Avançar ▶
                          </Button>
                        )}
                        {status !== "cancelado" && (
                          <Button variant="danger" className="!px-2 !py-1 text-xs" onClick={() => moverPara(o.id, "cancelado")}>
                            ✖
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
                {cards.length === 0 && (
                  <p className="text-xs text-base-faint text-center py-6 border border-dashed border-base-border rounded-xl">
                    Nada aqui
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
