import React, { useMemo } from 'react';
import { X, TrendingUp, DollarSign, Package, Users, Calendar, CheckCircle, Clock, XCircle } from 'lucide-react';
import { SavedQuote, QuoteStatus } from '../types';
import { formatCurrency } from '../utils/parser';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SavedQuote[];
}

export function DashboardModal({ isOpen, onClose, history }: DashboardModalProps) {
  const stats = useMemo(() => {
    const today = new Date();
    const thisMonth = today.getMonth();
    const thisYear = today.getFullYear();

    // Filtrar orçamentos do mês atual
    const thisMonthQuotes = history.filter(quote => {
      const quoteDate = new Date(quote.timestamp);
      return quoteDate.getMonth() === thisMonth && quoteDate.getFullYear() === thisYear;
    });

    // Total geral
    const totalValue = history.reduce((sum, quote) => sum + quote.totalValue, 0);
    
    // Total do mês
    const monthValue = thisMonthQuotes.reduce((sum, quote) => sum + quote.totalValue, 0);

    // Contadores por status
    const approved = history.filter(q => q.status === 'approved').length;
    const pending = history.filter(q => q.status === 'pending').length;
    const lost = history.filter(q => q.status === 'lost').length;

    // Taxa de conversão
    const conversionRate = history.length > 0 
      ? ((approved / history.length) * 100).toFixed(0)
      : '0';

    // Valor médio dos orçamentos
    const averageValue = history.length > 0 
      ? totalValue / history.length 
      : 0;

    // Clientes únicos
    const uniqueClients = new Set(history.map(q => q.client.toLowerCase())).size;

    // Total de itens cotados
    const totalItems = history.reduce((sum, quote) => sum + quote.items.length, 0);

    // Últimos 5 orçamentos
    const recentQuotes = [...history]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 5);

    return {
      totalValue,
      monthValue,
      approved,
      pending,
      lost,
      conversionRate,
      averageValue,
      uniqueClients,
      totalItems,
      totalQuotes: history.length,
      recentQuotes,
      thisMonthQuotes: thisMonthQuotes.length
    };
  }, [history]);

  if (!isOpen) return null;

  const getStatusIcon = (status?: QuoteStatus) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'lost':
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusText = (status?: QuoteStatus) => {
    switch (status) {
      case 'approved':
        return 'Aprovado';
      case 'pending':
        return 'Pendente';
      case 'lost':
        return 'Perdido';
      default:
        return 'Pendente';
    }
  };

  const getStatusColor = (status?: QuoteStatus) => {
    switch (status) {
      case 'approved':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'lost':
        return 'bg-red-50 text-red-700 border-red-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp className="w-8 h-8" />
            <div>
              <h2 className="text-2xl font-bold">Dashboard de Orçamentos</h2>
              <p className="text-blue-100 text-sm">Visão geral do seu negócio</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Geral */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-green-700">Total Geral</span>
                <DollarSign className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold text-green-900">{formatCurrency(stats.totalValue)}</p>
              <p className="text-xs text-green-600 mt-1">{stats.totalQuotes} orçamentos</p>
            </div>

            {/* Mês Atual */}
            <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-blue-700">Mês Atual</span>
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold text-blue-900">{formatCurrency(stats.monthValue)}</p>
              <p className="text-xs text-blue-600 mt-1">{stats.thisMonthQuotes} orçamentos</p>
            </div>

            {/* Taxa de Conversão */}
            <div className="bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-purple-700">Conversão</span>
                <TrendingUp className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold text-purple-900">{stats.conversionRate}%</p>
              <p className="text-xs text-purple-600 mt-1">{stats.approved} aprovados</p>
            </div>

            {/* Ticket Médio */}
            <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-orange-700">Ticket Médio</span>
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold text-orange-900">{formatCurrency(stats.averageValue)}</p>
              <p className="text-xs text-orange-600 mt-1">{stats.totalItems} itens</p>
            </div>
          </div>

          {/* Status e Clientes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
            {/* Status dos Orçamentos */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                Status dos Orçamentos
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-900">Aprovados</span>
                  </div>
                  <span className="text-2xl font-bold text-green-700">{stats.approved}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2">
                    <Clock className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-900">Pendentes</span>
                  </div>
                  <span className="text-2xl font-bold text-yellow-700">{stats.pending}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-medium text-red-900">Perdidos</span>
                  </div>
                  <span className="text-2xl font-bold text-red-700">{stats.lost}</span>
                </div>
              </div>
            </div>

            {/* Clientes */}
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Clientes
              </h3>
              <div className="space-y-4">
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-3">
                    <Users className="w-10 h-10 text-blue-600" />
                  </div>
                  <p className="text-4xl font-bold text-slate-800 mb-1">{stats.uniqueClients}</p>
                  <p className="text-sm text-slate-600">Clientes únicos</p>
                </div>
              </div>
            </div>
          </div>

          {/* Orçamentos Recentes */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Orçamentos Recentes
            </h3>
            {stats.recentQuotes.length > 0 ? (
              <div className="space-y-2">
                {stats.recentQuotes.map((quote, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-slate-800">{quote.client}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(quote.timestamp).toLocaleDateString('pt-BR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-slate-800">{formatCurrency(quote.totalValue)}</span>
                      <span className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium border ${getStatusColor(quote.status)}`}>
                        {getStatusIcon(quote.status)}
                        {getStatusText(quote.status)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum orçamento encontrado</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 p-4 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
