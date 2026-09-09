-- ============================================================
-- Controle 3D — schema completo (Fase 1 a 3)
-- Rode este arquivo inteiro no SQL Editor do Supabase, uma vez.
-- Depois de rodar, vá em Table Editor > profiles e troque o
-- "papel" do seu usuário de 'operador' para 'admin' manualmente
-- (o primeiro usuário sempre precisa ser promovido à mão).
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- PERFIS (estende auth.users)
-- ------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  empresa_nome text,
  papel text not null default 'operador' check (papel in ('admin','operador')),
  criado_em timestamptz not null default now()
);

-- cria o profile automaticamente quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, nome, empresa_nome, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', new.email),
    new.raw_user_meta_data->>'empresa_nome',
    'operador'
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- função auxiliar: usuário atual é admin?
create or replace function public.is_admin()
returns boolean as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and papel = 'admin'
  );
$$ language sql security definer stable;

-- ------------------------------------------------------------
-- CONFIGURAÇÕES GERAIS (linha única)
-- ------------------------------------------------------------
create table if not exists config (
  id int primary key default 1,
  custo_mao_obra_hora numeric not null default 0,
  margem_padrao numeric not null default 0.4,      -- 0.4 = 40%
  alerta_estoque_pct numeric not null default 0.2, -- 0.2 = 20% do estoque inicial
  atualizado_em timestamptz not null default now(),
  constraint config_singleton check (id = 1)
);
insert into config (id) values (1) on conflict (id) do nothing;

