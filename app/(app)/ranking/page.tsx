"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { SegmentedControl } from "@/components/ui/Field";
import { formatBRL } from "@/lib/calc";

const MEDALHAS = ["🥇", "🥈", "🥉"];

export default function RankingPage() {
  const supabase = createClient();
  const [criterio, setCriterio] = useState<"qtde" | "lucro">("lucro");
  const [carregando, setCarregando] = useState(true);
  const [linhas, setLinhas] = useState<{ nome: string; qtde: number; receita: number; lucro: number }[]>([]);

  async function carregar() {
    setCarregando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCarregando(false);
      return;
    }

    const { data: vendasData } = await supabase
      .from("vendas")
      .select("orcamento_id, qtde_vendida, receita, lucro")
      .eq("usuario_id", user.id);

    if (!vendasData || vendasData.length === 0) {
      setLinhas([]);
      setCarregando(false);
      return;
    }

    const orcIds = Array.from(new Set(vendasData.map((v: any) => v.orcamento_id)));
    const { data: orcs } = await supabase.from("orcamentos").select("id, nome_peca").in("id", orcIds);
    const nomePorId: Record<string, string> = {};
    (orcs ?? []).forEach((o: any) => (nomePorId[o.id] = o.nome_peca));

    const agrupado: Record<string, { qtde: number; receita: number; lucro: number }> = {};
    vendasData.forEach((v: any) => {
      const nome = nomePorId[v.orcamento_id] ?? "Peça removida";
      if (!agrupado[nome]) agrupado[nome] = { qtde: 0, receita: 0, lucro: 0 };
      agrupado[nome].qtde += v.qtde_vendida ?? 0;
      agrupado[nome].receita += v.receita ?? 0;
      agrupado[nome].lucro += v.lucro ?? 0;
    });

    setLinhas(Object.entries(agrupado).map(([nome, v]) => ({ nome, ...v })));
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ordenado = useMemo(() => {
    return [...linhas].sort((a, b) => (criterio === "qtde" ? b.qtde - a.qtde : b.lucro - a.lucro));
  }, [linhas, criterio]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Ranking</h1>
        <p className="text-sm text-base-muted mt-1">Seus produtos mais vendidos e mais lucrativos.</p>
      </div>

      <Card>
        <SegmentedControl
          value={criterio}
          onChange={setCriterio}
          options={[
            { value: "lucro", label: "Mais lucrativos" },
            { value: "qtde", label: "Mais vendidos" },
          ]}
        />
      </Card>

      <Card title="Ranking de produtos" icon="🏆">
        {carregando ? (
          <p className="text-sm text-base-muted">Carregando...</p>
        ) : ordenado.length === 0 ? (
          <p className="text-sm text-base-muted">Nenhuma venda registrada ainda.</p>
        ) : (
          <div className="space-y-2">
            {ordenado.map((linha, i) => (
              <div key={linha.nome} className="flex items-center gap-3 border border-base-border rounded-xl px-4 py-3">
                <span className="text-lg w-7 text-center shrink-0">{MEDALHAS[i] ?? `${i + 1}º`}</span>
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{linha.nome}</p>
                  <p className="text-xs text-base-muted">
                    {linha.qtde} unidades · {formatBRL(linha.receita)} em receita
                  </p>
                </div>
                <span className="font-semibold text-good shrink-0">{formatBRL(linha.lucro)}</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
