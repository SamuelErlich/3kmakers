"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Papel } from "@/lib/types";

const MENU_ATIVO = [
  { href: "/calculadora", label: "Calculadora", icon: "🧮" },
  { href: "/impressoras", label: "Impressoras", icon: "🖨️" },
  { href: "/filamentos", label: "Filamentos", icon: "🧵" },
  { href: "/insumos", label: "Insumos", icon: "📦" },
];

const MENU_EM_BREVE = [
  { label: "Meus Orçamentos", icon: "📄" },
  { label: "Meus Produtos", icon: "🧩" },
  { label: "Pedidos", icon: "🗂️" },
  { label: "Vendas", icon: "💲" },
  { label: "Investimentos", icon: "📈" },
  { label: "Financeiro", icon: "📊" },
  { label: "Ranking", icon: "🏆" },
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

  const conteudo = (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-base-border">
        <h1 className="font-semibold text-lg">Controle 3D</h1>
        <p className="text-xs text-base-muted mt-0.5">{nome}</p>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {MENU_ATIVO.map((item) => {
          const ativo = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setAberto(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                ativo
                  ? "bg-accent-gradient text-white font-medium"
                  : "text-base-muted hover:bg-base-surface2 hover:text-base-text"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        <div className="pt-3 mt-3 border-t border-base-border/60">
          {MENU_EM_BREVE.map((item) => (
            <div
              key={item.label}
              className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm text-base-faint cursor-not-allowed"
            >
              <span className="flex items-center gap-3">
                <span className="opacity-50">{item.icon}</span>
                {item.label}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-base-surface2 border border-base-border">
                em breve
              </span>
            </div>
          ))}
        </div>

        {papel === "admin" && (
          <div className="pt-3 mt-3 border-t border-base-border/60">
            <Link
              href="/configuracoes"
              onClick={() => setAberto(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                pathname?.startsWith("/configuracoes")
                  ? "bg-accent-gradient text-white font-medium"
                  : "text-base-muted hover:bg-base-surface2 hover:text-base-text"
              }`}
            >
              <span>⚙️</span>
              Configurações
            </Link>
          </div>
        )}
      </nav>

      <div className="px-3 py-3 border-t border-base-border">
        <button
          onClick={sair}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-base-muted hover:bg-base-surface2 hover:text-bad transition-colors"
        >
          <span>🚪</span>
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
