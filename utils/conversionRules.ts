// ============================================================================
// REGRAS DE CONVERSÃO DO SETOR ELÉTRICO - VERSÃO CORRIGIDA
// ============================================================================
// Este arquivo centraliza TODAS as regras de negócio de conversão de unidades
// Usado em: OCR, Gemini AI, entrada manual, validação de dados
// ============================================================================

export interface ConversionRule {
  patterns: string[];
  multiplier: number | 'special';
  unit: string;
  applies_to: string[];
  excludes?: string[]; // Palavras que IMPEDEM a aplicação da regra
  description: string;
  priority: number;
  customLogic?: (text: string, quantity: number) => { newQuantity: number, newDescription: string, log: string } | null;
}

export const CONVERSION_RULES: ConversionRule[] = [
  // ========== REGRA 1: ROLOS DE FITA (CADA ROLO = 1 UNIDADE!) ==========
  {
    patterns: ['rolo', 'rolos'],
    multiplier: 1, // ⚠️ CORRIGIDO: Cada rolo de fita = 1 unidade
    unit: 'unidades',
    applies_to: ['fita isolante', 'fita auto fusao', 'fita autofusao', 'fita adesiva', 'fita silver tape', 'fita'],
    description: 'Rolos de fita: cada rolo = 1 unidade (SEM multiplicação)',
    priority: 100,
    customLogic: (text: string, quantity: number) => {
      const lowerText = text.toLowerCase();
      
      // Detecta "X rolos de fita"
      const match = lowerText.match(/(\d+)\s*rolos?\s+(de\s+)?fita/i);
      if (match) {
        const numRolos = parseInt(match[1]);
        const cleanDesc = text.replace(/\d+\s*rolos?\s+(de\s+)?/gi, '').trim();
        
        return {
          newQuantity: numRolos, // ⚠️ SEM multiplicar!
          newDescription: cleanDesc,
          log: `${numRolos} rolo${numRolos > 1 ? 's' : ''} = ${numRolos} unidade${numRolos > 1 ? 's' : ''}`
        };
      }
      
      return null;
    }
  },

  // ========== REGRA 2: ABRAÇADEIRAS/ENFORCA GATO ==========
  {
    patterns: ['abraçadeira', 'abracadeira', 'enforca gato', 'enforcagato', 'zip tie', 'lacre'],
    multiplier: 'special',
    unit: 'pacote',
    applies_to: ['nylon', 'plastico', 'plástico', ''],
    description: 'Abraçadeiras: quantidade > 10 = 1 pacote',
    priority: 90,
    customLogic: (text: string, quantity: number) => {
      const lowerText = text.toLowerCase();
      
      const hasAbraca = ['abraç', 'enforca'].some(p => lowerText.includes(p));
      
      if (hasAbraca && quantity > 10) {
        return {
          newQuantity: 1,
          newDescription: `${text} (pacote com ${quantity}un)`,
          log: `${quantity} unidades = 1 pacote de ${quantity}un`
        };
      }
      
      return null;
    }
  },

  // ========== REGRA 3: CONDUITE EM ROLOS (Kanaflex/Tigre) ==========
  {
    patterns: ['rolo', 'rolos'],
    multiplier: 50,
    unit: 'metros',
    applies_to: ['conduite', 'conduíte', 'kanaflex', 'corrugado'],
    excludes: ['condulete', 'eletroduto', 'barra'], // ⚠️ IMPORTANTE: Não confundir!
    description: '1 rolo de conduite (kanaflex/corrugado) = 50 metros',
    priority: 95,
    customLogic: (text: string, quantity: number) => {
      const lowerText = text.toLowerCase();
      
      // ⚠️ NÃO aplicar se for condulete ou eletroduto
      if (lowerText.includes('condulete') || lowerText.includes('eletroduto')) {
        return null;
      }
      
      // Detecta "X rolos de conduite"
      const match = lowerText.match(/(\d+)\s*rolos?\s+(de\s+)?(conduite|conduíte|kanaflex)/i);
      if (match) {
        const numRolos = parseInt(match[1]);
        const metrosTotais = numRolos * 50;
        
        const cleanDesc = text.replace(/\d+\s*rolos?\s+(de\s+)?/gi, '').trim();
        
        return {
          newQuantity: metrosTotais,
          newDescription: `${cleanDesc}`,
          log: `${numRolos} rolo${numRolos > 1 ? 's' : ''} × 50m = ${metrosTotais}m`
        };
      }
      
      return null;
    }
  },

  // ========== REGRA 4: ELETRODUTO - METROS → BARRAS ==========
  {
    patterns: ['metro', 'metros', 'm'],
    multiplier: 'special',
    unit: 'barras',
    applies_to: ['eletroduto', 'barra rigida', 'barra rígida', 'tubo rigido', 'tubo rígido'],
    description: 'Eletroduto: metros → barras (3m por barra)',
    priority: 88,
    customLogic: (text: string, quantity: number) => {
      const lowerText = text.toLowerCase();
      
      // Detecta "X metros de eletroduto" ou "X m de eletroduto"
      const isEletroduto = lowerText.includes('eletroduto') || 
                          lowerText.includes('barra') ||
                          lowerText.includes('tubo');
      
      if (!isEletroduto) return null;
      
      // Se já está especificado em metros, converte para barras
      const metrosMatch = lowerText.match(/(\d+)\s*(metro|metros|m)\s+(de\s+)?(eletroduto|barra)/i);
      if (metrosMatch) {
        const metros = parseInt(metrosMatch[1]);
        const barras = Math.ceil(metros / 3); // Arredonda para cima (ex: 21m = 7 barras)
        
        // Remove "X metros de" da descrição
        const cleanDesc = text.replace(/\d+\s*(metro|metros|m)\s+(de\s+)?/gi, '').trim();
        
        return {
          newQuantity: barras,
          newDescription: cleanDesc,
          log: `${metros}m ÷ 3m = ${barras} barra${barras > 1 ? 's' : ''}`
        };
      }
      
      return null;
    }
  },

  // ========== REGRA 5: CABOS/FIOS EM ROLOS ==========
  {
    patterns: ['rolo', 'rolos'],
    multiplier: 100,
    unit: 'metros',
    applies_to: ['cabo', 'fio', 'flex', 'flexível', 'flexivel', 'cordão', 'cordao', 'pp'],
    excludes: ['fita', 'conduite', 'eletroduto'], // Não confundir com fita ou conduite
    description: '1 rolo de cabo/fio = 100 metros',
    priority: 80,
    customLogic: (text: string, quantity: number) => {
      const lowerText = text.toLowerCase();
      
      // ⚠️ NÃO aplicar se for fita
      if (lowerText.includes('fita')) {
        return null;
      }
      
      // Verifica se é realmente sobre cabo/fio
      const isCabo = ['cabo', 'fio', 'flex', 'cordão', 'cordao'].some(p => lowerText.includes(p));
      
      if (!isCabo) return null;
      
      // Se quantidade é pequena (< 20), assume que são rolos
      if (quantity < 20) {
        const metrosTotais = quantity * 100;
        return {
          newQuantity: metrosTotais,
          newDescription: text,
          log: `${quantity} rolo${quantity > 1 ? 's' : ''} × 100m = ${metrosTotais}m`
        };
      }
      
      // Se quantidade é grande, já está em metros
      return null;
    }
  },

  // ========== REGRA 6: CAIXAS DE PARAFUSOS/BUCHAS (APENAS!) ==========
  {
    patterns: ['caixa', 'cx', 'caixas'],
    multiplier: 100,
    unit: 'unidades',
    applies_to: ['parafuso', 'bucha', 'prego', 'arruela', 'porca'],
    excludes: ['cm1', 'cm2', 'cm3', 'cm4', 'cm14', '4x2', '4x4', '3x3', '2x4', 'eletrica', 'elétrica', 'passagem', 'embutir', 'sobrepor'],
    description: '1 caixa de parafuso/bucha = 100 unidades',
    priority: 70,
    customLogic: (text: string, quantity: number) => {
      const lowerText = text.toLowerCase();
      
      // ⚠️ NÃO aplicar se for caixa elétrica (CM1, CM2, 4x2, etc)
      const isCaixaEletrica = ['cm1', 'cm2', 'cm3', 'cm4', 'cm14', '4x2', '4x4', '3x3', '2x4', 
                               'eletrica', 'elétrica', 'passagem', 'embutir', 'sobrepor']
        .some(term => lowerText.includes(term));
      
      if (isCaixaEletrica) {
        console.log('  ⛔ Ignorando conversão: é uma caixa elétrica, não caixa de parafusos');
        return null;
      }
      
      // Detecta "X caixas de parafuso/bucha"
      const match = lowerText.match(/(\d+)\s*(caixas?|cx)\s+(de\s+)?(parafuso|bucha|prego|arruela|porca)/i);
      if (match) {
        const numCaixas = parseInt(match[1]);
        const unidadesTotais = numCaixas * 100;
        
        const cleanDesc = text.replace(/\d+\s*(caixas?|cx)\s+(de\s+)?/gi, '').trim();
        
        return {
          newQuantity: unidadesTotais,
          newDescription: cleanDesc,
          log: `${numCaixas} caixa${numCaixas > 1 ? 's' : ''} × 100un = ${unidadesTotais}un`
        };
      }
      
      return null;
    }
  },

  // ========== REGRA 7: METROS JÁ ESPECIFICADOS ==========
  {
    patterns: ['metro', 'metros', 'm'],
    multiplier: 1,
    unit: 'metros',
    applies_to: ['cabo', 'fio', 'flex', 'conduite', 'eletroduto', 'mangueira'],
    description: 'Metros já especificados = sem conversão',
    priority: 50,
    customLogic: (text: string, quantity: number) => {
      const lowerText = text.toLowerCase();
      if (lowerText.match(/\d+\s*(metro|metros|m)\b/)) {
        return {
          newQuantity: quantity,
          newDescription: text,
          log: `Já em metros: ${quantity}m (sem conversão)`
        };
      }
      return null;
    }
  }
];

