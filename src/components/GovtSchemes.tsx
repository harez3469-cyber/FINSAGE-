import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Landmark, ShieldCheck, ExternalLink, HelpCircle, AlertCircle, Info } from 'lucide-react';
import { FinancialProfile, Language, Currency } from '../types';
import { translations, TranslationKeys } from '../translations';
import { getFinancialAdvice } from '../services/gemini';

interface GovtSchemesProps {
  profile: FinancialProfile;
  language: Language;
  currency: Currency;
}

interface Scheme {
  name: string;
  benefits: string;
  eligibility: string;
  type: 'central' | 'state';
}

const GovtSchemes: React.FC<GovtSchemesProps> = ({ profile, language, currency }) => {
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const t = (key: TranslationKeys) => {
    return translations[language.code as keyof typeof translations]?.[key] || translations.en[key];
  };

  useEffect(() => {
    const fetchSchemes = async () => {
      setLoading(true);
      try {
        const prompt = `Based on this profile:
        - Name: ${profile.name}
        - Age: ${profile.age}
        - Location: ${profile.location || 'India'}
        - Income: ${profile.monthlyIncome} ${currency.code}
        - Risk Tolerance: ${profile.riskTolerance}
        - Dependents: ${profile.dependents}

        Provide a list of EXACTLY 4 government social security or investment schemes (Central and State specific to ${profile.location}) that are most beneficial for this user.
        Format your response ONLY as a JSON array of objects with these keys: name, benefits, eligibility, type ('central' or 'state').
        Do not include markdown formatting or any other text. Output only the JSON.`;

        const responseText = await getFinancialAdvice(
          [{ role: 'user', parts: [{ text: prompt }] }],
          profile,
          language,
          currency
        );

        // Sanitize response to get only JSON
        const jsonMatch = responseText.match(/\[.*\]/s);
        if (jsonMatch) {
          const data = JSON.parse(jsonMatch[0]);
          setSchemes(data);
        } else {
          // Fallback if AI fails JSON format
          throw new Error("Invalid format");
        }
      } catch (err) {
        console.error("Failed to fetch schemes:", err);
        setError("Could not load personalized schemes at this moment.");
      } finally {
        setLoading(false);
      }
    };

    fetchSchemes();
  }, [profile.location, profile.age, language.code]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-32 bg-white/5 rounded-[2rem] border border-white/10 animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-rose-500/10 rounded-[2rem] border border-rose-500/20 flex flex-col items-center text-center gap-3">
        <AlertCircle className="text-rose-400" size={32} />
        <p className="text-sm text-slate-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {schemes.map((scheme, idx) => (
        <motion.div
          key={idx}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="p-6 glass-surface rounded-[2rem] border border-white/5 hover:bg-white/10 transition-all group"
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Landmark size={20} />
            </div>
            <span className={cn(
              "text-[8px] font-bold px-2 py-1 rounded-full uppercase tracking-widest",
              scheme.type === 'state' ? "bg-indigo-500/20 text-indigo-400" : "bg-emerald-500/20 text-emerald-400"
            )}>
              {scheme.type}
            </span>
          </div>

          <h5 className="text-sm font-bold text-white mb-2">{scheme.name}</h5>
          
          <div className="space-y-3">
            <div className="flex gap-2">
              <ShieldCheck size={14} className="text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                <span className="text-slate-300 mr-1">Benefits:</span> {scheme.benefits}
              </p>
            </div>
            <div className="flex gap-2">
              <HelpCircle size={14} className="text-slate-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-400 leading-relaxed font-medium">
                <span className="text-slate-300 mr-1">Eligibility:</span> {scheme.eligibility}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-white/5 flex justify-end">
            <button className="flex items-center gap-1.5 text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline">
              Know More <ExternalLink size={12} />
            </button>
          </div>
        </motion.div>
      ))}

      <div className="p-4 bg-brand-primary/5 rounded-2xl border border-brand-primary/10 flex gap-3">
        <Info className="text-brand-primary shrink-0" size={16} />
        <p className="text-[10px] text-brand-primary/80 leading-relaxed italic">
          These schemes are recommended based on your financial demographics and {profile.location ? `location (${profile.location})` : 'profile'}. Consult the official portal for absolute accuracy.
        </p>
      </div>
    </div>
  );
};

// Internal cn helper if not available
const cn = (...classes: (string | boolean | undefined)[]) => classes.filter(Boolean).join(' ');

export default GovtSchemes;
