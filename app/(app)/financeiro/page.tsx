"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { createClient } from "@/lib/supabase/client";
import { Card, PlainCard } from "@/components/ui/Card";
import { Select } from "@/components/ui/Field";
import { formatBRL } from "@/lib/calc";

const MESES = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

export default function FinanceiroPage() {
  const supabase = createClient();
  const [ano, setAno] = useState(new Date().getFullYear());
  const [carregando, setCarregando] = useState(true);

  const [vendas, setVendas] = useState<{ data_venda: string; receita: number; custo_total: number; lucro: number }[]>([]);
  const [gastos, setGastos] = useState<{ data: string; valor: number }[]>([]);
  const [investimentoImpressoras, setInvestimentoImpressoras] = useState(0);
  const [investimentoOutros, setInvestimentoOutros] = useState(0);

  async function carregar() {
    setCarregando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setCarregando(false);
      return;
    }

    const inicioAno = `${ano}-01-01`;
    const fimAno = `${ano}-12-31`;

    const { data: vendasData } = await supabase
      .from("vendas")
      .select("data_venda, receita, custo_total, lucro")
      .eq("usuario_id", user.id)
      .gte("data_venda", inicioAno)
      .lte("data_venda", fimAno);
    setVendas((vendasData as any) ?? []);

    const { data: gastosData } = await supabase
      .from("outros_gastos")
      .select("data, valor")
      .eq("usuario_id", user.id)
      .gte("data", inicioAno)
      .lte("data", fimAno);
    setGastos((gastosData as any) ?? []);

    const { data: imps } = await supabase.from("impressoras").select("valor_compra").eq("usuario_id", user.id);
    setInvestimentoImpressoras((imps ?? []).reduce((acc: number, i: any) => acc + (i.valor_compra ?? 0), 0));

    const { data: invsData } = await supabase.from("investimentos").select("valor").eq("usuario_id", user.id);
    setInvestimentoOutros((invsData ?? []).reduce((acc: number, i: any) => acc + (i.valor ?? 0), 0));

    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ano]);

  const totais = useMemo(() => {
    const receita = vendas.reduce((acc, v) => acc + (v.receita ?? 0), 0);
    const custo = vendas.reduce((acc, v) => acc + (v.custo_total ?? 0), 0);
    const outrosGastos = gastos.reduce((acc, g) => acc + (g.valor ?? 0), 0);
    const lucroVendas = vendas.reduce((acc, v) => acc + (v.lucro ?? 0), 0);
    const lucroLiquido = lucroVendas - outrosGastos;
    const investimentoTotal = investimentoImpressoras + investimentoOutros;
    const roi = investimentoTotal > 0 ? lucroLiquido / investimentoTotal : 0;
    return { receita, custo, outrosGastos, lucroLiquido, investimentoTotal, roi };
  }, [vendas, gastos, investimentoImpressoras, investimentoOutros]);

  const dadosGrafico = useMemo(() => {
    return MESES.map((mes, i) => {
      const receitaMes = vendas
        .filter((v) => new Date(v.data_venda + "T00:00:00").getMonth() === i)
        .reduce((acc, v) => acc + (v.receita ?? 0), 0);
      const custoMes = vendas
        .filter((v) => new Date(v.data_venda + "T00:00:00").getMonth() === i)
        .reduce((acc, v) => acc + (v.custo_total ?? 0), 0);
      const gastoMes = gastos
        .filter((g) => new Date(g.data + "T00:00:00").getMonth() === i)
        .reduce((acc, g) => acc + (g.valor ?? 0), 0);
      return {
        mes,
        Receita: Number(receitaMes.toFixed(2)),
        Custo: Number((custoMes + gastoMes).toFixed(2)),
        Lucro: Number((receitaMes - custoMes - gastoMes).toFixed(2)),
      };
    });
  }, [vendas, gastos]);

  const anoAtual = new Date().getFullYear();
  const anos = [anoAtual, anoAtual - 1, anoAtual - 2];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Financeiro</h1>
          <p className="text-sm text-base-muted mt-1">Resumo automático de vendas, custos e lucro.</p>
        </div>
        <Select value={ano} onChange={(e) => setAno(Number(e.target.value))} className="!w-auto">
          {anos.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </Select>
      </div>

      {carregando ? (
        <p className="text-sm text-base-muted">Carregando...</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <PlainCard>
              <p className="text-xs text-base-muted">Receita ({ano})</p>
              <p className="text-xl font-semibold mt-1">{formatBRL(totais.receita)}</p>
            </PlainCard>
            <PlainCard>
              <p className="text-xs text-base-muted">Custo total ({ano})</p>
              <p className="text-xl font-semibold mt-1">{formatBRL(totais.custo + totais.outrosGastos)}</p>
            </PlainCard>
            <PlainCard>
              <p className="text-xs text-base-muted">Lucro líquido ({ano})</p>
              <p className={`text-xl font-semibold mt-1 ${totais.lucroLiquido >= 0 ? "text-good" : "text-bad"}`}>
                {formatBRL(totais.lucroLiquido)}
              </p>
            </PlainCard>
            <PlainCard>
              <p className="text-xs text-base-muted">ROI sobre investimento</p>
              <p className="text-xl font-semibold mt-1">{(totais.roi * 100).toFixed(1)}%</p>
              <p className="text-xs text-base-muted mt-0.5">investido: {formatBRL(totais.investimentoTotal)}</p>
            </PlainCard>
          </div>

          <Card title={`Evolução mensal — ${ano}`} icon="📊">
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosGrafico}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#232b3a" />
                  <XAxis dataKey="mes" stroke="#8b93a7" fontSize={12} />
                  <YAxis stroke="#8b93a7" fontSize={12} tickFormatter={(v) => `R$${v}`} />
                  <Tooltip
                    contentStyle={{ background: "#161c29", border: "1px solid #232b3a", borderRadius: 8 }}
                    formatter={(value: any) => formatBRL(Number(value))}
                  />
                  <Legend />
                  <Bar dataKey="Receita" fill="#4f6df5" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Custo" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Lucro" fill="#22c55e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
