import React, { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, FileText, Download, Send, Save, PenTool, FileSpreadsheet, CheckCircle2, RefreshCw, ChevronDown, PlusCircle } from 'lucide-react';
import { CatalogItem, QuoteItem, HistoryStatus } from '../types';
import { ExcelImporter } from './ExcelImporter';
import { generateQuotePDF } from '../utils/QuotePDFGenerator';
import { exportQuoteToExcel } from '../utils/QuoteExcelExporter';
import { saveQuoteToHistory } from '../services/historyService';

// ✅ Parser inteligente de lista de itens
const parseItemsList = (text: string): Array<{ quantity: number; description: string }> => {
  const lines = text.split('\n').filter(line => line.trim());
  const items: Array<{ quantity: number; description: string }> = [];

  lines.forEach(line => {
    const cleaned = line.trim();
    if (!cleaned) return;

    let quantity = 1;
    let description = cleaned;

    // Padrão 1: "10 item nome"
    const pattern1 = /^(\d+)\s+(.+)$/;
    const match1 = cleaned.match(pattern1);
    if (match1) {
      quantity = parseInt(match1[1]);
      description = match1[2];
    }
    
    // Padrão 2: "10x item nome"
    const pattern2 = /^(\d+)x\s*(.+)$/i;
    const match2 = cleaned.match(pattern2);
    if (match2) {
      quantity = parseInt(match2[1]);
      description = match2[2];
    }
    
    // Padrão 3: "item nome - 10 un"
    const pattern3 = /^(.+?)\s*-\s*(\d+)\s*(pçs?|un|unid|peças?)?$/i;
    const match3 = cleaned.match(pattern3);
    if (match3) {
      quantity = parseInt(match3[2]);
      description = match3[1];
    }
    
    // Padrão 4: "item nome (10 un)"
    const pattern4 = /^(.+?)\s*\((\d+)\s*(pçs?|un|unid|peças?)?\)$/i;
    const match4 = cleaned.match(pattern4);
    if (match4) {
      quantity = parseInt(match4[2]);
      description = match4[1];
    }
    
    // Padrão 5: "Cabo 500m"
    const pattern5 = /^(.+?)\s+(\d+)(m|mt|metros?|rolo|bob)$/i;
    const match5 = cleaned.match(pattern5);
    if (match5) {
      quantity = parseInt(match5[2]);
      description = `${match5[1]} ${match5[3]}`;
    }

    description = description
      .replace(/[-–—]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    // Proteção contra NaN ou quantidades inválidas
    const safeQty = isNaN(quantity) || quantity <= 0 ? 1 : quantity;

    items.push({
      quantity: safeQty,
      description: description
    });
  });

  return items;
};

// ✅ Modal para colar lista de itens COM AUTOCOMPLETE POR LINHA
interface PasteListModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: Array<{ quantity: number; description: string; unitPrice: number }>) => void;
  catalog: CatalogItem[];
}

