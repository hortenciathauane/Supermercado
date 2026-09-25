import React, { useState } from 'react';
import { X, ArrowDownRight, ArrowUpRight, SlidersHorizontal, AlertCircle } from 'lucide-react';
import { Produto } from '../../types/index.ts';
import { formatarQuantidade } from '../../utils/formatters.ts';

interface MovimentacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  produto: Produto | null;
  tipoInicial: 'entrada' | 'saida' | 'ajuste';
  onConfirm: (produtoId: string, quantidadeDelta: number, tipo: 'entrada' | 'saida' | 'ajuste', motivo: string) => Promise<void>;
}

export const MovimentacaoModal: React.FC<MovimentacaoModalProps> = ({
  isOpen,
  onClose,
  produto,
  tipoInicial,
  onConfirm,
}) => {
  const [tipo, setTipo] = useState<'entrada' | 'saida' | 'ajuste'>(tipoInicial);
  const [quantidade, setQuantidade] = useState<string>('1');
  const [motivo, setMotivo] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  React.useEffect(() => {
    setTipo(tipoInicial);
    setQuantidade(tipoInicial === 'ajuste' ? (produto?.estoque_atual.toString() || '0') : '1');
    setMotivo('');
    setErro(null);
  }, [tipoInicial, produto, isOpen]);

  if (!isOpen || !produto) return null;

  const qtdNum = parseFloat(quantidade) || 0;
  
  let novoEstoquePrevisto = produto.estoque_atual;
  if (tipo === 'entrada') {
    novoEstoquePrevisto = produto.estoque_atual + qtdNum;
  } else if (tipo === 'saida') {
    novoEstoquePrevisto = Math.max(0, produto.estoque_atual - qtdNum);
  } else {
    novoEstoquePrevisto = Math.max(0, qtdNum);
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    if (qtdNum <= 0 && tipo !== 'ajuste') {
      setErro('A quantidade deve ser maior que zero.');
      return;
    }

    if (tipo === 'saida' && qtdNum > produto.estoque_atual) {
      setErro(`A quantidade a retirar (${qtdNum}) é maior que o estoque atual (${produto.estoque_atual}).`);
      return;
    }

    const motivoFinal = motivo.trim() || (tipo === 'entrada' ? 'Entrada de mercadoria' : tipo === 'saida' ? 'Saída de estoque' : 'Ajuste manual de inventário');

    setSalvando(true);
    try {
      await onConfirm(produto.id, qtdNum, tipo, motivoFinal);
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao processar movimentação.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold">Movimentar Estoque</h2>
            <p className="text-xs text-slate-300 truncate max-w-xs">{produto.nome}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{erro}</span>
            </div>
          )}

          {/* Tipo Selector */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => {
                setTipo('entrada');
                if (tipo === 'ajuste') setQuantidade('1');
              }}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition ${
                tipo === 'entrada'
                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700 ring-2 ring-emerald-500/20'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowDownRight className="w-4 h-4 mb-1 text-emerald-600" />
              + Entrada
            </button>

            <button
              type="button"
              onClick={() => {
                setTipo('saida');
                if (tipo === 'ajuste') setQuantidade('1');
              }}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition ${
                tipo === 'saida'
                  ? 'bg-red-50 border-red-500 text-red-700 ring-2 ring-red-500/20'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <ArrowUpRight className="w-4 h-4 mb-1 text-red-600" />
              - Saída
            </button>

            <button
              type="button"
              onClick={() => {
                setTipo('ajuste');
                setQuantidade(produto.estoque_atual.toString());
              }}
              className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-xs font-bold transition ${
                tipo === 'ajuste'
                  ? 'bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-500/20'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4 mb-1 text-blue-600" />
              = Ajustar
            </button>
          </div>

          {/* Current Stock Banner */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex justify-between items-center text-slate-700">
            <span>Estoque Atual:</span>
            <span className="font-bold text-slate-900 text-sm">
              {formatarQuantidade(produto.estoque_atual, produto.unidade)}
            </span>
          </div>

          {/* Quantidade input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {tipo === 'ajuste' ? 'Nova Quantidade Real em Estoque' : `Quantidade a ${tipo === 'entrada' ? 'adicionar' : 'remover'} (${produto.unidade})`}
            </label>
            <input
              type="number"
              step={['KG', 'L', 'G', 'ML'].includes(produto.unidade) ? '0.001' : '1'}
              min="0"
              required
              value={quantidade}
              onChange={(e) => setQuantidade(e.target.value)}
              className="w-full px-3.5 py-2.5 border border-slate-300 rounded-xl text-base font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
            />
          </div>

          {/* Motivo */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Motivo da Movimentação (Opcional)
            </label>
            <input
              type="text"
              placeholder={
                tipo === 'entrada'
                  ? 'Ex: Chegada de pedido do fornecedor, devolução...'
                  : tipo === 'saida'
                  ? 'Ex: Produto avariado, vencido, perda...'
                  : 'Ex: Contagem física de inventário...'
              }
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
            />
          </div>

          {/* Projected Stock Preview */}
          <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-200 text-xs flex items-center justify-between text-emerald-900 font-medium">
            <span>Estoque após confirmação:</span>
            <span className="text-sm font-bold text-emerald-800">
              {formatarQuantidade(novoEstoquePrevisto, produto.unidade)}
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvando}
              className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm disabled:opacity-50"
            >
              {salvando ? 'Processando...' : 'Confirmar Movimentação'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
