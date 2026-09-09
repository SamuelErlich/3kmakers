"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Field";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setCarregando(false);
    if (error) {
      if (error.message === "Email not confirmed") {
        setErro("Seu e-mail ainda não foi confirmado. Confira sua caixa de entrada (ou spam).");
      } else if (error.message === "Invalid login credentials") {
        setErro("E-mail ou senha incorretos.");
      } else {
        setErro(error.message);
      }
      return;
    }
    router.refresh();
    router.push("/calculadora");
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">Controle 3D</h1>
          <p className="text-base-muted text-sm">Entre para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">E-mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Senha</label>
            <input
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {erro && <p className="text-sm text-bad">{erro}</p>}

          <Button type="submit" disabled={carregando} className="w-full">
            {carregando ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <p className="text-center text-sm text-base-muted">
          Ainda não tem conta?{" "}
          <Link href="/signup" className="text-accent-hover font-medium">
            Criar conta
          </Link>
        </p>
      </div>
    </div>
  );
}
