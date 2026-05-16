import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import { FinancialProfile, Currency } from '../types';
import { cn } from '../lib/utils';

interface FinancialChartsProps {
  profile: FinancialProfile;
  currency?: Currency;
}

const FinancialCharts: React.FC<FinancialChartsProps> = ({ profile, currency }) => {
  const formatCurrency = (value: number) => {
    if (!currency) return `₹${value.toLocaleString('en-IN')}`;
    const converted = value * currency.rate;
    return `${currency.symbol}${converted.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const formatShort = (value: number) => {
    if (!currency) return `₹${(value / 1000).toFixed(0)}k`;
    const converted = value * currency.rate;
    if (converted >= 10000000) return `${currency.symbol}${(converted / 10000000).toFixed(1)}Cr`;
    if (converted >= 100000) return `${currency.symbol}${(converted / 100000).toFixed(1)}L`;
    if (converted >= 1000) return `${currency.symbol}${(converted / 1000).toFixed(0)}k`;
    return `${currency.symbol}${converted.toFixed(0)}`;
  };
  // 1. Income vs Expenses Data (Mock 6 months)
  const incomeExpensesData = [
    { name: 'Oct', income: profile.monthlyIncome * 0.95, expenses: profile.monthlyExpenses * 1.05 },
    { name: 'Nov', income: profile.monthlyIncome * 1.02, expenses: profile.monthlyExpenses * 0.98 },
    { name: 'Dec', income: profile.monthlyIncome * 1.1, expenses: profile.monthlyExpenses * 1.2 }, // Bonus month
    { name: 'Jan', income: profile.monthlyIncome, expenses: profile.monthlyExpenses },
    { name: 'Feb', income: profile.monthlyIncome * 0.98, expenses: profile.monthlyExpenses * 0.95 },
    { name: 'Mar', income: profile.monthlyIncome, expenses: profile.monthlyExpenses * 1.02 },
  ];

  // 2. Savings Growth (Projected 12 months)
  const monthlySavings = profile.monthlyIncome - profile.monthlyExpenses;
  const savingsGrowthData = Array.from({ length: 12 }, (_, i) => ({
    month: `M${i + 1}`,
    savings: profile.savings + (monthlySavings * (i + 1)),
  }));

  // 3. Portfolio Allocation based on Risk Tolerance
  const getAllocation = () => {
    switch (profile.riskTolerance) {
      case 'low':
        return [
          { name: 'Debt/FD', value: 60, color: '#4F46E5' },
          { name: 'Gold', value: 20, color: '#F59E0B' },
          { name: 'Equity', value: 20, color: '#10B981' },
        ];
      case 'high':
        return [
          { name: 'Equity', value: 70, color: '#10B981' },
          { name: 'Debt/FD', value: 20, color: '#4F46E5' },
          { name: 'Gold', value: 10, color: '#F59E0B' },
        ];
      default: // medium
        return [
          { name: 'Equity', value: 40, color: '#10B981' },
          { name: 'Debt/FD', value: 40, color: '#4F46E5' },
          { name: 'Gold', value: 20, color: '#F59E0B' },
        ];
    }
  };

  const allocationData = getAllocation();

  return (
    <div className="space-y-10">
      {/* Income vs Expenses */}
      <section>
        <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-5 tracking-[0.2em] ml-1">Income vs Expenses</h4>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={incomeExpensesData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.5} />
              <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 600 }} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 600 }} tickFormatter={(value) => formatShort(value)} />
              <Tooltip 
                cursor={{ fill: '#1e293b', opacity: 0.4 }}
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  backdropFilter: 'blur(8px)',
                  padding: '12px'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}
                labelStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}
                formatter={(value: number) => [formatCurrency(value), '']}
              />
              <Bar dataKey="income" fill="#4F46E5" radius={[6, 6, 0, 0]} name="Income" barSize={12} />
              <Bar dataKey="expenses" fill="#F43F5E" radius={[6, 6, 0, 0]} name="Expenses" barSize={12} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Savings Growth */}
      <section>
        <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-5 tracking-[0.2em] ml-1">Savings Projection (1yr)</h4>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={savingsGrowthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" opacity={0.5} />
              <XAxis dataKey="month" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 600 }} />
              <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontWeight: 600 }} tickFormatter={(value) => formatShort(value)} />
              <Tooltip 
                contentStyle={{ 
                  borderRadius: '16px', 
                  border: '1px solid rgba(255,255,255,0.1)', 
                  boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.5)',
                  backgroundColor: 'rgba(15, 23, 42, 0.9)',
                  backdropFilter: 'blur(8px)',
                  padding: '12px'
                }}
                itemStyle={{ fontSize: '12px', fontWeight: 700, color: '#f8fafc' }}
                labelStyle={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', color: '#94a3b8', marginBottom: '4px' }}
                formatter={(value: number) => [formatCurrency(value), 'Savings']}
              />
              <Area type="monotone" dataKey="savings" stroke="#10B981" fillOpacity={1} fill="url(#colorSavings)" strokeWidth={3} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {/* Portfolio Allocation */}
      <section>
        <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-5 tracking-[0.2em] ml-1">Recommended Allocation</h4>
        <div className="flex items-center gap-6">
          <div className="h-44 w-1/2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={allocationData}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={65}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {allocationData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)',
                    backgroundColor: '#0f172a',
                    fontSize: '10px',
                    fontWeight: 700,
                    color: '#f8fafc'
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="w-1/2 space-y-3">
            {allocationData.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: item.color }} />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{item.name}</span>
                <span className="text-[10px] font-black text-white ml-auto">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

export default FinancialCharts;
