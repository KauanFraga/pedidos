import React, { useState } from 'react';
import { Upload, FileSpreadsheet, CheckCircle2, AlertTriangle, X } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExcelImporterProps {
  onImport: (items: ImportedItem[]) => void;
  onClose: () => void;
}

interface ImportedItem {
  quantity: number;
  description: string;
  unitPrice: number;
}

export const ExcelImporter: React.FC<ExcelImporterProps> = ({ onImport, onClose }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewData, setPreviewData] = useState<ImportedItem[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Valida tipo de arquivo
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      alert('❌ Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
      return;
    }

    setIsProcessing(true);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      
      // Pega a primeira planilha
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      // Converte para JSON
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      
      console.log('📊 Dados brutos do Excel:', jsonData);

      // Processa os dados
      const items = parseExcelData(jsonData);
      
      console.log('✅ Itens processados:', items);

      if (items.length === 0) {
        alert('⚠️ Nenhum item válido encontrado na planilha.\n\nVerifique se a planilha contém:\n- Coluna de quantidade\n- Coluna de descrição');
        setIsProcessing(false);
        return;
      }

      setPreviewData(items);
      setShowPreview(true);
      setIsProcessing(false);

    } catch (error) {
      console.error('❌ Erro ao processar Excel:', error);
      alert('Erro ao processar arquivo Excel. Verifique o formato do arquivo.');
      setIsProcessing(false);
    }
  };

  const parseExcelData = (data: any[][]): ImportedItem[] => {
    if (data.length === 0) return [];

    const items: ImportedItem[] = [];
    
    // Encontra a linha de cabeçalho
    let headerRowIndex = -1;
    let quantityColIndex = -1;
    let descriptionColIndex = -1;
    let priceColIndex = -1;

    // Procura pelo cabeçalho (primeiras 10 linhas)
    for (let i = 0; i < Math.min(10, data.length); i++) {
      const row = data[i];
      if (!row) continue;

      for (let j = 0; j < row.length; j++) {
        const cell = String(row[j] || '').toLowerCase();
        
        // Detecta coluna de quantidade
        if (cell.includes('quant') || cell.includes('qtd') || cell === 'qt.' || cell === 'qtde') {
          quantityColIndex = j;
          headerRowIndex = i;
        }
        
        // Detecta coluna de descrição
        if (cell.includes('descrição') || cell.includes('descricao') || 
            cell.includes('produto') || cell.includes('material') || cell.includes('item')) {
          descriptionColIndex = j;
          headerRowIndex = i;
        }
        
        // Detecta coluna de preço (opcional)
        if (cell.includes('valor') || cell.includes('preço') || cell.includes('preco') || 
            cell.includes('unitário') || cell.includes('unitario')) {
          priceColIndex = j;
        }
      }

      // Se encontrou pelo menos quantidade e descrição, para
      if (quantityColIndex >= 0 && descriptionColIndex >= 0) {
        break;
      }
    }

    console.log('📌 Colunas detectadas:', {
      headerRow: headerRowIndex,
      quantity: quantityColIndex,
      description: descriptionColIndex,
      price: priceColIndex
    });

    // Se não encontrou cabeçalho, tenta detectar pela estrutura dos dados
    if (headerRowIndex === -1) {
      // Assume primeira linha como cabeçalho
      headerRowIndex = 0;
      
      // Tenta detectar pela posição comum
      // Geralmente: Qtde (coluna 0 ou 1), Descrição (coluna mais longa), Valor (última coluna numérica)
      for (let j = 0; j < data[0]?.length || 0; j++) {
        const sampleValues = data.slice(1, 6).map(row => row[j]);
        
        // Se maioria são números pequenos (< 1000), provavelmente é quantidade
        const numericCount = sampleValues.filter(v => !isNaN(Number(v)) && Number(v) < 1000).length;
        if (numericCount >= 3 && quantityColIndex === -1) {
          quantityColIndex = j;
        }
        
        // Se maioria são textos longos, provavelmente é descrição
        const textCount = sampleValues.filter(v => String(v).length > 10).length;
        if (textCount >= 3 && descriptionColIndex === -1) {
          descriptionColIndex = j;
        }
      }
    }

    // Processa as linhas de dados
    const startRow = headerRowIndex + 1;
    
    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      let quantity = 1;
      let description = '';
      let unitPrice = 0;

      // Extrai quantidade
      if (quantityColIndex >= 0 && row[quantityColIndex] !== undefined) {
        const qtyValue = row[quantityColIndex];
        const qtyNum = typeof qtyValue === 'number' ? qtyValue : parseFloat(String(qtyValue).replace(',', '.'));
        if (!isNaN(qtyNum) && qtyNum > 0) {
          quantity = qtyNum;
        }
      }

      // Extrai descrição
      if (descriptionColIndex >= 0 && row[descriptionColIndex]) {
        description = String(row[descriptionColIndex]).trim();
      } else {
        // Fallback: pega a primeira célula com texto longo
        for (let j = 0; j < row.length; j++) {
          const cellValue = String(row[j] || '').trim();
          if (cellValue.length > 5 && isNaN(Number(cellValue))) {
            description = cellValue;
            break;
          }
        }
      }

      // Extrai preço (opcional)
      if (priceColIndex >= 0 && row[priceColIndex] !== undefined) {
        const priceValue = row[priceColIndex];
        const priceNum = typeof priceValue === 'number' ? priceValue : parseFloat(String(priceValue).replace(',', '.'));
        if (!isNaN(priceNum) && priceNum >= 0) {
          unitPrice = priceNum;
        }
      }

      // Valida se tem pelo menos descrição
      if (description.length >= 3) {
        // Ignora linhas de totais/rodapé
        const descLower = description.toLowerCase();
        if (descLower.includes('total') || descLower.includes('subtotal') || 
            descLower.includes('desconto') || descLower.includes('valor') ||
            descLower.includes('pix') || descLower.includes('cartão') ||
            descLower.includes('garantia') || descLower.includes('assinatura')) {
          continue;
        }

        items.push({
          quantity,
          description,
          unitPrice
        });
      }
    }

    return items;
  };

  const handleConfirmImport = () => {
    onImport(previewData);
    onClose();
  };

  const formatCurrency = (value: number): string => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileSpreadsheet className="w-7 h-7" />
            <div>
              <h2 className="text-2xl font-bold">Importar Planilha Excel</h2>
              <p className="text-sm text-green-100">Selecione seu arquivo .xlsx ou .xls</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white hover:bg-green-600 p-2 rounded-lg">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          
          {!showPreview ? (
            <>
              {/* Upload Area */}
              <div className="border-2 border-dashed border-green-300 rounded-xl p-12 text-center bg-green-50 hover:bg-green-100 transition-colors cursor-pointer mb-6">
                <label className="cursor-pointer">
                  <Upload className="w-16 h-16 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-semibold text-green-900 mb-2">
                    Clique para selecionar planilha Excel
                  </p>
                  <p className="text-sm text-green-700 mb-4">
                    Formatos aceitos: .xlsx, .xls
                  </p>
                  
                  {isProcessing && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-600"></div>
                      <span className="text-sm text-green-800 font-semibold">Processando...</span>
                    </div>
                  )}
                  
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={isProcessing}
                  />
                </label>
              </div>

              {/* Instruções */}
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Como preparar sua planilha:
                </h3>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>✅ Tenha uma coluna com <strong>QUANTIDADE</strong> (qtd, quant, quantidade)</li>
                  <li>✅ Tenha uma coluna com <strong>DESCRIÇÃO</strong> do produto</li>
                  <li>✅ Opcionalmente, uma coluna com <strong>VALOR UNITÁRIO</strong></li>
                  <li>✅ Remova linhas de cabeçalho duplicadas ou totais no final</li>
                </ul>
              </div>
            </>
          ) : (
            <>
              {/* Preview dos dados */}
              <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <h3 className="font-bold text-green-900">
                    ✅ {previewData.length} itens encontrados na planilha
                  </h3>
                </div>
                <p className="text-sm text-green-800">
                  Revise os itens abaixo antes de importar. Você poderá editar depois.
                </p>
              </div>

              {/* Tabela de Preview */}
              <div className="border-2 border-slate-200 rounded-xl overflow-hidden max-h-[400px] overflow-y-auto mb-6">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
                      <th className="p-3 text-left font-bold text-slate-700 w-20">QTDE</th>
                      <th className="p-3 text-left font-bold text-slate-700">DESCRIÇÃO</th>
                      <th className="p-3 text-right font-bold text-slate-700 w-32">VALOR UN.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.map((item, index) => (
                      <tr key={index} className="hover:bg-slate-50">
                        <td className="p-3 text-center font-semibold">{item.quantity}</td>
                        <td className="p-3">{item.description}</td>
                        <td className="p-3 text-right font-semibold text-green-600">
                          {item.unitPrice > 0 ? formatCurrency(item.unitPrice) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {previewData.some(item => item.unitPrice === 0) && (
                <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4 mb-6">
                  <p className="text-sm text-yellow-900">
                    ⚠️ <strong>Alguns itens não têm preço.</strong> Você precisará adicionar os preços manualmente após importar.
                  </p>
                </div>
              )}

              {/* Botões */}
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowPreview(false);
                    setPreviewData([]);
                  }}
                  className="px-6 py-3 bg-white border-2 border-slate-300 text-slate-700 rounded-lg font-semibold hover:bg-slate-50"
                >
                  Voltar
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 flex items-center gap-2 shadow-lg"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Importar {previewData.length} itens
                </button>
              </div>
            </>
          )}

        </div>

      </div>
    </div>
  );
};