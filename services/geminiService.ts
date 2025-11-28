import { GoogleGenAI, Type } from "@google/genai";
import { CatalogItem, ProcessedResult } from "../types";
import { getConversionPromptInstructions } from "../utils/conversionRules";

// Initialize API Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const processOrderWithGemini = async (
  catalog: CatalogItem[],
  orderText: string
): Promise<ProcessedResult> => {
  
  const catalogString = catalog
    .map((item, index) => `ID:${index} | ${item.description} | R$ ${item.price}`)
    .join('\n');

  const model = "gemini-2.5-flash";
  
  const conversionInstructions = getConversionPromptInstructions();

  const systemInstruction = `
You are an expert technical sales assistant at "KF Elétrica". 
Your goal is to parse a raw customer order list and map it EXACTLY to our Product Catalog.

### 🔴 CRITICAL RULE #1: NEVER SKIP ANY ITEM
**Every single line and every distinct product mentioned MUST be in the output.**
If the user lists 10 different products, you MUST return 10 items.
Even if you can't find a match in the catalog, still create an entry with catalogIndex: -1.

### 🔴 CRITICAL RULE #2: PARSE EVERY LINE INDEPENDENTLY
Process the text line by line. Each line may contain:
- One product (e.g., "200 fio 1.5mm vermelho")
- Multiple products (e.g., "6 conector split bolt 25mm")
- Product groups with colors (e.g., "3 rolos fio 4mm (vermelho/azul/preto)")

### 📋 STEP-BY-STEP PARSING PROCESS:

**Step 1: Split by Lines**
- Read each line of the order text
- Process each line separately
- Never merge different lines into one item

**Step 2: Identify Quantities and Products**
Examples:
- "200 fio 1.5mm vermelho" → quantity: 200, product: "fio 1.5mm vermelho"
- "6 conector split bolt 25mm" → quantity: 6, product: "conector split bolt 25mm"
- "15 mts de conduite 3/4" → quantity: 15, product: "conduite 3/4"

**Step 3: Handle Color Variations**
If a line mentions multiple colors, create SEPARATE items for each:
- "3 rolos fio 4mm (vermelho/azul/preto)" → 3 separate items:
  * 1x fio 4mm vermelho
  * 1x fio 4mm azul
  * 1x fio 4mm preto

- "4 rolos cabo 2.5mm sendo 2 pretos azul e verde" → 4 separate items:
  * 2x cabo 2.5mm preto
  * 1x cabo 2.5mm azul
  * 1x cabo 2.5mm verde

**Step 4: Match Against Catalog**
Search the catalog using flexible matching:
- Ignore differences in spacing, punctuation, and case
- Match common synonyms (see below)
- Include size/specification (e.g., "1.5mm", "25mm", "3/4")
- Include color if specified

### 🔧 ELECTRICAL TERMINOLOGY & SYNONYMS

**WIRES & CABLES:**
- "fio" / "cabo" → Look for "CABO FLEX" or "FIO"
- Include size: "1.5mm", "2.5mm", "4mm", "6mm", etc.
- Include color: vermelho (VM/V), azul (AZ), preto (PT/PR), verde (VD), amarelo (AM), branco (BR)

**CONDUIT (FLEXIBLE):**
- "conduite" / "corrugado" / "mangueira flexivel" → "ELETRODUTO FLEXIVEL" / "CORRUGADO"
- Sold in: METERS or ROLLS
- Sizes: 3/4", 1", 1.1/4", etc.
- **DO NOT convert to bars** - keep as meters

**ELETRODUTO (RIGID):**
- "eletroduto" / "tubo" / "cano" / "tubo rígido" → "ELETRODUTO RIGIDO" / "PVC"
- Sold in: 3-METER BARS
- **Conversion Rule:** If user requests meters, divide by 3 and round up
  * "15m eletroduto" → 5 bars (15 ÷ 3 = 5)
  * "10m eletroduto" → 4 bars (10 ÷ 3 = 3.33 → round up to 4)

**CONNECTORS:**
- "conector split bolt" / "split bolt" / "conector parafuso" → "CONECTOR SPLIT BOLT" / "CONECTOR PARAFUSO FENDIDO"
- Include size: 25mm, 35mm, 50mm, 70mm, etc.

**CONDULETE:**
- "condulete" → "CONDULETE"
- Include size: 3/4", 1"
- Include type if specified: X, T, L, LL, C
- Include color: cinza, preta, branca

**OTHER ITEMS:**
- "terminal tubular" / "ilhós" → "TERMINAL TUBULAR" / "ILHÓS"
- "haste" / "haste aterramento" → "HASTE DE ATERRAMENTO"
- "tomada" → "TOMADA"
- "interruptor" → "INTERRUPTOR"

### 📊 OUTPUT FORMAT

Return a JSON object with property "mappedItems" (array).

Each item MUST have:
{
  "originalRequest": "The exact product description from the user's text",
  "quantity": numeric quantity,
  "catalogIndex": integer ID from catalog (or -1 if no match found),
  "conversionLog": "Explanation of any conversion (optional)"
}

### ⚠️ IMPORTANT REMINDERS:
1. **Count your output items** - they should match the number of distinct products in the input
2. **Never skip items** - even if you can't find a catalog match, include it with catalogIndex: -1
3. **Split color variations** - each color = separate item
4. **Check every line** - don't assume lines are related unless they explicitly are

${conversionInstructions}

### 📝 EXAMPLE:

Input:
"""
200 fio 1.5mm vermelho
200 fio 1.5mm azul
200 fio 1.5mm branco
200 fio 1.5mm amarelo
100 fio 2.5mm vermelho
100 fio 2.5mm azul
300 fio 2.5mm verde
200 fio 4mm vermelho
200 fio 4mm preto
200 fio 4mm azul
100 fio 6mm preto
6 conector split bolt 25mm
15 mts de conduite 3/4
2 condulete 3/4 cinza
"""

Expected Output: **14 items** (not 5!)
  `;

  const prompt = `
Product Catalog:
${catalogString}

Customer Order Text:
"""
${orderText}
"""

Parse this order carefully. Remember to include EVERY product mentioned.
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
    
    // Validate that we got all items
    const inputLines = orderText.trim().split('\n').filter(line => line.trim());
    const outputItems = data.mappedItems || [];
    
    console.log(`📊 Input lines: ${inputLines.length}, Output items: ${outputItems.length}`);
    
    if (outputItems.length < inputLines.length) {
      console.warn(`⚠️ Warning: Input has ${inputLines.length} lines but only ${outputItems.length} items were processed!`);
    }
    
    // Map to internal types
    const items = outputItems.map((item: any) => {
      const index = item.catalogIndex;
      let catalogItem = null;
      
      if (index !== -1 && typeof index === 'number' && catalog[index]) {
          catalogItem = catalog[index];
      }

      let parsedQty = parseFloat(item.quantity);
      if (isNaN(parsedQty) || parsedQty <= 0) {
         parsedQty = 1;
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
