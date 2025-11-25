
import React, { useState, useMemo, useEffect } from 'react';
import { SavedQuote, HistoryStatus } from '../types';
import { updateQuoteStatus } from '../services/historyService';
import { X, Search, Clock, Copy, Trash2, Eye, Calendar, User, ChevronDown, CheckCircle, XCircle, AlertCircle, FileText, TrendingUp, Download, MoreVertical, ChevronUp } from 'lucide-react';
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
          return isNaN(d.getTime()) ? 'Data inválida' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
      } catch {
          return 'Data inválida';
      }
  };

  const getStatusStyles = (status: HistoryStatus) => {
      switch (status) {
          case 'APROVADO': return { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircle className="w-3 h-3" /> };
          case 'PERDIDO': return { bg: 'bg-red-100', text: 'text-red-700', icon: <XCircle className="w-3 h-3" /> };
          case 'PENDENTE': return { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <AlertCircle className="w-3 h-3" /> };
          default: return { bg: 'bg-slate-100', text: 'text-slate-600', icon: <FileText className="w-3 h-3" /> };
      }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 bg-white flex justify-between items-center">
          <div>
             <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                <Clock className="w-6 h-6 text-blue-600" />
                Gestão de Orçamentos
             </h2>
             <p className="text-sm text-slate-500 mt-1">Gerencie, filtre e exporte seus orçamentos salvos.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
                onClick={handleExportHistory}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-4 py-2 rounded-lg hover:bg-slate-100 text-slate-700 font-medium transition-colors text-sm"
            >
                <Download className="w-4 h-4" /> Backup JSON
            </button>
            <button 
                onClick={onClose} 
                className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
            >
                <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-50/50 border-b border-slate-100">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase mb-1">Taxa de Conversão</span>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-100 text-blue-600 rounded-md"><TrendingUp className="w-4 h-4" /></div>
                    <span className="text-2xl font-bold text-slate-800">{stats.conversionRate}%</span>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col border-l-4 border-l-green-500">
                <span className="text-xs font-bold text-slate-400 uppercase mb-1">Aprovados</span>
                <div className="flex justify-between items-end">
                    <span className="text-2xl font-bold text-slate-800">{stats.approvedCount}</span>
                    <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full mb-1">{formatCurrency(stats.approvedValue)}</span>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col border-l-4 border-l-yellow-400">
                <span className="text-xs font-bold text-slate-400 uppercase mb-1">Pendentes</span>
                <span className="text-2xl font-bold text-slate-800">{stats.pendingCount}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col border-l-4 border-l-red-500">
                <span className="text-xs font-bold text-slate-400 uppercase mb-1">Perdidos</span>
                <span className="text-2xl font-bold text-slate-800">{stats.lostCount}</span>
            </div>
        </div>

        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-10">
          {/* Custom Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-xl w-full md:w-auto">
              {(['TODOS', 'PENDENTE', 'APROVADO', 'PERDIDO'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`flex-1 md:flex-none px-5 py-2 rounded-lg text-xs font-bold transition-all duration-200 ${
                        statusFilter === status 
                        ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                    }`}
                  >
                      {status === 'TODOS' ? 'Todos' : status}
                  </button>
              ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nome ou data..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all outline-none"
            />
          </div>
        </div>
        
        {/* Main Content */}
        <div className="overflow-y-auto flex-1 p-4 bg-slate-50/50 scrollbar-thin scrollbar-thumb-slate-200">
           {filteredHistory.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
                   <div className="bg-slate-100 p-4 rounded-full mb-3">
                        <Search className="w-8 h-8 text-slate-300" />
                   </div>
                   <p className="font-medium text-lg text-slate-600">Nenhum orçamento encontrado</p>
                   <p className="text-sm">Tente mudar os filtros ou criar um novo.</p>
               </div>
           ) : (
             <div className="space-y-3">
               {filteredHistory.map((quote) => {
                 const status = quote.status || 'PENDENTE';
                 const styles = getStatusStyles(status);
                 const isExpanded = expandedId === quote.id;

                 return (
                 <div 
                    key={quote.id} 
                    className={`
                        bg-white border rounded-xl shadow-sm transition-all duration-200 overflow-hidden
                        ${isExpanded ? 'ring-2 ring-blue-500 border-transparent shadow-md' : 'border-slate-200 hover:border-blue-300 hover:shadow'}
                    `}
                 >
                   {/* Card Header / Summary */}
                   <div className="flex flex-col md:flex-row items-center p-4 gap-4 cursor-pointer" onClick={() => toggleDetails(quote.id)}>
                      
                      {/* Date Badge */}
                      <div className="flex flex-col items-center justify-center bg-slate-50 rounded-lg p-2 min-w-[70px] border border-slate-100">
                          <span className="text-xs text-slate-400 font-bold uppercase">{new Date(quote.createdAt).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                          <span className="text-xl font-bold text-slate-700">{new Date(quote.createdAt).getDate()}</span>
                          <span className="text-[10px] text-slate-400">{new Date(quote.createdAt).getHours()}:{String(new Date(quote.createdAt).getMinutes()).padStart(2, '0')}</span>
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 text-center md:text-left">
                        <h3 className="font-bold text-slate-800 text-lg">
                            {quote.customerName || <span className="text-slate-400 italic">Cliente sem nome</span>}
                        </h3>
                        <div className="flex items-center justify-center md:justify-start gap-4 mt-1 text-sm text-slate-500">
                            <span className="flex items-center gap-1"><FileText className="w-3 h-3" /> {quote.items.length} itens</span>
                            <span className="font-mono font-medium text-slate-700 bg-slate-100 px-2 py-0.5 rounded">{formatCurrency(quote.totalValue)}</span>
                        </div>
                      </div>

                      {/* Status Selector (Smart Badge) */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-colors ${styles.bg} ${styles.text} border-transparent hover:border-current group`}>
                              {styles.icon}
                              <select
                                value={status}
                                onChange={(e) => handleStatusChange(quote.id, e.target.value as HistoryStatus)}
                                className="appearance-none bg-transparent border-none outline-none cursor-pointer uppercase font-bold w-full"
                              >
                                  <option value="RASCUNHO">RASCUNHO</option>
                                  <option value="PENDENTE">PENDENTE</option>
                                  <option value="APROVADO">APROVADO</option>
                                  <option value="PERDIDO">PERDIDO</option>
                              </select>
                              <ChevronDown className="w-3 h-3 opacity-50 group-hover:opacity-100" />
                          </div>
                      </div>

                      {/* Actions Toolbar */}
                      <div className="flex items-center gap-2 pl-4 border-l border-slate-100" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => {
                            onRestore(quote);
                            onClose();
                          }}
                          className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-colors"
                          title="Carregar Orçamento"
                        >
                          <Copy className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                             if(window.confirm('Tem certeza que deseja excluir este histórico permanentemente?')) {
                                onDelete(quote.id);
                             }
                          }}
                          className="p-2 bg-red-50 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <div className={`p-2 rounded-lg transition-transform duration-200 ${isExpanded ? 'rotate-180 bg-slate-100' : ''}`}>
                            <ChevronDown className="w-4 h-4 text-slate-400" />
                        </div>
                      </div>
                   </div>

                   {/* Expanded Details Panel */}
                   {isExpanded && (
                     <div className="border-t border-slate-100 bg-slate-50/50 p-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase">
                                    <tr>
                                        <th className="p-3">Qtd</th>
                                        <th className="p-3">Descrição</th>
                                        <th className="p-3 text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(Array.isArray(quote.items) ? quote.items : []).map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50">
                                            <td className="p-3 font-mono text-slate-600 w-16 text-center">{item.quantity}</td>
                                            <td className="p-3 text-slate-700">
                                                {item.catalogItem?.description || item.originalRequest}
                                                {item.originalRequest !== item.catalogItem?.description && (
                                                    <div className="text-xs text-slate-400 mt-0.5">{item.originalRequest}</div>
                                                )}
                                            </td>
                                            <td className="p-3 text-right font-mono text-slate-600">
                                                {item.catalogItem ? formatCurrency(item.quantity * item.catalogItem.price) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-50 border-t border-slate-200">
                                    <tr>
                                        <td colSpan={2} className="p-3 text-right font-bold text-slate-600">TOTAL</td>
                                        <td className="p-3 text-right font-bold text-slate-800 font-mono">{formatCurrency(quote.totalValue)}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                     </div>
                   )}
                 </div>
                 );
               })}
             </div>
           )}
        </div>
        
        {/* Footer Info */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 text-center text-xs text-slate-400">
            Mostrando {filteredHistory.length} de {localHistory.length} orçamentos armazenados
        </div>
      </div>
    </div>
  );
};
