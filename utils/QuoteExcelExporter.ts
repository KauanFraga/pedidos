import XLSX from 'xlsx-js-style';
import { QuoteItem } from '../types';

interface QuoteData {
  quoteNumber: string;
  date: string;
  time: string;
  seller: string;
  customerName: string;
  customerDoc?: string;
  customerAddress?: string;
  customerPhone?: string;
  items: QuoteItem[];
  discountAmount: number;
  discountType: 'percent' | 'value';
  paymentMethod?: string;
  observations?: string;
}

export const exportQuoteToExcel = (quote: QuoteData): string => {
  const wb = XLSX.utils.book_new();

  // --- 1. DEFINIÇÃO DE ESTILOS (Idênticos ao seu Modelo) ---
  const borderThin = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
  const borderThick = { top: { style: 'medium' }, bottom: { style: 'medium' }, left: { style: 'medium' }, right: { style: 'medium' } };

  // Título "ELÉTRICA PADRÃO"
  const sTitle = {
    font: { bold: true, sz: 18, name: 'Calibri' },
    alignment: { horizontal: 'center', vertical: 'center' }
  };

  // Endereço e Telefone (Centralizado)
  const sHeaderCenter = {
    font: { sz: 10, name: 'Arial' },
    alignment: { horizontal: 'center', vertical: 'center' }
  };

  // Cabeçalho Direito (Orçamento, Data, Vendedor)
  const sHeaderRightLabel = {
    font: { bold: true, sz: 10, name: 'Arial' },
    alignment: { horizontal: 'right', vertical: 'center' }
  };
  const sHeaderRightValue = {
    font: { sz: 10, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'center' }
  };

  // Labels do Cliente (Fundo Cinza ou Branco, Negrito, Borda fina)
  const sClientLabel = {
    font: { bold: true, sz: 9, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: { bottom: { style: 'thin' } } // Linha sublinhada igual ao modelo
  };

  const sClientValue = {
    font: { sz: 9, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: { bottom: { style: 'thin' } }
  };

  // Cabeçalho da Tabela (Azul Claro, Negrito, Bordas)
  const sTableHeader = {
    font: { bold: true, sz: 10, name: 'Arial' },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: "B4C6E7" } }, // Azul do modelo
    border: borderThin
  };

  // Dados da Tabela
  const sBodyCenter = {
    font: { sz: 10, name: 'Arial' },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: borderThin
  };
  const sBodyLeft = {
    font: { sz: 10, name: 'Arial' },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: borderThin
  };
  const sBodyMoney = {
    font: { sz: 10, name: 'Arial' },
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '#,##0.00',
    border: borderThin
  };

  // Totais
  const sTotalLabel = {
    font: { bold: true, sz: 11, name: 'Arial' },
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: "D9D9D9" } }, // Cinza do "TOTAL"
    border: borderThin
  };
  const sTotalValue = {
    font: { bold: true, sz: 11, name: 'Arial' },
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '"R$ "#,##0.00',
    fill: { fgColor: { rgb: "D9D9D9" } },
    border: borderThin
  };

  // Total Verde (Pix/Dinheiro)
  const sGreenLabel = {
    font: { bold: true, sz: 11, name: 'Arial', color: { rgb: "FF0000" } }, // Texto vermelho
    alignment: { horizontal: 'center', vertical: 'center' },
    fill: { fgColor: { rgb: "E2EFDA" } }, // Fundo Verde Claro
    border: borderThick // Borda mais grossa
  };
  const sGreenValue = {
    font: { bold: true, sz: 12, name: 'Arial', color: { rgb: "FF0000" } },
    alignment: { horizontal: 'right', vertical: 'center' },
    numFmt: '"R$ "#,##0.00',
    fill: { fgColor: { rgb: "E2EFDA" } },
    border: borderThick
  };

  // Aviso Legal (Texto Vermelho)
  const sDisclaimer = {
    font: { bold: true, sz: 8, name: 'Arial', color: { rgb: "FF0000" } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true }
  };

  // --- 2. DADOS ---
  const rows: any[][] = [];

  // Cabeçalho - Linhas 1 a 3
  rows.push([
    null, // A1 (Logo vai aqui se tiver)
    { v: "ELÉTRICA PADRÃO", s: sTitle }, 
    null, // Mesclado
    { v: "ORÇAMENTO:", s: sHeaderRightLabel },
    { v: quote.quoteNumber, s: { ...sHeaderRightValue, font: { bold: true, sz: 12 } } }
  ]);

  rows.push([
    null,
    { v: "AV. PERIMETRAL, 2095 - CENTRO - POUSO ALEGRE-MG", s: sHeaderCenter },
    null,
    { v: "DATA DE EMISSÃO:", s: sHeaderRightLabel },
    { v: `${quote.date} ${quote.time}`, s: sHeaderRightValue }
  ]);

  rows.push([
    null,
    { v: "TEL: 35-3421 3654 / 4102 0262 / WhatsApp 35-98895 7050", s: sHeaderCenter },
    null,
    { v: "VENDEDOR:", s: sHeaderRightLabel },
    { v: quote.seller, s: { ...sHeaderRightValue, font: { bold: true } } }
  ]);

  // Dados do Cliente - Linhas 4 a 8 (Imitando as linhas do Excel)
  // Layout: Label | Valor (Mesclado) | Label | Valor
  const addClientRow = (label1: string, val1: string, label2: string, val2: string) => {
    rows.push([
      { v: label1, s: sClientLabel },
      { v: val1, s: sClientValue },
      null, // Mescla B e C para o nome/endereço ficar grande? Não, no seu modelo B é grande.
      { v: label2, s: sClientLabel },
      { v: val2, s: sClientValue }
    ]);
  };

  addClientRow("NOME:", quote.customerName, "CNPJ / CPF:", quote.customerDoc || "");
  addClientRow("ENDEREÇO:", quote.customerAddress || "", "INSC. EST.", "");
  addClientRow("BAIRRO:", "", "CIDADE:", ""); // Campos em branco para preencher se quiser
  addClientRow("CEP:", "", "TEL:", quote.customerPhone || "");
  addClientRow("OBRA:", "", "SOLICITADO POR:", "");

  // Linha vazia
  rows.push([]);

  // Cabeçalho da Tabela - Linha 10
  rows.push([
    { v: "QUANT:", s: sTableHeader },
    { v: "DESCRIÇÃO DE MATERIAL", s: sTableHeader }, // Mesclar B e C
    null,
    { v: "VALOR UNI.", s: sTableHeader },
    { v: "VALOR TOTAL", s: sTableHeader }
  ]);

  // Itens
  let subtotal = 0;
  quote.items.forEach(item => {
    const total = item.quantity * item.unitPrice;
    subtotal += total;
    
    rows.push([
      { v: item.quantity, s: sBodyCenter },
      { v: item.description, s: sBodyLeft },
      null, // Mesclar B e C
      { v: item.unitPrice, s: sBodyMoney },
      { v: total, s: sBodyMoney }
    ]);
  });

  // Linhas vazias para preencher espaço (opcional, igual ao seu modelo que tem linhas em branco antes do total)
  for(let i=0; i<3; i++) {
    rows.push([
      { v: "", s: sBodyCenter }, { v: "", s: sBodyLeft }, null, { v: "", s: sBodyMoney }, { v: "", s: sBodyMoney }
    ]);
  }

  // --- TOTAIS ---
  // Cálculo do desconto
  const discountVal = quote.discountType === 'percent' 
    ? subtotal * (quote.discountAmount / 100) 
    : quote.discountAmount;
  const totalLiq = subtotal - discountVal;

  // Linha Total Bruto
  rows.push([
    null, null, null,
    { v: "TOTAL", s: sTotalLabel },
    { v: subtotal, s: sTotalValue }
  ]);

  // Linha Pix/Dinheiro (Verde)
  rows.push([
    null, null, null,
    { v: "PIX OU DINHEIRO", s: sGreenLabel },
    { v: totalLiq, s: sGreenValue }
  ]);

  // --- AVISO LEGAL ---
  rows.push([]); // Espaço
  const disclaimerRowIndex = rows.length;
  rows.push([
    { 
      v: "PREZADO CLIENTE, AO RECEBER SEU MATERIAL FAVOR CONFERIR, POIS APÓS A ENTREGA NÃO NOS RESPONSABILIZAMOS POR DIVERGÊNCIA APÓS\nMATERIAL EM LED COM 6 MESES DE GARANTIA, SOMENTE SERÁ VÁLIDA COM A APRESENTAÇÃO DESTA NOTINHA.", 
      s: sDisclaimer 
    }
  ]);

  // Assinatura
  rows.push([], [], []); // Espaços
  const signRowIndex = rows.length;
  rows.push([{ v: "ASSINATURA: __________________________________________________", s: { font: { bold: true, sz: 9, name: 'Arial' } } }]);


  // --- 3. CRIAÇÃO DA PLANILHA E MESCLAGENS ---
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Definição das Colunas (Larguras)
  ws['!cols'] = [
    { wch: 10 }, // A: Quant / Labels (Estreita)
    { wch: 45 }, // B: Descrição / Nome (Larga)
    { wch: 15 }, // C: CNPJ / Labels (Média)
    { wch: 15 }, // D: Valor Unit / Doc (Média)
    { wch: 18 }  // E: Total (Média)
  ];

  // Mesclagens (Merges)
  const merges = [
    // Cabeçalho da Empresa
    { s: { r: 0, c: 1 }, e: { r: 0, c: 2 } }, // Elétrica Padrão (B1:C1)
    { s: { r: 1, c: 1 }, e: { r: 1, c: 2 } }, // Endereço
    { s: { r: 2, c: 1 }, e: { r: 2, c: 2 } }, // Tel

    // Tabela de Itens (Mesclar Coluna B e C para a Descrição ficar larga)
    // Cabeçalho da Tabela (Linha 9, índice 9 se começar do 0)
    { s: { r: 9, c: 1 }, e: { r: 9, c: 2 } }
  ];

  // Mesclar B e C para cada linha de item
  let itemStartRow = 10;
  for (let i = 0; i < quote.items.length + 3; i++) { // +3 das linhas vazias
    merges.push({ s: { r: itemStartRow + i, c: 1 }, e: { r: itemStartRow + i, c: 2 } });
  }

  // Mesclar Aviso Legal (A até E)
  merges.push({ s: { r: disclaimerRowIndex, c: 0 }, e: { r: disclaimerRowIndex, c: 4 } });
  
  // Mesclar Assinatura
  merges.push({ s: { r: signRowIndex, c: 0 }, e: { r: signRowIndex, c: 4 } });

  ws['!merges'] = merges;

  // Adicionar à pasta de trabalho e baixar
  XLSX.utils.book_append_sheet(wb, ws, "Orçamento");
  
  // Nome do arquivo limpo
  const safeName = quote.customerName.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
  const fileName = `Orcamento_${quote.quoteNumber}_${safeName}.xlsx`;
  
  XLSX.writeFile(wb, fileName);

  return fileName;
};