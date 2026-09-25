import React, { useState, useEffect } from 'react';
import { X, Barcode, Sparkles, DollarSign, Package, AlertCircle } from 'lucide-react';
import { Produto, UnidadeMedida } from '../../types/index.ts';
import { gerarCodigoBarrasEAN13 } from '../../utils/formatters.ts';

interface ProdutoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (produtoData: Omit<Produto, 'id' | 'criado_em'>) => Promise<void>;
  produtoEmEdicao?: Produto | null;
}

const CATEGORIAS_PADRAO = [
  'Mercearia & Alimentos',
  'Hortifrúti (Frutas & Legumes)',
  'Carnes & Aves (Açougue)',
  'Laticínios & Frios',
  'Bebidas & Sucos',
  'Padaria & Confeitaria',
  'Higiene & Cuidados Pessoais',
  'Limpeza & Lavanderia',
  'Congelados & Sorvetes',
  'Biscoitos & Doces',
  'Pet Shop',
  'Outros / Diversos',
];

const UNIDADES: { valor: UnidadeMedida; label: string }[] = [
  { valor: 'UN', label: 'Unidade (UN)' },
  { valor: 'KG', label: 'Quilograma (KG)' },
  { valor: 'G', label: 'Grama (G)' },
  { valor: 'L', label: 'Litro (L)' },
  { valor: 'ML', label: 'Mililitro (ML)' },
  { valor: 'PCT', label: 'Pacote (PCT)' },
  { valor: 'CX', label: 'Caixa (CX)' },
  { valor: 'FD', label: 'Fardo (FD)' },
];

