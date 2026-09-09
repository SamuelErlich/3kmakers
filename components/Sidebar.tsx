"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Papel } from "@/lib/types";

const SECOES = [
  {
    titulo: "Vender",
    itens: [
      { href: "/calculadora", label: "Calculadora", icon: "🧮" },
      { href: "/orcamentos", label: "Meus Orçamentos", icon: "📄" },
      { href: "/produtos", label: "Meus Produtos", icon: "🧩" },
      { href: "/pedidos", label: "Pedidos", icon: "🗂️" },
      { href: "/vendas", label: "Vendas", icon: "💲" },
    ],
  },
  {
    titulo: "Análise",
    itens: [
      { href: "/financeiro", label: "Financeiro", icon: "📊" },
      { href: "/relatorios", label: "Relatórios", icon: "🧾" },
      { href: "/ranking", label: "Ranking", icon: "🏆" },
    ],
  },
  {
    titulo: "Gastos",
    itens: [
      { href: "/outros-gastos", label: "Outros Gastos", icon: "💸" },
      { href: "/investimentos", label: "Investimentos", icon: "📈" },
    ],
  },
  {
    titulo: "Cadastros",
    itens: [
      { href: "/impressoras", label: "Impressoras", icon: "🖨️" },
      { href: "/filamentos", label: "Filamentos", icon: "🧵" },
      { href: "/insumos", label: "Insumos", icon: "📦" },
    ],
  },
];

export function Sidebar({ nome, papel }: { nome: string; papel: Papel }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const [aberto, setAberto] = useState(false);

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  function ItemMenu({ href, label, icon }: { href: string; label: string; icon: string }) {
    const ativo = pathname?.startsWith(href);
    return (
      <Link
        href={href}
        onClick={() => setAberto(false)}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
          ativo
            ? "bg-accent-gradient text-white font-medium"
            : "text-base-muted hover:bg-base-surface2 hover:text-base-text"
        }`}
      >
        <span className="w-4 text-center shrink-0">{icon}</span>
        {label}
      </Link>
    );
  }

  const conteudo = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-base-border">
        <h1 className="font-semibold text-lg">Controle 3D</h1>
        <p className="text-xs text-base-muted mt-0.5">{nome}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-5">
        {SECOES.map((secao) => (
          <div key={secao.titulo}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold text-base-faint uppercase tracking-wider">
              {secao.titulo}
            </p>
            <div className="space-y-0.5">
              {secao.itens.map((item) => (
                <ItemMenu key={item.href} {...item} />
              ))}
            </div>
          </div>
        ))}

        {papel === "admin" && (
          <div>
            <p className="px-3 pb-1.5 text-[11px] font-semibold text-base-faint uppercase tracking-wider">
              Admin
            </p>
            <div className="space-y-0.5">
              <ItemMenu href="/configuracoes" label="Configurações" icon="⚙️" />
            </div>
          </div>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-base-border">
        <button
          onClick={sair}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-base-muted hover:bg-base-surface2 hover:text-bad transition-colors"
        >
          <span className="w-4 text-center shrink-0">🚪</span>
          Sair
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* topo mobile */}
      <div className="md:hidden flex items-center justify-between px-4 h-14 border-b border-base-border bg-base-surface sticky top-0 z-30">
        <span className="font-semibold">Controle 3D</span>
        <button onClick={() => setAberto(true)} className="text-2xl leading-none">
          ☰
        </button>
      </div>

      {/* sidebar desktop */}
      <aside className="hidden md:flex w-64 shrink-0 border-r border-base-border bg-base-surface h-screen sticky top-0">
        {conteudo}
      </aside>

      {/* sidebar mobile (drawer) */}
      {aberto && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="w-72 bg-base-surface h-full">{conteudo}</div>
          <div className="flex-1 bg-black/60" onClick={() => setAberto(false)} />
        </div>
      )}
    </>
  );
}
