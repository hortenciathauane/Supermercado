import React, { useRef } from 'react';
import { X, Printer, CheckCircle2, ShoppingBag } from 'lucide-react';
import { Venda } from '../../types/index.ts';
import { formatarMoeda, formatarDataHora, formatarFormaPagamento, formatarQuantidade } from '../../utils/formatters.ts';

interface ComprovanteModalProps {
  isOpen: boolean;
  onClose: () => void;
  venda: Venda | null;
}

export const ComprovanteModal: React.FC<ComprovanteModalProps> = ({
  isOpen,
  onClose,
  venda,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !venda) return null;

  const formaInfo = formatarFormaPagamento(venda.forma_pagamento);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Top actions bar */}
        <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span className="font-bold text-sm">Venda Concluída com Sucesso!</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handlePrint}
              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition text-xs font-semibold flex items-center gap-1"
              title="Imprimir Cupom"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Receipt Paper */}
        <div className="p-6 overflow-y-auto flex-1 bg-slate-100 flex justify-center">
          <div
            ref={receiptRef}
            className="w-full max-w-xs bg-white p-5 rounded-lg shadow-sm border border-slate-300 font-mono text-xs text-slate-900 print:shadow-none print:border-none print:w-full print:p-0"
          >
            {/* Store Header */}
            <div className="text-center pb-3 border-b border-dashed border-slate-400">
              <div className="flex justify-center mb-1">
                <ShoppingBag className="w-6 h-6 text-slate-800" />
              </div>
              <h2 className="font-black text-sm uppercase tracking-wide">SUPERMERCADO PRO</h2>
              <p className="text-[10px] text-slate-600">SISTEMA DE GESTÃO E VENDAS</p>
              <p className="text-[10px] text-slate-500 mt-1">CUPOM NÃO FISCAL</p>
            </div>

            {/* Sale metadata */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>CÓDIGO:</span>
                <span className="font-bold">{venda.codigo_venda}</span>
              </div>
              <div className="flex justify-between">
                <span>DATA/HORA:</span>
                <span>{formatarDataHora(venda.criado_em)}</span>
              </div>
              {venda.cliente_nome && (
                <div className="flex justify-between">
                  <span>CLIENTE:</span>
                  <span className="font-bold truncate max-w-[150px]">{venda.cliente_nome}</span>
                </div>
              )}
            </div>

            {/* Items Header */}
            <div className="py-2 border-b border-dashed border-slate-400">
              <div className="grid grid-cols-12 font-bold text-[10px] text-slate-600 mb-1">
                <span className="col-span-6">ITEM / DESC</span>
                <span className="col-span-2 text-center">QTD</span>
                <span className="col-span-4 text-right">TOTAL</span>
              </div>

              {/* Items List */}
              <div className="space-y-1.5 text-[11px]">
                {venda.itens.map((item, idx) => (
                  <div key={item.id || idx} className="grid grid-cols-12 leading-tight">
                    <div className="col-span-6 truncate pr-1" title={item.produto_nome}>
                      <span className="text-slate-500 mr-1">{idx + 1}.</span>
                      {item.produto_nome}
                    </div>
                    <div className="col-span-2 text-center text-slate-600">
                      {item.quantidade}
                    </div>
                    <div className="col-span-4 text-right font-medium">
                      {formatarMoeda(item.subtotal)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="py-2.5 border-b border-dashed border-slate-400 space-y-1 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>SUBTOTAL:</span>
                <span>{formatarMoeda(venda.total_bruto)}</span>
              </div>

              {venda.desconto > 0 && (
                <div className="flex justify-between text-red-600 font-medium">
                  <span>DESCONTO:</span>
                  <span>- {formatarMoeda(venda.desconto)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black pt-1 border-t border-dotted border-slate-300">
                <span>TOTAL A PAGAR:</span>
                <span>{formatarMoeda(venda.total_liquido)}</span>
              </div>
            </div>

            {/* Payment Details */}
            <div className="py-2.5 border-b border-dashed border-slate-400 text-[11px] space-y-1">
              <div className="flex justify-between">
                <span>FORMA PGTO:</span>
                <span className="font-bold uppercase">{formaInfo.nome}</span>
              </div>

              {venda.forma_pagamento === 'dinheiro' && venda.valor_pago !== undefined && (
                <>
                  <div className="flex justify-between text-slate-600">
                    <span>VALOR RECEBIDO:</span>
                    <span>{formatarMoeda(venda.valor_pago)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-emerald-800">
                    <span>TROCO:</span>
                    <span>{formatarMoeda(venda.troco || 0)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Receipt Footer */}
            <div className="pt-3 text-center text-[10px] text-slate-500 space-y-1">
              <p>Obrigado pela preferência!</p>
              <p>Volte Sempre!</p>
              <div className="mt-2 tracking-widest text-slate-400 select-none">
                ||||||||||||||||||||||||||||||||||||||||
              </div>
            </div>
          </div>
        </div>

        {/* Footer buttons */}
        <div className="p-4 bg-white border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition text-center"
          >
            Fechar e Iniciar Nova Venda
          </button>
          <button
            onClick={handlePrint}
            className="py-2.5 px-5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" />
            Imprimir Cupom
          </button>
        </div>
      </div>
    </div>
  );
};
