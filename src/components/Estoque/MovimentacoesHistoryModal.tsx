import React from 'react';
import { X, History, ArrowDownRight, ArrowUpRight, SlidersHorizontal, ShoppingCart, RotateCcw } from 'lucide-react';
import { MovimentacaoEstoque } from '../../types/index.ts';
import { formatarDataHora } from '../../utils/formatters.ts';

interface MovimentacoesHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  movimentacoes: MovimentacaoEstoque[];
}

export const MovimentacoesHistoryModal: React.FC<MovimentacoesHistoryModalProps> = ({
  isOpen,
  onClose,
  movimentacoes,
}) => {
  if (!isOpen) return null;

  const renderBadge = (tipo: MovimentacaoEstoque['tipo']) => {
    switch (tipo) {
      case 'entrada':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <ArrowDownRight className="w-3 h-3" />
            Entrada
          </span>
        );
      case 'saida':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-800">
            <ArrowUpRight className="w-3 h-3" />
            Saída
          </span>
        );
      case 'venda':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
            <ShoppingCart className="w-3 h-3" />
            Venda PDV
          </span>
        );
      case 'estorno':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-100 text-purple-800">
            <RotateCcw className="w-3 h-3" />
            Estorno
          </span>
        );
      case 'ajuste':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
            <SlidersHorizontal className="w-3 h-3" />
            Ajuste
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Histórico de Movimentações de Estoque</h2>
              <p className="text-xs text-slate-300">
                Registro de todas as entradas, saídas, vendas e ajustes no estoque
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Table */}
        <div className="p-6 overflow-y-auto flex-1">
          {movimentacoes.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <History className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-semibold text-slate-700">Nenhuma movimentação registrada ainda.</p>
              <p className="text-xs text-slate-400 mt-1">
                As entradas, vendas e saídas de estoque que você realizar aparecerão detalhadas aqui.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 font-semibold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="py-3 px-3">Data / Hora</th>
                    <th className="py-3 px-3">Produto</th>
                    <th className="py-3 px-3">Tipo</th>
                    <th className="py-3 px-3 text-right">Qtd</th>
                    <th className="py-3 px-3 text-right">Ant. → Novo</th>
                    <th className="py-3 px-3">Motivo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-800">
                  {movimentacoes.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {formatarDataHora(m.criado_em)}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                        {m.produto_nome}
                      </td>
                      <td className="py-2.5 px-3">
                        {renderBadge(m.tipo)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold">
                        {m.tipo === 'saida' || m.tipo === 'venda' ? '-' : '+'}
                        {m.quantidade}
                      </td>
                      <td className="py-2.5 px-3 text-right text-slate-500 whitespace-nowrap">
                        {m.estoque_anterior} → <span className="font-bold text-slate-800">{m.estoque_novo}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 truncate max-w-[200px]" title={m.motivo}>
                        {m.motivo}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