// ============================================================================
// FUNÇÃO PRINCIPAL: APLICA TODAS AS REGRAS
// ============================================================================

export interface ConversionResult {
  quantity: number;
  description: string;
  log: string | null;
  ruleApplied: string | null;
}

export function applyConversions(
  text: string, 
  quantity: number
): ConversionResult {
  
  console.log(`🔄 [CONVERSÃO] Input: qty=${quantity}, text="${text}"`);
  
  const lowerText = text.toLowerCase();
  
  // Ordena regras por prioridade (maior primeiro)
  const sortedRules = [...CONVERSION_RULES].sort((a, b) => b.priority - a.priority);
  
  for (const rule of sortedRules) {
    // Verifica se o texto contém algum padrão de unidade
    const hasPattern = rule.patterns.some(p => lowerText.includes(p));
    
    if (!hasPattern) continue;
    
    // ⚠️ NOVO: Verifica palavras de exclusão
    if (rule.excludes) {
      const hasExcludedWord = rule.excludes.some(exc => lowerText.includes(exc));
      if (hasExcludedWord) {
        console.log(`  ⛔ Regra "${rule.description}" excluída por palavra de exclusão`);
        continue;
      }
    }
    
    // Verifica se o texto é sobre um produto aplicável
    const hasProduct = rule.applies_to.length === 0 || 
                       rule.applies_to.some(p => p === '' || lowerText.includes(p));
    
    if (!hasProduct) continue;
    
    console.log(`  ✓ Regra candidata: ${rule.description} (prioridade ${rule.priority})`);
    
    // Se a regra tem lógica customizada, usa ela
    if (rule.customLogic) {
      const result = rule.customLogic(text, quantity);
      
      if (result) {
        console.log(`  ✅ Conversão aplicada: ${result.log}`);
        return {
          quantity: result.newQuantity,
          description: result.newDescription,
          log: result.log,
          ruleApplied: rule.description
        };
      }
    } 
    // Senão, usa multiplicador simples
    else if (typeof rule.multiplier === 'number') {
      if (quantity < 20) {
        const newQty = quantity * rule.multiplier;
        const log = `${quantity} ${rule.patterns[0]} × ${rule.multiplier} = ${newQty}${rule.unit === 'metros' ? 'm' : 'un'}`;
        
        console.log(`  ✅ Conversão aplicada: ${log}`);
        return {
          quantity: newQty,
          description: text,
          log,
          ruleApplied: rule.description
        };
      }
    }
  }
  
  console.log(`  ⚪ Nenhuma conversão aplicada`);
  
  return {
    quantity,
    description: text,
    log: null,
    ruleApplied: null
  };
}

