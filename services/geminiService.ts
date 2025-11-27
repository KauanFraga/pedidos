
import { GoogleGenAI, Type } from "@google/genai";
import { CatalogItem, ProcessedResult, QuoteItem } from "../types";
import { applyConversions } from "../utils/parser";

// Initialize API Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Memoize the catalog string to avoid re-computing it on every call
let catalogStringCache: string | null = null;
let catalogVersion: number = 0;

const getCatalogString = (catalog: CatalogItem[]): string => {
    if (catalogStringCache && catalog.length === catalogVersion) {
        return catalogStringCache;
    }
    console.log("Re-generating catalog string...");
    catalogVersion = catalog.length;
    catalogStringCache = catalog
        .map((item, index) => `Index: ${index} | Item: ${item.description} | Price: ${item.price}`)
        .join('\n');
    return catalogStringCache;
};


/**
 * Processes a full, unstructured order text using a hybrid approach.
 * It preprocesses the text locally and uses AI only for the fuzzy matching part.
 * @param catalog The complete product catalog.
 * @param orderText The user's raw input text.
 * @returns A promise that resolves to the processed quote.
 */
export const processOrderHybrid = async (
    catalog: CatalogItem[],
    orderText: string
): Promise<ProcessedResult> => {
    
    const lines = orderText.split('\n').filter(line => line.trim() !== '');
    const processedItems: QuoteItem[] = [];

    for (const line of lines) {
        // 1. Pre-process locally
        const { quantity, description, conversionLog } = applyConversions(line);

        // 2. Use AI for the complex part: matching description to catalog
        const catalogIndex = await findBestMatchForProduct(description, catalog);
        
        const isFound = catalogIndex !== -1 && catalog[catalogIndex];
        const catalogItem = isFound ? catalog[catalogIndex] : null;

        processedItems.push({
            id: crypto.randomUUID(),
            quantity: quantity,
            originalRequest: line,
            catalogItem: catalogItem,
            conversionLog: conversionLog
        });
    }

    return { items: processedItems };
};


/**
 * Uses AI to find the best matching product in the catalog for a given description.
 * This function is optimized to be called multiple times in a loop.
 * @param productDescription The clean product description (e.g., "interruptor simples 10a").
 * @param catalog The complete product catalog.
 * @returns The index of the best match in the catalog, or -1 if not found.
 */
export const findBestMatchForProduct = async (
    productDescription: string,
    catalog: CatalogItem[]
): Promise<number> => {

    const catalogString = getCatalogString(catalog);
    const model = "gemini-1.5-flash"; 

    const systemInstruction = `
        You are a specialized search engine for an electrical supply store's product catalog.
        Your ONLY task is to find the single best match for a given product description in the provided catalog.
        - You must return the "Index" of the matching item.
        - The user's query may contain typos or be abbreviated. Use fuzzy matching.
        - If no reasonably close match is found, you MUST return -1.
        - Respond ONLY with the JSON object. Do not add any conversational text or markdown.

        CRITICAL KNOWLEDGE FOR ACCURATE MATCHING:
        - **Distinction**: "ELETRODUTO" (rigid pipe), "CONDULETE" (junction box), and "CONDUÍTE" (flexible hose) are DIFFERENT items. Do not match them for each other.
        - **Brands**: "MG" = Margirius, "LIZ" = Tramontina Liz, "ARIA" = Tramontina Aria.
        - **Synonyms**: "TOMADA" can match "MÓDULO TOMADA". "TERMINAL TUBULAR" is the same as "ILHÓS".
        - **Default Color**: For cables/wires, if no color is specified, default to BLACK ("PT", "PRETO").
    `;

    const prompt = `
        CATALOG:
        ${catalogString}

        PRODUCT DESCRIPTION:
        "${productDescription}"
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
                        catalogIndex: {
                            type: Type.INTEGER,
                            description: "The catalog index of the best match, or -1."
                        }
                    },
                    required: ["catalogIndex"]
                }
            }
        });

        const data = JSON.parse(response.text);
        return data.catalogIndex;

    } catch (error) {
        console.error("Gemini Matching Error for:", productDescription, error);
        return -1; // Return -1 on error to avoid breaking the entire loop
    }
};
