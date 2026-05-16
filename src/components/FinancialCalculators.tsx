import React, { useState } from 'react';
import { Calculator, IndianRupee, TrendingUp, Landmark, Shield } from 'lucide-react';
import { cn } from '../lib/utils';
import { Language, Currency } from '../types';
import { translations, TranslationKeys } from '../translations';

interface FinancialCalculatorsProps {
  language?: Language;
  currency?: Currency;
}

const FinancialCalculators: React.FC<FinancialCalculatorsProps> = ({ language, currency }) => {
  const t = (key: TranslationKeys) => {
    if (!language) return key;
    const langCode = language.code as keyof typeof translations || 'en';
    return (translations[langCode] || translations.en)[key] || translations.en[key];
  };

  const formatCurrency = (value: number) => {
    if (!currency) return `₹${value.toLocaleString('en-IN')}`;
    const converted = value * currency.rate;
    return `${currency.symbol}${converted.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  };

  const [activeTab, setActiveTab] = useState<'sip' | 'emi' | 'lumpsum' | 'tax' | 'inflation'>('sip');

  // SIP State
  const [sipAmount, setSipAmount] = useState(5000);
  const [sipRate, setSipRate] = useState(12);
  const [sipYears, setSipYears] = useState(10);

  // EMI State
  const [loanAmount, setLoanAmount] = useState(1000000);
  const [loanRate, setLoanRate] = useState(8.5);
  const [loanYears, setLoanYears] = useState(20);

  // Lumpsum State
  const [lumpsumAmount, setLumpsumAmount] = useState(100000);
  const [lumpsumRate, setLumpsumRate] = useState(12);
  const [lumpsumYears, setLumpsumYears] = useState(10);

  // Tax State
  const [salary, setSalary] = useState(1200000);
  const [deductions, setDeductions] = useState(150000);

  // Inflation State
  const [currentCost, setCurrentCost] = useState(50000);
  const [inflationRate, setInflationRate] = useState(6);
  const [inflationYears, setInflationYears] = useState(10);

  // SIP Calculation
  const calculateSIP = () => {
    const i = (sipRate / 100) / 12;
    const n = sipYears * 12;
    const maturityValue = sipAmount * (((Math.pow(1 + i, n) - 1) / i) * (1 + i));
    const totalInvested = sipAmount * n;
    const estimatedReturns = maturityValue - totalInvested;
    return { maturityValue, totalInvested, estimatedReturns };
  };

  // EMI Calculation
  const calculateEMI = () => {
    const r = (loanRate / 100) / 12;
    const n = loanYears * 12;
    const emi = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    const totalPayment = emi * n;
    const totalInterest = totalPayment - loanAmount;
    return { emi, totalPayment, totalInterest };
  };

  // Lumpsum Calculation
  const calculateLumpsum = () => {
    const r = lumpsumRate / 100;
    const n = lumpsumYears;
    const maturityValue = lumpsumAmount * Math.pow(1 + r, n);
    const totalInvested = lumpsumAmount;
    const estimatedReturns = maturityValue - totalInvested;
    return { maturityValue, totalInvested, estimatedReturns };
  };

  // Tax Calculation (Very simplified Indian Tax calculation)
  const calculateTax = () => {
    const taxableIncome = Math.max(0, salary - deductions);
    let tax = 0;
    
    // New Regime (FY 2024-25 / AY 2025-26) - Simplified
    if (taxableIncome <= 300000) tax = 0;
    else if (taxableIncome <= 600000) tax = (taxableIncome - 300000) * 0.05;
    else if (taxableIncome <= 900000) tax = 15000 + (taxableIncome - 600000) * 0.1;
    else if (taxableIncome <= 1200000) tax = 45000 + (taxableIncome - 900000) * 0.15;
    else if (taxableIncome <= 1500000) tax = 90000 + (taxableIncome - 1200000) * 0.2;
    else tax = 150000 + (taxableIncome - 1500000) * 0.3;

    return { tax };
  };

  // Inflation Calculation
  const calculateInflation = () => {
    const futureValue = currentCost * Math.pow(1 + inflationRate / 100, inflationYears);
    return { futureValue };
  };

  const sip = calculateSIP();
  const emi = calculateEMI();
  const lumpsum = calculateLumpsum();
  const tax = calculateTax();
  const inflation = calculateInflation();

  return (
    <div className="space-y-6">
      <div className="flex p-1.5 glass-surface rounded-2xl border border-white/5 buttery-glide overflow-x-auto custom-scrollbar no-scrollbar gap-1">
        <button
          onClick={() => setActiveTab('sip')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest buttery-glide whitespace-nowrap",
            activeTab === 'sip' ? "bg-white/10 text-brand-primary shadow-lg" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <TrendingUp size={14} /> {t('sip')}
        </button>
        <button
          onClick={() => setActiveTab('lumpsum')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest buttery-glide whitespace-nowrap",
            activeTab === 'lumpsum' ? "bg-white/10 text-brand-primary shadow-lg" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <Calculator size={14} /> {t('lumpsum')}
        </button>
        <button
          onClick={() => setActiveTab('emi')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest buttery-glide whitespace-nowrap",
            activeTab === 'emi' ? "bg-white/10 text-brand-primary shadow-lg" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <Landmark size={14} /> {t('emi')}
        </button>
        <button
          onClick={() => setActiveTab('tax')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest buttery-glide whitespace-nowrap",
            activeTab === 'tax' ? "bg-white/10 text-brand-primary shadow-lg" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <Shield size={14} /> {t('incomeTax')}
        </button>
        <button
          onClick={() => setActiveTab('inflation')}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest buttery-glide whitespace-nowrap",
            activeTab === 'inflation' ? "bg-white/10 text-brand-primary shadow-lg" : "text-slate-500 hover:text-slate-300"
          )}
        >
          <TrendingUp size={14} /> {t('inflation')}
        </button>
      </div>

      {activeTab === 'sip' ? (
        <div className="space-y-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>{t('monthlyInvestment')}</span>
                <span className="text-brand-primary">{formatCurrency(sipAmount)}</span>
              </div>
              <input
                type="range"
                min="500"
                max="100000"
                step="500"
                value={sipAmount}
                onChange={(e) => setSipAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>{t('expectedReturnRate')}</span>
                <span className="text-brand-primary">{sipRate}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="0.5"
                value={sipRate}
                onChange={(e) => setSipRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>{t('timePeriodYears')}</span>
                <span className="text-brand-primary">{sipYears}y</span>
              </div>
              <input
                type="range"
                min="1"
                max="40"
                value={sipYears}
                onChange={(e) => setSipYears(parseInt(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
          </div>
 
          <div className="p-5 bg-brand-primary/10 rounded-[2rem] border border-brand-primary/20 space-y-3 shadow-inner buttery-glide">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('investedAmount')}</span>
              <span className="text-xs font-black text-white">{formatCurrency(sip.totalInvested)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('estReturns')}</span>
              <span className="text-xs font-black text-emerald-400">{formatCurrency(sip.estimatedReturns)}</span>
            </div>
            <div className="pt-3 border-t border-brand-primary/20 flex justify-between items-center">
              <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{t('totalValue')}</span>
              <span className="text-base font-black text-white">{formatCurrency(sip.maturityValue)}</span>
            </div>
          </div>
        </div>
      ) : activeTab === 'lumpsum' ? (
        <div className="space-y-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>{t('totalInvestment')}</span>
                <span className="text-brand-primary">{formatCurrency(lumpsumAmount)}</span>
              </div>
              <input
                type="range"
                min="5000"
                max="1000000"
                step="5000"
                value={lumpsumAmount}
                onChange={(e) => setLumpsumAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>{t('expectedReturnRate')}</span>
                <span className="text-brand-primary">{lumpsumRate}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                step="0.5"
                value={lumpsumRate}
                onChange={(e) => setLumpsumRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>{t('timePeriodYears')}</span>
                <span className="text-brand-primary">{lumpsumYears}y</span>
              </div>
              <input
                type="range"
                min="1"
                max="40"
                value={lumpsumYears}
                onChange={(e) => setLumpsumYears(parseInt(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
          </div>
 
          <div className="p-5 bg-brand-primary/10 rounded-[2rem] border border-brand-primary/20 space-y-3 shadow-inner buttery-glide">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('investedAmount')}</span>
              <span className="text-xs font-black text-white">{formatCurrency(lumpsum.totalInvested)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('estReturns')}</span>
              <span className="text-xs font-black text-emerald-400">{formatCurrency(lumpsum.estimatedReturns)}</span>
            </div>
            <div className="pt-3 border-t border-brand-primary/20 flex justify-between items-center">
              <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">{t('totalValue')}</span>
              <span className="text-base font-black text-white">{formatCurrency(lumpsum.maturityValue)}</span>
            </div>
          </div>
        </div>
      ) : activeTab === 'emi' ? (
        <div className="space-y-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>{t('loanAmount')}</span>
                <span className="text-brand-primary">{formatCurrency(loanAmount)}</span>
              </div>
              <input
                type="range"
                min="100000"
                max="10000000"
                step="100000"
                value={loanAmount}
                onChange={(e) => setLoanAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>{t('interestRate')}</span>
                <span className="text-brand-primary">{loanRate}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="20"
                step="0.1"
                value={loanRate}
                onChange={(e) => setLoanRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>{t('tenureYears')}</span>
                <span className="text-brand-primary">{loanYears}y</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={loanYears}
                onChange={(e) => setLoanYears(parseInt(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
          </div>
 
          <div className="p-5 bg-rose-500/10 rounded-[2rem] border border-rose-500/20 space-y-3 shadow-inner buttery-glide">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('monthlyEMI')}</span>
              <span className="text-xs font-black text-rose-400">{formatCurrency(emi.emi)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('totalInterest')}</span>
              <span className="text-xs font-black text-white">{formatCurrency(emi.totalInterest)}</span>
            </div>
            <div className="pt-3 border-t border-rose-500/20 flex justify-between items-center">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest">{t('totalPayment')}</span>
              <span className="text-base font-black text-rose-400">{formatCurrency(emi.totalPayment)}</span>
            </div>
          </div>
        </div>
      ) : activeTab === 'tax' ? (
        <div className="space-y-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>{t('salary')}</span>
                <span className="text-brand-primary">{formatCurrency(salary)}</span>
              </div>
              <input
                type="range"
                min="300000"
                max="5000000"
                step="50000"
                value={salary}
                onChange={(e) => setSalary(parseInt(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>{t('deductions')}</span>
                <span className="text-brand-primary">{formatCurrency(deductions)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="500000"
                step="5000"
                value={deductions}
                onChange={(e) => setDeductions(parseInt(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
          </div>
          <div className="p-5 bg-indigo-500/10 rounded-[2rem] border border-indigo-500/20 space-y-3 shadow-inner buttery-glide">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('taxPayable')}</span>
              <span className="text-base font-black text-rose-400">{formatCurrency(tax.tax)}</span>
            </div>
            <p className="text-[8px] text-slate-500 italic uppercase tracking-widest">Calculated based on New Tax Regime (FY 24-25)</p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-5">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>{t('currentCost')}</span>
                <span className="text-brand-primary">{formatCurrency(currentCost)}</span>
              </div>
              <input
                type="range"
                min="5000"
                max="1000000"
                step="5000"
                value={currentCost}
                onChange={(e) => setCurrentCost(parseInt(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>{t('inflationRate')}</span>
                <span className="text-brand-primary">{inflationRate}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="15"
                step="0.5"
                value={inflationRate}
                onChange={(e) => setInflationRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                <span>{t('timePeriodYears')}</span>
                <span className="text-brand-primary">{inflationYears}y</span>
              </div>
              <input
                type="range"
                min="1"
                max="30"
                value={inflationYears}
                onChange={(e) => setInflationYears(parseInt(e.target.value))}
                className="w-full h-2 bg-white/5 rounded-lg appearance-none cursor-pointer accent-brand-primary"
              />
            </div>
          </div>
          <div className="p-5 bg-brand-primary/10 rounded-[2rem] border border-brand-primary/20 space-y-3 shadow-inner buttery-glide">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('futureValue').replace('{n}', inflationYears.toString())}</span>
              <span className="text-base font-black text-white">{formatCurrency(inflation.futureValue)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FinancialCalculators;
