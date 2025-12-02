import * as XLSX from 'xlsx';
import { QuoteItem } from '../types';

interface ExcelExportData {
  customerName: string;
  quoteNumber: number;
  date: string;
  items: QuoteItem[];
  totalValue: number;
  discountPercent?: number;
  finalTotal: number;
  salesperson?: string;
  paymentMethod?: string;
}

export const exportToExcel = (data: ExcelExportData): void => {
  // Criar workbook
  const wb = XLSX.utils.book_new();

  // Cabeçalho da planilha
  const header = [
    ['KF ELÉTRICA - ORÇAMENTO'],
    [],
    ['Cliente:', data.customerName, '', '', 'Nº Orçamento:', data.quoteNumber],
    ['Data:', data.date, '', '', 'Vendedor:', data.salesperson || 'KAUAN'],
    ['Pagamento:', data.paymentMethod || 'À VISTA'],
    [],
    ['QTD', 'DESCRIÇÃO', 'UNIDADE', 'PREÇO UNIT.', 'TOTAL']
  ];

  // Dados dos produtos
  const productRows = data.items.map(item => {
    const desc = item.catalogItem ? item.catalogItem.description : item.originalRequest;
    const unit = 'UN'; // CatalogItem does not have unit property
    const price = item.catalogItem ? item.catalogItem.price : 0;
    const total = item.quantity * price;

    return [
      item.quantity,
      desc,
      unit,
      price,
      total
    ];
  });

  // Totais
  const discountValue = data.totalValue * ((data.discountPercent || 0) / 100);
  const footerRows = [
    [],
    ['', '', '', 'SUBTOTAL:', data.totalValue],
  ];

  if (data.discountPercent && data.discountPercent > 0) {
    footerRows.push(['', '', '', `DESCONTO (${data.discountPercent}%):`, -discountValue]);
  }

  footerRows.push(['', '', '', 'TOTAL A PAGAR:', data.finalTotal]);

  // Combinar tudo
  const wsData = [...header, ...productRows, ...footerRows];

  // Criar worksheet
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Configurar largura das colunas
  ws['!cols'] = [
    { wch: 8 },   // QTD
    { wch: 50 },  // DESCRIÇÃO
    { wch: 10 },  // UNIDADE
    { wch: 15 },  // PREÇO UNIT
    { wch: 15 }   // TOTAL
  ];

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Orçamento');

  // Gerar nome do arquivo
  const fileName = `Orcamento_${data.quoteNumber}_${data.customerName.replace(/[^a-zA-Z0-9]/g, '_')}_${data.date.replace(/\//g, '-')}.xlsx`;

  // Fazer download
  XLSX.writeFile(wb, fileName);
};

// Função auxiliar para usar com dados do ExportModal
export const exportCurrentQuoteToExcel = (
  items: QuoteItem[],
  totalValue: number,
  customerName: string,
  quoteNumber: number,
  discountPercent: number = 0,
  salesperson: string = 'KAUAN',
  paymentMethod: string = 'À VISTA'
): void => {
  const finalTotal = totalValue - (totalValue * (discountPercent / 100));
  
  const data: ExcelExportData = {
    customerName,
    quoteNumber,
    date: new Date().toLocaleDateString('pt-BR'),
    items,
    totalValue,
    discountPercent,
    finalTotal,
    salesperson,
    paymentMethod
  };

  exportToExcel(data);
};