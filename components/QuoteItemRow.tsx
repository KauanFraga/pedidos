import React from 'react';
import { QuoteItem, CatalogItem } from '../types';
import { formatCurrency } from '../utils/currency';
import { Trash2, AlertCircle, Brain, ArrowRightLeft, Check } from 'lucide-react';
import { SearchableSelect } from './SearchableSelect';
import { saveLearnedMatch } from '../services/learningService';

interface QuoteItemRowProps {
  item: QuoteItem;
  catalog: CatalogItem[];
  onDelete: (id: string) => void;
  onChangeQuantity: (id: string, newQty: number) => void;
  onChangeProduct: (id: string, catalogItemId: string) => void;
  onConfirmMatch: (id: string) => void;
}

export const QuoteItemRow: React.FC<QuoteItemRowProps> = ({ 
  item, 
  catalog, 
  onDelete, 
  onChangeQuantity,
  onChangeProduct,
  onConfirmMatch
}) => {
  const isFound = item.catalogItem !== null;
  const total = item.quantity * (item.catalogItem?.price || 0);

  const handleLearnProduct = (catalogItemId: string) => {
    const product = catalog.find(c => c.id === catalogItemId);
    if (product) {
        saveLearnedMatch(item.originalRequest, product);
        onChangeProduct(item.id, catalogItemId);
    }
  };

  return (
    <tr className={`border-b border-slate-100 transition-colors group ${!isFound ? 'bg-red-50/50' : 'hover:bg-slate-50'}`}>
      <td className="p-3 w-24 align-top">
        <div className="relative flex flex-col items-center justify-start">
          <input 
            type="number" 
            min="1"
            step="any"
            value={item.quantity ?? ''}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              const safeVal = isNaN(val) ? 1 : val;
              onChangeQuantity(item.id, safeVal);
            }}
            className="w-20 bg-white text-slate-900 border border-slate-300 rounded px-2 py-2 text-center font-bold focus:ring-2 focus:ring-yellow-400 outline-none text-base shadow-sm appearance-none"
          />
        </div>
      </td>
      <td className="p-3 align-top">
        <div className="flex flex-col relative h-full justify-start">
            {!isFound && (
               <div className="flex items-center gap-1 text-red-500 text-xs font-bold mb-1">
                  <AlertCircle className="w-3 h-3" /> Pendente
               </div>
            )}
            
            {item.isLearned && (
               <div className="flex items-center gap-1 text-purple-600 text-xs font-bold mb-1 animate-in fade-in" title="Aprendido com base em seleções anteriores">
                  <Brain className="w-3 h-3" /> Aprendido
               </div>
            )}
            
            {/* Custom Searchable Select Component */}
            <div className="w-full">
               <SearchableSelect 
                 catalog={catalog}
                 selectedItemId={item.catalogItem?.id}
                 onChange={(newId) => {
                    // If it wasn't found before, treat this manual change as learning
                    if (!isFound) {
                        handleLearnProduct(newId);
                    } else {
                        onChangeProduct(item.id, newId);
                    }
                 }}
                 placeholder="(Produto não identificado - Clique para buscar)"
                 isError={!isFound}
               />
            </div>
        </div>
      </td>
      <td className="p-3 align-top">
         <div className="flex flex-col">
             <div className="text-sm text-slate-500 pt-2">
                {item.originalRequest}
             </div>
             {item.conversionLog && (
                <div className="flex items-center gap-1 mt-1 text-xs text-blue-600 bg-blue-50 w-fit px-2 py-0.5 rounded border border-blue-100" title="Conversão automática de unidade aplicada">
                    <ArrowRightLeft className="w-3 h-3" />
                    {item.conversionLog}
                </div>
             )}
         </div>
      </td>
      <td className="p-3 text-right text-slate-600 font-mono text-lg align-top pt-3">
        {item.catalogItem ? formatCurrency(item.catalogItem.price) : <span className="text-slate-300">--</span>}
      </td>
      <td className="p-3 text-right font-bold text-slate-800 font-mono text-lg align-top pt-3">
        {formatCurrency(total)}
      </td>
      <td className="p-3 align-top pt-3 text-right">
        <div className="flex items-center justify-end gap-1">
            {/* Confirm Match Button */}
            {isFound && !item.isLearned && (
                <button 
                  onClick={() => onConfirmMatch(item.id)}
                  className="text-slate-400 hover:text-green-600 hover:bg-green-50 p-2 rounded-full transition-colors"
                  title="Confirmar acerto e salvar aprendizado"
                >
                   <Check className="w-5 h-5" />
                </button>
            )}

            {/* Already Learned Indicator (Action column) */}
            {isFound && item.isLearned && (
                 <div className="p-2 text-purple-500" title="Item aprendido">
                    <Brain className="w-5 h-5" />
                 </div>
            )}

            {/* Delete Button */}
            <button 
              onClick={() => onDelete(item.id)}
              className="text-slate-300 hover:text-red-500 transition-colors p-2 rounded-full hover:bg-red-50"
              title="Excluir item"
            >
              <Trash2 className="w-5 h-5" />
            </button>
        </div>
      </td>
    </tr>
  );
};