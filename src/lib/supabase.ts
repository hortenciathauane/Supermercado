import { createClient, SupabaseClient } from '@supabase/supabase-js';

const STORAGE_KEY = 'supermercado_supabase_credentials';

export interface StoredCredentials {
  url: string;
  anonKey: string;
}

export function getSavedCredentials(): StoredCredentials {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed.url && parsed.anonKey) {
        return parsed;
      }
    }
  } catch (e) {
    console.error('Erro ao ler credenciais do localStorage:', e);
  }

  // Fallback to env vars if available
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  return {
    url: envUrl,
    anonKey: envKey,
  };
}

export function saveCredentials(url: string, anonKey: string): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ url: url.trim(), anonKey: anonKey.trim() }));
  supabaseInstance = null; // Reset cached client
}

export function clearCredentials(): void {
  localStorage.removeItem(STORAGE_KEY);
  supabaseInstance = null;
}

let supabaseInstance: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const creds = getSavedCredentials();
  if (!creds.url || !creds.anonKey) {
    return null;
  }

  if (!supabaseInstance) {
    try {
      supabaseInstance = createClient(creds.url, creds.anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      });
    } catch (err) {
      console.error('Falha ao inicializar cliente Supabase:', err);
      return null;
    }
  }

  return supabaseInstance;
}

export async function testSupabaseConnection(url: string, anonKey: string): Promise<{ success: boolean; message: string }> {
  if (!url || !anonKey) {
    return { success: false, message: 'URL e Chave Anon são obrigatórias.' };
  }

  try {
    const testClient = createClient(url.trim(), anonKey.trim());
    // Try a simple select or query
    const { error } = await testClient.from('produtos').select('id').limit(1);
    
    if (error) {
      // If table does not exist, connection is valid but tables are needed
      if (error.code === '42P01' || error.message.includes('relation "produtos" does not exist') || error.message.includes('does not exist')) {
        return {
          success: true,
          message: 'Conectado com sucesso ao Supabase! Nota: A tabela "produtos" ainda precisa ser criada (use o script SQL abaixo).',
        };
      }
      return { success: false, message: `Erro ao consultar Supabase: ${error.message}` };
    }

    return { success: true, message: 'Conexão com Supabase estabelecida com sucesso e tabelas identificadas!' };
  } catch (err: any) {
    return { success: false, message: `Falha na conexão: ${err.message || 'Erro desconhecido'}` };
  }
}

