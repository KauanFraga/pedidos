import React, { useState, useEffect } from 'react';
import { CatalogItem, QuoteItem } from '../types';
import { RealtimeOrderInput } from './RealtimeOrderInput';
import { ExportModal } from './ExportModal';
import { loadCatalog } from '../services/catalogService';
import { formatCurrency } from '../utils/parser';
import { Sparkles, FileText, Clock } from 'lucide-react';

export const MainQuotePage: React.FC = () => {
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Carrega catálogo ao montar
  useEffect(() => {
    const loadData = async () => {
      try {
        const catalogData = await loadCatalog();
        setCatalog(catalogData);
      } catch (error) {
        console.error('Erro ao carregar catálogo:', error);
        alert('Erro ao carregar catálogo. Por favor, recarregue a página.');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const totalValue = quoteItems.reduce((sum, item) => {
    return sum + (item.quantity * (item.catalogItem?.price || 0));
  }, 0);

  const foundItemsCount = quoteItems.filter(item => item.catalogItem !== null).length;

  const handleGenerateQuote = () => {
    if (!customerName.trim()) {
      alert('Por favor, preencha o nome do cliente.');
      return;
    }

    if (quoteItems.length === 0) {
      alert('Adicione pelo menos um item ao orçamento.');
      return;
    }

    if (foundItemsCount < quoteItems.length) {
      const confirm = window.confirm(
        `Alguns itens não foram encontrados no catálogo. Deseja continuar mesmo assim?\n\n` +
        `Encontrados: ${foundItemsCount}/${quoteItems.length}`
      );
      if (!confirm) return;
    }

    setIsExportModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-yellow-400 mx-auto mb-4"></div>
          <p className="text-slate-600 font-medium">Carregando catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      
      {/* Header */}
      <header className="bg-white shadow-sm border-b-2 border-yellow-400 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-400 p-3 rounded-xl">
                <Sparkles className="w-8 h-8 text-slate-800" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-800">KF Elétrica</h1>
                <p className="text-sm text-slate-500">Sistema de Orçamentos v2.0</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium">Produtos no Catálogo</p>
                <p className="text-lg font-bold text-slate-800">{catalog.length}</p>
              </div>
              <div className="h-10 w-px bg-slate-300"></div>
              <div className="text-right">
                <p className="text-xs text-slate-500 font-medium">Itens Encontrados</p>
                <p className="text-lg font-bold text-green-600">{foundItemsCount}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          
          <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-blue-100 p-2 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-sm font-semibold text-slate-600">Itens no Pedido</p>
            </div>
            <p className="text-3xl font-bold text-slate-800">{quoteItems.length}</p>
            <p className="text-xs text-slate-500 mt-1">
              {foundItemsCount} encontrados no catálogo
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-green-100 p-2 rounded-lg">
                <span className="text-xl">💰</span>
              </div>
              <p className="text-sm font-semibold text-slate-600">Valor Total</p>
            </div>
            <p className="text-3xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
            <p className="text-xs text-slate-500 mt-1">
              Sem descontos aplicados
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-2">
              <div className="bg-yellow-100 p-2 rounded-lg">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-sm font-semibold text-slate-600">Status</p>
            </div>
            <p className="text-lg font-bold text-slate-800">
              {quoteItems.length === 0 ? 'Aguardando' : 'Em Andamento'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Cálculo em tempo real
            </p>
          </div>
        </div>

        {/* Realtime Input Component */}
        <RealtimeOrderInput
          catalog={catalog}
          onItemsChange={setQuoteItems}
          customerName={customerName}
          onCustomerNameChange={setCustomerName}
        />

        {/* Action Button */}
        <div className="mt-8">
          <button
            onClick={handleGenerateQuote}
            disabled={quoteItems.length === 0 || !customerName.trim()}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-slate-300 disabled:to-slate-400 text-white font-bold py-5 px-6 rounded-xl flex items-center justify-center gap-3 shadow-lg transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:cursor-not-allowed disabled:transform-none"
          >
            <Sparkles className="w-6 h-6" />
            <span className="text-lg">Gerar Orçamento</span>
            {quoteItems.length > 0 && (
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm">
                {foundItemsCount}/{quoteItems.length} itens
              </span>
            )}
          </button>
          
          {quoteItems.length === 0 && (
            <p className="text-center text-sm text-slate-500 mt-3">
              Adicione itens acima para gerar o orçamento
            </p>
          )}
        </div>

        {/* Summary Card */}
        {quoteItems.length > 0 && (
          <div className="mt-8 bg-white rounded-xl shadow-sm border-2 border-slate-200 p-6">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Resumo do Pedido</h3>
            <div className="space-y-2">
              {quoteItems.slice(0, 5).map((item, idx) => (
                <div key={item.id} className="flex justify-between items-center text-sm">
                  <span className="text-slate-600">
                    {item.quantity}x {item.catalogItem?.description || item.originalRequest}
                  </span>
                  <span className="font-bold text-slate-800">
                    {formatCurrency((item.catalogItem?.price || 0) * item.quantity)}
                  </span>
                </div>
              ))}
              {quoteItems.length > 5 && (
                <p className="text-xs text-slate-400 text-center pt-2">
                  + {quoteItems.length - 5} itens adicionais
                </p>
              )}
            </div>
            <div className="border-t-2 border-slate-200 mt-4 pt-4 flex justify-between items-center">
              <span className="font-bold text-slate-800">TOTAL</span>
              <span className="text-2xl font-bold text-green-600">
                {formatCurrency(totalValue)}
              </span>
            </div>
          </div>
        )}
      </main>

      {/* Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          items={quoteItems}
          totalValue={totalValue}
        />
      )}
    </div>
  );
};
