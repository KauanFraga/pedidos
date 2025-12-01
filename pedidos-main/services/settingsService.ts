import { StoreConfig } from '../types';

const CONFIG_KEY = 'orcafacil_config';

const DEFAULT_CONFIG: StoreConfig = {
  storeName: 'ELÉTRICA PADRÃO',
  addressLine1: 'AV. PERIMETRAL, 2095 - CENTRO',
  addressLine2: 'POUSO ALEGRE-MG',
  phones: '35-3421 3654 / 4102 0262',
  whatsapp: '35-98895 7050',
  defaultSalesperson: 'KAUAN',
  nextQuoteNumber: 308,
  defaultDiscountPercent: 0
};

export const getStoreConfig = (): StoreConfig => {
  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Error loading config", e);
  }
  return DEFAULT_CONFIG;
};

export const saveStoreConfig = (config: StoreConfig) => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

export const incrementQuoteNumber = () => {
  const config = getStoreConfig();
  const next = config.nextQuoteNumber + 1;
  saveStoreConfig({ ...config, nextQuoteNumber: next });
  return next;
};