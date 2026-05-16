import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid,
  ScatterChart,
  Scatter,
  ZAxis
} from 'recharts';
import { 
  TrendingUp, 
  Shield, 
  Landmark, 
  Briefcase, 
  Info, 
  ChevronRight, 
  ArrowUpRight, 
  Coins, 
  Building2, 
  BookOpen,
  LineChart as LineChartIcon,
  Target,
  ShieldCheck,
  Zap,
  Star,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { FinancialProfile, Language, Currency } from '../types';
import { translations, TranslationKeys } from '../translations';

interface InvestmentStrategiesProps {
  profile: FinancialProfile;
  language: Language;
  currency: Currency;
}

const InvestmentStrategies: React.FC<InvestmentStrategiesProps> = ({ profile, language, currency }) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const t = (key: TranslationKeys) => {
    return translations[language.code as keyof typeof translations]?.[key] || translations.en[key];
  };

  const formatCurrency = (value: number) => {
    const convertedValue = value * currency.rate;
    if (convertedValue >= 10000000) return `${currency.symbol}${(convertedValue / 10000000).toFixed(2)} Cr`;
    if (convertedValue >= 100000) return `${currency.symbol}${(convertedValue / 100000).toFixed(2)} L`;
    return `${currency.symbol}${convertedValue.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const advisorData = useMemo(() => {
    const { age, monthlyIncome, monthlyExpenses, savings, riskTolerance } = profile;
    const surplus = Math.max(0, monthlyIncome - monthlyExpenses);
    const healthScore = Math.min(100, Math.max(0, 
      (savings / (monthlyExpenses * 6 || 1) * 30) + 
      ((surplus / monthlyIncome) * 40) + 
      (riskTolerance === 'medium' ? 30 : 20)
    ));

    const emergencyFundTarget = monthlyExpenses * 6;
    const insuranceCoverage = monthlyIncome * 12 * 10; // 10x Annual Income for Life

    // Dynamic Asset Allocation based on Age (100 - age rule) and Risk
    let equityBase = 100 - age;
    if (riskTolerance === 'low') equityBase *= 0.6;
    if (riskTolerance === 'high') equityBase *= 1.2;
    equityBase = Math.min(85, Math.max(10, equityBase));

    const allocation = [
      { name: t('equity'), value: Math.round(equityBase), color: '#3b82f6' },
      { name: t('debt'), value: Math.round((100 - equityBase) * 0.7), color: '#10b981' },
      { name: t('gold'), value: 10, color: '#f59e0b' },
      { name: t('cash'), value: Math.max(5, Math.round(100 - equityBase - (100 - equityBase) * 0.7 - 10)), color: '#6366f1' },
    ];

    const roadmap = [
      {
        title: t('phase1Protection'),
        status: savings >= emergencyFundTarget ? 'completed' : 'active',
        items: [
          { label: t('emergencyFundTarget'), value: formatCurrency(emergencyFundTarget), icon: <Shield size={14} /> },
          { label: t('insuranceCoverage'), value: formatCurrency(insuranceCoverage), icon: <ShieldCheck size={14} /> }
        ]
      },
      {
        title: t('phase2Growth'),
        status: savings >= emergencyFundTarget ? 'active' : 'pending',
        items: [
          { label: t('monthlySurplus'), value: formatCurrency(surplus), icon: <Zap size={14} /> },
          { label: t('taxOptimization'), value: age < 40 ? 'ELSS + NPS' : 'NPS + PPF', icon: <Target size={14} /> }
        ]
      },
      {
        title: t('phase3Legacy'),
        status: 'pending',
        items: [
          { label: t('yearsToRetirement'), value: `${Math.max(0, 60 - age)} Years`, icon: <Star size={14} /> },
          { label: t('wealthCreation'), value: 'Diversified Portfolio', icon: <Briefcase size={14} /> }
        ]
      }
    ];

    return { healthScore, emergencyFundTarget, insuranceCoverage, allocation, roadmap, surplus };
  }, [profile, currency, t]);

  const investmentTypes = [
    {
      id: 'stocks',
      name: t('stocks'),
      icon: <TrendingUp size={20} />,
      desc: t('stocksDesc'),
      risk: t('high'),
      riskValue: 80,
      returnValue: 15,
      returns: '12-18% p.a.',
      suitability: profile.riskTolerance === 'high' ? t('suitabilityHigh') : (profile.riskTolerance === 'medium' ? t('suitabilityMedium') : t('suitabilityLow')),
      color: 'bg-indigo-500/20 text-indigo-400 border-indigo-500/30 font-bold'
    },
    {
      id: 'mutualFunds',
      name: t('mutualFunds'),
      icon: <Briefcase size={20} />,
      desc: t('mutualFundsDesc'),
      risk: t('medium') + ' - ' + t('high'),
      riskValue: 60,
      returnValue: 12,
      returns: '10-15% p.a.',
      suitability: profile.riskTolerance === 'low' ? t('suitabilityLow') : t('suitabilityHigh'),
      color: 'bg-blue-500/20 text-blue-400 border-blue-500/30 font-bold'
    },
    {
      id: 'sgb',
      name: t('sgb'),
      icon: <Coins size={20} />,
      desc: t('sgbDesc'),
      risk: t('low'),
      riskValue: 10,
      returnValue: 8,
      returns: '2.5% + Gold Appr.',
      suitability: t('suitabilityHigh'),
      color: 'bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold'
    },
    {
      id: 'ppf',
      name: t('ppf'),
      icon: <Landmark size={20} />,
      desc: t('ppfDesc'),
      risk: t('low'),
      riskValue: 5,
      returnValue: 7.1,
      returns: '7.1% p.a. (Tax Free)',
      suitability: profile.riskTolerance === 'low' ? t('suitabilityHigh') : t('suitabilityMedium'),
      color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold'
    }
  ];

  const growthData = useMemo(() => {
    const years = 15;
    const initialSavings = profile.savings;
    const monthlyInvestment = Math.max(0, (profile.monthlyIncome - profile.monthlyExpenses) * 0.8);
    const annualRate = profile.riskTolerance === 'low' ? 0.08 : (profile.riskTolerance === 'medium' ? 0.12 : 0.15);
    
    const data = [];
    let currentWealth = initialSavings;

    for (let year = 0; year <= years; year++) {
      data.push({
        year: `${year}Y`,
        wealth: Math.round(currentWealth),
        investment: Math.round(initialSavings + (monthlyInvestment * 12 * year))
      });
      currentWealth = (currentWealth + (monthlyInvestment * 12)) * (1 + annualRate);
    }
    return data;
  }, [profile]);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Professional Advisor Card */}
      <div className="p-10 glass-surface rounded-[2.5rem] border border-white/5 relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand-primary/5 rounded-full blur-[100px] -mr-40 -mt-40 group-hover:bg-brand-primary/10 transition-colors duration-1000" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8 relative z-10">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 flex items-center justify-center border border-brand-primary/20 shrink-0">
              <Shield className="text-brand-primary" size={32} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-100 tracking-tight leading-none mb-2 uppercase tracking-widest">{t('currentFinancialHealth')}</h3>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-slate-500 uppercase font-medium tracking-[0.2em]">{t('riskProfile')}</span>
                <span className="px-2 py-0.5 bg-brand-primary/5 text-brand-primary border border-brand-primary/10 rounded-md text-[8px] font-bold uppercase tracking-widest">{t(profile.riskTolerance)}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-start md:items-end">
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white tracking-tighter leading-none">{Math.round(advisorData.healthScore)}</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Score</span>
            </div>
            <div className="h-1 w-40 bg-white/5 rounded-full mt-4 overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${advisorData.healthScore}%` }}
                className="h-full bg-brand-primary rounded-full"
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 relative z-10">
          <div className="p-6 bg-white/[0.01] rounded-2xl border border-white/5 hover:border-brand-primary/10 transition-colors duration-500">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="text-emerald-500/80" size={14} />
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.2em]">{t('monthlySurplus')}</p>
            </div>
            <p className="text-xl font-bold text-white tabular-nums">{formatCurrency(advisorData.surplus)}</p>
          </div>
          <div className="p-6 bg-white/[0.01] rounded-2xl border border-white/5 hover:border-brand-primary/10 transition-colors duration-500">
            <div className="flex items-center gap-2 mb-3">
              <Star className="text-indigo-500/80" size={14} />
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-[0.2em]">{t('yearsToRetirement')}</p>
            </div>
            <p className="text-xl font-bold text-white tabular-nums">{Math.max(0, 60 - profile.age)} <span className="text-[10px] text-slate-500 uppercase tracking-widest ml-1 font-medium">Years To 60</span></p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Allocation & Roadmap */}
        <div className="lg:col-span-12 space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Allocation Section */}
            <section className="space-y-6">
              <div className="px-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em]">{t('recommendedAllocation')}</h4>
              </div>
              
              <div className="glass-surface p-10 rounded-[2.5rem] border border-white/5 relative group h-full">
                <div className="flex flex-col items-center">
                  <div className="h-56 w-full relative">
                    <div className="absolute inset-0 flex items-center justify-center flex-col z-0 pointer-events-none">
                        <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{t('equity')}</span>
                        <span className="text-2xl font-bold text-white tracking-tight mt-0.5">
                          {advisorData.allocation.find(a => a.name === t('equity'))?.value}%
                        </span>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={advisorData.allocation}
                          cx="50%"
                          cy="50%"
                          innerRadius="85%"
                          outerRadius="100%"
                          paddingAngle={3}
                          dataKey="value"
                          animationDuration={1500}
                          stroke="none"
                        >
                          {advisorData.allocation.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              className="hover:opacity-70 transition-opacity duration-300 cursor-pointer outline-none"
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '12px', padding: '10px' }}
                          itemStyle={{ color: '#fff', fontSize: '9px', fontWeight: 'bold', textTransform: 'uppercase' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 w-full mt-10">
                    {advisorData.allocation.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-3.5 bg-white/[0.01] rounded-xl border border-white/5">
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                          <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest truncate">{item.name}</span>
                        </div>
                        <span className="text-[10px] font-bold text-white tabular-nums">{item.value}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            {/* Strategic Roadmap */}
            <section className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('strategicRoadmap')}</h4>
              </div>
              
              <div className="space-y-4">
                {advisorData.roadmap.map((phase, i) => (
                  <motion.div 
                    key={i} 
                    className={`p-6 rounded-[2rem] border transition-all duration-300 ${
                      phase.status === 'completed' ? 'bg-emerald-500/[0.02] border-emerald-500/10' : 
                      phase.status === 'active' ? 'bg-brand-primary/[0.05] border-brand-primary/20' : 
                      'bg-white/[0.02] border-white/5'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold border transition-colors ${
                           phase.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
                           phase.status === 'active' ? 'bg-brand-primary/10 text-brand-primary border-brand-primary/20' : 
                           'bg-white/5 text-slate-600 border-white/10'
                         }`}>
                           {phase.status === 'completed' ? <CheckCircle2 size={18} /> : i + 1}
                         </div>
                         <h5 className={`text-sm font-bold uppercase tracking-wider ${
                           phase.status === 'active' ? 'text-white' : 'text-slate-500'
                         }`}>{phase.title}</h5>
                      </div>
                      {phase.status === 'active' && (
                        <span className="px-2 py-0.5 bg-brand-primary/10 text-brand-primary rounded text-[8px] font-bold uppercase tracking-widest">Active</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      {phase.items.map((item, j) => (
                        <div key={j} className="space-y-1">
                          <div className="flex items-center gap-2 text-slate-500">
                             {React.cloneElement(item.icon as React.ReactElement, { size: 12 })}
                             <span className="text-[9px] font-bold uppercase tracking-widest text-slate-600">{item.label}</span>
                          </div>
                          <p className={`text-xs font-bold ${phase.status === 'active' ? 'text-white' : 'text-slate-400'}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>
            </section>
          </div>

          {/* Detailed Investment Guide - Cleaned UI */}
          <section className="space-y-6 pt-8 border-t border-white/5">
            <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('investmentGuide')}</h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {investmentTypes.map((type) => (
                <div
                  key={type.id}
                  onClick={() => setSelectedType(selectedType === type.id ? null : type.id)}
                  className={`cursor-pointer group p-6 rounded-[2rem] border transition-all duration-300 ${
                    selectedType === type.id 
                    ? 'bg-white/[0.05] border-white/10' 
                    : 'bg-white/[0.02] border-white/5 hover:border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${type.color.split(' ')[0]}`}>
                        {React.cloneElement(type.icon as React.ReactElement<{ size?: number; className?: string }>, { size: 20, className: type.color.split(' ')[1] })}
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-white uppercase tracking-wider">{type.name}</h5>
                        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-widest mt-1">{type.risk} RISK</p>
                      </div>
                    </div>
                    <ChevronRight size={18} className={`text-slate-600 transition-transform ${selectedType === type.id ? 'rotate-90' : ''}`} />
                  </div>

                  <AnimatePresence>
                    {selectedType === type.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="mt-6 space-y-6 overflow-hidden"
                      >
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {type.desc}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest mb-1">{t('expectedReturns')}</p>
                            <p className="text-xs font-bold text-emerald-400">{type.returns}</p>
                          </div>
                          <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                            <p className="text-[8px] text-slate-500 uppercase font-bold tracking-widest mb-1">{t('suitability')}</p>
                            <p className="text-[10px] font-bold text-slate-300 uppercase">{type.suitability}</p>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
          </section>

          {/* Growth Projection Chart - Cleaned */}
          <section className="space-y-6 pt-8 border-t border-white/5">
             <div className="flex flex-col gap-1 px-2">
               <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">{t('projectedGrowth')}</h4>
               <p className="text-[10px] text-slate-600 font-medium uppercase tracking-widest">15-Year Compound Simulation</p>
             </div>
            
            <div className="h-72 w-full glass-surface rounded-[2.5rem] p-8 border border-white/5 relative">
              <div className="absolute top-8 right-8 flex items-center gap-6 z-10">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-brand-primary" />
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Growth</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full border border-slate-700 bg-transparent" />
                  <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Capital</span>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={growthData}>
                  <defs>
                    <linearGradient id="wealthGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 4" stroke="rgba(255,255,255,0.03)" vertical={false} />
                  <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }} />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#475569', fontSize: 10, fontWeight: 600 }}
                    tickFormatter={(val) => `${currency.symbol}${(val * currency.rate / 100000).toFixed(0)}L`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#09090b', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', padding: '12px' }}
                    itemStyle={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase' }}
                    formatter={(value: number) => [formatCurrency(value), '']}
                  />
                  <Area type="monotone" dataKey="wealth" stroke="#3b82f6" strokeWidth={3} fill="url(#wealthGrad)" animationDuration={3000} />
                  <Area type="monotone" dataKey="investment" stroke="#334155" strokeWidth={1.5} strokeDasharray="5 5" fill="transparent" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </section>

          {/* Compliance & Footnotes */}
          <div className="p-8 bg-slate-900/50 rounded-[3rem] border border-white/5 text-center flex flex-col items-center gap-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <AlertTriangle className="text-amber-500/80" size={24} />
            </div>
            <div className="space-y-2">
              <h5 className="text-[10px] font-black text-amber-500/80 uppercase tracking-[0.3em] font-serif italic">Regulatory Information & Risk Disclosure</h5>
              <p className="text-[11px] text-slate-500 leading-relaxed max-w-2xl font-medium">
                The allocations and projections represented here are generated based on modern portfolio theory and historical risk-parity vectors. Past performance is not indicative of future results. All investments carry market risk. This document is for analytical purposes and does not constitute a certified investment mandate.
              </p>
            </div>
            <div className="flex items-center gap-6">
              <button className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em] hover:text-white transition-colors border-b-2 border-brand-primary pb-0.5">
                Download PDF Portfolio
              </button>
              <button className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] hover:text-white transition-colors">
                View Methodology
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InvestmentStrategies;
