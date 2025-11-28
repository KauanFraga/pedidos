
import React, { useState, useEffect } from 'react';
import { QuoteItem, StoreConfig, PdfCustomerData } from '../types';
import { incrementQuoteNumber, getStoreConfig } from '../services/settingsService';
import { formatCurrency } from '../utils/parser';
import { X, Printer, User, FileText, Settings, Download, CreditCard, MessageCircle, Edit3 } from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: QuoteItem[];
  totalValue: number;
}

declare global {
    interface Window {
        html2pdf: any;
    }
}

export const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, items, totalValue }) => {
  // State for Form
  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerWhatsapp, setCustomerWhatsapp] = useState('');
  const [customerDoc, setCustomerDoc] = useState(''); // CPF/CNPJ
  const [salesperson, setSalesperson] = useState('KAUAN');
  const [discountPercent, setDiscountPercent] = useState(0);
  const [quoteNumber, setQuoteNumber] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('À VISTA');
  const [observations, setObservations] = useState(''); // New State
  const [isGenerating, setIsGenerating] = useState(false);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);

  // Initialize data on open
  useEffect(() => {
    if (isOpen) {
      const config = getStoreConfig();
      setStoreConfig(config);
      setQuoteNumber(config.nextQuoteNumber);
      setSalesperson(config.defaultSalesperson);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const discountValue = totalValue * (discountPercent / 100);
  const finalTotal = totalValue - discountValue;

  // Helper to generate PDF promise
  const generatePdfFile = (): Promise<void> => {
    return new Promise((resolve, reject) => {
        const element = document.getElementById('printable-invoice');
        if (!element) {
            alert("Erro ao encontrar o elemento do orçamento.");
            reject();
            return;
        }

        setIsGenerating(true);

        const dateStr = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
        const safeName = customerName.replace(/[^a-zA-Z0-9]/g, '_') || 'cliente';
        const filename = `orcamento_${quoteNumber}_${safeName}_${dateStr}.pdf`;

        const opt = {
            margin: 0, 
            filename: filename,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        if (window.html2pdf) {
            window.html2pdf().set(opt).from(element).save().then(() => {
                resolve();
            }).catch((err: any) => {
                console.error("Erro ao gerar PDF", err);
                alert("Erro ao gerar PDF.");
                reject();
            }).finally(() => {
                setIsGenerating(false);
            });
        } else {
            window.print();
            resolve();
            setIsGenerating(false);
        }
    });
  };

  const handlePrint = () => {
      generatePdfFile().then(() => {
          incrementQuoteNumber();
          setQuoteNumber(prev => prev + 1);
      });
  };

  const formatPhone = (value: string) => {
    return value
      .replace(/\D/g, '')
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const handleWhatsappChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomerWhatsapp(formatPhone(e.target.value));
  };

  const handleSendWhatsApp = () => {
    const phone = customerWhatsapp.replace(/\D/g, '');
    if (!phone) {
        alert("Por favor, preencha o WhatsApp do cliente.");
        return;
    }

    // 1. Generate/Download PDF first so user has it ready
    generatePdfFile().then(() => {
        // 2. Open WhatsApp with the requested message
        const message = `Segue anexo do orçamento solicitado. Quaisquer dúvidas ficamos à disposição.`;
        
        const url = `https://wa.me/55${phone}?text=${encodeURIComponent(message)}`;
        
        // Increment quote number since we essentially "issued" it
        incrementQuoteNumber();
        setQuoteNumber(prev => prev + 1);

        // Alert user to attach file
        setTimeout(() => {
            alert("O PDF foi baixado! Agora, basta anexá-lo na conversa do WhatsApp que foi aberta.");
            window.open(url, '_blank');
        }, 1000);
    });
  };

  const paymentOptions = [
      "À VISTA",
      "PIX",
      "1X CRÉDITO",
      "2X CRÉDITO",
      "3X CRÉDITO",
      "DÉBITO",
      "BOLETO",
      "BOLETO 7 DIAS",
      "BOLETO 15 DIAS",
      "BOLETO 30 DIAS",
      "BOLETO 30/45 DIAS",
      "BOLETO 30/60 DIAS",
      "BOLETO 30/60/90"
  ];

  const config = storeConfig || getStoreConfig();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white print:static">
      
      {/* --- UI CONTAINER (Hidden on Print) --- */}
      <div className="bg-white w-full max-w-6xl rounded-xl shadow-2xl flex flex-col md:flex-row overflow-hidden max-h-[90vh] print:hidden">
        
        {/* LEFT SIDE: CONTROLS */}
        <div className="w-full md:w-1/3 bg-slate-50 p-6 border-r border-slate-200 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Dados do Orçamento
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nome do Cliente</label>
              <input 
                type="text" 
                value={customerName} 
                onChange={e => setCustomerName(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="Ex: João Silva"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Endereço / Bairro</label>
              <input 
                type="text" 
                value={customerAddress} 
                onChange={e => setCustomerAddress(e.target.value)}
                className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                placeholder="Rua, Número - Bairro"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Telefone</label>
                <input 
                  type="text" 
                  value={customerPhone} 
                  onChange={e => setCustomerPhone(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">WhatsApp (Enviar)</label>
                <input 
                  type="text" 
                  value={customerWhatsapp} 
                  onChange={handleWhatsappChange}
                  placeholder="(35) 99999-9999"
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-green-500 outline-none" 
                />
              </div>
            </div>
            
            <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">CPF / CNPJ</label>
                <input 
                  type="text" 
                  value={customerDoc} 
                  onChange={e => setCustomerDoc(e.target.value)}
                  className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" 
                />
            </div>

            <hr className="border-slate-200" />

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Nº Orçamento</label>
                <input 
                  type="number" 
                  value={quoteNumber} 
                  onChange={e => setQuoteNumber(parseInt(e.target.value))}
                  className="w-full p-2 border rounded bg-slate-100 font-mono font-bold" 
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Vendedor</label>
                <input 
                  type="text" 
                  value={salesperson} 
                  onChange={e => setSalesperson(e.target.value)}
                  className="w-full p-2 border rounded uppercase" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Condição Pagamento</label>
                    <div className="relative">
                        <input 
                            list="payment-options"
                            value={paymentMethod}
                            onChange={(e) => setPaymentMethod(e.target.value)}
                            className="w-full p-2 border rounded uppercase text-sm"
                            placeholder="Selecione ou digite"
                        />
                        <datalist id="payment-options">
                            {paymentOptions.map(opt => <option key={opt} value={opt} />)}
                        </datalist>
                    </div>
                </div>
                <div>
                    <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Desconto (%)</label>
                    <input 
                        type="number" 
                        value={discountPercent} 
                        onChange={e => setDiscountPercent(parseFloat(e.target.value))}
                        className="w-full p-2 border rounded text-sm" 
                    />
                </div>
            </div>

            {/* NEW OBSERVATIONS FIELD */}
            <div className="mt-2">
                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Observações</label>
                <textarea 
                    value={observations}
                    onChange={e => setObservations(e.target.value)}
                    className="w-full p-2 border rounded text-sm h-20 resize-none focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Digite observações para o orçamento..."
                />
            </div>
            
            <div className="bg-blue-50 p-2 rounded border border-blue-100 text-center mt-4">
                <span className="text-xs text-blue-600 font-bold block">TOTAL FINAL</span>
                <span className="text-xl font-bold text-blue-800">{formatCurrency(finalTotal)}</span>
            </div>

          </div>

          <div className="mt-8 pt-4 border-t border-slate-200 flex gap-2">
            <button 
              onClick={handlePrint}
              disabled={isGenerating}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-wait text-white font-bold py-3 px-2 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 text-sm"
            >
              {isGenerating ? (
                  <>Gerando PDF...</>
              ) : (
                  <>
                    <Printer className="w-5 h-5" />
                    Salvar PDF
                  </>
              )}
            </button>

            <button 
              onClick={handleSendWhatsApp}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-2 rounded-lg flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 text-sm"
            >
               <MessageCircle className="w-5 h-5" />
               Enviar Zap
            </button>
          </div>
          <p className="text-center text-xs text-slate-400 mt-2">
              Na janela de impressão, escolha "Salvar como PDF"
          </p>
        </div>

        {/* RIGHT SIDE: LIVE PREVIEW (Also visible on Print) */}
        <div className="w-full md:w-2/3 bg-slate-200 p-8 overflow-y-auto flex justify-center">
          
          {/* --- PRINTABLE PAGE --- */}
          <div 
            id="printable-invoice" 
            className="bg-white shadow-xl print:shadow-none w-[210mm] min-h-[297mm] p-[10mm] text-black font-sans text-[12px] leading-tight relative"
            style={{ color: '#000000' }} // Enforce black text at container level
          >
            <style>{`
              @media print {
                @page { size: A4; margin: 0; }
                body { background-color: white; color: #000 !important; }
                #printable-invoice { width: 100%; min-height: 100vh; box-shadow: none; margin: 0; padding: 10mm; }
                /* Hide everything that is NOT the invoice */
                body > *:not(#printable-invoice) { display: none; }
                /* Ensure this modal structure allows printing just the child */
                .fixed { position: static; overflow: visible; background: white; }
                .md\\:w-1\\/3 { display: none; }
                .md\\:w-2\\/3 { width: 100%; padding: 0; background: white; overflow: visible; }
                .overflow-y-auto { overflow: visible !important; }
              }
              .invoice-box { border: 1px solid #000; }
              .invoice-header { background-color: #f1f5f9; border-bottom: 1px solid #000; }
              .invoice-row { border-bottom: 1px solid #ccc; }
              .invoice-col { border-right: 1px solid #000; padding: 4px; }
              .invoice-col:last-child { border-right: none; }
              .invoice-table th { background-color: #3b82f6; color: white; border: 1px solid #000; padding: 5px; text-align: center; font-size: 11px; }
              .invoice-table td { border: 1px solid #000; padding: 4px; font-size: 11px; color: #000 !important; }
              .invoice-table tr:nth-child(even) { background-color: #f8fafc; }
            `}</style>

            {/* HEADER */}
            <div className="invoice-box mb-4" style={{ borderColor: '#000' }}>
              <div className="flex">
                {/* Logo / Store Name */}
                <div className="w-[35%] p-2 border-r border-black flex flex-col items-center justify-center text-center">
                   {/* Optimized for the specific "Elétrica Padrão" Logo (Wide Format) */}
                   {config.logoUrl ? (
                      <div className="w-full h-[80px] flex items-center justify-center overflow-hidden">
                        <img 
                          src={config.logoUrl} 
                          alt="Logo" 
                          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
                        />
                      </div>
                   ) : (
                      <div style={{ fontWeight: 'bold', fontSize: '18px', color: '#B45309' }}>
                          <span style={{ fontSize: '40px', display: 'block' }}>⚡</span>
                          Elétrica Padrão
                      </div>
                   )}
                </div>

                {/* Store Details */}
                <div className="w-[35%] p-2 text-center flex flex-col justify-center text-[10px] font-bold" style={{ color: '#000' }}>
                    <div className="uppercase" style={{ fontSize: '12px' }}>{config.storeName}</div>
                    <div className="uppercase">{config.addressLine1}</div>
                    <div className="uppercase">{config.addressLine2}</div>
                    <div className="mt-1">TEL: {config.phones}</div>
                    <div className="mt-1" style={{ color: '#15803d' }}>WhatsApp: {config.whatsapp}</div>
                </div>

                {/* Quote Details */}
                <div className="w-[30%] border-l border-black p-2 flex flex-col justify-between">
                    <div className="flex justify-between font-bold border-b border-black pb-1" style={{ color: '#000' }}>
                        <span>ORÇAMENTO:</span>
                        <span style={{ color: '#dc2626', fontSize: '18px' }}>{quoteNumber}</span>
                    </div>
                    <div className="py-1" style={{ color: '#000' }}>
                        <span className="font-bold">DATA:</span> {new Date().toLocaleDateString('pt-BR')}
                    </div>
                    <div className="pt-1 border-t border-black font-bold" style={{ color: '#000' }}>
                        VENDEDOR: <span className="uppercase float-right">{salesperson}</span>
                    </div>
                </div>
              </div>
            </div>

            {/* CUSTOMER INFO */}
            <div className="invoice-box mb-4 text-[11px]" style={{ borderColor: '#000' }}>
              <div className="flex border-b border-black">
                <div className="w-2/3 p-1 border-r border-black" style={{ color: '#000' }}>
                  <span className="font-bold">CLIENTE:</span> {customerName}
                </div>
                <div className="w-1/3 p-1" style={{ color: '#000' }}>
                  <span className="font-bold">CPF/CNPJ:</span> {customerDoc}
                </div>
              </div>
              <div className="flex border-b border-black">
                <div className="w-2/3 p-1 border-r border-black" style={{ color: '#000' }}>
                  <span className="font-bold">ENDEREÇO:</span> {customerAddress}
                </div>
                <div className="w-1/3 p-1" style={{ color: '#000' }}>
                  <span className="font-bold">TEL:</span> {customerPhone}
                </div>
              </div>
            </div>

            {/* ITEMS TABLE */}
            <table className="w-full invoice-table mb-4 border-collapse">
              <thead>
                <tr>
                  <th className="w-12">QTD</th>
                  <th className="text-left">DESCRIÇÃO DOS PRODUTOS</th>
                  <th className="w-24 text-right">UNITÁRIO</th>
                  <th className="w-24 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                   const desc = item.catalogItem ? item.catalogItem.description : item.originalRequest;
                   const unit = item.catalogItem ? item.catalogItem.price : 0;
                   const total = item.quantity * unit;
                   const isEven = idx % 2 === 0;

                   return (
                     <tr key={idx} style={{ backgroundColor: isEven ? '#e2e8f0' : '#ffffff' }}> {/* Zebrado (Slate-200 / White) */}
                       <td className="text-center font-bold" style={{ color: '#000' }}>{item.quantity}</td>
                       <td className="uppercase px-2" style={{ color: '#000' }}>{desc}</td>
                       <td className="text-right" style={{ color: '#000' }}>{item.catalogItem ? formatCurrency(unit) : '-'}</td>
                       <td className="text-right font-medium" style={{ color: '#000' }}>{formatCurrency(total)}</td>
                     </tr>
                   );
                })}
                {/* Empty rows to fill space if needed */}
                {items.length < 10 && Array.from({ length: 10 - items.length }).map((_, i) => (
                  <tr key={`empty-${i}`} style={{ height: '22px' }}>
                    <td style={{ border: '1px solid #000' }}></td>
                    <td style={{ border: '1px solid #000' }}></td>
                    <td style={{ border: '1px solid #000' }}></td>
                    <td style={{ border: '1px solid #000' }}></td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {/* TOTALS */}
            <div className="flex justify-end mb-4">
               <div className="w-1/2 border border-black">
                  <div className="flex justify-between p-2 border-b border-black bg-slate-50">
                     <span className="font-bold" style={{ color: '#000' }}>SUBTOTAL</span>
                     <span className="font-mono" style={{ color: '#000' }}>{formatCurrency(totalValue)}</span>
                  </div>
                  
                  {/* Payment Condition Row */}
                  <div className="flex justify-between p-2 border-b border-black">
                     <span className="font-bold text-xs" style={{ color: '#000' }}>CONDIÇÃO:</span>
                     <span className="font-bold text-xs uppercase" style={{ color: '#000' }}>{paymentMethod}</span>
                  </div>

                  {discountPercent > 0 && (
                    <div className="flex justify-between p-2 border-b border-black text-red-600">
                       <span className="font-bold text-xs">DESCONTO ({discountPercent}%)</span>
                       <span className="font-mono">-{formatCurrency(discountValue)}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-between p-2 bg-slate-100">
                     <span className="font-bold text-lg" style={{ color: '#000' }}>TOTAL A PAGAR</span>
                     <span className="font-bold text-lg" style={{ color: '#000' }}>{formatCurrency(finalTotal)}</span>
                  </div>
               </div>
            </div>

            {/* OBSERVATIONS SECTION IN PDF */}
            {observations && (
                <div style={{ 
                    border: '1px solid #000', 
                    borderRadius: '0',
                    padding: '5px', 
                    minHeight: '40px', 
                    marginBottom: '20px',
                    fontSize: '11px',
                    color: '#000',
                    position: 'relative'
                }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '2px', fontSize: '10px', textTransform: 'uppercase' }}>OBSERVAÇÕES:</div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>
                        {observations}
                    </div>
                </div>
            )}

            {/* DISCLAIMERS / FOOTER */}
            <div className="border-t-2 border-black pt-2 text-center mt-auto" style={{ borderColor: '#000' }}>
               <p className="font-bold text-[10px] mb-2" style={{ color: '#000' }}>
                 PREZADO CLIENTE, AO RECEBER SEU MATERIAL FAVOR CONFERIR, POIS APÓS A ENTREGA NÃO NOS RESPONSABILIZAMOS POR DIVERGÊNCIA.
               </p>
               <p className="font-bold text-[10px] text-red-600 mb-8">
                 MATERIAL EM LED COM 6 MESES DE GARANTIA, SOMENTE SERÁ VÁLIDA COM A APRESENTAÇÃO DESTA NOTINHA.
               </p>
               
               <div className="flex justify-center">
                 <div className="border-t border-black w-2/3 pt-1" style={{ color: '#000' }}>
                   ASSINATURA DO VENDEDOR / RESPONSÁVEL
                 </div>
               </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};
