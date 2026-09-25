import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header.tsx';
import { SupabaseModal } from './components/SupabaseModal.tsx';
import { DashboardView } from './components/Dashboard/DashboardView.tsx';
import { EstoqueView } from './components/Estoque/EstoqueView.tsx';
import { PDVView } from './components/Vendas/PDVView.tsx';
import { HistoricoVendasView } from './components/Vendas/HistoricoVendasView.tsx';
import { MovimentacaoModal } from './components/Estoque/MovimentacaoModal.tsx';
import { dbService } from './services/db.ts';
import { getSavedCredentials, testSupabaseConnection } from './lib/supabase.ts';
import { Produto, Venda, MovimentacaoEstoque, ItemVenda, FormaPagamento } from './types/index.ts';
import { CheckCircle2, AlertCircle } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'estoque' | 'vendas' | 'historico'>('dashboard');
  
  // App data state
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [vendas, setVendas] = useState<Venda[]>([]);
  const [movimentacoes, setMovimentacoes] = useState<MovimentacaoEstoque[]>([]);
  const [loading, setLoading] = useState(true);

  // Supabase status
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  // Toast notifications
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Quick stock modal shortcut
  const [produtoMovRapido, setProdutoMovRapido] = useState<Produto | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Check Supabase connection
  const checkSupabase = useCallback(async () => {
    const creds = getSavedCredentials();
    if (creds.url && creds.anonKey) {
      const res = await testSupabaseConnection(creds.url, creds.anonKey);
      setSupabaseConnected(res.success);
    } else {
      setSupabaseConnected(false);
    }
  }, []);

  // Load all data
  const carregarDados = useCallback(async () => {
    try {
      const [prods, vends, movs] = await Promise.all([
        dbService.getProdutos(),
        dbService.getVendas(),
        dbService.getMovimentacoes(),
      ]);
      setProdutos(prods);
      setVendas(vends);
      setMovimentacoes(movs);
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkSupabase();
    carregarDados();
  }, [checkSupabase, carregarDados]);

  // Handlers
  const handleSalvarProduto = async (
    produtoData: Omit<Produto, 'id' | 'criado_em'>,
    id?: string
  ) => {
    try {
      if (id) {
        await dbService.updateProduto(id, produtoData);
        showToast('Produto atualizado com sucesso!');
      } else {
        await dbService.createProduto(produtoData);
        showToast('Produto cadastrado com sucesso no estoque!');
      }
      await carregarDados();
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar produto.', 'error');
      throw err;
    }
  };

  const handleExcluirProduto = async (id: string) => {
    try {
      await dbService.deleteProduto(id);
      showToast('Produto removido com sucesso.');
      await carregarDados();
    } catch (err: any) {
      showToast(err.message || 'Erro ao excluir produto.', 'error');
    }
  };

  const handleMovimentarEstoque = async (
    produtoId: string,
    quantidadeDelta: number,
    tipo: 'entrada' | 'saida' | 'ajuste',
    motivo: string
  ) => {
    try {
      await dbService.ajustarEstoque(produtoId, quantidadeDelta, tipo, motivo);
      showToast(
        tipo === 'entrada'
          ? 'Entrada de estoque realizada com sucesso!'
          : tipo === 'saida'
          ? 'Baixa de estoque realizada com sucesso!'
          : 'Ajuste de estoque concluído!'
      );
      await carregarDados();
    } catch (err: any) {
      showToast(err.message || 'Erro ao movimentar estoque.', 'error');
      throw err;
    }
  };

  const handleFinalizarVenda = async (vendaData: {
    cliente_nome?: string;
    itens: ItemVenda[];
    desconto?: number;
    forma_pagamento: FormaPagamento;
    valor_pago?: number;
    troco?: number;
    observacoes?: string;
  }): Promise<Venda> => {
    try {
      const venda = await dbService.registrarVenda(vendaData);
      showToast(`Venda ${venda.codigo_venda} concluída! Estoque atualizado.`);
      await carregarDados();
      return venda;
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar venda.', 'error');
      throw err;
    }
  };

  const handleCancelarVenda = async (vendaId: string, motivo: string) => {
    try {
      await dbService.cancelarVenda(vendaId, motivo);
      showToast('Venda cancelada e itens devolvidos ao estoque!');
      await carregarDados();
    } catch (err: any) {
      showToast(err.message || 'Erro ao cancelar venda.', 'error');
      throw err;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        supabaseConnected={supabaseConnected}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        totalProdutos={produtos.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-sm font-semibold text-slate-600">Carregando sistema de supermercado...</p>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && (
              <DashboardView
                produtos={produtos}
                vendas={vendas}
                onIrParaEstoque={() => setActiveTab('estoque')}
                onIrParaPDV={() => setActiveTab('vendas')}
                onAdicionarEstoqueRapido={(prod) => setProdutoMovRapido(prod)}
              />
            )}

            {activeTab === 'estoque' && (
              <EstoqueView
                produtos={produtos}
                onSalvarProduto={handleSalvarProduto}
                onExcluirProduto={handleExcluirProduto}
                onMovimentarEstoque={handleMovimentarEstoque}
                carregarDados={carregarDados}
                movimentacoes={movimentacoes}
              />
            )}

            {activeTab === 'vendas' && (
              <PDVView
                produtos={produtos}
                onFinalizarVenda={handleFinalizarVenda}
                onIrParaEstoque={() => setActiveTab('estoque')}
              />
            )}

            {activeTab === 'historico' && (
              <HistoricoVendasView
                vendas={vendas}
                onCancelarVenda={handleCancelarVenda}
                onIrParaPDV={() => setActiveTab('vendas')}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <b>Supermercado Gestão Pro</b> • Controle Completo de Estoque, PDV & Vendas
          </div>
          <div className="flex items-center gap-3">
            <span
              onClick={() => setIsSupabaseModalOpen(true)}
              className="cursor-pointer hover:underline flex items-center gap-1 font-medium text-slate-600"
            >
              <span className={`w-2 h-2 rounded-full ${supabaseConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              {supabaseConnected ? 'Supabase Sincronizado' : 'Configurar Supabase'}
            </span>
          </div>
        </div>
      </footer>

      {/* Supabase Connection Modal */}
      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        isConnected={supabaseConnected}
        onConnectionChanged={async () => {
          await checkSupabase();
          await carregarDados();
        }}
      />

      {/* Quick Stock Modal Shortcut from Dashboard */}
      {produtoMovRapido && (
        <MovimentacaoModal
          isOpen={Boolean(produtoMovRapido)}
          onClose={() => setProdutoMovRapido(null)}
          produto={produtoMovRapido}
          tipoInicial="entrada"
          onConfirm={handleMovimentarEstoque}
        />
      )}

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-5 right-5 z-50 animate-in fade-in slide-in-from-bottom-5 duration-200">
          <div
            className={`px-4 py-3 rounded-2xl shadow-xl border flex items-center gap-2.5 text-xs font-bold text-white ${
              toast.type === 'success' ? 'bg-emerald-600 border-emerald-500' : 'bg-red-600 border-red-500'
            }`}
          >
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-200" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}
