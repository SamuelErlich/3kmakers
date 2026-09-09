"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/Card";
import { Button, Field, Input } from "@/components/ui/Field";
import type { Config, Papel, Plataforma } from "@/lib/types";

export default function ConfiguracoesPage() {
  const supabase = createClient();
  const [papel, setPapel] = useState<Papel | null>(null);
  const [carregando, setCarregando] = useState(true);

  const [config, setConfig] = useState({ custo_mao_obra_hora: "0", margem_padrao: "40", alerta_estoque_pct: "20" });
  const [salvandoConfig, setSalvandoConfig] = useState(false);

  const [plataformas, setPlataformas] = useState<Plataforma[]>([]);
  const [editandoPlat, setEditandoPlat] = useState<Plataforma | null>(null);
  const [formPlat, setFormPlat] = useState({ nome: "", taxa_percentual: "0", taxa_fixa: "0" });
  const [salvandoPlat, setSalvandoPlat] = useState(false);

  async function carregar() {
    setCarregando(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from("profiles").select("papel").eq("id", user.id).single();
    setPapel((profile?.papel as Papel) ?? "operador");

    const { data: cfg } = await supabase.from("config").select("*").single();
    if (cfg) {
      setConfig({
        custo_mao_obra_hora: String(cfg.custo_mao_obra_hora),
        margem_padrao: String(Math.round(cfg.margem_padrao * 100)),
        alerta_estoque_pct: String(Math.round(cfg.alerta_estoque_pct * 100)),
      });
    }
    const { data: plats } = await supabase.from("plataformas").select("*").order("criado_em");
    setPlataformas((plats as Plataforma[]) ?? []);
    setCarregando(false);
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salvarConfig(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoConfig(true);
    await supabase
      .from("config")
      .update({
        custo_mao_obra_hora: Number(config.custo_mao_obra_hora) || 0,
        margem_padrao: (Number(config.margem_padrao) || 0) / 100,
        alerta_estoque_pct: (Number(config.alerta_estoque_pct) || 0) / 100,
      })
      .eq("id", 1);
    setSalvandoConfig(false);
  }

  function abrirNovaPlat() {
    setEditandoPlat(null);
    setFormPlat({ nome: "", taxa_percentual: "0", taxa_fixa: "0" });
  }

  function abrirEdicaoPlat(p: Plataforma) {
    setEditandoPlat(p);
    setFormPlat({ nome: p.nome, taxa_percentual: String(p.taxa_percentual * 100), taxa_fixa: String(p.taxa_fixa) });
  }

  async function salvarPlat(e: React.FormEvent) {
    e.preventDefault();
    setSalvandoPlat(true);
    const payload = {
      nome: formPlat.nome,
      taxa_percentual: (Number(formPlat.taxa_percentual) || 0) / 100,
      taxa_fixa: Number(formPlat.taxa_fixa) || 0,
    };
    if (editandoPlat) {
      await supabase.from("plataformas").update(payload).eq("id", editandoPlat.id);
    } else {
      await supabase.from("plataformas").insert(payload);
    }
    setSalvandoPlat(false);
    abrirNovaPlat();
    carregar();
  }

  async function excluirPlat(id: string) {
    if (!confirm("Excluir esta plataforma?")) return;
    await supabase.from("plataformas").delete().eq("id", id);
    carregar();
  }

  if (carregando) return <p className="text-sm text-base-muted">Carregando...</p>;

  if (papel !== "admin") {
    return (
      <Card title="Acesso restrito" icon="🔒">
        <p className="text-sm text-base-muted">Só administradores podem ver as configurações.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Configurações</h1>
        <p className="text-sm text-base-muted mt-1">Parâmetros gerais e plataformas de venda.</p>
      </div>

      <Card title="Parâmetros gerais" icon="⚙️">
        <form onSubmit={salvarConfig} className="grid sm:grid-cols-3 gap-4">
          <Field label="Custo padrão de mão de obra (R$/h)">
            <Input
              type="number"
              step="0.01"
              value={config.custo_mao_obra_hora}
              onChange={(e) => setConfig({ ...config, custo_mao_obra_hora: e.target.value })}
            />
          </Field>
          <Field label="Margem de lucro padrão (%)">
            <Input
              type="number"
              value={config.margem_padrao}
              onChange={(e) => setConfig({ ...config, margem_padrao: e.target.value })}
            />
          </Field>
          <Field label="Alerta de estoque (% do inicial)">
            <Input
              type="number"
              value={config.alerta_estoque_pct}
              onChange={(e) => setConfig({ ...config, alerta_estoque_pct: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-3">
            <Button type="submit" disabled={salvandoConfig}>
              {salvandoConfig ? "Salvando..." : "Salvar parâmetros"}
            </Button>
          </div>
        </form>
      </Card>

      <Card title={editandoPlat ? "Editar plataforma" : "Nova plataforma de venda"} icon="🛒">
        <form onSubmit={salvarPlat} className="grid sm:grid-cols-3 gap-4">
          <Field label="Nome">
            <Input
              required
              value={formPlat.nome}
              onChange={(e) => setFormPlat({ ...formPlat, nome: e.target.value })}
              placeholder="Ex: TikTok Shop"
            />
          </Field>
          <Field label="Taxa percentual (%)">
            <Input
              type="number"
              step="0.01"
              value={formPlat.taxa_percentual}
              onChange={(e) => setFormPlat({ ...formPlat, taxa_percentual: e.target.value })}
            />
          </Field>
          <Field label="Taxa fixa por venda (R$)">
            <Input
              type="number"
              step="0.01"
              value={formPlat.taxa_fixa}
              onChange={(e) => setFormPlat({ ...formPlat, taxa_fixa: e.target.value })}
            />
          </Field>
          <div className="sm:col-span-3 flex gap-2">
            <Button type="submit" disabled={salvandoPlat}>
              {salvandoPlat ? "Salvando..." : editandoPlat ? "Salvar alterações" : "Adicionar plataforma"}
            </Button>
            {editandoPlat && (
              <Button type="button" variant="secondary" onClick={abrirNovaPlat}>
                Cancelar
              </Button>
            )}
          </div>
        </form>
      </Card>

      <Card title="Plataformas cadastradas" icon="📋">
        <div className="space-y-3">
          {plataformas.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 border border-base-border rounded-xl px-4 py-3">
              <div>
                <p className="font-medium">{p.nome}</p>
                <p className="text-xs text-base-muted mt-0.5">
                  {(p.taxa_percentual * 100).toFixed(1)}% + R$ {p.taxa_fixa.toFixed(2)} por venda
                </p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="secondary" onClick={() => abrirEdicaoPlat(p)}>
                  Editar
                </Button>
                <Button variant="danger" onClick={() => excluirPlat(p.id)}>
                  Excluir
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
