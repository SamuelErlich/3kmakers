# Controle 3D — sistema completo (Fases 1, 2 e 3)

Precificação, orçamentos, pedidos, vendas e relatórios para produção de impressão 3D.
Stack: **Next.js 14 (App Router)** + **Supabase** (banco Postgres + login) + Tailwind + Recharts.

## O que o sistema faz

- Login/cadastro com papel Admin/Operador (cada um com painel pessoal; admin vê tudo com o toggle
  "Ver de todos" nas telas que têm dado por usuário)
- Cadastro de Impressoras, Filamentos (com estoque e alerta), Insumos (estoque) e Plataformas (taxas)
- Configurações gerais (mão de obra padrão, margem padrão, alerta de estoque) — só admin
- **Calculadora**: monta o orçamento, calcula custo e preço sugerido (com ou sem taxa de marketplace)
  e salva. Lucro é markup sobre o custo de produção (material + energia + depreciação), não margem
  sobre preço final — por isso o slider de lucro pode passar de 100% sem quebrar a conta.
- **Meus Orçamentos**: histórico completo, busca, filtro por status, troca de status na lista,
  editar (reabre a Calculadora preenchida), duplicar, excluir
- **Meus Produtos**: modelos reaproveitáveis — "Usar na Calculadora" carrega tudo de novo, e dá pra
  "Salvar como Produto" direto depois de calcular
- **Pedidos**: Kanban (Em produção → Pronto → Vendido → Entregue → Cancelado) com avançar/voltar etapa
- **Vendas**: registra a venda de um Pedido, calculando receita líquida já descontando a taxa da
  plataforma escolhida; ao salvar, o Pedido correspondente avança sozinho pro status "Vendido"
- **Outros Gastos** e **Investimentos**: despesas soltas e aportes de capital, separados
- **Financeiro**: cartões (receita, custo, lucro líquido, ROI) + gráfico mensal por ano
- **Ranking**: produtos mais vendidos ou mais lucrativos
- **Relatórios**: por mês ou período livre, agrupado por plataforma e por item, com exportação CSV

## Como tudo se conecta (sincronização)

```
Calculadora → Orçamento salvo (status: Orçamento)
            → muda status pra "Em produção" em Meus Orçamentos → aparece em Pedidos
            → avança o Kanban até "Pronto"
            → registra a Venda (escolhe o Pedido) → status vira "Vendido" sozinho
            → a Venda alimenta Financeiro, Ranking e Relatórios ao mesmo tempo
```

Não existe cálculo duplicado: a Calculadora, a edição de um orçamento e o carregamento de um Produto
usam a mesma função em `lib/calc.ts`. Vendas usa a tabela `plataformas` (a mesma cadastrada em
Configurações) — nenhuma taxa fica "hardcoded" em um lugar só.

## Decisões que valem a pena conferir

- **Editar um orçamento não desconta o estoque de filamento de novo** (só desconta na criação).
- **Duplicar** um orçamento sempre volta o status para "Orçamento".
- Em Pedidos, "Voltar" nunca retorna para "Orçamento" — só editando em Meus Orçamentos.
- **Uma Venda só pode ser registrada uma vez por Pedido** (o seletor de "Pedido" em Vendas some da
  lista assim que a venda é registrada). Se precisar vender o mesmo Pedido de novo (ex: reposição),
  duplique o orçamento original em Meus Orçamentos primeiro.
- **Excluir uma Venda não reverte o status do Pedido** de volta sozinho — ajuste manualmente em
  Meus Orçamentos se precisar.
- O card de **Investimentos** no Financeiro soma o valor de compra de todas as impressoras
  cadastradas (recurso compartilhado da oficina) + os investimentos avulsos do escopo selecionado
  (seus ou de todos, conforme o toggle).
- A exportação de Relatórios é em **CSV** (abre direto no Excel/Google Sheets). Se preferir um PDF
  formatado, é um ajuste rápido de adicionar depois.

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
6. (Opcional, mas recomendado) Em **Authentication > Providers > Email**, desligue "Confirm email" —
   assim novas contas da equipe entram direto, sem depender do e-mail de confirmação chegar.

## 2. Rodar local (opcional, pra testar antes de subir)

```bash
npm install
cp .env.local.example .env.local
# edite .env.local com a URL e a anon key do seu projeto Supabase
npm run dev
```

Acesse http://localhost:3000, crie sua conta em `/signup`, confirme o e-mail (ou desligue a
confirmação, passo 6 acima), promova seu usuário a admin no Supabase (passo 5 acima), e faça login.

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
    calculadora/              → aceita ?editar=<id> e ?produto=<id> na URL
    orcamentos/               → lista/histórico
    produtos/                 → modelos reaproveitáveis
    pedidos/                  → kanban
    vendas/                   → registra venda a partir de um pedido
    outros-gastos/, investimentos/
    financeiro/               → painel + gráfico mensal
    ranking/                  → produtos mais vendidos/lucrativos
    relatorios/               → por mês ou período livre, com exportação CSV
    impressoras/, filamentos/, insumos/
    configuracoes/            → só admin (parâmetros + plataformas)
lib/
  calc.ts                    → toda a lógica de cálculo, comentada e isolada
  status.ts                  → ordem e metadados dos status (usado em Orçamentos/Pedidos)
  supabase/                  → clientes do Supabase (browser/servidor)
  types.ts                   → tipos espelhando as tabelas
sql/schema.sql               → schema completo (todas as fases já incluídas)
```

## Sistema completo — o que ajustar daqui pra frente é refinamento

As três fases planejadas estão entregues. Próximos ajustes tendem a ser pontuais: relatório em PDF,
exportação por período em Vendas, permissões mais finas por operador, etc. — é só falar o que precisa.
