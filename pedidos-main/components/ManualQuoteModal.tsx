import React, { useState } from 'react';
import { CatalogItem, QuoteItem } from '../types';
import { RealtimeOrderInput } from './RealtimeOrderInput';
import { ExportModal } from './ExportModal';
import { X, Sparkles, Printer } from 'lucide-react';
import { formatCurrency } from '../utils/parser';

interface ManualQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: CatalogItem[];
}

export const ManualQuoteModal: React.FC<ManualQuoteModalProps> = ({ isOpen, onClose, catalog }) => {
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [customerName, setCustomerName] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  if (!isOpen) return null;

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

    setIsExportModalOpen(true);
  };

  const handleClose = () => {
    if (quoteItems.length > 0) {
      if (confirm('Deseja fechar? Os dados do orçamento manual serão perdidos.')) {
        setQuoteItems([]);
        setCustomerName('');
        onClose();
      }
    } else {
      onClose();
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/90 backdrop-blur-sm p-4 overflow-y-auto">
        <div className="bg-slate-50 w-full max-w-7xl rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-yellow-400 p-2 rounded-lg">
                <Sparkles className="w-6 h-6 text-slate-900" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Orçamento Manual</h2>
                <p className="text-sm text-slate-300">Digite os itens e veja os valores em tempo real</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs text-slate-300 uppercase">Valor Total</p>
                <p className="text-2xl font-bold text-yellow-400">{formatCurrency(totalValue)}</p>
              </div>
              <button 
                onClick={handleClose}
                className="text-slate-300 hover:text-white p-2 hover:bg-slate-700 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {catalog.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-500">
                  <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p className="text-lg font-semibold mb-2">Catálogo não carregado</p>
                  <p className="text-sm">Por favor, carregue o catálogo na tela principal primeiro.</p>
                </div>
              </div>
            ) : (
              <RealtimeOrderInput
                catalog={catalog}
                onItemsChange={setQuoteItems}
                customerName={customerName}
                onCustomerNameChange={setCustomerName}
              />
            )}
          </div>

          {/* Footer */}
          <div className="bg-white border-t-2 border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-4">
              <div className="text-sm text-slate-600">
                <span className="font-semibold">{quoteItems.length}</span> itens
                {quoteItems.length > 0 && (
                  <>
                    {' • '}
                    <span className="text-green-600 font-semibold">{foundItemsCount}</span> encontrados
                  </>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="px-6 py-3 border-2 border-slate-300 text-slate-700 font-semibold rounded-lg hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerateQuote}
                disabled={quoteItems.length === 0 || !customerName.trim()}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold rounded-lg flex items-center gap-2 shadow-lg transition-all transform hover:scale-105 active:scale-95"
              >
                <Printer className="w-5 h-5" />
                Gerar Orçamento
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Export Modal */}
      {isExportModalOpen && (
        <ExportModal
          isOpen={isExportModalOpen}
          onClose={() => setIsExportModalOpen(false)}
          items={quoteItems}
          totalValue={totalValue}
        />
      )}
    </>
  );
};