export const ProdutoModal: React.FC<ProdutoModalProps> = ({
  isOpen,
  onClose,
  onSave,
  produtoEmEdicao,
}) => {
  const [codigoBarras, setCodigoBarras] = useState('');
  const [nome, setNome] = useState('');
  const [categoria, setCategoria] = useState(CATEGORIAS_PADRAO[0]);
  const [outraCategoria, setOutraCategoria] = useState('');
  const [precoCusto, setPrecoCusto] = useState<string>('');
  const [precoVenda, setPrecoVenda] = useState<string>('');
  const [estoqueAtual, setEstoqueAtual] = useState<string>('0');
  const [estoqueMinimo, setEstoqueMinimo] = useState<string>('5');
  const [unidade, setUnidade] = useState<UnidadeMedida>('UN');
  const [dataValidade, setDataValidade] = useState('');
  const [fornecedor, setFornecedor] = useState('');
  
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (produtoEmEdicao) {
      setCodigoBarras(produtoEmEdicao.codigo_barras);
      setNome(produtoEmEdicao.nome);
      if (CATEGORIAS_PADRAO.includes(produtoEmEdicao.categoria)) {
        setCategoria(produtoEmEdicao.categoria);
        setOutraCategoria('');
      } else {
        setCategoria('Outro');
        setOutraCategoria(produtoEmEdicao.categoria);
      }
      setPrecoCusto(produtoEmEdicao.preco_custo.toString());
      setPrecoVenda(produtoEmEdicao.preco_venda.toString());
      setEstoqueAtual(produtoEmEdicao.estoque_atual.toString());
      setEstoqueMinimo(produtoEmEdicao.estoque_minimo.toString());
      setUnidade(produtoEmEdicao.unidade);
      setDataValidade(produtoEmEdicao.data_validade || '');
      setFornecedor(produtoEmEdicao.fornecedor || '');
    } else {
      // Clean blank state for new product
      setCodigoBarras('');
      setNome('');
      setCategoria(CATEGORIAS_PADRAO[0]);
      setOutraCategoria('');
      setPrecoCusto('');
      setPrecoVenda('');
      setEstoqueAtual('0');
      setEstoqueMinimo('5');
      setUnidade('UN');
      setDataValidade('');
      setFornecedor('');
    }
    setErro(null);
  }, [produtoEmEdicao, isOpen]);

  if (!isOpen) return null;

  // Margin calculation
  const custoNum = parseFloat(precoCusto) || 0;
  const vendaNum = parseFloat(precoVenda) || 0;
  const lucroBruto = Math.max(0, vendaNum - custoNum);
  const margemPercentual = custoNum > 0 ? ((vendaNum - custoNum) / custoNum) * 100 : 0;

  const handleGerarCodigo = () => {
    setCodigoBarras(gerarCodigoBarrasEAN13());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);

    const nomeFormatado = nome.trim();
    const codigoFormatado = codigoBarras.trim();

    if (!nomeFormatado) {
      setErro('Informe o nome do produto.');
      return;
    }

    if (!codigoFormatado) {
      setErro('Informe ou gere um código de barras.');
      return;
    }

    if (vendaNum < 0) {
      setErro('O preço de venda não pode ser negativo.');
      return;
    }

    const catFinal = categoria === 'Outro' && outraCategoria.trim() ? outraCategoria.trim() : categoria;

    setSalvando(true);
    try {
      await onSave({
        codigo_barras: codigoFormatado,
        nome: nomeFormatado,
        categoria: catFinal,
        preco_custo: custoNum,
        preco_venda: vendaNum,
        estoque_atual: parseFloat(estoqueAtual) || 0,
        estoque_minimo: parseFloat(estoqueMinimo) || 0,
        unidade,
        data_validade: dataValidade || undefined,
        fornecedor: fornecedor.trim() || undefined,
      });
      onClose();
    } catch (err: any) {
      setErro(err.message || 'Erro ao salvar produto.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {produtoEmEdicao ? 'Editar Produto' : 'Cadastrar Novo Produto'}
              </h2>
              <p className="text-xs text-slate-300">
                Preencha os dados do item para controle de estoque e venda no PDV
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
          {erro && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{erro}</span>
            </div>
          )}

          {/* Nome e Código de Barras */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nome do Produto *
              </label>
              <input
                type="text"
                required
                placeholder="Ex: Arroz Tipo 1 5kg, Refrigerante Coca-Cola 2L..."
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-slate-900"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Código de Barras (EAN / Código Interno) *
                </label>
                <button
                  type="button"
                  onClick={handleGerarCodigo}
                  className="text-xs text-emerald-700 font-semibold hover:text-emerald-800 flex items-center gap-1 hover:underline"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Gerar EAN-13 Automático
                </button>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Barcode className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="Ex: 7891234567890"
                  value={codigoBarras}
                  onChange={(e) => setCodigoBarras(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-xl text-sm font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Categoria e Unidade */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categoria
              </label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-800"
              >
                {CATEGORIAS_PADRAO.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
                <option value="Outro">Outra Categoria...</option>
              </select>
              {categoria === 'Outro' && (
                <input
                  type="text"
                  placeholder="Nome da categoria..."
                  value={outraCategoria}
                  onChange={(e) => setOutraCategoria(e.target.value)}
                  className="mt-2 w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Unidade de Medida
              </label>
              <select
                value={unidade}
                onChange={(e) => setUnidade(e.target.value as UnidadeMedida)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white text-slate-800"
              >
                {UNIDADES.map((u) => (
                  <option key={u.valor} value={u.valor}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Preços e Margem */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preço de Custo (R$)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-slate-500 font-semibold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={precoCusto}
                    onChange={(e) => setPrecoCusto(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preço de Venda (R$) *
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-xs text-emerald-600 font-bold">
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    placeholder="0,00"
                    value={precoVenda}
                    onChange={(e) => setPrecoVenda(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-2 border border-emerald-400 bg-emerald-50/30 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Informações de Margem */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200 text-slate-600">
              <span className="flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
                Lucro estimado por unidade:
              </span>
              <span className="font-bold text-emerald-700">
                R$ {lucroBruto.toFixed(2)} ({margemPercentual.toFixed(1)}% markup)
              </span>
            </div>
          </div>

          {/* Estoque Atual e Mínimo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estoque {produtoEmEdicao ? 'Atual' : 'Inicial'} ({unidade})
              </label>
              <input
                type="number"
                step={['KG', 'L', 'G', 'ML'].includes(unidade) ? '0.001' : '1'}
                min="0"
                value={estoqueAtual}
                onChange={(e) => setEstoqueAtual(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Estoque Mínimo (Alerta de Reposição)
              </label>
              <input
                type="number"
                step="1"
                min="0"
                value={estoqueMinimo}
                onChange={(e) => setEstoqueMinimo(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              />
            </div>
          </div>

          {/* Validade e Fornecedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data de Validade (Opcional)
              </label>
              <input
                type="date"
                value={dataValidade}
                onChange={(e) => setDataValidade(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fornecedor (Opcional)
              </label>
              <input
                type="text"
                placeholder="Ex: Distribuidora Silva Ltda"
                value={fornecedor}
                onChange={(e) => setFornecedor(e.target.value)}
                className="w-full px-3.5 py-2 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-800"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2">
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
              className="px-5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 transition shadow-sm shadow-emerald-700/40 disabled:opacity-50"
            >
              {salvando ? 'Salvando...' : produtoEmEdicao ? 'Salvar Alterações' : 'Cadastrar Produto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
