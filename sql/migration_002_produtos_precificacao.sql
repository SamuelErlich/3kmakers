-- ============================================================
-- Migração: preço fica salvo junto com o produto (pra habilitar
-- o botão "Vender" em Meus Produtos sem precisar recalcular).
-- Rode isso uma vez no SQL Editor do Supabase.
-- ============================================================

alter table produtos add column if not exists custo_unitario numeric;
alter table produtos add column if not exists preco_final_unit numeric;
alter table produtos add column if not exists lucro_desejado_pct numeric;

-- produtos salvos ANTES desta migração ficam com essas colunas em branco.
-- Pra esses, o botão "Vender" continua desabilitado até você reabrir em
-- "Usar na Calculadora", calcular de novo e salvar como Produto — assim
-- o preço fica registrado.
