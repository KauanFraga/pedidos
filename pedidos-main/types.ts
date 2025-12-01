
export interface CatalogItem {
  id: string;
  description: string;
  price: number;
  unit?: string;
  // Fix: Added optional timestamp fields for catalog management
  createdAt?: string;
  updatedAt?: string;
}

export interface QuoteItem {
  id: string;
  quantity: number;
  originalRequest: string;
  catalogItem: CatalogItem | null; // null means the item is in the list but not matched to a product
  isLearned?: boolean; // If true, this match came from the user's manual binding history
  conversionLog?: string; // Stores info like "1 rolo -> 100m" if a conversion was applied
}

export interface LearnedMatch {
  originalText: string;
  productId: string;
  productDescription: string;
  createdAt: string;
}

export interface ProcessedResult {
  items: QuoteItem[];
}

export type HistoryStatus = 'RASCUNHO' | 'PENDENTE' | 'APROVADO' | 'PERDIDO';

export interface SavedQuote {
  id: string;
  createdAt: string; // ISO String
  updatedAt?: string; // ISO String
  customerName: string;
  items: QuoteItem[];
  totalValue: number;
  originalInputText: string;
  status: HistoryStatus;
  notes?: string;
}

export enum QuoteStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  COMPLETE = 'COMPLETE',
  ERROR = 'ERROR'
}

export interface StoreConfig {
  storeName: string;
  addressLine1: string;
  addressLine2: string;
  phones: string;
  whatsapp: string;
  defaultSalesperson: string;
  nextQuoteNumber: number;
  defaultDiscountPercent: number;
  logoUrl?: string;
}

export interface PdfCustomerData {
  name: string;
  address: string;
  neighborhood: string;
  city: string;
  zip: string;
  phone: string;
  whatsapp: string;
  constructionSite: string;
  cpfCnpj: string;
  stateRegistration: string;
  requestedBy: string;
}