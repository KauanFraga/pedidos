import { CatalogItem, QuoteItem } from '../types';

export const parseCatalogFile = (text: string): CatalogItem[] => {
  const lines = text.split('\n');
  const items: CatalogItem[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Expected format: DESCRIPTION [TAB] R$ PRICE
    // or: DESCRIPTION [TAB] PRICE
    const parts = trimmed.split('\t');
    
    if (parts.length >= 2) {
      const description = parts[0].trim();
      let priceString = parts[1].trim();

      // Remove "R$" and replace comma with dot for parsing
      priceString = priceString.replace(/^R\$\s?/, '').replace(/\./g, '').replace(',', '.');
      
      const price = parseFloat(priceString);

      if (description && !isNaN(price)) {
        items.push({
          id: `cat-${index}`, // Generate a temporary ID based on index
          description,
          price
        });
      }
    }
  });

  return items;
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

export const generateExcelClipboard = (items: QuoteItem[]): string => {
  // Format: QTD | DESCRIÇÃO | VALOR UNITÁRIO | VALOR TOTAL
  // Excel expects tab-separated values
  
  const header = "QTD\tDESCRIÇÃO\tVALOR UNITÁRIO\tVALOR TOTAL";
  
  const rows = items.map(item => {
    if (!item.catalogItem) return "";
    
    const total = item.quantity * item.catalogItem.price;
    
    // Format numbers as pt-BR string (comma decimal) manually to ensure no currency symbol mess in Excel
    const unitPrice = item.catalogItem.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const totalPrice = total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    return `${item.quantity}\t${item.catalogItem.description}\t${unitPrice}\t${totalPrice}`;
  }).filter(row => row !== "");

  return [header, ...rows].join('\n');
};