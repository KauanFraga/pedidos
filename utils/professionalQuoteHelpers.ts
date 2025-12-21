import { QuoteItem, CatalogItem } from '../types';

// Interface interna do ProfessionalQuoteModal
export interface ProfessionalQuoteItem {
  id: string;
  quantity: number;
  description: string;
  unitPrice: number;
  total: number;
  catalogId?: string;
}

/**
 * Converte itens do ProfessionalQuoteModal para o formato QuoteItem esperado pelo historyService
 */
export const convertToQuoteItems = (professionalItems: ProfessionalQuoteItem[]): QuoteItem[] => {
  return professionalItems.map(item => ({
    id: item.id,
    quantity: item.quantity,
    originalRequest: item.description,
    catalogItem: item.catalogId ? {
      id: item.catalogId,
      description: item.description,
      price: item.unitPrice
    } : null
  }));
};

/**
 * Converte QuoteItems do histórico de volta para o formato do ProfessionalQuoteModal
 */
export const convertFromQuoteItems = (quoteItems: QuoteItem[]): ProfessionalQuoteItem[] => {
  return quoteItems.map(item => ({
    id: item.id,
    quantity: item.quantity,
    description: item.catalogItem?.description || item.originalRequest,
    unitPrice: item.catalogItem?.price || 0,
    total: item.quantity * (item.catalogItem?.price || 0),
    catalogId: item.catalogItem?.id
  }));
};