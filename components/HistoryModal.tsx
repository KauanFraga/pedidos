<change>
<file>components/HistoryModal.tsx</file>
<description>Add Export History button to HistoryModal to allow JSON backup download.</description>
<content><![CDATA[
import React, { useState, useMemo, useEffect } from 'react';
import { SavedQuote, HistoryStatus } from '../types';
import { updateQuoteStatus } from '../services/historyService';
import { X, Search, Clock, Copy, Trash2, Eye, Calendar, User, ChevronDown, CheckCircle, XCircle, AlertCircle, FileText, TrendingUp, DollarSign, Download } from 'lucide-react';
import { formatCurrency } from '../utils/parser';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SavedQuote[];
  onDelete: (id: string) => void;
  onRestore: (quote: SavedQuote) => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onDelete, 
  onRestore 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<HistoryStatus | 'TODOS'>('TODOS');
  const [localHistory, setLocalHistory] = useState<SavedQuote[]>([]);

  // Sync props to local state for immediate UI updates
  useEffect(() => {
    if (history) {
        setLocalHistory(history);
    }
  }, [history]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const totalQuotes = localHistory.length;
    const approved = localHistory.filter(q => q.status === 'APROVADO');
    const pending = localHistory.filter(q => q.status === 'PENDENTE');
    const lost = localHistory.filter(q => q.status === 'PERDIDO');

    const totalApprovedValue = approved.reduce((acc, q) => acc + q.totalValue, 0);
    const conversionRate = totalQuotes > 0 ? Math.round((approved.length / totalQuotes) * 100) : 0;

    return {
        total: totalQuotes,
        approvedCount: approved.length,
        approvedValue: totalApprovedValue,
        pendingCount: pending.length,
        lostCount: lost.length,
        conversionRate
    };
  }, [localHistory]);

  const filteredHistory = useMemo(() => {
    return localHistory.filter(quote => {
      if (!quote) return false;
      const matchesSearch = 
        String(quote.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(quote.createdAt || '').includes(searchTerm);
      
      const matchesStatus = statusFilter === 'TODOS' || quote.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [localHistory, searchTerm, statusFilter]);

  if (!isOpen) return null;

  const handleStatusChange = (id: string, newStatus: HistoryStatus) => {
    updateQuoteStatus(id, newStatus);
    // Update local state immediately for UI feedback
    setLocalHistory(prev => prev.map(q => q.id === id ? { ...q, status: newStatus } : q));
  };

  const toggleDetails = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const handleExportHistory = () => {
    const data = JSON.stringify(localHistory, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    
    const date = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.download = `historico_orcamentos_backup_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderDate = (dateString: string) => {
      try {
          const d = new Date(dateString);
          return isNaN(d.getTime()) ? 'Data inválida' : d.toLocaleDateString('pt-BR');
      } catch {
          return 'Data inválida';
      }
  };

  const getStatusColor = (status: HistoryStatus) => {
      switch (status) {
          case 'APROVADO': return 'bg-green-100 text-green-700 border-green-200';
          case 'PERDIDO': return 'bg-red-100 text-red-700 border-red-200';
          case 'PENDENTE': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
          default: return 'bg-slate-100 text-slate-600 border-slate-200';
      }
  };

  const getStatusIcon = (status: HistoryStatus) => {
      switch (status) {
          case 'APROVADO': return <CheckCircle className="w-3 h-3" />;
          case 'PERDIDO': return <XCircle className="w-3 h-3" />;
          case 'PENDENTE': return <AlertCircle className="w-3 h-3" />;
          default: return <FileText className="w-3 h-3" />;
      }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2 text-slate-800">
             <Clock className="w-6 h-6 text-yellow-500" />
             <h2 className="text-xl font-bold">Gestão de Orçamentos</h2>
          </div>
          <div className="flex items-center gap-3">
            <button 
                onClick={handleExportHistory}
                className="text-sm flex items-center gap-2 bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-50 text-slate-700 transition-colors shadow-sm"
                title="Baixar backup do histórico"
            >
                <Download className="w-4 h-4" /> Exportar Histórico
            </button>
            <button 
                onClick={onClose} 
                className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-200 rounded"
            >
                <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Dashboard Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white border-b border-slate-100">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <p className="text-xs text-blue-600 uppercase font-bold flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Conv. Rate
                </p>
                <p className="text-2xl font-bold text-blue-800">{stats.conversionRate}%</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                <p className="text-xs text-green-600 uppercase font-bold flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Aprovados
                </p>
                <p className="text-2xl font-bold text-green-800">{stats.approvedCount}</p>
                <p className="text-xs text-green-600 font-medium">{formatCurrency(stats.approvedValue)}</p>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                <p className="text-xs text-yellow-600 uppercase font-bold flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Pendentes
                </p>
                <p className="text-2xl font-bold text-yellow-800">{stats.pendingCount}</p>
            </div>
            <div className="bg-red-50 p-4 rounded-lg border border-red-100">
                <p className="text-xs text-red-600 uppercase font-bold flex items-center gap-1">
                    <XCircle className="w-3 h-3" /> Perdidos
                </p>
                <p className="text-2xl font-bold text-red-800">{stats.lostCount}</p>
            </div>
        </div>

        {/* Filters & Search */}
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 shadow-sm">
              {(['TODOS', 'PENDENTE', 'APROVADO', 'PERDIDO'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${
                        statusFilter === status 
                        ? 'bg-slate-800 text-white shadow' 
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                      {status === 'TODOS' ? 'Todos' : status}
                  </button>
              ))}
          </div>

          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-yellow-400 outline-none"
            />
          </div>
        </div>
        
        {/* Table List */}
        <div className="overflow-y-auto flex-1 p-4 bg-slate-50">
           {filteredHistory.length === 0 ? (
               <div className="text-center text-slate-500 py-12 flex flex-col items-center">
                   <Clock className="w-12 h-12 text-slate-300 mb-3" />
                   <p className="font-medium">Nenhum orçamento encontrado com este filtro.</p>
               </div>
           ) : (
             <div className="space-y-3">
               {filteredHistory.map((quote) => {
                 const status = quote.status || 'PENDENTE';
                 return (
                 <div key={quote.id} className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden transition-all hover:border-yellow-300">
                   {/* Row Summary */}
                   <div className="flex flex-col md:flex-row items-start md:items-center p-4 gap-4">
                      {/* Date */}
                      <div className="flex items-center gap-2 text-slate-500 text-xs w-24 shrink-0 font-mono">
                        <Calendar className="w-3 h-3" />
                        <span>{renderDate(quote.createdAt)}</span>
                      </div>

                      {/* Customer */}
                      <div className="flex items-center gap-2 flex-1 min-w-[150px]">
                        <User className="w-4 h-4 text-slate-400" />
                        <span className={`font-semibold text-sm ${quote.customerName ? 'text-slate-800' : 'text-slate-400 italic'}`}>
                          {String(quote.customerName || '(Cliente não informado)')}
                        </span>
                      </div>

                      {/* Value */}
                      <div className="flex flex-col items-end w-24">
                        <span className="font-mono font-bold text-slate-700 text-sm">
                            {formatCurrency(quote.totalValue)}
                        </span>
                      </div>

                      {/* Status Badge & Dropdown */}
                      <div className="relative group min-w-[120px]">
                          <select
                            value={status}
                            onChange={(e) => handleStatusChange(quote.id, e.target.value as HistoryStatus)}
                            className={`
                                appearance-none w-full pl-8 pr-8 py-1.5 rounded-full text-xs font-bold border cursor-pointer outline-none focus:ring-2 focus:ring-offset-1 focus:ring-slate-200
                                ${getStatusColor(status)}
                            `}
                          >
                              <option value="RASCUNHO">RASCUNHO</option>
                              <option value="PENDENTE">PENDENTE</option>
                              <option value="APROVADO">APROVADO</option>
                              <option value="PERDIDO">PERDIDO</option>
                          </select>
                          <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                              {getStatusIcon(status)}
                          </div>
                          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-50 pointer-events-none" />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 ml-auto border-l border-slate-100 pl-4">
                        <button 
                          onClick={() => toggleDetails(quote.id)}
                          className={`p-2 rounded hover:bg-slate-100 transition-colors ${expandedId === quote.id ? 'text-blue-600 bg-blue-50' : 'text-slate-400'}`}
                          title="Ver Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            onRestore(quote);
                            onClose();
                          }}
                          className="p-2 rounded hover:bg-green-50 text-slate-400 hover:text-green-600 transition-colors"
                          title="Duplicar / Editar"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                             if(window.confirm('Tem certeza que deseja excluir este histórico?')) {
                                onDelete(quote.id);
                             }
                          }}
                          className="p-2 rounded hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                   </div>

                   {/* Expanded Details */}
                   {expandedId === quote.id && (
                     <div className="border-t border-slate-100 bg-slate-50 p-4 text-sm animate-in slide-in-from-top-2">
                        <h4 className="font-bold text-slate-700 mb-2 text-xs uppercase">Resumo dos Itens</h4>
                        <ul className="space-y-1">
                          {(Array.isArray(quote.items) ? quote.items : []).map((item, idx) => {
                             if (!item) return null;
                             const desc = item.catalogItem?.description || item.originalRequest || 'Item sem descrição';
                             const qty = item.quantity || 0;
                             const price = item.catalogItem ? item.catalogItem.price : 0;
                             const subtotal = qty * price;

                             return (
                               <li key={idx} className="flex justify-between items-center text-slate-600 border-b border-slate-200 pb-1 last:border-0">
                                  <span>{String(qty)}x {String(desc)}</span>
                                  <span className="font-mono text-slate-500">
                                    {item.catalogItem ? formatCurrency(subtotal) : '-'}
                                  </span>
                               </li>
                             );
                          })}
                        </ul>
                     </div>
                   )}
                 </div>
                 );
               })}
             </div>
           )}
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-white rounded-b-xl flex justify-between items-center">
            <span className="text-xs text-slate-400">Total: {localHistory.length} orçamentos</span>
            <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 font-medium transition-colors border border-slate-200">
                Fechar
            </button>
        </div>
      </div>
    </div>
  );
};
]]></content>
</change>
