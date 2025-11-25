
import { SavedQuote, QuoteItem, HistoryStatus } from '../types';

const HISTORY_KEY = 'orcafacil_historico';
// Increased limit to support higher volume usage (approx 1 month of data at 30 quotes/day)
const HISTORY_LIMIT = 1000; 

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
    updatedAt: new Date().toISOString(),
    customerName: customerName.trim(),
    items: items,
    totalValue: totalValue,
    originalInputText: originalInputText,
    status: 'PENDENTE' // Default status
  };

  // Add to top, slice to limit to prevent LocalStorage overflow
  const updatedHistory = [newQuote, ...currentHistory].slice(0, HISTORY_LIMIT);
  
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (e) {
    // If storage is full, remove oldest items and try again
    console.warn("LocalStorage quota exceeded. Trimming history.");
    const trimmedHistory = updatedHistory.slice(0, updatedHistory.length - 100);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(trimmedHistory));
  }
  
  return newQuote;
};

export const updateQuoteStatus = (id: string, status: HistoryStatus) => {
  const currentHistory = getHistory();
  const index = currentHistory.findIndex(q => q.id === id);
  
  if (index !== -1) {
    currentHistory[index].status = status;
    currentHistory[index].updatedAt = new Date().toISOString();
    localStorage.setItem(HISTORY_KEY, JSON.stringify(currentHistory));
  }
};

export const deleteQuoteFromHistory = (id: string) => {
  const currentHistory = getHistory();
  const filtered = currentHistory.filter(q => q.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
};
