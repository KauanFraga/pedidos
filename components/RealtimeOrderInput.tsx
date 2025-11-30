import React, { useState, useEffect, useCallback } from 'react';
import { CatalogItem, QuoteItem } from '../types';
import { Search, Calculator, Plus, Trash2, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { formatCurrency } from '../utils/parser';

interface OrderLine {
  id: string;
  input: string;
  quantity: number;
  catalogItem: CatalogItem | null;
  total: number;
  isSearching: boolean;
}

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
  onCustomerNameChange
}) => {
  const [lines, setLines] = useState<OrderLine[]>([
    { id: '1', input: '', quantity: 0, catalogItem: null, total: 0, isSearching: false }
  ]);

  // Busca inteligente no catálogo (fuzzy search)
  const searchInCatalog = useCallback((searchText: string): CatalogItem | null => {
    if (!searchText.trim() || catalog.length === 0) return null;

    const search = searchText.toLowerCase().trim();
    const searchWords = search.split(/\s+/);

    // 1. Busca exata
    let found = catalog.find(item => 
      item.description.toLowerCase() === search
    );
    if (found) return found;

    // 2. Busca por todas as palavras presentes
    found = catalog.find(item => {
      const desc = item.description.toLowerCase();
      return searchWords.every(word => desc.includes(word));
    });
    if (found) return found;

    // 3. Busca parcial (maioria das palavras)
    found = catalog.find(item => {
      const desc = item.description.toLowerCase();
      const matches = searchWords.filter(word => desc.includes(word)).length;
      return matches >= Math.ceil(searchWords.length * 0.6); // 60% das palavras
    });
    if (found) return found;

    // 4. Busca por sinônimos comuns
    const synonyms: Record<string, string[]> = {
      'cabo': ['fio', 'condutor'],
      'fio': ['cabo', 'condutor'],
      'vermelho': ['vm', 'v', 'red'],
      'azul': ['az', 'blue'],
      'preto': ['pt', 'pr', 'black'],
      'verde': ['vd', 'green'],
      'amarelo': ['am', 'yellow'],
      'branco': ['br', 'white'],
      'conduíte': ['conduite', 'corrugado', 'mangueira'],
      'conector': ['split bolt', 'terminal'],
      'condulete': ['caixa condulete', 'caixa']
    };

    for (const [key, values] of Object.entries(synonyms)) {
      if (search.includes(key)) {
        for (const synonym of values) {
          const modifiedSearch = search.replace(key, synonym);
          found = catalog.find(item => 
            item.description.toLowerCase().includes(modifiedSearch)
          );
          if (found) return found;
        }
      }
    }

    return null;
  }, [catalog]);

  // Extrai quantidade do início do texto
  const extractQuantity = (text: string): number => {
    const match = text.match(/^(\d+(?:[.,]\d+)?)\s*/);
    if (!match) return 0;
    return parseFloat(match[1].replace(',', '.'));
  };

  // Atualiza uma linha quando o usuário digita
  const handleLineChange = useCallback((id: string, value: string) => {
    setLines(prevLines => 
      prevLines.map(line => {
        if (line.id !== id) return line;

        const quantity = extractQuantity(value);
        const searchText = value.replace(/^\d+(?:[.,]\d+)?\s*/, '').trim();
        
        // Marca como buscando
        if (searchText && !line.catalogItem) {
          setTimeout(() => {
            setLines(prev => prev.map(l => 
              l.id === id ? { ...l, isSearching: false } : l
            ));
          }, 300);
        }

        const catalogItem = searchText ? searchInCatalog(searchText) : null;
        const total = catalogItem && quantity > 0 ? quantity * catalogItem.price : 0;

        return {
          ...line,
          input: value,
          quantity,
          catalogItem,
          total,
          isSearching: searchText.length > 2 && !catalogItem
        };
      })
    );
  }, [searchInCatalog]);

  // Adiciona nova linha
  const addLine = () => {
    const newId = Date.now().toString();
    setLines(prev => [
      ...prev,
      { id: newId, input: '', quantity: 0, catalogItem: null, total: 0, isSearching: false }
    ]);
    
    // Foca no novo input após um pequeno delay
    setTimeout(() => {
      const input = document.querySelector(`input[data-line-id="${newId}"]`) as HTMLInputElement;
      input?.focus();
    }, 100);
  };

  // Remove linha
  const removeLine = (id: string) => {
    if (lines.length > 1) {
      setLines(prev => prev.filter(line => line.id !== id));
    } else {
      // Se for a última linha, apenas limpa
      setLines([{ id: '1', input: '', quantity: 0, catalogItem: null, total: 0, isSearching: false }]);
    }
  };

  // Calcula totais
  const grandTotal = lines.reduce((sum, line) => sum + line.total, 0);
  const foundItems = lines.filter(line => line.catalogItem !== null).length;
  const totalItems = lines.filter(line => line.input.trim()).length;

  // Atualiza items quando lines mudam
  useEffect(() => {
    const quoteItems: QuoteItem[] = lines
      .filter(line => line.catalogItem && line.quantity > 0)
      .map(line => ({
        id: line.id,
        quantity: line.quantity,
        originalRequest: line.input,
        catalogItem: line.catalogItem!
      }));

    onItemsChange(quoteItems);
  }, [lines, onItemsChange]);

  // Atalho de teclado: Enter para adicionar nova linha
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, lineId: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const currentIndex = lines.findIndex(l => l.id === lineId);
      if (currentIndex === lines.length - 1) {
        addLine();
      } else {
        // Foca na próxima linha
        const nextLine = lines[currentIndex + 1];
        const input = document.querySelector(`input[data-line-id="${nextLine.id}"]`) as HTMLInputElement;
        input?.focus();
      }
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Card */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-yellow-400 p-3 rounded-lg">
              <Calculator className="w-6 h-6 text-slate-800" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Pedido do Cliente</h2>
              <p className="text-sm text-slate-500">Digite os itens em tempo real</p>
            </div>
          </div>
          
          <div className="text-right">
            <p className="text-xs text-slate-500 font-semibold uppercase">Valor Total</p>
            <p className="text-3xl font-bold text-green-600">
              {formatCurrency(grandTotal)}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {foundItems} de {totalItems} encontrados
            </p>
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-slate-600 block mb-2">
            Cliente
          </label>
          <input
            type="text"
            value={customerName}
            onChange={(e) => onCustomerNameChange(e.target.value)}
            placeholder="Nome do cliente..."
            className="w-full p-3 border-2 border-slate-200 rounded-lg focus:border-yellow-400 focus:ring-2 focus:ring-yellow-200 outline-none transition-all"
          />
        </div>
      </div>

      {/* Tabela de Items */}
      <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 overflow-hidden">
        
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-3">
          <div className="grid grid-cols-12 gap-3 text-white font-semibold text-xs uppercase">
            <div className="col-span-1 text-center">Qtd</div>
            <div className="col-span-6">Descrição</div>
            <div className="col-span-2 text-center">Preço Unit.</div>
            <div className="col-span-2 text-right">Total</div>
            <div className="col-span-1"></div>
          </div>
        </div>

        {/* Linhas */}
        <div className="divide-y divide-slate-100">
          {lines.map((line, index) => {
            const hasInput = line.input.trim().length > 0;
            const showError = hasInput && !line.catalogItem && !line.isSearching;
            const showSuccess = line.catalogItem !== null;

            return (
              <div 
                key={line.id}
                className={`px-4 py-3 transition-colors ${
                  showError ? 'bg-red-50' : showSuccess ? 'bg-green-50' : 'hover:bg-slate-50'
                }`}
              >
                <div className="grid grid-cols-12 gap-3 items-center">
                  
                  {/* Quantidade */}
                  <div className="col-span-1 text-center">
                    <div className={`text-xl font-bold ${
                      line.quantity > 0 ? 'text-slate-800' : 'text-slate-300'
                    }`}>
                      {line.quantity > 0 ? line.quantity : '-'}
                    </div>
                  </div>

                  {/* Input */}
                  <div className="col-span-6">
                    <div className="relative">
                      <input
                        type="text"
                        data-line-id={line.id}
                        value={line.input}
                        onChange={(e) => handleLineChange(line.id, e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, line.id)}
                        placeholder={`${index + 1}. Digite: qtd + descrição (ex: 200 fio 1.5mm vermelho)`}
                        className={`w-full p-2.5 pr-10 border-2 rounded-lg outline-none transition-all text-sm ${
                          !hasInput 
                            ? 'border-slate-200 focus:border-blue-400' 
                            : showSuccess
                              ? 'border-green-400 bg-green-50'
                              : showError
                                ? 'border-red-400 bg-red-50'
                                : 'border-yellow-400 bg-yellow-50'
                        }`}
                      />
                      {line.isSearching && (
                        <Loader className="absolute right-3 top-3 w-4 h-4 text-yellow-500 animate-spin" />
                      )}
                      {showSuccess && (
                        <CheckCircle className="absolute right-3 top-3 w-4 h-4 text-green-500" />
                      )}
                      {showError && (
                        <AlertCircle className="absolute right-3 top-3 w-4 h-4 text-red-500" />
                      )}
                    </div>
                    {showSuccess && (
                      <p className="text-xs text-green-600 font-medium mt-1 uppercase truncate">
                        ✓ {line.catalogItem!.description}
                      </p>
                    )}
                    {showError && (
                      <p className="text-xs text-red-600 font-medium mt-1">
                        ✗ Produto não encontrado no catálogo
                      </p>
                    )}
                  </div>

                  {/* Preço Unitário */}
                  <div className="col-span-2 text-center">
                    <span className="text-sm font-bold text-slate-700">
                      {line.catalogItem ? formatCurrency(line.catalogItem.price) : '-'}
                    </span>
                  </div>

                  {/* Total */}
                  <div className="col-span-2 text-right">
                    <span className={`text-lg font-bold ${
                      line.total > 0 ? 'text-green-600' : 'text-slate-300'
                    }`}>
                      {line.total > 0 ? formatCurrency(line.total) : '-'}
                    </span>
                  </div>

                  {/* Ações */}
                  <div className="col-span-1 flex justify-end">
                    <button
                      onClick={() => removeLine(line.id)}
                      className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition-colors"
                      title="Remover linha"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Botão Adicionar */}
        <div className="px-4 py-3 bg-slate-50 border-t-2 border-slate-200">
          <button
            onClick={addLine}
            className="w-full py-2.5 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 text-slate-600 hover:text-blue-600 font-semibold text-sm"
          >
            <Plus className="w-4 h-4" />
            Adicionar Item (ou pressione Enter)
          </button>
        </div>

        {/* Footer com Total */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-800 px-4 py-4">
          <div className="flex justify-between items-center text-white">
            <div>
              <p className="text-xs opacity-80">Itens no Pedido</p>
              <p className="text-xl font-bold">{totalItems}</p>
            </div>
            <div className="text-right">
              <p className="text-xs opacity-80 uppercase">Valor Total</p>
              <p className="text-2xl font-bold text-yellow-400">
                {formatCurrency(grandTotal)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Dicas */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
        <p className="text-sm font-semibold text-blue-800 mb-2 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          💡 Dicas de Uso
        </p>
        <ul className="text-sm text-blue-700 space-y-1 ml-6">
          <li>• Digite quantidade + descrição: <code className="bg-white px-2 py-0.5 rounded text-xs">200 fio 1.5mm vermelho</code></li>
          <li>• Pressione <kbd className="bg-white px-2 py-0.5 rounded text-xs border">Enter</kbd> para adicionar nova linha</li>
          <li>• <span className="text-green-600 font-semibold">Verde</span> = Encontrado | <span className="text-red-600 font-semibold">Vermelho</span> = Não encontrado</li>
          <li>• Os valores são calculados automaticamente em tempo real</li>
        </ul>
      </div>
    </div>
  );
};