const PasteListModal: React.FC<PasteListModalProps> = ({ isOpen, onClose, onImport, catalog }) => {
  const [listText, setListText] = useState('');
  const [parsedItems, setParsedItems] = useState<Array<{ 
    id: string;
    quantity: number; 
    description: string; 
    unitPrice: number;
    showSuggestions?: boolean;
    filteredCatalog?: CatalogItem[];
  }>>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleParse = () => {
    const items = parseItemsList(listText);
    
    const itemsWithIds = items.map(item => {
      const searchTerm = item.description.toLowerCase();
      const catalogMatch = catalog.find(cat => 
        cat.description.toLowerCase().includes(searchTerm) ||
        searchTerm.includes(cat.description.toLowerCase().split(' ').slice(0, 2).join(' ').toLowerCase())
      );

      return {
        id: crypto.randomUUID(),
        quantity: item.quantity,
        description: item.description,
        unitPrice: catalogMatch?.price || 0,
        showSuggestions: false,
        filteredCatalog: []
      };
    });

    setParsedItems(itemsWithIds);
    setShowPreview(true);
  };

  const handleConfirm = () => {
    onImport(parsedItems);
    setListText('');
    setParsedItems([]);
    setShowPreview(false);
    onClose();
  };

  const updateItemPrice = (id: string, price: number) => {
    setParsedItems(prev => prev.map(item => 
      item.id === id ? { ...item, unitPrice: price } : item
    ));
  };

  const updateItemQuantity = (id: string, qty: number) => {
    setParsedItems(prev => prev.map(item => 
      item.id === id ? { ...item, quantity: qty } : item
    ));
  };

  const updateItemDescription = (id: string, desc: string) => {
    setParsedItems(prev => prev.map(item => {
      if (item.id === id) {
        if (desc.length >= 2) {
          const searchTerm = desc.toLowerCase();
          const matches = catalog.filter(cat => 
            cat.description.toLowerCase().includes(searchTerm)
          ).slice(0, 10);

          return {
            ...item,
            description: desc,
            showSuggestions: matches.length > 0,
            filteredCatalog: matches
          };
        }
        
        return {
          ...item,
          description: desc,
          showSuggestions: false,
          filteredCatalog: []
        };
      }
      return item;
    }));
  };

  const selectCatalogItem = (itemId: string, catalogItem: CatalogItem) => {
    setParsedItems(prev => prev.map(item => {
      if (item.id === itemId) {
        return {
          ...item,
          description: catalogItem.description,
          unitPrice: catalogItem.price,
          showSuggestions: false,
          filteredCatalog: []
        };
      }
      return item;
    }));
  };

  const removeItem = (id: string) => {
    setParsedItems(prev => prev.filter(item => item.id !== id));
  };

  const addEmptyLine = () => {
    const newItem = {
      id: crypto.randomUUID(),
      quantity: 1,
      description: '',
      unitPrice: 0,
      showSuggestions: false,
      filteredCatalog: []
    };
    setParsedItems(prev => [...prev, newItem]);
  };

  const addLineAfter = (afterId: string) => {
    const newItem = {
      id: crypto.randomUUID(),
      quantity: 1,
      description: '',
      unitPrice: 0,
      showSuggestions: false,
      filteredCatalog: []
    };
    
    setParsedItems(prev => {
      const index = prev.findIndex(item => item.id === afterId);
      if (index === -1) return [...prev, newItem];
      
      const newArray = [...prev];
      newArray.splice(index + 1, 0, newItem);
      return newArray;
    });
  };

  const formatCurrency = (value: number): string => {
    return (value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-7 h-7" />
            <div>
              <h3 className="text-2xl font-bold">📋 Colar Lista de Itens</h3>
              <p className="text-sm text-blue-100">Cole a lista do cliente e ajuste as descrições para buscar preços</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-blue-600 p-2 rounded-lg transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          
          {!showPreview ? (
            <div className="space-y-4">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h4 className="font-bold text-blue-900 mb-2">📝 Como usar:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✅ <strong>500 MTS CABO</strong> → Quantidade no início</li>
                  <li>✅ <strong>400 mt 1,5 preto ou vermelho</strong> → Quantidade no início</li>
                  <li>✅ <strong>interruptor simples - 3</strong> → Quantidade no final</li>
                  <li>✅ <strong>5x cabo flexível</strong> → Com "x"</li>
                  <li>✅ <strong>caixa de passagem (3 un)</strong> → Entre parênteses</li>
                </ul>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-2">
                  Cole a lista do cliente (uma linha por item):
                </label>
                <textarea
                  value={listText}
                  onChange={(e) => setListText(e.target.value)}
                  className="w-full h-64 px-4 py-3 border-2 border-slate-300 rounded-xl text-sm font-mono resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Exemplo:&#10;500 MTS CABO&#10;400 mt 1,5 preto ou vermelho&#10;400 mt 1,5 azul&#10;500 mt 1,5 branco&#10;400 mt 1,5 amarelo"
                />
                <p className="text-xs text-slate-500 mt-2">
                  💡 Dica: Cole diretamente do WhatsApp ou mensagem do cliente
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleParse}
                  disabled={!listText.trim()}
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Interpretar Lista
                </button>
                <button
                  onClick={onClose}
                  className="px-6 bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <h4 className="font-bold text-green-900 mb-1">
                  ✅ {parsedItems.length} {parsedItems.length === 1 ? 'item encontrado' : 'itens encontrados'}
                </h4>
                <p className="text-sm text-green-700">
                  🔍 <strong>Digite na descrição</strong> para buscar no catálogo e preencher preço automaticamente
                </p>
              </div>

              {/* ✅ TABELA COM AUTOCOMPLETE FLUTUANTE */}
              <div className="border border-slate-200 rounded-xl overflow-visible">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-100 border-b border-slate-200">
                      <tr>
                        <th className="p-3 text-left font-bold text-slate-700 w-24">QTDE</th>
                        <th className="p-3 text-left font-bold text-slate-700">DESCRIÇÃO (digite para buscar)</th>
                        <th className="p-3 text-right font-bold text-slate-700 w-32">VALOR UN.</th>
                        <th className="p-3 text-center font-bold text-slate-700 w-24">AÇÕES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {parsedItems.map((item, index) => (
                        <PasteListRowWithFloatingDropdown
                          key={item.id}
                          item={item}
                          catalog={catalog}
                          onUpdateDescription={updateItemDescription}
                          onUpdatePrice={updateItemPrice}
                          onUpdateQuantity={updateItemQuantity}
                          onSelectCatalog={selectCatalogItem}
                          onRemove={removeItem}
                          onAddLineAfter={addLineAfter}
                          formatCurrency={formatCurrency}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <button
                type="button"
                onClick={addEmptyLine}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 border-2 border-dashed border-slate-300"
              >
                <Plus className="w-5 h-5" />
                Adicionar Linha no Final
              </button>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPreview(false)}
                  className="px-6 bg-slate-200 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-300 transition-colors"
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={parsedItems.length === 0}
                  className="flex-1 bg-green-600 text-white py-3 rounded-xl font-bold hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Adicionar {parsedItems.length} {parsedItems.length === 1 ? 'Item' : 'Itens'} ao Orçamento
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ✅ NOVO COMPONENTE - Linha com Dropdown Flutuante (Fixed Position)
interface PasteListRowProps {
  item: any;
  catalog: CatalogItem[];
  onUpdateDescription: (id: string, desc: string) => void;
  onUpdatePrice: (id: string, price: number) => void;
  onUpdateQuantity: (id: string, qty: number) => void;
  onSelectCatalog: (itemId: string, catalogItem: CatalogItem) => void;
  onRemove: (id: string) => void;
  onAddLineAfter: (id: string) => void;
  formatCurrency: (value: number) => string;
}

const PasteListRowWithFloatingDropdown: React.FC<PasteListRowProps> = ({
  item,
  catalog,
  onUpdateDescription,
  onUpdatePrice,
  onUpdateQuantity,
  onSelectCatalog,
  onRemove,
  onAddLineAfter,
  formatCurrency
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  useEffect(() => {
    if (item.showSuggestions && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    } else {
      setDropdownPosition(null);
    }
  }, [item.showSuggestions]);

  return (
    <>
      <tr className="hover:bg-slate-50">
        <td className="p-3">
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => onUpdateQuantity(item.id, parseInt(e.target.value) || 1)}
            className="w-20 px-2 py-2 border border-slate-300 rounded text-center font-semibold"
          />
        </td>
        <td className="p-3">
          <input
            ref={inputRef}
            type="text"
            value={item.description}
            onChange={(e) => onUpdateDescription(item.id, e.target.value)}
            onFocus={(e) => {
              if (e.target.value.length >= 2) {
                onUpdateDescription(item.id, e.target.value);
              }
            }}
            className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
            placeholder="Digite para buscar no catálogo..."
          />
        </td>
        <td className="p-3 text-right">
          <input
            type="number"
            step="0.01"
            min="0"
            value={item.unitPrice}
            onChange={(e) => onUpdatePrice(item.id, parseFloat(e.target.value) || 0)}
            className="w-28 px-3 py-2 border border-slate-300 rounded-lg text-right font-semibold"
            placeholder="0,00"
          />
        </td>
        <td className="p-3">
          <div className="flex items-center justify-center gap-1">
            <button
              type="button"
              onClick={() => onAddLineAfter(item.id)}
              className="text-green-600 hover:bg-green-50 p-2 rounded-lg transition-colors"
              title="Adicionar linha abaixo"
            >
              <Plus className="w-5 h-5" />
            </button>
            
            <button
              type="button"
              onClick={() => onRemove(item.id)}
              className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
              title="Remover linha"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </td>
      </tr>

      {/* ✅ DROPDOWN FLUTUANTE - POSITION FIXED */}
      {item.showSuggestions && item.filteredCatalog && item.filteredCatalog.length > 0 && dropdownPosition && (
        <div 
          className="fixed bg-white border-2 border-green-400 rounded-xl shadow-2xl max-h-96 overflow-y-auto"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            width: `${dropdownPosition.width}px`,
            zIndex: 9999
          }}
        >
          <div className="p-3 bg-green-50 border-b-2 border-green-200 sticky top-0 z-10">
            <p className="text-sm font-bold text-green-800">
              ✨ {item.filteredCatalog.length} produto(s) encontrado(s)
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {item.filteredCatalog.map((cat: CatalogItem) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelectCatalog(item.id, cat)}
                className="w-full text-left px-4 py-3 hover:bg-green-50 border-b border-slate-100 transition-colors"
              >
                <div className="flex justify-between items-center gap-3">
                  <span className="text-sm text-slate-900 flex-1 font-medium">{cat.description}</span>
                  <span className="text-base font-bold text-green-600 whitespace-nowrap">{formatCurrency(cat.price)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
};

// ✅ FUNÇÃO CORRIGIDA FINAL: Cria um "Item de Catálogo Virtual" para garantir que o preço apareça
const convertToQuoteItems = (professionalItems: any[]): QuoteItem[] => {
  return professionalItems.map(item => {
    // Garante números válidos
    const safeQuantity = Number(item.quantity) || 1;
    const safePrice = Number(item.unitPrice) || 0;

    return {
      id: item.id || crypto.randomUUID(),
      quantity: safeQuantity,
      originalRequest: item.description || '',
      unitPrice: safePrice,
      total: safeQuantity * safePrice,
      
      // 🔥 A MÁGICA ACONTECE AQUI:
      // Se o item tiver um ID de catálogo real, usamos ele.
      // Se NÃO tiver (item manual), criamos um objeto "falso" com os dados manuais.
      // Isso obriga o HistoryModal a exibir o preço e descrição corretos.
      catalogItem: item.catalogId 
        ? {
            id: item.catalogId,
            description: item.description,
            price: safePrice
          } 
        : {
            id: 'manual-item',      // ID genérico para itens manuais
            description: item.description, // Usa a descrição que você digitou
            price: safePrice,       // Usa o preço que você digitou
            category: 'Manual',
            unit: 'un'
          }
    };
  });
};

interface ProfessionalQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: CatalogItem[];
  // ✅ FIX: Prop para atualizar o histórico sem F5
  onQuoteSaved?: () => void;
}

interface QuoteItem {
  id: string;
  quantity: number;
  description: string;
  unitPrice: number;
  total: number;
  catalogId?: string;
}

interface QuoteData {
  quoteNumber: string;
  date: string;
  time: string;
  seller: string;
  customerName: string;
  customerDoc: string;
  customerAddress: string;
  customerPhone: string;
  items: QuoteItem[];
  discountType: 'percent' | 'value';
  discountAmount: number;
  paymentMethod: string;
  observations: string;
  customerSignature: string;
}

interface QuoteTab {
  id: string;
  label: string;
  data: QuoteData;
  lastModified: string;
}

const createEmptyTab = (): QuoteTab => ({
  id: crypto.randomUUID(),
  label: 'Novo Orçamento',
  lastModified: new Date().toISOString(),
  data: {
    quoteNumber: generateQuoteNumber(),
    date: new Date().toLocaleDateString('pt-BR'),
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    seller: 'KAUAN',
    customerName: '',
    customerDoc: '',
    customerAddress: '',
    customerPhone: '',
    items: [],
    discountType: 'percent',
    discountAmount: 0,
    paymentMethod: '',
    observations: '',
    customerSignature: ''
  }
});

function generateQuoteNumber(): string {
  const stored = localStorage.getItem('last_quote_number');
  const lastNumber = stored ? parseInt(stored) : 576;
  const newNumber = lastNumber + 1;
  localStorage.setItem('last_quote_number', newNumber.toString());
  return newNumber.toString();
}

const TABS_STORAGE_KEY = 'professional_quote_tabs';
const MAX_TABS = 5;

export const ProfessionalQuoteModal: React.FC<ProfessionalQuoteModalProps> = ({
  isOpen,
  onClose,
  catalog,
  onQuoteSaved
}) => {
  const [tabs, setTabs] = useState<QuoteTab[]>([createEmptyTab()]);
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0]?.id || '');
  
  const [newItem, setNewItem] = useState({
    quantity: 1,
    description: '',
    unitPrice: 0
  });

  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCatalog, setFilteredCatalog] = useState<CatalogItem[]>([]);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [isPasteListOpen, setIsPasteListOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedTabs = localStorage.getItem(TABS_STORAGE_KEY);
      if (savedTabs) {
        try {
          const parsed = JSON.parse(savedTabs);
          if (parsed.length > 0) {
            setTabs(parsed);
            setActiveTabId(parsed[0].id);
          }
        } catch (e) {
          console.error('Erro ao carregar abas salvas:', e);
        }
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (tabs.length > 0) {
      localStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
    }
  }, [tabs]);

  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const quoteData = activeTab?.data || createEmptyTab().data;

  const updateActiveTabData = (updates: Partial<QuoteData>) => {
    setTabs(prev => prev.map(tab => {
      if (tab.id === activeTabId) {
        const updatedData = { ...tab.data, ...updates };
        const newLabel = updatedData.customerName.trim() 
          ? updatedData.customerName.substring(0, 20) 
          : 'Novo Orçamento';
        
        return {
          ...tab,
          data: updatedData,
          label: newLabel,
          lastModified: new Date().toISOString()
        };
      }
      return tab;
    }));
  };

  const handleAddTab = () => {
    if (tabs.length >= MAX_TABS) {
      alert(`⚠️ Você atingiu o limite de ${MAX_TABS} orçamentos simultâneos.\n\nFinalize ou feche alguns para abrir novos.`);
      return;
    }

    const newTab = createEmptyTab();
    setTabs(prev => [...prev, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleCloseTab = (tabId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (tabs.length === 1) {
      alert('⚠️ Não é possível fechar a última aba.\n\nUse o botão "Limpar" se quiser começar novo orçamento.');
      return;
    }

    const confirmClose = window.confirm('⚠️ Deseja fechar esta aba?\n\nTodos os dados não salvos serão perdidos.');
    if (!confirmClose) return;

    setTabs(prev => {
      const filtered = prev.filter(tab => tab.id !== tabId);
      if (tabId === activeTabId && filtered.length > 0) {
        setActiveTabId(filtered[0].id);
      }
      return filtered;
    });
  };

  useEffect(() => {
    if (newItem.description.length >= 3) {
      const searchTerm = newItem.description.toLowerCase();
      const matches = catalog.filter(item => 
        item.description.toLowerCase().includes(searchTerm)
      ).slice(0, 10);

      setFilteredCatalog(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
      setFilteredCatalog([]);
    }
  }, [newItem.description, catalog]);

  const handleSelectCatalogItem = (item: CatalogItem) => {
    setNewItem(prev => ({
      ...prev,
      description: item.description,
      unitPrice: item.price
    }));
    setShowSuggestions(false);
  };

  const calculateSubtotal = (): number => {
    return quoteData.items.reduce((sum, item) => sum + item.total, 0);
  };

  const calculateDiscount = (): number => {
    const subtotal = calculateSubtotal();
    if (quoteData.discountType === 'percent') {
      return subtotal * (quoteData.discountAmount / 100);
    }
    return quoteData.discountAmount;
  };

  const calculateTotal = (): number => {
    return calculateSubtotal() - calculateDiscount();
  };

  const handleAddItem = () => {
    if (!newItem.description.trim() || newItem.unitPrice <= 0) {
      alert('Preencha a descrição e o valor unitário');
      return;
    }

    const item: QuoteItem = {
      id: crypto.randomUUID(),
      quantity: newItem.quantity,
      description: newItem.description,
      unitPrice: newItem.unitPrice,
      total: newItem.quantity * newItem.unitPrice
    };

    updateActiveTabData({
      items: [...quoteData.items, item]
    });

    setNewItem({ quantity: 1, description: '', unitPrice: 0 });
  };

  const handleImportFromExcel = (importedItems: Array<{ quantity: number; description: string; unitPrice: number }>) => {
    const newItems: QuoteItem[] = importedItems.map(item => ({
      id: crypto.randomUUID(),
      quantity: item.quantity,
      description: item.description,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice
    }));

    updateActiveTabData({
      items: [...quoteData.items, ...newItems]
    });

    alert(`✅ ${newItems.length} itens importados com sucesso!`);
  };

  const handleImportFromPastedList = (importedItems: Array<{ quantity: number; description: string; unitPrice: number }>) => {
    const newItems: QuoteItem[] = importedItems.map(item => ({
      id: crypto.randomUUID(),
      quantity: item.quantity,
      description: item.description,
      unitPrice: item.unitPrice,
      total: item.quantity * item.unitPrice
    }));

    updateActiveTabData({
      items: [...quoteData.items, ...newItems]
    });

    alert(`✅ ${newItems.length} ${newItems.length === 1 ? 'item adicionado' : 'itens adicionados'} com sucesso!`);
  };

  const handleRemoveItem = (id: string) => {
    updateActiveTabData({
      items: quoteData.items.filter(item => item.id !== id)
    });
  };

  const handleItemChange = (id: string, field: keyof QuoteItem, value: any) => {
    const updatedItems = quoteData.items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitPrice') {
          updated.total = updated.quantity * updated.unitPrice;
        }
        return updated;
      }
      return item;
    });

    updateActiveTabData({ items: updatedItems });
  };

  const handleSaveDraft = () => {
    const drafts = JSON.parse(localStorage.getItem('quote_drafts') || '[]');
    const draft = {
      ...quoteData,
      savedAt: new Date().toISOString()
    };
    drafts.push(draft);
    localStorage.setItem('quote_drafts', JSON.stringify(drafts));
    alert('✅ Orçamento salvo como rascunho!');
  };

  // ✅ FIX: Função Corrigida para Salvar sem NaN e atualizar Pai
  const handleSaveQuoteWithStatus = (status: HistoryStatus) => {
    // 1. Validações básicas (impede salvar vazio)
    if (quoteData.items.length === 0) {
      alert('⚠️ Adicione pelo menos um item antes de salvar');
      return;
    }

    if (!quoteData.customerName.trim()) {
      alert('⚠️ Preencha o nome do cliente');
      return;
    }

    try {
      // 2. SANITIZAÇÃO (A "Vacina" contra NaN e valores zerados)
      // Aqui garantimos que tudo vire número antes de ir pro banco
      const itemsWithValues = quoteData.items.map(item => ({
        ...item,
        quantity: Number(item.quantity) || 1, // Se for erro/texto, vira 1
        unitPrice: Number(item.unitPrice) || 0, // Se for erro/texto, vira 0
        total: (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0)
      }));

      // Prepara os dados limpos
      const completeQuoteData = {
        ...quoteData,
        items: itemsWithValues
      };

      // 3. Converter para o formato do Histórico
      const quoteItems = convertToQuoteItems(itemsWithValues);

      const originalInputText = itemsWithValues.map(item => 
        `${item.quantity} ${item.description}`
      ).join('\n');

      // 4. Salvar no Serviço (Banco de Dados / LocalStorage)
      const savedQuote = saveQuoteToHistory(
        quoteData.customerName,
        quoteItems,
        originalInputText,
        status
      );

      // 5. Salvar o Histórico Detalhado (Para poder editar depois)
      const quotesHistory = JSON.parse(localStorage.getItem('quotes_history') || '[]');
      const existingIndex = quotesHistory.findIndex((q: any) => q.id === savedQuote.id);
      
      const enrichedQuote = {
        ...savedQuote,
        fullData: {
          ...completeQuoteData,
          subtotal: calculateSubtotal(),
          total: calculateTotal(),
          discount: calculateDiscount()
        },
        savedAt: new Date().toISOString()
      };

      if (existingIndex >= 0) {
          quotesHistory[existingIndex] = enrichedQuote;
      } else {
          quotesHistory.push(enrichedQuote);
      }
      
      localStorage.setItem('quotes_history', JSON.stringify(quotesHistory));

      // 6. Feedback Visual para você
      const statusMessages = {
        'RASCUNHO': '📝 Salvo como RASCUNHO',
        'PENDENTE': '🟡 Salvo como PENDENTE',
        'APROVADO': '✅ Salvo como APROVADO'
      };

      // 7. ✅ AQUI ESTÁ A CORREÇÃO DO F5:
      // Chamamos a função que o App.tsx passou para atualizar a lista
      if (onQuoteSaved) {
        onQuoteSaved(); 
      }

      alert(`${statusMessages[status]}\n\nCliente: ${quoteData.customerName}\nTotal: R$ ${calculateTotal().toFixed(2)}`);
      
      setShowStatusDropdown(false);
      handleClearCurrentTab();

    } catch (error) {
      console.error('Erro ao salvar orçamento:', error);
      alert('❌ Erro ao salvar orçamento. Verifique os dados e tente novamente.');
    }
  };

  const handleClearCurrentTab = () => {
    const newData = createEmptyTab().data;
    updateActiveTabData(newData);
  };

  const handleClearForm = () => {
    const confirmClear = window.confirm('⚠️ Tem certeza que deseja limpar todos os dados desta aba?\n\nEsta ação não pode ser desfeita.');
    
    if (!confirmClear) return;
    
    handleClearCurrentTab();
    alert('✅ Aba limpa! Pronto para novo orçamento.');
  };

  const handleGeneratePDF = () => {
    if (quoteData.items.length === 0) {
      alert('⚠️ Adicione pelo menos um item antes de gerar o PDF');
      return;
    }

    try {
      const fileName = generateQuotePDF(quoteData);
      alert(`✅ PDF gerado com sucesso!\n\nArquivo: ${fileName}`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('❌ Erro ao gerar PDF. Tente novamente.');
    }
  };

  const handleExportExcel = () => {
    if (quoteData.items.length === 0) {
      alert('⚠️ Adicione pelo menos um item antes de exportar');
      return;
    }

    try {
      const fileName = exportQuoteToExcel(quoteData);
      alert(`✅ Excel exportado com sucesso!\n\nArquivo: ${fileName}`);
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      alert('❌ Erro ao exportar Excel. Tente novamente.');
    }
  };

  const handleSendWhatsApp = () => {
    if (quoteData.items.length === 0) {
      alert('⚠️ Adicione pelo menos um item antes de enviar');
      return;
    }

    if (!quoteData.customerPhone) {
      alert('⚠️ Preencha o telefone do cliente antes de enviar');
      return;
    }

    const phone = quoteData.customerPhone.replace(/\D/g, '');
    const subtotal = calculateSubtotal();
    const total = calculateTotal();
    
    let message = `*ELÉTRICA PADRÃO*\n`;
    message += `*Orçamento Nº:* ${quoteData.quoteNumber}\n`;
    message += `*Data:* ${quoteData.date} ${quoteData.time}\n\n`;
    
    message += `*Cliente:* ${quoteData.customerName}\n`;
    message += `*Vendedor:* ${quoteData.seller}\n\n`;
    
    message += `*ITENS DO ORÇAMENTO:*\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    
    quoteData.items.forEach((item, index) => {
      message += `${index + 1}. *${item.quantity}x* ${item.description}\n`;
      message += `   R$ ${item.unitPrice.toFixed(2)} = *R$ ${item.total.toFixed(2)}*\n\n`;
    });
    
    message += `━━━━━━━━━━━━━━━━━━━━\n`;
    message += `Subtotal: R$ ${subtotal.toFixed(2)}\n`;
    
    if (quoteData.discountAmount > 0) {
      message += `Desconto: -R$ ${quoteData.discountAmount.toFixed(2)}\n`;
    }
    
    message += `*TOTAL: R$ ${total.toFixed(2)}*\n\n`;
    
    if (quoteData.paymentMethod) {
      message += `*Forma de Pagamento:*\n${quoteData.paymentMethod}\n\n`;
    }
    
    if (quoteData.observations) {
      message += `*Observações:*\n${quoteData.observations}\n\n`;
    }
    
    message += `_Validade: 7 dias_\n\n`;
    message += `📞 *Contato:* 35-3421 3654 / 35-98895 7050`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/55${phone}?text=${encodedMessage}`;
    window.open(whatsappURL, '_blank');
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl my-8">
        
        {/* Header com Abas */}
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 rounded-t-2xl sticky top-0 z-10">
          
          {/* Barra de Abas */}
          <div className="flex items-center gap-2 px-4 pt-4 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTabId(tab.id)}
                className={`
                  flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold text-sm transition-all whitespace-nowrap
                  ${activeTabId === tab.id 
                    ? 'bg-white text-slate-900 shadow-lg' 
                    : 'bg-yellow-600/50 text-slate-700 hover:bg-yellow-600/70'
                  }
                `}
              >
                <span className="max-w-[150px] truncate">{tab.label}</span>
                {tabs.length > 1 && (
                  <X 
                    className="w-4 h-4 hover:bg-red-500 hover:text-white rounded transition-colors" 
                    onClick={(e) => handleCloseTab(tab.id, e)}
                  />
                )}
              </button>
            ))}
            
            {tabs.length < MAX_TABS && (
              <button
                onClick={handleAddTab}
                className="flex items-center gap-2 px-4 py-2 rounded-t-lg font-semibold text-sm bg-green-600 text-white hover:bg-green-700 transition-colors"
                title="Nova Aba (máx 5)"
              >
                <PlusCircle className="w-4 h-4" />
                Nova Aba
              </button>
            )}
          </div>

          {/* Título e Fechar */}
          <div className="p-6 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-7 h-7" />
              <div>
                <h2 className="text-2xl font-bold">Orçamento Profissional</h2>
                <p className="text-sm text-slate-700">Nº {quoteData.quoteNumber} - {quoteData.date} {quoteData.time}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-slate-900 hover:bg-yellow-600 p-2 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[calc(100vh-200px)] overflow-y-auto">
          
          {/* Cabeçalho da Empresa */}
          <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-6">
            <div className="flex items-center gap-4">
              <div className="bg-yellow-500 p-3 rounded-lg">
                <FileText className="w-8 h-8 text-slate-900" />
              </div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900">ELÉTRICA PADRÃO</h3>
                <p className="text-sm text-slate-600">AV. PERIMETRAL, 2095 - CENTRO - POUSO ALEGRE-MG</p>
                <p className="text-sm text-slate-600">TEL: 35-3421 3654 / 4102 0262 / WhatsApp 35-98895 7050</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-slate-300">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">Nº ORÇAMENTO</label>
                <input
                  type="text"
                  value={quoteData.quoteNumber}
                  onChange={(e) => updateActiveTabData({ quoteNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">VENDEDOR</label>
                <input
                  type="text"
                  value={quoteData.seller}
                  onChange={(e) => updateActiveTabData({ seller: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
            </div>
          </div>

          {/* Dados do Cliente */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-6">
            <h3 className="text-lg font-bold text-blue-900 mb-4">👤 Dados do Cliente</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-blue-900 block mb-1">NOME</label>
                <input
                  type="text"
                  value={quoteData.customerName}
                  onChange={(e) => updateActiveTabData({ customerName: e.target.value })}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white"
                  placeholder="Nome completo"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-blue-900 block mb-1">CNPJ / CPF</label>
                <input
                  type="text"
                  value={quoteData.customerDoc}
                  onChange={(e) => updateActiveTabData({ customerDoc: e.target.value })}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white"
                  placeholder="000.000.000-00"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-blue-900 block mb-1">ENDEREÇO</label>
                <input
                  type="text"
                  value={quoteData.customerAddress}
                  onChange={(e) => updateActiveTabData({ customerAddress: e.target.value })}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white"
                  placeholder="Rua, número, bairro"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-blue-900 block mb-1">TELEFONE</label>
                <input
                  type="text"
                  value={quoteData.customerPhone}
                  onChange={(e) => updateActiveTabData({ customerPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white"
                  placeholder="(00) 00000-0000"
                />
              </div>
            </div>
          </div>

          {/* Itens do Orçamento */}
          <div className="bg-white border-2 border-slate-200 rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">🛒 Itens do Orçamento</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => setIsPasteListOpen(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-md transition-colors"
                >
                  <FileText className="w-5 h-5" />
                  📋 Colar Lista
                </button>
                
                <button
                  onClick={() => setIsImporterOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 shadow-md transition-colors"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  📤 Importar Excel
                </button>
              </div>
            </div>
            
            {/* Adicionar Item com Autocomplete */}
            <div className="bg-slate-50 p-4 rounded-lg mb-4">
              <div className="grid grid-cols-12 gap-2">
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">QTDE</label>
                  <input
                    type="number"
                    min="1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                    className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-center"
                  />
                </div>
                <div className="col-span-6 relative">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    DESCRIÇÃO 
                    <span className="text-green-600 ml-2">🔍 Busca automática no catálogo</span>
                  </label>
                  <input
                    type="text"
                    value={newItem.description}
                    onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-sm"
                    placeholder="Digite para buscar no catálogo..."
                  />
                  
                  {showSuggestions && (
                    <div className="absolute z-20 w-full mt-1 bg-white border-2 border-green-400 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                      <div className="p-2 bg-green-50 border-b border-green-200">
                        <p className="text-xs font-semibold text-green-800">
                          ✨ {filteredCatalog.length} produto(s) encontrado(s) no catálogo
                        </p>
                      </div>
                      {filteredCatalog.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleSelectCatalogItem(item)}
                          className="w-full text-left px-3 py-2 hover:bg-green-50 border-b border-slate-100 transition-colors"
                        >
                          <div className="flex justify-between items-center">
                            <span className="text-sm text-slate-900">{item.description}</span>
                            <span className="text-sm font-semibold text-green-600">{formatCurrency(item.price)}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">VALOR UN.</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={newItem.unitPrice}
                    onChange={(e) => setNewItem(prev => ({ ...prev, unitPrice: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-2 py-2 border border-slate-300 rounded text-sm text-right"
                    placeholder="0,00"
                  />
                </div>
                <div className="col-span-2 flex items-end">
                  <button
                    onClick={handleAddItem}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar
                  </button>
                </div>
              </div>
            </div>

            {/* Tabela de Itens */}
            <div className="border border-slate-200 rounded-lg overflow-visible">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 border-b border-slate-200">
                  <tr>
                    <th className="p-3 text-left font-bold text-slate-700 w-20">QTDE</th>
                    <th className="p-3 text-left font-bold text-slate-700">DESCRIÇÃO DO MATERIAL</th>
                    <th className="p-3 text-right font-bold text-slate-700 w-32">VALOR UN.</th>
                    <th className="p-3 text-right font-bold text-slate-700 w-32">VALOR TOTAL</th>
                    <th className="p-3 text-center font-bold text-slate-700 w-20">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {quoteData.items.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400">
                        Nenhum item adicionado. Use o formulário acima para adicionar itens.
                      </td>
                    </tr>
                  ) : (
                    quoteData.items.map((item) => (
                      <TableRowWithAutocomplete
                        key={item.id}
                        item={item}
                        catalog={catalog}
                        onItemChange={handleItemChange}
                        onRemove={handleRemoveItem}
                        formatCurrency={formatCurrency}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Forma de Pagamento e Valores lado a lado */}
          <div className="grid grid-cols-2 gap-6">
            
            {/* Forma de Pagamento */}
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <h3 className="text-base font-bold text-green-900 mb-2 flex items-center gap-2">
                💳 Forma de Pagamento
              </h3>
              <textarea
                value={quoteData.paymentMethod}
                onChange={(e) => updateActiveTabData({ paymentMethod: e.target.value })}
                className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm bg-white resize-none h-20"
                placeholder="Ex: 3x no cartão&#10;À vista com desconto"
              />
            </div>

            {/* Valores */}
            <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
              <h3 className="text-base font-bold text-yellow-900 mb-2">💰 Valores</h3>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-700">Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(calculateSubtotal())}</span>
                </div>

                <div className="flex justify-between items-center gap-2 print:hidden">
                  <span className="text-sm text-slate-700">Desconto:</span>
                  <div className="flex gap-2">
                    <select
                      value={quoteData.discountType}
                      onChange={(e) => updateActiveTabData({ discountType: e.target.value as 'percent' | 'value' })}
                      className="px-2 py-1 border border-yellow-300 rounded text-xs"
                    >
                      <option value="percent">%</option>
                      <option value="value">R$</option>
                    </select>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={quoteData.discountAmount}
                      onChange={(e) => updateActiveTabData({ discountAmount: parseFloat(e.target.value) || 0 })}
                      className="w-20 px-2 py-1 border border-yellow-300 rounded text-xs text-right"
                    />
                  </div>
                </div>

                {calculateDiscount() > 0 && (
                  <div className="flex justify-between items-center text-sm text-red-600">
                    <span>Valor do desconto:</span>
                    <span className="font-semibold">- {formatCurrency(calculateDiscount())}</span>
                  </div>
                )}

                <div className="border-t-2 border-yellow-300 pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-yellow-900">TOTAL CRÉDITO:</span>
                    <span className="text-xl font-bold text-yellow-900">{formatCurrency(calculateTotal())}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Observações e Assinatura lado a lado */}
          <div className="grid grid-cols-2 gap-6">
            
            {/* Observações */}
            <div className="bg-slate-50 border-2 border-slate-200 rounded-xl p-4">
              <h3 className="text-base font-bold text-slate-900 mb-2">📝 Observações</h3>
              <textarea
                value={quoteData.observations}
                onChange={(e) => updateActiveTabData({ observations: e.target.value })}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none h-20"
                placeholder="Prazo de entrega, condições especiais..."
              />
            </div>

            {/* Assinatura do Cliente */}
            <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
              <h3 className="text-base font-bold text-purple-900 mb-2 flex items-center gap-2">
                <PenTool className="w-4 h-4" />
                Assinatura do Cliente
              </h3>
              <input
                type="text"
                value={quoteData.customerSignature}
                onChange={(e) => updateActiveTabData({ customerSignature: e.target.value })}
                className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm bg-white mb-2"
                placeholder="Nome completo para assinatura"
              />
              <div className="border-t-2 border-purple-300 pt-2 mt-2">
                <p className="text-xs text-purple-700 text-center">
                  ________________________________
                </p>
                <p className="text-xs text-purple-900 text-center font-semibold mt-1">
                  {quoteData.customerSignature || 'Assinatura do Cliente'}
                </p>
              </div>
            </div>

          </div>

          {/* Garantia */}
          <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4">
            <p className="text-xs text-red-900 text-center">
              PREZADO CLIENTE, AO RECEBER SEU MATERIAL FAVOR CONFERIR, POIS APÓS A ENTREGA NÃO NOS RESPONSABILIZAMOS POR DIVERGÊNCIA APÓS<br/>
              <strong>MATERIAL EM LED COM 6 MESES DE GARANTIA, SOMENTE SERÁ VÁLIDA COM A APRESENTAÇÃO DESTA NOTINHA.</strong>
            </p>
          </div>

        </div>

        {/* Footer com Botões */}
        <div className="bg-slate-100 p-6 rounded-b-2xl border-t-2 border-slate-200">
          
          <div className="flex flex-wrap justify-between gap-3 mb-3">
            <div className="flex gap-3">
              <button
                onClick={handleClearForm}
                className="px-6 py-3 bg-white border-2 border-orange-400 text-orange-700 rounded-lg font-semibold hover:bg-orange-50 transition-colors flex items-center gap-2"
              >
                <RefreshCw className="w-5 h-5" />
                Limpar Aba Atual
              </button>
              
              <button
                onClick={handleSaveDraft}
                className="px-6 py-3 bg-white border-2 border-slate-400 text-slate-700 rounded-lg font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <Save className="w-5 h-5" />
                Salvar Rascunho
              </button>
            </div>

            {/* Botão com Dropdown de Status */}
            <div className="relative">
              <button
                onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                className="px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg font-bold hover:from-green-700 hover:to-green-800 transition-colors flex items-center gap-2 shadow-xl border-2 border-green-500"
              >
                <CheckCircle2 className="w-6 h-6" />
                ✅ Salvar Orçamento
                <ChevronDown className={`w-5 h-5 transition-transform ${showStatusDropdown ? 'rotate-180' : ''}`} />
              </button>

              {showStatusDropdown && (
                <div className="absolute right-0 bottom-full mb-2 w-64 bg-white border-2 border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-2 duration-200">
                  <div className="p-2 bg-slate-50 border-b border-slate-200">
                    <p className="text-xs font-bold text-slate-600 uppercase">Escolha o status:</p>
                  </div>
                  
                  <button
                    onClick={() => handleSaveQuoteWithStatus('RASCUNHO')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100"
                  >
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center text-lg">
                      📝
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-slate-800">Salvar como RASCUNHO</p>
                      <p className="text-xs text-slate-500">Continuar editando depois</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSaveQuoteWithStatus('PENDENTE')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-yellow-50 transition-colors border-b border-slate-100"
                  >
                    <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center text-lg">
                      🟡
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-yellow-900">Salvar como PENDENTE</p>
                      <p className="text-xs text-yellow-700">Aguardando resposta do cliente</p>
                    </div>
                  </button>

                  <button
                    onClick={() => handleSaveQuoteWithStatus('APROVADO')}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-green-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-lg">
                      ✅
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-bold text-green-900">Salvar como APROVADO</p>
                      <p className="text-xs text-green-700">Venda confirmada!</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Segunda linha de botões */}
          <div className="flex flex-wrap justify-end gap-3">
            <button
              onClick={handleExportExcel}
              className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors flex items-center gap-2 shadow-lg"
            >
              <Download className="w-5 h-5" />
              Exportar Excel
            </button>

            <button
              onClick={handleGeneratePDF}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-lg"
            >
              <FileText className="w-5 h-5" />
              Gerar PDF
            </button>

            <button
              onClick={handleSendWhatsApp}
              className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg"
            >
              <Send className="w-5 h-5" />
              Enviar WhatsApp
            </button>
          </div>

        </div>

        {/* Excel Importer Modal */}
        {isImporterOpen && (
          <ExcelImporter 
            onImport={handleImportFromExcel}
            onClose={() => setIsImporterOpen(false)}
          />
        )}

        {/* Paste List Modal */}
        {isPasteListOpen && (
          <PasteListModal
            isOpen={isPasteListOpen}
            onClose={() => setIsPasteListOpen(false)}
            onImport={handleImportFromPastedList}
            catalog={catalog}
          />
        )}

      </div>
    </div>
  );
};

// ✅ COMPONENTE DE LINHA COM AUTOCOMPLETE FLUTUANTE (FORA DO MAIN COMPONENT)
interface TableRowProps {
  item: QuoteItem;
  catalog: CatalogItem[];
  onItemChange: (id: string, field: keyof QuoteItem, value: any) => void;
  onRemove: (id: string) => void;
  formatCurrency: (value: number) => string;
}

const TableRowWithAutocomplete: React.FC<TableRowProps> = ({ 
  item, 
  catalog, 
  onItemChange, 
  onRemove,
  formatCurrency 
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredCatalog, setFilteredCatalog] = useState<CatalogItem[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number; width: number } | null>(null);

  const handleDescriptionChange = (value: string) => {
    onItemChange(item.id, 'description', value);

    if (value.length >= 2) {
      const searchTerm = value.toLowerCase();
      const matches = catalog.filter(cat => 
        cat.description.toLowerCase().includes(searchTerm)
      ).slice(0, 10);

      setFilteredCatalog(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
      setFilteredCatalog([]);
    }
  };

  const handleSelectCatalog = (catalogItem: CatalogItem) => {
    onItemChange(item.id, 'description', catalogItem.description);
    onItemChange(item.id, 'unitPrice', catalogItem.price);
    setShowSuggestions(false);
    setFilteredCatalog([]);
  };

  useEffect(() => {
    if (showSuggestions && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    } else {
      setDropdownPosition(null);
    }
  }, [showSuggestions]);

  return (
    <>
      <tr className="hover:bg-slate-50">
        <td className="p-3">
          <input
            type="number"
            min="1"
            value={item.quantity}
            onChange={(e) => onItemChange(item.id, 'quantity', parseInt(e.target.value) || 1)}
            className="w-16 px-2 py-1 border border-slate-300 rounded text-center"
          />
        </td>
        <td className="p-3">
          <input
            ref={inputRef}
            type="text"
            value={item.description}
            onChange={(e) => handleDescriptionChange(e.target.value)}
            onFocus={(e) => {
              if (e.target.value.length >= 2) {
                handleDescriptionChange(e.target.value);
              }
            }}
            className="w-full px-2 py-1 border border-slate-300 rounded focus:ring-2 focus:ring-blue-400 focus:border-blue-500"
          />
        </td>
        <td className="p-3 text-right">
          <input
            type="number"
            step="0.01"
            value={item.unitPrice}
            onChange={(e) => onItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
            className="w-24 px-2 py-1 border border-slate-300 rounded text-right"
          />
        </td>
        <td className="p-3 text-right font-semibold text-slate-900">
          {formatCurrency(item.total)}
        </td>
        <td className="p-3 text-center">
          <button
            onClick={() => onRemove(item.id)}
            className="text-red-600 hover:bg-red-50 p-1 rounded"
            title="Remover item"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </td>
      </tr>

      {/* ✅ DROPDOWN FLUTUANTE - POSITION FIXED */}
      {showSuggestions && filteredCatalog.length > 0 && dropdownPosition && (
        <tr>
          <td colSpan={5} className="p-0 relative">
            <div 
              className="fixed bg-white border-2 border-green-400 rounded-xl shadow-2xl max-h-96 overflow-y-auto"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
                zIndex: 9999
              }}
            >
              <div className="p-3 bg-green-50 border-b-2 border-green-200 sticky top-0 z-10">
                <p className="text-sm font-bold text-green-800">
                  ✨ {filteredCatalog.length} produto(s) encontrado(s)
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {filteredCatalog.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelectCatalog(cat);
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-green-50 border-b border-slate-100 transition-colors"
                  >
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-sm text-slate-900 flex-1 font-medium">{cat.description}</span>
                      <span className="text-base font-bold text-green-600">{formatCurrency(cat.price)}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};