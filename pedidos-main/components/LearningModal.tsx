import React, { useRef } from 'react';
import { LearnedMatch } from '../types';
import { Trash2, X, Brain, Download, Upload } from 'lucide-react';
import { exportLearnedMatches, importLearnedMatches } from '../services/learningService';

interface LearningModalProps {
  isOpen: boolean;
  onClose: () => void;
  matches: LearnedMatch[];
  onDelete: (text: string) => void;
  onRefresh: () => void; // Callback to refresh parent state after import
}

export const LearningModal: React.FC<LearningModalProps> = ({ isOpen, onClose, matches, onDelete, onRefresh }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleExport = () => {
    const data = exportLearnedMatches();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kf-aprendizados-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const success = importLearnedMatches(text);
      if (success) {
        alert('Aprendizados importados com sucesso!');
        onRefresh();
      } else {
        alert('Erro ao importar: Formato de arquivo inválido.');
      }
    } catch (err) {
      alert('Erro ao ler o arquivo.');
    }
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-purple-700">
             <Brain className="w-6 h-6" />
             <h2 className="text-xl font-bold">Aprendizado do Sistema</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Toolbar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex gap-3">
            <button 
              onClick={handleExport}
              className="text-sm flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 text-slate-700 transition-colors"
            >
              <Download className="w-4 h-4" /> Exportar Backup
            </button>
            <button 
              onClick={handleImportClick}
              className="text-sm flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 text-slate-700 transition-colors"
            >
              <Upload className="w-4 h-4" /> Importar Backup
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept=".json" 
              className="hidden" 
            />
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 bg-slate-50">
           {matches.length === 0 ? (
               <div className="text-center text-slate-500 py-12 bg-white rounded-lg border border-dashed border-slate-200">
                   <Brain className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                   <p className="font-medium">Nenhum vínculo aprendido ainda.</p>
                   <p className="text-sm mt-2 text-slate-400 max-w-xs mx-auto">
                     O sistema aprende quando você:
                     <br/>1. Altera um produto manualmente
                     <br/>2. Clica no botão de confirmar (✓) na tabela
                     <br/>3. Gera orçamentos via IA
                   </p>
               </div>
           ) : (
               <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                 <table className="w-full text-left border-collapse">
                   <thead>
                       <tr className="text-xs font-bold text-slate-500 uppercase border-b border-slate-200 bg-slate-50">
                           <th className="py-3 pl-4">Termo do Cliente</th>
                           <th className="py-3">Produto Vinculado</th>
                           <th className="py-3 w-16 text-right pr-4">Ações</th>
                       </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                       {matches.map((match, idx) => (
                           <tr key={idx} className="group hover:bg-slate-50 transition-colors">
                               <td className="py-3 pl-4 pr-4 text-slate-700 font-medium">{match.originalText}</td>
                               <td className="py-3 pr-4 text-slate-600 text-sm">{match.productDescription}</td>
                               <td className="py-3 text-right pr-4">
                                   <button 
                                    onClick={() => onDelete(match.originalText)}
                                    className="text-slate-300 hover:text-red-500 p-2 rounded-full hover:bg-red-50 transition-colors"
                                    title="Esquecer vínculo"
                                   >
                                       <Trash2 className="w-4 h-4" />
                                   </button>
                               </td>
                           </tr>
                       ))}
                   </tbody>
                 </table>
               </div>
           )}
        </div>
        
        <div className="p-4 border-t border-slate-100 bg-white rounded-b-xl flex justify-between items-center">
            <span className="text-xs text-slate-400">Total de {matches.length} itens aprendidos</span>
            <button onClick={onClose} className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium shadow-sm transition-all">
                Fechar
            </button>
        </div>
      </div>
    </div>
  );
};