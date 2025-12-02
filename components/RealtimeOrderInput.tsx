import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Sparkles, Zap, CheckCircle2, XCircle, ArrowRight, Package, Copy, Edit2, ChevronDown } from 'lucide-react';

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
// PARSER MELHORADO COM CONTEXTO
// ============================================================================
const normalizeItemType = (text: string): string => {
  let result = text.toLowerCase();
  
  // Normaliza cabos e fios
  result = result.replace(/\b(fio|rolos?)\b/gi, 'cabo');
  
  // Normaliza tomadas e interruptores
  result = result.replace(/\btom\b/gi, 'tomada');
  result = result.replace(/\binter\b/gi, 'interruptor');
  result = result.replace(/\binterr\b/gi, 'interruptor');
  
  // Normaliza eletrodutos e conexões
  result = result.replace(/\beletro\b/gi, 'eletroduto');
  result = result.replace(/\beltr\b/gi, 'eletroduto');
  result = result.replace(/\bcz\b/gi, 'cinza');
  result = result.replace(/\bzincado\b/gi, 'zincado');
  result = result.replace(/\balum\b/gi, 'aluminio');
  
  // Normaliza medidas
  result = result.replace(/\b3\/4\b/gi, '3/4');
  result = result.replace(/\b1\/2\b/gi, '1/2');
  result = result.replace(/\b1\s*1\/2\b/gi, '1.1/2');
  result = result.replace(/\b2\s*1\/2\b/gi, '2.1/2');
  
  return result;
};

interface ParsedItem {
  id: string;
  quantity: number;
  originalRequest: string;
  conversionLog?: string;
  inferredType?: string; // 'tomada', 'interruptor', etc.
  inferredBrand?: string; // 'mg', 'aria', etc.
}

