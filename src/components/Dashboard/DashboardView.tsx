import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, 
  TrendingUp, 
  DollarSign, 
  ShoppingCart, 
  Package, 
  AlertTriangle, 
  Calendar, 
  ArrowUpRight, 
  PieChart, 
  BarChart3, 
  Award,
  Layers,
  ShoppingBag,
  Plus,
  RefreshCw
} from 'lucide-react';
import { Produto, Venda, PeriodoFiltro } from '../../types/index.ts';
import { formatarMoeda, formatarQuantidade, formatarFormaPagamento } from '../../utils/formatters.ts';

interface DashboardViewProps {
  produtos: Produto[];
  vendas: Venda[];
  onIrParaEstoque: () => void;
  onIrParaPDV: () => void;
  onAdicionarEstoqueRapido: (produto: Produto) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  produtos,
  vendas,
  onIrParaEstoque,
  onIrParaPDV,
  onAdicionarEstoqueRapido,
}) => {
  const [periodo, setPeriodo] = useState<PeriodoFiltro>('todos');

  // Filter sales by selected period
  const vendasFiltradas = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return vendas.filter((v) => {
      if (v.status !== 'concluida') return false;
      const dataVenda = new Date(v.criado_em);

      switch (periodo) {
        case 'hoje':
          return dataVenda >= hoje;
        case 'ontem': {
          const ontem = new Date(hoje);
          ontem.setDate(ontem.getDate() - 1);
          return dataVenda >= ontem && dataVenda < hoje;
        }
        case '7dias': {
          const seteDiasAtras = new Date(hoje);
          seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);
          return dataVenda >= seteDiasAtras;
        }
        case 'mes_atual': {
          const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
          return dataVenda >= primeiroDiaMes;
        }
        case 'todos':
        default:
          return true;
      }
    });
  }, [vendas, periodo]);

  // Overall Financial KPIs
  const faturamentoTotal = useMemo(() => {
    return vendasFiltradas.reduce((acc, v) => acc + v.total_liquido, 0);
  }, [vendasFiltradas]);

  const lucroTotal = useMemo(() => {
    return vendasFiltradas.reduce((acc, v) => acc + v.lucro_total, 0);
  }, [vendasFiltradas]);

  const totalVendasConcluidas = vendasFiltradas.length;

  const ticketMedio = totalVendasConcluidas > 0 ? faturamentoTotal / totalVendasConcluidas : 0;

  // Inventory KPIs
  const totalProdutosCadastrados = produtos.length;
  const totalUnidadesEstoque = produtos.reduce((acc, p) => acc + p.estoque_atual, 0);
  const valorEstoqueCusto = produtos.reduce((acc, p) => acc + p.preco_custo * p.estoque_atual, 0);
  const valorEstoqueVenda = produtos.reduce((acc, p) => acc + p.preco_venda * p.estoque_atual, 0);
  
  const produtosCriticos = useMemo(() => {
    return produtos.filter((p) => p.estoque_atual <= p.estoque_minimo);
  }, [produtos]);

  // Sales by Payment Method
  const vendasPorFormaPagamento = useMemo(() => {
    const mapa = new Map<string, { total: number; count: number }>();
    vendasFiltradas.forEach((v) => {
      const atual = mapa.get(v.forma_pagamento) || { total: 0, count: 0 };
      mapa.set(v.forma_pagamento, {
        total: atual.total + v.total_liquido,
        count: atual.count + 1,
      });
    });

    return Array.from(mapa.entries()).map(([forma, dados]) => ({
      forma,
      total: dados.total,
      count: dados.count,
      percentual: faturamentoTotal > 0 ? (dados.total / faturamentoTotal) * 100 : 0,
    })).sort((a, b) => b.total - a.total);
  }, [vendasFiltradas, faturamentoTotal]);

  // Top Selling Products
  const rankingProdutosVendidos = useMemo(() => {
    const mapa = new Map<string, { nome: string; quantidade: number; receita: number; lucro: number }>();
    
    vendasFiltradas.forEach((v) => {
      v.itens.forEach((it) => {
        const atual = mapa.get(it.produto_id) || {
          nome: it.produto_nome,
          quantidade: 0,
          receita: 0,
          lucro: 0,
        };
        mapa.set(it.produto_id, {
          nome: it.produto_nome,
          quantidade: atual.quantidade + it.quantidade,
          receita: atual.receita + it.subtotal,
          lucro: atual.lucro + it.lucro_unitario * it.quantidade,
        });
      });
    });

    return Array.from(mapa.values())
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5);
  }, [vendasFiltradas]);

  // Inventory by Category
  const estoquePorCategoria = useMemo(() => {
    const mapa = new Map<string, { itensCount: number; valorTotal: number; unidades: number }>();
    
    produtos.forEach((p) => {
      const atual = mapa.get(p.categoria) || { itensCount: 0, valorTotal: 0, unidades: 0 };
      mapa.set(p.categoria, {
        itensCount: atual.itensCount + 1,
        valorTotal: atual.valorTotal + p.preco_venda * p.estoque_atual,
        unidades: atual.unidades + p.estoque_atual,
      });
    });

    return Array.from(mapa.entries()).map(([cat, dados]) => ({
      categoria: cat,
      ...dados,
      percentual: valorEstoqueVenda > 0 ? (dados.valorTotal / valorEstoqueVenda) * 100 : 0,
    })).sort((a, b) => b.valorTotal - a.valorTotal);
  }, [produtos, valorEstoqueVenda]);

  // Sales daily chart aggregation
  const dadosGraficoDias = useMemo(() => {
    const mapa = new Map<string, number>();
    
    // Sort chronological
    const ordenadas = [...vendasFiltradas].sort(
      (a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
    );

    ordenadas.forEach((v) => {
      const d = new Date(v.criado_em);
      const diaFormatado = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
      mapa.set(diaFormatado, (mapa.get(diaFormatado) || 0) + v.total_liquido);
    });

    const entries = Array.from(mapa.entries());
    const maxVal = Math.max(...entries.map(([, val]) => val), 1);

    return {
      pontos: entries,
      maxVal,
    };
  }, [vendasFiltradas]);

  const semDadosGerais = produtos.length === 0 && vendas.length === 0;

  return (
    <div className="space-y-6">
      {/* Top Header & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <LayoutDashboard className="w-7 h-7 text-emerald-600" />
            Dashboard & Relatórios
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Métricas em tempo real geradas estritamente com base nos seus cadastros e vendas
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center rounded-xl bg-white border border-slate-200/80 p-1 shadow-xs text-xs">
          <Calendar className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
          <button
            onClick={() => setPeriodo('hoje')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              periodo === 'hoje' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Hoje
          </button>
          <button
            onClick={() => setPeriodo('ontem')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              periodo === 'ontem' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ontem
          </button>
          <button
            onClick={() => setPeriodo('7dias')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              periodo === '7dias' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            7 Dias
          </button>
          <button
            onClick={() => setPeriodo('mes_atual')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              periodo === 'mes_atual' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Este Mês
          </button>
          <button
            onClick={() => setPeriodo('todos')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              periodo === 'todos' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Tudo
          </button>
        </div>
      </div>

      {/* Empty State Banner (clean and motivating) */}
      {semDadosGerais && (
        <div className="bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-slate-100 rounded-3xl p-8 border border-emerald-500/20 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-600/30">
            <LayoutDashboard className="w-8 h-8" />
          </div>
          <div className="max-w-lg mx-auto">
            <h2 className="text-xl font-bold text-slate-900">
              Seu Painel de Controle está Pronto
            </h2>
            <p className="text-xs text-slate-600 mt-2 leading-relaxed">
              Como solicitado, <b>não há dados de demonstração</b>. Todos os gráficos, faturamentos, margens e relatórios de estoque serão gerados dinamicamente a partir dos produtos e vendas que você cadastrar.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              onClick={onIrParaEstoque}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-emerald-700/40 inline-flex items-center gap-2"
            >
              <Package className="w-4 h-4" />
              Cadastrar Produtos no Estoque
            </button>
            <button
              onClick={onIrParaPDV}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Abrir Caixa de Vendas (PDV)
            </button>
          </div>
        </div>
      )}

      {/* Main KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Faturamento Líquido */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Faturamento Líquido</span>
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-slate-900">
              {formatarMoeda(faturamentoTotal)}
            </div>
            <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5" />
              {totalVendasConcluidas} {totalVendasConcluidas === 1 ? 'venda registrada' : 'vendas registradas'}
            </div>
          </div>
        </div>

        {/* Lucro Estimado */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Lucro Bruto Real</span>
            <div className="p-2.5 rounded-xl bg-teal-50 text-teal-600">
              <ArrowUpRight className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-emerald-700">
              {formatarMoeda(lucroTotal)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Margem sobre custo: <b>{faturamentoTotal > 0 ? ((lucroTotal / (faturamentoTotal - lucroTotal || 1)) * 100).toFixed(1) : 0}%</b>
            </div>
          </div>
        </div>

        {/* Ticket Médio */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ticket Médio</span>
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
              <ShoppingCart className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-slate-900">
              {formatarMoeda(ticketMedio)}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Média por atendimento no caixa
            </div>
          </div>
        </div>

        {/* Estoque Total */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Valor do Estoque</span>
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-2xl font-black text-slate-900">
              {formatarMoeda(valorEstoqueVenda)}
            </div>
            <div className="text-xs text-slate-500 mt-1 flex justify-between">
              <span>{totalProdutosCadastrados} itens cadastrados</span>
              <span className="text-slate-400">Custo: {formatarMoeda(valorEstoqueCusto)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: Sales Evolution Chart & Payment Methods Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Sales Evolution Chart (8 cols) */}
        <div className="lg:col-span-8 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-emerald-600" />
                Evolução Diária de Vendas
              </h3>
              <p className="text-xs text-slate-400">Faturamento dia a dia no período selecionado</p>
            </div>
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg">
              Total: {formatarMoeda(faturamentoTotal)}
            </span>
          </div>

          <div className="py-6 min-h-[200px] flex items-end">
            {dadosGraficoDias.pontos.length === 0 ? (
              <div className="w-full text-center py-10 text-slate-400 text-xs">
                <BarChart3 className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                Nenhuma venda registrada no período selecionado.
              </div>
            ) : (
              <div className="w-full flex items-end justify-between gap-2 h-44 pt-4">
                {dadosGraficoDias.pontos.map(([dia, val]) => {
                  const alturaPercent = Math.max(12, Math.round((val / dadosGraficoDias.maxVal) * 100));
                  return (
                    <div key={dia} className="flex-1 flex flex-col items-center gap-2 group">
                      <div className="text-[10px] font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition truncate">
                        {formatarMoeda(val)}
                      </div>
                      <div className="w-full bg-slate-100 rounded-t-xl overflow-hidden h-36 flex items-end">
                        <div
                          style={{ height: `${alturaPercent}%` }}
                          className="w-full bg-gradient-to-t from-emerald-600 to-teal-400 group-hover:from-emerald-500 group-hover:to-teal-300 rounded-t-xl transition-all"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono font-medium">{dia}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Payment Methods (4 cols) */}
        <div className="lg:col-span-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-600" />
              Vendas por Forma de Pagamento
            </h3>
            <p className="text-xs text-slate-400">Distribuição financeira por meio recebido</p>
          </div>

          <div className="py-4 space-y-3 flex-1 overflow-y-auto max-h-56">
            {vendasPorFormaPagamento.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                Sem registros de vendas ainda.
              </div>
            ) : (
              vendasPorFormaPagamento.map((item) => {
                const formaInfo = formatarFormaPagamento(item.forma as any);
                return (
                  <div key={item.forma} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-700">{formaInfo.nome}</span>
                      <span className="font-bold text-slate-900">{formatarMoeda(item.total)} ({item.percentual.toFixed(0)}%)</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${item.percentual}%` }}
                        className="bg-emerald-600 h-full rounded-full transition-all"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Row 3: Top Products & Stock Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        
        {/* Top Selling Products (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-600" />
                Produtos Mais Vendidos
              </h3>
              <p className="text-xs text-slate-400">Ranking por quantidade comercializada</p>
            </div>
          </div>

          <div className="mt-3">
            {rankingProdutosVendidos.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-xs">
                Nenhum produto vendido no período selecionado.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {rankingProdutosVendidos.map((prod, idx) => (
                  <div key={prod.nome} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0 ? 'bg-amber-100 text-amber-700' : idx === 1 ? 'bg-slate-200 text-slate-700' : idx === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-slate-900">{prod.nome}</h4>
                        <span className="text-[11px] text-slate-500">
                          {prod.quantidade} unidades vendidas
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">
                        {formatarMoeda(prod.receita)}
                      </div>
                      <div className="text-[10px] text-emerald-600 font-semibold">
                        Lucro: {formatarMoeda(prod.lucro)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stock Alerts: Critical Products (6 cols) */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                Alertas de Estoque Baixo / Reposição
              </h3>
              <p className="text-xs text-slate-400">Produtos com quantidade menor ou igual ao mínimo</p>
            </div>
            {produtosCriticos.length > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                {produtosCriticos.length} críticos
              </span>
            )}
          </div>

          <div className="mt-3">
            {produtosCriticos.length === 0 ? (
              <div className="text-center py-10 text-emerald-700 text-xs">
                <span className="inline-block p-2 rounded-full bg-emerald-50 text-emerald-600 mb-2">
                  ✓
                </span>
                <p className="font-bold">Todos os produtos estão com estoque regular!</p>
                <p className="text-slate-400 text-[11px] mt-0.5">Nenhum item abaixo do nível mínimo no momento.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto pr-1">
                {produtosCriticos.map((prod) => (
                  <div key={prod.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">{prod.nome}</h4>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Atual: <b className={prod.estoque_atual <= 0 ? 'text-red-600' : 'text-amber-600'}>{formatarQuantidade(prod.estoque_atual, prod.unidade)}</b></span>
                        <span>•</span>
                        <span>Mínimo: {formatarQuantidade(prod.estoque_minimo, prod.unidade)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => onAdicionarEstoqueRapido(prod)}
                      className="px-3 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0"
                    >
                      <Plus className="w-3 h-3" />
                      Repor
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Row 4: Category Distribution Breakdown */}
      {estoquePorCategoria.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="pb-3 border-b border-slate-100">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-600" />
              Inventário por Categoria de Produtos
            </h3>
            <p className="text-xs text-slate-400">Total de itens e valor financeiro alocado em cada departamento</p>
          </div>

          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {estoquePorCategoria.map((cat) => (
              <div key={cat.categoria} className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                <div className="flex justify-between items-start">
                  <h4 className="text-xs font-bold text-slate-800 truncate" title={cat.categoria}>
                    {cat.categoria}
                  </h4>
                  <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                    {cat.percentual.toFixed(0)}%
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs text-slate-600">
                  <span>{cat.itensCount} produtos ({cat.unidades.toFixed(0)} un.)</span>
                  <span className="font-bold text-slate-900">{formatarMoeda(cat.valorTotal)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
