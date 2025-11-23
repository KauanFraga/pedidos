import React, { useState, useEffect } from 'react';
import { parseCatalogFile } from '../utils/parser';
import { CatalogItem } from '../types';
import { UploadCloud, CheckCircle, AlertCircle, RefreshCw, FileText } from 'lucide-react';

interface FileUploaderProps {
  onUpload: (items: CatalogItem[]) => void;
  savedCatalogDate?: string | null;
  savedCount?: number;
}

export const FileUploader: React.FC<FileUploaderProps> = ({ onUpload, savedCatalogDate, savedCount }) => {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [count, setCount] = useState(0);

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
                    <p className="text-xs text-green-600 mt-1 mb-3">
                        Último upload: {savedCatalogDate}
                    </p>
                )}
                <div className="relative mt-2">
                    <button className="text-sm font-medium text-slate-600 flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 px-4 py-2 rounded-lg transition-colors shadow-sm">
                        <RefreshCw className="w-4 h-4" /> Trocar catálogo
                    </button>
                    <input 
                        type="file" 
                        accept=".txt"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        title="Clique para selecionar outro arquivo"
                    />
                </div>
             </div>
         </div>
      ) : (
         /* Upload State */
        <div className="relative border-2 border-dashed border-slate-300 rounded-lg p-6 hover:bg-slate-50 transition-colors text-center group">
            <input 
            type="file" 
            accept=".txt"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            
            <div className="flex flex-col items-center pointer-events-none">
            {status === 'idle' && (
                <>
                <UploadCloud className="w-10 h-10 text-slate-400 mb-2 group-hover:text-yellow-500 transition-colors" />
                <p className="text-slate-600 font-medium">Clique para carregar arquivo .txt</p>
                <p className="text-xs text-slate-400 mt-1">Formato: DESCRIÇÃO [TAB] VALOR</p>
                </>
            )}

            {status === 'error' && (
                <>
                <AlertCircle className="w-10 h-10 text-red-500 mb-2" />
                <p className="text-red-600 font-medium">Erro ao ler arquivo. Verifique o formato.</p>
                <button 
                    onClick={(e) => { e.stopPropagation(); handleReset(); }}
                    className="mt-2 text-xs underline text-red-400 hover:text-red-600 pointer-events-auto z-20"
                >
                    Tentar novamente
                </button>
                </>
            )}
            </div>
        </div>
      )}
    </div>
  );
};