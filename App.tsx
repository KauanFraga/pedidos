import React, { useState, useMemo, useEffect } from 'react';
import { FileUploader } from './components/FileUploader';
import { QuoteItemRow } from './components/QuoteItemRow';
import { ModernHeader } from './components/ModernHeader';
import { NotFoundItems } from './components/NotFoundItems';
import { LearningModal } from './components/LearningModal';
import { HistoryModal } from './components/HistoryModal';
import { ExportModal } from './components/ExportModal'; 
import { SettingsModal } from './components/SettingsModal';
import { CatalogManagerModal } from './components/CatalogManagerModal';
import { DashboardModal } from './components/DashboardModal';
import { ManualQuoteModal } from './components/ManualQuoteModal';
import { ProfessionalQuoteModal } from './components/ProfessionalQuoteModal';
import { AuthModal } from './components/AuthModal';
import { SyncButton } from './components/SyncButton';
import { DebugButton } from './components/DebugButton';
import { ImageOCRUploader } from './components/ImageOCRUploader';
import { CatalogItem, QuoteItem, QuoteStatus, LearnedMatch, SavedQuote, HistoryStatus } from './types';
import { processOrderWithGemini } from './services/geminiService';
import { getLearnedMatches, findLearnedMatch, deleteLearnedMatch, saveLearnedMatch, cleanTextForLearning } from './services/learningService';
import { getHistory, saveQuoteToHistory, deleteQuoteFromHistory, updateSavedQuote } from './services/historyService';
import { applyConversions } from './utils/conversionRules';
import { generateExcelClipboard, formatCurrency } from './utils/parser';
import { onAuthChange, logoutUser, AuthUser } from './services/firebaseAuthService';
import { Zap, Sparkles, Download, Calculator, Trash, Brain, Clock, User, Printer, Settings, BarChart3, Save, Edit3, LogOut, FileText } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#22c55e', '#ef4444'];
const CATALOG_STORAGE_KEY = 'orcafacil_catalogo';
const CATALOG_DATE_KEY = 'orcafacil_catalogo_data';

