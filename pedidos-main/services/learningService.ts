import { LearnedMatch, CatalogItem } from '../types';

const STORAGE_KEY = 'kf_learned_matches';

export const cleanTextForLearning = (text: string): string => {
  return text.trim().toLowerCase();
};

export const extractDescription = (text: string): string => {
  // Utility to remove leading quantities like "10x", "100m", "5 "
  return text.replace(/^[\d.,]+\s*(?:un|cx|pc|pç|m|kg|g|l|r|rl)?\s*[-xX]?\s*/i, '').trim();
};

export const getLearnedMatches = (): LearnedMatch[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error("Error parsing learned matches", e);
    return [];
  }
};

export const saveLearnedMatch = (originalText: string, catalogItem: CatalogItem) => {
  const matches = getLearnedMatches();
  const normalizedText = cleanTextForLearning(originalText);
  
  // Remove duplicates for the same text
  const filtered = matches.filter(m => m.originalText !== normalizedText);
  
  const newMatch: LearnedMatch = {
    originalText: normalizedText,
    productId: catalogItem.id,
    productDescription: catalogItem.description,
    createdAt: new Date().toISOString()
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...filtered, newMatch]));
};

export const deleteLearnedMatch = (originalText: string) => {
  const matches = getLearnedMatches();
  const filtered = matches.filter(m => m.originalText !== originalText);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
};

export const findLearnedMatch = (text: string): string | null => {
    const matches = getLearnedMatches();
    // Normalize input text for matching (simple lowercase + trim)
    const normalized = cleanTextForLearning(text);
    const match = matches.find(m => m.originalText === normalized);
    return match ? match.productId : null;
};

// Export all learned matches as a JSON string
export const exportLearnedMatches = (): string => {
  const matches = getLearnedMatches();
  return JSON.stringify(matches, null, 2);
};

// Import matches from a JSON string (with validation)
export const importLearnedMatches = (jsonString: string): boolean => {
  try {
    const parsed = JSON.parse(jsonString);
    if (!Array.isArray(parsed)) return false;
    
    // Basic validation
    const validMatches = parsed.filter((m: any) => 
      m.originalText && m.productId && m.productDescription
    );

    if (validMatches.length === 0) return false;

    // Merge with existing, preferring new imported ones if duplicates exist
    const current = getLearnedMatches();
    const merged = [...current];

    validMatches.forEach((newItem: LearnedMatch) => {
       const existingIdx = merged.findIndex(m => m.originalText === newItem.originalText);
       if (existingIdx >= 0) {
         merged[existingIdx] = newItem;
       } else {
         merged.push(newItem);
       }
    });

    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};