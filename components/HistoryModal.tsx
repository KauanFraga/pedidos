<change>
<file>components/HistoryModal.tsx</file>
<description>Refine HistoryModal UI to match screenshot: compact list view, updated stats cards, and cleaner layout.</description>
<content><![CDATA[
import React, { useState, useMemo, useEffect } from 'react';
import { SavedQuote, HistoryStatus } from '../types';
import { updateQuoteStatus } from '../services/historyService';
import { X, Search, Clock, Copy, Trash2, Eye, Calendar, User, ChevronDown, CheckCircle, XCircle, AlertCircle, FileText, TrendingUp, Download } from 'lucide-react';
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
    // Conversion Rate: Approved / (Approved + Lost) - Ignoring Pending for "Close Rate" or Total for "Win Rate"
    // Let's use (Approved / Total) for general conversion as requested in prompt context before
    // Or (Approved / (Approved + Lost)) for strict win rate. Screenshot shows "18%" which suggests simple calc.
    // Let's stick to a simple (Approved / Total) * 100 for now or standard Win Rate.
    // If 2 approved, 7 pending, 1 lost (Total 10). 2/10 = 20%. 
    // If using (Approved / (Approved+Lost)) -> 2/3 = 66%.
    // Let's use (Approved / Total) * 100.
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
    link.download = `backup_orcamentos_${date}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const renderDate = (dateString: string) => {
      try {
          const d = new Date(dateString);
          return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('pt-BR');
      } catch {
          return '-';
      }
  };

  const getStatusStyles = (status: HistoryStatus) => {
      switch (status) {
          case 'APROVADO': return { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', icon: <CheckCircle className="w-3 h-3" /> };
          case 'PERDIDO': return { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: <XCircle className="w-3 h-3" /> };
          case 'PENDENTE': return { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: <AlertCircle className="w-3 h-3" /> };
          default: return { bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-200', icon: <FileText className="w-3 h-3" /> };
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
                className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 text-slate-600 font-medium transition-colors text-sm"
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-white border-b border-slate-100">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col">
                <span className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Taxa de Conversão
                </span>
                <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded-md"><TrendingUp className="w-4 h-4" /></div>
                    <span className="text-2xl font-bold text-slate-800">{stats.conversionRate}%</span>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col border-l-4 border-l-green-500">
                <span className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3 text-green-500" /> Aprovados
                </span>
                <div className="flex justify-between items-end">
                    <span className="text-2xl font-bold text-slate-800">{stats.approvedCount}</span>
                    <span className="text-xs font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full mb-1">{formatCurrency(stats.approvedValue)}</span>
                </div>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col border-l-4 border-l-yellow-400">
                <span className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-yellow-500" /> Pendentes
                </span>
                <span className="text-2xl font-bold text-slate-800">{stats.pendingCount}</span>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col border-l-4 border-l-red-500">
                <span className="text-xs font-bold text-slate-400 uppercase mb-1 flex items-center gap-1">
                    <XCircle className="w-3 h-3 text-red-500" /> Perdidos
                </span>
                <span className="text-2xl font-bold text-slate-800">{stats.lostCount}</span>
            </div>
        </div>

        {/* Controls Bar */}
        <div className="p-4 border-b border-slate-100 bg-white flex flex-col md:flex-row gap-4 items-center justify-between sticky top-0 z-10">
          {/* Custom Tabs */}
          <div className="flex bg-slate-100/80 p-1 rounded-xl w-full md:w-auto gap-1">
              {(['TODOS', 'PENDENTE', 'APROVADO', 'PERDIDO'] as const).map(status => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`flex-1 md:flex-none px-4 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 ${
                        statusFilter === status 
                        ? 'bg-white text-slate-800 shadow-sm ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
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
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
            />
          </div>
        </div>
        
        {/* Main Content List */}
        <div className="overflow-y-auto flex-1 p-0 bg-white scrollbar-thin scrollbar-thumb-slate-200">
           {filteredHistory.length === 0 ? (
               <div className="h-full flex flex-col items-center justify-center text-slate-400 min-h-[300px]">
                   <div className="bg-slate-50 p-4 rounded-full mb-3">
                        <Search className="w-8 h-8 text-slate-300" />
                   </div>
                   <p className="font-medium text-lg text-slate-600">Nenhum orçamento encontrado</p>
                   <p className="text-sm">Tente mudar os filtros ou criar um novo.</p>
               </div>
           ) : (
             <div className="divide-y divide-slate-100">
               {filteredHistory.map((quote) => {
                 const status = quote.status || 'PENDENTE';
                 const styles = getStatusStyles(status);
                 const isExpanded = expandedId === quote.id;

                 return (
                 <div 
                    key={quote.id} 
                    className={`transition-colors hover:bg-slate-50 ${isExpanded ? 'bg-slate-50' : ''}`}
                 >
                   {/* Row Header */}
                   <div className="flex flex-col md:flex-row items-center p-4 gap-4 cursor-pointer" onClick={() => toggleDetails(quote.id)}>
                      
                      {/* Date */}
                      <div className="flex items-center gap-2 text-slate-500 w-24 shrink-0">
                          <Calendar className="w-4 h-4 text-slate-400" />
                          <span className="text-sm font-medium">{renderDate(quote.createdAt)}</span>
                      </div>

                      {/* User Info */}
                      <div className="flex-1 flex items-center gap-3 overflow-hidden">
                        <div className="bg-slate-100 p-2 rounded-full shrink-0">
                            <User className="w-4 h-4 text-slate-500" />
                        </div>
                        <div className="min-w-0">
                            <h3 className="font-semibold text-slate-700 text-sm truncate">
                                {quote.customerName || <span className="text-slate-400 italic">Cliente sem nome</span>}
                            </h3>
                            <p className="text-xs text-slate-400 truncate">
                                {quote.items.length} itens • Criado em {new Date(quote.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </p>
                        </div>
                      </div>

                      {/* Value */}
                      <div className="text-right min-w-[120px]">
                          <div className="font-mono font-bold text-slate-700">
                              {formatCurrency(quote.totalValue)}
                          </div>
                      </div>

                      {/* Status Badge */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-all ${styles.bg} ${styles.text} ${styles.border} hover:shadow-sm group`}>
                              {styles.icon}
                              <select
                                value={status}
                                onChange={(e) => handleStatusChange(quote.id, e.target.value as HistoryStatus)}
                                className="appearance-none bg-transparent border-none outline-none cursor-pointer uppercase font-bold w-20 text-center"
                              >
                                  <option value="RASCUNHO">RASCUNHO</option>
                                  <option value="PENDENTE">PENDENTE</option>
                                  <option value="APROVADO">APROVADO</option>
                                  <option value="PERDIDO">PERDIDO</option>
                              </select>
                              <ChevronDown className="w-3 h-3 opacity-50" />
                          </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 pl-2" onClick={(e) => e.stopPropagation()}>
                        <button 
                          onClick={() => {
                            onRestore(quote);
                            onClose();
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Carregar Orçamento"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                             if(window.confirm('Tem certeza que deseja excluir este histórico permanentemente?')) {
                                onDelete(quote.id);
                             }
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Excluir"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                   </div>

                   {/* Expanded Content */}
                   {isExpanded && (
                     <div className="px-4 pb-4 pl-16 animate-in slide-in-from-top-1">
                        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-bold text-xs uppercase border-b border-slate-200">
                                    <tr>
                                        <th className="p-3 w-16 text-center">Qtd</th>
                                        <th className="p-3">Descrição</th>
                                        <th className="p-3 text-right w-32">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {(Array.isArray(quote.items) ? quote.items : []).map((item, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="p-3 font-mono text-slate-600 text-center bg-slate-50/30">{item.quantity}</td>
                                            <td className="p-3 text-slate-700">
                                                {item.catalogItem?.description || item.originalRequest}
                                            </td>
                                            <td className="p-3 text-right font-mono text-slate-600">
                                                {item.catalogItem ? formatCurrency(item.quantity * item.catalogItem.price) : '-'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
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
        <div className="p-3 bg-white border-t border-slate-100 text-center text-xs text-slate-400">
            Mostrando {filteredHistory.length} de {localHistory.length} orçamentos armazenados
        </div>
      </div>
    </div>
  );
};
]]></content>
</change>
