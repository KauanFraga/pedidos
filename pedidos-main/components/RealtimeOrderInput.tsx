import React, { useState, useRef } from 'react';
import { Search, X, Sparkles, Zap } from 'lucide-react';

// Types inline
interface CatalogItem {
  id: string;
  description: string;
  price: number;
}

interface QuoteItem {
  id: string;
  quantity: number;
  originalRequest: string;
  catalogItem: CatalogItem | null;
  isLearned?: boolean;
  conversionLog?: string;
}

interface Props {
  catalog: CatalogItem[];
  onItemsChange: (items: QuoteItem[]) => void;
  customerName: string;
  onCustomerNameChange: (name: string) => void;
}

export function RealtimeOrderInput({ catalog, onItemsChange, customerName, onCustomerNameChange }: Props) {
  const [inputText, setInputText] = useState('');
  const [isProcessingAI, setIsProcessingAI] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleClear = () => {
    setInputText('');
    onItemsChange([]);
  };

  // Busca simples
  const findSimpleMatch = (text: string): CatalogItem | null => {
    const normalized = text.toLowerCase();
    let best: CatalogItem | null = null;
    let score = 0;

    for (const item of catalog) {
      const itemText = item.description.toLowerCase();
      let s = 0;
      
      if (itemText.includes(normalized)) s += 100;
      
      const words = normalized.split(' ');
      for (const word of words) {
        if (itemText.includes(word)) s += 10;
      }

      if (s > score) {
        score = s;
        best = item;
      }
    }

    return score > 20 ? best : null;
  };

  // Parse manual
  const parseManual = () => {
    const lines = inputText.split('\n').filter(l => l.trim());
    const items: QuoteItem[] = [];

    for (const line of lines) {
      const match = line.match(/(\d+)\s+(.+)/);
      const qty = match ? parseInt(match[1]) : 1;
      const desc = match ? match[2] : line;

      items.push({
        id: `${Date.now()}-${Math.random()}`,
        quantity: qty,
        originalRequest: desc,
        catalogItem: findSimpleMatch(desc),
        isLearned: false
      });
    }

    onItemsChange(items);
  };

  // Processa com IA
  const handleAI = async () => {
    setIsProcessingAI(true);
    
    try {
      const catalogStr = catalog.map((item, i) => `${i}|${item.description}|${item.price}`).join('\n');
      
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          messages: [{
            role: "user",
            content: `Você é especialista em materiais elétricos.

REGRAS:
- 1 rolo = 100 metros
- (cor1/cor2) = divide em itens separados
- Match exato de bitola e cor

CATÁLOGO:
${catalogStr}

PEDIDO:
${inputText}

Retorne JSON: {"items": [{"originalRequest": "...", "quantity": 100, "catalogIndex": 5}]}`
          }]
        })
      });

      const data = await response.json();
      let text = data.content?.[0]?.text || '{"items":[]}';
      text = text.replace(/```json\n?/g, '').replace(/```/g, '');
      
      const parsed = JSON.parse(text);
      const results: QuoteItem[] = (parsed.items || []).map((item: any) => ({
        id: `${Date.now()}-${Math.random()}`,
        quantity: item.quantity || 1,
        originalRequest: item.originalRequest,
        catalogItem: catalog[item.catalogIndex] || null,
        conversionLog: item.conversionLog
      }));

      onItemsChange(results);
    } catch (error) {
      alert('Erro na IA');
      console.error(error);
    } finally {
      setIsProcessingAI(false);
    }
  };

  // Auto-parse manual
  React.useEffect(() => {
    if (inputText.trim() && catalog.length > 0) {
      parseManual();
    } else {
      onItemsChange([]);
    }
  }, [inputText, catalog]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200">
      <div className="p-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex justify-between mb-3">
          <div className="flex gap-2">
            <div className="bg-blue-500 p-2 rounded-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold">Digitação Rápida</h3>
              <p className="text-xs text-slate-600">Busca instantânea</p>
            </div>
          </div>

          <button
            onClick={handleAI}
            disabled={!inputText.trim() || isProcessingAI}
            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {isProcessingAI ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                IA
              </>
            )}
          </button>
        </div>

        <input
          type="text"
          value={customerName}
          onChange={(e) => onCustomerNameChange(e.target.value)}
          placeholder="Cliente"
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
      </div>

      <div className="p-4">
        <div className="relative">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Digite os itens:&#10;1 rolo cabo 16mm preto&#10;3 rolo fio 4mm (preto/azul)"
            className="w-full h-64 px-4 py-3 border-2 rounded-lg font-mono text-sm"
          />
          
          {inputText && (
            <button
              onClick={handleClear}
              className="absolute top-2 right-2 p-2 text-slate-400 hover:text-red-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}