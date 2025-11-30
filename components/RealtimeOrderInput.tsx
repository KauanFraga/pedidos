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

const extractAndSplitColors = (text: string): string[] => {
  const colorPattern = /\(([^)]+)\)/g;
  let match;
  const colorGroups: string[] = [];

  while ((match = colorPattern.exec(text)) !== null) {
    const colors = match[1].split('/').map(c => c.trim());
    colorGroups.push(...colors);
  }

  if (colorGroups.length === 0) {
    const colors = text.match(/\b(preto|azul|vermelho|branco|amarelo|verde|rosa|laranja|cinza|marrom|pt|az|vm|br|am|vd)\b/gi);
    if (colors && colors.length > 1) {
      return colors;
    }
  }

  return colorGroups.length > 0 ? colorGroups : [''];
};

const parseOrderText = (text: string): Omit<QuoteItem, 'catalogItem' | 'isLearned'>[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const items: Omit<QuoteItem, 'catalogItem' | 'isLearned'>[] = [];

  lines.forEach((line, index) => {
    const qtyMatch = line.match(/^[-*]?\s*(\d+(?:[.,]\d+)?)\s*(?:un|cx|pc|pç|m|mt|mts|metros?|kg|g|l|r|rl|rolos?|x)?\s*[-:]?\s*(.+)/i);
    
    let baseQty = 1;
    let description = line.replace(/^[-*]\s*/, '');
    
    if (qtyMatch) {
      baseQty = parseFloat(qtyMatch[1].replace(',', '.'));
      description = qtyMatch[2].trim();
    }

    let conversionLog = '';
    if (description.toLowerCase().includes('rolo')) {
      baseQty = baseQty * 100;
      conversionLog = `${baseQty / 100} rolo(s) → ${baseQty}m`;
      description = description.replace(/\brolos?\b/gi, 'cabo');
    }

    const colors = extractAndSplitColors(description);
    
    if (colors.length > 1) {
      const qtyPerColor = baseQty / colors.length;
      colors.forEach((color, colorIndex) => {
        let cleanDesc = description.replace(/\([^)]+\)/g, '').trim();
        cleanDesc = `${cleanDesc} ${color}`.trim();
        
        items.push({
          id: `item-${Date.now()}-${index}-${colorIndex}`,
          originalRequest: cleanDesc,
          quantity: qtyPerColor,
          conversionLog: conversionLog || undefined
        });
      });
    } else {
      const cleanDesc = description.replace(/[()]/g, '').trim();
      
      items.push({
        id: `item-${Date.now()}-${index}`,
        originalRequest: cleanDesc,
        quantity: baseQty,
        conversionLog: conversionLog || undefined
      });
    }
  });

  return items;
};

// ============================================================================
// BUSCA SIMPLES E RÁPIDA
// ============================================================================
const findSimpleMatch = (searchText: string, catalogItems: CatalogItem[]): CatalogItem | null => {
  if (!searchText || catalogItems.length === 0) return null;

  const normalized = normalizeItemType(cleanTextForLearning(searchText));
  const words = normalized.split(/\s+/).filter(w => w.length >= 2);

  const bitola = searchText.match(/\d+[.,]?\d*\s*mm/i)?.[0]?.replace(/\s/g, '').toLowerCase();
  const amperagem = searchText.match(/\d+\s*a\b/i)?.[0]?.replace(/\s/g, '').toLowerCase();
  const cor = searchText.match(/\b(preto|azul|vermelho|branco|amarelo|verde|pt|az|vm|br|am|vd)\b/i)?.[0]?.toLowerCase();

  let bestMatch: CatalogItem | null = null;
  let highestScore = 0;

  for (const item of catalogItems) {
    const itemText = normalizeItemType(cleanTextForLearning(item.description));
    let score = 0;

    if (bitola) {
      const itemBitola = item.description.match(/\d+[.,]?\d*\s*mm/i)?.[0]?.replace(/\s/g, '').toLowerCase();
      if (itemBitola !== bitola) continue;
      score += 100;
    }

    if (amperagem) {
      const itemAmp = item.description.match(/\d+\s*a\b/i)?.[0]?.replace(/\s/g, '').toLowerCase();
      if (itemAmp !== amperagem) continue;
      score += 100;
    }

    if (cor) {
      const itemCor = item.description.match(/\b(preto|azul|vermelho|branco|amarelo|verde|pt|az|vm|br|am|vd)\b/i)?.[0]?.toLowerCase();
      
      const corMap: Record<string, string[]> = {
        'preto': ['preto', 'pt'],
        'azul': ['azul', 'az'],
        'vermelho': ['vermelho', 'vm'],
        'branco': ['branco', 'br'],
        'amarelo': ['amarelo', 'am'],
        'verde': ['verde', 'vd']
      };

      let corMatch = false;
      for (const [nome, variacoes] of Object.entries(corMap)) {
        if (variacoes.includes(cor) && itemCor && variacoes.includes(itemCor)) {
          corMatch = true;
          break;
        }
      }

      if (!corMatch && itemCor) continue;
      if (corMatch) score += 80;
    }

    let matchedWords = 0;
    for (const word of words) {
      if (itemText.includes(word)) {
        matchedWords++;
        score += word.length * 3;
      }
    }

    if (words.length > 2 && matchedWords / words.length < 0.6) {
      continue;
    }

    if (itemText.includes(normalized)) {
      score += 150;
    }

    if (score > highestScore && score > 20) {
      highestScore = score;
      bestMatch = item;
    }
  }

  return bestMatch;
};

