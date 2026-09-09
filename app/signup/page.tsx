"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Field";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [nome, setNome] = useState("");
  const [empresaNome, setEmpresaNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [carregando, setCarregando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setCarregando(true);
    const { error } = await supabase.auth.signUp({
      email,
      password: senha,
      options: { data: { nome, empresa_nome: empresaNome } },
    });
    setCarregando(false);
    if (error) {
      setErro(error.message);
      return;
    }
    setSucesso(true);
  }

  if (sucesso) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <h1 className="text-xl font-semibold">Conta criada!</h1>
          <p className="text-base-muted text-sm">
            Confira seu e-mail para confirmar o cadastro e depois faça login.
          </p>
          <Button onClick={() => router.push("/login")} className="w-full">
            Ir para o login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-semibold">Criar conta</h1>
          <p className="text-base-muted text-sm">Comece a precificar suas peças</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Seu nome</label>
            <input required value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Gustavo" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Nome da empresa (aparece no orçamento)</label>
            <input
              value={empresaNome}
              onChange={(e) => setEmpresaNome(e.target.value)}
              placeholder="Ex: Print Masters 3D"
            />
          </div>
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
              minLength={6}
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="Mínimo 6 caracteres"
            />
          </div>

          {erro && <p className="text-sm text-bad">{erro}</p>}

          <Button type="submit" disabled={carregando} className="w-full">
            {carregando ? "Criando..." : "Criar conta"}
          </Button>
        </form>

        <p className="text-center text-sm text-base-muted">
          Já tem conta?{" "}
          <Link href="/login" className="text-accent-hover font-medium">
            Entrar
          </Link>
        </p>
      </div>
    </div>
  );
}
