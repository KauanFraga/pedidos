import { CatalogItem } from '../types';

/**
 * This file contains local text processing functions that run before making an AI call.
 */

interface ParsedLine {
    quantity: number;
    description: string;
    conversionLog?: string;
}

/**
 * Parses the content of a catalog file (CSV) and returns an array of CatalogItem objects.
 * Assumes a CSV with columns: ID, Description, Price.
 * 
 * @param fileContent The raw string content of the CSV file.
 * @returns An array of CatalogItem.
 */
export const parseCatalogFile = (fileContent: string): CatalogItem[] => {
    const items: CatalogItem[] = [];
    const lines = fileContent.split(/\r?\n/).filter(line => line.trim() !== '');

    // Skip header line if it exists
    const startIndex = lines[0] && lines[0].toLowerCase().includes('id') ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
        const line = lines[i];
        const columns = line.split(';'); // Using semicolon as the delimiter

        if (columns.length >= 3) {
            const id = columns[0].trim();
            const description = columns[1].trim();
            // Convert price from a BRL string like "R$ 1.234,56" to a number
            const priceString = columns[2].trim().replace('R$', '').replace(/\./g, '').replace(',', '.');
            const price = parseFloat(priceString);

            if (id && description && !isNaN(price)) {
                items.push({ id, description, price });
            }
        }
    }

    return items;
};


/**
 * Pre-processes a single line of an order to extract quantity and clean up the description.
 * This logic runs locally before any AI call is made.
 * 
 * @param line The raw text line from the user's order (e.g., "150m de fio 2.5mm").
 * @returns A ParsedLine object with the extracted quantity and cleaned description.
 */
export const applyConversions = (line: string): ParsedLine => {
    let quantity = 1;
    let description = line.trim();
    let conversionLog: string | undefined = undefined;

    // Rule: Handle specific keywords like "rolo", "caixa"
    if (description.toLowerCase().includes("rolo")) {
        quantity = 100; // Standard assumption: 1 rolo = 100 metros
        description = description.replace(/rolo/ig, 'metros');
        conversionLog = "Convertido 'rolo' para 100 metros";
    }
    // Add more keyword rules here (e.g., for "caixa")

    // Rule: Extract leading numbers (e.g., "150", "2.5", "10m")
    const quantityMatch = description.match(/^\s*(\d+([.,]\d+)?)\s*(m|metros|un|unidades|peças|pc|pcs)?\s*-?\s*/i);

    if (quantityMatch) {
        // Extract the numeric value, replacing comma with dot for float conversion
        const numericValue = parseFloat(quantityMatch[1].replace(',', '.'));
        
        // If we found a number, we use it as the quantity.
        // If we previously set a quantity from a keyword (like 'rolo'), we multiply.
        // e.g., "2 rolos" -> quantityMatch is 2, quantity was 100 -> 2 * 100 = 200.
        if (quantity !== 1) {
            quantity = quantity * numericValue;
            conversionLog = `${numericValue} rolos -> ${quantity} metros`;
        } else {
            quantity = numericValue;
        }

        // Remove the extracted part from the description
        description = description.substring(quantityMatch[0].length).trim();
    }

    // Fallback in case no quantity was found at all
    if (quantity === 0) {
        quantity = 1;
    }

    return {
        quantity,
        description,
        conversionLog,
    };
};
