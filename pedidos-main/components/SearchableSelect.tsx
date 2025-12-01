import React, { useState, useRef, useEffect, useMemo } from 'react';
import { CatalogItem } from '../types';
import { Search, ChevronDown, Check } from 'lucide-react';

interface SearchableSelectProps {
  catalog: CatalogItem[];
  selectedItemId: string | undefined;
  onChange: (catalogItemId: string) => void;
  placeholder?: string;
  isError?: boolean;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  catalog,
  selectedItemId,
  onChange,
  placeholder = "Selecione um produto...",
  isError = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Find currently selected item for display
  const selectedItem = useMemo(() => 
    catalog.find(c => c.id === selectedItemId), 
  [catalog, selectedItemId]);

  // Filter options based on search term
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return catalog.slice(0, 100); // Show top 100 by default for perf
    const lowerTerm = searchTerm.toLowerCase();
    return catalog
      .filter(item => item.description.toLowerCase().includes(lowerTerm))
      .slice(0, 100); // Limit results for performance
  }, [catalog, searchTerm]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm(''); // Reset search when closing without selection
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (itemId: string) => {
    onChange(itemId);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative w-full" ref={wrapperRef}>
      {/* Trigger / Display Area */}
      {!isOpen ? (
        <div 
          onClick={() => setIsOpen(true)}
          className={`
            group flex items-center justify-between w-full p-2 rounded cursor-pointer border transition-all
            ${isError 
              ? 'bg-white border-red-300 hover:border-red-500 text-red-700' 
              : 'bg-transparent border-transparent hover:bg-white hover:border-blue-200 hover:shadow-sm text-slate-700'
            }
          `}
        >
          <span className={`truncate font-medium ${!selectedItem ? 'text-red-500 italic' : ''}`}>
            {selectedItem ? selectedItem.description : placeholder}
          </span>
          <ChevronDown className={`w-4 h-4 ml-2 opacity-0 group-hover:opacity-100 transition-opacity ${isError ? 'text-red-400' : 'text-slate-400'}`} />
        </div>
      ) : (
        /* Dropdown Mode */
        <div className="absolute top-0 left-0 w-full min-w-[300px] z-50 bg-white rounded-lg shadow-xl border border-blue-500 animate-in fade-in zoom-in-95 duration-100">
          <div className="p-2 border-b border-slate-100 flex items-center gap-2">
            <Search className="w-4 h-4 text-blue-500" />
            <input
              ref={inputRef}
              type="text"
              className="w-full text-sm outline-none text-slate-700 placeholder:text-slate-400"
              placeholder="Digite para buscar (ex: Tomada Liz, Curva 3/4...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <ul className="max-h-60 overflow-y-auto py-1 scrollbar-thin scrollbar-thumb-slate-200">
            {filteredOptions.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400 text-center italic">
                Nenhum produto encontrado.
              </li>
            ) : (
              filteredOptions.map((item) => (
                <li
                  key={item.id}
                  onClick={() => handleSelect(item.id)}
                  className={`
                    px-4 py-2 text-sm cursor-pointer flex items-center justify-between
                    hover:bg-blue-50 hover:text-blue-700 transition-colors
                    ${item.id === selectedItemId ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'}
                  `}
                >
                  <span className="truncate mr-2">{item.description}</span>
                  {item.id === selectedItemId && <Check className="w-3 h-3 flex-shrink-0" />}
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
};