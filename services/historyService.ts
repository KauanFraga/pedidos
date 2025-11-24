import { SavedQuote, QuoteItem, HistoryStatus } from '../types';

const HISTORY_KEY = 'orcafacil_historico';
const HISTORY_LIMIT_KEY = 'orcafacil_history_limit';

// ==================== GESTÃO DO LIMITE ====================

export const getHistoryLimit = (): number => {
  try {
    const stored = localStorage.getItem(HISTORY_LIMIT_KEY);
    return stored ? parseInt(stored) : 900; // Padrão: 900 orçamentos
  } catch (e) {
    return 900;
  }
};

export const setHistoryLimit = (limit: number) => {
  localStorage.setItem(HISTORY_LIMIT_KEY, limit.toString());
};

// ==================== OPERAÇÕES BÁSICAS ====================

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
  const historyLimit = getHistoryLimit();
  
  const totalValue = items.reduce((acc, item) => acc + (item.quantity * (item.catalogItem?.price || 0)), 0);
  
  const newQuote: SavedQuote = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    customerName: customerName.trim(),
    items: items,
    totalValue: totalValue,
    originalInputText: originalInputText,
    status: 'PENDENTE'
  };
  
  // Aplica o limite configurado (0 = ilimitado)
  const updatedHistory = historyLimit === 0 
    ? [newQuote, ...currentHistory]
    : [newQuote, ...currentHistory].slice(0, historyLimit);
  
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
  } catch (e) {
    console.error("Erro ao salvar histórico - localStorage cheio", e);
    alert("⚠️ Limite de armazenamento atingido! Por favor, faça um backup e limpe o histórico nas Configurações.");
  }
  
  return newQuote;
};

export const updateQuoteStatus = (id: string, status: HistoryStatus) => {
  const currentHistory = getHistory();
  const index = currentHistory.findIndex(q => q.id === id);
  
  if (index !== -1) {
    currentHistory[index].status = status;
    currentHistory[index].updatedAt = new Date().toISOString();
    
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(currentHistory));
    } catch (e) {
      console.error("Erro ao atualizar status", e);
      alert("Erro ao salvar alteração. Espaço de armazenamento pode estar cheio.");
    }
  }
};

export const deleteQuoteFromHistory = (id: string) => {
  const currentHistory = getHistory();
  const filtered = currentHistory.filter(q => q.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(filtered));
};

// ==================== BACKUP E RESTAURAÇÃO ====================

export const exportHistoryBackup = (): void => {
  const history = getHistory();
  const dataStr = JSON.stringify(history, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  const today = new Date().toISOString().split('T')[0];
  link.download = `backup_orcamentos_${today}.json`;
  link.click();
  URL.revokeObjectURL(url);
};

export const importHistoryBackup = (file: File): Promise<number> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        if (Array.isArray(imported)) {
          const currentHistory = getHistory();
          
          // Mescla sem duplicatas (por ID)
          const existingIds = new Set(currentHistory.map(q => q.id));
          const newQuotes = imported.filter(q => !existingIds.has(q.id));
          
          const merged = [...newQuotes, ...currentHistory];
          localStorage.setItem(HISTORY_KEY, JSON.stringify(merged));
          resolve(newQuotes.length);
        } else {
          reject(new Error('Arquivo inválido - formato incorreto'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file);
  });
};

export const clearHistory = (): void => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
};

// ==================== ESTATÍSTICAS ====================

export const getHistoryStats = () => {
  const history = getHistory();
  const limit = getHistoryLimit();
  const used = history.length;
  const percentUsed = limit > 0 ? Math.round((used / limit) * 100) : 0;
  
  const totalValue = history.reduce((sum, q) => sum + q.totalValue, 0);
  const approvedValue = history
    .filter(q => q.status === 'APROVADO')
    .reduce((sum, q) => sum + q.totalValue, 0);
  
  return {
    total: used,
    limit: limit === 0 ? 'Ilimitado' : limit,
    percentUsed,
    needsBackup: limit > 0 && percentUsed > 80,
    totalValue,
    approvedValue
  };
};
