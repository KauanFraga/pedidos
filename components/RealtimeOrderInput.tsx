import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, Zap } from 'lucide-react';

// ============================================================================
// TYPES
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
// LEARNING SERVICE
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
// PARSER
// ============================================================================
const normalizeItemType = (text: string): string => {
  let result = text.toLowerCase();
  result = result.replace(/\b(fio|rolos?)\b/gi, 'cabo');
  result = result.replace(/\b(split\s*bolt|splitbolt)\b/gi, 'conector');
  return result;
};

const parseOrderText = (text: string): Omit<QuoteItem, 'catalogItem' | 'isLearned'>[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const items: Omit<QuoteItem, 'catalogItem' | 'isLearned'>[] = [];

  lines.forEach((line, index) => {
    const qtyMatch = line.match(/^[-*]?\s*(\d+(?:[.,]\d+)?)\s*(?:un|cx|pc|pç|m|mt|mts|metros?|kg|g|l|r|rl|rolos?|x)?\s*[-:]?\s*(.+)/i);
    
    let qty = 1;
    let description = line.replace(/^[-*]\s*/, '');
    
    if (qtyMatch) {
      qty = parseFloat(qtyMatch[1].replace(',', '.'));
      description = qtyMatch[2].trim();
    }

    // Converte rolos em metros
    let conversionLog = '';
    if (description.toLowerCase().includes('rolo')) {
      qty = qty * 100;
      conversionLog = `${qty / 100} rolo(s) → ${qty}m`;
      description = description.replace(/\brolos?\b/gi, 'cabo');
    }

    items.push({
      id: `item-${Date.now()}-${index}`,
      originalRequest: description,
      quantity: qty,
      conversionLog: conversionLog || undefined
    });
  });

  return items;
};

// ============================================================================
// BUSCA SIMPLES E RÁPIDA (SEM IA)
// ============================================================================
const findSimpleMatch = (searchText: string, catalogItems: CatalogItem[]): CatalogItem | null => {
  if (!searchText || catalogItems.length === 0) return null;

  const normalized = normalizeItemType(cleanTextForLearning(searchText));
  const words = normalized.split(/\s+/).filter(w => w.length >= 2);

  let bestMatch: CatalogItem | null = null;
  let highestScore = 0;

  for (const item of catalogItems) {
    const itemText = normalizeItemType(cleanTextForLearning(item.description));
    let score = 0;

    // Conta palavras em comum
    for (const word of words) {
      if (itemText.includes(word)) {
        score += word.length * 2;
      }
    }

    // Bonus para match exato
    if (itemText.includes(normalized)) {
      score += 100;
    }

    // Bonus se começa igual
    if (itemText.startsWith(normalized.substring(0, 10))) {
      score += 50;
    }

    if (score > highestScore && score > 15) {
      highestScore = score;
      bestMatch = item;
    }
  }

  return bestMatch;
};

// ============================================================================
// BUSCA COM IA (GEMINI) - APENAS QUANDO SOLICITADO
// ============================================================================
const findMatchWithGemini = async (searchText: string, catalogItems: CatalogItem[]): Promise<CatalogItem | null> => {
  if (!searchText || catalogItems.length === 0) return null;

  const relevantItems = catalogItems.slice(0, 100);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 500,
        messages: [{
          role: "user",
          content: `Encontre o produto EXATO que corresponde ao pedido:

PEDIDO: "${searchText}"

CATÁLOGO:
${relevantItems.map((item, idx) => `${idx}. ${item.description}`).join('\n')}

Responda APENAS o número do índice (ex: "5") ou "NENHUM" se não houver match.`
        }],
      })
    });

    const data = await response.json();
    const resultText = data.content?.[0]?.text?.trim();

    if (!resultText || resultText === "NENHUM") return null;

    const index = parseInt(resultText);
    if (!isNaN(index) && index >= 0 && index < relevantItems.length) {
      return relevantItems[index];
    }

    return null;
  } catch (error) {
    console.error("AI error:", error);
    return null;
  }
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
  const [isRefiningWithAI, setIsRefiningWithAI] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Busca SIMPLES e RÁPIDA em tempo real
  useEffect(() => {
    if (!inputText.trim() || catalog.length === 0) {
      onItemsChange([]);
      return;
    }

    const parsedItems = parseOrderText(inputText);
    
    const processedItems: QuoteItem[] = parsedItems.map(item => {
      const cleanText = cleanTextForLearning(item.originalRequest);
      
      // Tenta match aprendido primeiro
      const learnedProductId = findLearnedMatch(cleanText);
      if (learnedProductId) {
        const learnedProduct = catalog.find(c => c.id === learnedProductId);
        if (learnedProduct) {
          return { ...item, catalogItem: learnedProduct, isLearned: true };
        }
      }

      // Busca simples e rápida
      const simpleMatch = findSimpleMatch(item.originalRequest, catalog);
      if (simpleMatch) {
        return { ...item, catalogItem: simpleMatch, isLearned: false };
      }

      return { ...item, catalogItem: null, isLearned: false };
    });

    onItemsChange(processedItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, catalog]);

  // Refina com IA apenas quando clicar no botão
  const handleRefineWithAI = async () => {
    if (!inputText.trim() || catalog.length === 0) return;

    setIsRefiningWithAI(true);
    const parsedItems = parseOrderText(inputText);
    const processedItems: QuoteItem[] = [];

    for (const item of parsedItems) {
      const cleanText = cleanTextForLearning(item.originalRequest);
      
      const learnedProductId = findLearnedMatch(cleanText);
      if (learnedProductId) {
        const learnedProduct = catalog.find(c => c.id === learnedProductId);
        if (learnedProduct) {
          processedItems.push({ ...item, catalogItem: learnedProduct, isLearned: true });
          continue;
        }
      }

      // USA IA para encontrar
      const aiMatch = await findMatchWithGemini(item.originalRequest, catalog);
      if (aiMatch) {
        processedItems.push({ ...item, catalogItem: aiMatch, isLearned: false });
      } else {
        processedItems.push({ ...item, catalogItem: null, isLearned: false });
      }
    }

    onItemsChange(processedItems);
    setIsRefiningWithAI(false);
  };

  const handleClear = () => {
    setInputText('');
    onItemsChange([]);
  };

  const lineCount = inputText.split('\n').filter(line => line.trim()).length;
  const notFoundCount = inputText.split('\n').filter(line => line.trim()).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Digitação Rápida</h3>
              <p className="text-xs text-slate-600">Busca instantânea enquanto você digita</p>
            </div>
          </div>

          <button
            onClick={handleRefineWithAI}
            disabled={!inputText.trim() || isRefiningWithAI}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md text-sm"
          >
            {isRefiningWithAI ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Refinando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Refinar com IA
              </>
            )}
          </button>
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
            placeholder="Digite os itens do pedido (um por linha)&#10;&#10;Exemplos:&#10;- 400 mt 1,5 preto ou vermelho&#10;- 10 disjuntor bipolar 40a&#10;- 2 conector split bolt 16mm&#10;&#10;💡 Use o botão 'Refinar com IA' para melhorar matches"
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
            <span>⚡ Busca instantânea • ✨ Refine com IA quando necessário</span>
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
