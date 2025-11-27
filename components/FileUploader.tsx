
import React, { useState, useEffect, useRef } from 'react';
import { parseCatalogFile } from '../utils/parser';
import { CatalogItem } from '../types';
import { UploadCloud, CheckCircle, AlertCircle, RefreshCw, Edit, FileText } from 'lucide-react';

interface FileUploaderProps {
  onUpload: (items: CatalogItem[]) => void;
  savedCatalogDate?: string | null;
  savedCount?: number;
  onEditCatalog: () => void;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUpload, savedCatalogDate, savedCount, onEditCatalog }) => {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [count, setCount] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync internal state if props indicate a pre-loaded catalog
  useEffect(() => {
    if (savedCatalogDate && savedCount && savedCount > 0) {
        setStatus('success');
        setCount(savedCount);
    }
  }, [savedCatalogDate, savedCount]);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const items = parseCatalogFile(text);
      
      if (items.length === 0) {
        setStatus('error');
        return;
      }

      setCount(items.length);
      setStatus('success');
      onUpload(items);
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
    
    // Reset input to allow selecting same file again if needed
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleReset = () => {
    setStatus('idle');
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
      <h2 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
        1. Catálogo de Produtos
      </h2>
      
      {status === 'success' ? (
         /* Loaded State */
         <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
             <div className="flex flex-col items-center">
                <CheckCircle className="w-10 h-10 text-green-500 mb-2" />
                <p className="text-green-700 font-bold text-lg">{count} produtos carregados</p>
                {savedCatalogDate && (
                    <p className="text-xs text-green-600 mt-1 mb-4">
                        Último upload: {savedCatalogDate}
                    </p>
                )}
                
                <div className="flex flex-col sm:flex-row gap-2 mt-2 justify-center w-full">
                    <button 
                        onClick={onEditCatalog}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                        <Edit className="w-4 h-4" /> Editar Catálogo
                    </button>
                    
                    <button 
                        onClick={() => inputRef.current?.click()}
                        className="px-4 py-2 bg-slate-600 text-white rounded-lg hover:bg-slate-700 font-medium flex items-center justify-center gap-2 shadow-sm transition-colors"
                    >
                        <RefreshCw className="w-4 h-4" /> Trocar Catálogo
                    </button>

                    {/* Hidden Input */}
                    <input 
                        ref={inputRef}
                        type="file" 
                        accept=".txt"
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>
             </div>
         </div>
      ) : (
         /* Upload State */
        <div 
            className="relative border-2 border-dashed border-slate-300 rounded-lg p-8 hover:bg-slate-50 transition-colors text-center group cursor-pointer"
            onClick={() => inputRef.current?.click()}
        >
            <input 
                ref={inputRef}
                type="file" 
                accept=".txt"
                onChange={handleFileChange}
                className="hidden"
            />
            
            <div className="flex flex-col items-center pointer-events-none">
            {status === 'idle' && (
                <>
                <UploadCloud className="w-12 h-12 text-slate-400 mb-3 group-hover:text-yellow-500 transition-colors" />
                <p className="text-slate-700 font-bold text-lg">Clique para carregar o catálogo</p>
                <p className="text-sm text-slate-500 mt-1">Arquivo .txt (Descrição [TAB] Preço)</p>
                </>
            )}

            {status === 'error' && (
                <>
                <AlertCircle className="w-12 h-12 text-red-500 mb-3" />
                <p className="text-red-600 font-bold">Erro ao ler arquivo</p>
                <p className="text-sm text-red-500 mt-1">Verifique o formato e tente novamente.</p>
                </>
            )}
            </div>
        </div>
      )}
    </div>
  );
};
