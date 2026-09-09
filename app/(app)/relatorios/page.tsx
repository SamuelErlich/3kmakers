"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button, Field, Input, Select, SegmentedControl, Toggle } from "@/components/ui/Field";
import { formatBRL } from "@/lib/calc";

interface VendaRel {
  orcamento_id: string;
  plataforma_id: string | null;
  qtde_vendida: number;
  receita: number;
  custo_total: number;
  lucro: number;
  data_venda: string;
}

function primeiroDiaMes(ano: number, mes: number) {
  return `${ano}-${String(mes + 1).padStart(2, "0")}-01`;
}
function ultimoDiaMes(ano: number, mes: number) {
  const d = new Date(ano, mes + 1, 0);
  return d.toISOString().slice(0, 10);
}

export default function RelatoriosPage() {
  const supabase = createClient();
  const [papel, setPapel] = useState<"admin" | "operador">("operador");
  const [verTodos, setVerTodos] = useState(false);

  const hoje = new Date();
  const [modo, setModo] = useState<"mes" | "personalizado">("mes");
  const [ano, setAno] = useState(hoje.getFullYear());
  const [mes, setMes] = useState(hoje.getMonth());
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes(hoje.getFullYear(), hoje.getMonth()));
  const [dataFim, setDataFim] = useState(ultimoDiaMes(hoje.getFullYear(), hoje.getMonth()));

  const [carregando, setCarregando] = useState(true);
  const [vendas, setVendas] = useState<VendaRel[]>([]);
  const [nomesPlataforma, setNomesPlataforma] = useState<Record<string, string>>({});
  const [nomesPeca, setNomesPeca] = useState<Record<string, string>>({});

  const inicio = modo === "mes" ? primeiroDiaMes(ano, mes) : dataInicio;
  const fim = modo === "mes" ? ultimoDiaMes(ano, mes) : dataFim;

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

    const { data: plats } = await supabase.from("plataformas").select("id, nome");
    const mapaPlat: Record<string, string> = {};
    (plats ?? []).forEach((p: any) => (mapaPlat[p.id] = p.nome));
    setNomesPlataforma(mapaPlat);

    let q = supabase
      .from("vendas")
      .select("orcamento_id, plataforma_id, qtde_vendida, receita, custo_total, lucro, data_venda")
      .gte("data_venda", inicio)
      .lte("data_venda", fim);
    if (!(souAdmin && verTodos) && user) q = q.eq("usuario_id", user.id);
    const { data } = await q;
    const vendasData = (data as VendaRel[]) ?? [];
    setVendas(vendasData);

    if (vendasData.length > 0) {
      const orcIds = Array.from(new Set(vendasData.map((v) => v.orcamento_id)));
      const { data: orcs } = await supabase.from("orcamentos").select("id, nome_peca").in("id", orcIds);
      const mapaNomes: Record<string, string> = {};
      (orcs ?? []).forEach((o: any) => (mapaNomes[o.id] = o.nome_peca));
      setNomesPeca(mapaNomes);
    }

    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inicio, fim, verTodos]);

  const porPlataforma = useMemo(() => {
    const agrupado: Record<string, { qtde: number; receita: number; custo: number; lucro: number }> = {};
    vendas.forEach((v) => {
      const nome = v.plataforma_id ? nomesPlataforma[v.plataforma_id] ?? "Plataforma removida" : "Venda direta";
      if (!agrupado[nome]) agrupado[nome] = { qtde: 0, receita: 0, custo: 0, lucro: 0 };
      agrupado[nome].qtde += v.qtde_vendida;
      agrupado[nome].receita += v.receita ?? 0;
      agrupado[nome].custo += v.custo_total ?? 0;
      agrupado[nome].lucro += v.lucro ?? 0;
    });
    return Object.entries(agrupado)
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.receita - a.receita);
  }, [vendas, nomesPlataforma]);

  const porItem = useMemo(() => {
    const agrupado: Record<string, { qtde: number; receita: number; custo: number; lucro: number }> = {};
    vendas.forEach((v) => {
      const nome = nomesPeca[v.orcamento_id] ?? "Peça removida";
      if (!agrupado[nome]) agrupado[nome] = { qtde: 0, receita: 0, custo: 0, lucro: 0 };
      agrupado[nome].qtde += v.qtde_vendida;
      agrupado[nome].receita += v.receita ?? 0;
      agrupado[nome].custo += v.custo_total ?? 0;
      agrupado[nome].lucro += v.lucro ?? 0;
    });
    return Object.entries(agrupado)
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.receita - a.receita);
  }, [vendas, nomesPeca]);

  const totais = useMemo(() => {
    return vendas.reduce(
      (acc, v) => ({
        qtde: acc.qtde + v.qtde_vendida,
        receita: acc.receita + (v.receita ?? 0),
        custo: acc.custo + (v.custo_total ?? 0),
        lucro: acc.lucro + (v.lucro ?? 0),
      }),
      { qtde: 0, receita: 0, custo: 0, lucro: 0 }
    );
  }, [vendas]);

  function exportarCSV() {
    const linhas = [
      ["Relatório", `${inicio} a ${fim}`],
      [],
      ["Por plataforma"],
      ["Plataforma", "Qtde", "Receita", "Custo", "Lucro"],
      ...porPlataforma.map((l) => [l.nome, l.qtde, l.receita.toFixed(2), l.custo.toFixed(2), l.lucro.toFixed(2)]),
      [],
      ["Por item"],
      ["Item", "Qtde", "Receita", "Custo", "Lucro"],
      ...porItem.map((l) => [l.nome, l.qtde, l.receita.toFixed(2), l.custo.toFixed(2), l.lucro.toFixed(2)]),
    ];
    const csv = linhas.map((linha) => linha.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio_${inicio}_a_${fim}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const anoAtual = hoje.getFullYear();
  const MESES = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">Relatórios</h1>
          <p className="text-sm text-base-muted mt-1">Feche o mês ou escolha um período livre, por plataforma e por item.</p>
        </div>
        {papel === "admin" && <Toggle checked={verTodos} onChange={setVerTodos} label="Ver de todos" />}
      </div>

      <Card>
        <SegmentedControl
          value={modo}
          onChange={setModo}
          options={[
            { value: "mes", label: "Por mês" },
            { value: "personalizado", label: "Período livre" },
          ]}
        />

        {modo === "mes" ? (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="Mês">
              <Select value={mes} onChange={(e) => setMes(Number(e.target.value))}>
                {MESES.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Ano">
              <Select value={ano} onChange={(e) => setAno(Number(e.target.value))}>
                {[anoAtual, anoAtual - 1, anoAtual - 2].map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label="De">
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
            </Field>
            <Field label="Até">
              <Input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} />
            </Field>
          </div>
        )}
      </Card>

      {carregando ? (
        <p className="text-sm text-base-muted">Carregando...</p>
      ) : vendas.length === 0 ? (
        <Card>
          <p className="text-sm text-base-muted">Nenhuma venda nesse período.</p>
        </Card>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-base-border bg-base-surface p-4">
              <p className="text-xs text-base-muted">Unidades vendidas</p>
              <p className="text-xl font-semibold mt-1">{totais.qtde}</p>
            </div>
            <div className="rounded-2xl border border-base-border bg-base-surface p-4">
              <p className="text-xs text-base-muted">Receita</p>
              <p className="text-xl font-semibold mt-1">{formatBRL(totais.receita)}</p>
            </div>
            <div className="rounded-2xl border border-base-border bg-base-surface p-4">
              <p className="text-xs text-base-muted">Custo</p>
              <p className="text-xl font-semibold mt-1">{formatBRL(totais.custo)}</p>
            </div>
            <div className="rounded-2xl border border-base-border bg-base-surface p-4">
              <p className="text-xs text-base-muted">Lucro</p>
              <p className="text-xl font-semibold mt-1 text-good">{formatBRL(totais.lucro)}</p>
            </div>
          </div>

          <Card title="Por plataforma" icon="🛒">
            <TabelaRelatorio linhas={porPlataforma} coluna1="Plataforma" />
          </Card>

          <Card title="Por item" icon="🧊">
            <TabelaRelatorio linhas={porItem} coluna1="Item" />
          </Card>

          <Button onClick={exportarCSV} variant="secondary">
            📥 Exportar CSV
          </Button>
        </>
      )}
    </div>
  );
}

function TabelaRelatorio({
  linhas,
  coluna1,
}: {
  linhas: { nome: string; qtde: number; receita: number; custo: number; lucro: number }[];
  coluna1: string;
}) {
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm min-w-[480px]">
        <thead>
          <tr className="text-left text-base-muted border-b border-base-border">
            <th className="pb-2 font-medium">{coluna1}</th>
            <th className="pb-2 font-medium text-right">Qtde</th>
            <th className="pb-2 font-medium text-right">Receita</th>
            <th className="pb-2 font-medium text-right">Custo</th>
            <th className="pb-2 font-medium text-right">Lucro</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l.nome} className="border-b border-base-border/60">
              <td className="py-2">{l.nome}</td>
              <td className="py-2 text-right">{l.qtde}</td>
              <td className="py-2 text-right">{formatBRL(l.receita)}</td>
              <td className="py-2 text-right">{formatBRL(l.custo)}</td>
              <td className="py-2 text-right text-good">{formatBRL(l.lucro)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
