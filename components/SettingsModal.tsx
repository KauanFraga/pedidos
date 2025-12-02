
import React, { useState, useEffect } from 'react';
import { StoreConfig } from '../types';
import { getStoreConfig, saveStoreConfig } from '../services/settingsService';
import { X, Save, Settings, AlertCircle, Image as ImageIcon } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [config, setConfig] = useState<StoreConfig>(getStoreConfig());

  useEffect(() => {
    if (isOpen) {
      setConfig(getStoreConfig());
    }
  }, [isOpen]);

  const handleChange = (field: keyof StoreConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveStoreConfig(config);
    alert('Configurações salvas com sucesso!');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
             <Settings className="w-6 h-6 text-slate-600" />
             <h2 className="text-xl font-bold">Configurações da Loja</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Logo Section */}
              <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-slate-700 mb-1 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4" /> URL da Logo (Imagem)
                 </label>
                 <input 
                    type="text" 
                    value={config.logoUrl || ''}
                    onChange={(e) => handleChange('logoUrl', e.target.value)}
                    placeholder="Cole o link da imagem ou Base64 aqui..."
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                 />
                 <p className="text-xs text-slate-400 mt-1">
                    Recomendado: Imagem retangular (fundo transparente ou branco).
                 </p>
              </div>

              <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-slate-700 mb-1">Nome da Loja</label>
                 <input 
                    type="text" 
                    value={config.storeName}
                    onChange={(e) => handleChange('storeName', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                 />
              </div>

              <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-slate-700 mb-1">Endereço (Linha 1)</label>
                 <input 
                    type="text" 
                    value={config.addressLine1}
                    onChange={(e) => handleChange('addressLine1', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                 />
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Endereço (Linha 2 - Cidade/UF)</label>
                 <input 
                    type="text" 
                    value={config.addressLine2}
                    onChange={(e) => handleChange('addressLine2', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                 />
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Telefones</label>
                 <input 
                    type="text" 
                    value={config.phones}
                    onChange={(e) => handleChange('phones', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                 />
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">WhatsApp</label>
                 <input 
                    type="text" 
                    value={config.whatsapp}
                    onChange={(e) => handleChange('whatsapp', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                 />
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Vendedor Padrão</label>
                 <input 
                    type="text" 
                    value={config.defaultSalesperson}
                    onChange={(e) => handleChange('defaultSalesperson', e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none uppercase"
                 />
              </div>

              <div>
                 <label className="block text-sm font-medium text-slate-700 mb-1">Próximo Nº Orçamento</label>
                 <input 
                    type="number" 
                    value={config.nextQuoteNumber}
                    onChange={(e) => handleChange('nextQuoteNumber', parseInt(e.target.value))}
                    className="w-full p-2 border border-slate-300 rounded focus:ring-2 focus:ring-blue-500 outline-none"
                 />
              </div>
              
              <div className="md:col-span-2">
                <div className="bg-yellow-50 p-3 rounded border border-yellow-200 flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800">
                        Estas informações aparecerão no cabeçalho do PDF gerado. Certifique-se de que estão corretas.
                    </p>
                </div>
              </div>
           </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
           <button 
             onClick={onClose}
             className="px-4 py-2 border border-slate-300 text-slate-700 rounded hover:bg-slate-50 transition-colors"
           >
             Cancelar
           </button>
           <button 
             onClick={handleSave}
             className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-2"
           >
             <Save className="w-4 h-4" />
             Salvar Configurações
           </button>
        </div>
      </div>
    </div>
  );
};
