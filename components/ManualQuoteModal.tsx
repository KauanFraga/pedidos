
import React, { useState, useMemo } from 'react';
import { CatalogItem } from '../types';
import { X, Search, Plus, Check } from 'lucide-react';
import { formatCurrency } from '../utils/parser';

interface ManualQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: CatalogItem[];
  onAddItem: (item: CatalogItem, quantity: number) => void;
}

export const ManualQuoteModal: React.FC<ManualQuoteModalProps> = ({
  isOpen,
  onClose,
  catalog,
  onAddItem
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
  const [quantity, setQuantity] = useState(1);

  // Filter catalog based on search
  const filteredCatalog = useMemo(() => {
    if (!searchTerm) return [];
    const lowerTerm = searchTerm.toLowerCase();
    return catalog
      .filter(item => item.description.toLowerCase().includes(lowerTerm))
      .slice(0, 50); // Limit results for performance
  }, [catalog, searchTerm]);

  const handleAdd = () => {
    if (selectedItem && quantity > 0) {
      onAddItem(selectedItem, quantity);
      // Reset for next item, keep modal open for ease of use
      setSelectedItem(null);
      setQuantity(1);
      setSearchTerm('');
      alert('Item adicionado ao orçamento!');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-2xl rounded-xl shadow-2xl flex flex-col overflow-hidden max-h-[85vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Plus className="w-6 h-6 text-blue-600" />
            Adicionar Item Manualmente
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 hover:bg-slate-200 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto">
           
           {/* Search Section */}
           <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">Buscar Produto</label>
              <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Digite o nome do produto..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                  />
              </div>

              {/* Results List */}
              {searchTerm && (
                  <div className="mt-2 border border-slate-200 rounded-lg max-h-60 overflow-y-auto bg-white shadow-sm">
                      {filteredCatalog.length === 0 ? (
                          <div className="p-4 text-center text-slate-500 text-sm italic">Nenhum produto encontrado.</div>
                      ) : (
                          <ul>
                              {filteredCatalog.map(item => (
                                  <li 
                                    key={item.id} 
                                    onClick={() => { setSelectedItem(item); setSearchTerm(''); }}
                                    className="p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-100 last:border-0 flex justify-between items-center transition-colors"
                                  >
                                      <span className="font-medium text-slate-700">{item.description}</span>
                                      <span className="text-slate-500 font-mono text-sm">{formatCurrency(item.price)}</span>
                                  </li>
                              ))}
                          </ul>
                      )}
                  </div>
              )}
           </div>

           {/* Selected Item Details */}
           {selectedItem ? (
               <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 animate-in fade-in slide-in-from-top-2">
                   <div className="flex justify-between items-start mb-4">
                       <div>
                           <h4 className="font-bold text-blue-900 text-lg">{selectedItem.description}</h4>
                           <p className="text-blue-700 text-sm">Preço Unitário: {formatCurrency(selectedItem.price)}</p>
                       </div>
                       <button onClick={() => setSelectedItem(null)} className="text-blue-400 hover:text-blue-600">
                           <X className="w-5 h-5" />
                       </button>
                   </div>

                   <div className="flex items-end gap-4">
                       <div className="flex-1">
                           <label className="block text-xs font-bold text-blue-700 uppercase mb-1">Quantidade</label>
                           <input 
                             type="number" 
                             min="1" 
                             step="any"
                             value={quantity} 
                             onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                             className="w-full p-2 border border-blue-300 rounded text-lg font-bold text-slate-800 focus:ring-2 focus:ring-blue-500 outline-none"
                           />
                       </div>
                       <div className="text-right mb-2">
                           <p className="text-xs text-blue-600 font-bold uppercase">Total</p>
                           <p className="text-xl font-bold text-blue-900">{formatCurrency(selectedItem.price * quantity)}</p>
                       </div>
                   </div>

                   <button 
                     onClick={handleAdd}
                     className="w-full mt-6 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95"
                   >
                       <Check className="w-5 h-5" /> Adicionar ao Orçamento
                   </button>
               </div>
           ) : (
               <div className="text-center py-10 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50">
                   <p className="text-slate-400 font-medium">Selecione um produto acima para continuar</p>
               </div>
           )}

        </div>
      </div>
    </div>
  );
};
