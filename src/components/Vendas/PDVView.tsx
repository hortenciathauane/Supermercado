import React, { useState, useRef, useEffect } from 'react';
import { 
  ShoppingCart, 
  Barcode, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  DollarSign, 
  CreditCard, 
  QrCode, 
  Wallet, 
  User, 
  AlertCircle,
  Package,
  Layers,
  Sparkles
} from 'lucide-react';
import { Produto, ItemVenda, FormaPagamento, Venda } from '../../types/index.ts';
import { formatarMoeda, formatarQuantidade } from '../../utils/formatters.ts';
import { ComprovanteModal } from './ComprovanteModal.tsx';

interface PDVViewProps {
  produtos: Produto[];
  onFinalizarVenda: (vendaData: {
    cliente_nome?: string;
    itens: ItemVenda[];
    desconto?: number;
    forma_pagamento: FormaPagamento;
    valor_pago?: number;
    troco?: number;
    observacoes?: string;
  }) => Promise<Venda>;
  onIrParaEstoque: () => void;
}

const FORMAS_PAGAMENTO: { id: FormaPagamento; label: string; icon: React.ReactNode }[] = [
  { id: 'dinheiro', label: 'Dinheiro', icon: <DollarSign className="w-4 h-4 text-emerald-600" /> },
  { id: 'pix', label: 'PIX', icon: <QrCode className="w-4 h-4 text-teal-600" /> },
  { id: 'cartao_debito', label: 'Cartão Débito', icon: <CreditCard className="w-4 h-4 text-indigo-600" /> },
  { id: 'cartao_credito', label: 'Cartão Crédito', icon: <CreditCard className="w-4 h-4 text-blue-600" /> },
  { id: 'vale_alimentacao', label: 'Vale Alimentação', icon: <Wallet className="w-4 h-4 text-amber-600" /> },
  { id: 'vale_refeicao', label: 'Vale Refeição', icon: <Wallet className="w-4 h-4 text-orange-600" /> },
  { id: 'a_prazo', label: 'A Prazo / Fiado', icon: <User className="w-4 h-4 text-purple-600" /> },
];