export const SUPABASE_SQL_SCHEMA = `-- ========================================================
-- SUPERMERCADO GESTÃO PRO - SCHEMA COMPLETO E POLÍTICAS
-- Inclui tabelas, índices, triggers e POLÍTICAS DE ARMAZENAMENTO (Storage & RLS)
-- Cole este script no SQL Editor do seu Supabase (app.supabase.com)
-- ========================================================

-- 1. EXTENSÃO PARA UUID (geralmente habilitada por padrão)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========================================================
-- 2. TABELAS DO SISTEMA
-- ========================================================

-- 2.1 TABELA DE PRODUTOS (ESTOQUE)
CREATE TABLE IF NOT EXISTS public.produtos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_barras TEXT NOT NULL UNIQUE,
    nome TEXT NOT NULL,
    categoria TEXT NOT NULL DEFAULT 'Geral',
    preco_custo NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    preco_venda NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    estoque_atual NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    estoque_minimo NUMERIC(10,3) NOT NULL DEFAULT 5.000,
    unidade TEXT NOT NULL DEFAULT 'UN',
    foto_url TEXT,
    data_validade DATE,
    fornecedor TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    atualizado_em TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 TABELA DE VENDAS
CREATE TABLE IF NOT EXISTS public.vendas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_venda TEXT NOT NULL UNIQUE,
    cliente_nome TEXT,
    total_bruto NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    desconto NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    total_liquido NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    lucro_total NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    forma_pagamento TEXT NOT NULL DEFAULT 'dinheiro',
    valor_pago NUMERIC(10,2),
    troco NUMERIC(10,2) DEFAULT 0.00,
    observacoes TEXT,
    status TEXT NOT NULL DEFAULT 'concluida',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2.3 TABELA DE ITENS DA VENDA
CREATE TABLE IF NOT EXISTS public.itens_venda (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    venda_id UUID NOT NULL REFERENCES public.vendas(id) ON DELETE CASCADE,
    produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    produto_nome TEXT NOT NULL,
    codigo_barras TEXT,
    quantidade NUMERIC(10,3) NOT NULL DEFAULT 1.000,
    unidade TEXT NOT NULL DEFAULT 'UN',
    preco_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    preco_custo_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    subtotal NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    lucro_unitario NUMERIC(10,2) NOT NULL DEFAULT 0.00
);

-- 2.4 TABELA DE MOVIMENTAÇÕES DE ESTOQUE
CREATE TABLE IF NOT EXISTS public.movimentacoes_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    produto_id UUID REFERENCES public.produtos(id) ON DELETE SET NULL,
    produto_nome TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'entrada', 'saida', 'ajuste', 'venda', 'estorno'
    quantidade NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    estoque_anterior NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    estoque_novo NUMERIC(10,3) NOT NULL DEFAULT 0.000,
    motivo TEXT NOT NULL,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ========================================================
-- 3. ÍNDICES PARA ALTA PERFORMANCE
-- ========================================================
CREATE INDEX IF NOT EXISTS idx_produtos_codigo_barras ON public.produtos(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_produtos_categoria ON public.produtos(categoria);
CREATE INDEX IF NOT EXISTS idx_vendas_codigo ON public.vendas(codigo_venda);
CREATE INDEX IF NOT EXISTS idx_vendas_criado_em ON public.vendas(criado_em DESC);
CREATE INDEX IF NOT EXISTS idx_itens_venda_venda_id ON public.itens_venda(venda_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto_id ON public.movimentacoes_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_criado_em ON public.movimentacoes_estoque(criado_em DESC);

-- ========================================================
-- 4. POLÍTICAS DE SEGURANÇA E ARMAZENAMENTO DAS TABELAS (RLS)
-- ========================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_venda ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimentacoes_estoque ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas se já existirem para evitar conflito
DROP POLICY IF EXISTS "produtos_select_policy" ON public.produtos;
DROP POLICY IF EXISTS "produtos_insert_policy" ON public.produtos;
DROP POLICY IF EXISTS "produtos_update_policy" ON public.produtos;
DROP POLICY IF EXISTS "produtos_delete_policy" ON public.produtos;

DROP POLICY IF EXISTS "vendas_select_policy" ON public.vendas;
DROP POLICY IF EXISTS "vendas_insert_policy" ON public.vendas;
DROP POLICY IF EXISTS "vendas_update_policy" ON public.vendas;
DROP POLICY IF EXISTS "vendas_delete_policy" ON public.vendas;

DROP POLICY IF EXISTS "itens_venda_select_policy" ON public.itens_venda;
DROP POLICY IF EXISTS "itens_venda_insert_policy" ON public.itens_venda;
DROP POLICY IF EXISTS "itens_venda_update_policy" ON public.itens_venda;
DROP POLICY IF EXISTS "itens_venda_delete_policy" ON public.itens_venda;

DROP POLICY IF EXISTS "movimentacoes_select_policy" ON public.movimentacoes_estoque;
DROP POLICY IF EXISTS "movimentacoes_insert_policy" ON public.movimentacoes_estoque;

-- Políticas de Produtos (Leitura, Inserção, Atualização e Exclusão)
CREATE POLICY "produtos_select_policy" ON public.produtos FOR SELECT USING (true);
CREATE POLICY "produtos_insert_policy" ON public.produtos FOR INSERT WITH CHECK (true);
CREATE POLICY "produtos_update_policy" ON public.produtos FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "produtos_delete_policy" ON public.produtos FOR DELETE USING (true);

-- Políticas de Vendas
CREATE POLICY "vendas_select_policy" ON public.vendas FOR SELECT USING (true);
CREATE POLICY "vendas_insert_policy" ON public.vendas FOR INSERT WITH CHECK (true);
CREATE POLICY "vendas_update_policy" ON public.vendas FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "vendas_delete_policy" ON public.vendas FOR DELETE USING (true);

-- Políticas de Itens de Venda
CREATE POLICY "itens_venda_select_policy" ON public.itens_venda FOR SELECT USING (true);
CREATE POLICY "itens_venda_insert_policy" ON public.itens_venda FOR INSERT WITH CHECK (true);
CREATE POLICY "itens_venda_update_policy" ON public.itens_venda FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "itens_venda_delete_policy" ON public.itens_venda FOR DELETE USING (true);

-- Políticas de Movimentações de Estoque
CREATE POLICY "movimentacoes_select_policy" ON public.movimentacoes_estoque FOR SELECT USING (true);
CREATE POLICY "movimentacoes_insert_policy" ON public.movimentacoes_estoque FOR INSERT WITH CHECK (true);

-- ========================================================
-- 5. POLÍTICAS DE ARMAZENAMENTO DE ARQUIVOS (SUPABASE STORAGE)
-- Permite armazenar fotos de produtos, comprovantes e recibos
-- ========================================================

-- Criar bucket público "supermercado-arquivos" caso não exista
INSERT INTO storage.buckets (id, name, public)
VALUES ('supermercado-arquivos', 'supermercado-arquivos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Remover políticas antigas de storage para este bucket se existirem
DROP POLICY IF EXISTS "Permitir Leitura Pública de Arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir Upload de Arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir Atualização de Arquivos" ON storage.objects;
DROP POLICY IF EXISTS "Permitir Exclusão de Arquivos" ON storage.objects;

-- Política 1: Leitura pública de qualquer arquivo do bucket
CREATE POLICY "Permitir Leitura Pública de Arquivos"
ON storage.objects FOR SELECT
USING (bucket_id = 'supermercado-arquivos');

-- Política 2: Upload de arquivos no bucket
CREATE POLICY "Permitir Upload de Arquivos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'supermercado-arquivos');

-- Política 3: Atualização de arquivos no bucket
CREATE POLICY "Permitir Atualização de Arquivos"
ON storage.objects FOR UPDATE
USING (bucket_id = 'supermercado-arquivos')
WITH CHECK (bucket_id = 'supermercado-arquivos');

-- Política 4: Exclusão de arquivos no bucket
CREATE POLICY "Permitir Exclusão de Arquivos"
ON storage.objects FOR DELETE
USING (bucket_id = 'supermercado-arquivos');
`;