const parseForManualSearch = (text: string): ParsedItem[] => {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);
  const items: ParsedItem[] = [];
  
  let contextType: string | null = null; // 'tomada', 'interruptor', 'eletroduto', 'curva', etc
  let contextBrand: string | null = null; // 'mg', 'aria', 'pvc', 'cinza', 'zincado'
  let contextDetails: string[] = []; // outros detalhes como '3/4', 'leve', etc

  lines.forEach((line, index) => {
    const qtyMatch = line.match(/^[-*]?\s*(\d+(?:[.,]\d+)?)\s*(?:un|cx|pc|pç|m|mt|mts|metros?|kg|g|l|r|rl|rolos?|x)?\s*[-:]?\s*(.+)/i);
    
    let qty = 1;
    let description = line.replace(/^[-*]\s*/, '');
    
    if (qtyMatch) {
      qty = parseFloat(qtyMatch[1].replace(',', '.'));
      description = qtyMatch[2].trim();
    }

    const lowerDesc = description.toLowerCase();
    
    // Detecta TIPO principal
    let lineType: string | null = null;
    if (lowerDesc.includes('tomada') || lowerDesc.includes('tom ')) {
      lineType = 'tomada';
    } else if (lowerDesc.includes('interruptor') || lowerDesc.includes('inter ')) {
      lineType = 'interruptor';
    } else if (lowerDesc.includes('eletroduto') || lowerDesc.includes('eletro')) {
      lineType = 'eletroduto';
    } else if (lowerDesc.includes('curva')) {
      lineType = 'curva';
    } else if (lowerDesc.includes('luva')) {
      lineType = 'luva';
    } else if (lowerDesc.includes('abraçadeira') || lowerDesc.includes('abracadeira')) {
      lineType = 'abraçadeira';
    } else if (lowerDesc.includes('unidut')) {
      lineType = 'unidut';
    } else if (lowerDesc.includes('bucha')) {
      lineType = 'bucha';
    } else if (lowerDesc.includes('condulete')) {
      lineType = 'condulete';
    } else if (lowerDesc.includes('caixa')) {
      lineType = 'caixa';
    } else if (lowerDesc.includes('conector') || lowerDesc.includes('split')) {
      lineType = 'conector';
    } else if (lowerDesc.includes('fita')) {
      lineType = 'fita';
    } else if (lowerDesc.includes('cabo') || lowerDesc.includes('fio')) {
      lineType = 'cabo';
    } else if (lowerDesc.includes('simples') || lowerDesc.includes('paralelo')) {
      // Simples/paralelo sem especificar = assume interruptor
      lineType = 'interruptor';
    }
    
    // Detecta MATERIAL/COR
    let lineBrand: string | null = null;
    if (lowerDesc.includes('aria')) {
      lineBrand = 'aria';
    } else if (lowerDesc.includes('mg') || lowerDesc.includes('margirius')) {
      lineBrand = 'mg';
    } else if (lowerDesc.includes('pvc')) {
      lineBrand = 'pvc';
    } else if (lowerDesc.includes('cinza') || lowerDesc.includes('cz')) {
      lineBrand = 'cinza';
    } else if (lowerDesc.includes('preto') || lowerDesc.includes('preta')) {
      lineBrand = 'preto';
    } else if (lowerDesc.includes('branco') || lowerDesc.includes('branca')) {
      lineBrand = 'branco';
    } else if (lowerDesc.includes('zincado') || lowerDesc.includes('zincada')) {
      lineBrand = 'zincado';
    } else if (lowerDesc.includes('aluminio') || lowerDesc.includes('alum')) {
      lineBrand = 'aluminio';
    }
    
    // Atualiza contexto se encontrou tipo ou material
    if (lineType) {
      contextType = lineType;
      contextDetails = []; // Reset details quando muda o tipo
    }
    if (lineBrand) contextBrand = lineBrand;
    
    // Captura detalhes da primeira linha completa
    if (lineType && (lineBrand || lowerDesc.match(/\d/))) {
      // Captura medidas
      if (lowerDesc.includes('3/4')) contextDetails.push('3/4');
      if (lowerDesc.includes('1/2')) contextDetails.push('1/2');
      if (lowerDesc.includes('1 1/2') || lowerDesc.includes('1.1/2')) contextDetails.push('1 1/2');
      if (lowerDesc.includes('2 1/2') || lowerDesc.includes('2.1/2')) contextDetails.push('2 1/2');
      
      // Captura especificações
      if (lowerDesc.includes('10a')) contextDetails.push('10a');
      if (lowerDesc.includes('20a')) contextDetails.push('20a');
      if (lowerDesc.includes('simples')) contextDetails.push('simples');
      if (lowerDesc.includes('paralelo')) contextDetails.push('paralelo');
      if (lowerDesc.includes('leve')) contextDetails.push('leve');
      if (lowerDesc.includes('pesada')) contextDetails.push('pesada');
      if (lowerDesc.includes('90')) contextDetails.push('90');
      if (lowerDesc.includes('45')) contextDetails.push('45');
    }
    
    // Aplica contexto se a linha não especifica
    let enrichedDescription = description;
    const needsType = !lineType && contextType;
    const needsBrand = !lineBrand && contextBrand;
    
    if (needsType || needsBrand) {
      if (needsType) {
        enrichedDescription = `${contextType} ${enrichedDescription}`;
      }
      if (needsBrand) {
        enrichedDescription = `${enrichedDescription} ${contextBrand}`;
      }
    }

    // Converte rolos
    let conversionLog = '';
    if (lowerDesc.includes('rolo')) {
      qty = qty * 100;
      conversionLog = `${qty / 100} rolo(s) → ${qty}m`;
    }

    items.push({
      id: `item-${Date.now()}-${index}`,
      originalRequest: description,
      quantity: qty,
      conversionLog: conversionLog || undefined,
      inferredType: contextType || undefined,
      inferredBrand: contextBrand || undefined
    });
  });

  return items;
};

