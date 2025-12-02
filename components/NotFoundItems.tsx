import React from 'react';
import { Copy, AlertTriangle } from 'lucide-react';

interface NotFoundItemsProps {
  items: string[];
}

export const NotFoundItems: React.FC<NotFoundItemsProps> = ({ items }) => {
  if (items.length === 0) return null;

  const copyToClipboard = () => {
    const text = items.join('\n');
    navigator.clipboard.writeText(text);
    alert('Itens copiados para a área de transferência!');
  };

  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg mb-6 animate-in fade-in slide-in-from-top-4">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <h3 className="font-bold text-red-700">Itens Não Encontrados ({items.length})</h3>
        </div>
        <button 
          onClick={copyToClipboard}
          className="text-xs flex items-center gap-1 bg-white border border-red-200 text-red-600 px-2 py-1 rounded hover:bg-red-100 transition-colors"
        >
          <Copy className="w-3 h-3" /> Copiar Lista
        </button>
      </div>
      
      <ul className="list-disc list-inside space-y-1">
        {items.map((item, idx) => (
          <li key={idx} className="text-sm text-red-800 break-words">
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
};