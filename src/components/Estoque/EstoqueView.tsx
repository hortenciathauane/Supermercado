import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  ArrowDownRight, 
  ArrowUpRight, 
  Edit, 
  Trash2, 
  AlertTriangle, 
  History, 
  Download, 
  DollarSign,
  Boxes
} from 'lucide-react';
import { Produto } from '../../types/index.ts';
import { formatarMoeda, formatarQuantidade, exportarParaCSV } from '../../utils/formatters.ts';
import { ProdutoModal } from './ProdutoModal.tsx';
import { MovimentacaoModal } from './MovimentacaoModal.tsx';
import { MovimentacoesHistoryModal } from './MovimentacoesHistoryModal.tsx';

interface EstoqueViewProps {
  produtos: Produto[];
  onSalvarProduto: (produtoData: Omit<Produto, 'id' | 'criado_em'>, id?: string) => Promise<void>;
  onExcluirProduto: (id: string) => Promise<void>;
  onMovimentarEstoque: (produtoId: string, quantidadeDelta: number, tipo: 'entrada' | 'saida' | 'ajuste', motivo: string) => Promise<void>;
  carregarDados: () => Promise<void>;
  movimentacoes: any[];
}

export const EstoqueView: React.FC<EstoqueViewProps> = ({
  produtos,
  onSalvarProduto,
  onExcluirProduto,
  onMovimentarEstoque,
  movimentacoes,
}) => {
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('todas');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'baixo' | 'zerado'>('todos');

  // Modals state
  const [isProdutoModalOpen, setIsProdutoModalOpen] = useState(false);
  const [produtoEmEdicao, setProdutoEmEdicao] = useState<Produto | null>(null);

  const [isMovModalOpen, setIsMovModalOpen] = useState(false);
  const [produtoMov, setProdutoMov] = useState<Produto | null>(null);
  const [tipoMov, setTipoMov] = useState<'entrada' | 'saida' | 'ajuste'>('entrada');

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [produtoParaExcluir, setProdutoParaExcluir] = useState<Produto | null>(null);

  // Extract unique categories from current products
  const categorias = useMemo(() => {
    const cats = new Set<string>();
    produtos.forEach((p) => cats.add(p.categoria));
    return Array.from(cats).sort();
  }, [produtos]);

  // Filtered products
  const produtosFiltrados = useMemo(() => {
    return produtos.filter((p) => {
      const matchBusca =
        p.nome.toLowerCase().includes(busca.toLowerCase()) ||
        p.codigo_barras.toLowerCase().includes(busca.toLowerCase()) ||
        (p.fornecedor && p.fornecedor.toLowerCase().includes(busca.toLowerCase()));

      const matchCategoria = categoriaFiltro === 'todas' || p.categoria === categoriaFiltro;

      let matchStatus = true;
      if (statusFiltro === 'baixo') {
        matchStatus = p.estoque_atual <= p.estoque_minimo && p.estoque_atual > 0;
      } else if (statusFiltro === 'zerado') {
        matchStatus = p.estoque_atual <= 0;
      }

      return matchBusca && matchCategoria && matchStatus;
    });
  }, [produtos, busca, categoriaFiltro, statusFiltro]);

  // Overall inventory KPI summary
  const totalProdutos = produtos.length;
  const totalEstoqueBaixo = produtos.filter((p) => p.estoque_atual <= p.estoque_minimo).length;
  const valorTotalCusto = produtos.reduce((acc, p) => acc + p.preco_custo * p.estoque_atual, 0);
  const valorTotalVenda = produtos.reduce((acc, p) => acc + p.preco_venda * p.estoque_atual, 0);

  const handleExportar = () => {
    const dados = produtosFiltrados.map((p) => ({
      Codigo: p.codigo_barras,
      Nome: p.nome,
      Categoria: p.categoria,
      PrecoCusto: p.preco_custo,
      PrecoVenda: p.preco_venda,
      EstoqueAtual: p.estoque_atual,
      EstoqueMinimo: p.estoque_minimo,
      Unidade: p.unidade,
      Fornecedor: p.fornecedor || '',
      Validade: p.data_validade || '',
    }));
    exportarParaCSV('relatorio_estoque_supermercado', dados);
  };

  const handleAbrirCriar = () => {
    setProdutoEmEdicao(null);
    setIsProdutoModalOpen(true);
  };

  const handleAbrirEditar = (prod: Produto) => {
    setProdutoEmEdicao(prod);
    setIsProdutoModalOpen(true);
  };

  const handleAbrirMov = (prod: Produto, tipo: 'entrada' | 'saida') => {
    setProdutoMov(prod);
    setTipoMov(tipo);
    setIsMovModalOpen(true);
  };

  const handleConfirmarExclusao = async () => {
    if (produtoParaExcluir) {
      await onExcluirProduto(produtoParaExcluir.id);
      setProdutoParaExcluir(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header / Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Package className="w-7 h-7 text-emerald-600" />
            Controle de Estoque
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Cadastre seus produtos, gerencie entradas, saídas e acompanhe níveis mínimos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setIsHistoryModalOpen(true)}
            className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-xs flex items-center gap-1.5"
          >
            <History className="w-4 h-4 text-slate-500" />
            Histórico Movimentações
          </button>

          {produtos.length > 0 && (
            <button
              onClick={handleExportar}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Exportar CSV
            </button>
          )}

          <button
            onClick={handleAbrirCriar}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shadow-emerald-700/40 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Produto
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Itens Cadastrados</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalProdutos}</span>
            <span className="text-xs text-slate-400">produtos</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Estoque Crítico / Baixo</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${totalEstoqueBaixo > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
              {totalEstoqueBaixo}
            </span>
            <span className="text-xs text-slate-400">precisam reposição</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Valor em Custo</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold text-slate-900">
              {formatarMoeda(valorTotalCusto)}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Valor Potencial Venda</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-xl sm:text-2xl font-bold text-emerald-700">
              {formatarMoeda(valorTotalVenda)}
            </span>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Buscar por nome, código de barras ou fornecedor..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-64">
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-700"
            >
              <option value="todas">Todas as Categorias</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Quick Pills */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 shrink-0 text-xs">
            <button
              onClick={() => setStatusFiltro('todos')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFiltro === 'todos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setStatusFiltro('baixo')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFiltro === 'baixo' ? 'bg-amber-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Estoque Baixo
            </button>
            <button
              onClick={() => setStatusFiltro('zerado')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFiltro === 'zerado' ? 'bg-red-500 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Zerados
            </button>
          </div>
        </div>
      </div>

      {/* Products Table or Empty State */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {produtos.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <Package className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Nenhum produto cadastrado no estoque</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
              Como solicitado, o sistema não contém dados fictícios. Comece cadastrando os produtos reais do seu supermercado com seus preços e códigos de barras.
            </p>
            <button
              onClick={handleAbrirCriar}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-emerald-700/40 inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Cadastrar Primeiro Produto
            </button>
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-500">
            <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold">Nenhum produto encontrado com os filtros atuais.</p>
            <p className="text-xs text-slate-400 mt-1">Tente buscar por outro termo ou limpar os filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Código / EAN</th>
                  <th className="py-3 px-4">Produto & Categoria</th>
                  <th className="py-3 px-4 text-right">Preço Custo</th>
                  <th className="py-3 px-4 text-right">Preço Venda</th>
                  <th className="py-3 px-4 text-right">Estoque Atual</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {produtosFiltrados.map((prod) => {
                  const isBaixo = prod.estoque_atual <= prod.estoque_minimo && prod.estoque_atual > 0;
                  const isZerado = prod.estoque_atual <= 0;
                  const margem = prod.preco_custo > 0 ? ((prod.preco_venda - prod.preco_custo) / prod.preco_custo) * 100 : 0;

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/80 transition">
                      {/* Código de Barras */}
                      <td className="py-3 px-4 font-mono text-slate-500 whitespace-nowrap">
                        <div className="font-semibold text-slate-700">{prod.codigo_barras}</div>
                        {prod.fornecedor && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[120px]">{prod.fornecedor}</div>
                        )}
                      </td>

                      {/* Nome e Categoria */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 text-sm">{prod.nome}</div>
                        <div className="text-[11px] text-emerald-700 font-medium">{prod.categoria}</div>
                      </td>

                      {/* Preço de Custo */}
                      <td className="py-3 px-4 text-right text-slate-600 whitespace-nowrap">
                        {formatarMoeda(prod.preco_custo)}
                      </td>

                      {/* Preço de Venda + Margem */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900">{formatarMoeda(prod.preco_venda)}</div>
                        <div className="text-[10px] text-emerald-600 font-semibold">
                          +{margem.toFixed(0)}% margem
                        </div>
                      </td>

                      {/* Estoque */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="font-bold text-slate-900 text-sm">
                          {formatarQuantidade(prod.estoque_atual, prod.unidade)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Mínimo: {formatarQuantidade(prod.estoque_minimo, prod.unidade)}
                        </div>
                      </td>

                      {/* Status Badge */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isZerado ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                            Esgotado
                          </span>
                        ) : isBaixo ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3 h-3" />
                            Estoque Baixo
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Regular
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleAbrirMov(prod, 'entrada')}
                            title="Adicionar Estoque (+ Entrada)"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition border border-emerald-200"
                          >
                            <ArrowDownRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleAbrirMov(prod, 'saida')}
                            title="Dar Baixa em Estoque (- Saída)"
                            className="p-1.5 rounded-lg bg-amber-50 text-amber-700 hover:bg-amber-100 transition border border-amber-200"
                          >
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleAbrirEditar(prod)}
                            title="Editar Produto"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setProdutoParaExcluir(prod)}
                            title="Excluir Produto"
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Cadastrar / Editar Produto */}
      <ProdutoModal
        isOpen={isProdutoModalOpen}
        onClose={() => setIsProdutoModalOpen(false)}
        onSave={async (dados) => {
          await onSalvarProduto(dados, produtoEmEdicao?.id);
        }}
        produtoEmEdicao={produtoEmEdicao}
      />

      {/* Modal Entrada / Saída de Estoque */}
      <MovimentacaoModal
        isOpen={isMovModalOpen}
        onClose={() => setIsMovModalOpen(false)}
        produto={produtoMov}
        tipoInicial={tipoMov}
        onConfirm={onMovimentarEstoque}
      />

      {/* Modal Histórico de Movimentações */}
      <MovimentacoesHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        movimentacoes={movimentacoes}
      />

      {/* Confirmation Dialog for Delete */}
      {produtoParaExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm p-6 text-center animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Excluir Produto?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-5">
              Tem certeza que deseja remover <b>{produtoParaExcluir.nome}</b> do cadastro? Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setProdutoParaExcluir(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmarExclusao}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
