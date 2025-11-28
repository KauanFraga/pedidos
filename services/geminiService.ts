<change>
<file>services/geminiService.ts</file>
<description>Enhance AI prompt to strictly enforce splitting grouped items (colors/variants) into separate line items and improve quantity distribution logic.</description>
<content><![CDATA[
import { GoogleGenAI, Type } from "@google/genai";
import { CatalogItem, ProcessedResult } from "../types";
import { getConversionPromptInstructions } from "../utils/conversionRules";

// Initialize API Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const processOrderWithGemini = async (
  catalog: CatalogItem[],
  orderText: string
): Promise<ProcessedResult> => {
  
  // Optimization: Limit context size if necessary, but keep description clear
  const catalogString = catalog
    .map((item, index) => `ID:${index} | ${item.description} | R$ ${item.price}`)
    .join('\n');

  const model = "gemini-2.5-flash";
  
  const conversionInstructions = getConversionPromptInstructions();

  const systemInstruction = `
    You are an expert technical sales assistant at "KF Elétrica". 
    Your task is to map a customer's unstructured order list to our Product Catalog.

    ### 1. CRITICAL RULE: ITEM EXPANSION & COLOR SPLITTING
    **YOU MUST SPLIT GROUPED REQUESTS INTO SEPARATE LINES.**
    If a user asks for a total quantity but lists multiple colors or types, create a separate line item for EACH color/type with the appropriate partial quantity.

    **Examples:**
    *   **Input:** "3 rolos fio 4mm (vermelho, azul, preto)"
        *   **WRONG:** 1 line "300m Fio 4mm"
        *   **CORRECT:** 
            1. "100m Fio 4mm Vermelho"
            2. "100m Fio 4mm Azul"
            3. "100m Fio 4mm Preto"
    
    *   **Input:** "4 rolos cabo 2.5 sendo 2 pretos, 1 azul e 1 verde"
        *   **CORRECT:**
            1. "200m Cabo 2.5 Preto"
            2. "100m Cabo 2.5 Azul"
            3. "100m Cabo 2.5 Verde"

    *   **Input:** "10 tomadas e 5 interruptores"
        *   **CORRECT:**
            1. "10 Tomadas"
            2. "5 Interruptores"

    ### 2. ELECTRICAL TERMINOLOGY & CONVERSION RULES (STRICT)
    
    **DISTINCTION: CONDUITE vs ELETRODUTO**
    *   **"CONDUITE"** or **"CORRUGADO"**: Refers to **Flexible/Corrugado** hose (usually yellow/orange/reinforced).
        *   *Action:* Search for "ELETRODUTO FLEXIVEL", "CORRUGADO", "MANGUEIRA".
        *   *Conversion:* Do **NOT** convert to bars. Keep as meters (or match to rolls if catalog has "Rolo").
    
    *   **"ELETRODUTO"**, **"TUBO"**, or **"CANO"**: Refers to **Rigid** bars (PVC or Metal).
        *   *Action:* Search for "ELETRODUTO RIGIDO", "ELETRODUTO PVC", "TUBO".
        *   *Conversion:* These are almost always sold in **3-METER BARS**.
        *   *Rule:* If user asks for "Meters" (e.g. "15m eletroduto"), calculate: **Quantity = CEIL(Meters / 3)**.
        *   *Example:* "15m eletroduto" -> Match "Eletroduto Rígido" -> Quantity 5 (Bars).

    **OTHER SYNONYMS:**
    *   **"SPLIT BOLT"** -> Look for **"CONECTOR"** or **"CONECTOR PARAFUSO FENDIDO"**.
    *   **"TERMINAL TUBULAR"** -> Look for **"ILHÓS"**.
    *   **"HASTE"** -> Look for **"HASTE DE ATERRAMENTO"**.
    *   **"MODULO"** -> Often referred to simply as "TOMADA" or "INTERRUPTOR" if sold separately.
    *   **"V" or "VM"** = Vermelho | **"AZ"** = Azul | **"PT"** or "PR" = Preto | **"VD"** = Verde | **"AM"** = Amarelo.

    ### 3. CATALOG MATCHING RULES
    *   **Fuzzy Match:** If the user types "cabo 2,5", match "CABO FLEX 2,5MM".
    *   **Inference:** If the line says "6 conector split bolt 25mm", look for "CONECTOR" and "25MM". Don't ignore it just because it says "split bolt".
    *   **Quantity Handling:**
        - "1 rolo" = 100m (usually). If catalog item is per meter, quantity = 100.
        - "11 rolos" = 1100m.
        - ALWAYS respect the specific colors requested.

    ### 4. OUTPUT FORMAT
    Return a JSON object with a property "mappedItems".
    Each item must have:
    - "originalRequest": The specific part of the text used (e.g. "1 rolo fio 4mm vermelho").
    - "quantity": The numeric quantity (e.g. 100 for 100m, 1 for 1 unit).
    - "catalogIndex": The ID (integer) of the matching item from the CATALOG provided above. Return -1 if NO match is found.
    - "conversionLog": A short string explaining any conversion (e.g. "Split 3 colors", "15m -> 5 barras (3m)").

    ${conversionInstructions}

    **IMPORTANT:** DO NOT SKIP ANY ITEMS. If the input implies 5 different products/colors, return 5 separate items in the array.
  `;

  const prompt = `
    Product Catalog:
    ${catalogString}

    Customer Request Raw Text:
    "${orderText}"
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
                  catalogIndex: { type: Type.INTEGER },
                  conversionLog: { type: Type.STRING, nullable: true }
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
      // Validate Index
      const index = item.catalogIndex;
      let catalogItem = null;
      
      if (index !== -1 && typeof index === 'number' && catalog[index]) {
          catalogItem = catalog[index];
      }

      // Strict Quantity Sanitization
      let parsedQty = parseFloat(item.quantity);
      if (isNaN(parsedQty) || parsedQty <= 0) {
         parsedQty = 1; // Default fallback
      }

      return {
        id: crypto.randomUUID(),
        quantity: parsedQty,
        originalRequest: item.originalRequest || "Item",
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
]]></content>
</change>
