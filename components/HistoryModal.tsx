import React, { useState, useMemo } from 'react';
import { X, Trash2, RotateCcw, Calendar, ChevronDown, Eye, Package, DollarSign, Download, SlidersHorizontal } from 'lucide-react';
import { SavedQuote, HistoryStatus } from '../types';
import * as XLSX from 'xlsx';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SavedQuote[];
  onDelete: (id: string) => void;
  onRestore: (quote: SavedQuote) => void;
  onUpdateStatus: (id: string, newStatus: HistoryStatus) => void;
}

type PeriodFilter = 'all' | 'today' | 'week' | 'month' | 'custom';
type SortOption = 'newest' | 'oldest' | 'highest' | 'lowest';

export const HistoryModal: React.FC<HistoryModalProps> = ({ 
  isOpen, 
  onClose, 
  history, 
  onDelete,
  onRestore,
  onUpdateStatus
}) => {
  const [showFilters, setShowFilters] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [statusFilter, setStatusFilter] = useState<HistoryStatus | 'all'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [minValue, setMinValue] = useState<number | ''>('');
  const [maxValue, setMaxValue] = useState<number | ''>('');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [statusDropdownId, setStatusDropdownId] = useState<string | null>(null);

  const handleStatusChange = (quoteId: string, newStatus: HistoryStatus) => {
    onUpdateStatus(quoteId, newStatus);
    setStatusDropdownId(null); 
  };

  // ✅ FUNÇÃO AUXILIAR PARA CALCULAR TOTAL DO ITEM COM SEGURANÇA
  const getItemTotal = (item: any) => {
    const qty = Number(item.quantity) || 0;
    // Prioriza o preço salvo (unitPrice), se não tiver, tenta o do catálogo
    const price = Number(item.unitPrice) || Number(item.catalogItem?.price) || 0;
    return qty * price;
  };

  // ✅ FUNÇÃO AUXILIAR PARA CALCULAR TOTAL DO ORÇAMENTO
  const getQuoteTotal = (quote: SavedQuote) => {
    return quote.items.reduce((sum, item) => sum + getItemTotal(item), 0);
  };

  const filteredAndSortedHistory = useMemo(() => {
    let filtered = [...history];

    if (periodFilter !== 'all') {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      
      filtered = filtered.filter(quote => {
        const quoteDate = new Date(quote.updatedAt || quote.createdAt);
        
        switch (periodFilter) {
          case 'today':
            return quoteDate >= today;
          case 'week':
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            return quoteDate >= weekAgo;
          case 'month':
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);
            return quoteDate >= monthAgo;
          case 'custom':
            if (customStartDate && customEndDate) {
              const start = new Date(customStartDate);
              const end = new Date(customEndDate);
              end.setHours(23, 59, 59, 999);
              return quoteDate >= start && quoteDate <= end;
            }
            return true;
          default:
            return true;
        }
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(quote => quote.status === statusFilter);
    }

    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(quote => 
        quote.customerName.toLowerCase().includes(search)
      );
    }

    if (minValue !== '') {
      filtered = filtered.filter(quote => getQuoteTotal(quote) >= minValue);
    }

    if (maxValue !== '') {
      filtered = filtered.filter(quote => getQuoteTotal(quote) <= maxValue);
    }

    filtered.sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      
      const totalA = getQuoteTotal(a);
      const totalB = getQuoteTotal(b);

      switch (sortBy) {
        case 'newest':
          return dateB - dateA;
        case 'oldest':
          return dateA - dateB;
        case 'highest':
          return totalB - totalA;
        case 'lowest':
          return totalA - totalB;
        default:
          return dateB - dateA;
      }
    });

    return filtered;
  }, [history, periodFilter, statusFilter, searchTerm, minValue, maxValue, sortBy, customStartDate, customEndDate]);

  const handleClearFilters = () => {
    setPeriodFilter('all');
    setStatusFilter('all');
    setSearchTerm('');
    setMinValue('');
    setMaxValue('');
    setSortBy('newest');
    setCustomStartDate('');
    setCustomEndDate('');
  };

  const handleExportFiltered = () => {
    if (filteredAndSortedHistory.length === 0) {
      alert('⚠️ Nenhum orçamento para exportar com os filtros atuais');
      return;
    }

    const data = filteredAndSortedHistory.map(quote => {
      const total = getQuoteTotal(quote);

      return {
        'Data': new Date(quote.updatedAt || quote.createdAt).toLocaleDateString('pt-BR'),
        'Cliente': quote.customerName,
        'Status': quote.status,
        'Itens': quote.items.length,
        'Total': `R$ ${total.toFixed(2)}`
      };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orçamentos');
    XLSX.writeFile(wb, `orcamentos_filtrados_${new Date().toLocaleDateString('pt-BR')}.xlsx`);
  };

  const formatCurrency = (value: number) => {
    // Garante que não mostre NaN na tela
    if (isNaN(value)) return 'R$ 0,00';
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const StatusBadge: React.FC<{ quote: SavedQuote }> = ({ quote }) => {
    const isOpen = statusDropdownId === quote.id;

    const statusConfig = {
      RASCUNHO: { 
        bg: 'bg-slate-100 hover:bg-slate-200', 
        text: 'text-slate-700', 
        border: 'border-slate-300',
        icon: '📝' 
      },
      PENDENTE: { 
        bg: 'bg-yellow-100 hover:bg-yellow-200', 
        text: 'text-yellow-700', 
        border: 'border-yellow-300',
        icon: '🟡' 
      },
      APROVADO: { 
        bg: 'bg-green-100 hover:bg-green-200', 
        text: 'text-green-700', 
        border: 'border-green-300',
        icon: '✅' 
      },
      PERDIDO: { 
        bg: 'bg-red-100 hover:bg-red-200', 
        text: 'text-red-700', 
        border: 'border-red-300',
        icon: '❌' 
      }
    };

    const current = statusConfig[quote.status];

    return (
      <div className="relative">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setStatusDropdownId(isOpen ? null : quote.id);
          }}
          className={`${current.bg} ${current.text} border ${current.border} px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all cursor-pointer`}
        >
          <span>{current.icon}</span>
          <span>{quote.status}</span>
          <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border-2 border-slate-200 rounded-xl shadow-2xl overflow-hidden z-50 w-48 animate-in fade-in zoom-in-95 duration-200">
            {(Object.keys(statusConfig) as HistoryStatus[]).map((status) => {
              const config = statusConfig[status];
              return (
                <button
                  key={status}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStatusChange(quote.id, status);
                  }}
                  className={`w-full px-4 py-3 text-left hover:bg-slate-50 transition-colors flex items-center gap-3 ${
                    quote.status === status ? 'bg-slate-100' : ''
                  }`}
                >
                  <span className="text-lg">{config.icon}</span>
                  <span className={`font-semibold ${config.text}`}>{status}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  const hasActiveFilters = periodFilter !== 'all' || statusFilter !== 'all' || 
                           searchTerm !== '' || minValue !== '' || maxValue !== '';

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <Calendar className="w-7 h-7" />
            <div>
              <h2 className="text-2xl font-bold">Gestão de Orçamentos</h2>
              <p className="text-sm text-blue-100">
                {filteredAndSortedHistory.length} de {history.length} orçamentos
                {hasActiveFilters && ' (filtrados)'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold transition-colors ${
                showFilters ? 'bg-white text-blue-600' : 'bg-blue-500 hover:bg-blue-400 text-white'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              Filtros
              {hasActiveFilters && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {[periodFilter !== 'all', statusFilter !== 'all', searchTerm !== '', 
                    minValue !== '', maxValue !== ''].filter(Boolean).length}
                </span>
              )}
            </button>
            <button onClick={onClose} className="text-white hover:bg-blue-600 p-2 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Painel de Filtros */}
        {showFilters && (
          <div className="bg-slate-50 border-b border-slate-200 p-6 space-y-4 flex-shrink-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">📅 Período</label>
                <select
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                >
                  <option value="all">Todos</option>
                  <option value="today">Hoje</option>
                  <option value="week">Última semana</option>
                  <option value="month">Último mês</option>
                  <option value="custom">Personalizado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">🏷️ Status</label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as HistoryStatus | 'all')}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                >
                  <option value="all">Todos</option>
                  <option value="RASCUNHO">📝 Rascunho</option>
                  <option value="PENDENTE">🟡 Pendente</option>
                  <option value="APROVADO">✅ Aprovado</option>
                  <option value="PERDIDO">❌ Perdido</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">👤 Cliente</label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">🔄 Ordenar por</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                >
                  <option value="newest">Mais recente</option>
                  <option value="oldest">Mais antigo</option>
                  <option value="highest">Maior valor</option>
                  <option value="lowest">Menor valor</option>
                </select>
              </div>
            </div>

            {periodFilter === 'custom' && (
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Data Inicial</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">Data Final</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">💰 Valor Mínimo</label>
                <input
                  type="number"
                  value={minValue}
                  onChange={(e) => setMinValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="R$ 0,00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">💰 Valor Máximo</label>
                <input
                  type="number"
                  value={maxValue}
                  onChange={(e) => setMaxValue(e.target.value === '' ? '' : parseFloat(e.target.value))}
                  placeholder="R$ 999.999,00"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={handleClearFilters}
                disabled={!hasActiveFilters}
                className="text-sm text-slate-600 hover:text-slate-900 font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Limpar Filtros
              </button>
              <button
                onClick={handleExportFiltered}
                disabled={filteredAndSortedHistory.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar ({filteredAndSortedHistory.length})
              </button>
            </div>
          </div>
        )}

        {/* Stats Bar */}
        <div className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200 p-4 flex-shrink-0">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
              <p className="text-xs text-slate-500 uppercase font-bold mb-1">Taxa de Conversão</p>
              <p className="text-3xl font-bold text-blue-600">
                {history.length > 0 ? 
                  Math.round((history.filter(q => q.status === 'APROVADO').length / history.length) * 100) : 0}%
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {history.filter(q => q.status === 'APROVADO').length} de {history.length} aprovados
              </p>
            </div>
            
            <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm">
              <p className="text-xs text-green-600 uppercase font-bold mb-1">✅ Aprovados</p>
              <p className="text-3xl font-bold text-green-600">
                {filteredAndSortedHistory.filter(q => q.status === 'APROVADO').length}
              </p>
              <p className="text-xs text-green-600 font-semibold mt-1">
                {formatCurrency(
                  filteredAndSortedHistory
                    .filter(q => q.status === 'APROVADO')
                    .reduce((sum, q) => sum + getQuoteTotal(q), 0)
                )}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-yellow-200 shadow-sm">
              <p className="text-xs text-yellow-600 uppercase font-bold mb-1">🟡 Pendentes</p>
              <p className="text-3xl font-bold text-yellow-600">
                {filteredAndSortedHistory.filter(q => q.status === 'PENDENTE').length}
              </p>
              <p className="text-xs text-yellow-600 font-semibold mt-1">
                {formatCurrency(
                  filteredAndSortedHistory
                    .filter(q => q.status === 'PENDENTE')
                    .reduce((sum, q) => sum + getQuoteTotal(q), 0)
                )}
              </p>
            </div>

            <div className="bg-white rounded-xl p-4 border border-red-200 shadow-sm">
              <p className="text-xs text-red-600 uppercase font-bold mb-1">❌ Perdidos</p>
              <p className="text-3xl font-bold text-red-600">
                {filteredAndSortedHistory.filter(q => q.status === 'PERDIDO').length}
              </p>
            </div>
          </div>
        </div>

        {/* List com Preview */}
        <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
          {filteredAndSortedHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Calendar className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-semibold">
                {hasActiveFilters ? 'Nenhum orçamento encontrado' : 'Nenhum orçamento salvo'}
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-24">
              {filteredAndSortedHistory.map((quote) => {
                const total = getQuoteTotal(quote);
                const isExpanded = expandedQuoteId === quote.id;

                return (
                  <div 
                    key={quote.id}
                    className="bg-white border-2 border-slate-200 rounded-xl relative hover:border-blue-300 transition-all shadow-sm hover:shadow-md"
                  >
                    {/* Card Header */}
                    <div className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-bold text-xl text-slate-900">
                              {quote.customerName || 'Cliente sem nome'}
                            </h3>
                            <StatusBadge quote={quote} />
                          </div>
                          
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-slate-400" />
                              <div>
                                <p className="text-xs text-slate-500">Data</p>
                                <p className="font-semibold text-slate-700">
                                  {new Date(quote.updatedAt || quote.createdAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <Package className="w-4 h-4 text-slate-400" />
                              <div>
                                <p className="text-xs text-slate-500">Itens</p>
                                <p className="font-semibold text-slate-700">{quote.items.length}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              <div>
                                <p className="text-xs text-slate-500">Total</p>
                                <p className="font-bold text-green-600 text-lg">{formatCurrency(total)}</p>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => setExpandedQuoteId(isExpanded ? null : quote.id)}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                            {isExpanded ? 'Ocultar' : 'Preview'}
                          </button>

                          <button
                            onClick={() => onRestore(quote)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2 transition-colors"
                            title="Restaurar orçamento"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Restaurar
                          </button>

                          <button
                            onClick={() => {
                              if (confirm(`Excluir orçamento de ${quote.customerName}?`)) {
                                onDelete(quote.id);
                              }
                            }}
                            className="text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* ✅ PREVIEW EXPANDIDO */}
                    {isExpanded && (
                      <div className="bg-slate-50 border-t border-slate-200 p-4 animate-in slide-in-from-top-2 duration-200">
                        <h4 className="font-bold text-slate-700 mb-3 flex items-center gap-2">
                          <Package className="w-5 h-5" />
                          Itens do Orçamento
                        </h4>
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead className="bg-slate-100 border-b border-slate-200">
                              <tr>
                                <th className="p-3 text-left font-bold text-slate-600">QTDE</th>
                                <th className="p-3 text-left font-bold text-slate-600">DESCRIÇÃO</th>
                                <th className="p-3 text-right font-bold text-slate-600">VALOR UN.</th>
                                <th className="p-3 text-right font-bold text-slate-600">TOTAL</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {quote.items.map((item, idx) => {
                                const itemTotal = getItemTotal(item);
                                const price = Number(item.unitPrice) || Number(item.catalogItem?.price) || 0;
                                
                                return (
                                  <tr key={idx} className="hover:bg-slate-50">
                                    <td className="p-3 font-semibold text-slate-700">{item.quantity}</td>
                                    <td className="p-3 text-slate-900">
                                      {item.catalogItem?.description || item.originalRequest}
                                    </td>
                                    <td className="p-3 text-right text-slate-700">
                                      {formatCurrency(price)}
                                    </td>
                                    <td className="p-3 text-right font-bold text-green-600">
                                      {formatCurrency(itemTotal)}
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr className="bg-slate-50 font-bold">
                                <td colSpan={3} className="p-3 text-right text-slate-700">TOTAL:</td>
                                <td className="p-3 text-right text-green-600 text-lg">{formatCurrency(total)}</td>
                              </tr>
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
      </div>
    </div>
  );
};