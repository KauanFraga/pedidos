import { CatalogItem, QuoteItem } from '../types';
import { applyConversions, getConversionPromptInstructions } from '../utils/conversionRules';

const GEMINI_API_KEY_STORAGE = 'gemini_api_key';

// ==================== GESTÃO DA CHAVE DE API ====================

export function getGeminiApiKey(): string | null {
  return localStorage.getItem(GEMINI_API_KEY_STORAGE);
}

export function setGeminiApiKey(apiKey: string): void {
  localStorage.setItem(GEMINI_API_KEY_STORAGE, apiKey);
}

export function hasGeminiApiKey(): boolean {
  return !!getGeminiApiKey();
}

// ==================== 🔧 FUNÇÃO AUXILIAR: PARSE SEGURO DE NÚMEROS ====================

function safeParseNumber(value: any, defaultValue: number = 1): number {
  // Se já for um número válido, retorna
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  
  // Se for string, tenta converter
  if (typeof value === 'string') {
    // Remove espaços e vírgulas (caso venha formato brasileiro)
    const cleaned = value.trim().replace(/,/g, '.');
    const parsed = parseFloat(cleaned);
    
    if (!isNaN(parsed) && isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }
  
  // Se falhou, retorna valor padrão
  console.warn(`⚠️ Falha ao converter "${value}" para número. Usando padrão: ${defaultValue}`);
  return defaultValue;
}

// ==================== PROCESSAMENTO COM GEMINI ====================

export async function processOrderWithGemini(
  catalog: CatalogItem[],
  orderText: string
): Promise<{ items: QuoteItem[] }> {
  
  // Verificar se tem chave configurada
  const API_KEY = getGeminiApiKey();
  
  if (!API_KEY) {
    throw new Error('⚠️ Chave de API do Gemini não configurada!\n\nVá em Configurações → Dados da Loja para adicionar sua chave gratuita.');
  }

  console.log('🤖 Iniciando processamento com Gemini 2.0...');
  console.log('📦 Catálogo:', catalog.length, 'itens');
  console.log('📝 Pedido:', orderText);

  // Preparar catálogo no formato: índice|descrição|preço
  const catalogString = catalog
    .map((item, index) => `${index}|${item.description}|R$ ${item.price.toFixed(2)}`)
    .join('\n');

  const conversionInstructions = getConversionPromptInstructions();

  // Instruções para o Gemini
  const systemInstruction = `Você é um assistente especializado em materiais elétricos da loja "KF Elétrica".

CONHECIMENTO DE MARCAS E MATERIAIS:
- Marcas: "MG" = Margirius, "LIZ" = Tramontina Liz
- Cores: "CZ"/"CINZA", "BR"/"BRANCO", "PT"/"PRETO", "AZ"/"AZUL", "VM"/"VERMELHO", "VD"/"VERDE", "AM"/"AMARELO"
- COR PADRÃO para cabos: PRETO se não especificado

CONVERSÕES DE UNIDADES:
${conversionInstructions}

REGRAS DE MAPEAMENTO:
1. Analise cada linha do pedido do cliente
2. Extraia a quantidade (padrão: 1 se não especificado)
3. Encontre o produto correspondente no catálogo usando similaridade semântica
4. Retorne o ÍNDICE do produto no catálogo (-1 se não encontrar)
5. Registre conversões aplicadas (ex: "1 rolo → 100m")

⚠️ IMPORTANTE: O campo "quantity" deve SEMPRE ser um NÚMERO VÁLIDO, nunca string ou null.

FORMATO DE RESPOSTA (JSON PURO, sem markdown):
{
  "mappedItems": [
    {
      "originalRequest": "texto exato da linha do pedido",
      "quantity": 10.5,
      "catalogIndex": 42,
      "conversionLog": "explicação da conversão ou null"
    }
  ]
}

EXEMPLO DE RESPOSTA CORRETA:
{
  "mappedItems": [
    {
      "originalRequest": "22 metros de cabo 16 azul",
      "quantity": 22,
      "catalogIndex": 15,
      "conversionLog": null
    },
    {
      "originalRequest": "2 rolos de cabo 2.5mm preto",
      "quantity": 200,
      "catalogIndex": 8,
      "conversionLog": "2 rolos × 100m = 200m"
    }
  ]
}

IMPORTANTE:
- Retorne APENAS o JSON, sem texto adicional
- Se não encontrar produto, use catalogIndex: -1
- O campo "quantity" DEVE ser um número (ex: 10, 22.5, 100)
- NUNCA use string para quantity (ex: "10" está ERRADO, use 10)
- Seja preciso na identificação`;

  const prompt = `CATÁLOGO DISPONÍVEL (formato: índice|descrição|preço):
${catalogString}

PEDIDO DO CLIENTE:
${orderText}

Analise o pedido e retorne o JSON com os itens mapeados.`;

  try {
    console.log('📡 Enviando requisição para Gemini 2.0 API...');
    
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { 
          "Content-Type": "application/json" 
        },
        body: JSON.stringify({
          contents: [{ 
            parts: [{ 
              text: systemInstruction + "\n\n" + prompt 
            }] 
          }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          }
        })
      }
    );

    console.log('📥 Status da resposta:', response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Erro na API do Gemini:', errorData);
      
      if (response.status === 400) {
        throw new Error('🔑 Chave de API inválida ou expirada.\n\nVerifique sua chave nas Configurações ou gere uma nova em:\naistudio.google.com/app/apikey');
      }
      if (response.status === 404) {
        throw new Error('❌ Modelo não encontrado.\n\nSua chave pode não ter acesso ao Gemini 2.0.\n\nTente gerar uma nova chave em:\naistudio.google.com/app/apikey');
      }
      if (response.status === 429) {
        throw new Error('⏱️ Limite de requisições atingido.\n\nAguarde alguns minutos e tente novamente.');
      }
      if (response.status === 403) {
        throw new Error('🚫 Acesso negado.\n\nVerifique se sua chave de API está correta.');
      }
      
      throw new Error(`Erro na API do Gemini: ${response.status}`);
    }

    const result = await response.json();
    console.log('📊 Resposta completa da API:', result);

    // Validação robusta da resposta
    if (!result.candidates || result.candidates.length === 0) {
      console.error('❌ Resposta sem candidates:', result);
      throw new Error('Resposta vazia da IA. Tente novamente.');
    }

    const candidate = result.candidates[0];
    
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      console.error('❌ Candidate sem content:', candidate);
      throw new Error('Resposta sem conteúdo. Tente novamente.');
    }

    const text = candidate.content.parts[0].text;
    console.log('📝 Texto extraído da resposta:', text);

    if (!text) {
      throw new Error('Texto vazio na resposta da IA.');
    }

    // Parse do JSON
    let data;
    try {
      // Limpar possível markdown (```json ... ```)
      const cleanedText = text.replace(/```json\n?|\n?```/g, '').trim();
      data = JSON.parse(cleanedText);
    } catch (parseError) {
      console.error('❌ Erro ao fazer parse do JSON:', parseError);
      console.error('📄 Texto recebido:', text);
      throw new Error('Resposta da IA em formato inválido. Tente novamente.');
    }

    console.log('✅ JSON parseado com sucesso:', data);

    // Validação da estrutura
    if (!data.mappedItems || !Array.isArray(data.mappedItems)) {
      console.error('❌ Estrutura inválida:', data);
      throw new Error('Formato de resposta inválido.');
    }

    // 🔧 PROCESSAMENTO CORRIGIDO COM VALIDAÇÃO ROBUSTA
    const items: QuoteItem[] = data.mappedItems.map((item: any, index: number) => {
      console.log(`\n🔍 Processando item ${index + 1}:`, item);
      
      // 1. Validar e converter índice do catálogo
      const catalogIndex = parseInt(item.catalogIndex);
      const isFound = catalogIndex !== -1 && 
                      catalogIndex >= 0 && 
                      catalogIndex < catalog.length;
      
      const catalogItem = isFound ? catalog[catalogIndex] : null;
      
      // 2. 🔧 CONVERSÃO SEGURA DA QUANTIDADE
      let quantity = safeParseNumber(item.quantity, 1);
      console.log(`  📊 Quantidade inicial: ${quantity} (tipo: ${typeof item.quantity})`);
      
      let conversionLog = item.conversionLog || '';

      // 3. Aplicar conversões locais adicionais se necessário
      if (item.originalRequest) {
        const conversion = applyConversions(item.originalRequest, quantity);
        if (conversion.log) {
          quantity = conversion.quantity; // Usar a quantidade já convertida
          console.log(`  🔄 Após conversão: ${quantity}`);
          
          // Combinar logs se houver
          conversionLog = conversionLog 
            ? `${conversionLog}; ${conversion.log}` 
            : conversion.log;
        }
      }

      // 4. Validação final: garantir que quantity é um número válido
      if (isNaN(quantity) || !isFinite(quantity) || quantity <= 0) {
        console.warn(`  ⚠️ Quantidade inválida detectada: ${quantity}. Usando padrão: 1`);
        quantity = 1;
      }

      console.log(`  ✅ Quantidade final: ${quantity}`);
      console.log(`  📦 Produto: ${catalogItem?.description || 'NÃO ENCONTRADO'}`);

      return {
        id: crypto.randomUUID(),
        quantity,
        originalRequest: item.originalRequest || 'Item desconhecido',
        catalogItem,
        isLearned: false,
        conversionLog: conversionLog || undefined
      };
    });

    console.log('\n🎉 Processamento concluído com sucesso!');
    console.log('📊 Total de itens processados:', items.length);
    console.log('✅ Itens encontrados:', items.filter(i => i.catalogItem).length);
    console.log('❌ Itens não encontrados:', items.filter(i => !i.catalogItem).length);
    
    // 🔧 LOG DETALHADO DAS QUANTIDADES
    console.log('\n📋 Resumo das quantidades:');
    items.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.originalRequest}: ${item.quantity} ${item.catalogItem ? '✅' : '❌'}`);
    });

    return { items };

  } catch (error: any) {
    console.error('❌ Erro completo no processamento:', error);
    
    // Tratamento de erros específicos
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('🌐 Erro de conexão.\n\nVerifique sua internet e tente novamente.');
    }
    
    if (error instanceof SyntaxError) {
      throw new Error('⚠️ Erro ao processar resposta da IA.\n\nTente novamente.');
    }
    
    // Re-throw com mensagem original se já for um erro tratado
    throw error;
  }
}