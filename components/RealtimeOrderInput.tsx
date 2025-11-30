import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles } from 'lucide-react';

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
// PARSER COM CONVERSÕES
// ============================================================================
const normalizeItemType = (text: string): string => {
  const lower = text.toLowerCase();
  if (lower.includes('fio') || lower.includes('cabo') || lower.includes('rolo')) {
    return text.replace(/\b(fio|cabo|rolo)s?\b/gi, 'cabo');
  }
  return text;
};

const extractColors = (text: string): string[] => {
  const colorPattern = /\b(az|vm|pt|br|am|vd|rs|pr|lj|cx|vr|amarelo|azul|vermelho|preto|branco|verde|rosa|laranja|cinza|marrom)\b/gi;
  const matches = text.match(colorPattern);
  if (!matches) return [];
  return [...new Set(matches.map(c => c.toUpperCase()))];
};

const splitMultipleColors = (line: string, baseQty: number): { qty: number; text: string; }[] => {
  const colors = extractColors(line);
  if (colors.length >= 2 && (line.includes('/') || /\be\b/i.test(line))) {
    return colors.map(color => ({
      qty: baseQty / colors.length,
      text: line.replace(/\b(az|vm|pt|br|am|vd|rs|pr|lj|cx|vr|amarelo|azul|vermelho|preto|branco|verde|rosa|laranja|cinza|marrom)([/,\se]+)(az|vm|pt|br|am|vd|rs|pr|lj|cx|vr|amarelo|azul|vermelho|preto|branco|verde|rosa|laranja|cinza|marrom)/gi, color)
    }));
  }
  return [{ qty: baseQty, text: line }];
};

const convertRoloToMeters = (qty: number, text: string): { qty: number; log: string } => {
  const lower = text.toLowerCase();
  if (lower.includes('rolo')) {
    return {
      qty: qty * 100,
      log: `${qty} rolo(s) → ${qty * 100}m`
    };
  }
  return { qty, log: '' };
};

const parseOrderText = (text: string): Omit<QuoteItem, 'catalogItem' | 'isLearned'>[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const items: Omit<QuoteItem, 'catalogItem' | 'isLearned'>[] = [];
  let currentPrefix = '';

  lines.forEach((line, index) => {
    if (line.endsWith(':')) {
      currentPrefix = line.replace(/:$/, '').trim();
      return;
    }

    line = normalizeItemType(line);

    if (currentPrefix && !line.match(/^\d/)) {
      line = `${currentPrefix} ${line}`;
    }

    const qtyMatch = line.match(/^(\d+(?:[.,]\d+)?)\s*(?:un|cx|pc|pç|m|mt|mts|metros?|kg|g|l|r|rl|rolos?|x)?\s*[-:]?\s*(.+)/i);
    
    let baseQty = 1;
    let description = line;
    
    if (qtyMatch) {
      baseQty = parseFloat(qtyMatch[1].replace(',', '.'));
      description = qtyMatch[2].trim();
    }

    const { qty: finalQty, log: conversionLog } = convertRoloToMeters(baseQty, description);
    const splitItems = splitMultipleColors(description, finalQty);

    splitItems.forEach((split, splitIndex) => {
      items.push({
        id: `item-${Date.now()}-${index}-${splitIndex}`,
        originalRequest: split.text,
        quantity: split.qty,
        conversionLog: conversionLog || undefined
      });
    });

    if (currentPrefix && line.match(/^\d/)) {
      currentPrefix = '';
    }
  });

  return items;
};

