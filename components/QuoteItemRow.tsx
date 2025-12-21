import React, { useState, useRef, useEffect } from 'react';
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
  onChangePrice?: (itemId: string, newPrice: number) => void;
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
  
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const productInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  
  // ✅ NOVO - Estado para posição do dropdown flutuante
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const isFound = item.catalogItem !== null;
  const unitPrice = item.catalogItem?.price || 0;
  const total = item.quantity * unitPrice;

  // Filtrar produtos por busca
  const getFilteredProducts = (searchTerm: string): CatalogItem[] => {
    if (!searchTerm || searchTerm.length < 2) {
      return catalog.slice(0, 15);
    }
    
    const lowerSearch = searchTerm.toLowerCase();
    return catalog
      .filter(item => item.description.toLowerCase().includes(lowerSearch))
      .slice(0, 15);
  };

  // ✅ NOVO - Calcula posição do dropdown quando ele aparece
  useEffect(() => {
    if (showSuggestions && productInputRef.current) {
      const rect = productInputRef.current.getBoundingClientRect();
      setDropdownPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    } else {
      setDropdownPosition(null);
    }
  }, [showSuggestions]);

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        productInputRef.current &&
        !productInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setIsEditingProduct(false);
        setProductSearchTerm('');
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  // Funções de preço
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

  const handleCancelEditPrice = () => {
    setEditedPrice(unitPrice);
    setIsEditingPrice(false);
  };

  // Funções de produto editável
  const handleStartEditProduct = () => {
    setIsEditingProduct(true);
    setProductSearchTerm(item.catalogItem?.description || '');
    setShowSuggestions(true);
    setTimeout(() => productInputRef.current?.focus(), 50);
  };

  const handleSelectProduct = (catalogItem: CatalogItem) => {
    onChangeProduct(item.id, catalogItem.id);
    setIsEditingProduct(false);
    setShowSuggestions(false);
    setProductSearchTerm('');
  };

  const handleCancelEditProduct = () => {
    setIsEditingProduct(false);
    setShowSuggestions(false);
    setProductSearchTerm('');
  };

  const handleProductInputChange = (value: string) => {
    setProductSearchTerm(value);
    setShowSuggestions(true);
  };

  const handleKeyDownProduct = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleCancelEditProduct();
    }
  };

  const filteredProducts = getFilteredProducts(productSearchTerm);

  return (
    <>
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

        {/* PRODUTO - CAMPO EDITÁVEL COM AUTOCOMPLETE */}
        <td className="p-3">
          {isFound ? (
            <div className="flex items-center gap-2">
              {isEditingProduct ? (
                <div className="flex-1 relative">
                  <input
                    ref={productInputRef}
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => handleProductInputChange(e.target.value)}
                    onKeyDown={handleKeyDownProduct}
                    placeholder="Digite para buscar produto..."
                    className="w-full p-2 border-2 border-blue-400 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                  />
                  
                  <button
                    onClick={handleCancelEditProduct}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex-1 p-2 border border-slate-200 rounded text-sm bg-white">
                    {item.catalogItem?.description}
                  </div>
                  <button
                    onClick={handleStartEditProduct}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors shrink-0"
                    title="Editar produto"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  {!item.isLearned && (
                    <button
                      onClick={() => onConfirmMatch(item.id)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors shrink-0"
                      title="Confirmar e Salvar Aprendizado"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div>
              {isEditingProduct ? (
                <div className="relative">
                  <input
                    ref={productInputRef}
                    type="text"
                    value={productSearchTerm}
                    onChange={(e) => handleProductInputChange(e.target.value)}
                    onKeyDown={handleKeyDownProduct}
                    placeholder="Digite para buscar produto..."
                    className="w-full p-2 border-2 border-blue-400 rounded text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    autoFocus
                  />
                  
                  <button
                    onClick={handleCancelEditProduct}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Cancelar"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleStartEditProduct}
                  className="w-full p-2 border-2 border-red-300 bg-red-50 rounded text-sm text-left hover:bg-red-100 transition-colors flex items-center justify-between"
                >
                  <span className="text-red-700 font-medium">
                    ❌ Não Encontrado - Clique para escolher
                  </span>
                  <Edit2 className="w-4 h-4 text-red-600" />
                </button>
              )}
            </div>
          )}
        </td>

        {/* Item Solicitado */}
        <td className="p-3">
          <p className="text-sm text-slate-600 font-mono">{item.originalRequest}</p>
          {item.conversionLog && (
            <p className="text-xs text-blue-600 mt-1">ℹ️ {item.conversionLog}</p>
          )}
        </td>

        {/* Valor Unitário - EDITÁVEL */}
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
                      if (e.key === 'Escape') handleCancelEditPrice();
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
                    onClick={handleCancelEditPrice}
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

      {/* ✅ DROPDOWN FLUTUANTE - POSITION FIXED (FORA DA TR) */}
      {showSuggestions && dropdownPosition && (
        <tr>
          <td colSpan={6} className="p-0 relative">
            <div 
              ref={suggestionsRef}
              className="fixed bg-white border-2 border-blue-400 rounded-xl shadow-2xl max-h-96 overflow-y-auto z-[9999]"
              style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`,
                width: `${dropdownPosition.width}px`,
              }}
            >
              <div className="p-3 bg-blue-50 border-b-2 border-blue-200 sticky top-0 z-10">
                <p className="text-sm font-bold text-blue-800">
                  ✨ {filteredProducts.length} produto(s) encontrado(s)
                </p>
              </div>
              
              <div className="max-h-80 overflow-y-auto">
                {filteredProducts.length > 0 ? (
                  filteredProducts.map(catalogItem => (
                    <button
                      key={catalogItem.id}
                      onClick={() => handleSelectProduct(catalogItem)}
                      className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-slate-100 last:border-0 transition-colors"
                    >
                      <div className="text-sm font-medium text-slate-800">
                        {catalogItem.description}
                      </div>
                      <div className="text-base font-bold text-green-600 mt-1">
                        {formatCurrency(catalogItem.price)}
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-6 text-center text-sm text-slate-500">
                    Nenhum produto encontrado
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
};