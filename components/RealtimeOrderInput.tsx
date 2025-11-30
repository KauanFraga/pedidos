import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

// ============================================================================
// TYPES (copiados de types.ts)
// ============================================================================
interface CatalogItem {
  id: string;
  description: string;
  price: number;
  createdAt?: string;
  updatedAt?: string;
}

interface QuoteItem {
  id: string;
  quantity: number;
  originalRequest: string;
  catalogItem: CatalogItem | null;
  isLearned?: boolean;
  conversionLog?: string;
}

// ============================================================================
// LEARNING SERVICE (copiado de learningService.ts)
// ============================================================================
const STORAGE_KEY = 'kf_learned_matches';

interface LearnedMatch {
  originalText: string;
  productId: string;
  productDescription: string;
  createdAt: string;
}

const cleanTextForLearning = (text: string): string => {
  return text.trim().toLowerCase();
};

const getLearnedMatches = (): LearnedMatch[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error parsing learned matches", e);
    return [];
  }
};

const findLearnedMatch = (text: string): string | null => {
  const matches = getLearnedMatches();
  const normalized = cleanTextForLearning(text);
  const match = matches.find(m => m.originalText === normalized);
  return match ? match.productId : null;
};

// ============================================================================
// PARSER FUNCTIONS
// ============================================================================
const parseOrderText = (text: string): Omit<QuoteItem, 'catalogItem' | 'isLearned'>[] => {
  const lines = text.split('\n').filter(line => line.trim());
  const items: Omit<QuoteItem, 'catalogItem' | 'isLearned'>[] = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    // Regex para capturar quantidade no início
    const qtyMatch = trimmed.match(/^(\d+(?:[.,]\d+)?)\s*(?:un|cx|pc|pç|m|kg|g|l|r|rl|x)?\s*[-]?\s*(.+)/i);
    
    if (qtyMatch) {
      const qty = parseFloat(qtyMatch[1].replace(',', '.'));
      const description = qtyMatch[2].trim();
      
      items.push({
        id: `item-${Date.now()}-${index}`,
        originalRequest: description,
        quantity: qty,
      });
    } else {
      // Sem quantidade detectada, assume 1
      items.push({
        id: `item-${Date.now()}-${index}`,
        originalRequest: trimmed,
        quantity: 1,
      });
    }
  });

  return items;
};

// Função de busca fuzzy MELHORADA
const findBestMatch = (searchText: string, catalogItems: CatalogItem[]): CatalogItem | null => {
  if (!searchText || catalogItems.length === 0) return null;

  const normalizedSearch = cleanTextForLearning(searchText);
  const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length >= 2);

  if (searchWords.length === 0) return null;

  let bestMatch: CatalogItem | null = null;
  let highestScore = 0;
  const minScore = searchWords.length * 8; // Score mínimo proporcional ao número de palavras

  for (const item of catalogItems) {
    const itemText = cleanTextForLearning(item.description);
    let score = 0;
    let matchedWords = 0;

    // Verifica cada palavra da busca
    for (const word of searchWords) {
      if (itemText.includes(word)) {
        matchedWords++;
        score += word.length * 3; // Peso por tamanho da palavra
        
        // Bonus se a palavra aparece no início
        if (itemText.startsWith(word)) {
          score += 10;
        }
      }
    }

    // REGRA CRÍTICA: Todas as palavras importantes devem estar presentes
    const importantWordsMatched = matchedWords / searchWords.length;
    if (importantWordsMatched < 0.6) {
      // Se menos de 60% das palavras foram encontradas, ignora
      continue;
    }

    // Bonus GRANDE para match de frase completa
    if (itemText.includes(normalizedSearch)) {
      score += 200;
    }

    // Bonus se começa com o texto de busca exato
    if (itemText.startsWith(normalizedSearch)) {
      score += 100;
    }

    // Bonus se o tamanho é similar (evita matches muito diferentes)
    const lengthDiff = Math.abs(normalizedSearch.length - itemText.length);
    if (lengthDiff < 10) {
      score += 30;
    }

    // Penaliza se tem muitas palavras extras (item muito longo)
    const itemWords = itemText.split(/\s+/).length;
    if (itemWords > searchWords.length * 3) {
      score -= 20;
    }

    if (score > highestScore && score >= minScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  return bestMatch;
};

// ============================================================================
// COMPONENT
// ============================================================================
interface RealtimeOrderInputProps {
  catalog: CatalogItem[];
  onItemsChange: (items: QuoteItem[]) => void;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
}

export const RealtimeOrderInput: React.FC<RealtimeOrderInputProps> = ({
  catalog,
  onItemsChange,
  customerName,
  onCustomerNameChange,
}) => {
  const [inputText, setInputText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Processa o texto em tempo real
  useEffect(() => {
    if (!inputText.trim() || catalog.length === 0) {
      onItemsChange([]);
      return;
    }

    const parsedItems = parseOrderText(inputText);
    
    const processedItems: QuoteItem[] = parsedItems.map(item => {
      const cleanText = cleanTextForLearning(item.originalRequest);
      
      // Primeiro: tenta encontrar match aprendido
      const learnedProductId = findLearnedMatch(cleanText);
      if (learnedProductId) {
        const learnedProduct = catalog.find(c => c.id === learnedProductId);
        if (learnedProduct) {
          return {
            ...item,
            catalogItem: learnedProduct,
            isLearned: true,
          };
        }
      }

      // Segundo: busca fuzzy no catálogo
      const fuzzyMatch = findBestMatch(item.originalRequest, catalog);
      if (fuzzyMatch) {
        return {
          ...item,
          catalogItem: fuzzyMatch,
          isLearned: false,
        };
      }

      // Não encontrado
      return {
        ...item,
        catalogItem: null,
        isLearned: false,
      };
    });

    onItemsChange(processedItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, catalog]);

  const handleClear = () => {
    setInputText('');
    onItemsChange([]);
  };

  const lineCount = inputText.split('\n').filter(line => line.trim()).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-blue-500 p-2 rounded-lg">
            <Search className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800">Digitação em Tempo Real</h3>
            <p className="text-xs text-slate-600">Digite os itens e veja os valores instantaneamente</p>
          </div>
        </div>

        <div className="mb-3">
          <input
            type="text"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="Nome do cliente (opcional)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      <div className="p-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite os itens do pedido (um por linha)&#10;Exemplos:&#10;2 disjuntor 10a&#10;5 tomada 2p+t&#10;10m cabo 2.5mm&#10;100 un interruptor simples"
            className="w-full h-64 px-4 py-3 border-2 border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm"
            style={{ fontFamily: 'ui-monospace, monospace' }}
          />
          
          {inputText && (
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Limpar"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span>💡 Dica: Use quebras de linha para separar os itens</span>
          </div>
          {inputText && (
            <span className="text-blue-600 font-medium">
              {lineCount} {lineCount === 1 ? 'linha' : 'linhas'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
