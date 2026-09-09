"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button, Field, Input, Select } from "@/components/ui/Field";
import type { Filamento } from "@/lib/types";

interface Produto {
  id: string;
  usuario_id: string;
  nome: string;
  foto_url: string | null;
  peso_g: number | null;
  tempo_impressao_min: number | null;
  filamento_id: string | null;
  observacoes: string | null;
  criado_em: string;
}

export default function ProdutosPage() {
  const supabase = createClient();
  const [lista, setLista] = useState<Produto[]>([]);
  const [filamentos, setFilamentos] = useState<Filamento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [editando, setEditando] = useState<Produto | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    peso_g: "",
    horas: "0",
    minutos: "0",
    filamento_id: "",
    observacoes: "",
  });
  const [salvando, setSalvando] = useState(false);

  async function carregar() {
    setCarregando(true);
    const [{ data: prods }, { data: fils }] = await Promise.all([
      supabase.from("produtos").select("*").order("criado_em", { ascending: false }),
      supabase.from("filamentos").select("*").order("material"),
    ]);
    setLista((prods as Produto[]) ?? []);
    setFilamentos((fils as Filamento[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function abrirNovo() {
    setEditando(null);
    setForm({ nome: "", peso_g: "", horas: "0", minutos: "0", filamento_id: "", observacoes: "" });
    setFoto(null);
    setFotoPreview(null);
    setMostrarForm(true);
  }

  function abrirEdicao(p: Produto) {
    setEditando(p);
    const min = p.tempo_impressao_min ?? 0;
    setForm({
      nome: p.nome,
      peso_g: p.peso_g ? String(p.peso_g) : "",
      horas: String(Math.floor(min / 60)),
      minutos: String(min % 60),
      filamento_id: p.filamento_id ?? "",
      observacoes: p.observacoes ?? "",
    });
    setFoto(null);
    setFotoPreview(p.foto_url);
    setMostrarForm(true);
  }

  function handleFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFoto(file);
    setFotoPreview(URL.createObjectURL(file));
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

    let fotoUrl = editando?.foto_url ?? null;
    if (foto) {
      const nomeArquivo = `${user.id}/produtos/${Date.now()}-${foto.name}`;
      const { error: upErr } = await supabase.storage.from("pecas").upload(nomeArquivo, foto);
      if (!upErr) {
        const { data: pub } = supabase.storage.from("pecas").getPublicUrl(nomeArquivo);
        fotoUrl = pub.publicUrl;
      }
    }

    const payload = {
      nome: form.nome,
      foto_url: fotoUrl,
      peso_g: Number(form.peso_g) || null,
      tempo_impressao_min: (Number(form.horas) || 0) * 60 + (Number(form.minutos) || 0),
      filamento_id: form.filamento_id || null,
      observacoes: form.observacoes || null,
    };

    if (editando) {
      await supabase.from("produtos").update(payload).eq("id", editando.id);
    } else {
      await supabase.from("produtos").insert({ ...payload, usuario_id: user.id });
    }
    setSalvando(false);
    setMostrarForm(false);
    carregar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir este produto?")) return;
    await supabase.from("produtos").delete().eq("id", id);
    carregar();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Meus Produtos</h1>
          <p className="text-sm text-base-muted mt-1">
            Modelos que você já calculou antes — reaproveite direto na Calculadora sem digitar tudo de novo.
          </p>
        </div>
        {!mostrarForm && (
          <Button onClick={abrirNovo} className="shrink-0">
            + Novo produto
          </Button>
        )}
      </div>

      {mostrarForm && (
        <Card title={editando ? "Editar produto" : "Novo produto"} icon="🧩">
          <form onSubmit={salvar} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Nome do produto">
                <Input required value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="Ex: Yoda Baby" />
              </Field>
            </div>

            <div className="sm:col-span-2">
              <Field label="Foto (opcional)">
                <label className="block border border-dashed border-base-border rounded-xl p-4 text-center cursor-pointer hover:border-accent transition-colors">
                  {fotoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fotoPreview} alt="Prévia" className="mx-auto max-h-32 rounded-lg" />
                  ) : (
                    <p className="text-sm text-accent-hover">Clique para selecionar uma imagem</p>
                  )}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleFoto} />
                </label>
              </Field>
            </div>

            <Field label="Peso (g)">
              <Input type="number" step="0.1" value={form.peso_g} onChange={(e) => setForm({ ...form, peso_g: e.target.value })} />
            </Field>
            <Field label="Filamento padrão">
              <Select value={form.filamento_id} onChange={(e) => setForm({ ...form, filamento_id: e.target.value })}>
                <option value="">Nenhum (informar na hora)</option>
                {filamentos.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.material} {f.cor_marca ? `— ${f.cor_marca}` : ""}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Tempo de impressão — horas">
              <Input type="number" min={0} value={form.horas} onChange={(e) => setForm({ ...form, horas: e.target.value })} />
            </Field>
            <Field label="Minutos">
              <Input type="number" min={0} max={59} value={form.minutos} onChange={(e) => setForm({ ...form, minutos: e.target.value })} />
            </Field>

            <div className="sm:col-span-2">
              <Field label="Observações">
                <textarea
                  value={form.observacoes}
                  onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
                  rows={2}
                />
              </Field>
            </div>

            <div className="sm:col-span-2 flex gap-2">
              <Button type="submit" disabled={salvando}>
                {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Adicionar produto"}
              </Button>
              <Button type="button" variant="secondary" onClick={() => setMostrarForm(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      <Card title="Produtos cadastrados" icon="📋">
        {carregando ? (
          <p className="text-sm text-base-muted">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="text-sm text-base-muted">
            Nenhum produto salvo ainda. Você também pode salvar um direto da Calculadora depois de calcular.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {lista.map((p) => (
              <div key={p.id} className="flex gap-3 border border-base-border rounded-xl p-3">
                {p.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.foto_url} alt={p.nome} className="w-16 h-16 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-base-surface2 flex items-center justify-center text-2xl shrink-0">
                    🧊
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <div>
                    <p className="font-medium truncate">{p.nome}</p>
                    <p className="text-xs text-base-muted">
                      {p.peso_g ? `${p.peso_g}g` : "peso não informado"} ·{" "}
                      {p.tempo_impressao_min ? `${Math.floor(p.tempo_impressao_min / 60)}h${p.tempo_impressao_min % 60}min` : "tempo não informado"}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link href={`/calculadora?produto=${p.id}`}>
                      <Button variant="primary" className="!px-3 !py-1.5 text-xs">
                        Usar na Calculadora
                      </Button>
                    </Link>
                    <Button variant="secondary" className="!px-3 !py-1.5 text-xs" onClick={() => abrirEdicao(p)}>
                      Editar
                    </Button>
                    <Button variant="danger" className="!px-3 !py-1.5 text-xs" onClick={() => excluir(p.id)}>
                      Excluir
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
