
const QUOTE_NUMBER_KEY = 'orcafacil_quote_number';

// Default start number if not set
const DEFAULT_START = 308;

export const getNextQuoteNumber = (): number => {
  try {
    const stored = localStorage.getItem(QUOTE_NUMBER_KEY);
    return stored ? parseInt(stored) : DEFAULT_START;
  } catch {
    return DEFAULT_START;
  }
};

export const incrementQuoteNumber = () => {
  const current = getNextQuoteNumber();
  localStorage.setItem(QUOTE_NUMBER_KEY, (current + 1).toString());
  return current + 1;
};
