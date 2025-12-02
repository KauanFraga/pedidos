import React, { useState } from 'react';
import { QuoteItem, CatalogItem } from '../types';
import { Trash2, CheckCircle, AlertCircle, Edit2, Check, X } from 'lucide-react';
import { formatCurrency } from '../utils/parser';

interface QuoteItemRowProps {
  item: QuoteItem;
  catalog: CatalogItem[];
  onDelete: (id: string) => void;
  onChangeQuantity: (id: string, qty: number) => void;
  onChangeProduct: (itemId: string, catalogId: string) => void;
  onConfirmMatch: (itemId: string) => void;
  onChangePrice?: (itemId: string, newPrice: number) => void; // NOVO!
}

export const QuoteItemRow: React.FC<QuoteItemRowProps> = ({
  item,
  catalog,
  onDelete,
  onChangeQuantity,
  onChangeProduct,
  onConfirmMatch,
  onChangePrice
}) => {
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [editedPrice, setEditedPrice] = useState(item.catalogItem?.price || 0);

  const isFound = item.catalogItem !== null;
  const unitPrice = item.catalogItem?.price || 0;
  const total = item.quantity * unitPrice;

  const handleStartEditPrice = () => {
    setEditedPrice(unitPrice);
    setIsEditingPrice(true);
  };

  const handleSavePrice = () => {
    if (editedPrice > 0 && onChangePrice) {
      onChangePrice(item.id, editedPrice);
    }
    setIsEditingPrice(false);
  };

  const handleCancelEdit = () => {
    setEditedPrice(unitPrice);
    setIsEditingPrice(false);
  };

  return (
    <tr className={`hover:bg-slate-50 transition-colors ${!isFound ? 'bg-red-50' : ''}`}>
      {/* Quantidade */}
      <td className="p-3 text-center">
        <input
          type="number"
          min="1"
          step="1"
          value={item.quantity}
          onChange={(e) => onChangeQuantity(item.id, parseFloat(e.target.value) || 1)}
          className="w-16 p-2 border border-slate-200 rounded text-center font-bold focus:ring-2 focus:ring-yellow-400 outline-none"
        />
      </td>

      {/* Produto no Catálogo */}
      <td className="p-3">
        {isFound ? (
          <div className="flex items-center gap-2">
            <select
              value={item.catalogItem?.id || ''}
              onChange={(e) => onChangeProduct(item.id, e.target.value)}
              className="flex-1 p-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
            >
              <option value={item.catalogItem?.id}>{item.catalogItem?.description}</option>
              {catalog
                .filter(c => c.id !== item.catalogItem?.id)
                .map(c => (
                  <option key={c.id} value={c.id}>{c.description}</option>
                ))}
            </select>
            {!item.isLearned && (
              <button
                onClick={() => onConfirmMatch(item.id)}
                className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                title="Confirmar e Salvar Aprendizado"
              >
                <CheckCircle className="w-5 h-5" />
              </button>
            )}
          </div>
        ) : (
          <select
            onChange={(e) => onChangeProduct(item.id, e.target.value)}
            className="w-full p-2 border border-red-300 bg-red-50 rounded text-sm focus:ring-2 focus:ring-red-400 outline-none"
          >
            <option value="">❌ Não Encontrado - Selecione Manualmente</option>
            {catalog.map(c => (
              <option key={c.id} value={c.id}>{c.description}</option>
            ))}
          </select>
        )}
      </td>

      {/* Item Solicitado */}
      <td className="p-3">
        <p className="text-sm text-slate-600 font-mono">{item.originalRequest}</p>
        {item.conversionLog && (
          <p className="text-xs text-blue-600 mt-1">ℹ️ {item.conversionLog}</p>
        )}
      </td>

      {/* Valor Unitário - EDITÁVEL! */}
      <td className="p-3 text-right">
        {isFound ? (
          <div className="flex items-center justify-end gap-2">
            {isEditingPrice ? (
              <>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={editedPrice}
                  onChange={(e) => setEditedPrice(parseFloat(e.target.value) || 0)}
                  className="w-24 p-1 border-2 border-yellow-400 rounded text-right font-bold focus:ring-2 focus:ring-yellow-500 outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSavePrice();
                    if (e.key === 'Escape') handleCancelEdit();
                  }}
                />
                <button
                  onClick={handleSavePrice}
                  className="p-1 text-green-600 hover:bg-green-50 rounded"
                  title="Salvar"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 text-red-600 hover:bg-red-50 rounded"
                  title="Cancelar"
                >
                  <X className="w-4 h-4" />
                </button>
              </>
            ) : (
              <>
                <span className="font-bold text-slate-700">{formatCurrency(unitPrice)}</span>
                <button
                  onClick={handleStartEditPrice}
                  className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                  title="Editar preço"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>
        ) : (
          <span className="text-slate-400">-</span>
        )}
      </td>

      {/* Total */}
      <td className="p-3 text-right">
        <span className={`font-bold text-lg ${isFound ? 'text-green-600' : 'text-slate-400'}`}>
          {isFound ? formatCurrency(total) : '-'}
        </span>
      </td>

      {/* Ações */}
      <td className="p-3 text-right">
        <button
          onClick={() => onDelete(item.id)}
          className="p-2 text-red-500 hover:bg-red-50 rounded transition-colors"
          title="Remover item"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </td>
    </tr>
  );
};