// ============================================================================
// INSTRUÇÕES PARA O GEMINI (PROMPT)
// ============================================================================

export const getConversionPromptInstructions = (): string => {
  return `
REGRAS DE CONVERSÃO DE UNIDADES (APLICAR COM ATENÇÃO):

⚠️ IMPORTANTE: Produtos DIFERENTES não devem ser confundidos:
- CONDUITE = kanaflex/corrugado (mangueira corrugada) em rolos de 50m
- CONDULETE = caixinhas para emendas (LR, LL, LB, T, X, etc) - CADA UM É 1 UNIDADE
- ELETRODUTO = tubo rígido em barras de 3m (CZ, BR, zincado, preto)

${CONVERSION_RULES
  .sort((a, b) => b.priority - a.priority)
  .map(rule => {
    const excludeNote = rule.excludes 
      ? `\n   ⛔ NÃO aplicar se texto contém: ${rule.excludes.join(', ')}`
      : '';
    
    return `
${rule.priority}. ${rule.description.toUpperCase()}
   - Padrões: ${rule.patterns.map(p => `"${p}"`).join(', ')}
   - Aplica-se a: ${rule.applies_to.map(p => `"${p}"`).join(', ')}
   - Conversão: ${typeof rule.multiplier === 'number' ? `×${rule.multiplier}` : 'lógica especial'}
   - Unidade final: ${rule.unit}${excludeNote}
`;
  }).join('\n')}

EXEMPLOS PRÁTICOS:

✅ FITAS (CADA ROLO = 1 UNIDADE):
   "2 rolos de fita isolante" 
   → qty: 2, desc: "fita isolante"
   → log: "2 rolos = 2 unidades"
   ⚠️ NÃO multiplicar por 100!

✅ ABRAÇADEIRAS:
   "100 abraçadeiras de nylon" 
   → qty: 1, desc: "abraçadeira de nylon (pacote com 100un)"
   → log: "100 unidades = 1 pacote"

✅ CONDUITE (mangueira corrugada):
   "2 rolos de conduite 3/4" 
   → qty: 100, desc: "conduite 3/4"
   → log: "2 rolos × 50m = 100m"

✅ ELETRODUTO (METROS → BARRAS):
   "21 metros de eletroduto 3/4 CZ" 
   → qty: 7, desc: "eletroduto 3/4 CZ"
   → log: "21m ÷ 3m = 7 barras"
   
   "5 barras de eletroduto 3/4 CZ" 
   → qty: 5, desc: "eletroduto 3/4 CZ"
   → log: null (já está em barras, sem conversão)

✅ CAIXAS DE PARAFUSOS (APENAS!):
   "5 caixas de parafuso 6x40" 
   → qty: 500, desc: "parafuso 6x40"
   → log: "5 caixas × 100un = 500un"
   
   "5 caixa CM1" 
   → qty: 5, desc: "caixa CM1"
   → log: null (caixa elétrica, não multiplica!)

✅ CABOS/FIOS:
   "2 rolos de cabo 2.5mm" 
   → qty: 200, desc: "cabo 2.5mm"
   → log: "2 rolos × 100m = 200m"

⚠️ DIFERENÇAS CRÍTICAS:
- "2 rolos de FITA isolante" = 2 unidades (NÃO 200!)
- "2 rolos de CABO 2.5mm" = 200 metros (SIM, multiplica por 100)
- "2 rolos de CONDUITE" = 100 metros (SIM, multiplica por 50)
- "10 CONDULETE LR" = 10 unidades (cada caixinha é 1 item)
- "21 metros de ELETRODUTO" = 7 barras (converte metros → barras)
- "5 barras de ELETRODUTO" = 5 barras (mantém em barras)
- "5 CAIXA CM1" = 5 unidades (caixa elétrica, NÃO multiplica!)
- "5 caixas de PARAFUSO" = 500 unidades (caixa de parafuso, SIM multiplica!)

IMPORTANTE:
- Sempre registre a conversão no campo "conversionLog"
- Se nenhuma conversão se aplica, "conversionLog": null
- Priorize as regras pela ordem numérica
- NUNCA confunda conduite com condulete ou eletroduto
`;
};

export type { ConversionRule };