-- ------------------------------------------------------------
-- IMPRESSORAS
-- ------------------------------------------------------------
create table if not exists impressoras (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  valor_compra numeric not null default 0,
  vida_util_horas numeric not null default 5000,
  consumo_w numeric not null default 200,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- FILAMENTOS (estoque)
-- ------------------------------------------------------------
create table if not exists filamentos (
  id uuid primary key default gen_random_uuid(),
  material text not null,
  cor_marca text,
  peso_bobina_g numeric not null default 1000,
  preco_bobina numeric not null default 0,
  frete numeric not null default 0,
  estoque_inicial_g numeric not null default 0,
  estoque_atual_g numeric not null default 0,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- INSUMOS (embalagem, etiqueta, suporte etc. — só estoque)
-- ------------------------------------------------------------
create table if not exists insumos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  unidade text not null default 'un',
  preco_unitario numeric not null default 0,
  estoque_atual numeric not null default 0,
  estoque_minimo numeric not null default 0,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- PLATAFORMAS DE VENDA (taxa configurável)
-- ------------------------------------------------------------
create table if not exists plataformas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  taxa_percentual numeric not null default 0, -- 0.20 = 20%
  taxa_fixa numeric not null default 0,
  ativa boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- MEUS PRODUTOS (modelos reaproveitáveis) — Fase 2
-- ------------------------------------------------------------
create table if not exists produtos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles(id) on delete cascade,
  nome text not null,
  foto_url text,
  peso_g numeric,
  tempo_impressao_min numeric,
  filamento_id uuid references filamentos(id),
  observacoes text,
  -- preço salvo do último cálculo — habilita o botão "Vender" direto
  -- em Meus Produtos, sem precisar recalcular na Calculadora
  custo_unitario numeric,
  preco_final_unit numeric,
  lucro_desejado_pct numeric,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- ORÇAMENTOS / PEDIDOS (mesma tabela, status muda)
-- ------------------------------------------------------------
create table if not exists orcamentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles(id) on delete cascade,
  produto_id uuid references produtos(id),

  nome_peca text not null,
  cliente text,
  foto_url text,
  qtde numeric not null default 1,
  peso_g numeric not null default 0,
  link_stl text,
  observacoes text,

  tempo_impressao_min numeric not null default 0,
  impressora_id uuid references impressoras(id),

  energia_modo text not null default 'consumo' check (energia_modo in ('consumo','medido')),
  energia_preco_kwh numeric not null default 0,
  energia_wh_total numeric,

  filamento_id uuid references filamentos(id),
  filamento_preco_kg_manual numeric,
  taxa_falha_pct numeric not null default 0,

  valor_hora_pessoal numeric not null default 0,
  pos_processamento_modo text not null default 'peca' check (pos_processamento_modo in ('peca','lote')),
  tempo_pos_processamento_min numeric not null default 0,
  custos_extra numeric not null default 0,
  frete numeric not null default 0,

  lucro_desejado_pct numeric not null default 0,
  incluir_taxa_marketplace boolean not null default false,
  plataforma_id uuid references plataformas(id),

  status text not null default 'orcamento'
    check (status in ('orcamento','em_producao','pronto','vendido','entregue','cancelado')),
  data_entrega_prevista date,

  -- resultado do cálculo, salvo no momento (não recalcula sozinho depois)
  consumo_filamento_g numeric,
  custo_filamento numeric,
  custo_energia numeric,
  custo_impressora numeric,
  custo_mao_obra numeric,
  custo_total numeric,
  preco_sugerido_unit numeric,
  preco_sugerido_marketplace_unit numeric,
  preco_final_unit numeric,

  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- VENDAS — Fase 3
-- ------------------------------------------------------------
create table if not exists vendas (
  id uuid primary key default gen_random_uuid(),
  orcamento_id uuid not null references orcamentos(id) on delete cascade,
  usuario_id uuid not null references profiles(id) on delete cascade,
  plataforma_id uuid references plataformas(id),
  qtde_vendida numeric not null default 1,
  preco_realizado_unit numeric not null default 0,
  receita numeric,
  custo_total numeric,
  lucro numeric,
  margem numeric,
  status_pagamento text not null default 'aguardando'
    check (status_pagamento in ('aguardando','pago','parcial','cancelado')),
  data_venda date not null default current_date,
  observacoes text,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- OUTROS GASTOS — Fase 3
-- ------------------------------------------------------------
create table if not exists outros_gastos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles(id) on delete cascade,
  data date not null default current_date,
  categoria text,
  descricao text,
  valor numeric not null default 0,
  orcamento_id uuid references orcamentos(id),
  pago boolean not null default false,
  observacoes text,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- INVESTIMENTOS — Fase 3
-- ------------------------------------------------------------
create table if not exists investimentos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references profiles(id) on delete cascade,
  descricao text not null,
  categoria text,
  valor numeric not null default 0,
  data date not null default current_date,
  observacoes text,
  criado_em timestamptz not null default now()
);

-- ============================================================
-- RLS — Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table config enable row level security;
alter table impressoras enable row level security;
alter table filamentos enable row level security;
alter table insumos enable row level security;
alter table plataformas enable row level security;
alter table produtos enable row level security;
alter table orcamentos enable row level security;
alter table vendas enable row level security;
alter table outros_gastos enable row level security;
alter table investimentos enable row level security;

-- profiles: cada um vê o próprio, admin vê todos
create policy "profiles_select" on profiles for select
  using (id = auth.uid() or is_admin());
create policy "profiles_update_self" on profiles for update
  using (id = auth.uid() or is_admin());

-- config: todo autenticado lê, só admin edita
create policy "config_select" on config for select
  using (auth.role() = 'authenticated');
create policy "config_update" on config for update
  using (is_admin());

-- cadastros compartilhados: todo autenticado lê, só admin escreve
create policy "impressoras_select" on impressoras for select using (auth.role() = 'authenticated');
create policy "impressoras_insert" on impressoras for insert with check (is_admin());
create policy "impressoras_update" on impressoras for update using (is_admin());
create policy "impressoras_delete" on impressoras for delete using (is_admin());

create policy "filamentos_select" on filamentos for select using (auth.role() = 'authenticated');
create policy "filamentos_insert" on filamentos for insert with check (is_admin());
create policy "filamentos_update" on filamentos for update using (is_admin());
create policy "filamentos_delete" on filamentos for delete using (is_admin());

create policy "insumos_select" on insumos for select using (auth.role() = 'authenticated');
create policy "insumos_insert" on insumos for insert with check (is_admin());
create policy "insumos_update" on insumos for update using (is_admin());
create policy "insumos_delete" on insumos for delete using (is_admin());

create policy "plataformas_select" on plataformas for select using (auth.role() = 'authenticated');
create policy "plataformas_insert" on plataformas for insert with check (is_admin());
create policy "plataformas_update" on plataformas for update using (is_admin());
create policy "plataformas_delete" on plataformas for delete using (is_admin());

-- tabelas "pessoais": dono vê/edita o que é seu, admin vê/edita tudo
create policy "produtos_all" on produtos for all
  using (usuario_id = auth.uid() or is_admin())
  with check (usuario_id = auth.uid() or is_admin());

create policy "orcamentos_all" on orcamentos for all
  using (usuario_id = auth.uid() or is_admin())
  with check (usuario_id = auth.uid() or is_admin());

create policy "vendas_all" on vendas for all
  using (usuario_id = auth.uid() or is_admin())
  with check (usuario_id = auth.uid() or is_admin());

create policy "outros_gastos_all" on outros_gastos for all
  using (usuario_id = auth.uid() or is_admin())
  with check (usuario_id = auth.uid() or is_admin());

create policy "investimentos_all" on investimentos for all
  using (usuario_id = auth.uid() or is_admin())
  with check (usuario_id = auth.uid() or is_admin());

-- ------------------------------------------------------------
-- Dados iniciais (opcional, mas ajuda a testar de cara)
-- ------------------------------------------------------------
insert into plataformas (nome, taxa_percentual, taxa_fixa)
select v.nome, v.taxa_percentual, v.taxa_fixa
from (values
  ('Shopee', 0.20, 4),
  ('Mercado Livre', 0.16, 5),
  ('Instagram/WhatsApp (venda direta)', 0, 0)
) as v(nome, taxa_percentual, taxa_fixa)
where not exists (select 1 from plataformas p where p.nome = v.nome);