function App() {
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
  const [isProfessionalQuoteModalOpen, setIsProfessionalQuoteModalOpen] = useState(false);

  // ✅ CORREÇÃO NAN: TotalValue agora verifica isNaN para evitar erros visuais
  const totalValue = useMemo(() => {
    const total = items.reduce((acc, item) => {
        const itemTotal = (item.quantity || 0) * (item.catalogItem?.price || 0);
        return acc + (isNaN(itemTotal) ? 0 : itemTotal);
    }, 0);
    return total;
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
                console.log(`Restored catalog with ${parsedCatalog.length} items from ${savedDate}`);
            }
        }
    } catch (e) {
        console.error("Failed to load catalog from storage", e);
        localStorage.removeItem(CATALOG_STORAGE_KEY);
        localStorage.removeItem(CATALOG_DATE_KEY);
    }
  }, []);

  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          e.preventDefault();
          const blob = items[i].getAsFile();
          if (blob) {
            alert('📷 Imagem detectada! Processando com OCR...\n\nClique no botão "📷 Enviar Imagem" para fazer upload.');
          }
        }
      }
    };

    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
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
        alert("Atenção: O catálogo é muito grande para ser salvo no navegador.");
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

  const handleTextFromOCR = (text: string) => {
    setInputText(text);
    alert('✅ Texto extraído da imagem!\n\nRevise o texto abaixo e clique em "Gerar Orçamento" para processar.');
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
      // ✅ CORREÇÃO NAN: Garante que itens processados tenham quantidade válida
      const validItems = processedItems.map(item => ({
        ...item,
        quantity: isNaN(item.quantity) || item.quantity === null ? 1 : item.quantity
      }));

      setItems(validItems);
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

  const handleLoadSyncData = (data: {
    catalogo: CatalogItem[];
    catalogDate: string | null;
    orcamentos: SavedQuote[];
    aprendizado: LearnedMatch[];
  }) => {
    if (catalog.length > 0 || items.length > 0 || quoteHistory.length > 0) {
      if (!confirm('Isso irá substituir seus dados locais pelos dados da nuvem. Continuar?')) {
        return;
      }
    }

    if (data.catalogo.length > 0) {
      setCatalog(data.catalogo);
      setCatalogDate(data.catalogDate);
      try {
        localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(data.catalogo));
        if (data.catalogDate) {
          localStorage.setItem(CATALOG_DATE_KEY, data.catalogDate);
        }
      } catch (e) {
        console.error("Failed to save catalog", e);
      }
    }

    if (data.orcamentos.length > 0) {
      try {
        localStorage.setItem('orcafacil_historico', JSON.stringify(data.orcamentos));
        setQuoteHistory(data.orcamentos);
      } catch (e) {
        console.error("Failed to save history", e);
      }
    }

    if (data.aprendizado.length > 0) {
      try {
        localStorage.setItem('orcafacil_aprendizado', JSON.stringify(data.aprendizado));
        setLearnedMatches(data.aprendizado);
      } catch (e) {
        console.error("Failed to save learned matches", e);
      }
    }

    alert('✅ Dados carregados da nuvem com sucesso!');
  };

  // ✅ CORREÇÃO NAN: Função de restauração melhorada para lidar com dados quebrados
  const handleLoadHistory = (quote: SavedQuote) => {
    const restoredItems = quote.items.map(item => {
      // Tenta recuperar quantidade de vários lugares possíveis (caso o nome do campo mude)
      // @ts-ignore (ignora erro de tipo caso venha 'qtd' do banco legado)
      let quantity = Number(item.quantity) || Number(item.qtd) || Number(item.amount) || 0;
      
      // Se a quantidade for 0 ou NaN, força 1 para não quebrar a UI
      if (quantity <= 0 || isNaN(quantity)) quantity = 1;

      // Recupera preço unitário, verificando se é texto ou numero
      const unitPrice = Number(item.unitPrice) || 
                        Number(item.catalogItem?.price) || 
                        0;

      const total = quantity * unitPrice;
      
      return {
        ...item,
        quantity: quantity,
        unitPrice: unitPrice,
        total: total,
        catalogItem: item.catalogItem ? {
          ...item.catalogItem,
          price: unitPrice // Garante que o preço do catálogo esteja sincronizado
        } : null
      };
    });

    setItems(restoredItems);
    setInputText(quote.originalInputText || ''); // Garante que não seja null
    setCustomerName(quote.customerName || 'Cliente sem nome');
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

  const handleUpdateStatus = (id: string, newStatus: HistoryStatus) => {
    setQuoteHistory(prev => prev.map(quote => 
      quote.id === id ? { ...quote, status: newStatus } : quote
    ));
    updateSavedQuote(id, { status: newStatus });
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
      
      <ModernHeader
      currentUser={currentUser}
      matchStats={matchStats}
      onOpenManualQuote={() => setIsManualQuoteModalOpen(true)}
      onOpenProfessionalQuote={() => setIsProfessionalQuoteModalOpen(true)}
      onOpenDashboard={() => setIsDashboardModalOpen(true)}
      onOpenHistory={() => setIsHistoryModalOpen(true)}
      onOpenLearning={() => setIsLearningModalOpen(true)}
      onOpenSettings={() => setIsSettingsModalOpen(true)}
      onOpenDebug={() => {}}
      onLogout={handleLogout}
      catalog={catalog}
      catalogDate={catalogDate}
      quoteHistory={quoteHistory}
      learnedMatches={learnedMatches}
      onLoadData={handleLoadSyncData}
      currentUserId={currentUser?.uid || null}
    />

      <main className="container mx-auto px-4 py-8 flex-1 print:p-0 print:w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
          
          <div className="lg:col-span-4 space-y-6">
            <FileUploader 
              onUpload={handleUpload} 
              savedCatalogDate={catalogDate} 
              savedCount={catalog.length} 
              onEditCatalog={() => setIsCatalogModalOpen(true)}
            />

            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col">
              <h2 className="text-lg font-semibold text-slate-800 mb-2 flex items-center gap-2">
                2. Pedido do Cliente
              </h2>
              
              <div className="mb-4">
                  <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
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
                className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-lg resize-none focus:ring-2 focus:ring-yellow-400 outline-none text-slate-700 font-mono text-sm mb-3"
                placeholder="Ex:&#10;200m cabo flexivel 2.5 preto&#10;10 tomadas 20a tramontina&#10;5 disjuntor din 25a"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
              />

              <div className="space-y-2">
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

                <ImageOCRUploader onTextExtracted={handleTextFromOCR} />

                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-purple-800 font-medium">
                    💡 Dica: Pressione <kbd className="bg-purple-200 px-2 py-0.5 rounded text-purple-900 font-mono text-xs">Ctrl+V</kbd> para colar imagens!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between items-end gap-6 relative overflow-hidden">
                
               <div className="absolute top-0 left-0 p-6 flex items-center gap-4 z-10">
                  <div className="bg-yellow-50 p-3 rounded-full">
                      <Calculator className="w-8 h-8 text-yellow-600" />
                  </div>
                  <div>
                      <p className="text-sm text-slate-500 uppercase tracking-wider font-bold">Valor Total do Orçamento</p>
                      <p className="text-4xl font-bold text-slate-900">{formatCurrency(totalValue)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {customerName && <span className="text-sm text-slate-600 font-medium">Cliente: {customerName}</span>}
                        {lastSavedTime && <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded border border-green-100">Salvo às {lastSavedTime}</span>}
                      </div>
                  </div>
               </div>

               <div className="flex flex-col items-end gap-3 z-10 mt-24 md:mt-0 w-full md:w-auto">
                   <div className="flex gap-2 w-full md:w-auto justify-end">
                       {items.length > 0 && (
                          <>
                            <button 
                                onClick={handleClear}
                                className="text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded transition-colors text-sm font-medium flex items-center gap-1"
                                title="Limpar tudo"
                            >
                                <Trash className="w-4 h-4" />
                            </button>

                            <button
                                onClick={saveCurrentQuoteState}
                                className="bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 px-4 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors shadow-sm text-sm"
                                title="Salvar no Histórico"
                            >
                                <Save className="w-4 h-4" />
                                Salvar
                            </button>
                          </>
                       )}
                       
                       <button
                          onClick={handleExportExcel}
                          disabled={items.length === 0}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
                       >
                          <Download className="w-4 h-4" />
                          Copiar Excel
                       </button>

                       <button
                          onClick={handleOpenExportModal}
                          disabled={items.length === 0}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
                       >
                          <Printer className="w-4 h-4" />
                          Exportar / Imprimir
                       </button>
                   </div>
               </div>
               
               {items.length > 0 && (
                  <div className="absolute right-6 top-6 h-16 w-16 opacity-20 md:opacity-100 md:relative md:h-16 md:w-16 md:top-auto md:right-auto hidden lg:block">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={matchStats}
                            innerRadius={15}
                            outerRadius={30}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {matchStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                  </div>
               )}
            </div>

            <NotFoundItems items={notFoundItemsList} />

            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden min-h-[400px]">
              <div className="p-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h3 className="font-bold text-slate-700">Itens do Pedido</h3>
                {items.length > 0 && (
                   <div className="text-sm">
                      <span className="bg-green-100 text-green-800 px-2 py-1 rounded border border-green-200 mr-2">{matchStats[0]?.value || 0} Encontrados</span>
                      <span className="bg-red-100 text-red-800 px-2 py-1 rounded border border-red-200">{matchStats[1]?.value || 0} Pendentes</span>
                   </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <th className="p-3 w-24 text-center">Qtd</th>
                      <th className="p-3">Produto no Catálogo</th>
                      <th className="p-3 w-1/4">Item Solicitado</th>
                      <th className="p-3 text-right">Valor Unitário</th>
                      <th className="p-3 text-right">Total</th>
                      <th className="p-3 w-24 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-slate-400">
                          <div className="flex flex-col items-center">
                            <Sparkles className="w-12 h-12 mb-4 opacity-20" />
                            <p>Nenhum item processado ainda.</p>
                            <p className="text-sm">Carregue um catálogo e envie um pedido para começar.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      items.map((item) => (
                        <QuoteItemRow 
                          key={item.id} 
                          item={item} 
                          catalog={catalog} 
                          onDelete={handleDeleteItem}
                          onChangeQuantity={handleQuantityChange}
                          onChangeProduct={handleProductChange}
                          onConfirmMatch={handleConfirmMatch}
                          onChangePrice={handlePriceChange}
                        />
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        </div>

        <LearningModal 
            isOpen={isLearningModalOpen} 
            onClose={() => setIsLearningModalOpen(false)}
            matches={learnedMatches}
            onDelete={handleDeleteLearnedMatch}
            onRefresh={refreshLearnedMatches}
        />

        <HistoryModal
            isOpen={isHistoryModalOpen}
            onClose={() => setIsHistoryModalOpen(false)}
            history={quoteHistory}
            onDelete={handleDeleteHistory}
            onRestore={handleLoadHistory}
            onUpdateStatus={handleUpdateStatus}
        />

        <SettingsModal 
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
        />

        <CatalogManagerModal 
            isOpen={isCatalogModalOpen}
            onClose={() => setIsCatalogModalOpen(false)}
            catalog={catalog}
            onUpdateCatalog={handleUpdateCatalog}
            learnedMatches={learnedMatches}
        />

        <DashboardModal 
            isOpen={isDashboardModalOpen}
            onClose={() => setIsDashboardModalOpen(false)}
            history={quoteHistory}
        />

        <ManualQuoteModal 
            isOpen={isManualQuoteModalOpen}
            onClose={() => setIsManualQuoteModalOpen(false)}
            catalog={catalog}
            onSaveQuote={(items, customerName) => {
              setItems(items);
              setCustomerName(customerName);
              setStatus(QuoteStatus.COMPLETE);
              setIsManualQuoteModalOpen(false);
            }}
        />

        {/* ✅ CORREÇÃO F5: Passando a função refreshHistory */}
        <ProfessionalQuoteModal 
            isOpen={isProfessionalQuoteModalOpen}
            onClose={() => setIsProfessionalQuoteModalOpen(false)}
            catalog={catalog}
            // @ts-ignore (Caso seu ProfessionalModal ainda não aceite a prop, ele vai ignorar sem erro fatal)
            onQuoteSaved={refreshHistory} 
        />

        <ExportModal 
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            items={items}
            totalValue={totalValue}
            customerName={customerName}
        />

        <AuthModal 
            isOpen={isAuthModalOpen}
            onClose={() => setIsAuthModalOpen(false)}
            onSuccess={() => {
                console.log('Login realizado com sucesso!');
            }}
        />
        
      </main>
    </div>
  );
}

export default App;