<change>
<file>components/DashboardModal.tsx</file>
<description>Ensure DashboardModal provides visual analytics (Charts/KPIs) distinct from the list-based HistoryModal.</description>
<content><![CDATA[
import React, { useState, useMemo } from 'react';
import { SavedQuote } from '../types';
import { formatCurrency } from '../utils/parser';
import { X, TrendingUp, DollarSign, FileText, AlertCircle, CheckCircle, XCircle, BarChart3, PieChart as PieIcon } from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts';

interface DashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  history: SavedQuote[];
}

type PeriodFilter = 'TODAY' | 'LAST_7_DAYS' | 'THIS_MONTH' | 'LAST_MONTH' | 'ALL_TIME';

const COLORS = {
  APROVADO: '#22c55e', // green-500
  PENDENTE: '#eab308', // yellow-500
  PERDIDO: '#ef4444',  // red-500
  RASCUNHO: '#94a3b8'  // slate-400
};

export const DashboardModal: React.FC<DashboardModalProps> = ({ isOpen, onClose, history }) => {
  const [period, setPeriod] = useState<PeriodFilter>('THIS_MONTH');

  // --- Date Filtering Logic ---
  const filteredHistory = useMemo(() => {
    if (!history) return [];
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    return history.filter(quote => {
      const qDate = new Date(quote.createdAt);
      const qTime = qDate.getTime();

      switch (period) {
        case 'TODAY':
          return qTime >= today;
        case 'LAST_7_DAYS':
          const sevenDaysAgo = today - (7 * 24 * 60 * 60 * 1000);
          return qTime >= sevenDaysAgo;
        case 'THIS_MONTH':
          return qDate.getMonth() === now.getMonth() && qDate.getFullYear() === now.getFullYear();
        case 'LAST_MONTH':
          const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          const endLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);
          return qTime >= lastMonth.getTime() && qTime <= endLastMonth.getTime();
        case 'ALL_TIME':
        default:
          return true;
      }
    });
  }, [history, period]);

  // --- Metrics Calculation ---
  const metrics = useMemo(() => {
    if (filteredHistory.length === 0) {
        return {
            totalQuotes: 0,
            approved: { count: 0, value: 0 },
            pending: { count: 0, value: 0 },
            lost: { count: 0, value: 0 },
            conversionRate: 0
        };
    }

    const approved = filteredHistory.filter(q => q.status === 'APROVADO');
    const pending = filteredHistory.filter(q => q.status === 'PENDENTE');
    const lost = filteredHistory.filter(q => q.status === 'PERDIDO');

    const totalRevenue = approved.reduce((acc, q) => acc + (q.totalValue || 0), 0);
    const potentialRevenue = pending.reduce((acc, q) => acc + (q.totalValue || 0), 0);
    const lostRevenue = lost.reduce((acc, q) => acc + (q.totalValue || 0), 0);

    const closedDeals = approved.length + lost.length;
    const conversionRate = closedDeals > 0 
      ? Math.round((approved.length / closedDeals) * 100) 
      : 0;

    return {
      totalQuotes: filteredHistory.length,
      approved: { count: approved.length, value: totalRevenue },
      pending: { count: pending.length, value: potentialRevenue },
      lost: { count: lost.length, value: lostRevenue },
      conversionRate
    };
  }, [filteredHistory]);

  // --- Chart Data ---
  const dailyData = useMemo(() => {
    const data: Record<string, { date: string, count: number }> = {};
    
    if (period === 'LAST_7_DAYS' || period === 'THIS_MONTH') {
        const daysToLookBack = period === 'LAST_7_DAYS' ? 7 : new Date().getDate();
        for(let i = daysToLookBack - 1; i >= 0; i--) {
             const d = new Date();
             d.setDate(d.getDate() - i);
             const key = d.toLocaleDateString('pt-BR').substring(0, 5);
             data[key] = { date: key, count: 0 };
        }
    }

    filteredHistory.forEach(q => {
      try {
          const dateKey = new Date(q.createdAt).toLocaleDateString('pt-BR').substring(0, 5);
          if (!data[dateKey]) {
              data[dateKey] = { date: dateKey, count: 0 };
          }
          data[dateKey].count += 1;
      } catch (e) {
          // Ignore
      }
    });

    return Object.values(data);
  }, [filteredHistory, period]);

  const statusData = useMemo(() => {
    return [
      { name: 'Aprovados', value: metrics.approved.count, color: COLORS.APROVADO },
      { name: 'Pendentes', value: metrics.pending.count, color: COLORS.PENDENTE },
      { name: 'Perdidos', value: metrics.lost.count, color: COLORS.PERDIDO },
    ].filter(d => d.value > 0);
  }, [metrics]);

  const topProducts = useMemo(() => {
    const productMap: Record<string, { name: string, qty: number, total: number }> = {};
    
    const approvedQuotes = filteredHistory.filter(q => q.status === 'APROVADO');

    approvedQuotes.forEach(quote => {
      if (Array.isArray(quote.items)) {
        quote.items.forEach(item => {
            if (!item || !item.catalogItem) return;
            const key = item.catalogItem.description;
            const val = item.quantity * item.catalogItem.price;

            if (!productMap[key]) {
            productMap[key] = { 
                name: item.catalogItem.description, 
                qty: 0, 
                total: 0 
            };
            }
            productMap[key].qty += item.quantity;
            productMap[key].total += val;
        });
      }
    });

    return Object.values(productMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [filteredHistory]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white">
          <div className="flex items-center gap-3 text-slate-800">
             <div className="bg-blue-100 p-2 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
             </div>
             <div>
                <h2 className="text-xl font-bold">Dashboard de Vendas</h2>
                <p className="text-xs text-slate-500">Acompanhe suas métricas em tempo real</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
             <select 
               value={period} 
               onChange={(e) => setPeriod(e.target.value as PeriodFilter)}
               className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 font-medium shadow-sm outline-none"
             >
                <option value="TODAY">Hoje</option>
                <option value="LAST_7_DAYS">Últimos 7 dias</option>
                <option value="THIS_MONTH">Este Mês</option>
                <option value="LAST_MONTH">Mês Passado</option>
                <option value="ALL_TIME">Todo o Período</option>
             </select>

             <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg">
               <X className="w-6 h-6" />
             </button>
          </div>
        </div>

        {/* Content Scrollable Area */}
        <div className="overflow-y-auto flex-1 p-6 space-y-6">
           
           {/* KPI Cards */}
           <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              
              <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500 relative overflow-hidden group">
                 <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <DollarSign className="w-12 h-12 text-green-500" />
                 </div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Total Faturado</p>
                 <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mt-1">{formatCurrency(metrics.approved.value)}</h3>
                 <p className="text-xs text-green-600 font-medium mt-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" /> Aprovados
                 </p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-blue-500 relative overflow-hidden group">
                 <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <FileText className="w-12 h-12 text-blue-500" />
                 </div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Orçamentos</p>
                 <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mt-1">{metrics.totalQuotes}</h3>
                 <p className="text-xs text-blue-600 font-medium mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> {metrics.approved.count} fechados
                 </p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-purple-500 relative overflow-hidden group">
                 <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <PieIcon className="w-12 h-12 text-purple-500" />
                 </div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Taxa de Conversão</p>
                 <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mt-1">{metrics.conversionRate}%</h3>
                 <p className="text-xs text-slate-400 mt-2">
                    (Aprovados / Finalizados)
                 </p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-400 relative overflow-hidden group">
                 <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <AlertCircle className="w-12 h-12 text-yellow-500" />
                 </div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Pendentes</p>
                 <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mt-1">{metrics.pending.count}</h3>
                 <p className="text-xs text-yellow-600 font-medium mt-2 truncate">
                    Potencial: {formatCurrency(metrics.pending.value)}
                 </p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500 relative overflow-hidden group">
                 <div className="absolute top-2 right-2 opacity-10 group-hover:opacity-20 transition-opacity">
                    <XCircle className="w-12 h-12 text-red-500" />
                 </div>
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Perdidos</p>
                 <h3 className="text-xl lg:text-2xl font-bold text-slate-800 mt-1">{metrics.lost.count}</h3>
                 <p className="text-xs text-red-600 font-medium mt-2 truncate">
                    Perda: {formatCurrency(metrics.lost.value)}
                 </p>
              </div>
           </div>

           {/* 2. Main Chart Area */}
           <div className="bg-white p-6 rounded-xl shadow-sm">
             <div className="flex items-center justify-between mb-4">
                 <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-500" /> Orçamentos por Dia
                 </h3>
             </div>
             <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                   <BarChart data={dailyData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis 
                        dataKey="date" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#64748b'}} 
                        dy={10}
                      />
                      <YAxis 
                        allowDecimals={false}
                        axisLine={false} 
                        tickLine={false} 
                        tick={{fontSize: 12, fill: '#64748b'}} 
                      />
                      <Tooltip 
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        cursor={{fill: '#f8fafc'}}
                      />
                      <Bar 
                        dataKey="count" 
                        name="Qtd. Orçamentos" 
                        fill="#fbbf24"
                        radius={[4, 4, 0, 0]} 
                        barSize={40} 
                      />
                   </BarChart>
                </ResponsiveContainer>
             </div>
           </div>

           {/* 3. Bottom Grid */}
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Top Products */}
              <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col">
                 <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" /> Produtos Mais Vendidos (Top 5)
                 </h3>
                 
                 {topProducts.length > 0 ? (
                    <div className="space-y-4 flex-1">
                        {topProducts.map((prod, idx) => (
                            <div key={idx} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-lg transition-colors border-b border-slate-100 last:border-0 group">
                                <div className="flex items-center gap-4 overflow-hidden flex-1">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-slate-100 text-slate-500 font-bold text-sm shrink-0 group-hover:bg-yellow-100 group-hover:text-yellow-700 transition-colors">
                                        {idx + 1}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-bold text-slate-700 text-sm truncate" title={prod.name}>{prod.name}</p>
                                        <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2">
                                            <div 
                                              className="bg-green-500 h-1.5 rounded-full" 
                                              style={{ width: `${(prod.qty / topProducts[0].qty) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-right shrink-0 pl-4">
                                    <p className="font-bold text-slate-800">{prod.qty} <span className="text-xs font-normal text-slate-500">und/m</span></p>
                                    <p className="text-xs text-green-600 font-medium">{formatCurrency(prod.total)}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                 ) : (
                    <div className="flex-1 flex items-center justify-center text-slate-400 py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <p>Nenhuma venda aprovada no período</p>
                    </div>
                 )}
              </div>

              {/* Status Chart */}
              <div className="bg-white p-6 rounded-xl shadow-sm flex flex-col">
                 <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <PieIcon className="w-5 h-5 text-blue-500" /> Desempenho por Status
                 </h3>
                 <div className="flex-1 min-h-[300px] flex items-center justify-center">
                    {statusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                                <Pie
                                    data={statusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={70}
                                    outerRadius={100}
                                    paddingAngle={2}
                                    dataKey="value"
                                    stroke="none"
                                >
                                    {statusData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                  formatter={(value: number) => [`${value} orçamentos`, 'Quantidade']}
                                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Legend 
                                  verticalAlign="bottom" 
                                  height={36} 
                                  iconType="circle"
                                  formatter={(value, entry: any) => <span className="text-slate-600 font-medium ml-1">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center text-slate-400 h-full w-full bg-slate-50 rounded-lg border border-dashed border-slate-200">
                            <AlertCircle className="w-8 h-8 mb-2 opacity-20" />
                            <p>Sem dados para exibir</p>
                        </div>
                    )}
                 </div>
              </div>

           </div>

        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-white flex justify-end">
            <button onClick={onClose} className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 font-medium transition-colors">
                Fechar Dashboard
            </button>
        </div>
      </div>
    </div>
  );
};
]]></content>
</change>
