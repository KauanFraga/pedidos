import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import cors from "cors"; // 1. CORRIGIDO: Importação padrão (default import)

// 2. Configurando o CORS para aceitar qualquer origem
const corsHandler = cors({ origin: true });

admin.initializeApp();

interface CatalogItem {
  id: string;
  code: string;
  description: string;
  price: number;
}

interface ProcessOrderRequest {
  catalog: CatalogItem[];
  orderText: string;
  conversionInstructions?: string;
}

export const processOrderHttp = functions.https.onRequest((req, res) => {
  // 3. Envolvendo TUDO dentro do corsHandler para tratar o OPTIONS e cabeçalhos
  corsHandler(req, res, async () => {
    
    console.log('🔥 INÍCIO - processOrder chamada via onRequest');
    console.log('📋 Method:', req.method);

    // Validação de método (O cors trata o OPTIONS automaticamente, só validamos se não é POST)
    if (req.method !== 'POST') {
      res.status(405).json({ error: 'Método não permitido. Use POST.' });
      return;
    }

    const { catalog, orderText, conversionInstructions = "" } = req.body as ProcessOrderRequest;

    console.log('📦 Data recebida:', {
      catalogLength: catalog?.length,
      orderTextLength: orderText?.length,
      hasConversionInstructions: !!conversionInstructions
    });

    // Validações
    if (!catalog || !Array.isArray(catalog) || catalog.length === 0) {
      console.error('❌ Catálogo inválido');
      res.status(400).json({ error: 'Catálogo inválido ou vazio.' });
      return;
    }

    if (!orderText || typeof orderText !== "string" || orderText.trim() === "") {
      console.error('❌ Texto do pedido inválido');
      res.status(400).json({ error: 'Texto do pedido inválido.' });
      return;
    }

    try {
      console.log('🔑 Buscando API Key...');
      // @ts-ignore
      const apiKey = functions.config().gemini.apikey;

      if (!apiKey) {
        console.error('❌ Chave API não encontrada!');
        res.status(500).json({ error: 'Chave API do Gemini não configurada' });
        return;
      }

      console.log('✅ API Key encontrada:', apiKey.substring(0, 10) + '...');

      // Formato do catálogo otimizado
      const catalogString = catalog
        .map((item: CatalogItem, index: number) =>
          `Index: ${index} | Item: ${item.description} | Price: ${item.price}`
        )
        .join("\n");

      const systemInstruction = `
You are an expert sales assistant at an electrical supply store "KF Elétrica".
Your task is to map a customer's unstructured order list to our product catalog.

CRITICAL BRAND & MATERIAL KNOWLEDGE:
- Brands often abbreviated: "MG" = Margirius, "LIZ" = Tramontina Liz, "ARIA" = Tramontina Aria, "EBONY" = Margirius Preto Brilhante.
- Colors for Conduletes/Eletrodutos/Luvas/Curvas: "CZ" or "CINZA" (Grey), "BR" or "BRANCO" (White), "PT" or "PRETO" (Black), "AL" or "ALUMINIO".
- Synonyms: "TOMADA" might match "MÓDULO" or "MOD" in the catalog if a complete set isn't found.

DEFAULT ATTRIBUTES:
- CABLES/WIRES ("cabo", "fio", "flex"): If the customer DOES NOT specify a color, YOU MUST MATCH TO BLACK ("PT", "PRETO").
  Example: "100m cabo 2.5mm" -> Match to "CABO FLEX 2,5MM PT" or "PRETO".

CONTEXT & PATTERN INFERENCE (VERY IMPORTANT):
- The customer list generally follows a strict theme based on the first few items.
- BRAND INFERENCE: If the first item of a category (e.g., switches/sockets) specifies a brand (e.g., "MG" or "LIZ"), assume ALL subsequent ambiguous items in that category are the SAME BRAND.
- MATERIAL/COLOR INFERENCE: If the first item of a conduit infrastructure (e.g., "eletroduto") specifies a color/material (e.g., "PRETO", "CINZA", "ALUMINIO"), assume ALL subsequent fittings are the SAME COLOR/MATERIAL.

${conversionInstructions}

Rules:
1. Analyze the "CUSTOMER REQUEST" line by line. If a line contains delimiters like "-" or ";" with multiple items, split them.
2. For EACH item in the request, return an object in the output array in the EXACT SAME ORDER.
3. Identify the Quantity and the Product.
   - Extract number strictly. If "100m", quantity is 100.
   - If "- 1 item", quantity is 1.
   - If no quantity is found, DEFAULT TO 1.
4. Find the best matching product in the provided Catalog using fuzzy matching logic AND the Context/Pattern Inference rules above.
5. If a product is found, set "catalogIndex" to the Index provided in the catalog text.
6. If a product is NOT found in the catalog with reasonable confidence, set "catalogIndex" to -1.

Response format (JSON):
{
  "mappedItems": [
    {
      "originalRequest": "string",
      "quantity": number,
      "catalogIndex": number,
      "conversionLog": "string or null"
    }
  ]
}`;

      const prompt = `
CATALOG:
${catalogString}

CUSTOMER REQUEST:
${orderText}`;

      console.log('🤖 Chamando API do Gemini...');

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
            systemInstruction: {
              parts: [
                {
                  text: systemInstruction,
                },
              ],
            },
            generationConfig: {
              temperature: 0.2,
              topK: 40,
              topP: 0.95,
              maxOutputTokens: 8192,
              responseMimeType: "application/json",
            },
          }),
        }
      );

      console.log('📡 Status da resposta:', response.status);

      if (!response.ok) {
        const errorData = await response.text();
        console.error('❌ Erro da API Gemini:', errorData);
        res.status(500).json({ error: `Erro ao processar com IA: ${response.status}` });
        return;
      }

      const result = await response.json();
      console.log('✅ Resposta recebida da IA');
      
      const text = result.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        console.error('❌ Resposta vazia da IA');
        res.status(500).json({ error: 'Resposta vazia da IA' });
        return;
      }

      const parsedData = JSON.parse(text);
      console.log('📊 Itens mapeados:', parsedData.mappedItems?.length);

      // Mapeia os itens de volta
      const items = (parsedData.mappedItems || []).map((item: any) => {
        const isFound = item.catalogIndex !== -1 &&
          item.catalogIndex !== null &&
          catalog[item.catalogIndex];
        const catalogItem = isFound ? catalog[item.catalogIndex] : null;

        let parsedQty = parseFloat(item.quantity);
        if (isNaN(parsedQty) || parsedQty <= 0) {
          parsedQty = 1;
        }

        return {
          originalRequest: item.originalRequest,
          quantity: parsedQty,
          catalogItem: catalogItem,
          conversionLog: item.conversionLog || undefined,
        };
      });

      console.log('🎉 Processamento concluído com sucesso!');

      res.status(200).json({
        success: true,
        items: items,
      });

    } catch (error: any) {
      console.error('❌ Erro ao processar pedido:', error);
      console.error('🔍 Stack trace:', error.stack);
      res.status(500).json({
        error: 'Erro ao processar o pedido. Tente novamente.',
        details: error.message
      });
    }
  });
});