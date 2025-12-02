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
// PARSER SIMPLES (PARA BUSCA MANUAL)
// ============================================================================
const normalizeItemType = (text: string): string => {
  let result = text.toLowerCase();
  result = result.replace(/\b(fio|rolos?)\b/gi, 'cabo');
  return result;
};

const parseForManualSearch = (text: string): Omit<QuoteItem, 'catalogItem' | 'isLearned'>[] => {
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

    // Converte rolos
    let conversionLog = '';
    if (description.toLowerCase().includes('rolo')) {
      qty = qty * 100;
      conversionLog = `${qty / 100} rolo(s) → ${qty}m`;
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
// BUSCA MANUAL SIMPLES
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

    for (const word of words) {
      if (itemText.includes(word)) {
        score += word.length * 3;
      }
    }

    if (itemText.includes(normalized)) {
      score += 100;
    }

    if (score > highestScore && score > 20) {
      highestScore = score;
      bestMatch = item;
    }
  }

  return bestMatch;
};

// ============================================================================
// GEMINI AI - RECEBE TEXTO ORIGINAL COMPLETO
// ============================================================================
const processWithGemini = async (originalText: string, catalog: CatalogItem[]): Promise<QuoteItem[]> => {
  const catalogString = catalog
    .map((item, index) => `${index}|${item.description}|R$ ${item.price.toFixed(2)}`)
    .join('\n');

  const systemPrompt = `Você é especialista em materiais elétricos da KF Elétrica.

REGRAS CRÍTICAS:
1. ROLOS DE FIO/CABO: 1 rolo = 100 metros SEMPRE
   - "3 rolos cabo 2,5mm" = 300 metros
   - "1 rolo fio 16mm preto" = 100 metros

2. CORES EM PARÊNTESES: (cor1/cor2/cor3) = DIVIDE em itens separados
   - "3 rolo fio 4mm (preto/azul/verde)" = 3 itens:
     * 1 rolo (100m) fio 4mm preto
     * 1 rolo (100m) fio 4mm azul
     * 1 rolo (100m) fio 4mm verde

3. SINÔNIMOS:
   - fio = cabo = flex
   - split bolt = conector

4. MATCHING:
   - Priorize BITOLA exata (2,5mm, 4mm, 16mm, etc)
   - Priorize COR exata (preto, azul, verde, etc)
   - Se não achar exato, retorne catalogIndex: -1

RETORNE JSON:
{
  "items": [
    {
      "originalRequest": "cabo 16mm preto",
      "quantity": 100,
      "catalogIndex": 5,
      "conversionLog": "1 rolo → 100m"
    }
  ]
}`;

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        messages: [{
          role: "user",
          content: `${systemPrompt}

CATÁLOGO (índice|descrição|preço):
${catalogString}

PEDIDO DO CLIENTE:
${originalText}

Analise cada linha e retorne o JSON conforme as regras.`
        }],
      })
    });

    const data = await response.json();
    let text = data.content?.[0]?.text?.trim();
    
    if (!text) throw new Error("Sem resposta da IA");

    // Remove markdown se houver
    text = text.replace(/```json\n?/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(text);
    const items = parsed.items || [];

    return items.map((item: any, idx: number) => {
      const catalogIndex = parseInt(item.catalogIndex);
      const isFound = catalogIndex >= 0 && catalogIndex < catalog.length;
      const catalogItem = isFound ? catalog[catalogIndex] : null;
      
      let qty = parseFloat(item.quantity);
      if (isNaN(qty) || qty <= 0) qty = 1;

      return {
        id: `ai-item-${Date.now()}-${idx}`,
        quantity: qty,
        originalRequest: item.originalRequest || 'Item desconhecido',
        catalogItem: catalogItem,
        conversionLog: item.conversionLog || undefined,
        isLearned: false
      };
    });
  } catch (error) {
    console.error("Erro na IA:", error);
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
  const [useManualSearch, setUseManualSearch] = useState(true);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Busca manual em tempo real
  useEffect(() => {
    if (!useManualSearch || !inputText.trim() || catalog.length === 0) {
      if (!inputText.trim()) onItemsChange([]);
      return;
    }

    const parsedItems = parseForManualSearch(inputText);
    
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
      return { ...item, catalogItem: simpleMatch, isLearned: false };
    });

    onItemsChange(processedItems);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, catalog, useManualSearch]);

  // Processa com IA
  const handleProcessWithAI = async () => {
    if (!inputText.trim() || catalog.length === 0) return;

    setIsProcessingAI(true);
    setUseManualSearch(false);
    
    try {
      const aiResults = await processWithGemini(inputText, catalog);
      onItemsChange(aiResults);
    } catch (error) {
      alert('Erro ao processar com IA: ' + (error as Error).message);
      console.error(error);
      setUseManualSearch(true);
    } finally {
      setIsProcessingAI(false);
    }
  };

  const handleBackToManual = () => {
    setUseManualSearch(true);
  };

  const handleClear = () => {
    setInputText('');
    onItemsChange([]);
    setUseManualSearch(true);
  };

  const lineCount = inputText.split('\n').filter(line => line.trim()).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`${useManualSearch ? 'bg-blue-500' : 'bg-purple-500'} p-2 rounded-lg transition-colors`}>
              {useManualSearch ? <Zap className="w-5 h-5 text-white" /> : <Sparkles className="w-5 h-5 text-white" />}
            </div>
            <div>
              <h3 className="font-bold text-slate-800">
                {useManualSearch ? 'Busca Manual' : 'Processado com IA'}
              </h3>
              <p className="text-xs text-slate-600">
                {useManualSearch ? 'Instantânea, pode ter erros' : 'Resultado inteligente'}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            {!useManualSearch && (
              <button
                onClick={handleBackToManual}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-all text-sm"
              >
                <Zap className="w-4 h-4" />
                Voltar Manual
              </button>
            )}
            
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
            placeholder="Cole ou digite a lista de materiais:&#10;&#10;1 rolo cabo 16mm preto&#10;1 rolo fio 6mm preto&#10;3 rolo fio 4mm (preto/azul/verde)&#10;3 rolo fio 2,5mm (vermelho/azul/verde)&#10;&#10;💡 Use 'Processar com IA' para máxima precisão!"
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

        <div className="mt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            {useManualSearch ? (
              <span className="text-slate-500">⚡ Busca manual ativa • Clique no botão roxo para IA</span>
            ) : (
              <span className="text-purple-600 font-medium">✨ Resultado processado com Inteligência Artificial</span>
            )}
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
