import React, { useState, useMemo } from 'react';
import { 
  History, 
  Search, 
  Download, 
  Printer, 
  RotateCcw, 
  Eye, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  DollarSign, 
  User,
  ShoppingBag,
  AlertCircle
} from 'lucide-react';
import { Venda, FormaPagamento } from '../../types/index.ts';
import { 
  formatarMoeda, 
  formatarDataHora, 
  formatarFormaPagamento, 
  exportarParaCSV 
} from '../../utils/formatters.ts';
import { ComprovanteModal } from './ComprovanteModal.tsx';

interface HistoricoVendasViewProps {
  vendas: Venda[];
  onCancelarVenda: (vendaId: string, motivo: string) => Promise<void>;
  onIrParaPDV: () => void;
}

export const HistoricoVendasView: React.FC<HistoricoVendasViewProps> = ({
  vendas,
  onCancelarVenda,
  onIrParaPDV,
}) => {
  const [busca, setBusca] = useState('');
  const [formaFiltro, setFormaFiltro] = useState<string>('todas');
  const [statusFiltro, setStatusFiltro] = useState<'todos' | 'concluida' | 'cancelada'>('todos');
  
  // Modals
  const [vendaDetalhes, setVendaDetalhes] = useState<Venda | null>(null);
  const [vendaParaComprovante, setVendaParaComprovante] = useState<Venda | null>(null);
  const [vendaParaCancelar, setVendaParaCancelar] = useState<Venda | null>(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState('');
  const [cancelando, setCancelando] = useState(false);

  // Filtered sales
  const vendasFiltradas = useMemo(() => {
    return vendas.filter((v) => {
      const matchBusca =
        v.codigo_venda.toLowerCase().includes(busca.toLowerCase()) ||
        (v.cliente_nome && v.cliente_nome.toLowerCase().includes(busca.toLowerCase()));

      const matchForma = formaFiltro === 'todas' || v.forma_pagamento === formaFiltro;
      const matchStatus = statusFiltro === 'todos' || v.status === statusFiltro;

      return matchBusca && matchForma && matchStatus;
    });
  }, [vendas, busca, formaFiltro, statusFiltro]);

  // Totals of filtered list
  const totalFaturado = vendasFiltradas
    .filter((v) => v.status === 'concluida')
    .reduce((acc, v) => acc + v.total_liquido, 0);

  const totalLucro = vendasFiltradas
    .filter((v) => v.status === 'concluida')
    .reduce((acc, v) => acc + v.lucro_total, 0);

  const totalConcluidas = vendasFiltradas.filter((v) => v.status === 'concluida').length;

  const handleExportar = () => {
    const dados = vendasFiltradas.map((v) => ({
      CodigoVenda: v.codigo_venda,
      DataHora: formatarDataHora(v.criado_em),
      Cliente: v.cliente_nome || 'Consumidor',
      ItensQtd: v.itens.length,
      TotalBruto: v.total_bruto,
      Desconto: v.desconto,
      TotalLiquido: v.total_liquido,
      LucroEstimado: v.lucro_total,
      FormaPagamento: v.forma_pagamento,
      Status: v.status,
    }));
    exportarParaCSV('relatorio_vendas_supermercado', dados);
  };

  const handleConfirmarCancelamento = async () => {
    if (!vendaParaCancelar) return;
    setCancelando(true);
    try {
      await onCancelarVenda(
        vendaParaCancelar.id,
        motivoCancelamento.trim() || 'Cancelamento solicitado pelo operador'
      );
      setVendaParaCancelar(null);
      setMotivoCancelamento('');
    } catch (err: any) {
      alert(err.message || 'Erro ao cancelar venda.');
    } finally {
      setCancelando(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <History className="w-7 h-7 text-emerald-600" />
            Histórico de Vendas
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Consulte todas as operações realizadas, reimprima cupons e gerencie cancelamentos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {vendas.length > 0 && (
            <button
              onClick={handleExportar}
              className="px-3.5 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50 transition shadow-xs flex items-center gap-1.5"
            >
              <Download className="w-4 h-4 text-slate-500" />
              Exportar CSV
            </button>
          )}

          <button
            onClick={onIrParaPDV}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm shadow-emerald-700/40 flex items-center gap-1.5"
          >
            <ShoppingBag className="w-4 h-4" />
            Nova Venda (PDV)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Vendas Concluídas</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{totalConcluidas}</span>
            <span className="text-xs text-slate-400">pedidos</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Faturamento Realizado</span>
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-slate-900">
              {formatarMoeda(totalFaturado)}
            </span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Lucro Bruto Obtido</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-emerald-700">
              {formatarMoeda(totalLucro)}
            </span>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por código de venda ou nome do cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          <div className="w-full md:w-52">
            <select
              value={formaFiltro}
              onChange={(e) => setFormaFiltro(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-700"
            >
              <option value="todas">Todas as Formas de Pgto</option>
              <option value="dinheiro">Dinheiro</option>
              <option value="pix">PIX</option>
              <option value="cartao_debito">Cartão Débito</option>
              <option value="cartao_credito">Cartão Crédito</option>
              <option value="vale_alimentacao">Vale Alimentação</option>
              <option value="vale_refeicao">Vale Refeição</option>
              <option value="a_prazo">A Prazo</option>
            </select>
          </div>

          <div className="flex items-center rounded-xl bg-slate-100 p-1 shrink-0 text-xs">
            <button
              onClick={() => setStatusFiltro('todos')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFiltro === 'todos' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusFiltro('concluida')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFiltro === 'concluida' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Concluídas
            </button>
            <button
              onClick={() => setStatusFiltro('cancelada')}
              className={`px-3 py-1.5 rounded-lg font-medium transition ${
                statusFiltro === 'cancelada' ? 'bg-red-600 text-white shadow-xs' : 'text-slate-600'
              }`}
            >
              Canceladas
            </button>
          </div>
        </div>
      </div>

      {/* Table of Sales */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        {vendas.length === 0 ? (
          <div className="text-center py-16 px-4">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Nenhuma venda registrada ainda</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-6">
              Quando você registrar vendas no PDV, o histórico detalhado, comprovantes e relatórios serão exibidos aqui.
            </p>
            <button
              onClick={onIrParaPDV}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm shadow-emerald-700/40 inline-flex items-center gap-2"
            >
              <ShoppingBag className="w-4 h-4" />
              Abrir Frente de Caixa (PDV)
            </button>
          </div>
        ) : vendasFiltradas.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-500">
            <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-semibold">Nenhuma venda corresponde aos filtros.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">Código / Data</th>
                  <th className="py-3 px-4">Cliente</th>
                  <th className="py-3 px-4 text-center">Itens</th>
                  <th className="py-3 px-4">Forma Pgto</th>
                  <th className="py-3 px-4 text-right">Total</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {vendasFiltradas.map((venda) => {
                  const formaInfo = formatarFormaPagamento(venda.forma_pagamento);
                  const isCancelada = venda.status === 'cancelada';

                  return (
                    <tr
                      key={venda.id}
                      className={`hover:bg-slate-50/80 transition ${
                        isCancelada ? 'bg-red-50/30 opacity-70' : ''
                      }`}
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{venda.codigo_venda}</div>
                        <div className="text-[11px] text-slate-500">{formatarDataHora(venda.criado_em)}</div>
                      </td>

                      <td className="py-3 px-4 text-slate-700">
                        {venda.cliente_nome ? (
                          <span className="font-semibold">{venda.cliente_nome}</span>
                        ) : (
                          <span className="text-slate-400 italic">Consumidor</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center font-semibold text-slate-700">
                        {venda.itens.length} {venda.itens.length === 1 ? 'item' : 'itens'}
                      </td>

                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[11px] font-semibold border ${formaInfo.iconeCor}`}>
                          {formaInfo.nome}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className={`font-black text-sm ${isCancelada ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {formatarMoeda(venda.total_liquido)}
                        </div>
                        {!isCancelada && venda.lucro_total > 0 && (
                          <div className="text-[10px] text-emerald-600 font-medium">
                            Lucro: {formatarMoeda(venda.lucro_total)}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        {isCancelada ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                            <XCircle className="w-3 h-3" />
                            Cancelada
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Concluída
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => setVendaDetalhes(venda)}
                            title="Ver Itens e Detalhes"
                            className="p-1.5 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => setVendaParaComprovante(venda)}
                            title="Reimprimir Cupom"
                            className="p-1.5 rounded-lg text-emerald-700 hover:bg-emerald-50 transition"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          {!isCancelada && (
                            <button
                              onClick={() => setVendaParaCancelar(venda)}
                              title="Cancelar Venda e Devolver Itens ao Estoque"
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
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

      {/* Sale Details Modal */}
      {vendaDetalhes && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Detalhes da Venda {vendaDetalhes.codigo_venda}</h3>
                <p className="text-xs text-slate-400">{formatarDataHora(vendaDetalhes.criado_em)}</p>
              </div>
              <button
                onClick={() => setVendaDetalhes(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
              >
                ✕
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-500">Cliente:</span>{' '}
                  <b className="text-slate-800">{vendaDetalhes.cliente_nome || 'Consumidor'}</b>
                </div>
                <div>
                  <span className="text-slate-500">Forma Pgto:</span>{' '}
                  <b className="text-slate-800">{formatarFormaPagamento(vendaDetalhes.forma_pagamento).nome}</b>
                </div>
                <div>
                  <span className="text-slate-500">Status:</span>{' '}
                  <b className={vendaDetalhes.status === 'cancelada' ? 'text-red-600' : 'text-emerald-700'}>
                    {vendaDetalhes.status.toUpperCase()}
                  </b>
                </div>
                <div>
                  <span className="text-slate-500">Lucro Estimado:</span>{' '}
                  <b className="text-emerald-700">{formatarMoeda(vendaDetalhes.lucro_total)}</b>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-semibold">
                    <tr>
                      <th className="p-2.5">Item</th>
                      <th className="p-2.5 text-center">Qtd</th>
                      <th className="p-2.5 text-right">Unitário</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {vendaDetalhes.itens.map((it, idx) => (
                      <tr key={it.id || idx}>
                        <td className="p-2.5 font-medium text-slate-900">{it.produto_nome}</td>
                        <td className="p-2.5 text-center text-slate-700">{it.quantidade} {it.unidade}</td>
                        <td className="p-2.5 text-right text-slate-700">{formatarMoeda(it.preco_unitario)}</td>
                        <td className="p-2.5 text-right font-bold text-slate-900">{formatarMoeda(it.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="space-y-1 text-xs text-right">
                <div className="text-slate-600">Subtotal: {formatarMoeda(vendaDetalhes.total_bruto)}</div>
                {vendaDetalhes.desconto > 0 && (
                  <div className="text-red-600 font-semibold">Desconto: - {formatarMoeda(vendaDetalhes.desconto)}</div>
                )}
                <div className="text-sm font-black text-slate-900 pt-1 border-t border-slate-200">
                  Total Líquido: {formatarMoeda(vendaDetalhes.total_liquido)}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setVendaDetalhes(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Sale Modal */}
      {vendaParaCancelar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md p-6 text-center animate-in fade-in zoom-in duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
              <RotateCcw className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Cancelar Venda {vendaParaCancelar.codigo_venda}?</h3>
            <p className="text-xs text-slate-500 mt-1 mb-4">
              Ao cancelar esta venda, todos os itens (<b>{vendaParaCancelar.itens.length} produto(s)</b>) serão automaticamente devolvidos ao estoque e a movimentação será registrada.
            </p>

            <div className="text-left mb-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Motivo do Cancelamento
              </label>
              <input
                type="text"
                placeholder="Ex: Desistência do cliente, erro no valor..."
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setVendaParaCancelar(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmarCancelamento}
                disabled={cancelando}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
              >
                {cancelando ? 'Cancelando...' : 'Confirmar Cancelamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Comprovante Modal for reprinting */}
      <ComprovanteModal
        isOpen={Boolean(vendaParaComprovante)}
        onClose={() => setVendaParaComprovante(null)}
        venda={vendaParaComprovante}
      />
    </div>
  );
};
