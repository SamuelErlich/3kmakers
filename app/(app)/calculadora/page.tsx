"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button, Field, Input, Select, Toggle, SegmentedControl, Badge } from "@/components/ui/Field";
import { calcularOrcamento, formatBRL } from "@/lib/calc";
import type { Filamento, Impressora, Plataforma } from "@/lib/types";

const LOCAL_STORAGE_KEY = "controle3d_calc_defaults";

export default function CalculadoraPage() {
  const supabase = createClient();

  // ---- cadastros de apoio ----
  const [impressoras, setImpressoras] = useState<Impressora[]>([]);
  const [filamentos, setFilamentos] = useState<Filamento[]>([]);
  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [empresaNome, setEmpresaNome] = useState("");
  const [carregandoApoio, setCarregandoApoio] = useState(true);

  // ---- Dados da Peça ----
  const [nomePeca, setNomePeca] = useState("");
  const [cliente, setCliente] = useState("");
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [qtde, setQtde] = useState("1");
  const [pesoG, setPesoG] = useState("");
  const [usarEstoqueFilamento, setUsarEstoqueFilamento] = useState(false);
  const [filamentoId, setFilamentoId] = useState<string>("");

  // ---- Tempo de impressão / lucro ----
  const [horasImpressao, setHorasImpressao] = useState("0");
  const [minutosImpressao, setMinutosImpressao] = useState("0");
  const [lucroDesejado, setLucroDesejado] = useState("40");

  // ---- Parâmetros de custo ----
  const [impressoraId, setImpressoraId] = useState<string>("");
  const [precoKwh, setPrecoKwh] = useState("0.8");
  const [modoEnergia, setModoEnergia] = useState<"consumo" | "medido">("consumo");
  const [consumoW, setConsumoW] = useState("200");
  const [whTotal, setWhTotal] = useState("0");
  const [valorImpressora, setValorImpressora] = useState("0");
  const [vidaUtilImpressora, setVidaUtilImpressora] = useState("5000");

  // ---- Insumos e lucro ----
  const [precoFilamentoKg, setPrecoFilamentoKg] = useState("100");
  const [taxaFalha, setTaxaFalha] = useState("0");
  const [salvarConfiguracoes, setSalvarConfiguracoes] = useState(true);

  // ---- Mais opções ----
  const [linkStl, setLinkStl] = useState("");
  const [observacoes, setObservacoes] = useState("");
  const [frete, setFrete] = useState("0");
  const [incluirTaxaMarketplace, setIncluirTaxaMarketplace] = useState(false);
  const [plataformaId, setPlataformaId] = useState<string>("");
  const [mostrarMaisOpcoes, setMostrarMaisOpcoes] = useState(false);

  // ---- Pós-processamento ----
  const [valorHoraPessoal, setValorHoraPessoal] = useState("0");
  const [modoPos, setModoPos] = useState<"peca" | "lote">("peca");
  const [horasPos, setHorasPos] = useState("0");
  const [minutosPos, setMinutosPos] = useState("0");
  const [custosExtras, setCustosExtras] = useState("0");

  // ---- resultado / salvar ----
  const [calculado, setCalculado] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function carregarApoio() {
    setCarregandoApoio(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase.from("profiles").select("empresa_nome").eq("id", user.id).single();
      setEmpresaNome(profile?.empresa_nome ?? "");
    }
    const [{ data: imps }, { data: fils }, { data: plats }] = await Promise.all([
      supabase.from("impressoras").select("*").eq("ativa", true).order("nome"),
      supabase.from("filamentos").select("*").order("material"),
      supabase.from("plataformas").select("*").eq("ativa", true).order("nome"),
    ]);
    setImpressoras((imps as Impressora[]) ?? []);
    setFilamentos((fils as Filamento[]) ?? []);
    setPlataformas((plats as Plataforma[]) ?? []);
    setCarregandoApoio(false);

    // aplica os últimos valores salvos, se houver
    const salvo = typeof window !== "undefined" ? localStorage.getItem(LOCAL_STORAGE_KEY) : null;
    if (salvo) {
      try {
        const d = JSON.parse(salvo);
        if (d.precoKwh) setPrecoKwh(d.precoKwh);
        if (d.precoFilamentoKg) setPrecoFilamentoKg(d.precoFilamentoKg);
        if (d.taxaFalha) setTaxaFalha(d.taxaFalha);
        if (d.lucroDesejado) setLucroDesejado(d.lucroDesejado);
        if (d.valorHoraPessoal) setValorHoraPessoal(d.valorHoraPessoal);
        if (d.impressoraId) setImpressoraId(d.impressoraId);
      } catch {
        /* ignora */
      }
    }
  }

  useEffect(() => {
    carregarApoio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ao escolher uma impressora cadastrada, pré-preenche os campos (mas eles continuam editáveis)
  function selecionarImpressora(id: string) {
    setImpressoraId(id);
    const imp = impressoras.find((i) => i.id === id);
    if (imp) {
      setConsumoW(String(imp.consumo_w));
      setValorImpressora(String(imp.valor_compra));
      setVidaUtilImpressora(String(imp.vida_util_horas));
    }
  }

  function selecionarFilamento(id: string) {
    setFilamentoId(id);
    const fil = filamentos.find((f) => f.id === id);
    if (fil) {
      const custoTotal = fil.preco_bobina + fil.frete;
      const custoKg = fil.peso_bobina_g > 0 ? (custoTotal / fil.peso_bobina_g) * 1000 : 0;
      setPrecoFilamentoKg(custoKg.toFixed(2));
    }
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
  }

  const custoPorGramaFilamento = useMemo(() => {
    if (usarEstoqueFilamento && filamentoId) {
      const fil = filamentos.find((f) => f.id === filamentoId);
      if (fil) {
        const custoTotal = fil.preco_bobina + fil.frete;
        return fil.peso_bobina_g > 0 ? custoTotal / fil.peso_bobina_g : 0;
      }
    }
    return (Number(precoFilamentoKg) || 0) / 1000;
  }, [usarEstoqueFilamento, filamentoId, filamentos, precoFilamentoKg]);

  const plataformaSelecionada = plataformas.find((p) => p.id === plataformaId);

  const resultado = useMemo(() => {
    return calcularOrcamento({
      qtde: Number(qtde) || 1,
      peso_g: Number(pesoG) || 0,
      taxa_falha_pct: Number(taxaFalha) || 0,
      tempo_impressao_min: (Number(horasImpressao) || 0) * 60 + (Number(minutosImpressao) || 0),
      impressora_valor_compra: Number(valorImpressora) || 0,
      impressora_vida_util_horas: Number(vidaUtilImpressora) || 1,
      impressora_consumo_w: Number(consumoW) || 0,
      energia_modo: modoEnergia,
      energia_preco_kwh: Number(precoKwh) || 0,
      energia_wh_total: Number(whTotal) || 0,
      filamento_custo_por_g: custoPorGramaFilamento,
      valor_hora_pessoal: Number(valorHoraPessoal) || 0,
      pos_processamento_modo: modoPos,
      tempo_pos_processamento_min: (Number(horasPos) || 0) * 60 + (Number(minutosPos) || 0),
      custos_extra: Number(custosExtras) || 0,
      frete: Number(frete) || 0,
      lucro_desejado_pct: Number(lucroDesejado) || 0,
      incluir_taxa_marketplace: incluirTaxaMarketplace,
      plataforma_taxa_percentual: plataformaSelecionada?.taxa_percentual,
      plataforma_taxa_fixa: plataformaSelecionada?.taxa_fixa,
    });
  }, [
    qtde,
    pesoG,
    taxaFalha,
    horasImpressao,
    minutosImpressao,
    valorImpressora,
    vidaUtilImpressora,
    consumoW,
    modoEnergia,
    precoKwh,
    whTotal,
    custoPorGramaFilamento,
    valorHoraPessoal,
    modoPos,
    horasPos,
    minutosPos,
    custosExtras,
    frete,
    lucroDesejado,
    incluirTaxaMarketplace,
    plataformaSelecionada,
  ]);

  function calcular() {
    if (!nomePeca.trim()) {
      setErro("Preencha o nome da peça.");
      return;
    }
    if (!pesoG || Number(pesoG) <= 0) {
      setErro("Preencha o peso da peça.");
      return;
    }
    setErro(null);
    setCalculado(true);
    setSalvo(false);

    if (salvarConfiguracoes && typeof window !== "undefined") {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({ precoKwh, precoFilamentoKg, taxaFalha, lucroDesejado, valorHoraPessoal, impressoraId })
      );
    }
  }

  function novoCalculo() {
    setNomePeca("");
    setCliente("");
    setFoto(null);
    setFotoPreview(null);
    setQtde("1");
    setPesoG("");
    setUsarEstoqueFilamento(false);
    setFilamentoId("");
    setHorasImpressao("0");
    setMinutosImpressao("0");
    setLinkStl("");
    setObservacoes("");
    setFrete("0");
    setIncluirTaxaMarketplace(false);
    setPlataformaId("");
    setHorasPos("0");
    setMinutosPos("0");
    setCustosExtras("0");
    setCalculado(false);
    setSalvo(false);
    setErro(null);
  }

  async function salvarOrcamento() {
    setSalvando(true);
    setErro(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada, faça login novamente.");

      let fotoUrl: string | null = null;
      if (foto) {
        const nomeArquivo = `${user.id}/${Date.now()}-${foto.name}`;
        const { error: upErr } = await supabase.storage.from("pecas").upload(nomeArquivo, foto);
        if (!upErr) {
          const { data: pub } = supabase.storage.from("pecas").getPublicUrl(nomeArquivo);
          fotoUrl = pub.publicUrl;
        }
      }

      const { error: insertErr } = await supabase.from("orcamentos").insert({
        usuario_id: user.id,
        nome_peca: nomePeca,
        cliente: cliente || null,
        foto_url: fotoUrl,
        qtde: Number(qtde) || 1,
        peso_g: Number(pesoG) || 0,
        link_stl: linkStl || null,
        observacoes: observacoes || null,
        tempo_impressao_min: (Number(horasImpressao) || 0) * 60 + (Number(minutosImpressao) || 0),
        impressora_id: impressoraId || null,
        energia_modo: modoEnergia,
        energia_preco_kwh: Number(precoKwh) || 0,
        energia_wh_total: modoEnergia === "medido" ? Number(whTotal) || 0 : null,
        filamento_id: usarEstoqueFilamento ? filamentoId || null : null,
        filamento_preco_kg_manual: usarEstoqueFilamento ? null : Number(precoFilamentoKg) || 0,
        taxa_falha_pct: Number(taxaFalha) || 0,
        valor_hora_pessoal: Number(valorHoraPessoal) || 0,
        pos_processamento_modo: modoPos,
        tempo_pos_processamento_min: (Number(horasPos) || 0) * 60 + (Number(minutosPos) || 0),
        custos_extra: Number(custosExtras) || 0,
        frete: Number(frete) || 0,
        lucro_desejado_pct: Number(lucroDesejado) || 0,
        incluir_taxa_marketplace: incluirTaxaMarketplace,
        plataforma_id: incluirTaxaMarketplace ? plataformaId || null : null,
        status: "orcamento",
        consumo_filamento_g: resultado.consumo_filamento_g,
        custo_filamento: resultado.custo_filamento,
        custo_energia: resultado.custo_energia,
        custo_impressora: resultado.custo_impressora,
        custo_mao_obra: resultado.custo_mao_obra,
        custo_total: resultado.custo_total,
        preco_sugerido_unit: resultado.preco_sugerido_unit,
        preco_sugerido_marketplace_unit: resultado.preco_sugerido_marketplace_unit,
        preco_final_unit: resultado.preco_sugerido_marketplace_unit ?? resultado.preco_sugerido_unit,
      });

      if (insertErr) throw insertErr;

      // desconta o estoque de filamento usado, se aplicável
      if (usarEstoqueFilamento && filamentoId) {
        const fil = filamentos.find((f) => f.id === filamentoId);
        if (fil) {
          await supabase
            .from("filamentos")
            .update({ estoque_atual_g: Math.max(fil.estoque_atual_g - resultado.consumo_filamento_g, 0) })
            .eq("id", filamentoId);
        }
      }

      setSalvo(true);
    } catch (e: any) {
      setErro(e.message ?? "Não foi possível salvar o orçamento.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregandoApoio) {
    return <p className="text-sm text-base-muted">Carregando...</p>;
  }

  return (
    <div className="space-y-6 pb-20">
      <div>
        <h1 className="text-xl font-semibold">Calculadora</h1>
        <p className="text-sm text-base-muted mt-1">Monte o orçamento da peça e salve para gerar pedido depois.</p>
      </div>

      {/* Dados da Peça */}
      <Card title="Dados da Peça" icon="🧊">
        <Field label="Nome da Peça">
          <Input value={nomePeca} onChange={(e) => setNomePeca(e.target.value)} placeholder="Ex: Yoda Baby" />
        </Field>

        <Field
          label="Nome da sua Empresa (Sairá no Orçamento)"
          badge={<Badge tone="info">Importante</Badge>}
          hint={!empresaNome ? "Configure este dado no seu perfil para não precisar digitá-lo novamente" : undefined}
        >
          <Input value={empresaNome} onChange={(e) => setEmpresaNome(e.target.value)} placeholder="Ex: Print Masters 3D" />
        </Field>

        <Field label="Cliente (opcional)">
          <Input value={cliente} onChange={(e) => setCliente(e.target.value)} placeholder="Ex: João Silva" />
        </Field>

        <Field label="Foto da Peça 3D (Opcional)" badge={<Badge tone="new">Novidade</Badge>}>
          <label className="block border border-dashed border-base-border rounded-xl p-6 text-center cursor-pointer hover:border-accent transition-colors">
            {fotoPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={fotoPreview} alt="Prévia da peça" className="mx-auto max-h-40 rounded-lg" />
            ) : (
              <>
                <p className="text-2xl">🖼️</p>
                <p className="text-sm text-base-muted mt-1">PNG, JPG ou WEBP (máx. 5MB)</p>
                <p className="text-sm text-accent-hover mt-1">Clique para selecionar</p>
              </>
            )}
            <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFoto} />
          </label>
        </Field>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Quantidade de Peças">
            <Input type="number" min={1} value={qtde} onChange={(e) => setQtde(e.target.value)} />
          </Field>
          <Field label="Peso (g)">
            <Input type="number" step="0.1" value={pesoG} onChange={(e) => setPesoG(e.target.value)} />
          </Field>
        </div>

        <Button type="button" variant="secondary" onClick={() => setUsarEstoqueFilamento(!usarEstoqueFilamento)} className="w-full">
          📦 {usarEstoqueFilamento ? "Usando filamento do estoque" : "Usar filamentos do estoque"}
        </Button>

        {usarEstoqueFilamento && (
          <Field label="Filamento cadastrado">
            <Select value={filamentoId} onChange={(e) => selecionarFilamento(e.target.value)}>
              <option value="">Escolha um filamento</option>
              {filamentos.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.material} {f.cor_marca ? `— ${f.cor_marca}` : ""} (estoque: {f.estoque_atual_g.toFixed(0)}g)
                </option>
              ))}
            </Select>
          </Field>
        )}
      </Card>

      {/* Tempo de Impressão / Lucro */}
      <Card>
        <div>
          <h3 className="font-medium mb-3">Tempo de Impressão</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Horas">
              <Input type="number" min={0} value={horasImpressao} onChange={(e) => setHorasImpressao(e.target.value)} />
            </Field>
            <Field label="Minutos (opcional)">
              <Input type="number" min={0} max={59} value={minutosImpressao} onChange={(e) => setMinutosImpressao(e.target.value)} />
            </Field>
          </div>
          <p className="text-xs text-base-muted mt-1.5">
            Tempo total do trabalho na mesa (não multiplica pela quantidade de peças).
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-sm font-medium">Lucro desejado (%)</label>
            <span className="text-accent-hover font-semibold">{lucroDesejado}%</span>
          </div>
          <input
            type="range"
            min={0}
            max={300}
            value={lucroDesejado}
            onChange={(e) => setLucroDesejado(e.target.value)}
            className="w-full accent-[#5b6ef5]"
          />
        </div>
      </Card>

      {/* Parâmetros de Custo */}
      <Card title="Parâmetros de Custo" icon="⚙️">
        <Field label="Selecionar Impressora">
          <Select value={impressoraId} onChange={(e) => selecionarImpressora(e.target.value)}>
            <option value="">Escolha uma impressora cadastrada</option>
            {impressoras.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <h3 className="text-accent-hover text-sm font-medium mb-3">Custos de Operação</h3>
          <div className="space-y-4">
            <Field label="Preço do kWh (R$)">
              <Input type="number" step="0.01" value={precoKwh} onChange={(e) => setPrecoKwh(e.target.value)} />
            </Field>

            <Field label="Como calcular o custo de energia?">
              <SegmentedControl
                value={modoEnergia}
                onChange={setModoEnergia}
                options={[
                  { value: "consumo", label: "Consumo da impressora (W)" },
                  { value: "medido", label: "Total medido (Wh)" },
                ]}
              />
            </Field>

            {modoEnergia === "consumo" ? (
              <Field label="Consumo da Máquina (W)">
                <Input type="number" value={consumoW} onChange={(e) => setConsumoW(e.target.value)} />
              </Field>
            ) : (
              <Field label="Consumo total medido (Wh)">
                <Input type="number" value={whTotal} onChange={(e) => setWhTotal(e.target.value)} />
              </Field>
            )}

            <Field label="Valor de Compra da Máquina (R$)">
              <Input type="number" step="0.01" value={valorImpressora} onChange={(e) => setValorImpressora(e.target.value)} />
            </Field>
            <Field label="Vida Útil da Máquina (horas)">
              <Input type="number" value={vidaUtilImpressora} onChange={(e) => setVidaUtilImpressora(e.target.value)} />
            </Field>
          </div>
        </div>
      </Card>

      {/* Insumos e Lucro */}
      <Card title="Insumos e Lucro" icon="🧵">
        <Field label="Preço do Filamento (R$/kg)" hint={usarEstoqueFilamento ? "Preenchido automaticamente pelo filamento do estoque" : undefined}>
          <Input
            type="number"
            step="0.01"
            value={precoFilamentoKg}
            onChange={(e) => setPrecoFilamentoKg(e.target.value)}
            disabled={usarEstoqueFilamento}
          />
        </Field>
        <Field label="Taxa de Falha (%)">
          <Input type="number" value={taxaFalha} onChange={(e) => setTaxaFalha(e.target.value)} />
        </Field>
        <Toggle checked={salvarConfiguracoes} onChange={setSalvarConfiguracoes} label="Salvar configurações" />
      </Card>

      {/* Mais opções */}
      <Card>
        <button
          type="button"
          onClick={() => setMostrarMaisOpcoes(!mostrarMaisOpcoes)}
          className="w-full flex items-center justify-between"
        >
          <span className="font-medium flex items-center gap-2">⚙️ Mais opções</span>
          <span className="text-base-muted">{mostrarMaisOpcoes ? "▲" : "▼"}</span>
        </button>

        {mostrarMaisOpcoes && (
          <div className="space-y-5 pt-2">
            <Field label="Link do STL (opcional)" hint="Uso interno — nunca aparece no orçamento do cliente.">
              <Input value={linkStl} onChange={(e) => setLinkStl(e.target.value)} placeholder="https://makerworld.com/..." />
            </Field>
            <Field label="Observações do Orçamento (opcional)">
              <textarea
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                placeholder="Ex: Cliente pediu em PLA Preto, entrega sexta-feira..."
                rows={3}
              />
            </Field>
            <Field label="Valor do Frete (R$)">
              <Input type="number" step="0.01" value={frete} onChange={(e) => setFrete(e.target.value)} placeholder="Ex: 15.90" />
            </Field>
            <Toggle
              checked={incluirTaxaMarketplace}
              onChange={setIncluirTaxaMarketplace}
              label="Incluir taxa de marketplace"
            />
            {incluirTaxaMarketplace && (
              <Field label="Plataforma">
                <Select value={plataformaId} onChange={(e) => setPlataformaId(e.target.value)}>
                  <option value="">Escolha a plataforma</option>
                  {plataformas.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nome} ({(p.taxa_percentual * 100).toFixed(0)}% + {formatBRL(p.taxa_fixa)})
                    </option>
                  ))}
                </Select>
              </Field>
            )}
          </div>
        )}
      </Card>

      {/* Pós-processamento */}
      <Card>
        <Field label="Valor da sua hora (R$)">
          <Input
            type="number"
            step="0.01"
            value={valorHoraPessoal}
            onChange={(e) => setValorHoraPessoal(e.target.value)}
            placeholder="Ex: 50.00 (opcional)"
          />
        </Field>

        <Field label="Tempo de pós-processamento é:">
          <SegmentedControl
            value={modoPos}
            onChange={setModoPos}
            options={[
              { value: "peca", label: "Por peça" },
              { value: "lote", label: "Total do lote" },
            ]}
          />
        </Field>

        <div>
          <h3 className="text-sm font-medium mb-3">Tempo de Pós-processamento</h3>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Horas">
              <Input type="number" min={0} value={horasPos} onChange={(e) => setHorasPos(e.target.value)} />
            </Field>
            <Field label="Minutos (opcional)">
              <Input type="number" min={0} max={59} value={minutosPos} onChange={(e) => setMinutosPos(e.target.value)} />
            </Field>
          </div>
        </div>

        <Field label="Custos Extras (R$)">
          <Input type="number" step="0.01" value={custosExtras} onChange={(e) => setCustosExtras(e.target.value)} />
        </Field>

        {erro && <p className="text-sm text-bad">{erro}</p>}

        <Button type="button" onClick={calcular} className="w-full">
          🧮 Calcular
        </Button>
      </Card>

      {/* Resultado */}
      {calculado && (
        <Card title="Resultado do Cálculo" icon="✅" className="border-accent/40">
          <div className="grid sm:grid-cols-2 gap-3 text-sm">
            <div className="flex justify-between border-b border-base-border/60 pb-2">
              <span className="text-base-muted">Consumo de filamento</span>
              <span>{resultado.consumo_filamento_g.toFixed(1)} g</span>
            </div>
            <div className="flex justify-between border-b border-base-border/60 pb-2">
              <span className="text-base-muted">Custo filamento</span>
              <span>{formatBRL(resultado.custo_filamento)}</span>
            </div>
            <div className="flex justify-between border-b border-base-border/60 pb-2">
              <span className="text-base-muted">Custo energia</span>
              <span>{formatBRL(resultado.custo_energia)}</span>
            </div>
            <div className="flex justify-between border-b border-base-border/60 pb-2">
              <span className="text-base-muted">Custo impressora</span>
              <span>{formatBRL(resultado.custo_impressora)}</span>
            </div>
            <div className="flex justify-between border-b border-base-border/60 pb-2">
              <span className="text-base-muted">Custo mão de obra</span>
              <span>{formatBRL(resultado.custo_mao_obra)}</span>
            </div>
            <div className="flex justify-between border-b border-base-border/60 pb-2 font-medium">
              <span>Custo total do lote</span>
              <span>{formatBRL(resultado.custo_total)}</span>
            </div>
          </div>

          <div className="rounded-xl bg-base-surface2 p-4 space-y-2">
            <div className="flex justify-between items-baseline">
              <span className="text-base-muted text-sm">Preço sugerido (unitário)</span>
              <span className="text-2xl font-semibold text-accent-hover">{formatBRL(resultado.preco_sugerido_unit)}</span>
            </div>
            {resultado.preco_sugerido_marketplace_unit !== null && (
              <div className="flex justify-between items-baseline">
                <span className="text-base-muted text-sm">
                  Preço sugerido com taxa {plataformaSelecionada ? `(${plataformaSelecionada.nome})` : ""}
                </span>
                <span className="text-xl font-semibold text-accent-hover">
                  {formatBRL(resultado.preco_sugerido_marketplace_unit)}
                </span>
              </div>
            )}
          </div>

          {salvo ? (
            <div className="flex items-center gap-2 text-good text-sm bg-good/10 rounded-xl px-4 py-3">
              ✅ Orçamento salvo! Use "Meus Orçamentos" para acompanhar (em breve).
            </div>
          ) : (
            <div className="flex gap-2">
              <Button type="button" onClick={salvarOrcamento} disabled={salvando}>
                {salvando ? "Salvando..." : "💾 Salvar orçamento"}
              </Button>
              <Button type="button" variant="secondary" onClick={novoCalculo}>
                Novo cálculo
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
