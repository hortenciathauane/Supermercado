export type UnidadeMedida = 'UN' | 'KG' | 'G' | 'L' | 'ML' | 'PCT' | 'CX' | 'FD';

export type FormaPagamento = 
  | 'dinheiro' 
  | 'cartao_credito' 
  | 'cartao_debito' 
  | 'pix' 
  | 'vale_alimentacao' 
  | 'vale_refeicao' 
  | 'a_prazo';

export type TipoMovimentacao = 'entrada' | 'saida' | 'ajuste' | 'venda' | 'estorno';

export interface Produto {
  id: string;
  codigo_barras: string;
  nome: string;
  categoria: string;
  preco_custo: number;
  preco_venda: number;
  estoque_atual: number;
  estoque_minimo: number;
  unidade: UnidadeMedida;
  data_validade?: string;
  fornecedor?: string;
  criado_em: string;
  atualizado_em?: string;
}

export interface ItemVenda {
  id: string;
  venda_id?: string;
  produto_id: string;
  produto_nome: string;
  codigo_barras?: string;
  quantidade: number;
  unidade: UnidadeMedida;
  preco_unitario: number;
  preco_custo_unitario: number;
  subtotal: number;
  lucro_unitario: number;
}

export interface Venda {
  id: string;
  codigo_venda: string;
  cliente_nome?: string;
  itens: ItemVenda[];
  total_bruto: number;
  desconto: number;
  total_liquido: number;
  lucro_total: number;
  forma_pagamento: FormaPagamento;
  valor_pago?: number;
  troco?: number;
  observacoes?: string;
  status: 'concluida' | 'cancelada';
  criado_em: string;
}

export interface MovimentacaoEstoque {
  id: string;
  produto_id: string;
  produto_nome: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  estoque_anterior: number;
  estoque_novo: number;
  motivo: string;
  criado_em: string;
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  connected: boolean;
}

export type PeriodoFiltro = 'hoje' | 'ontem' | '7dias' | '30dias' | 'mes_atual' | 'todos';