// ============================================================================
// GEMINI AI INTEGRATION
// ============================================================================
const processWithGemini = async (orderText: string, catalog: CatalogItem[]): Promise<QuoteItem[]> => {
  const catalogString = catalog
    .map((item, index) => `Index: ${index} | Item: ${item.description} | Price: ${item.price}`)
    .join('\n');

  const systemInstruction = `You are an expert at matching electrical products. 
Match each line from the customer order to the best product in the catalog.
Consider synonyms: "fio"="cabo", "split bolt"="conector".
If colors are in parentheses like (preto/azul/verde), split into separate items.
Return JSON with array of: {originalRequest, quantity, catalogIndex, conversionLog}`;

  const prompt = `CATALOG:\n${catalogString}\n\nCUSTOMER REQUEST:\n${orderText}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: `${systemInstruction}\n\n${prompt}\n\nRespond ONLY with valid JSON in this format:
{
  "mappedItems": [
    {"originalRequest": "cabo 16mm preto", "quantity": 100, "catalogIndex": 5, "conversionLog": "1 rolo -> 100m"}
  ]
}`
        }],
      })
    });

    const data = await response.json();
    const text = data.content?.[0]?.text?.trim();
    
    if (!text) throw new Error("No response");

    const cleanJson = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return (parsed.mappedItems || []).map((item: any) => {
      const isFound = item.catalogIndex !== -1 && item.catalogIndex !== null && catalog[item.catalogIndex];
      const catalogItem = isFound ? catalog[item.catalogIndex] : null;
      let qty = parseFloat(item.quantity);
      if (isNaN(qty) || qty <= 0) qty = 1;

      return {
        id: `item-${Date.now()}-${Math.random()}`,
        quantity: qty,
        originalRequest: item.originalRequest,
        catalogItem: catalogItem,
        conversionLog: item.conversionLog || undefined,
        isLearned: false
      };
    });
  } catch (error) {
    console.error("AI Error:", error);
    throw error;
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
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Busca manual rápida
  useEffect(() => {
    if (!inputText.trim() || catalog.length === 0) {
      onItemsChange([]);
      return;
    }

    const parsedItems = parseOrderText(inputText);
    
    const processedItems: QuoteItem[] = parsedItems.map(item => {
      const cleanText = cleanTextForLearning(item.originalRequest);
      
      const learnedProductId = findLearnedMatch(cleanText);
      if (learnedProductId) {
        const learnedProduct = catalog.find(c => c.id === learnedProductId);
        if (learnedProduct) {
          return { ...item, catalogItem: learnedProduct, isLearned: true };
        }
      }

      const simpleMatch = findSimpleMatch(item.originalRequest, catalog);
      if (simpleMatch) {
        return { ...item, catalogItem: simpleMatch, isLearned: false };
      }

      return { ...item, catalogItem: null, isLearned: false };
    });

    onItemsChange(processedItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, catalog]);

  // Processa com Gemini AI
  const handleProcessWithAI = async () => {
    if (!inputText.trim() || catalog.length === 0) return;

    setIsProcessingAI(true);
    try {
      const aiResults = await processWithGemini(inputText, catalog);
      onItemsChange(aiResults);
    } catch (error) {
      alert('Erro ao processar com IA. Tente novamente.');
      console.error(error);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleClear = () => {
    setInputText('');
    onItemsChange([]);
  };

  const lineCount = inputText.split('\n').filter(line => line.trim()).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">Digitação em Tempo Real</h3>
              <p className="text-xs text-slate-600">Busca manual instantânea</p>
            </div>
          </div>

          <button
            onClick={handleProcessWithAI}
            disabled={!inputText.trim() || isProcessingAI}
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg text-sm"
          >
            {isProcessingAI ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Processar com IA
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
            placeholder="Digite ou cole a lista de materiais&#10;&#10;Busca Manual (instantânea):&#10;1 rolo cabo 16mm preto&#10;3 rolo fio 4mm (preto/azul/verde)&#10;&#10;Clique 'Processar com IA' para melhor precisão!"
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
            <span>⚡ Busca manual: rápida mas pode errar • ✨ IA: mais precisa</span>
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
