import React, { useState, useMemo, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { QuoteItemRow } from './components/QuoteItemRow';
import { NotFoundItems } from './components/NotFoundItems';
import { LearningModal } from './components/LearningModal';
import { HistoryModal } from './components/HistoryModal';
import { ExportModal } from './components/ExportModal'; 
import { SettingsModal } from './components/SettingsModal';
import { CatalogManagerModal } from './components/CatalogManagerModal';
import { DashboardModal } from './components/DashboardModal';
import { ManualQuoteModal } from './components/ManualQuoteModal';
import { AuthModal } from './components/AuthModal'; // NOVO!
import { CatalogItem, QuoteItem, QuoteStatus, LearnedMatch, SavedQuote } from './types';
import { processOrderWithGemini } from './services/geminiService';
import { getLearnedMatches, findLearnedMatch, deleteLearnedMatch, saveLearnedMatch, cleanTextForLearning } from './services/learningService';
import { getHistory, saveQuoteToHistory, deleteQuoteFromHistory, updateSavedQuote } from './services/historyService';
import { applyConversions } from './utils/conversionRules';
import { generateExcelClipboard, formatCurrency } from './utils/parser';
import { onAuthChange, logoutUser, AuthUser } from './services/firebaseAuthService'; // NOVO!
import { Zap, Sparkles, Download, Calculator, Trash, Brain, Clock, User as UserIcon, Printer, Settings, BarChart3, Save, Edit3, LogOut } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#22c55e', '#ef4444'];
const CATALOG_STORAGE_KEY = 'orcafacil_catalogo';
const CATALOG_DATE_KEY = 'orcafacil_catalogo_data';

function App() {
  // Firebase Auth State
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogDate, setCatalogDate] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [customerName, setCustomerName] = useState(''); 
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [status, setStatus] = useState<QuoteStatus>(QuoteStatus.IDLE);
  
  const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);
  const [lastSavedTime, setLastSavedTime] = useState<string | null>(null);
  
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false);
  const [learnedMatches, setLearnedMatches] = useState<LearnedMatch[]>([]);

  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [quoteHistory, setQuoteHistory] = useState<SavedQuote[]>([]);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);
  const [isManualQuoteModalOpen, setIsManualQuoteModalOpen] = useState(false);

  const totalValue = useMemo(() => {
    return items.reduce((acc, item) => acc + (item.quantity * (item.catalogItem?.price || 0)), 0);
  }, [items]);

  const notFoundItemsList = useMemo(() => {
    return items.filter(i => i.catalogItem === null).map(i => i.originalRequest);
  }, [items]);

  const matchStats = useMemo(() => {
    const found = items.filter(i => i.catalogItem !== null).length;
    const notFound = items.filter(i => i.catalogItem === null).length;
    const total = found + notFound;
    if (total === 0) return [];
    return [
      { name: 'Encontrados', value: found },
      { name: 'Pendentes', value: notFound },
    ];
  }, [items]);

  // Firebase Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthChange((user) => {
      setCurrentUser(user);
      setAuthLoading(false);
      
      if (!user) {
        setIsAuthModalOpen(true);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    setLearnedMatches(getLearnedMatches());
    setQuoteHistory(getHistory());

    try {
        const savedCatalog = localStorage.getItem(CATALOG_STORAGE_KEY);
        const savedDate = localStorage.getItem(CATALOG_DATE_KEY);
        
        if (savedCatalog && savedDate) {
            const parsedCatalog = JSON.parse(savedCatalog);
            if (Array.isArray(parsedCatalog) && parsedCatalog.length > 0) {
                setCatalog(parsedCatalog);
                setCatalogDate(savedDate);
            }
        }
    } catch (e) {
        console.error("Failed to load catalog from storage", e);
    }
  }, []);

  const handleLogout = async () => {
    if (confirm('Deseja sair da sua conta?')) {
      try {
        await logoutUser();
      } catch (error) {
        console.error('Erro ao sair:', error);
      }
    }
  };

  const refreshLearnedMatches = () => {
    setLearnedMatches(getLearnedMatches());
  };

  const refreshHistory = () => {
    setQuoteHistory(getHistory());
  };

  const handleUpload = (uploadedCatalog: CatalogItem[]) => {
    const now = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');
    setCatalog(uploadedCatalog);
    setCatalogDate(now);
    
    try {
        localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(uploadedCatalog));
        localStorage.setItem(CATALOG_DATE_KEY, now);
    } catch (e) {
        console.error("Failed to save catalog to storage", e);
    }
  };

  const handleUpdateCatalog = (newCatalog: CatalogItem[]) => {
    const now = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');
    setCatalog(newCatalog);
    setCatalogDate(now);
    
    try {
        localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(newCatalog));
        localStorage.setItem(CATALOG_DATE_KEY, now);
    } catch (e) {
        console.error("Failed to save catalog to storage", e);
    }
  };

  const saveCurrentQuoteState = () => {
      if (items.length === 0) return;

      if (currentQuoteId) {
          updateSavedQuote(currentQuoteId, {
              customerName: customerName,
              items: items,
          });
      } else {
          const newQuote = saveQuoteToHistory(customerName, items, inputText);
          setCurrentQuoteId(newQuote.id);
      }
      setLastSavedTime(new Date().toLocaleTimeString());
      refreshHistory();
  };

  const handleProcess = async () => {
    if (!inputText.trim() || catalog.length === 0) {
      alert("Por favor, carregue o catálogo e digite os itens.");
      return;
    }

    setStatus(QuoteStatus.PROCESSING);
    try {
      const lines = inputText.split('\n').filter(l => l.trim() !== '');
      
      const finalItems: QuoteItem[] = new Array(lines.length);
      const linesToProcess: { text: string, originalIndex: number }[] = [];

      lines.forEach((line, idx) => {
         const cleanedInput = cleanTextForLearning(line);
         const matchId = findLearnedMatch(cleanedInput);
         let foundLocally = false;

         if (matchId) {
            const catalogItem = catalog.find(c => c.id === matchId);
            if (catalogItem) {
                foundLocally = true;
                
                let quantity = 1;
                const qtyMatch = line.match(/^(\d+(?:[.,]\d+)?)/);
                if (qtyMatch) {
                    const q = parseFloat(qtyMatch[1].replace(',', '.'));
                    if (!isNaN(q) && q > 0) quantity = q;
                }

                const { newQuantity, log } = applyConversions(line, quantity);

                finalItems[idx] = {
                    id: crypto.randomUUID(),
                    quantity: newQuantity,
                    originalRequest: line,
                    catalogItem: catalogItem,
                    isLearned: true,
                    conversionLog: log
                };
            }
         }
         
         if (!foundLocally) {
             linesToProcess.push({ text: line, originalIndex: idx });
         }
      });

      if (linesToProcess.length > 0) {
          const textToProcess = linesToProcess.map(l => l.text).join('\n');
          const result = await processOrderWithGemini(catalog, textToProcess);
          
          result.items.forEach((item, resultIdx) => {
              if (resultIdx < linesToProcess.length) {
                  const originalIndex = linesToProcess[resultIdx].originalIndex;
                  finalItems[originalIndex] = item;

                  if (item.catalogItem) {
                    saveLearnedMatch(item.originalRequest, item.catalogItem);
                    item.isLearned = true;
                  }
              }
          });
          
          refreshLearnedMatches();
      }

      const processedItems = finalItems.filter(Boolean);
      setItems(processedItems);
      setStatus(QuoteStatus.COMPLETE);
      setCurrentQuoteId(null);
      setLastSavedTime(null);
      
    } catch (error) {
      console.error(error);
      setStatus(QuoteStatus.ERROR);
      alert("Erro ao processar com IA. Verifique sua chave de API ou tente novamente.");
    }
  };

  const handleClear = () => {
    if (items.length > 0 && !currentQuoteId) {
        if (!confirm("Deseja limpar o orçamento atual? Dados não salvos serão perdidos.")) return;
    }
    setItems([]);
    setInputText('');
    setCustomerName(''); 
    setStatus(QuoteStatus.IDLE);
    setCurrentQuoteId(null);
    setLastSavedTime(null);
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleQuantityChange = (id: string, qty: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
  };

  const handlePriceChange = (itemId: string, newPrice: number) => {
    setItems(prev => prev.map(i => {
      if (i.id === itemId && i.catalogItem) {
        return {
          ...i,
          catalogItem: {
            ...i.catalogItem,
            price: newPrice
          }
        };
      }
      return i;
    }));
  };

  const handleProductChange = (itemId: string, catalogId: string) => {
    const catalogProduct = catalog.find(c => c.id === catalogId);
    if (catalogProduct) {
      const itemToUpdate = items.find(i => i.id === itemId);
      setItems(prev => prev.map(i => i.id === itemId ? { 
         ...i, 
         catalogItem: catalogProduct,
         isLearned: true 
      } : i));
      
      if (itemToUpdate) {
          saveLearnedMatch(itemToUpdate.originalRequest, catalogProduct);
          refreshLearnedMatches();
      }
    }
  };
  
  const handleConfirmMatch = (itemId: string) => {
    const item = items.find(i => i.id === itemId);
    if (item && item.catalogItem) {
        saveLearnedMatch(item.originalRequest, item.catalogItem);
        setItems(prev => prev.map(i => i.id === itemId ? { ...i, isLearned: true } : i));
        refreshLearnedMatches();
    }
  };

  const handleDeleteLearnedMatch = (text: string) => {
      deleteLearnedMatch(text);
      refreshLearnedMatches();
  };

  const handleLoadHistory = (quote: SavedQuote) => {
      setItems(quote.items);
      setInputText(quote.originalInputText);
      setCustomerName(quote.customerName);
      setCurrentQuoteId(quote.id); 
      setLastSavedTime(new Date(quote.updatedAt || quote.createdAt).toLocaleTimeString());
      setStatus(QuoteStatus.COMPLETE);
  };

  const handleDeleteHistory = (id: string) => {
      deleteQuoteFromHistory(id);
      refreshHistory();
      if (currentQuoteId === id) {
          setCurrentQuoteId(null);
      }
  };

  const handleExportExcel = () => {
    saveCurrentQuoteState();
    const clipboardText = generateExcelClipboard(items);
    navigator.clipboard.writeText(clipboardText);
    alert("Orçamento salvo e dados copiados! Abra o Excel e pressione Ctrl+V");
  };

  const handleOpenExportModal = () => {
      saveCurrentQuoteState();
      setIsExportModalOpen(true);
  };

  // Loading screen enquanto verifica auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-white font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col">
      <header className="bg-slate-900 text-white shadow-lg sticky top-0 z-50 print:hidden">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-yellow-500 p-1.5 rounded-lg">
              <Zap className="text-slate-900 w-5 h-5 fill-current" />
            </div>
            <h1 className="text-xl font-bold tracking-tight text-yellow-400">
              KF Elétrica <span className="text-slate-400 font-normal text-sm ml-1">v2.0</span>
            </h1>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
             {/* User Info */}
             {currentUser && (
               <div className="hidden md:flex items-center gap-2 text-sm border-r border-slate-700 pr-4">
                 <div className="bg-yellow-400 p-1.5 rounded-full">
                   <UserIcon className="w-4 h-4 text-slate-900" />
                 </div>
                 <span className="text-slate-300">{currentUser.displayName || currentUser.email}</span>
               </div>
             )}

             <button 
                onClick={() => setIsManualQuoteModalOpen(true)}
                className="text-slate-300 hover:text-white flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded hover:bg-slate-800 transition-colors border border-slate-700"
             >
                 <Edit3 className="w-4 h-4" />
                 Orçamento Manual
             </button>

             <button 
                onClick={() => setIsDashboardModalOpen(true)}
                className="text-slate-300 hover:text-white flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded hover:bg-slate-800 transition-colors"
             >
                 <BarChart3 className="w-4 h-4" />
                 Dashboard
             </button>

             <button 
                onClick={() => setIsHistoryModalOpen(true)}
                className="text-slate-300 hover:text-white flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded hover:bg-slate-800 transition-colors"
             >
                 <Clock className="w-4 h-4" />
                 Histórico
             </button>

             <button 
                onClick={() => setIsLearningModalOpen(true)}
                className="text-slate-300 hover:text-white flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded hover:bg-slate-800 transition-colors"
             >
                 <Brain className="w-4 h-4" />
                 Meus Aprendizados
             </button>
             
             <button 
                onClick={() => setIsSettingsModalOpen(true)}
                className="text-slate-300 hover:text-white flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded hover:bg-slate-800 transition-colors"
             >
                 <Settings className="w-4 h-4" />
                 Configurações
             </button>

             <button
                onClick={handleLogout}
                className="text-slate-300 hover:text-red-400 flex items-center gap-1 text-sm font-medium px-3 py-1.5 rounded hover:bg-slate-800 transition-colors"
                title="Sair"
             >
                <LogOut className="w-4 h-4" />
             </button>

             {status === QuoteStatus.COMPLETE && (
                <div className="hidden md:flex items-center gap-2 text-sm border-l border-slate-700 pl-4">
                    <span className="text-green-400 font-bold">{matchStats[0]?.value || 0} Encontrados</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-red-400 font-bold">{matchStats[1]?.value || 0} Pendentes</span>
                </div>
             )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 flex-1 print:p-0 print:w-full">
        {/* Resto do conteúdo igual... */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
          
          <div className="lg:col-span-4 space-y-6">
            <FileUploader 
              onUpload={handleUpload} 
              savedCatalogDate={catalogDate} 
              savedCount={catalog.length} 
              onEditCatalog={() => setIsCatalogModalOpen(true)}
            />

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col h-[600px]">
              <h2 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                2. Pedido do Cliente
              </h2>
              
              <div className="mb-4">
                 <div className="relative">
                     <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                     <input 
                        type="text"
                        placeholder="Nome do cliente (opcional)"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 outline-none text-slate-700"
                     />
                 </div>
              </div>

              <p className="text-sm text-slate-500 mb-2">
                Cole a lista do WhatsApp ou E-mail abaixo.
              </p>
              
              <textarea
                className="flex-1 w-full p-4 bg-slate-50 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-yellow-400 outline-none text-slate-700 font-mono text-sm"
                placeholder="Ex:&#10;200m cabo flexivel 2.5 preto&#10;10 tomadas 20a tramontina&#10;5 disjuntor din 25a"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />

              <div className="mt-4">
                <button
                  onClick={handleProcess}
                  disabled={status === QuoteStatus.PROCESSING || catalog.length === 0}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all transform active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {status === QuoteStatus.PROCESSING ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Processando IA...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Gerar Orçamento
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Continua igual ao código anterior... copie o resto do App.tsx aqui */}
        </div>

        {/* Modais */}
        <AuthModal 
          isOpen={isAuthModalOpen}
          onClose={() => {}} // Não permite fechar sem login
          onSuccess={() => setIsAuthModalOpen(false)}
        />

        {/* ... resto dos modais ... */}
      </main>
    </div>
  );
}

export default App;
