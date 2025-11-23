
import { SavedQuote, QuoteItem } from '../types';

const HISTORY_KEY = 'orcafacil_historico';
const HISTORY_LIMIT = 30;

export const getHistory = (): SavedQuote[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error parsing history", e);
    return [];
  }
};

export const saveQuoteToHistory = (
  customerName: string,
  items: QuoteItem[],
  originalInputText: string
): SavedQuote => {
  const currentHistory = getHistory();
  
  const totalValue = items.reduce((acc, item) => acc + (item.quantity * (item.catalogItem?.price || 0)), 0);

  const newQuote: SavedQuote = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    customerName: customerName.trim(),
    items: items,
    totalValue: totalValue,
    originalInputText: originalInputText
  };

  // Add to top, slice to limit
  const updatedHistory = [newQuote, ...currentHistory].slice(0, HISTORY_LIMIT);
  
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  
  return newQuote;
};

export const deleteQuoteFromHistory = (id: string) => {
  const currentHistory = getHistory();
  const filtered = currentHistory.filter(q => q.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
};
