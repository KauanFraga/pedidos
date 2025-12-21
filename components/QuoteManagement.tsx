import React, { useState, useEffect } from 'react';
import { X, FileText, Trash2, Copy, Download, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface SavedQuote {
  id: string;
  quoteNumber: string;
  date: string;
  time: string;
  customerName: string;
  items: Array<{ quantity: number; description: string; unitPrice: number; total: number }>;
  total: number;
  status: 'PENDENTE' | 'APROVADO' | 'PERDIDO';
  savedAt: string;
}

interface QuoteManagementProps {
  isOpen: boolean;
  onClose: () => void;
}

export const QuoteManagement: React.FC<QuoteManagementProps> = ({ isOpen, onClose }) => {
  const [quotes, setQuotes] = useState<SavedQuote[]>([]);
  const [filter, setFilter] = useState<'Todos' | 'PENDENTE' | 'APROVADO' | 'PERDIDO'>('Todos');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadQuotes();
    }
  }, [isOpen]);

  const loadQuotes = () => {
    const savedQuotes = JSON.parse(localStorage.getItem('saved_quotes') || '[]');
    // Ordena por data mais recente
    savedQuotes.sort((a: SavedQuote, b: SavedQuote) => 
      new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime()
    );
    setQuotes(savedQuotes);
  };

  const handleDelete = (id: string) => {
    const confirmDelete = window.confirm('⚠️ Tem certeza que deseja excluir este orçamento?');
    if (confirmDelete) {
      const updatedQuotes = quotes.filter(q => q.id !== id);
      localStorage.setItem('saved_quotes', JSON.stringify(updatedQuotes));
      setQuotes(updatedQuotes);
      alert('✅ Orçamento excluído!');
    }
  };

  const handleChangeStatus = (id: string, newStatus: 'PENDENTE' | 'APROVADO' | 'PERDIDO') => {
    const updatedQuotes = quotes.map(q => 
      q.id === id ? { ...q, status: newStatus } : q
    );
    localStorage.setItem('saved_quotes', JSON.stringify(updatedQuotes));
    setQuotes(updatedQuotes);
  };

  const handleDuplicate = (quote: SavedQuote) => {
    const newQuote = {
      ...quote,
      id: crypto.randomUUID(),
      quoteNumber: (parseInt(quote.quoteNumber) + 1).toString(),
      date: new Date().toLocaleDateString('pt-BR'),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      status: 'PENDENTE' as const,
      savedAt: new Date().toISOString()
    };
    
    const updatedQuotes = [newQuote, ...quotes];
    localStorage.setItem('saved_quotes', JSON.stringify(updatedQuotes));
    setQuotes(updatedQuotes);
    alert(`✅ Orçamento duplicado! Novo número: ${newQuote.quoteNumber}`);
  };

  const exportToJSON = () => {
    const dataStr = JSON.stringify(quotes, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `orcamentos_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const filteredQuotes = quotes.filter(q => {
    const matchesFilter = filter === 'Todos' || q.status === filter;
    const matchesSearch = q.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         q.quoteNumber.includes(searchTerm);
    return matchesFilter && matchesSearch;
  });

  const stats = {
    total: quotes.length,
    pendente: quotes.filter(q => q.status === 'PENDENTE').length,
    aprovado: quotes.filter(q => q.status === 'APROVADO').length,
    perdido: quotes.filter(q => q.status === 'PERDIDO').length,
    totalValue: quotes.filter(q => q.status === 'APROVADO').reduce((sum, q) => sum + q.total, 0),
    conversionRate: quotes.length > 0 ? (quotes.filter(q => q.status === 'APROVADO').length / quotes.length * 100).toFixed(0) : 0
  };

  const formatCurrency = (value: number) => {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDENTE': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'APROVADO': return 'bg-green-100 text-green-800 border-green-300';
      case 'PERDIDO': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDENTE': return <Clock className="w-4 h-4" />;
      case 'APROVADO': return <CheckCircle2 className="w-4 h-4" />;
      case 'PERDIDO': return <XCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="w-7 h-7" />
            <div>
              <h2 className="text-2xl font-bold">Gestão de Orçamentos</h2>
              <p className="text-sm text-blue-100">Gerencie, filtre e exporte seus orçamentos salvos.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={exportToJSON}
              className="bg-blue-800 hover:bg-blue-900 px-4 py-2 rounded-lg font-semibold flex items-center gap-2"
              title="Backup JSON"
            >
              <Download className="w-4 h-4" />
              Backup JSON
            </button>
            <button onClick={onClose} className="text-white hover:bg-blue-700 p-2 rounded-lg">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-lg border-2 border-slate-200">
              <div className="text-2xl font-bold text-slate-900">{stats.pendente}</div>
              <div className="text-sm text-yellow-600 font-semibold">PENDENTES</div>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-green-200">
              <div className="text-2xl font-bold text-green-600">{stats.aprovado}</div>
              <div className="text-sm text-green-600 font-semibold">APROVADOS</div>
              <div className="text-xs text-slate-500 mt-1">{formatCurrency(stats.totalValue)}</div>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-red-200">
              <div className="text-2xl font-bold text-red-600">{stats.perdido}</div>
              <div className="text-sm text-red-600 font-semibold">PERDIDOS</div>
            </div>
            <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
              <div className="text-2xl font-bold text-blue-600">{stats.conversionRate}%</div>
              <div className="text-sm text-blue-600 font-semibold">TAXA DE CONVERSÃO</div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="p-6 bg-white border-b border-slate-200">
          <div className="flex gap-4 items-center">
            <div className="flex gap-2">
              {(['Todos', 'PENDENTE', 'APROVADO', 'PERDIDO'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                    filter === f
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
            
            <input
              type="text"
              placeholder="🔍 Buscar por nome ou data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        {/* Quotes List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredQuotes.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <FileText className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">Nenhum orçamento encontrado</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredQuotes.map(quote => (
                <div key={quote.id} className="bg-white border-2 border-slate-200 rounded-xl p-4 hover:shadow-lg transition-shadow">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-lg font-bold text-slate-900">
                          Nº {quote.quoteNumber}
                        </span>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold border-2 flex items-center gap-1 ${getStatusColor(quote.status)}`}>
                          {getStatusIcon(quote.status)}
                          {quote.status}
                        </span>
                        <span className="text-sm text-slate-500">
                          {quote.date} {quote.time}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-slate-600 font-semibold">Cliente:</span>{' '}
                          <span className="text-slate-900">{quote.customerName}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-semibold">Itens:</span>{' '}
                          <span className="text-slate-900">{quote.items.length}</span>
                        </div>
                        <div>
                          <span className="text-slate-600 font-semibold">Total:</span>{' '}
                          <span className="text-green-600 font-bold">{formatCurrency(quote.total)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Change Status Buttons */}
                      {quote.status !== 'PENDENTE' && (
                        <button
                          onClick={() => handleChangeStatus(quote.id, 'PENDENTE')}
                          className="p-2 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 rounded-lg"
                          title="Marcar como Pendente"
                        >
                          <Clock className="w-4 h-4" />
                        </button>
                      )}
                      {quote.status !== 'APROVADO' && (
                        <button
                          onClick={() => handleChangeStatus(quote.id, 'APROVADO')}
                          className="p-2 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg"
                          title="Marcar como Aprovado"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                      {quote.status !== 'PERDIDO' && (
                        <button
                          onClick={() => handleChangeStatus(quote.id, 'PERDIDO')}
                          className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
                          title="Marcar como Perdido"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => handleDuplicate(quote)}
                        className="p-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg"
                        title="Duplicar"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                      
                      <button
                        onClick={() => handleDelete(quote.id)}
                        className="p-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-4 border-t border-slate-200 text-center text-sm text-slate-600">
          Mostrando {filteredQuotes.length} de {quotes.length} orçamentos
        </div>

      </div>
    </div>
  );
};