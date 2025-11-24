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
import { CatalogItem, QuoteItem, QuoteStatus, LearnedMatch, SavedQuote } from './types';
import { processOrderWithGemini } from './services/geminiService';
import { getLearnedMatches, findLearnedMatch, deleteLearnedMatch, saveLearnedMatch, cleanTextForLearning } from './services/learningService';
import { getHistory, saveQuoteToHistory, deleteQuoteFromHistory } from './services/historyService';
import { applyConversions } from './utils/conversionRules';
import { generateExcelClipboard, formatCurrency } from './utils/parser';
import { Zap, Sparkles, Download, Calculator, Trash, Brain, Clock, User, Printer, Settings, BarChart3 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

const COLORS = ['#22c55e', '#ef4444'];
const CATALOG_STORAGE_KEY = 'orcafacil_catalogo';
const CATALOG_DATE_KEY = 'orcafacil_catalogo_data';

function App() {
  // State
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [catalogDate, setCatalogDate] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [customerName, setCustomerName] = useState(''); 
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [status, setStatus] = useState<QuoteStatus>(QuoteStatus.IDLE);
  
  // Learning System State
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false);
  const [learnedMatches, setLearnedMatches] = useState<LearnedMatch[]>([]);

  // History System State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [quoteHistory, setQuoteHistory] = useState<SavedQuote[]>([]);

  // Export Modal State
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Settings Modal State
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  // Catalog Manager Modal State
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);

  // Dashboard Modal State
  const [isDashboardModalOpen, setIsDashboardModalOpen] = useState(false);

  // Computed
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

  // Effects
  useEffect(() => {
    // Load learned matches
    setLearnedMatches(getLearnedMatches());

    // Load History
    setQuoteHistory(getHistory());

    // Load persisted catalog
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

  const refreshLearnedMatches = () => {
    setLearnedMatches(getLearnedMatches());
  };

  const refreshHistory = () => {
    setQuoteHistory(getHistory());
  };

  // Handlers
  const handleUpload = (uploadedCatalog: CatalogItem[]) => {
    const now = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR');
    
    setCatalog(uploadedCatalog);
    setCatalogDate(now);
    
    try {
        localStorage.setItem(CATALOG_STORAGE_KEY, JSON.stringify(uploadedCatalog));
        localStorage.setItem(CATALOG_DATE_KEY, now);
    } catch (e) {
        console.error("Failed to save catalog to storage (likely quota exceeded)", e);
        alert("Atenção: O catálogo é muito grande para ser salvo no navegador. Ele funcionará agora, mas você precisará enviá-lo novamente se recarregar a página.");
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
        alert("Atenção: O catálogo é muito grande para ser salvo no navegador.");
    }
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

      if (processedItems.length > 0) {
        saveQuoteToHistory(customerName, processedItems, inputText);
        refreshHistory();
      }
      
    } catch (error) {
      console.error(error);
      setStatus(QuoteStatus.ERROR);
      alert("Erro ao processar com IA. Verifique sua chave de API ou tente novamente.");
    }
  };

  const handleClear = () => {
    setItems([]);
    setInputText('');
    setCustomerName(''); 
    setStatus(QuoteStatus.IDLE);
  };

  const handleDeleteItem = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleQuantityChange = (id: string, qty: number) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, quantity: qty } : i));
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
      setStatus(QuoteStatus.COMPLETE);
  };

  const handleDeleteHistory = (id: string) => {
      deleteQuoteFromHistory(id);
      refreshHistory();
  };

  const handleExportExcel = () => {
    const clipboardText = generateExcelClipboard(items);
    navigator.clipboard.writeText(clipboardText);
    alert("Dados copiados! Abra o Excel e pressione Ctrl+V");
  };

  return (
    <div className="min-h-screen bg-slate-100 font-sans text-slate-900 flex flex-col">
      {/* Header */}
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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
          
          {/* Left Column: Input */}
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

          {/* Right Column: Results */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Stats / Summary Header */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-between items-end gap-6 relative overflow-hidden">
               
               <div className="absolute top-0 left-0 p-6 flex items-center gap-4 z-10">
                  <div className="bg-yellow-50 p-3 rounded-full">
                     <Calculator className="w-8 h-8 text-yellow-600" />
                  </div>
                  <div>
                     <p className="text-sm text-slate-500 uppercase tracking-wider font-bold">Valor Total do Orçamento</p>
                     <p className="text-4xl font-bold text-slate-900">{formatCurrency(totalValue)}</p>
                     {customerName && <p className="text-sm text-slate-400 mt-1 font-medium">Cliente: {customerName}</p>}
                  </div>
               </div>

               <div className="flex flex-col items-end gap-3 z-10 mt-24 md:mt-0 w-full md:w-auto">
                   <div className="flex gap-2 w-full md:w-auto justify-end">
                       {items.length > 0 && (
                          <button 
                            onClick={handleClear}
                            className="text-slate-500 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded transition-colors text-sm font-medium flex items-center gap-2"
                          >
                             <Trash className="w-4 h-4" /> Limpar
                          </button>
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
                          onClick={() => setIsExportModalOpen(true)}
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
        />

        <SettingsModal 
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            onHistoryChange={refreshHistory}
        />

        <CatalogManagerModal 
            isOpen={isCatalogModalOpen}
            onClose={() => setIsCatalogModalOpen(false)}
            catalog={catalog}
            onUpdateCatalog={handleUpdateCatalog}
            learnedMatches={learnedMatches}
        />

        <ExportModal 
            isOpen={isExportModalOpen}
            onClose={() => setIsExportModalOpen(false)}
            items={items}
            totalValue={totalValue}
        />

        <DashboardModal 
            isOpen={isDashboardModalOpen}
            onClose={() => setIsDashboardModalOpen(false)}
            history={quoteHistory}
        />
        
      </main>
    </div>
  );
}

export default App;
