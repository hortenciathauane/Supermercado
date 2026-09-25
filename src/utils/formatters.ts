import { FormaPagamento, UnidadeMedida } from '../types/index.ts';

export function formatarMoeda(valor: number = 0): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor || 0);
}

export function formatarQuantidade(qtd: number = 0, unidade: UnidadeMedida = 'UN'): string {
  const isDecimal = ['KG', 'L', 'G', 'ML'].includes(unidade);
  const formatted = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: isDecimal ? 3 : 0,
    maximumFractionDigits: 3,
  }).format(qtd || 0);
  return `${formatted} ${unidade}`;
}

export function formatarDataHora(isoString: string): string {
  if (!isoString) return '-';
  try {
    const data = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(data);
  } catch {
    return isoString;
  }
}

export function formatarData(isoString: string): string {
  if (!isoString) return '-';
  try {
    const data = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(data);
  } catch {
    return isoString;
  }
}

export function formatarFormaPagamento(forma: FormaPagamento): { nome: string; iconeCor: string } {
  switch (forma) {
    case 'dinheiro':
      return { nome: 'Dinheiro', iconeCor: 'text-emerald-600 bg-emerald-50 border-emerald-200' };
    case 'pix':
      return { nome: 'PIX', iconeCor: 'text-teal-600 bg-teal-50 border-teal-200' };
    case 'cartao_credito':
      return { nome: 'Cartão de Crédito', iconeCor: 'text-blue-600 bg-blue-50 border-blue-200' };
    case 'cartao_debito':
      return { nome: 'Cartão de Débito', iconeCor: 'text-indigo-600 bg-indigo-50 border-indigo-200' };
    case 'vale_alimentacao':
      return { nome: 'Vale Alimentação', iconeCor: 'text-amber-600 bg-amber-50 border-amber-200' };
    case 'vale_refeicao':
      return { nome: 'Vale Refeição', iconeCor: 'text-orange-600 bg-orange-50 border-orange-200' };
    case 'a_prazo':
      return { nome: 'A Prazo / Fiado', iconeCor: 'text-purple-600 bg-purple-50 border-purple-200' };
    default:
      return { nome: forma, iconeCor: 'text-slate-600 bg-slate-50 border-slate-200' };
  }
}

// Generate valid EAN-13 barcode with checksum
export function gerarCodigoBarrasEAN13(): string {
  // Prefix for internal store products: 200xxxxxxxxx
  let code = '200' + Math.floor(100000000 + Math.random() * 900000000).toString().slice(0, 9);
  
  // Calculate checksum for 12 digits
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code[i], 10);
    sum += i % 2 === 0 ? digit : digit * 3;
  }
  const checkDigit = (10 - (sum % 10)) % 10;
  return code + checkDigit.toString();
}

// Export array of objects to CSV
export function exportarParaCSV(nomeArquivo: string, linhas: Record<string, any>[]): void {
  if (!linhas || linhas.length === 0) return;
  const headers = Object.keys(linhas[0]);
  const csvContent = [
    headers.join(';'),
    ...linhas.map((row) =>
      headers
        .map((header) => {
          let val = row[header];
          if (val === null || val === undefined) val = '';
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(';')
    ),
  ].join('\r\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${nomeArquivo}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
