// Regras de conversão do setor elétrico

export interface ConversionRule {
    patterns: string[];
    multiplier: number;
    unit: string;
    applies_to: string[];
    description: string;
}
  
export const CONVERSION_RULES: ConversionRule[] = [
    {
        patterns: ['rolo', 'rolos'],
        multiplier: 100,
        unit: 'metros',
        applies_to: ['cabo', 'fio', 'flex', 'cordão', 'cordao'],
        description: '1 rolo = 100 metros'
    },
    {
        patterns: ['caixa', 'cx', 'caixas'],
        multiplier: 100, // Padrão mais comum para parafusos/buchas pequenos
        unit: 'unidades',
        applies_to: ['parafuso', 'bucha', 'prego'],
        description: '1 caixa = 100 unidades (padrão)'
    }
];

// Gera o texto de instrução para o Prompt do Gemini
export const getConversionPromptInstructions = (): string => {
    return `
    UNIT CONVERSION RULES (STRICT):
    The system must automatically convert specific units based on electrical industry standards:
    ${CONVERSION_RULES.map(rule => 
        `- IF request contains "${rule.patterns.join('" or "')}" AND product matches "${rule.applies_to.join('" or "')}" THEN multiply quantity by ${rule.multiplier}. Log this as "${rule.description}".`
    ).join('\n    ')}
    
    EXAMPLES:
    - "1 rolo de cabo 2.5mm" -> quantity: 100, conversionLog: "1 rolo = 100m"
    - "2 rolos de fio 4mm" -> quantity: 200, conversionLog: "2 rolos = 200m"
    - "100 metros de cabo" -> quantity: 100, conversionLog: null (no conversion needed)
    `;
};

// Função auxiliar para uso client-side se necessário (híbrido)
export function applyConversions(text: string, quantity: number): { newQuantity: number, log: string | undefined } {
    const lowerText = text.toLowerCase();
    
    for (const rule of CONVERSION_RULES) {
      // Verifica se o texto contém algum padrão de unidade
      const hasPattern = rule.patterns.some(p => lowerText.includes(p));
      // Verifica se o texto é sobre um produto aplicável
      const hasProduct = rule.applies_to.some(p => lowerText.includes(p));
      
      if (hasPattern && hasProduct) {
        // Se a quantidade for pequena (ex: 1, 2, 3), assume que são rolos/caixas
        // Se for grande (ex: 100, 200), assume que o cliente já digitou em metros
        if (quantity < 20) { 
             return { 
                 newQuantity: quantity * rule.multiplier,
                 log: `${quantity} ${rule.patterns[0]} = ${quantity * rule.multiplier}${rule.unit === 'metros' ? 'm' : 'un'}`
             };
        }
      }
    }
    
    return { newQuantity: quantity, log: undefined };
}