// ============================================================================
// BUSCA UNIVERSAL - RECONHECE TODOS OS TIPOS DE MATERIAIS ELÉTRICOS
// ============================================================================
const findSmartMatch = (searchText: string, catalogItems: CatalogItem[], context?: { type?: string, brand?: string }): CatalogItem | null => {
  if (!searchText || catalogItems.length === 0) return null;

  const normalized = normalizeItemType(cleanTextForLearning(searchText));
  
  // Detecta TIPO DE PRODUTO
  const isTomada = normalized.includes('tomada');
  const isInterruptor = normalized.includes('interruptor') || normalized.includes('simples') || normalized.includes('paralelo');
  const isEletroduto = normalized.includes('eletroduto') || normalized.includes('eletro');
  const isCurva = normalized.includes('curva');
  const isLuva = normalized.includes('luva');
  const isAbraçadeira = normalized.includes('abracadeira') || normalized.includes('abraçadeira');
  const isUnidut = normalized.includes('unidut');
  const isBucha = normalized.includes('bucha');
  const isCondulete = normalized.includes('condulete');
  const isCaixa = normalized.includes('caixa');
  const isConector = normalized.includes('conector') || normalized.includes('split');
  const isFita = normalized.includes('fita');
  const isCabo = normalized.includes('cabo') || normalized.includes('fio');
  
  // Detecta MATERIAL/COR
  const isPVC = normalized.includes('pvc');
  const isCinza = normalized.includes('cinza') || normalized.includes('cz');
  const isPreto = normalized.includes('preto') || normalized.includes('preta');
  const isBranco = normalized.includes('branco') || normalized.includes('branca');
  const isZincado = normalized.includes('zincado') || normalized.includes('zincada');
  const isAluminio = normalized.includes('aluminio') || normalized.includes('alum');
  
  // Detecta MARCA
  const isAria = normalized.includes('aria');
  const isMG = normalized.includes('mg') || normalized.includes('margirius');
  
  // Detecta ESPECIFICAÇÕES
  const isSimples = normalized.includes('simples') || normalized.includes('1t');
  const isParalelo = normalized.includes('paralelo') || normalized.includes('three way');
  const is10a = normalized.includes('10a');
  const is20a = normalized.includes('20a');
  const isCego = normalized.includes('cego') || normalized.includes('tampado');
  
  // Detecta MEDIDAS (eletrodutos, curvas, etc)
  const measure34 = normalized.includes('3/4') || normalized.includes('3 / 4');
  const measure12 = normalized.includes('1/2') || normalized.includes('1 / 2');
  const measure1 = normalized.match(/\b1\s*pol\b|\b1\s*"\b|\buma\s*pol/);
  const measure112 = normalized.includes('1.1/2') || normalized.includes('1 1/2');
  const measure2 = normalized.match(/\b2\s*pol\b|\b2\s*"\b|\bduas\s*pol/);
  const measure212 = normalized.includes('2.1/2') || normalized.includes('2 1/2');
  
  // Detecta TIPO DE CONEXÃO (para curvas)
  const isLeve = normalized.includes('leve');
  const isPesada = normalized.includes('pesada');
  const is90 = normalized.includes('90') || normalized.includes('noventa');
  const is45 = normalized.includes('45') || normalized.includes('quarenta');

  // Extrai palavras-chave
  const searchWords = normalized.split(/\s+/).filter(w => w.length >= 2);

  let bestMatch: CatalogItem | null = null;
  let highestScore = 0;

  for (const item of catalogItems) {
    const itemText = normalizeItemType(cleanTextForLearning(item.description));
    let score = 0;
    let hasTypeMatch = false;

    // ==================== TIPO DE PRODUTO (OBRIGATÓRIO) ====================
    
    // Tomadas e Interruptores
    if (isTomada && itemText.includes('tomada')) {
      score += 100;
      hasTypeMatch = true;
    }
    if (isInterruptor && (itemText.includes('interruptor') || itemText.includes('paralelo') || itemText.includes('simples'))) {
      score += 100;
      hasTypeMatch = true;
    }
    
    // Eletrodutos e Conexões
    if (isEletroduto && itemText.includes('eletroduto')) {
      score += 100;
      hasTypeMatch = true;
    }
    if (isCurva && itemText.includes('curva')) {
      score += 100;
      hasTypeMatch = true;
    }
    if (isLuva && itemText.includes('luva')) {
      score += 100;
      hasTypeMatch = true;
    }
    if (isAbraçadeira && (itemText.includes('abracadeira') || itemText.includes('abraçadeira'))) {
      score += 100;
      hasTypeMatch = true;
    }
    if (isUnidut && itemText.includes('unidut')) {
      score += 100;
      hasTypeMatch = true;
    }
    if (isBucha && itemText.includes('bucha')) {
      score += 100;
      hasTypeMatch = true;
    }
    if (isCondulete && itemText.includes('condulete')) {
      score += 100;
      hasTypeMatch = true;
    }
    if (isCaixa && itemText.includes('caixa')) {
      score += 100;
      hasTypeMatch = true;
    }
    if (isConector && (itemText.includes('conector') || itemText.includes('split'))) {
      score += 100;
      hasTypeMatch = true;
    }
    if (isFita && itemText.includes('fita')) {
      score += 100;
      hasTypeMatch = true;
    }
    if (isCabo && (itemText.includes('cabo') || itemText.includes('fio'))) {
      score += 100;
      hasTypeMatch = true;
    }

    // Se não bateu o tipo do produto, pula (muito importante!)
    if (!hasTypeMatch) continue;

    // ==================== MATERIAL/COR ====================
    
    if (isPVC && itemText.includes('pvc')) score += 70;
    if (isCinza && (itemText.includes('cinza') || itemText.includes('cz'))) score += 70;
    if (isPreto && (itemText.includes('preto') || itemText.includes('preta'))) score += 70;
    if (isBranco && (itemText.includes('branco') || itemText.includes('branca'))) score += 70;
    if (isZincado && (itemText.includes('zincado') || itemText.includes('zincada'))) score += 70;
    if (isAluminio && (itemText.includes('aluminio') || itemText.includes('alum'))) score += 70;

    // ==================== MARCA (para tomadas/interruptores) ====================
    
    if (isAria && itemText.includes('aria')) score += 60;
    if (isMG && (itemText.includes('mg') || itemText.includes('margirius'))) score += 60;

    // ==================== MEDIDAS ====================
    
    if (measure34 && itemText.includes('3/4')) score += 80;
    if (measure12 && itemText.includes('1/2')) score += 80;
    if (measure112 && (itemText.includes('1.1/2') || itemText.includes('1 1/2'))) score += 80;
    if (measure2 && itemText.match(/\b2\s*pol|\b2\s*"/)) score += 80;
    if (measure212 && (itemText.includes('2.1/2') || itemText.includes('2 1/2'))) score += 80;

    // ==================== ESPECIFICAÇÕES ====================
    
    // Para interruptores
    if (isSimples && itemText.includes('simples')) score += 50;
    if (isParalelo && (itemText.includes('paralelo') || itemText.includes('three'))) score += 50;
    if (is10a && itemText.includes('10a')) score += 50;
    if (is20a && itemText.includes('20a')) score += 50;
    if (isCego && itemText.includes('cego')) score += 40;
    
    // Para curvas e conexões
    if (isLeve && itemText.includes('leve')) score += 50;
    if (isPesada && itemText.includes('pesada')) score += 50;
    if (is90 && itemText.includes('90')) score += 40;
    if (is45 && itemText.includes('45')) score += 40;

    // ==================== PENALIZAÇÕES ====================
    
    // Penaliza se tem características que NÃO foram pedidas
    if (!isCinza && !isPVC && itemText.includes('cinza') && (isEletroduto || isCurva)) score -= 25;
    if (!isPreto && !isPVC && itemText.includes('preto') && (isEletroduto || isCurva)) score -= 25;
    if (!isZincado && itemText.includes('zincado')) score -= 25;
    if (!isLeve && itemText.includes('leve') && isCurva) score -= 20;
    if (!isPesada && itemText.includes('pesada') && isCurva) score -= 20;
    if (!measure34 && itemText.includes('3/4')) score -= 30;
    if (!measure12 && itemText.includes('1/2')) score -= 30;

    // ==================== BONUS POR MATCH DE PALAVRAS ====================
    
    let wordMatches = 0;
    for (const word of searchWords) {
      if (['de', 'da', 'do', 'com', 'para', 'em', 'e'].includes(word)) continue;
      if (itemText.includes(word)) {
        wordMatches++;
        score += 3;
      }
    }

    // Bonus por múltiplas palavras
    if (wordMatches >= 3) score += 15;
    if (wordMatches >= 4) score += 25;

    // ==================== SELEÇÃO DO MELHOR ====================
    
    if (score > highestScore && score >= 100) {
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
  const [processedItems, setProcessedItems] = useState<QuoteItem[]>([]);
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const [useManualSearch, setUseManualSearch] = useState(true);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Busca manual em tempo real com contexto
  useEffect(() => {
    if (!useManualSearch || !inputText.trim() || catalog.length === 0) {
      if (!inputText.trim()) {
        setProcessedItems([]);
        onItemsChange([]);
      }
      return;
    }

    const parsedItems = parseForManualSearch(inputText);
    
    const items: QuoteItem[] = parsedItems.map(item => {
      const cleanText = cleanTextForLearning(item.originalRequest);
      
      const learnedProductId = findLearnedMatch(cleanText);
      if (learnedProductId) {
        const learnedProduct = catalog.find(c => c.id === learnedProductId);
        if (learnedProduct) {
          return { 
            ...item, 
            catalogItem: learnedProduct, 
            isLearned: true 
          };
        }
      }

      // Cria texto enriquecido com contexto
      let enrichedText = item.originalRequest;
      if (item.inferredType && !item.originalRequest.toLowerCase().includes(item.inferredType)) {
        enrichedText = `${item.inferredType} ${enrichedText}`;
      }
      if (item.inferredBrand && !item.originalRequest.toLowerCase().includes(item.inferredBrand)) {
        enrichedText = `${enrichedText} ${item.inferredBrand}`;
      }

      const smartMatch = findSmartMatch(enrichedText, catalog, {
        type: item.inferredType,
        brand: item.inferredBrand
      });
      
      return { 
        ...item, 
        catalogItem: smartMatch, 
        isLearned: false 
      };
    });

    setProcessedItems(items);
    onItemsChange(items);
    
    setTimeout(() => {
      if (resultsRef.current) {
        resultsRef.current.scrollTop = resultsRef.current.scrollHeight;
      }
    }, 50);
  }, [inputText, catalog, useManualSearch, onItemsChange]);

  const handleProcessWithAI = async () => {
    alert('Funcionalidade de IA desabilitada temporariamente. Use a busca manual que foi melhorada!');
  };

  const handleBackToManual = () => {
    setUseManualSearch(true);
  };

  const handleClear = () => {
    setInputText('');
    setProcessedItems([]);
    onItemsChange([]);
    setUseManualSearch(true);
  };

  // Copia para Excel
  const handleCopyToExcel = () => {
    const excelData = processedItems.map(item => 
      `${item.quantity}\t${item.originalRequest}${item.catalogItem ? `\t${item.catalogItem.description}\t${item.catalogItem.price}` : '\tNÃO ENCONTRADO\t0'}`
    ).join('\n');
    
    navigator.clipboard.writeText(excelData).then(() => {
      alert('✅ Dados copiados! Cole no Excel (Ctrl+V)');
    }).catch(() => {
      alert('❌ Erro ao copiar. Tente novamente.');
    });
  };

  // Edita item manualmente
  const handleChangeItem = (itemId: string, newCatalogItem: CatalogItem) => {
    const updated = processedItems.map(item => 
      item.id === itemId ? { ...item, catalogItem: newCatalogItem, isLearned: false } : item
    );
    setProcessedItems(updated);
    onItemsChange(updated);
    setEditingItemId(null);
    setSearchTerm('');
  };

  const lineCount = inputText.split('\n').filter(line => line.trim()).length;
  const foundCount = processedItems.filter(item => item.catalogItem !== null).length;
  const notFoundCount = processedItems.filter(item => item.catalogItem === null).length;

  // Filtra produtos para dropdown
  const getFilteredCatalog = (term: string) => {
    if (!term) return catalog.slice(0, 20);
    const lower = term.toLowerCase();
    return catalog.filter(item => 
      item.description.toLowerCase().includes(lower)
    ).slice(0, 20);
  };

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="bg-blue-500 p-2 rounded-lg transition-colors">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800">Busca Manual Inteligente</h3>
                <p className="text-xs text-slate-600">
                  Reconhece contexto e padrões automaticamente
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleCopyToExcel}
                disabled={processedItems.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white px-3 py-2 rounded-lg font-medium flex items-center gap-2 transition-all text-sm"
              >
                <Copy className="w-4 h-4" />
                Copiar Excel
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
              placeholder="Cole ou digite a lista de materiais:&#10;&#10;Exemplo com contexto inteligente:&#10;1 tomada 10a aria&#10;1 simples (entende que é tomada aria)&#10;1 20a (entende que é tomada aria)&#10;&#10;1 interruptor simples mg&#10;1 paralelo (entende que é interruptor mg)"
              className="w-full h-48 px-4 py-3 border-2 border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none font-mono text-sm"
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
            <span className="text-slate-500">
              💡 Dica: Especifique tipo/marca no primeiro item (ex: "tomada aria") e os próximos herdarão o contexto
            </span>
            {inputText && (
              <span className="text-blue-600 font-medium">
                {lineCount} {lineCount === 1 ? 'linha' : 'linhas'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Results Card */}
      {processedItems.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-green-50 to-emerald-50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="w-5 h-5 text-green-600" />
                <h3 className="font-bold text-slate-800">Itens Processados</h3>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-green-700">{foundCount}</span>
                  <span className="text-slate-600">encontrados</span>
                </div>
                {notFoundCount > 0 && (
                  <div className="flex items-center gap-1">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <span className="font-semibold text-red-700">{notFoundCount}</span>
                    <span className="text-slate-600">não encontrados</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div 
            ref={resultsRef}
            className="max-h-96 overflow-y-auto p-4 space-y-2"
          >
            {processedItems.map((item, index) => (
              <div 
                key={item.id}
                className={`p-3 rounded-lg border-2 transition-all ${
                  item.catalogItem 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="shrink-0">
                    {item.catalogItem ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <p className="font-semibold text-slate-800 text-sm">
                          {item.quantity}x {item.originalRequest}
                        </p>
                        {item.conversionLog && (
                          <div className="mt-1 flex items-center gap-1 text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded w-fit">
                            <ArrowRight className="w-3 h-3" />
                            {item.conversionLog}
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs text-slate-500 block">#{index + 1}</span>
                        {item.isLearned && (
                          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded mt-1 inline-block">
                            ⭐ Aprendido
                          </span>
                        )}
                      </div>
                    </div>

                    {item.catalogItem ? (
                      <div className="bg-white rounded border border-green-300 p-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm text-slate-700 font-medium">
                              {item.catalogItem.description}
                            </p>
                            <div className="flex items-center justify-between mt-1">
                              <p className="text-lg font-bold text-green-700">
                                R$ {item.catalogItem.price.toFixed(2)}
                              </p>
                              <p className="text-sm text-slate-600">
                                Subtotal: <span className="font-semibold text-slate-800">
                                  R$ {(item.quantity * item.catalogItem.price).toFixed(2)}
                                </span>
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => setEditingItemId(item.id)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Editar item"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Dropdown de edição */}
                        {editingItemId === item.id && (
                          <div className="mt-2 pt-2 border-t border-green-200">
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder="Buscar produto para substituir..."
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm mb-2"
                              autoFocus
                            />
                            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded bg-white">
                              {getFilteredCatalog(searchTerm).map(catalogItem => (
                                <button
                                  key={catalogItem.id}
                                  onClick={() => handleChangeItem(item.id, catalogItem)}
                                  className="w-full text-left px-2 py-2 hover:bg-blue-50 text-xs border-b border-slate-100 last:border-0"
                                >
                                  <div className="font-medium text-slate-800">{catalogItem.description}</div>
                                  <div className="text-green-600 font-semibold">R$ {catalogItem.price.toFixed(2)}</div>
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => {
                                setEditingItemId(null);
                                setSearchTerm('');
                              }}
                              className="mt-2 text-xs text-slate-600 hover:text-slate-800"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-red-100 border border-red-300 rounded p-2">
                        <p className="text-sm text-red-700 font-medium">
                          ❌ Item não encontrado no catálogo
                        </p>
                        <p className="text-xs text-red-600 mt-1">
                          Clique no botão de editar para escolher manualmente
                        </p>
                        <button
                          onClick={() => setEditingItemId(item.id)}
                          className="mt-2 text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Escolher produto
                        </button>

                        {/* Dropdown de edição para item não encontrado */}
                        {editingItemId === item.id && (
                          <div className="mt-2 pt-2 border-t border-red-200">
                            <input
                              type="text"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              placeholder="Buscar produto..."
                              className="w-full px-2 py-1 border border-slate-300 rounded text-sm mb-2"
                              autoFocus
                            />
                            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded bg-white">
                              {getFilteredCatalog(searchTerm).map(catalogItem => (
                                <button
                                  key={catalogItem.id}
                                  onClick={() => handleChangeItem(item.id, catalogItem)}
                                  className="w-full text-left px-2 py-2 hover:bg-blue-50 text-xs border-b border-slate-100 last:border-0"
                                >
                                  <div className="font-medium text-slate-800">{catalogItem.description}</div>
                                  <div className="text-green-600 font-semibold">R$ {catalogItem.price.toFixed(2)}</div>
                                </button>
                              ))}
                            </div>
                            <button
                              onClick={() => {
                                setEditingItemId(null);
                                setSearchTerm('');
                              }}
                              className="mt-2 text-xs text-slate-600 hover:text-slate-800"
                            >
                              Cancelar
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Summary */}
          <div className="p-4 border-t border-slate-200 bg-slate-50">
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-600">
                Total de <span className="font-semibold text-slate-800">{processedItems.length}</span> itens processados
              </p>
              <p className="text-lg font-bold text-slate-800">
                Valor total: <span className="text-green-700">
                  R$ {processedItems.reduce((sum, item) => 
                    sum + (item.quantity * (item.catalogItem?.price || 0)), 0
                  ).toFixed(2)}
                </span>
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealtimeOrderInput;
