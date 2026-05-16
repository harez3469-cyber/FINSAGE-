export type Language = {
  code: string;
  name: string;
  nativeName: string;
};

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ' },
];

export type Currency = {
  code: string;
  symbol: string;
  name: string;
  rate: number; // Rate relative to INR (1 INR = rate units of this currency)
};

export const CURRENCIES: Currency[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 1 },
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 0.012 },
  { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.011 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.0095 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rate: 1.82 },
];

export type AssetType = 'equity' | 'debt' | 'gold' | 'cash' | 'realEstate' | 'crypto';

export type Asset = {
  id: string;
  type: AssetType;
  name: string;
  value: number;
};

export type FinancialProfile = {
  name: string;
  age: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  savings: number;
  riskTolerance: 'low' | 'medium' | 'high';
  shortTermGoals: string[];
  longTermGoals: string[];
  dependents: number;
  location?: string;
  portfolio?: Asset[];
};

export type Message = {
  role: 'user' | 'model';
  content: string;
  timestamp: Date;
};
