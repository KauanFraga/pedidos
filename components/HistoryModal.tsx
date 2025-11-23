import React, { useState, useMemo } from 'react';
import { SavedQuote } from '../types';
import { X, Search, Clock, Copy, Trash2, Eye, Calendar, User } from 'lucide-react';
import { formatCurrency } from '../utils/parser';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SavedQuote[];
  onDelete: (id: string) => void;
  onRestore: (quote: SavedQuote) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onDelete, 
  onRestore 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Defensive: Ensure history is treated as an array
  const safeHistory = useMemo(() => {
    return Array.isArray(history) ? history : [];
  }, [history]);

  const filteredHistory = useMemo(() => {
    return safeHistory.filter(quote => {
      if (!quote) return false;
      const name = String(quote.customerName || '').toLowerCase();
      const dateStr = String(quote.createdAt || '');
      const term = searchTerm.toLowerCase();
      
      return name.includes(term) || dateStr.includes(searchTerm);
    });
  }, [safeHistory, searchTerm]);

  if (!isOpen) return null;

  const toggleDetails = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const renderDate = (dateString: string) => {
      try {
          const d = new Date(dateString);
          return isNaN(d.getTime()) ? 'Data inválida' : d.toLocaleDateString('pt-BR');
      } catch {
          return 'Data inválida';
      }
  };

  const renderTime = (dateString: string) => {
      try {
          const d = new Date(dateString);
          return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'});
      } catch {
          return '';
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
             <Clock className="w-6 h-6 text-yellow-500" />
             <h2 className="text-xl font-bold">Histórico de Orçamentos</h2>
          </div>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="p-4 border-b border-slate-100 bg-white">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome do cliente ou data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-yellow-400 outline-none text-slate-700"
            />
          </div>
        </div>
        
        {/* Table List */}
        <div className="overflow-y-auto flex-1 p-4 bg-slate-50">
           {filteredHistory.length === 0 ? (
               <div className="text-center text-slate-500 py-12 flex flex-col items-center">
                   <Clock className="w-12 h-12 text-slate-300 mb-3" />
                   <p className="font-medium">Nenhum orçamento encontrado.</p>
               </div>
           ) : (
             <div className="space-y-3">
               {filteredHistory.map((quote) => {
                 if (!quote) return null; // Skip invalid entries
                 const itemCount = Array.isArray(quote.items) ? quote.items.length : 0;
                 const totalVal = typeof quote.totalValue === 'number' ? quote.totalValue : 0;

                 return (
                 <div key={quote.id} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden transition-all hover:border-yellow-300">
                   {/* Row Summary */}
                   <div className="flex flex-col md:flex-row items-start md:items-center p-4 gap-4">
                      {/* Date */}
                      <div className="flex items-center gap-2 text-slate-500 text-sm w-32 shrink-0">
                        <Calendar className="w-4 h-4" />
                        <div className="flex flex-col">
                            <span className="font-medium">{renderDate(quote.createdAt)}</span>
                            <span className="text-xs text-slate-400">{renderTime(quote.createdAt)}</span>
                        </div>
                      </div>

                      {/* Customer */}
                      <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className={`font-semibold ${quote.customerName ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                          {String(quote.customerName || '(Cliente não informado)')}
                        </span>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-6 text-sm">
                         <div className="flex flex-col items-end">
                            <span className="text-slate-400 text-xs uppercase font-bold">Itens</span>
                            <span className="font-mono text-slate-700">{itemCount}</span>
                         </div>
                         <div className="flex flex-col items-end w-24">
                            <span className="text-slate-400 text-xs uppercase font-bold">Total</span>
                            <span className="font-mono font-bold text-green-600">
                                {formatCurrency(totalVal)}
                            </span>
                         </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 ml-auto border-l border-slate-100 pl-4">
                        <button 
                          onClick={() => toggleDetails(quote.id)}
                          className={`p-2 rounded hover:bg-slate-100 transition-colors ${expandedId === quote.id ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}
                          title="Ver Detalhes"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                            onRestore(quote);
                            onClose();
                          }}
                          className="p-2 rounded hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors"
                          title="Duplicar / Editar"
                        >
                          <Copy className="w-5 h-5" />
                        </button>
                        <button 
                          onClick={() => {
                             if(window.confirm('Tem certeza que deseja excluir este histórico?')) {
                                onDelete(quote.id);
                             }
                          }}
                          className="p-2 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      </div>
                   </div>

                   {/* Expanded Details */}
                   {expandedId === quote.id && (
                     <div className="border-t border-slate-100 bg-slate-50 p-4 text-sm">
                        <h4 className="font-bold text-slate-700 mb-2 text-xs uppercase">Resumo dos Itens</h4>
                        <ul className="space-y-1">
                          {(Array.isArray(quote.items) ? quote.items : []).map((item, idx) => {
                             if (!item) return null;
                             const desc = item.catalogItem?.description || item.originalRequest || 'Item sem descrição';
                             const qty = item.quantity || 0;
                             const price = item.catalogItem ? item.catalogItem.price : 0;
                             const subtotal = qty * price;

                             return (
                               <li key={idx} className="flex justify-between items-center text-slate-600 border-b border-slate-200 pb-1 last:border-0">
                                  <span>{String(qty)}x {String(desc)}</span>
                                  <span className="font-mono text-slate-500">
                                    {item.catalogItem ? formatCurrency(subtotal) : '-'}
                                  </span>
                               </li>
                             );
                          })}
                        </ul>
                     </div>
                   )}
                 </div>
                 );
               })}
             </div>
           )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white rounded-b-xl flex justify-between items-center">
            <span className="text-xs text-slate-400">Mostrando {filteredHistory.length} de {safeHistory.length} orçamentos salvos (limite 30)</span>
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium transition-colors border border-slate-200">
                Fechar
            </button>
        </div>
      </div>
    </div>
  );
};