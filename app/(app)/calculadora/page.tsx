"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button, Field, Input, Select, Toggle, SegmentedControl, Badge } from "@/components/ui/Field";
import { calcularOrcamento, formatBRL } from "@/lib/calc";
import type { Filamento, Impressora, Plataforma } from "@/lib/types";

const LOCAL_STORAGE_KEY = "controle3d_calc_defaults";

export default function CalculadoraPageWrapper() {
  return (
    <Suspense fallback={<p className="text-sm text-base-muted">Carregando...</p>}>
      <CalculadoraPage />
    </Suspense>
  );
}

function CalculadoraPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const editarId = searchParams.get("editar");
  const produtoIdParam = searchParams.get("produto");

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

  // ---- seções que já vêm configuradas desde o primeiro uso — ficam recolhidas por padrão ----
  const [mostrarParametros, setMostrarParametros] = useState(false);
  const [mostrarInsumos, setMostrarInsumos] = useState(false);

  // ---- Pós-processamento ----
  const [valorHoraPessoal, setValorHoraPessoal] = useState("0");
  const [modoPos, setModoPos] = useState<"peca" | "lote">("peca");
  const [horasPos, setHorasPos] = useState("0");
  const [minutosPos, setMinutosPos] = useState("0");
  const [custosExtras, setCustosExtras] = useState("0");

  // ---- resultado / salvar ----
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  // ---- edição de orçamento existente / produto carregado ----
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [nomeEditando, setNomeEditando] = useState<string>("");
  const [carregandoRegistro, setCarregandoRegistro] = useState(false);

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
    const impressorasCarregadas = (imps as Impressora[]) ?? [];
    const filamentosCarregados = (fils as Filamento[]) ?? [];
    setImpressoras(impressorasCarregadas);
    setFilamentos(filamentosCarregados);
    setPlataformas((plats as Plataforma[]) ?? []);

    if (editarId) {
      // ---- modo edição: carrega um orçamento já salvo ----
      setCarregandoRegistro(true);
      const { data: o } = await supabase.from("orcamentos").select("*").eq("id", editarId).single();
      if (o) {
        setEditandoId(o.id);
        setNomeEditando(o.nome_peca);
        setNomePeca(o.nome_peca);
        setCliente(o.cliente ?? "");
        setFotoPreview(o.foto_url);
        setQtde(String(o.qtde));
        setPesoG(String(o.peso_g));
        setUsarEstoqueFilamento(!!o.filamento_id);
        setFilamentoId(o.filamento_id ?? "");
        setHorasImpressao(String(Math.floor((o.tempo_impressao_min ?? 0) / 60)));
        setMinutosImpressao(String((o.tempo_impressao_min ?? 0) % 60));
        setLucroDesejado(String(o.lucro_desejado_pct));
        setImpressoraId(o.impressora_id ?? "");
        const impSelecionada = impressorasCarregadas.find((i) => i.id === o.impressora_id);
        setPrecoKwh(String(o.energia_preco_kwh));
        setModoEnergia(o.energia_modo);
        setConsumoW(impSelecionada ? String(impSelecionada.consumo_w) : "200");
        setWhTotal(String(o.energia_wh_total ?? 0));
        setValorImpressora(impSelecionada ? String(impSelecionada.valor_compra) : "0");
        setVidaUtilImpressora(impSelecionada ? String(impSelecionada.vida_util_horas) : "5000");
        if (!o.filamento_id) setPrecoFilamentoKg(String(o.filamento_preco_kg_manual ?? 100));
        setTaxaFalha(String(o.taxa_falha_pct));
        setLinkStl(o.link_stl ?? "");
        setObservacoes(o.observacoes ?? "");
        setFrete(String(o.frete));
        setIncluirTaxaMarketplace(o.incluir_taxa_marketplace);
        setPlataformaId(o.plataforma_id ?? "");
        setValorHoraPessoal(String(o.valor_hora_pessoal));
        setModoPos(o.pos_processamento_modo);
        setHorasPos(String(Math.floor((o.tempo_pos_processamento_min ?? 0) / 60)));
        setMinutosPos(String((o.tempo_pos_processamento_min ?? 0) % 60));
        setCustosExtras(String(o.custos_extra));
      }
      setCarregandoRegistro(false);
    } else if (produtoIdParam) {
      // ---- carregar modelo salvo em Meus Produtos ----
      setCarregandoRegistro(true);
      const { data: p } = await supabase.from("produtos").select("*").eq("id", produtoIdParam).single();
      if (p) {
        setNomePeca(p.nome);
        setFotoPreview(p.foto_url);
        if (p.peso_g) setPesoG(String(p.peso_g));
        if (p.tempo_impressao_min) {
          setHorasImpressao(String(Math.floor(p.tempo_impressao_min / 60)));
          setMinutosImpressao(String(p.tempo_impressao_min % 60));
        }
        if (p.filamento_id) {
          setUsarEstoqueFilamento(true);
          setFilamentoId(p.filamento_id);
          const fil = filamentosCarregados.find((f) => f.id === p.filamento_id);
          if (fil) {
            const custoTotal = fil.preco_bobina + fil.frete;
            const custoKg = fil.peso_bobina_g > 0 ? (custoTotal / fil.peso_bobina_g) * 1000 : 0;
            setPrecoFilamentoKg(custoKg.toFixed(2));
          }
        }
        if (p.observacoes) setObservacoes(p.observacoes);
      }
      setCarregandoRegistro(false);
    } else {
      // aplica os últimos valores salvos, se houver (só quando não está editando/carregando produto)
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

    setCarregandoApoio(false);
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

  const plataformaSelecionada = useMemo(
    () => plataformas.find((p) => p.id === plataformaId),
    [plataformas, plataformaId]
  );

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

  // se o resultado mudou (usuário editou algo), o aviso "salvo" sai de cena e
  // o valor ao vivo volta a aparecer — sem precisar clicar em "Novo cálculo"
  useEffect(() => {
    setSalvo(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultado]);

  // o resultado fica visível assim que os dois campos mínimos estão preenchidos —
  // não existe mais um botão "Calcular": qualquer alteração (inclusive ligar/desligar
  // a taxa de marketplace) já atualiza o valor final na hora.
  const pronto = nomePeca.trim() !== "" && Number(pesoG) > 0;

  // na primeira vez (sem impressora configurada ainda), abre Parâmetros de Custo sozinho
  // pra guiar o cadastro; depois disso fica recolhido por padrão.
  useEffect(() => {
    if (!carregandoApoio && !impressoraId) setMostrarParametros(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carregandoApoio]);

  // salva os últimos parâmetros usados (pra próxima vez que abrir a Calculadora), sem precisar de botão
  useEffect(() => {
    if (!salvarConfiguracoes || typeof window === "undefined") return;
    localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({ precoKwh, precoFilamentoKg, taxaFalha, lucroDesejado, valorHoraPessoal, impressoraId })
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salvarConfiguracoes, precoKwh, precoFilamentoKg, taxaFalha, lucroDesejado, valorHoraPessoal, impressoraId]);

  function alternarMarketplace(ativar: boolean) {
    setIncluirTaxaMarketplace(ativar);
    // ao ativar, já escolhe uma plataforma sozinho (senão a taxa fica em 0% e o preço
    // parece "não ter mudado" até o usuário abrir o segundo campo e escolher uma)
    if (ativar && !plataformaId && plataformas.length > 0) {
      setPlataformaId(plataformas[0].id);
    }
  }

  function alternarUsarEstoque() {
    const novoValor = !usarEstoqueFilamento;
    setUsarEstoqueFilamento(novoValor);
    // mesmo raciocínio: ativar sem escolher o filamento deixa o preço parecendo travado
    if (novoValor && !filamentoId && filamentos.length > 0) {
      selecionarFilamento(filamentos[0].id);
    }
  }

  function novoCalculo() {
    setEditandoId(null);
    setNomeEditando("");
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
    setSalvo(false);
    setErro(null);
    if (editarId || produtoIdParam) router.push("/calculadora");
  }

  async function salvarOrcamento() {
    if (!pronto) {
      setErro("Preencha o nome da peça e o peso antes de salvar.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Sessão expirada, faça login novamente.");

      let fotoUrl: string | null = editandoId ? fotoPreview : null;
      if (foto) {
        const nomeArquivo = `${user.id}/${Date.now()}-${foto.name}`;
        const { error: upErr } = await supabase.storage.from("pecas").upload(nomeArquivo, foto);
        if (!upErr) {
          const { data: pub } = supabase.storage.from("pecas").getPublicUrl(nomeArquivo);
          fotoUrl = pub.publicUrl;
        }
      }

      const payload = {
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
        consumo_filamento_g: resultado.consumo_filamento_g,
        custo_filamento: resultado.custo_filamento,
        custo_energia: resultado.custo_energia,
        custo_impressora: resultado.custo_impressora,
        custo_mao_obra: resultado.custo_mao_obra,
        custo_total: resultado.custo_total,
        preco_sugerido_unit: resultado.preco_sugerido_unit,
        preco_sugerido_marketplace_unit: resultado.preco_sugerido_marketplace_unit,
        preco_final_unit: resultado.preco_sugerido_marketplace_unit ?? resultado.preco_sugerido_unit,
      };

      if (editandoId) {
        const { error: updateErr } = await supabase
          .from("orcamentos")
          .update({ ...payload, atualizado_em: new Date().toISOString() })
          .eq("id", editandoId);
        if (updateErr) throw updateErr;
        // edição não desconta estoque de novo — o desconto já aconteceu na criação original
        setSalvo(true);
        router.push("/orcamentos");
        return;
      }

      const { error: insertErr } = await supabase.from("orcamentos").insert({
        ...payload,
        usuario_id: user.id,
        status: "orcamento",
      });

      if (insertErr) throw insertErr;

      // desconta o estoque de filamento usado, se aplicável (só em orçamento novo)
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

  async function salvarComoProduto() {
    setErro(null);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const qtdeAtual = Number(qtde) || 1;
    const { error } = await supabase.from("produtos").insert({
      usuario_id: user.id,
      nome: nomePeca || "Produto sem nome",
      foto_url: fotoPreview && fotoPreview.startsWith("http") ? fotoPreview : null,
      peso_g: Number(pesoG) || null,
      tempo_impressao_min: (Number(horasImpressao) || 0) * 60 + (Number(minutosImpressao) || 0),
      filamento_id: usarEstoqueFilamento ? filamentoId || null : null,
      observacoes: observacoes || null,
      // preço do cálculo atual — é isso que habilita o botão "Vender" direto em Meus Produtos
      custo_unitario: resultado.custo_total / qtdeAtual,
      preco_final_unit: resultado.preco_sugerido_marketplace_unit ?? resultado.preco_sugerido_unit,
      lucro_desejado_pct: Number(lucroDesejado) || 0,
    });
    if (error) {
      setErro("Não foi possível salvar como produto.");
      return;
    }
    alert("Produto salvo com o preço calculado! Você já pode vender direto em Meus Produtos.");
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

      {carregandoRegistro && (
        <div className="text-sm text-base-muted bg-base-surface2 rounded-xl px-4 py-3">Carregando dados...</div>
      )}

      {editandoId && !carregandoRegistro && (
        <div className="flex items-center justify-between gap-3 text-sm bg-accent/10 border border-accent/30 rounded-xl px-4 py-3">
          <span>
            ✏️ Editando orçamento: <strong>{nomeEditando}</strong>
          </span>
          <button onClick={novoCalculo} className="text-accent-hover font-medium shrink-0">
            Cancelar edição
          </button>
        </div>
      )}

      {produtoIdParam && !editandoId && !carregandoRegistro && (
        <div className="text-sm bg-good/10 border border-good/30 rounded-xl px-4 py-3">
          🧩 Dados carregados de Meus Produtos — ajuste o que precisar e calcule.
        </div>
      )}

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

        <Button type="button" variant="secondary" onClick={alternarUsarEstoque} className="w-full">
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
          <div className="flex items-center justify-between mb-1.5 gap-3">
            <label className="text-sm font-medium">Lucro desejado (%)</label>
            <div className="flex items-center gap-1 shrink-0">
              <Input
                type="number"
                min={0}
                step={1}
                value={lucroDesejado}
                onChange={(e) => setLucroDesejado(e.target.value)}
                className="!w-20 !py-1 !px-2 text-right text-accent-hover font-semibold"
              />
              <span className="text-accent-hover font-semibold">%</span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={300}
            value={Math.min(Number(lucroDesejado) || 0, 300)}
            onChange={(e) => setLucroDesejado(e.target.value)}
            className="w-full accent-[#5b6ef5]"
          />
        </div>
      </Card>

      {/* Venda em Marketplace — destaque, o foco principal do negócio */}
      <Card className="!border-accent/50">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-medium flex items-center gap-2">🛒 Venda em Marketplace</h3>
            <p className="text-xs text-base-muted mt-1">
              Já calcula o preço com a taxa da plataforma embutida, pronto pra postar no anúncio.
            </p>
          </div>
          <Toggle checked={incluirTaxaMarketplace} onChange={alternarMarketplace} />
        </div>
        {incluirTaxaMarketplace && (
          <>
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
            {pronto && plataformaId && (
              <div className="flex items-center justify-between rounded-xl bg-accent/10 px-4 py-2.5">
                <span className="text-sm text-base-muted">Preço com taxa (atualiza ao vivo)</span>
                <span className="text-lg font-semibold text-accent-hover">
                  {formatBRL(resultado.preco_sugerido_marketplace_unit)}
                </span>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Parâmetros de Custo — recolhido por padrão: já vem salvo desde o primeiro cadastro */}
      <Card>
        <button
          type="button"
          onClick={() => setMostrarParametros(!mostrarParametros)}
          className="w-full flex items-center justify-between"
        >
          <span className="text-left">
            <span className="font-medium flex items-center gap-2">⚙️ Parâmetros de Custo</span>
            {!mostrarParametros && (
              <span className="text-xs text-base-muted block mt-0.5">
                {impressoraId
                  ? impressoras.find((i) => i.id === impressoraId)?.nome ?? "Impressora selecionada"
                  : "⚠️ nenhuma impressora selecionada"}{" "}
                · R$ {precoKwh}/kWh
              </span>
            )}
          </span>
          <span className="text-base-muted shrink-0">{mostrarParametros ? "▲" : "▼"}</span>
        </button>

        {mostrarParametros && (
          <div className="space-y-4 pt-2">
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
          </div>
        )}
      </Card>

      {/* Insumos e Lucro — recolhido por padrão: idem, já vem salvo */}
      <Card>
        <button
          type="button"
          onClick={() => setMostrarInsumos(!mostrarInsumos)}
          className="w-full flex items-center justify-between"
        >
          <span className="text-left">
            <span className="font-medium flex items-center gap-2">🧵 Insumos e Lucro</span>
            {!mostrarInsumos && (
              <span className="text-xs text-base-muted block mt-0.5">
                {usarEstoqueFilamento
                  ? filamentos.find((f) => f.id === filamentoId)?.material ?? "filamento do estoque"
                  : `R$ ${precoFilamentoKg}/kg`}{" "}
                · falha {taxaFalha}%
              </span>
            )}
          </span>
          <span className="text-base-muted shrink-0">{mostrarInsumos ? "▲" : "▼"}</span>
        </button>

        {mostrarInsumos && (
          <div className="space-y-4 pt-2">
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
          </div>
        )}
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

        {!pronto && (
          <p className="text-sm text-base-muted text-center py-2">
            Preencha o nome da peça e o peso lá em cima pra ver o resultado calculado ao vivo aqui embaixo.
          </p>
        )}
      </Card>

      {/* Resultado — sempre ao vivo, atualiza sozinho a cada alteração */}
      {pronto && (
        <Card title="Resultado do Cálculo" icon="✅" className="border-accent/40">
          <div>
            <p className="text-xs font-medium text-base-muted uppercase tracking-wide mb-2">Custo de produção</p>
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between border-b border-base-border/60 pb-2">
                <span className="text-base-muted">Consumo de filamento</span>
                <span>{resultado.consumo_filamento_g.toFixed(1)} g</span>
              </div>
              <div className="flex justify-between border-b border-base-border/60 pb-2">
                <span className="text-base-muted">Material</span>
                <span>{formatBRL(resultado.custo_filamento)}</span>
              </div>
              <div className="flex justify-between border-b border-base-border/60 pb-2">
                <span className="text-base-muted">Energia</span>
                <span>{formatBRL(resultado.custo_energia)}</span>
              </div>
              <div className="flex justify-between border-b border-base-border/60 pb-2">
                <span className="text-base-muted">Depreciação da impressora</span>
                <span>{formatBRL(resultado.custo_impressora)}</span>
              </div>
              <div className="flex justify-between border-b border-base-border/60 pb-2 font-medium sm:col-span-2">
                <span>Custo de produção (unitário)</span>
                <span>{formatBRL(resultado.custo_producao_unit)}</span>
              </div>
              <div className="flex justify-between border-b border-base-border/60 pb-2 font-medium text-good sm:col-span-2">
                <span>Lucro ({lucroDesejado}%)</span>
                <span>{formatBRL(resultado.lucro_unit)}</span>
              </div>
            </div>
          </div>

          {(Number(custosExtras) > 0 || Number(frete) > 0 || resultado.custo_mao_obra > 0) && (
            <div>
              <p className="text-xs font-medium text-base-muted uppercase tracking-wide mb-2">
                Serviços e custos fixos (sem markup)
              </p>
              <div className="grid sm:grid-cols-2 gap-3 text-sm">
                {resultado.custo_mao_obra > 0 && (
                  <div className="flex justify-between border-b border-base-border/60 pb-2">
                    <span className="text-base-muted">Mão de obra</span>
                    <span>{formatBRL(resultado.custo_mao_obra)}</span>
                  </div>
                )}
                {Number(custosExtras) > 0 && (
                  <div className="flex justify-between border-b border-base-border/60 pb-2">
                    <span className="text-base-muted">Extras</span>
                    <span>{formatBRL(Number(custosExtras))}</span>
                  </div>
                )}
                {Number(frete) > 0 && (
                  <div className="flex justify-between border-b border-base-border/60 pb-2">
                    <span className="text-base-muted">Frete</span>
                    <span>{formatBRL(Number(frete))}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rounded-xl bg-base-surface2 p-4 space-y-2">
            {resultado.preco_sugerido_marketplace_unit !== null ? (
              <>
                <div className="flex justify-between items-baseline">
                  <span className="text-base-muted text-sm">
                    🛒 Preço com taxa {plataformaSelecionada ? `(${plataformaSelecionada.nome})` : "de marketplace"}
                  </span>
                  <span className="text-2xl font-semibold text-accent-hover">
                    {formatBRL(resultado.preco_sugerido_marketplace_unit)}
                  </span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="text-base-muted text-sm">Preço sugerido (sem taxa)</span>
                  <span className="text-base font-medium">{formatBRL(resultado.preco_sugerido_unit)}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between items-baseline">
                <span className="text-base-muted text-sm">Preço sugerido (unitário)</span>
                <span className="text-2xl font-semibold text-accent-hover">{formatBRL(resultado.preco_sugerido_unit)}</span>
              </div>
            )}
            <p className="text-xs text-base-muted pt-1">
              Custo total do lote (sem lucro): {formatBRL(resultado.custo_total)}
            </p>
          </div>

          {salvo ? (
            <div className="flex items-center justify-between gap-3 text-good text-sm bg-good/10 rounded-xl px-4 py-3">
              <span>✅ Orçamento salvo!</span>
              <Link href="/orcamentos" className="font-medium underline shrink-0">
                Ver em Meus Orçamentos
              </Link>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button type="button" onClick={salvarOrcamento} disabled={salvando}>
                {salvando ? "Salvando..." : editandoId ? "💾 Salvar alterações" : "💾 Salvar orçamento"}
              </Button>
              {!editandoId && (
                <Button type="button" variant="secondary" onClick={salvarComoProduto}>
                  🧩 Salvar como Produto
                </Button>
              )}
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
