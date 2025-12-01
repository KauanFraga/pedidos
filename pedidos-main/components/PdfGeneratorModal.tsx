
import React, { useState, useEffect } from 'react';
import { QuoteItem, StoreConfig, PdfCustomerData } from '../types';
import { getStoreConfig, incrementQuoteNumber } from '../services/settingsService';
import { formatCurrency } from '../utils/parser';
import { FileText, X, Download, AlertCircle } from 'lucide-react';

interface PdfGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: QuoteItem[];
  prefilledCustomerName?: string;
  totalValue: number;
}

declare global {
    interface Window {
        html2pdf: any;
    }
}

export const PdfGeneratorModal: React.FC<PdfGeneratorModalProps> = ({ 
  isOpen, 
  onClose, 
  items, 
  prefilledCustomerName,
  totalValue 
}) => {
  const [storeConfig, setStoreConfig] = useState<StoreConfig>(getStoreConfig());
  const [loading, setLoading] = useState(false);
  const [quoteNumber, setQuoteNumber] = useState(storeConfig.nextQuoteNumber);
  const [salesperson, setSalesperson] = useState(storeConfig.defaultSalesperson);
  
  // PDF Data
  const [customer, setCustomer] = useState<PdfCustomerData>({
      name: prefilledCustomerName || '',
      address: '',
      neighborhood: '',
      city: '',
      zip: '',
      phone: '',
      // Fix: Added whatsapp field which is required in PdfCustomerData
      whatsapp: '',
      constructionSite: '',
      cpfCnpj: '',
      stateRegistration: '',
      requestedBy: ''
  });

  // Calculate discount
  const [discountPercent, setDiscountPercent] = useState(0);
  const discountValue = totalValue * (discountPercent / 100);
  const finalTotal = totalValue - discountValue;

  useEffect(() => {
    if (isOpen) {
        const config = getStoreConfig();
        setStoreConfig(config);
        setQuoteNumber(config.nextQuoteNumber);
        setSalesperson(config.defaultSalesperson);
        setCustomer(prev => ({ ...prev, name: prefilledCustomerName || '' }));
    }
  }, [isOpen, prefilledCustomerName]);

  const handleInputChange = (field: keyof PdfCustomerData, value: string) => {
    setCustomer(prev => ({ ...prev, [field]: value }));
  };

  const generatePdf = () => {
    setLoading(true);

    const element = document.getElementById('invoice-content');
    if (!element) return;
    
    // Show hidden element for capture
    element.style.display = 'block';

    const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const safeName = customer.name.replace(/[^a-zA-Z0-9]/g, '_') || 'cliente';
    const filename = `orcamento_${quoteNumber}_${safeName}_${dateStr}.pdf`;

    const opt = {
        margin: [5, 5, 5, 5], // 5mm margin
        filename: filename,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    window.html2pdf().set(opt).from(element).save().then(() => {
        // Cleanup and close
        element.style.display = 'none';
        setLoading(false);
        incrementQuoteNumber(); // Auto increment for next time
        onClose();
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-blue-800">
             <FileText className="w-6 h-6" />
             <h2 className="text-xl font-bold">Gerar PDF do Orçamento</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Form Input Section */}
                <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 border-b pb-2 mb-4">1. Dados do Cliente</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Nome</label>
                            <input type="text" value={customer.name} onChange={e => handleInputChange('name', e.target.value)} className="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">CNPJ / CPF</label>
                            <input type="text" value={customer.cpfCnpj} onChange={e => handleInputChange('cpfCnpj', e.target.value)} className="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Insc. Est.</label>
                            <input type="text" value={customer.stateRegistration} onChange={e => handleInputChange('stateRegistration', e.target.value)} className="w-full p-2 border rounded text-sm" />
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-slate-500 uppercase">Endereço</label>
                            <input type="text" value={customer.address} onChange={e => handleInputChange('address', e.target.value)} className="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Bairro</label>
                            <input type="text" value={customer.neighborhood} onChange={e => handleInputChange('neighborhood', e.target.value)} className="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Cidade</label>
                            <input type="text" value={customer.city} onChange={e => handleInputChange('city', e.target.value)} className="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">CEP</label>
                            <input type="text" value={customer.zip} onChange={e => handleInputChange('zip', e.target.value)} className="w-full p-2 border rounded text-sm" />
                        </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Telefone</label>
                            <input type="text" value={customer.phone} onChange={e => handleInputChange('phone', e.target.value)} className="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Obra</label>
                            <input type="text" value={customer.constructionSite} onChange={e => handleInputChange('constructionSite', e.target.value)} className="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Solicitado Por</label>
                            <input type="text" value={customer.requestedBy} onChange={e => handleInputChange('requestedBy', e.target.value)} className="w-full p-2 border rounded text-sm" />
                        </div>
                    </div>

                    <h3 className="font-bold text-slate-700 border-b pb-2 mb-4 mt-6">2. Detalhes do Orçamento</h3>
                    <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Nº Orçamento</label>
                            <input type="number" value={quoteNumber} onChange={e => setQuoteNumber(parseInt(e.target.value))} className="w-full p-2 border rounded text-sm font-mono font-bold bg-slate-50" />
                        </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Vendedor</label>
                            <input type="text" value={salesperson} onChange={e => setSalesperson(e.target.value)} className="w-full p-2 border rounded text-sm" />
                        </div>
                         <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Desconto à vista (%)</label>
                            <input type="number" value={discountPercent} onChange={e => setDiscountPercent(parseFloat(e.target.value))} className="w-full p-2 border rounded text-sm" />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-slate-500 uppercase">Total à Vista</label>
                            <div className="w-full p-2 border rounded text-sm bg-green-50 text-green-700 font-bold">
                                {formatCurrency(finalTotal)}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Preview / Instruction Area */}
                <div className="flex flex-col gap-4">
                     <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                        <h4 className="flex items-center gap-2 text-blue-800 font-bold mb-2">
                            <AlertCircle className="w-5 h-5" /> Sobre o PDF
                        </h4>
                        <p className="text-sm text-blue-700 mb-2">
                            O PDF será gerado seguindo rigorosamente o layout padrão "Elétrica Padrão":
                        </p>
                        <ul className="list-disc list-inside text-xs text-blue-600 space-y-1">
                            <li>Cabeçalho com logo e dados da loja</li>
                            <li>Tabela de clientes com bordas</li>
                            <li>Lista de produtos zebrada (cinza/branco)</li>
                            <li>Rodapé com totais e garantia</li>
                        </ul>
                     </div>

                     <div className="flex-1 bg-slate-200 rounded-lg flex items-center justify-center border border-slate-300 min-h-[200px]">
                         <p className="text-slate-500 font-medium">O PDF será baixado automaticamente</p>
                     </div>
                </div>
            </div>
        </div>

        <div className="p-6 border-t border-slate-100 bg-white flex justify-end gap-3">
           <button 
             onClick={onClose}
             className="px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors font-medium"
           >
             Cancelar
           </button>
           <button 
             onClick={generatePdf}
             disabled={loading}
             className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 font-bold shadow-md disabled:opacity-70 disabled:cursor-not-allowed"
           >
             {loading ? 'Gerando...' : 'Baixar PDF'}
             {!loading && <Download className="w-5 h-5" />}
           </button>
        </div>
      </div>

      {/* 
          HIDDEN PRINT TEMPLATE 
          This section is hidden from view but used by html2pdf to generate the file.
          Styles are inline to ensure perfect rendering in the PDF.
      */}
      <div 
        id="invoice-content" 
        style={{
            display: 'none', // Hidden by default
            width: '210mm',
            minHeight: '297mm',
            padding: '10mm',
            backgroundColor: 'white',
            fontFamily: 'Arial, sans-serif',
            fontSize: '12px',
            color: '#000',
            lineHeight: '1.2'
        }}
      >
        {/* HEADER TABLE */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '5px' }}>
            <tbody>
                <tr>
                    {/* LOGO AREA */}
                    <td style={{ width: '25%', padding: '10px', borderRight: '1px solid #000', verticalAlign: 'middle', textAlign: 'center' }}>
                        {/* Use logo if provided, otherwise generic text icon */}
                        {storeConfig.logoUrl ? (
                            <img src={storeConfig.logoUrl} alt="Logo" style={{ maxWidth: '100%', maxHeight: '60px' }} />
                        ) : (
                            <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#B45309' }}>
                                <span style={{ fontSize: '40px', display: 'block' }}>⚡</span>
                                Elétrica Padrão
                            </div>
                        )}
                    </td>
                    
                    {/* CENTER INFO AREA */}
                    <td style={{ width: '50%', padding: '5px', textAlign: 'center', verticalAlign: 'middle' }}>
                        <div style={{ fontSize: '20px', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '5px' }}>
                            {storeConfig.storeName}
                        </div>
                        <div style={{ fontSize: '11px', fontWeight: 'bold' }}>
                            {storeConfig.addressLine1}
                            <br/>
                            {storeConfig.addressLine2}
                            <br/>
                            TEL: {storeConfig.phones}
                            <br/>
                            WhatsApp: {storeConfig.whatsapp}
                        </div>
                    </td>

                    {/* RIGHT INFO AREA */}
                    <td style={{ width: '25%', padding: '5px', borderLeft: '1px solid #000', verticalAlign: 'top' }}>
                        <div style={{ marginBottom: '5px' }}>
                            <span style={{ fontWeight: 'bold' }}>ORÇAMENTO:</span> 
                            <span style={{ float: 'right', fontSize: '14px' }}>{quoteNumber}</span>
                        </div>
                        <div style={{ marginBottom: '5px', borderBottom: '1px solid #000' }}></div>
                        <div style={{ marginBottom: '5px' }}>
                            <span style={{ fontWeight: 'bold' }}>DATA DE EMISSÃO:</span>
                            <br/>
                            {new Date().toLocaleString('pt-BR')}
                        </div>
                         <div style={{ marginBottom: '5px', borderBottom: '1px solid #000' }}></div>
                         <div>
                            <span style={{ fontWeight: 'bold' }}>VENDEDOR:</span>
                            <span style={{ textTransform: 'uppercase', fontWeight: 'bold', float: 'right' }}>{salesperson}</span>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        {/* CUSTOMER TABLE */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', marginBottom: '5px', fontSize: '11px' }}>
            <tbody>
                <tr>
                    <td style={{ padding: '3px 5px', borderBottom: '1px solid #000', width: '60%' }}>
                        <span style={{ fontWeight: 'bold' }}>NOME:</span> {customer.name}
                    </td>
                    <td style={{ padding: '3px 5px', borderBottom: '1px solid #000', borderLeft: '1px solid #000' }}>
                        <span style={{ fontWeight: 'bold' }}>CNPJ/ CPF:</span> {customer.cpfCnpj}
                    </td>
                </tr>
                <tr>
                    <td style={{ padding: '3px 5px', borderBottom: '1px solid #000' }}>
                        <span style={{ fontWeight: 'bold' }}>ENDEREÇO:</span> {customer.address}
                    </td>
                    <td style={{ padding: '3px 5px', borderBottom: '1px solid #000', borderLeft: '1px solid #000' }}>
                        <span style={{ fontWeight: 'bold' }}>INSC. EST.:</span> {customer.stateRegistration}
                    </td>
                </tr>
                <tr>
                    <td style={{ padding: '3px 5px', borderBottom: '1px solid #000' }}>
                        <span style={{ fontWeight: 'bold' }}>BAIRRO:</span> {customer.neighborhood}
                    </td>
                    <td style={{ padding: '3px 5px', borderBottom: '1px solid #000', borderLeft: '1px solid #000' }}>
                        <span style={{ fontWeight: 'bold' }}>CIDADE:</span> {customer.city}
                    </td>
                </tr>
                 <tr>
                    <td style={{ padding: '3px 5px', borderBottom: '1px solid #000' }}>
                        <span style={{ fontWeight: 'bold' }}>CEP:</span> {customer.zip}
                    </td>
                    <td style={{ padding: '3px 5px', borderBottom: '1px solid #000', borderLeft: '1px solid #000' }}>
                        <span style={{ fontWeight: 'bold' }}>TEL:</span> {customer.phone}
                    </td>
                </tr>
                 <tr>
                    <td style={{ padding: '3px 5px' }}>
                        <span style={{ fontWeight: 'bold' }}>OBRA:</span> {customer.constructionSite}
                    </td>
                    <td style={{ padding: '3px 5px', borderLeft: '1px solid #000' }}>
                        <span style={{ fontWeight: 'bold' }}>SOLICITADO POR:</span> {customer.requestedBy}
                    </td>
                </tr>
            </tbody>
        </table>

        {/* ITEMS TABLE HEADER */}
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #000', fontSize: '11px' }}>
            <thead>
                <tr style={{ backgroundColor: '#60a5fa' }}> {/* Specific Blue Header */}
                    <th style={{ border: '1px solid #000', padding: '4px', width: '10%', textAlign: 'center' }}>QUANT.</th>
                    <th style={{ border: '1px solid #000', padding: '4px', width: '60%', textAlign: 'center' }}>DESCRIÇÃO DE MATERIAL</th>
                    <th style={{ border: '1px solid #000', padding: '4px', width: '15%', textAlign: 'center' }}>VALOR UNI.</th>
                    <th style={{ border: '1px solid #000', padding: '4px', width: '15%', textAlign: 'center' }}>VALOR TOTAL</th>
                </tr>
            </thead>
            <tbody>
                {items.map((item, index) => {
                    const desc = item.catalogItem ? item.catalogItem.description : item.originalRequest;
                    const price = item.catalogItem ? item.catalogItem.price : 0;
                    const subtotal = item.quantity * price;
                    const isEven = index % 2 === 0;

                    return (
                        <tr key={index} style={{ backgroundColor: isEven ? '#e2e8f0' : '#ffffff' }}> {/* Zebrado (Slate-200 / White) */}
                            <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'center' }}>{item.quantity}</td>
                            <td style={{ border: '1px solid #000', padding: '3px', paddingLeft: '8px' }}>{desc}</td>
                            <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right', paddingRight: '8px' }}>
                                {item.catalogItem ? formatCurrency(price) : '-'}
                            </td>
                            <td style={{ border: '1px solid #000', padding: '3px', textAlign: 'right', paddingRight: '8px' }}>
                                {item.catalogItem ? formatCurrency(subtotal) : '-'}
                            </td>
                        </tr>
                    );
                })}
                {/* Fill empty rows if list is short to make it look like a full page invoice (Optional aesthetic) */}
                {Array.from({ length: Math.max(0, 15 - items.length) }).map((_, i) => (
                     <tr key={`empty-${i}`} style={{ height: '22px' }}>
                        <td style={{ border: '1px solid #000' }}></td>
                        <td style={{ border: '1px solid #000' }}></td>
                        <td style={{ border: '1px solid #000' }}></td>
                        <td style={{ border: '1px solid #000' }}></td>
                    </tr>
                ))}
            </tbody>
        </table>
        
        {/* FOOTER TOTALS */}
        <div style={{ marginTop: '0', border: '1px solid #000', borderTop: 'none', display: 'flex', justifyContent: 'flex-end' }}>
             <table style={{ width: '40%', borderCollapse: 'collapse', fontSize: '12px' }}>
                 <tbody>
                     <tr>
                         <td style={{ padding: '5px', textAlign: 'right', fontWeight: 'bold', borderRight: '1px solid #000', backgroundColor: '#e2e8f0' }}>TOTAL</td>
                         <td style={{ padding: '5px', textAlign: 'right', fontWeight: 'bold', width: '120px' }}>{formatCurrency(totalValue)}</td>
                     </tr>
                     <tr style={{ borderTop: '1px solid #000' }}>
                         <td style={{ padding: '5px', textAlign: 'right', fontWeight: 'bold', borderRight: '1px solid #000', color: 'red', backgroundColor: '#e2e8f0' }}>
                             {discountPercent > 0 ? `À VISTA (${discountPercent}%)` : 'À VISTA / PIX'}
                         </td>
                         <td style={{ padding: '5px', textAlign: 'right', fontWeight: 'bold', color: 'red' }}>
                             {formatCurrency(finalTotal)}
                         </td>
                     </tr>
                 </tbody>
             </table>
        </div>

        {/* DISCLAIMER / FOOTER TEXT */}
        <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '10px', fontWeight: 'bold' }}>
            <p style={{ margin: '5px 0' }}>
                Observação: PREZADO CLIENTE, AO RECEBER SEU MATERIAL FAVOR CONFERIR, POIS APÓS A ENTREGA NÃO NOS RESPONSABILIZAMOS POR DIVERGENCIA APÓS A ENTREGA.
            </p>
            <p style={{ margin: '5px 0', color: 'red', fontSize: '12px' }}>
                MATERIAL EM LED COM 6 MESES DE GARANTIA, SOMENTE SERÁ VALIDA COM A APRESENTAÇÃO DESTA NOTINHA.
            </p>
        </div>

        <div style={{ marginTop: '30px', fontSize: '11px' }}>
            ASSINATURA: _______________________________________________________
        </div>

      </div>
    </div>
  );
};