import { getSupabase } from '../lib/supabase.ts';
import { Produto, Venda, MovimentacaoEstoque, ItemVenda } from '../types/index.ts';

const STORAGE_PRODUTOS = 'supermercado_produtos_v1';
const STORAGE_VENDAS = 'supermercado_vendas_v1';
const STORAGE_MOVIMENTACOES = 'supermercado_movimentacoes_v1';

// Local storage fallback helpers (starts 100% empty as requested by user)
function getLocalProdutos(): Produto[] {
  try {
    const raw = localStorage.getItem(STORAGE_PRODUTOS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erro ao ler produtos locais:', e);
    return [];
  }
}

function setLocalProdutos(produtos: Produto[]): void {
  localStorage.setItem(STORAGE_PRODUTOS, JSON.stringify(produtos));
}

function getLocalVendas(): Venda[] {
  try {
    const raw = localStorage.getItem(STORAGE_VENDAS);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erro ao ler vendas locais:', e);
    return [];
  }
}

function setLocalVendas(vendas: Venda[]): void {
  localStorage.setItem(STORAGE_VENDAS, JSON.stringify(vendas));
}

function getLocalMovimentacoes(): MovimentacaoEstoque[] {
  try {
    const raw = localStorage.getItem(STORAGE_MOVIMENTACOES);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Erro ao ler movimentações locais:', e);
    return [];
  }
}

function setLocalMovimentacoes(movs: MovimentacaoEstoque[]): void {
  localStorage.setItem(STORAGE_MOVIMENTACOES, JSON.stringify(movs));
}

// Unified Service API
export const dbService = {
  // PRODUTOS
  async getProdutos(): Promise<Produto[]> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('produtos')
          .select('*')
          .order('nome', { ascending: true });

        if (!error && data) {
          const mapped: Produto[] = data.map((d: any) => ({
            id: d.id,
            codigo_barras: d.codigo_barras,
            nome: d.nome,
            categoria: d.categoria,
            preco_custo: Number(d.preco_custo),
            preco_venda: Number(d.preco_venda),
            estoque_atual: Number(d.estoque_atual),
            estoque_minimo: Number(d.estoque_minimo),
            unidade: d.unidade,
            data_validade: d.data_validade || undefined,
            fornecedor: d.fornecedor || undefined,
            criado_em: d.criado_em,
            atualizado_em: d.atualizado_em || undefined,
          }));
          setLocalProdutos(mapped); // keep local in sync
          return mapped;
        }
      } catch (err) {
        console.warn('Supabase query failed, falling back to local storage:', err);
      }
    }
    return getLocalProdutos();
  },

  async createProduto(produtoData: Omit<Produto, 'id' | 'criado_em'>): Promise<Produto> {
    const id = crypto.randomUUID();
    const agora = new Date().toISOString();
    const novoProduto: Produto = {
      ...produtoData,
      id,
      criado_em: agora,
    };

    const supabase = getSupabase();
    if (supabase) {
      try {
        const { error } = await supabase.from('produtos').insert([
          {
            id: novoProduto.id,
            codigo_barras: novoProduto.codigo_barras,
            nome: novoProduto.nome,
            categoria: novoProduto.categoria,
            preco_custo: novoProduto.preco_custo,
            preco_venda: novoProduto.preco_venda,
            estoque_atual: novoProduto.estoque_atual,
            estoque_minimo: novoProduto.estoque_minimo,
            unidade: novoProduto.unidade,
            data_validade: novoProduto.data_validade || null,
            fornecedor: novoProduto.fornecedor || null,
            criado_em: novoProduto.criado_em,
          },
        ]);
        if (error) {
          console.warn('Erro ao salvar produto no Supabase:', error.message);
        }
      } catch (err) {
        console.warn('Falha na requisição Supabase:', err);
      }
    }

    // Always update local cache
    const atuais = getLocalProdutos();
    const atualizados = [novoProduto, ...atuais];
    setLocalProdutos(atualizados);

    // If initial stock > 0, record entry movement
    if (novoProduto.estoque_atual > 0) {
      await this.registrarMovimentacao({
        produto_id: novoProduto.id,
        produto_nome: novoProduto.nome,
        tipo: 'entrada',
        quantidade: novoProduto.estoque_atual,
        estoque_anterior: 0,
        estoque_novo: novoProduto.estoque_atual,
        motivo: 'Cadastro inicial de estoque',
      });
    }

    return novoProduto;
  },

  async updateProduto(id: string, produtoData: Partial<Produto>): Promise<Produto | null> {
    const agora = new Date().toISOString();
    const atuais = getLocalProdutos();
    const index = atuais.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const produtoAtualizado: Produto = {
      ...atuais[index],
      ...produtoData,
      atualizado_em: agora,
    };

    const supabase = getSupabase();
    if (supabase) {
      try {
        const payload: Record<string, any> = { atualizado_em: agora };
        if (produtoData.nome !== undefined) payload.nome = produtoData.nome;
        if (produtoData.codigo_barras !== undefined) payload.codigo_barras = produtoData.codigo_barras;
        if (produtoData.categoria !== undefined) payload.categoria = produtoData.categoria;
        if (produtoData.preco_custo !== undefined) payload.preco_custo = produtoData.preco_custo;
        if (produtoData.preco_venda !== undefined) payload.preco_venda = produtoData.preco_venda;
        if (produtoData.estoque_atual !== undefined) payload.estoque_atual = produtoData.estoque_atual;
        if (produtoData.estoque_minimo !== undefined) payload.estoque_minimo = produtoData.estoque_minimo;
        if (produtoData.unidade !== undefined) payload.unidade = produtoData.unidade;
        if (produtoData.data_validade !== undefined) payload.data_validade = produtoData.data_validade || null;
        if (produtoData.fornecedor !== undefined) payload.fornecedor = produtoData.fornecedor || null;

        await supabase.from('produtos').update(payload).eq('id', id);
      } catch (err) {
        console.warn('Erro ao atualizar produto no Supabase:', err);
      }
    }

    atuais[index] = produtoAtualizado;
    setLocalProdutos(atuais);
    return produtoAtualizado;
  },

  async deleteProduto(id: string): Promise<boolean> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('produtos').delete().eq('id', id);
      } catch (err) {
        console.warn('Erro ao deletar produto no Supabase:', err);
      }
    }

    const atuais = getLocalProdutos();
    const filtrados = atuais.filter((p) => p.id !== id);
    setLocalProdutos(filtrados);
    return true;
  },

  async ajustarEstoque(produtoId: string, quantidadeDelta: number, tipo: 'entrada' | 'saida' | 'ajuste', motivo: string): Promise<Produto | null> {
    const produtos = await this.getProdutos();
    const prod = produtos.find((p) => p.id === produtoId);
    if (!prod) return null;

    const anterior = prod.estoque_atual;
    let novo = anterior;

    if (tipo === 'entrada') {
      novo = anterior + quantidadeDelta;
    } else if (tipo === 'saida') {
      novo = Math.max(0, anterior - quantidadeDelta);
    } else {
      // ajuste direto
      novo = Math.max(0, quantidadeDelta);
    }

    const atualizado = await this.updateProduto(produtoId, { estoque_atual: novo });
    if (atualizado) {
      await this.registrarMovimentacao({
        produto_id: prod.id,
        produto_nome: prod.nome,
        tipo,
        quantidade: tipo === 'ajuste' ? Math.abs(novo - anterior) : quantidadeDelta,
        estoque_anterior: anterior,
        estoque_novo: novo,
        motivo,
      });
    }

    return atualizado;
  },

  // MOVIMENTAÇÕES
  async registrarMovimentacao(movData: Omit<MovimentacaoEstoque, 'id' | 'criado_em'>): Promise<MovimentacaoEstoque> {
    const id = crypto.randomUUID();
    const agora = new Date().toISOString();
    const novaMov: MovimentacaoEstoque = {
      ...movData,
      id,
      criado_em: agora,
    };

    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('movimentacoes_estoque').insert([
          {
            id: novaMov.id,
            produto_id: novaMov.produto_id,
            produto_nome: novaMov.produto_nome,
            tipo: novaMov.tipo,
            quantidade: novaMov.quantidade,
            estoque_anterior: novaMov.estoque_anterior,
            estoque_novo: novaMov.estoque_novo,
            motivo: novaMov.motivo,
            criado_em: novaMov.criado_em,
          },
        ]);
      } catch (err) {
        console.warn('Erro ao salvar movimentação no Supabase:', err);
      }
    }

    const atuais = getLocalMovimentacoes();
    setLocalMovimentacoes([novaMov, ...atuais]);
    return novaMov;
  },

  async getMovimentacoes(): Promise<MovimentacaoEstoque[]> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('movimentacoes_estoque')
          .select('*')
          .order('criado_em', { ascending: false })
          .limit(100);

        if (!error && data) {
          const mapped: MovimentacaoEstoque[] = data.map((d: any) => ({
            id: d.id,
            produto_id: d.produto_id,
            produto_nome: d.produto_nome,
            tipo: d.tipo,
            quantidade: Number(d.quantidade),
            estoque_anterior: Number(d.estoque_anterior),
            estoque_novo: Number(d.estoque_novo),
            motivo: d.motivo,
            criado_em: d.criado_em,
          }));
          setLocalMovimentacoes(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Falha ao carregar movimentações do Supabase:', err);
      }
    }
    return getLocalMovimentacoes();
  },

  // VENDAS
  async getVendas(): Promise<Venda[]> {
    const supabase = getSupabase();
    if (supabase) {
      try {
        const { data: vendasData, error: vendasError } = await supabase
          .from('vendas')
          .select('*')
          .order('criado_em', { ascending: false });

        if (!vendasError && vendasData) {
          const { data: itensData } = await supabase.from('itens_venda').select('*');

          const mapped: Venda[] = vendasData.map((v: any) => {
            const itensVenda: ItemVenda[] = (itensData || [])
              .filter((i: any) => i.venda_id === v.id)
              .map((i: any) => ({
                id: i.id,
                venda_id: i.venda_id,
                produto_id: i.produto_id,
                produto_nome: i.produto_nome,
                codigo_barras: i.codigo_barras || undefined,
                quantidade: Number(i.quantidade),
                unidade: i.unidade,
                preco_unitario: Number(i.preco_unitario),
                preco_custo_unitario: Number(i.preco_custo_unitario),
                subtotal: Number(i.subtotal),
                lucro_unitario: Number(i.lucro_unitario),
              }));

            return {
              id: v.id,
              codigo_venda: v.codigo_venda,
              cliente_nome: v.cliente_nome || undefined,
              itens: itensVenda,
              total_bruto: Number(v.total_bruto),
              desconto: Number(v.desconto),
              total_liquido: Number(v.total_liquido),
              lucro_total: Number(v.lucro_total),
              forma_pagamento: v.forma_pagamento,
              valor_pago: v.valor_pago ? Number(v.valor_pago) : undefined,
              troco: v.troco ? Number(v.troco) : 0,
              observacoes: v.observacoes || undefined,
              status: v.status,
              criado_em: v.criado_em,
            };
          });

          setLocalVendas(mapped);
          return mapped;
        }
      } catch (err) {
        console.warn('Erro ao consultar vendas do Supabase:', err);
      }
    }
    return getLocalVendas();
  },

  async registrarVenda(vendaData: {
    cliente_nome?: string;
    itens: ItemVenda[];
    desconto?: number;
    forma_pagamento: Venda['forma_pagamento'];
    valor_pago?: number;
    troco?: number;
    observacoes?: string;
  }): Promise<Venda> {
    const id = crypto.randomUUID();
    const codigoVenda = `VND-${Date.now().toString().slice(-6)}`;
    const agora = new Date().toISOString();

    const totalBruto = vendaData.itens.reduce((acc, item) => acc + item.subtotal, 0);
    const desconto = Math.max(0, vendaData.desconto || 0);
    const totalLiquido = Math.max(0, totalBruto - desconto);

    // Calculate total profit: Sum of (preco_unitario - preco_custo_unitario) * quantidade - desconto
    const lucroBrutoItens = vendaData.itens.reduce(
      (acc, item) => acc + (item.preco_unitario - item.preco_custo_unitario) * item.quantidade,
      0
    );
    const lucroTotal = Math.max(0, lucroBrutoItens - desconto);

    const itensComId: ItemVenda[] = vendaData.itens.map((item) => ({
      ...item,
      id: item.id || crypto.randomUUID(),
      venda_id: id,
    }));

    const novaVenda: Venda = {
      id,
      codigo_venda: codigoVenda,
      cliente_nome: vendaData.cliente_nome?.trim() || undefined,
      itens: itensComId,
      total_bruto: totalBruto,
      desconto,
      total_liquido: totalLiquido,
      lucro_total: lucroTotal,
      forma_pagamento: vendaData.forma_pagamento,
      valor_pago: vendaData.valor_pago,
      troco: vendaData.troco || 0,
      observacoes: vendaData.observacoes?.trim() || undefined,
      status: 'concluida',
      criado_em: agora,
    };

    // 1. Save to Supabase if connected
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('vendas').insert([
          {
            id: novaVenda.id,
            codigo_venda: novaVenda.codigo_venda,
            cliente_nome: novaVenda.cliente_nome || null,
            total_bruto: novaVenda.total_bruto,
            desconto: novaVenda.desconto,
            total_liquido: novaVenda.total_liquido,
            lucro_total: novaVenda.lucro_total,
            forma_pagamento: novaVenda.forma_pagamento,
            valor_pago: novaVenda.valor_pago || null,
            troco: novaVenda.troco || 0,
            observacoes: novaVenda.observacoes || null,
            status: novaVenda.status,
            criado_em: novaVenda.criado_em,
          },
        ]);

        if (itensComId.length > 0) {
          const itensPayload = itensComId.map((i) => ({
            id: i.id,
            venda_id: novaVenda.id,
            produto_id: i.produto_id,
            produto_nome: i.produto_nome,
            codigo_barras: i.codigo_barras || null,
            quantidade: i.quantidade,
            unidade: i.unidade,
            preco_unitario: i.preco_unitario,
            preco_custo_unitario: i.preco_custo_unitario,
            subtotal: i.subtotal,
            lucro_unitario: i.lucro_unitario,
          }));
          await supabase.from('itens_venda').insert(itensPayload);
        }
      } catch (err) {
        console.warn('Erro ao salvar venda no Supabase:', err);
      }
    }

    // 2. Automatically decrease inventory for each product
    const produtos = await this.getProdutos();
    for (const item of itensComId) {
      const prod = produtos.find((p) => p.id === item.produto_id);
      if (prod) {
        const estoqueAnterior = prod.estoque_atual;
        const estoqueNovo = Math.max(0, estoqueAnterior - item.quantidade);
        await this.updateProduto(prod.id, { estoque_atual: estoqueNovo });

        await this.registrarMovimentacao({
          produto_id: prod.id,
          produto_nome: prod.nome,
          tipo: 'venda',
          quantidade: item.quantidade,
          estoque_anterior: estoqueAnterior,
          estoque_novo: estoqueNovo,
          motivo: `Venda ${novaVenda.codigo_venda}`,
        });
      }
    }

    // 3. Save to local storage
    const vendasAtuais = getLocalVendas();
    setLocalVendas([novaVenda, ...vendasAtuais]);

    return novaVenda;
  },

  async cancelarVenda(vendaId: string, motivo: string): Promise<boolean> {
    const vendas = await this.getVendas();
    const venda = vendas.find((v) => v.id === vendaId);
    if (!venda || venda.status === 'cancelada') return false;

    // 1. Update status to 'cancelada'
    const supabase = getSupabase();
    if (supabase) {
      try {
        await supabase.from('vendas').update({ status: 'cancelada' }).eq('id', vendaId);
      } catch (err) {
        console.warn('Erro ao cancelar venda no Supabase:', err);
      }
    }

    // 2. Return quantities to stock
    for (const item of venda.itens) {
      const produtos = await this.getProdutos();
      const prod = produtos.find((p) => p.id === item.produto_id);
      if (prod) {
        const estoqueAnterior = prod.estoque_atual;
        const estoqueNovo = estoqueAnterior + item.quantidade;
        await this.updateProduto(prod.id, { estoque_atual: estoqueNovo });

        await this.registrarMovimentacao({
          produto_id: prod.id,
          produto_nome: prod.nome,
          tipo: 'estorno',
          quantidade: item.quantidade,
          estoque_anterior: estoqueAnterior,
          estoque_novo: estoqueNovo,
          motivo: `Cancelamento da venda ${venda.codigo_venda}: ${motivo}`,
        });
      }
    }

    // Update local vendas
    const atualizadas = vendas.map((v) => (v.id === vendaId ? { ...v, status: 'cancelada' as const } : v));
    setLocalVendas(atualizadas);

    return true;
  },

  // DATA MIGRATION / SYNC TO SUPABASE
  async sincronizarComSupabase(): Promise<{
    produtosEnviados: number;
    vendasEnviadas: number;
    erro?: string;
  }> {
    const supabase = getSupabase();
    if (!supabase) {
      return { produtosEnviados: 0, vendasEnviadas: 0, erro: 'Supabase não está configurado.' };
    }

    try {
      const produtosLocais = getLocalProdutos();
      const vendasLocais = getLocalVendas();

      // Upsert produtos
      let prodCount = 0;
      for (const p of produtosLocais) {
        const { error } = await supabase.from('produtos').upsert({
          id: p.id,
          codigo_barras: p.codigo_barras,
          nome: p.nome,
          categoria: p.categoria,
          preco_custo: p.preco_custo,
          preco_venda: p.preco_venda,
          estoque_atual: p.estoque_atual,
          estoque_minimo: p.estoque_minimo,
          unidade: p.unidade,
          data_validade: p.data_validade || null,
          fornecedor: p.fornecedor || null,
          criado_em: p.criado_em,
          atualizado_em: p.atualizado_em || p.criado_em,
        });
        if (!error) prodCount++;
      }

      // Upsert vendas
      let vendCount = 0;
      for (const v of vendasLocais) {
        const { error } = await supabase.from('vendas').upsert({
          id: v.id,
          codigo_venda: v.codigo_venda,
          cliente_nome: v.cliente_nome || null,
          total_bruto: v.total_bruto,
          desconto: v.desconto,
          total_liquido: v.total_liquido,
          lucro_total: v.lucro_total,
          forma_pagamento: v.forma_pagamento,
          valor_pago: v.valor_pago || null,
          troco: v.troco || 0,
          observacoes: v.observacoes || null,
          status: v.status,
          criado_em: v.criado_em,
        });

        if (!error) {
          vendCount++;
          // Insert itens
          if (v.itens && v.itens.length > 0) {
            for (const item of v.itens) {
              await supabase.from('itens_venda').upsert({
                id: item.id,
                venda_id: v.id,
                produto_id: item.produto_id,
                produto_nome: item.produto_nome,
                codigo_barras: item.codigo_barras || null,
                quantidade: item.quantidade,
                unidade: item.unidade,
                preco_unitario: item.preco_unitario,
                preco_custo_unitario: item.preco_custo_unitario,
                subtotal: item.subtotal,
                lucro_unitario: item.lucro_unitario,
              });
            }
          }
        }
      }

      return { produtosEnviados: prodCount, vendasEnviadas: vendCount };
    } catch (e: any) {
      return { produtosEnviados: 0, vendasEnviadas: 0, erro: e.message || 'Falha na sincronização' };
    }
  },
};
