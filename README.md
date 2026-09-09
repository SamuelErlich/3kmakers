# Controle 3D — Fase 1

Precificação, orçamentos, pedidos e vendas para produção de impressão 3D.
Stack: **Next.js 14 (App Router)** + **Supabase** (banco Postgres + login) + Tailwind.

## O que já funciona nesta fase

- Login/cadastro com papel Admin/Operador (cada um com painel pessoal)
- Cadastro de Impressoras, Filamentos (com estoque e alerta), Insumos (estoque) e Plataformas (taxas)
- Configurações gerais (mão de obra padrão, margem padrão, alerta de estoque) — só admin
- **Calculadora completa**: monta o orçamento, calcula custo e preço sugerido (com ou sem taxa de marketplace) e salva

Os menus "Meus Orçamentos", "Meus Produtos", "Pedidos", "Vendas", "Investimentos", "Financeiro" e "Ranking"
aparecem no menu como "em breve" — são as próximas fases.

## 1. Criar o projeto no Supabase

1. Crie uma conta/projeto em https://supabase.com (plano free serve).
2. Vá em **SQL Editor** e cole o conteúdo de `sql/schema.sql` inteiro. Rode uma vez só.
3. Vá em **Storage** e crie um bucket chamado `pecas`, marcado como **público** (é onde ficam as fotos das peças).
   - Em Storage > Policies do bucket `pecas`, adicione uma policy simples permitindo `select` público e
     `insert`/`update`/`delete` para usuários autenticados (o Supabase tem um template pronto pra isso,
     "Allow authenticated uploads").
4. Vá em **Project Settings > API** e copie a `Project URL` e a `anon public key`.
5. Vá em **Table Editor > profiles**: depois de você criar sua própria conta no app (passo 3 abaixo),
   ache sua linha e troque `papel` de `operador` para `admin`. Só o primeiro usuário precisa fazer isso na mão.

## 2. Rodar local (opcional, pra testar antes de subir)

```bash
npm install
cp .env.local.example .env.local
# edite .env.local com a URL e a anon key do seu projeto Supabase
npm run dev
```

Acesse http://localhost:3000, crie sua conta em `/signup`, confirme o e-mail, promova seu usuário a admin
no Supabase (passo 5 acima), e faça login.

## 3. Deploy na Vercel

1. Suba esta pasta num repositório (GitHub/GitLab/Bitbucket) — a Vercel importa direto de lá.
2. Em vercel.com, "New Project" → importe o repositório.
3. Em **Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (os mesmos valores do `.env.local`).
4. Deploy. Pronto, é isso — sem servidor pra configurar, sem banco pra criar na mão além do passo 1.

## Estrutura

```
app/
  login/, signup/            → autenticação
  (app)/                     → tudo que precisa estar logado (tem a sidebar)
    calculadora/
    impressoras/
    filamentos/
    insumos/
    configuracoes/           → só admin (parâmetros + plataformas)
lib/
  calc.ts                    → toda a lógica de cálculo, comentada e isolada
  supabase/                  → clientes do Supabase (browser/servidor)
  types.ts                   → tipos espelhando as tabelas
sql/schema.sql               → schema completo (todas as fases já incluídas)
```

## Próximas fases

- **Fase 2**: Meus Orçamentos (lista/histórico/edição), Meus Produtos (reaproveitar peça), Pedidos (Kanban por status)
- **Fase 3**: Vendas (por plataforma), Investimentos, Financeiro (painel com gráfico mensal), Ranking, Relatórios (mês ou período livre, exportável)
