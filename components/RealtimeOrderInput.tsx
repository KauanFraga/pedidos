import React, { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

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
// PARSER FUNCTIONS COM INTELIGÊNCIA PARA CABOS
// ============================================================================

// Mapeia sinônimos
const normalizeItemType = (text: string): string => {
  const lower = text.toLowerCase();
  if (lower.includes('fio') || lower.includes('cabo') || lower.includes('rolo')) {
    return text.replace(/\b(fio|cabo|rolo)s?\b/gi, 'cabo');
  }
  return text;
};

// Extrai cores de uma string (AZ, VM, PT, BR, etc)
const extractColors = (text: string): string[] => {
  const colorPattern = /\b(az|vm|pt|br|am|vd|rs|pr|lj|cx|vr|amarelo|azul|vermelho|preto|branco|verde|rosa|laranja|cinza|marrom)\b/gi;
  const matches = text.match(colorPattern);
  if (!matches) return [];
  
  // Remove duplicatas e retorna
  return [...new Set(matches.map(c => c.toUpperCase()))];
};

// Divide linha com múltiplas cores em múltiplos itens
const splitMultipleColors = (line: string, baseQty: number): { qty: number; text: string; }[] => {
  const colors = extractColors(line);
  
  // Se tem separador "/" ou "e" entre cores, divide
  if (colors.length >= 2 && (line.includes('/') || /\be\b/i.test(line))) {
    return colors.map(color => ({
      qty: baseQty / colors.length,
      text: line.replace(/\b(az|vm|pt|br|am|vd|rs|pr|lj|cx|vr|amarelo|azul|vermelho|preto|branco|verde|rosa|laranja|cinza|marrom)([/,\se]+)(az|vm|pt|br|am|vd|rs|pr|lj|cx|vr|amarelo|azul|vermelho|preto|branco|verde|rosa|laranja|cinza|marrom)/gi, color)
    }));
  }
  
  return [{ qty: baseQty, text: line }];
};

// Converte ROLO em metros
const convertRoloToMeters = (qty: number, text: string): { qty: number; log: string } => {
  const lower = text.toLowerCase();
  if (lower.includes('rolo')) {
    return {
      qty: qty * 100, // 1 rolo = 100 metros
      log: `${qty} rolo(s) → ${qty * 100}m`
    };
  }
  return { qty, log: '' };
};

const parseOrderText = (text: string): Omit<QuoteItem, 'catalogItem' | 'isLearned'>[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const items: Omit<QuoteItem, 'catalogItem' | 'isLearned'>[] = [];
  
  let currentPrefix = ''; // Para linhas hierárquicas (ex: "2,5mm:" seguido de cores)

  lines.forEach((line, index) => {
    // Detecta linha de prefixo (ex: "cabos 1,5mm:" ou "2,5mm:")
    if (line.endsWith(':')) {
      currentPrefix = line.replace(/:$/, '').trim();
      return;
    }

    // Normaliza tipos (fio → cabo)
    line = normalizeItemType(line);

    // Se tem prefixo ativo, concatena
    if (currentPrefix && !line.match(/^\d/)) {
      line = `${currentPrefix} ${line}`;
    }

    // Extrai quantidade
    const qtyMatch = line.match(/^(\d+(?:[.,]\d+)?)\s*(?:un|cx|pc|pç|m|mt|mts|metros?|kg|g|l|r|rl|rolos?|x)?\s*[-:]?\s*(.+)/i);
    
    let baseQty = 1;
    let description = line;
    
    if (qtyMatch) {
      baseQty = parseFloat(qtyMatch[1].replace(',', '.'));
      description = qtyMatch[2].trim();
    }

    // Converte ROLO em metros
    const { qty: finalQty, log: conversionLog } = convertRoloToMeters(baseQty, description);

    // Divide por cores se necessário
    const splitItems = splitMultipleColors(description, finalQty);

    splitItems.forEach((split, splitIndex) => {
      items.push({
        id: `item-${Date.now()}-${index}-${splitIndex}`,
        originalRequest: split.text,
        quantity: split.qty,
        conversionLog: conversionLog || undefined
      });
    });

    // Limpa prefixo após uso se não terminou com ":"
    if (currentPrefix && line.match(/^\d/)) {
      currentPrefix = '';
    }
  });

  return items;
};

// ============================================================================
// BUSCA ULTRA RIGOROSA - SÓ ACEITA MATCHES MUITO PRECISOS
// ============================================================================

// Extrai características chave (bitolas, amperagens, etc)
const extractKeyFeatures = (text: string): string[] => {
  const features: string[] = [];
  
  // Bitolas de cabo (ex: 2,5mm, 16mm, 2.5mm)
  const bitolas = text.match(/\d+[.,]?\d*\s*mm/gi);
  if (bitolas) features.push(...bitolas.map(b => b.toLowerCase().replace(/\s/g, '')));
  
  // Amperagens (ex: 10a, 40a, 60a)
  const amperes = text.match(/\d+\s*a\b/gi);
  if (amperes) features.push(...amperes.map(a => a.toLowerCase().replace(/\s/g, '')));
  
  // Cores abreviadas
  const coresAbrev = text.match(/\b(az|vm|pt|br|am|vd|rs|pr|lj|cx)\b/gi);
  if (coresAbrev) features.push(...coresAbrev.map(c => c.toLowerCase()));
  
  return features;
};

const findBestMatch = (searchText: string, catalogItems: CatalogItem[]): CatalogItem | null => {
  if (!searchText || catalogItems.length === 0) return null;

  const normalizedSearch = normalizeItemType(cleanTextForLearning(searchText));
  const searchWords = normalizedSearch.split(/\s+/).filter(w => w.length >= 2);
  const searchFeatures = extractKeyFeatures(searchText);

  if (searchWords.length === 0) return null;

  let bestMatch: CatalogItem | null = null;
  let highestScore = 0;
  const minScore = Math.max(30, searchWords.length * 10); // Score mínimo mais alto

  for (const item of catalogItems) {
    const itemText = normalizeItemType(cleanTextForLearning(item.description));
    const itemFeatures = extractKeyFeatures(item.description);
    let score = 0;
    let matchedWords = 0;
    let criticalFeaturesMissing = false;

    // REGRA CRÍTICA 1: Se busca tem características (bitola, amperagem), DEVE ter no item
    if (searchFeatures.length > 0) {
      let featuresMatched = 0;
      for (const feature of searchFeatures) {
        if (itemFeatures.some(f => f === feature || itemText.includes(feature))) {
          featuresMatched++;
          score += 30; // MUITO peso para características corretas
        }
      }
      
      // Se não achou TODAS as características, rejeita
      if (featuresMatched < searchFeatures.length) {
        continue; // PRÓXIMO ITEM
      }
    }

    // REGRA CRÍTICA 2: Palavras-chave principais devem estar presentes
    const mainWords = searchWords.filter(w => w.length >= 3); // Só palavras importantes
    for (const word of mainWords) {
      if (itemText.includes(word)) {
        matchedWords++;
        score += word.length * 5;
      }
    }

    // Se não achou pelo menos 70% das palavras principais, rejeita
    if (mainWords.length > 0 && matchedWords / mainWords.length < 0.7) {
      continue;
    }

    // BONUS GRANDES para matches perfeitos
    if (itemText.includes(normalizedSearch)) {
      score += 300;
    }

    if (itemText.startsWith(normalizedSearch)) {
      score += 150;
    }

    // BONUS para ordem correta das palavras
    let lastIndex = -1;
    let inOrder = true;
    for (const word of searchWords) {
      const idx = itemText.indexOf(word);
      if (idx > lastIndex) {
        lastIndex = idx;
      } else if (idx !== -1) {
        inOrder = false;
      }
    }
    if (inOrder) score += 50;

    // PENALIZA fortemente se item tem características que a busca não tem
    const extraFeatures = itemFeatures.filter(f => !searchFeatures.includes(f));
    if (extraFeatures.length > 2) {
      score -= 50; // Provavelmente é produto diferente
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
          return {
            ...item,
            catalogItem: learnedProduct,
            isLearned: true,
          };
        }
      }

      const fuzzyMatch = findBestMatch(item.originalRequest, catalog);
      if (fuzzyMatch) {
        return {
          ...item,
          catalogItem: fuzzyMatch,
          isLearned: false,
        };
      }

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
            placeholder="Digite os itens do pedido (um por linha)&#10;&#10;Exemplos:&#10;2 rolos cabo 2,5mm azul (converte automaticamente para 200m)&#10;10 disjuntor bipolar 40a&#10;200m cabo 1,5mm AZ/VM (divide em 2 itens)&#10;&#10;cabos 2,5mm:&#10;  150m preto&#10;  250m azul"
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
            <span>💡 Rolos são convertidos automaticamente (1 rolo = 100m)</span>
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
