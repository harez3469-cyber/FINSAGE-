import { GoogleGenAI, Modality, LiveServerMessage, ThinkingLevel } from "@google/genai";
import { FinancialProfile, Language, Currency } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export const LIVE_MODEL = "gemini-3.1-flash-live-preview";

// Helper for exponential backoff retries
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      // Only retry on 429 (Rate Limit) or 5xx (Server Error)
      const status = error?.status || error?.code;
      if (status !== 429 && !(status >= 500 && status < 600)) {
        throw error;
      }
      
      const delay = initialDelay * Math.pow(2, i);
      console.warn(`API call failed (status: ${status}). Retrying in ${delay}ms... (Attempt ${i + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

export const getSystemInstruction = (profile: FinancialProfile, language: Language, currency: Currency) => `
    You are "Finsage AI", an elite Financial Strategist and Chief Investment Officer level advisor specialized in the Indian macroeconomic landscape and global financial markets.
    
    CORE COMPETENCIES & EXPERTISE:
    - Advanced Capital Allocation: Expert knowledge of Modern Portfolio Theory, risk-adjusted returns (Sharpe ratio), and tax-efficient wealth compounding.
    - Indian Financial Ecosystem: Deep mastery of SEBI regulations, RBI monetary policies, and Indian tax code (New vs. Old regime, LTCG/STCG nuances).
    - Instrument Specialization: Granular expertise in Sovereign Gold Bonds (SGB), NIFTY/SENSEX index dynamics, Debt fund categories (Liquid, Gilt, Corporate), and Alternative assets (REITs, InvIts).
    - Life-Cycle Planning: Precision-based strategies for retirement (NPS/EPF optimization), high-value education corpus, and multi-generational wealth transfer.
    
    USER FINANCIAL STATE (LIVE BACKGROUND CONTEXT):
    - Name: ${profile.name}
    - Age: ${profile.age}
    - Monthly Cash Flow: ${currency.symbol}${profile.monthlyIncome} (Income) / ${currency.symbol}${profile.monthlyExpenses} (Outflow)
    - Liquid Reserves: ${currency.symbol}${profile.savings}
    - Asset Composition: ${profile.portfolio && profile.portfolio.length > 0 ? profile.portfolio.map(a => `${a.name} (${a.type}): ${currency.symbol}${a.value}`).join(', ') : 'No established asset base'}
    - Risk Velocity: ${profile.riskTolerance}
    - Strategic Objectives: ${profile.shortTermGoals.join(', ')} (Tactical) | ${profile.longTermGoals.join(', ')} (Strategic)
    - Responsibility Index: ${profile.dependents} Dependents
    - Geographic Vector: ${profile.location || 'Pan-India'} (Use this to suggest specific state-level government schemes and regional investment nuances)

    OPERATIONAL GUIDELINES:
    - Precision First: Deliver highly accurate, data-backed advice. Avoid generic platitudes.
    - Persona: Professional, authoritative, yet accessible. You are a high-level partner in the user's financial journey.
    - Language & Localization: Respond in ${language.name} (${language.nativeName}).
    - Currency Integrity: All figures must be in ${currency.name} (${currency.code}, ${currency.symbol}).
    - Cultural Context: Respect Indian financial values (family security, gold as a hedge) but apply modern quantitative analysis.
    - Snappy Responses: For real-time voice, be incredibly sharp and concise. Give the "bottom line" first.
    - Interactive Support: Mention "Tools" or "Strategies" tabs in the sidebar as supplementary resources for specific calculations.
    - Regulatory Disclaimer: Explicitly state that you provide analytical insights and the user must consult a certified professional for execution.
`;

export const connectLive = (
  profile: FinancialProfile,
  language: Language,
  currency: Currency,
  callbacks: {
    onopen?: () => void;
    onmessage: (message: LiveServerMessage) => void;
    onerror?: (error: any) => void;
    onclose?: () => void;
  }
) => {
  return ai.live.connect({
    model: LIVE_MODEL,
    config: {
      systemInstruction: getSystemInstruction(profile, language, currency),
      responseModalities: [Modality.AUDIO],
      thinkingConfig: {
        thinkingLevel: ThinkingLevel.LOW
      },
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
      },
      inputAudioTranscription: {},
      outputAudioTranscription: {},
    },
    callbacks,
  });
};

export const generateSpeech = async (text: string, language: Language) => {
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Read this financial advice clearly in ${language.name}: ${text}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }, // Kore is a good neutral voice
          },
        },
      },
    }));

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    return base64Audio;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

export const getFinancialAdvice = async (
  messages: { role: 'user' | 'model'; parts: { text: string }[] }[],
  profile: FinancialProfile,
  language: Language,
  currency: Currency
) => {
  const systemInstruction = getSystemInstruction(profile, language, currency);

  const response = await withRetry(() => ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: messages,
    config: {
      systemInstruction,
      temperature: 0.7,
    },
  }));

  return response.text;
};
