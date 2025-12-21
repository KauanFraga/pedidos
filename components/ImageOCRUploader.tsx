import React, { useState, useEffect } from 'react';
import { Upload, X, Loader2, CheckCircle2, Camera, AlertTriangle, Info } from 'lucide-react';

interface ImageOCRUploaderProps {
  onTextExtracted: (text: string) => void;
}

// Configurações de segurança
const MONTHLY_LIMIT = 50; // Máximo de imagens por mês
const WARNING_THRESHOLD = 40; // Avisar quando chegar em 40

interface UsageStats {
  count: number;
  month: string; // "2024-12" formato
}

export const ImageOCRUploader: React.FC<ImageOCRUploaderProps> = ({ onTextExtracted }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedText, setExtractedText] = useState('');
  const [progress, setProgress] = useState(0);
  const [usageStats, setUsageStats] = useState<UsageStats>({ count: 0, month: '' });

  // Carrega estatísticas ao abrir
  useEffect(() => {
    if (isOpen) {
      loadUsageStats();
    }
  }, [isOpen]);

  const getCurrentMonth = (): string => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  };

  const loadUsageStats = () => {
    try {
      const stored = localStorage.getItem('gemini_image_usage');
      if (stored) {
        const stats: UsageStats = JSON.parse(stored);
        const currentMonth = getCurrentMonth();
        
        // Reseta se mudou o mês
        if (stats.month !== currentMonth) {
          const newStats = { count: 0, month: currentMonth };
          localStorage.setItem('gemini_image_usage', JSON.stringify(newStats));
          setUsageStats(newStats);
        } else {
          setUsageStats(stats);
        }
      } else {
        // Primeira vez
        const newStats = { count: 0, month: getCurrentMonth() };
        localStorage.setItem('gemini_image_usage', JSON.stringify(newStats));
        setUsageStats(newStats);
      }
    } catch (error) {
      console.error('Erro ao carregar estatísticas:', error);
      setUsageStats({ count: 0, month: getCurrentMonth() });
    }
  };

  const incrementUsage = () => {
    const newStats: UsageStats = {
      count: usageStats.count + 1,
      month: getCurrentMonth()
    };
    localStorage.setItem('gemini_image_usage', JSON.stringify(newStats));
    setUsageStats(newStats);
  };

  const isLimitReached = (): boolean => {
    return usageStats.count >= MONTHLY_LIMIT;
  };

  const isNearLimit = (): boolean => {
    return usageStats.count >= WARNING_THRESHOLD && usageStats.count < MONTHLY_LIMIT;
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verifica limite ANTES de processar
    if (isLimitReached()) {
      alert(`⚠️ Limite mensal atingido!\n\nVocê processou ${MONTHLY_LIMIT} imagens este mês.\nO limite será resetado no próximo mês.\n\nAlternativa: Use o Google Lens manualmente e cole o texto.`);
      return;
    }

    if (!file.type.startsWith('image/')) {
      alert('❌ Por favor, selecione uma imagem válida (JPG, PNG, WEBP)');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('❌ Imagem muito grande! Máximo: 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const imageData = event.target?.result as string;
      setSelectedImage(imageData);
      processImageWithGemini(imageData);
    };
    reader.readAsDataURL(file);
  };

  const processImageWithGemini = async (imageData: string) => {
    setIsProcessing(true);
    setProgress(20);

    try {
      const apiKey = localStorage.getItem('gemini_api_key');
      
      if (!apiKey) {
        alert('⚠️ Configure sua chave de API do Google nas Configurações primeiro!');
        setIsProcessing(false);
        return;
      }

      const base64Image = imageData.split(',')[1];
      const mimeType = imageData.split(';')[0].split(':')[1];
      
      setProgress(40);

      const prompt = `Você é um assistente especializado em extrair informações de listas de pedidos de material elétrico.

TAREFA:
Analise a imagem e extraia APENAS a DESCRIÇÃO e QUANTIDADE de cada item.

INSTRUÇÕES IMPORTANTES:
1. IGNORE completamente: números de item, unidades (pc, kg, m, un), códigos, preços, colunas extras
2. Extraia APENAS: descrição do produto + quantidade
3. Formato de saída: "[quantidade] [descrição]" (uma linha por item)
4. Se a quantidade estiver em uma coluna separada, use esse valor exato
5. Se não houver quantidade visível, use "1"
6. Mantenha nomes dos produtos como estão escritos
7. Não adicione explicações, apenas retorne as linhas

EXEMPLOS:
Entrada: "1 | Arame farpado | pc | 5"
Saída: "5 Arame farpado"

Entrada: "Cabo flexível 2.5mm | 100m"
Saída: "100 Cabo flexível 2.5mm"

Entrada: "Tomada 20A Tramontina"
Saída: "1 Tomada 20A Tramontina"

RETORNE APENAS AS LINHAS NO FORMATO ESPECIFICADO.`;

      setProgress(60);

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType,
                    data: base64Image
                  }
                }
              ]
            }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2000,
            }
          })
        }
      );

      setProgress(80);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Erro na API: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.candidates || result.candidates.length === 0) {
        throw new Error('Nenhum texto foi extraído da imagem');
      }

      const extractedContent = result.candidates[0].content.parts[0].text;
      console.log('📝 Gemini extraiu:', extractedContent);

      const cleanedText = extractedContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .filter(line => !line.startsWith('#'))
        .filter(line => !line.startsWith('*'))
        .filter(line => !line.toLowerCase().includes('formato'))
        .filter(line => !line.toLowerCase().includes('saída:'))
        .filter(line => !line.toLowerCase().includes('entrada:'))
        .filter(line => !/^[-=_]+$/.test(line))
        .join('\n');

      console.log('✅ Texto limpo:', cleanedText);

      setExtractedText(cleanedText);
      setProgress(100);
      setIsProcessing(false);

      // Incrementa contador APENAS se sucesso
      incrementUsage();

      // Avisa se está perto do limite
      if (usageStats.count + 1 >= WARNING_THRESHOLD && usageStats.count + 1 < MONTHLY_LIMIT) {
        setTimeout(() => {
          alert(`⚠️ Aviso: Você já processou ${usageStats.count + 1} de ${MONTHLY_LIMIT} imagens este mês.\n\nRestam ${MONTHLY_LIMIT - (usageStats.count + 1)} imagens.`);
        }, 500);
      }

    } catch (error) {
      console.error('❌ Erro:', error);
      alert(`Erro ao processar imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}\n\nVerifique sua chave de API nas Configurações.`);
      setIsProcessing(false);
      setProgress(0);
    }
  };

  const handleConfirm = () => {
    if (extractedText.trim()) {
      onTextExtracted(extractedText);
      handleClose();
    } else {
      alert('⚠️ Nenhum texto foi extraído. Tente outra imagem.');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setSelectedImage(null);
    setExtractedText('');
    setIsProcessing(false);
    setProgress(0);
  };

  const getUsageColor = () => {
    if (usageStats.count >= MONTHLY_LIMIT) return 'text-red-600';
    if (usageStats.count >= WARNING_THRESHOLD) return 'text-orange-600';
    return 'text-green-600';
  };

  const getUsageBarColor = () => {
    if (usageStats.count >= MONTHLY_LIMIT) return 'bg-red-600';
    if (usageStats.count >= WARNING_THRESHOLD) return 'bg-orange-500';
    return 'bg-green-600';
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-4 rounded-lg shadow-md transition-all flex items-center justify-center gap-2"
      >
        <Camera className="w-5 h-5" />
        📷 Enviar Imagem do Pedido
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            
            <div className="bg-purple-600 text-white p-6 rounded-t-2xl sticky top-0 z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Camera className="w-6 h-6" />
                  <div>
                    <h2 className="text-xl font-bold">Upload de Imagem do Pedido</h2>
                    <p className="text-sm text-purple-200">Extração inteligente com Gemini AI</p>
                  </div>
                </div>
                <button onClick={handleClose} className="text-white hover:bg-purple-700 p-2 rounded-lg">
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Contador de uso */}
              <div className="bg-purple-700/50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Uso este mês:</span>
                  <span className={`text-sm font-bold ${getUsageColor()}`}>
                    {usageStats.count} / {MONTHLY_LIMIT}
                  </span>
                </div>
                <div className="w-full bg-purple-800 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all ${getUsageBarColor()}`}
                    style={{ width: `${Math.min((usageStats.count / MONTHLY_LIMIT) * 100, 100)}%` }}
                  />
                </div>
                {isNearLimit() && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-orange-200">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Perto do limite mensal</span>
                  </div>
                )}
                {isLimitReached() && (
                  <div className="flex items-center gap-1 mt-2 text-xs text-red-200">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Limite atingido! Reseta no próximo mês</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-6 space-y-6">
              
              {/* Info sobre custo */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-semibold mb-1">💰 Custo estimado:</p>
                    <p>Cada imagem custa ~R$ 0,001 (menos de 1 centavo)</p>
                    <p className="text-xs mt-1 text-blue-700">
                      Limite de {MONTHLY_LIMIT} imagens/mês = máximo de ~R$ 0,05/mês
                    </p>
                  </div>
                </div>
              </div>

              {/* Área de Upload */}
              {!selectedImage && (
                <div className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                  isLimitReached() 
                    ? 'border-red-300 bg-red-50 cursor-not-allowed' 
                    : 'border-purple-300 bg-purple-50 hover:bg-purple-100 cursor-pointer'
                }`}>
                  <label className={isLimitReached() ? 'cursor-not-allowed' : 'cursor-pointer'}>
                    <Upload className={`w-16 h-16 mx-auto mb-4 ${isLimitReached() ? 'text-red-400' : 'text-purple-400'}`} />
                    {isLimitReached() ? (
                      <>
                        <p className="text-lg font-semibold text-red-900 mb-2">
                          ⚠️ Limite mensal atingido
                        </p>
                        <p className="text-sm text-red-700">
                          Você processou {MONTHLY_LIMIT} imagens este mês.<br/>
                          Use o Google Lens manualmente ou aguarde o próximo mês.
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-lg font-semibold text-purple-900 mb-2">
                          Clique para selecionar uma imagem
                        </p>
                        <p className="text-sm text-purple-600 mb-3">
                          JPG, PNG ou WEBP (máx. 10MB)
                        </p>
                        <div className="bg-purple-100 border border-purple-300 rounded-lg p-3 text-xs text-purple-900 max-w-md mx-auto">
                          <p className="font-semibold mb-1">✨ A IA extrairá automaticamente:</p>
                          <ul className="text-left space-y-1">
                            <li>✅ Descrição dos produtos</li>
                            <li>✅ Quantidade de cada item</li>
                            <li>✅ Formato limpo e organizado</li>
                          </ul>
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageSelect} 
                          className="hidden"
                          disabled={isLimitReached()}
                        />
                      </>
                    )}
                  </label>
                </div>
              )}

              {selectedImage && (
                <div>
                  <p className="text-sm font-semibold text-slate-600 mb-2">Imagem carregada:</p>
                  <img src={selectedImage} alt="Preview" className="w-full max-h-96 object-contain border-2 border-slate-200 rounded-lg bg-slate-50" />
                </div>
              )}

              {isProcessing && (
                <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Loader2 className="w-6 h-6 text-purple-600 animate-spin" />
                    <p className="text-purple-900 font-semibold">Processando com Gemini AI...</p>
                  </div>
                  <div className="w-full bg-purple-200 rounded-full h-3">
                    <div className="bg-purple-600 h-3 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                  </div>
                  <p className="text-xs text-purple-700 mt-2 text-center">{progress}%</p>
                  <p className="text-xs text-purple-600 mt-2 text-center">
                    {progress < 40 && 'Preparando imagem...'}
                    {progress >= 40 && progress < 60 && 'Conectando com Gemini...'}
                    {progress >= 60 && progress < 80 && 'Analisando a imagem...'}
                    {progress >= 80 && 'Extraindo texto...'}
                  </p>
                </div>
              )}

              {extractedText && !isProcessing && (
                <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <p className="text-sm font-semibold text-green-800">✅ Texto extraído com sucesso!</p>
                  </div>
                  
                  <label className="text-xs font-semibold text-green-800 block mb-2">
                    📝 Revise e edite se necessário:
                  </label>
                  
                  <textarea
                    value={extractedText}
                    onChange={(e) => setExtractedText(e.target.value)}
                    className="w-full h-64 p-3 border-2 border-green-300 rounded-lg text-sm font-mono resize-none focus:ring-2 focus:ring-green-500 outline-none bg-white"
                    placeholder="Texto extraído aparecerá aqui..."
                  />
                  
                  <p className="text-xs text-green-700 mt-2 bg-white/70 p-2 rounded">
                    💡 Você pode editar o texto acima antes de confirmar
                  </p>
                </div>
              )}

            </div>

            <div className="bg-slate-50 p-6 rounded-b-2xl flex justify-end gap-3 border-t border-slate-200">
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              
              {extractedText && !isProcessing && (
                <button
                  onClick={handleConfirm}
                  className="px-6 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2 shadow-lg"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Usar este texto
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </>
  );
};