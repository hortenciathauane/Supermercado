import React from 'react';
import { 
  Store, 
  LayoutDashboard, 
  Package, 
  ShoppingCart, 
  History, 
  Database,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'dashboard' | 'estoque' | 'vendas' | 'historico';
  setActiveTab: (tab: 'dashboard' | 'estoque' | 'vendas' | 'historico') => void;
  supabaseConnected: boolean;
  onOpenSupabaseModal: () => void;
  totalProdutos: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  supabaseConnected,
  onOpenSupabaseModal,
  totalProdutos,
}) => {
  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center shadow-lg shadow-emerald-900/30 text-white">
              <Store className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-white">Supermercado</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-semibold border border-emerald-500/30">
                  Gestão Pro
                </span>
              </div>
              <p className="text-xs text-slate-400">Estoque, PDV & Relatórios</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center space-x-1">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-700/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab('vendas')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'vendas'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-700/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShoppingCart className="w-4 h-4" />
              <span>Vendas (PDV)</span>
            </button>

            <button
              onClick={() => setActiveTab('estoque')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'estoque'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-700/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Package className="w-4 h-4" />
              <span>Estoque</span>
              {totalProdutos > 0 && (
                <span className="ml-1 text-xs bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded-full">
                  {totalProdutos}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('historico')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'historico'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-700/50'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Histórico</span>
            </button>
          </nav>

          {/* Right Area: Supabase Status & Action */}
          <div className="flex items-center space-x-3">
            <button
              onClick={onOpenSupabaseModal}
              title="Configurações de Conexão com Supabase"
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                supabaseConnected
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60'
                  : 'bg-amber-950/50 border-amber-500/40 text-amber-300 hover:bg-amber-900/50'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">
                {supabaseConnected ? 'Supabase Conectado' : 'Conectar Supabase'}
              </span>
              {supabaseConnected ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden border-t border-slate-800 py-2 justify-around">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex flex-col items-center py-1 px-2 rounded text-xs ${
              activeTab === 'dashboard' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 mb-0.5" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('vendas')}
            className={`flex flex-col items-center py-1 px-2 rounded text-xs ${
              activeTab === 'vendas' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <ShoppingCart className="w-4 h-4 mb-0.5" />
            PDV
          </button>
          <button
            onClick={() => setActiveTab('estoque')}
            className={`flex flex-col items-center py-1 px-2 rounded text-xs ${
              activeTab === 'estoque' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <Package className="w-4 h-4 mb-0.5" />
            Estoque
          </button>
          <button
            onClick={() => setActiveTab('historico')}
            className={`flex flex-col items-center py-1 px-2 rounded text-xs ${
              activeTab === 'historico' ? 'text-emerald-400 font-bold' : 'text-slate-400'
            }`}
          >
            <History className="w-4 h-4 mb-0.5" />
            Histórico
          </button>
        </div>
      </div>
    </header>
  );
};