export const PDVView: React.FC<PDVViewProps> = ({
  produtos,
  onFinalizarVenda,
  onIrParaEstoque,
}) => {
  // Barcode / Scanner state
  const [codigoBarrasInput, setCodigoBarrasInput] = useState('');
  const [buscaNomeInput, setBuscaNomeInput] = useState('');
  const [qtdInput, setQtdInput] = useState<string>('1');
  const barcodeRef = useRef<HTMLInputElement>(null);

  // Cart
  const [carrinho, setCarrinho] = useState<ItemVenda[]>([]);
  const [descontoValor, setDescontoValor] = useState<string>('');
  const [clienteNome, setClienteNome] = useState('');
  const [formaPagamento, setFormaPagamento] = useState<FormaPagamento>('dinheiro');
  const [valorRecebido, setValorRecebido] = useState<string>('');
  
  // Feedback & Receipt
  const [erroMsg, setErroMsg] = useState<string | null>(null);
  const [processando, setProcessando] = useState(false);
  const [vendaConcluida, setVendaConcluida] = useState<Venda | null>(null);

  // Focus barcode input on mount
  useEffect(() => {
    barcodeRef.current?.focus();
  }, []);

  // Filtered products for quick picker
  const produtosDisponiveis = produtos.filter(
    (p) =>
      p.nome.toLowerCase().includes(buscaNomeInput.toLowerCase()) ||
      p.codigo_barras.toLowerCase().includes(buscaNomeInput.toLowerCase())
  );

  // Cart totals
  const subtotal = carrinho.reduce((acc, item) => acc + item.subtotal, 0);
  const descontoNum = Math.min(subtotal, Math.max(0, parseFloat(descontoValor) || 0));
  const totalPagar = Math.max(0, subtotal - descontoNum);
  
  const recebidoNum = parseFloat(valorRecebido) || 0;
  const trocoCalculado = formaPagamento === 'dinheiro' && recebidoNum > totalPagar ? recebidoNum - totalPagar : 0;

  // Add product to cart helper
  const adicionarAoCarrinho = (produto: Produto, quantidadeDesejada = 1) => {
    setErroMsg(null);

    if (quantidadeDesejada <= 0) {
      setErroMsg('A quantidade deve ser maior que zero.');
      return;
    }

    if (produto.estoque_atual <= 0) {
      setErroMsg(`O produto "${produto.nome}" está esgotado no estoque!`);
      return;
    }

    // Check if item already in cart
    const itemExistenteIndex = carrinho.findIndex((i) => i.produto_id === produto.id);

    if (itemExistenteIndex >= 0) {
      const itemExistente = carrinho[itemExistenteIndex];
      const novaQtd = itemExistente.quantidade + quantidadeDesejada;

      if (novaQtd > produto.estoque_atual) {
        setErroMsg(`Estoque insuficiente! Você já tem ${itemExistente.quantidade} no carrinho e o estoque atual é ${produto.estoque_atual}.`);
        return;
      }

      const atualizado = [...carrinho];
      const sub = novaQtd * itemExistente.preco_unitario;
      const lucroUnit = itemExistente.preco_unitario - itemExistente.preco_custo_unitario;

      atualizado[itemExistenteIndex] = {
        ...itemExistente,
        quantidade: novaQtd,
        subtotal: sub,
        lucro_unitario: lucroUnit,
      };
      setCarrinho(atualizado);
    } else {
      if (quantidadeDesejada > produto.estoque_atual) {
        setErroMsg(`Estoque insuficiente! Estoque disponível: ${produto.estoque_atual}.`);
        return;
      }

      const lucroUnit = produto.preco_venda - produto.preco_custo;
      const novoItem: ItemVenda = {
        id: crypto.randomUUID(),
        produto_id: produto.id,
        produto_nome: produto.nome,
        codigo_barras: produto.codigo_barras,
        quantidade: quantidadeDesejada,
        unidade: produto.unidade,
        preco_unitario: produto.preco_venda,
        preco_custo_unitario: produto.preco_custo,
        subtotal: quantidadeDesejada * produto.preco_venda,
        lucro_unitario: lucroUnit,
      };

      setCarrinho((prev) => [novoItem, ...prev]);
    }

    // Reset inputs & refocus
    setCodigoBarrasInput('');
    setQtdInput('1');
    barcodeRef.current?.focus();
  };

  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErroMsg(null);

    const code = codigoBarrasInput.trim();
    if (!code) return;

    const prod = produtos.find(
      (p) => p.codigo_barras.toLowerCase() === code.toLowerCase()
    );

    if (!prod) {
      setErroMsg(`Produto não encontrado com o código "${code}". Cadastre-o na aba Estoque.`);
      return;
    }

    const qtd = parseFloat(qtdInput) || 1;
    adicionarAoCarrinho(prod, qtd);
  };

  const alterarQuantidadeItem = (index: number, delta: number) => {
    const item = carrinho[index];
    const prod = produtos.find((p) => p.id === item.produto_id);
    const novaQtd = item.quantidade + delta;

    if (novaQtd <= 0) {
      removerItem(index);
      return;
    }

    if (prod && novaQtd > prod.estoque_atual) {
      setErroMsg(`Estoque máximo atingido para ${prod.nome} (${prod.estoque_atual} disponíveis).`);
      return;
    }

    const atualizado = [...carrinho];
    atualizado[index] = {
      ...item,
      quantidade: novaQtd,
      subtotal: novaQtd * item.preco_unitario,
    };
    setCarrinho(atualizado);
  };

  const removerItem = (index: number) => {
    setCarrinho((prev) => prev.filter((_, i) => i !== index));
  };

  const limparCarrinho = () => {
    setCarrinho([]);
    setDescontoValor('');
    setClienteNome('');
    setValorRecebido('');
    setErroMsg(null);
  };

  const handleFinalizar = async () => {
    if (carrinho.length === 0) {
      setErroMsg('O carrinho está vazio. Adicione ao menos um produto para vender.');
      return;
    }

    if (formaPagamento === 'dinheiro' && recebidoNum > 0 && recebidoNum < totalPagar) {
      setErroMsg(`O valor recebido (R$ ${recebidoNum.toFixed(2)}) é menor que o total a pagar (R$ ${totalPagar.toFixed(2)}).`);
      return;
    }

    setProcessando(true);
    setErroMsg(null);

    try {
      const venda = await onFinalizarVenda({
        cliente_nome: clienteNome.trim() || undefined,
        itens: carrinho,
        desconto: descontoNum,
        forma_pagamento: formaPagamento,
        valor_pago: formaPagamento === 'dinheiro' && recebidoNum > 0 ? recebidoNum : totalPagar,
        troco: trocoCalculado,
      });

      // Show receipt modal and clear POS
      setVendaConcluida(venda);
      limparCarrinho();
    } catch (err: any) {
      setErroMsg(err.message || 'Erro ao registrar venda.');
    } finally {
      setProcessando(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Banner if no products registered */}
      {produtos.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center text-amber-900">
          <Package className="w-10 h-10 text-amber-600 mx-auto mb-2" />
          <h3 className="font-bold text-base">Nenhum produto cadastrado no estoque</h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto mt-1 mb-4">
            Para realizar vendas na Frente de Caixa (PDV), você precisa cadastrar os produtos reais do supermercado no estoque.
          </p>
          <button
            onClick={onIrParaEstoque}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Produtos no Estoque
          </button>
        </div>
      )}

      {/* PDV Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        
        {/* LEFT COLUMN: Barcode Reader, Quick Catalog & Products (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Scanner / Barcode Input Box */}
          <div className="bg-slate-900 text-white p-5 rounded-2xl shadow-lg border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-400 flex items-center gap-1.5">
                <Barcode className="w-4 h-4" />
                Leitor de Código de Barras / EAN
              </span>
              <span className="text-[11px] text-slate-400">Pressione ENTER para adicionar</span>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="w-24 shrink-0">
                <label className="block text-[10px] text-slate-400 mb-1 font-semibold">QTD</label>
                <input
                  type="number"
                  step="any"
                  min="0.001"
                  value={qtdInput}
                  onChange={(e) => setQtdInput(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-bold text-center text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex-1">
                <label className="block text-[10px] text-slate-400 mb-1 font-semibold">CÓDIGO DE BARRAS / EAN</label>
                <div className="relative">
                  <input
                    ref={barcodeRef}
                    type="text"
                    placeholder="Bipe o código ou digite aqui..."
                    value={codigoBarrasInput}
                    onChange={(e) => setCodigoBarrasInput(e.target.value)}
                    className="w-full pl-3.5 pr-20 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm font-mono text-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder-slate-500"
                  />
                  <button
                    type="submit"
                    className="absolute right-1 top-1 bottom-1 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Inserir
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Quick Product Search & Catalog */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Search className="w-4 h-4 text-emerald-600" />
                Catálogo Rápido de Produtos
              </span>
              <span className="text-xs text-slate-400">{produtos.length} produtos cadastrados</span>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Pesquisar por nome ou código..."
                value={buscaNomeInput}
                onChange={(e) => setBuscaNomeInput(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Products grid */}
            {produtos.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Cadastre seus produtos na aba Estoque para visualizá-los aqui.
              </p>
            ) : produtosDisponiveis.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">
                Nenhum produto encontrado com o termo buscado.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-80 overflow-y-auto pr-1">
                {produtosDisponiveis.map((prod) => {
                  const esgotado = prod.estoque_atual <= 0;
                  return (
                    <button
                      key={prod.id}
                      onClick={() => !esgotado && adicionarAoCarrinho(prod, 1)}
                      disabled={esgotado}
                      className={`p-3 rounded-xl border text-left transition flex flex-col justify-between ${
                        esgotado
                          ? 'opacity-40 bg-slate-50 border-slate-200 cursor-not-allowed'
                          : 'bg-white hover:bg-emerald-50/50 hover:border-emerald-300 border-slate-200 shadow-xs group'
                      }`}
                    >
                      <div>
                        <span className="text-[10px] text-slate-400 font-mono block truncate">
                          {prod.codigo_barras}
                        </span>
                        <h4 className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 line-clamp-2 mt-0.5">
                          {prod.nome}
                        </h4>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900">
                          {formatarMoeda(prod.preco_venda)}
                        </span>
                        <span
                          className={`text-[10px] font-semibold ${
                            esgotado ? 'text-red-500' : 'text-slate-500'
                          }`}
                        >
                          {esgotado ? 'Esgotado' : `${prod.estoque_atual} ${prod.unidade}`}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Cart & Checkout (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-md flex flex-col overflow-hidden">
            
            {/* Cart Header */}
            <div className="px-5 py-3.5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <ShoppingCart className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-sm">Itens da Venda</span>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs px-2 py-0.5 rounded-full font-bold">
                  {carrinho.length}
                </span>
              </div>
              {carrinho.length > 0 && (
                <button
                  onClick={limparCarrinho}
                  className="text-xs text-red-300 hover:text-red-100 font-medium hover:underline"
                >
                  Limpar Carrinho
                </button>
              )}
            </div>

            {/* Error banner if any */}
            {erroMsg && (
              <div className="m-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{erroMsg}</span>
              </div>
            )}

            {/* Cart Items List */}
            <div className="p-4 max-h-64 overflow-y-auto divide-y divide-slate-100">
              {carrinho.length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  <ShoppingCart className="w-10 h-10 mx-auto text-slate-200 mb-2" />
                  <p className="text-xs font-semibold text-slate-600">O carrinho está vazio</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Bipe o código de barras ou selecione produtos no catálogo
                  </p>
                </div>
              ) : (
                carrinho.map((item, idx) => (
                  <div key={item.id} className="py-2.5 flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-bold text-slate-900 truncate" title={item.produto_nome}>
                        {idx + 1}. {item.produto_nome}
                      </h4>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>{formatarMoeda(item.preco_unitario)} / {item.unidade}</span>
                      </div>
                    </div>

                    {/* Quantity controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => alterarQuantidadeItem(idx, -1)}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold text-slate-900 w-8 text-center">
                        {item.quantidade}
                      </span>
                      <button
                        onClick={() => alterarQuantidadeItem(idx, 1)}
                        className="p-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Subtotal & Delete */}
                    <div className="text-right shrink-0 min-w-[70px]">
                      <div className="text-xs font-bold text-slate-900">
                        {formatarMoeda(item.subtotal)}
                      </div>
                      <button
                        onClick={() => removerItem(idx)}
                        className="text-[11px] text-red-500 hover:text-red-700 transition"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Payment & Checkout Section */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3">
              
              {/* Desconto e Cliente */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Desconto (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={descontoValor}
                    onChange={(e) => setDescontoValor(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Cliente / CPF (Opcional)
                  </label>
                  <input
                    type="text"
                    placeholder="Nome do cliente..."
                    value={clienteNome}
                    onChange={(e) => setClienteNome(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Forma de Pagamento
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {FORMAS_PAGAMENTO.map((fp) => (
                    <button
                      key={fp.id}
                      type="button"
                      onClick={() => setFormaPagamento(fp.id)}
                      className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition ${
                        formaPagamento === fp.id
                          ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className={formaPagamento === fp.id ? 'text-white' : ''}>
                        {fp.icon}
                      </span>
                      <span className="truncate">{fp.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Se for Dinheiro: Campo Valor Recebido e Troco */}
              {formaPagamento === 'dinheiro' && (
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">Valor Recebido (R$):</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0,00"
                      value={valorRecebido}
                      onChange={(e) => setValorRecebido(e.target.value)}
                      className="w-28 px-2 py-1 text-right font-bold text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Botões de atalho de cédulas */}
                  <div className="flex gap-1.5 justify-end">
                    {[totalPagar, 10, 20, 50, 100].map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => setValorRecebido(val.toFixed(2))}
                        className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[10px] font-semibold"
                      >
                        R$ {val.toFixed(0)}
                      </button>
                    ))}
                  </div>

                  {recebidoNum > 0 && (
                    <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span className="font-bold text-slate-700">Troco:</span>
                      <span className={`text-sm font-black ${trocoCalculado >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                        {formatarMoeda(trocoCalculado)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Totais Finais */}
              <div className="pt-2 border-t border-slate-200 space-y-1">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Subtotal:</span>
                  <span>{formatarMoeda(subtotal)}</span>
                </div>
                {descontoNum > 0 && (
                  <div className="flex justify-between text-xs text-red-600 font-medium">
                    <span>Desconto:</span>
                    <span>- {formatarMoeda(descontoNum)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black text-slate-900 pt-1 border-t border-slate-200">
                  <span>TOTAL A PAGAR:</span>
                  <span className="text-xl text-emerald-700 font-black">
                    {formatarMoeda(totalPagar)}
                  </span>
                </div>
              </div>

              {/* Botão Finalizar */}
              <button
                type="button"
                onClick={handleFinalizar}
                disabled={processando || carrinho.length === 0}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black tracking-wide uppercase transition shadow-lg shadow-emerald-700/40 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {processando ? (
                  'Processando Venda...'
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    Finalizar Venda ({formatarMoeda(totalPagar)})
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Comprovante / Cupom Modal */}
      <ComprovanteModal
        isOpen={Boolean(vendaConcluida)}
        onClose={() => setVendaConcluida(null)}
        venda={vendaConcluida}
      />
    </div>
  );
};
