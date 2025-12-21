import { SavedQuote, QuoteItem, HistoryStatus } from '../types';

const HISTORY_KEY = 'orcafacil_historico';
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

// ✅ ATUALIZADO - Aceita status como parâmetro
export const saveQuoteToHistory = (
  customerName: string,
  items: QuoteItem[],
  originalInputText: string,
  status: HistoryStatus = 'PENDENTE' // ⬅️ Parâmetro opcional com default
): SavedQuote => {
  const currentHistory = getHistory();
  
  const totalValue = items.reduce((acc, item) => {
    const price = item.unitPrice || item.catalogItem?.price || 0;
    const quantity = item.quantity || 0;
    return acc + (quantity * price);
  }, 0);

  const newQuote: SavedQuote = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customerName: customerName.trim(),
    items: items,
    totalValue: totalValue,
    originalInputText: originalInputText,
    status: status // ⬅️ USA O STATUS PASSADO
  };

  const updatedHistory = [newQuote, ...currentHistory].slice(0, HISTORY_LIMIT);
  
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (e) {
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

export const updateSavedQuote = (id: string, updates: Partial<SavedQuote>) => {
  const currentHistory = getHistory();
  const index = currentHistory.findIndex(q => q.id === id);

  if (index !== -1) {
    const existingQuote = currentHistory[index];
    let totalValue = existingQuote.totalValue;

    if (updates.items) {
      totalValue = updates.items.reduce((acc, item) => {
        const price = item.unitPrice || item.catalogItem?.price || 0;
        const quantity = item.quantity || 0;
        return acc + (quantity * price);
      }, 0);
    }

    currentHistory[index] = {
      ...existingQuote,
      ...updates,
      totalValue: totalValue,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(HISTORY_KEY, JSON.stringify(currentHistory));
  }
};

export const deleteQuoteFromHistory = (id: string) => {
  const currentHistory = getHistory();
  const filtered = currentHistory.filter(q => q.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
};