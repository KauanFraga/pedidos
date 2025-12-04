import { GoogleGenAI, Type } from "@google/genai";
import { CatalogItem, ProcessedResult } from "../types";
import { getConversionPromptInstructions } from "../utils/conversionRules";

// DEBUG - Verificar variáveis de ambiente
console.log("🔍 GEMINI DEBUG - INÍCIO");
console.log("Todas as env vars:", import.meta.env);
console.log("VITE_GEMINI_API_KEY:", import.meta.env.VITE_GEMINI_API_KEY);
console.log("Chave existe?", !!import.meta.env.VITE_GEMINI_API_KEY);
console.log("Começa com AIza?", import.meta.env.VITE_GEMINI_API_KEY?.startsWith("AIza"));
console.log("Tamanho da chave:", import.meta.env.VITE_GEMINI_API_KEY?.length);
console.log("🔍 GEMINI DEBUG - FIM");

// Initialize API Client com variável de ambiente do Vite
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

// Validação da API Key
if (!apiKey) {
  console.error("❌ ERRO: VITE_GEMINI_API_KEY não está configurada no arquivo .env");
  console.error("Adicione a linha: VITE_GEMINI_API_KEY=sua-chave-aqui");
} else {
  console.log("✅ API Key do Gemini carregada com sucesso!");
}

const ai = new GoogleGenAI({ apiKey: apiKey || "PLACEHOLDER" });

export const processOrderWithGemini = async (
  catalog: CatalogItem[],
  orderText: string
): Promise<ProcessedResult> => {
  
  // Validação adicional antes de fazer a requisição
  if (!apiKey) {
    throw new Error("Chave de API do Gemini não configurada. Adicione VITE_GEMINI_API_KEY no arquivo .env");
  }
  
  // Optimization: If catalog is huge, we might need to truncate or use a retrieval tool.
  const catalogString = catalog
    .map((item, index) => `Index: ${index} | Item: ${item.description} | Price: ${item.price}`)
    .join('\n');

  const model = "gemini-2.5-flash";
  
  const conversionInstructions = getConversionPromptInstructions();

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
      * Example: If Item 1 is "Placa 4x2 MG", and Item 2 is just "Interruptor Simples", you MUST match Item 2 to a "MG" product.
    - MATERIAL/COLOR INFERENCE: If the first item of a conduit infrastructure (e.g., "eletroduto") specifies a color/material (e.g., "PRETO", "CINZA", "ALUMINIO"), assume ALL subsequent fittings (curvas, luvas, buchas) are the SAME COLOR/MATERIAL.
      * Example: If Item 1 is "Eletroduto 3/4 Preto", and Item 2 is "Curva 90", you MUST match Item 2 to a "Preto" product.

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
  `;

  const prompt = `
    CATALOG:
    ${catalogString}

    CUSTOMER REQUEST:
    ${orderText}
  `;

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mappedItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  originalRequest: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  catalogIndex: { type: Type.INTEGER, description: "Index from catalog if found, -1 if not found" },
                  conversionLog: { type: Type.STRING, description: "Explanation if unit conversion was applied (e.g., '1 rolo = 100m'), otherwise null" }
                },
                required: ["originalRequest", "quantity", "catalogIndex"]
              }
            }
          }
        }
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from Gemini");

    const data = JSON.parse(text);
    
    // Map back to internal types
    const items = (data.mappedItems || []).map((item: any) => {
      // Check if index is valid and not -1
      const isFound = item.catalogIndex !== -1 && item.catalogIndex !== null && catalog[item.catalogIndex];
      const catalogItem = isFound ? catalog[item.catalogIndex] : null;

      // Strict Quantity Sanitization
      let parsedQty = parseFloat(item.quantity);
      if (isNaN(parsedQty) || parsedQty <= 0) {
         parsedQty = 1; // Default fallback
      }

      return {
        id: crypto.randomUUID(),
        quantity: parsedQty,
        originalRequest: item.originalRequest,
        catalogItem: catalogItem,
        conversionLog: item.conversionLog || undefined
      };
    });

    return {
      items: items
    };

  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
};