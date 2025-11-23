
import React, { useState, useMemo } from 'react';
import { CatalogItem, LearnedMatch } from '../types';
import { X, Search, Plus, Edit2, Trash2, ChevronLeft, ChevronRight, Save } from 'lucide-react';
import { formatCurrency } from '../utils/parser';

interface CatalogManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: CatalogItem[];
  onUpdateCatalog: (newCatalog: CatalogItem[]) => void;
  learnedMatches: LearnedMatch[];
}

export const CatalogManagerModal: React.FC<CatalogManagerModalProps> = ({
  isOpen,
  onClose,
  catalog,
  onUpdateCatalog,
  learnedMatches
}) => {
  // View State
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 
  
  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [formData, setFormData] = useState({ description: '', price: '' });

  // --- Filtering & Pagination ---
  // FIXED: useMemo is now called UNCONDITIONALLY at the top level
  const processedCatalog = useMemo(() => {
    if (!catalog) return [];
    let result = catalog;
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(item => item.description && item.description.toLowerCase().includes(lowerTerm));
    }
    // Simple sort by description A-Z
    return [...result].sort((a, b) => (a.description || '').localeCompare(b.description || ''));
  }, [catalog, searchTerm]);

  const totalPages = Math.ceil(processedCatalog.length / itemsPerPage);
  const paginatedItems = processedCatalog.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // --- CRUD Operations ---

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ description: '', price: '' });
    setIsEditing(true);
  };

  const openEditModal = (item: CatalogItem) => {
    setEditingItem(item);
    setFormData({ 
      description: item.description, 
      price: typeof item.price === 'number' ? item.price.toFixed(2).replace('.', ',') : '0,00'
    });
    setIsEditing(true);
  };

  const handleSave = () => {
    // Parse price: convert 1.000,00 to 1000.00
    let priceClean = formData.price.replace(/\./g, '').replace(',', '.');
    const priceNum = parseFloat(priceClean);
    
    // Validation
    if (!formData.description.trim()) {
      alert("A descrição é obrigatória.");
      return;
    }
    if (isNaN(priceNum) || priceNum < 0) {
      alert("Preço inválido. Use o formato: 10,50");
      return;
    }

    const now = new Date().toISOString();

    if (editingItem) {
      // Edit Mode
      const updatedCatalog = catalog.map(item => 
        item.id === editingItem.id 
          ? { ...item, description: formData.description.trim().toUpperCase(), price: priceNum, updatedAt: now }
          : item
      );
      onUpdateCatalog(updatedCatalog);
    } else {
      // Add Mode
      const duplicate = catalog.find(
        c => c.description.toLowerCase() === formData.description.trim().toLowerCase()
      );
      if (duplicate) {
         if(!window.confirm("Já existe um produto com esta descrição. Deseja adicionar mesmo assim?")) {
             return;
         }
      }

      const newItem: CatalogItem = {
        id: crypto.randomUUID(),
        description: formData.description.trim().toUpperCase(),
        price: priceNum,
        createdAt: now,
        updatedAt: now
      };
      onUpdateCatalog([newItem, ...catalog]);
    }

    setIsEditing(false);
  };

  const handleDelete = (item: CatalogItem) => {
    const usageCount = learnedMatches.filter(l => l.productId === item.id).length;
    let confirmMsg = `Tem certeza que deseja excluir:\n\n${item.description}\n${formatCurrency(item.price)}?`;
    
    if (usageCount > 0) {
      confirmMsg += `\n\n⚠️ ATENÇÃO: Este produto está vinculado a ${usageCount} itens aprendidos. Excluí-lo pode afetar reconhecimentos futuros.`;
    }

    if (window.confirm(confirmMsg)) {
      const updatedCatalog = catalog.filter(c => c.id !== item.id);
      onUpdateCatalog(updatedCatalog);
    }
  };

  // FIXED: Conditional return is now AFTER all hooks
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-bold text-slate-800">📦 Gestão do Catálogo</h2>
            <p className="text-sm text-slate-500">Total: {catalog.length} produtos</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded text-slate-500">
             <X className="w-6 h-6" />
          </button>
        </div>

        {/* Actions Bar */}
        <div className="p-4 bg-white border-b border-slate-100 flex flex-col sm:flex-row gap-4 justify-between items-center">
           <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar produto..." 
                value={searchTerm}
                onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
           </div>
           
           <button 
             onClick={openAddModal}
             className="w-full sm:w-auto px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center justify-center gap-2 transition-colors shadow-sm"
           >
              <Plus className="w-4 h-4" /> Adicionar Produto
           </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
           {processedCatalog.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                 <Search className="w-12 h-12 mx-auto mb-2 opacity-20" />
                 <p>Nenhum produto encontrado.</p>
              </div>
           ) : (
              <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
                 <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-500 text-xs uppercase font-bold">
                       <tr>
                          <th className="p-4">Descrição</th>
                          <th className="p-4 text-right">Preço</th>
                          <th className="p-4 text-right w-32">Ações</th>
                       </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                       {paginatedItems.map(item => (
                          <tr key={item.id} className="hover:bg-blue-50 transition-colors group">
                             <td className="p-4 font-medium text-slate-700">{item.description}</td>
                             <td className="p-4 text-right font-mono text-slate-600">{formatCurrency(item.price)}</td>
                             <td className="p-4 text-right">
                                <div className="flex justify-end gap-2">
                                   <button 
                                     onClick={() => openEditModal(item)}
                                     className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                                     title="Editar"
                                   >
                                      <Edit2 className="w-4 h-4" />
                                   </button>
                                   <button 
                                     onClick={() => handleDelete(item)}
                                     className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                                     title="Excluir"
                                   >
                                      <Trash2 className="w-4 h-4" />
                                   </button>
                                </div>
                             </td>
                          </tr>
                       ))}
                    </tbody>
                 </table>
              </div>
           )}
        </div>

        {/* Footer / Pagination */}
        <div className="p-4 bg-white border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs text-slate-500">
               Página {currentPage} de {totalPages || 1}
            </span>
            <div className="flex gap-2">
               <button 
                 onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                 disabled={currentPage === 1}
                 className="p-2 border rounded hover:bg-slate-50 disabled:opacity-50"
               >
                  <ChevronLeft className="w-4 h-4" />
               </button>
               <button 
                 onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                 disabled={currentPage === totalPages || totalPages === 0}
                 className="p-2 border rounded hover:bg-slate-50 disabled:opacity-50"
               >
                  <ChevronRight className="w-4 h-4" />
               </button>
            </div>
        </div>
      </div>

      {/* Add/Edit Sub-Modal */}
      {isEditing && (
         <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/20 backdrop-blur-[1px]">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200">
               <h3 className="text-lg font-bold text-slate-800 mb-6 border-b pb-2">
                  {editingItem ? 'Editar Produto' : 'Adicionar Produto'}
               </h3>
               
               <div className="space-y-4">
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição *</label>
                     <input 
                        autoFocus
                        type="text" 
                        value={formData.description}
                        onChange={e => setFormData({ ...formData, description: e.target.value })}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                        placeholder="EX: CABO FLEXÍVEL..."
                     />
                  </div>
                  <div>
                     <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Preço (R$) *</label>
                     <input 
                        type="text" 
                        value={formData.price}
                        onChange={e => {
                           // Allow numbers, comma, dot
                           if (/^[\d.,]*$/.test(e.target.value)) {
                              setFormData({ ...formData, price: e.target.value });
                           }
                        }}
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0,00"
                     />
                  </div>
               </div>

               <div className="flex justify-end gap-3 mt-8">
                  <button 
                     onClick={() => setIsEditing(false)}
                     className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
                  >
                     Cancelar
                  </button>
                  <button 
                     onClick={handleSave}
                     className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md"
                  >
                     Salvar
                  </button>
               </div>
            </div>
         </div>
      )}
    </div>
  );
};
