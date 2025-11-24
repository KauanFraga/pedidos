import React, { useState, useEffect } from 'react';
import { StoreConfig } from '../types';
import { getStoreConfig, saveStoreConfig } from '../services/settingsService';
import { 
  getHistoryLimit, 
  setHistoryLimit, 
  exportHistoryBackup, 
  importHistoryBackup, 
  clearHistory,
  getHistoryStats 
} from '../services/historyService';
import { 
  X, Save, Settings, AlertCircle, Image as ImageIcon, 
  Database, Download, Upload, Trash2, AlertTriangle, Info 
} from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHistoryChange?: () => void; // Callback para atualizar App quando histórico muda
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, onHistoryChange }) => {
  const [config, setConfig] = useState<StoreConfig>(getStoreConfig());
  const [historyLimit, setHistoryLimitState] = useState(900);
  const [stats, setStats] = useState(getHistoryStats());
  const [activeTab, setActiveTab] = useState<'store' | 'history'>('store');

  useEffect(() => {
    if (isOpen) {
      setConfig(getStoreConfig());
      setHistoryLimitState(getHistoryLimit());
      setStats(getHistoryStats());
    }
  }, [isOpen]);

  const handleChange = (field: keyof StoreConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveStoreConfig(config);
    alert('✅ Configurações da loja salvas com sucesso!');
  };

  const handleLimitChange = (newLimit: number) => {
    setHistoryLimit(newLimit);
    setHistoryLimitState(newLimit);
    setStats(getHistoryStats());
  };

  const handleExportBackup = () => {
    try {
      exportHistoryBackup();
      alert('✅ Backup exportado com sucesso!\n\nGuarde o arquivo em local seguro.');
    } catch (e) {
      alert('❌ Erro ao exportar backup.');
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const count = await importHistoryBackup(file);
        setStats(getHistoryStats());
        onHistoryChange?.(); // Atualiza o App
        alert(`✅ ${count} novos orçamentos importados com sucesso!`);
      } catch (err) {
        alert('❌ Erro ao importar backup.\n\nVerifique se o arquivo é válido.');
      }
    }
    // Limpa o input para permitir reimportar o mesmo arquivo
    e.target.value = '';
  };

  const handleClearHistory = () => {
    const confirm1 = window.confirm(
      '⚠️ ATENÇÃO: Isso vai apagar TODOS os orçamentos salvos!\n\n' +
      '📌 Total de orçamentos: ' + stats.total + '\n\n' +
      'Tem certeza? Recomendamos FAZER BACKUP antes de continuar.'
    );
    
    if (confirm1) {
      const confirm2 = window.prompt(
        '🚨 CONFIRMAÇÃO FINAL\n\n' +
        'Digite "LIMPAR TUDO" (sem aspas) para confirmar:'
      );
      
      if (confirm2 === 'LIMPAR TUDO') {
        clearHistory();
        setStats(getHistoryStats());
        onHistoryChange?.(); // Atualiza o App
        alert('✅ Histórico limpo com sucesso!\n\nTodos os orçamentos foram removidos.');
      } else if (confirm2 !== null) {
        alert('❌ Texto incorreto. Operação cancelada.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
             <Settings className="w-6 h-6 text-slate-600" />
             <h2 className="text-xl font-bold">Configurações do Sistema</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 bg-white">
          <button
            onClick={() => setActiveTab('store')}
            className={`flex-1 py-3 px-4 font-medium transition-colors ${
              activeTab === 'store'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            🏪 Dados da Loja
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 px-4 font-medium transition-colors relative ${
              activeTab === 'history'
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            💾 Gestão de Histórico
            {stats.needsBackup && (
              <span className="absolute top-2 right-2 w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          
          {/* TAB 1: Dados da Loja */}
          {activeTab === 'store' && (
            <div className="space-y-6">
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
          )}

          {/* TAB 2: Gestão de Histórico */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              
              {/* Estatísticas */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 rounded-xl border-2 border-blue-200">
                <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2">
                  <Database className="w-5 h-5 text-blue-600" />
                  📊 Estatísticas de Armazenamento
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Orçamentos Salvos</p>
                    <p className="text-3xl font-bold text-blue-600">{stats.total}</p>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <p className="text-xs text-slate-500 uppercase font-bold mb-1">Limite Configurado</p>
                    <p className="text-3xl font-bold text-slate-700">{stats.limit}</p>
                  </div>
                </div>
                
                {typeof stats.limit === 'number' && stats.limit > 0 && (
                  <div className="mt-4">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600 font-medium">Utilização</span>
                      <span className="font-bold text-slate-700">{stats.percentUsed}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-4 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          stats.percentUsed > 90 ? 'bg-red-500' : 
                          stats.percentUsed > 70 ? 'bg-yellow-500' : 
                          'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(stats.percentUsed, 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {stats.needsBackup && (
                  <div className="flex items-center gap-2 bg-yellow-100 border border-yellow-300 rounded-lg p-3 mt-4">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                    <span className="text-sm text-yellow-800 font-medium">
                      ⚠️ Você está próximo do limite! Recomendamos fazer um backup em breve.
                    </span>
                  </div>
                )}
              </div>

              {/* Limite de Histórico */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="font-bold text-lg text-slate-800 mb-4">🎯 Limite de Orçamentos</h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-3">
                      Quantidade máxima de orçamentos salvos:
                    </label>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {[50, 500, 900, 0].map((limit) => (
                        <button
                          key={limit}
                          onClick={() => handleLimitChange(limit)}
                          className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                            historyLimit === limit
                              ? 'bg-blue-600 text-white shadow-md scale-105'
                              : 'bg-white text-slate-700 border-2 border-slate-200 hover:border-blue-400 hover:scale-105'
                          }`}
                        >
                          {limit === 0 ? '∞ Ilimitado' : limit}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-start gap-2 text-sm text-slate-600 bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-blue-800 mb-1">💡 Recomendação:</p>
                      <p>Configure para <strong>900 orçamentos/mês</strong>. Ao final do mês, faça backup e limpe o histórico para começar um novo período.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Backup e Restauração */}
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                <h3 className="font-bold text-lg text-slate-800 mb-4">💾 Backup e Restauração</h3>
                
                <div className="space-y-3">
                  <button
                    onClick={handleExportBackup}
                    disabled={stats.total === 0}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                  >
                    <Download className="w-5 h-5" />
                    Exportar Backup ({stats.total} orçamentos)
                  </button>

                  <label className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm">
                    <Upload className="w-5 h-5" />
                    Importar Backup
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleImportBackup}
                      className="hidden"
                    />
                  </label>

                  <div className="text-xs text-slate-600 bg-slate-100 p-4 rounded-lg space-y-2">
                    <p className="font-semibold text-slate-700">📋 Como usar:</p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>Clique em "Exportar Backup" para salvar todos os orçamentos</li>
                      <li>Guarde o arquivo .json em local seguro (pendrive, Google Drive, etc)</li>
                      <li>Use "Importar Backup" para restaurar os dados quando precisar</li>
                      <li>A importação não remove orçamentos existentes, apenas adiciona novos</li>
                    </ol>
                  </div>
                </div>
              </div>

              {/* Zona de Perigo */}
              <div className="bg-red-50 p-6 rounded-xl border-2 border-red-200">
                <h3 className="font-bold text-lg text-red-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  ⚠️ Zona de Perigo
                </h3>
                
                <p className="text-sm text-red-700 mb-4">
                  Esta ação é <strong>IRREVERSÍVEL</strong>. Todos os {stats.total} orçamentos serão 
                  permanentemente apagados. <strong>Faça um backup antes!</strong>
                </p>

                <button
                  onClick={handleClearHistory}
                  disabled={stats.total === 0}
                  className="w-full bg-red-600 hover:bg-red-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-colors shadow-sm"
                >
                  <Trash2 className="w-5 h-5" />
                  Limpar Todo o Histórico
                </button>
              </div>

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-white flex justify-between">
           {activeTab === 'store' ? (
             <>
               <button 
                 onClick={onClose}
                 className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
               >
                 Cancelar
               </button>
               <button 
                 onClick={handleSave}
                 className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-medium shadow-sm"
               >
                 <Save className="w-4 h-4" />
                 Salvar Configurações
               </button>
             </>
           ) : (
             <button 
               onClick={onClose}
               className="w-full px-6 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg font-medium transition-colors"
             >
               Fechar
             </button>
           )}
        </div>

      </div>
    </div>
  );
};