// ============================================================================
// IA MATCHING - USA CLAUDE PARA ENCONTRAR O MELHOR PRODUTO
// ============================================================================
const findMatchWithAI = async (searchText: string, catalogItems: CatalogItem[]): Promise<CatalogItem | null> => {
  if (!searchText || catalogItems.length === 0) return null;

  // Limita a 50 itens mais relevantes para não estourar o contexto
  const relevantItems = catalogItems.slice(0, 100);

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1000,
        messages: [
          {
            role: "user",
            content: `Você é um especialista em materiais elétricos. Sua tarefa é encontrar o produto EXATO do catálogo que corresponde ao pedido do cliente.

PEDIDO DO CLIENTE: "${searchText}"

CATÁLOGO DISPONÍVEL:
${relevantItems.map((item, idx) => `${idx}. ${item.description}`).join('\n')}

INSTRUÇÕES:
- Analise o pedido e encontre o produto que MELHOR corresponde
- Considere sinônimos: "fio" = "cabo", "split bolt" = "conector", etc
- Considere especificações técnicas: bitolas (2,5mm, 16mm), amperagens (10a, 40a), cores
- Se o pedido mencionar características que o produto deve ter (ex: 2,5mm azul), o produto DEVE ter essas características
- Se não houver match perfeito, retorne o mais próximo possível
- Se realmente não houver nenhum match aceitável, retorne "NENHUM"

RESPONDA APENAS COM O NÚMERO DO ÍNDICE do produto correspondente (ex: "5") ou "NENHUM".
Não explique, apenas o número ou "NENHUM".`
          }
        ],
      })
    });

    const data = await response.json();
    const resultText = data.content?.[0]?.text?.trim();

    if (!resultText || resultText === "NENHUM") {
      return null;
    }

    const index = parseInt(resultText);
    if (!isNaN(index) && index >= 0 && index < relevantItems.length) {
      return relevantItems[index];
    }

    return null;
  } catch (error) {
    console.error("AI matching error:", error);
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
  const [isProcessing, setIsProcessing] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const processingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!inputText.trim() || catalog.length === 0) {
      onItemsChange([]);
      return;
    }

    // Limpa timeout anterior
    if (processingTimeoutRef.current) {
      clearTimeout(processingTimeoutRef.current);
    }

    // Aguarda 800ms após parar de digitar para processar
    processingTimeoutRef.current = setTimeout(async () => {
      setIsProcessing(true);
      
      const parsedItems = parseOrderText(inputText);
      const processedItems: QuoteItem[] = [];

      for (const item of parsedItems) {
        const cleanText = cleanTextForLearning(item.originalRequest);
        
        // Primeiro: tenta match aprendido
        const learnedProductId = findLearnedMatch(cleanText);
        if (learnedProductId) {
          const learnedProduct = catalog.find(c => c.id === learnedProductId);
          if (learnedProduct) {
            processedItems.push({
              ...item,
              catalogItem: learnedProduct,
              isLearned: true,
            });
            continue;
          }
        }

        // Segundo: usa IA para encontrar o melhor match
        const aiMatch = await findMatchWithAI(item.originalRequest, catalog);
        if (aiMatch) {
          processedItems.push({
            ...item,
            catalogItem: aiMatch,
            isLearned: false,
          });
        } else {
          processedItems.push({
            ...item,
            catalogItem: null,
            isLearned: false,
          });
        }
      }

      onItemsChange(processedItems);
      setIsProcessing(false);
    }, 800);

    return () => {
      if (processingTimeoutRef.current) {
        clearTimeout(processingTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, catalog]);

  const handleClear = () => {
    setInputText('');
    onItemsChange([]);
  };

  const lineCount = inputText.split('\n').filter(line => line.trim()).length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-purple-50 to-blue-50">
        <div className="flex items-center gap-2 mb-3">
          <div className="bg-gradient-to-br from-purple-500 to-blue-500 p-2 rounded-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              Digitação com IA
              {isProcessing && (
                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full animate-pulse">
                  Processando...
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-600">Sistema inteligente identifica produtos automaticamente</p>
          </div>
        </div>

        <div className="mb-3">
          <input
            type="text"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="Nome do cliente (opcional)"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
          />
        </div>
      </div>

      <div className="p-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite os itens do pedido (um por linha)&#10;&#10;Exemplos:&#10;2 rolos cabo 2,5mm azul&#10;10 disjuntor bipolar 40a&#10;2 conector split bolt 16mm&#10;400m fio 16mm az&#10;&#10;A IA identifica automaticamente o produto correto! ✨"
            className="w-full h-64 px-4 py-3 border-2 border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none font-mono text-sm"
            style={{ fontFamily: 'ui-monospace, monospace' }}
            disabled={isProcessing}
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
            <span>✨ Powered by Claude AI - Reconhece sinônimos e variações automaticamente</span>
          </div>
          {inputText && (
            <span className="text-purple-600 font-medium">
              {lineCount} {lineCount === 1 ? 'linha' : 'linhas'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
