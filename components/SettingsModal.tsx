import React, { useState, useEffect } from 'react';
import { X, Key, Check, AlertCircle, Loader } from 'lucide-react';
import { validateApiKey, testApiKey } from '../services/geminiService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose }) => {
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [showKey, setShowKey] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const savedKey = localStorage.getItem('gemini_api_key') || '';
      setApiKey(savedKey);
      setIsSaved(false);
      setTestResult(null);
    }
  }, [isOpen]);

  const handleSave = () => {
    if (!apiKey.trim()) {
      alert('Por favor, insira uma chave de API válida.');
      return;
    }

    if (!validateApiKey(apiKey)) {
      alert('A chave de API parece inválida. Verifique se copiou corretamente.');
      return;
    }

    localStorage.setItem('gemini_api_key', apiKey.trim());
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleTestKey = async () => {
    if (!apiKey.trim()) {
      alert('Por favor, insira uma chave de API primeiro.');
      return;
    }

    setIsTestingKey(true);
    setTestResult(null);

    const isValid = await testApiKey(apiKey);
    
    setIsTestingKey(false);
    setTestResult(isValid ? 'success' : 'error');
    
    setTimeout(() => setTestResult(null), 5000);
  };

  const handleClear = () => {
    if (confirm('Tem certeza que deseja remover a chave de API?')) {
      localStorage.removeItem('gemini_api_key');
      setApiKey('');
      setIsSaved(false);
      setTestResult(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-auto">
        
        {/* Header */}
        <div className="sticky top-0 bg-slate-50 border-b border-slate-200 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Key className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Configurações</h2>
              <p className="text-sm text-slate-500">Configure sua chave de API do Google AI Studio</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2">Como obter sua chave de API:</h3>
            <ol className="text-sm text-blue-800 space-y-1 list-decimal list-inside">
              <li>Acesse <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-blue-600">Google AI Studio</a></li>
              <li>Faça login com sua conta Google</li>
              <li>Clique em "Get API Key" ou "Create API Key"</li>
              <li>Copie a chave gerada e cole abaixo</li>
            </ol>
          </div>

          {/* API Key Input */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              Chave de API do Google Gemini
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full px-4 py-3 pr-24 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-sm font-mono"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded transition-colors"
              >
                {showKey ? 'Ocultar' : 'Mostrar'}
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleSave}
              disabled={!apiKey.trim()}
              className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-5 h-5" />
              Salvar Chave
            </button>
            
            <button
              onClick={handleTestKey}
              disabled={!apiKey.trim() || isTestingKey}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isTestingKey ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <Key className="w-5 h-5" />
                  Testar Chave
                </>
              )}
            </button>
            
            {apiKey && (
              <button
                onClick={handleClear}
                className="px-4 py-3 border border-red-300 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-semibold"
              >
                Limpar
              </button>
            )}
          </div>

          {/* Feedback Messages */}
          {isSaved && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800 font-medium">
                Chave de API salva com sucesso! Você já pode processar orçamentos.
              </p>
            </div>
          )}

          {testResult === 'success' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
              <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800 font-medium">
                ✓ Chave de API válida! Funcionando perfeitamente.
              </p>
            </div>
          )}

          {testResult === 'error' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <div className="text-sm text-red-800">
                <p className="font-medium mb-1">✗ Chave de API inválida ou com problemas.</p>
                <p className="text-xs">Verifique se copiou corretamente ou se a chave está ativa no Google AI Studio.</p>
              </div>
            </div>
          )}

          {/* Additional Info */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h4 className="font-semibold text-slate-700 mb-2 text-sm">ℹ️ Informações importantes:</h4>
            <ul className="text-xs text-slate-600 space-y-1 list-disc list-inside">
              <li>A chave é armazenada apenas no seu navegador (localStorage)</li>
              <li>Nunca compartilhe sua chave de API com terceiros</li>
              <li>O Google AI Studio oferece uso gratuito com limites de requisições</li>
              <li>Se atingir o limite, aguarde ou crie uma nova chave</li>
            </ul>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
