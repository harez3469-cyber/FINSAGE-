/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Languages, 
  TrendingUp, 
  Wallet, 
  Shield,
  ShieldCheck, 
  Send, 
  User, 
  ChevronRight, 
  RefreshCcw,
  Trash2,
  IndianRupee,
  Volume2,
  VolumeX,
  Mic,
  MicOff,
  Target,
  Info,
  Landmark,
  PhoneCall,
  X,
  Plus,
  Calculator,
  Newspaper
} from 'lucide-react';
import Markdown from 'react-markdown';
import { cn } from './lib/utils';
import { Language, LANGUAGES, FinancialProfile, Message, Currency, CURRENCIES } from './types';
import { translations, TranslationKeys } from './translations';
import FinancialCharts from './components/FinancialCharts';
import FinancialCalculators from './components/FinancialCalculators';
import InvestmentStrategies from './components/InvestmentStrategies';
import GovtSchemes from './components/GovtSchemes';
import NewsFeed from './components/NewsFeed';
import Waveform from './components/Waveform';
import { getFinancialAdvice, generateSpeech, connectLive } from './services/gemini';

export default function App() {
  const [language, setLanguage] = useState<Language | null>(null);
  const [profile, setProfile] = useState<FinancialProfile | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVoiceLoading, setIsVoiceLoading] = useState(false);
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'strategies' | 'calculators' | 'news' | 'govtSchemes'>('strategies');
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [appName, setAppName] = useState('Finsage AI');
  const [authCode, setAuthCode] = useState('');
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [newAppName, setNewAppName] = useState('');
  const [liveTranscripts, setLiveTranscripts] = useState<{role: 'user' | 'model', text: string}[]>([]);
  const [showLanguageSwitcher, setShowLanguageSwitcher] = useState(false);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(CURRENCIES[0]);
  const [showCurrencySwitcher, setShowCurrencySwitcher] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [currencies, setCurrencies] = useState<Currency[]>(CURRENCIES);
  
  const chatEndRef = useRef<HTMLDivElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const liveSessionRef = useRef<any>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  const nextStartTimeRef = useRef<number>(0);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const response = await fetch('https://api.exchangerate-api.com/v4/latest/INR');
        const data = await response.json();
        if (data && data.rates) {
          const updatedCurrencies = CURRENCIES.map(c => ({
            ...c,
            rate: data.rates[c.code] || c.rate
          }));
          setCurrencies(updatedCurrencies);
          // Update selected currency if it's not INR
          setSelectedCurrency(prev => updatedCurrencies.find(c => c.code === prev.code) || prev);
        }
      } catch (error) {
        console.error("Failed to fetch currency rates:", error);
      }
    };
    fetchRates();
  }, []);

  useEffect(() => {
    if (profile && !profile.location) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const response = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${position.coords.latitude}&lon=${position.coords.longitude}`
            );
            const data = await response.json();
            const locationName = data.address?.state || data.address?.region || data.address?.city;
            if (locationName) {
              setProfile(prev => prev ? { ...prev, location: locationName } : null);
            }
          } catch (error) {
            console.error("Location detection failed:", error);
          }
        },
        (error) => {
          console.warn("Geolocation permission denied or failed:", error);
        }
      );
    }
  }, [profile]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      stopLiveSession();
    };
  }, []);

  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    return audioContextRef.current;
  };

  const playAudio = async (base64Data: string) => {
    try {
      const ctx = initAudioContext();
      
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      // Convert base64 to raw bytes
      const binaryString = window.atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Gemini TTS returns 16-bit Linear PCM
      // Each sample is 2 bytes (Int16)
      const pcmData = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
      const floatData = new Float32Array(pcmData.length);
      
      // Convert Int16 PCM to Float32 for Web Audio API
      for (let i = 0; i < pcmData.length; i++) {
        floatData[i] = pcmData[i] / 32768.0;
      }

      const audioBuffer = ctx.createBuffer(1, floatData.length, 24000);
      audioBuffer.getChannelData(0).set(floatData);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (error) {
      console.error("Playback error:", error);
    }
  };

  const formatCurrency = (amount: number) => {
    const converted = amount * selectedCurrency.rate;
    return `${selectedCurrency.symbol}${converted.toLocaleString(language?.code === 'en' ? 'en-US' : 'en-IN', {
      maximumFractionDigits: 0
    })}`;
  };

  const startLiveSession = async () => {
    if (!profile || !language) return;
    
    try {
      const ctx = initAudioContext();
      if (ctx.state === 'suspended') await ctx.resume();

      setIsLiveActive(true);
      setLiveTranscripts([]);
      
      const sessionPromise = connectLive(profile, language, selectedCurrency, {
        onopen: async () => {
          console.log("Live session opened");
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaStreamRef.current = stream;
            
            const source = ctx.createMediaStreamSource(stream);
            const processor = ctx.createScriptProcessor(2048, 1, 1);
            processorRef.current = processor;

            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const outputData = new Int16Array(Math.floor(inputData.length * (16000 / ctx.sampleRate)));
              for (let i = 0; i < outputData.length; i++) {
                const inputIdx = Math.floor(i * (ctx.sampleRate / 16000));
                outputData[i] = Math.max(-1, Math.min(1, inputData[inputIdx])) * 32767;
              }

              // Faster base64 conversion
              const base64Data = btoa(String.fromCharCode(...new Uint8Array(outputData.buffer)));
              
              sessionPromise.then(session => {
                session.sendRealtimeInput({
                  audio: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
                });
              });
            };

            source.connect(processor);
            processor.connect(ctx.destination);
          } catch (err) {
            console.error("Microphone access error:", err);
            stopLiveSession();
          }
        },
        onmessage: (message) => {
          // Handle model audio output
          if (message.serverContent?.modelTurn) {
            setIsProcessing(false);
            const parts = message.serverContent.modelTurn.parts;
            if (parts) {
              for (const part of parts) {
                if (part.inlineData?.data) {
                  queueLiveAudio(part.inlineData.data);
                }
                if (part.text) {
                  const text = part.text;
                  setLiveTranscripts(prev => {
                    const last = prev[prev.length - 1];
                    if (last && last.role === 'model') {
                      return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                    }
                    return [...prev, { role: 'model', text }];
                  });
                }
              }
            }
          }

          if (message.serverContent?.turnComplete) {
            setIsProcessing(false);
          }
          
          // Handle user transcriptions
          const userParts = (message as any).serverContent?.userTurn?.parts || (message.serverContent as any)?.userTranscript?.parts;
          if (userParts) {
            setIsProcessing(true);
            for (const part of userParts) {
              if (part.text) {
                const text = part.text;
                setLiveTranscripts(prev => {
                  const last = prev[prev.length - 1];
                  if (last && last.role === 'user') {
                    return [...prev.slice(0, -1), { ...last, text: last.text + text }];
                  }
                  return [...prev, { role: 'user', text }];
                });
              }
            }
          }

          if (message.serverContent?.interrupted) {
            audioQueueRef.current = [];
            // Optionally stop current playback if possible
          }
        },
        onclose: () => {
          console.log("Live session closed");
          stopLiveSession();
        },
        onerror: (err) => {
          console.error("Live session error:", err);
          stopLiveSession();
        }
      });

      liveSessionRef.current = await sessionPromise;
    } catch (error) {
      console.error("Failed to start live session:", error);
      stopLiveSession();
    }
  };

  const stopLiveSession = () => {
    setIsLiveActive(false);
    setIsAiSpeaking(false);
    setIsProcessing(false);
    if (liveSessionRef.current) {
      liveSessionRef.current.close();
      liveSessionRef.current = null;
    }
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    audioQueueRef.current = [];
  };

  const queueLiveAudio = (base64Data: string) => {
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcmData = new Int16Array(bytes.buffer, 0, Math.floor(bytes.length / 2));
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768.0;
    }
    audioQueueRef.current.push(floatData);
    if (!isPlayingRef.current) {
      processAudioQueue();
    }
  };

  const processAudioQueue = async () => {
    if (audioQueueRef.current.length === 0) {
      isPlayingRef.current = false;
      setIsAiSpeaking(false);
      nextStartTimeRef.current = 0;
      return;
    }

    isPlayingRef.current = true;
    setIsAiSpeaking(true);
    const ctx = initAudioContext();
    
    // Gapless scheduling
    while (audioQueueRef.current.length > 0) {
      const floatData = audioQueueRef.current.shift()!;
      const audioBuffer = ctx.createBuffer(1, floatData.length, 24000);
      audioBuffer.getChannelData(0).set(floatData);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);
      
      const playTime = Math.max(nextStartTimeRef.current, ctx.currentTime);
      source.start(playTime);
      nextStartTimeRef.current = playTime + audioBuffer.duration;
      
      // If we are getting too many chunks, don't block the loop too long
      // and give control back to let UI update
      if (audioQueueRef.current.length > 10) break;
    }

    // Schedule next check
    setTimeout(() => {
      if (audioQueueRef.current.length > 0) {
        processAudioQueue();
      } else {
        // Wait for the scheduled audio to finish
        const waitTime = (nextStartTimeRef.current - ctx.currentTime) * 1000;
        setTimeout(() => {
          if (audioQueueRef.current.length === 0) {
            isPlayingRef.current = false;
            setIsAiSpeaking(false);
            nextStartTimeRef.current = 0;
          }
        }, Math.max(0, waitTime));
      }
    }, 50);
  };

  const handleManualPlay = async (text: string) => {
    if (!language) return;
    setIsLoading(true);
    try {
      const audioData = await generateSpeech(text, language);
      if (audioData) {
        await playAudio(audioData);
      }
    } catch (error) {
      console.error("Manual play error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language?.code || 'en-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev + (prev ? ' ' : '') + transcript);
    };

    recognition.start();
  };

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang);
  };

  const handleProfileSubmit = async (newProfile: FinancialProfile) => {
    setProfile(newProfile);
    setIsLoading(true);
    
    const initialGreeting: Message = {
      role: 'model',
      content: t('greeting'),
      timestamp: new Date(),
    };
    setMessages([initialGreeting]);

    try {
      // Automatically generate initial ideas based on the profile
      const initialPrompt = "Based on my profile, please provide 3-5 immediate financial ideas or advice for me. Do not ask how you can help, just provide the ideas.";
      const history = [{
        role: 'user' as const,
        parts: [{ text: initialPrompt }]
      }];
      
      const response = await getFinancialAdvice(history, newProfile, language!, selectedCurrency);
      
      const aiAdvice: Message = {
        role: 'model',
        content: response || 'I have analyzed your profile and I am ready to help you with your financial journey.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiAdvice]);
    } catch (error) {
      console.error('Error fetching initial advice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading || !profile || !language) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const history = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
      history.push({
        role: 'user',
        parts: [{ text: input }]
      });

      const response = await getFinancialAdvice(history, profile, language, selectedCurrency);
      
      const aiMessage: Message = {
        role: 'model',
        content: response || 'I apologize, but I encountered an issue processing your request.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiMessage]);

      if (isVoiceEnabled && response && language) {
        setIsVoiceLoading(true);
        const audioData = await generateSpeech(response, language);
        if (audioData) {
          await playAudio(audioData);
        }
        setIsVoiceLoading(false);
      }
    } catch (error: any) {
      console.error('Error fetching advice:', error);
      
      let errorMessage = 'I am sorry, something went wrong. Please try again later.';
      const status = error?.status || error?.code;
      
      if (status === 429) {
        errorMessage = 'I have reached my temporary limit for advice. Please wait a moment and try again, or try a shorter question.';
      }

      setMessages(prev => [...prev, {
        role: 'model',
        content: errorMessage,
        timestamp: new Date(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const t = (key: TranslationKeys) => {
    const langCode = language?.code as keyof typeof translations || 'en';
    return (translations[langCode] || translations.en)[key] || translations.en[key];
  };

  const translateGoal = (goal: string) => {
    return t(goal as TranslationKeys) || goal;
  };

  if (!language) {
    return <LanguageSelection onSelect={handleLanguageSelect} appName={appName} />;
  }

  if (!profile) {
    return <Onboarding onSubmit={handleProfileSubmit} language={language} appName={appName} t={t} />;
  }

  return (
    <div className="flex flex-col h-screen bg-[#050505] font-sans selection:bg-brand-primary/30 relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-secondary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Header */}
      <header className="h-20 glass-header border-b border-white/10 flex items-center justify-between px-6 z-40 buttery-glide">
        <div className="flex items-center gap-4">
          <div className="lg:hidden p-2 bg-brand-primary/10 rounded-xl text-brand-primary" onClick={() => setShowInsights(true)}>
            <TrendingUp size={24} />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-display font-bold text-white tracking-tight">{appName}</h1>
            <div className="flex items-center gap-1.5 pt-0.5">
              <a 
                href="https://finsage.ai" 
                target="_blank" 
                rel="noreferrer"
                className="text-[10px] font-bold text-brand-primary/80 hover:text-brand-primary lowercase tracking-wider buttery-glide flex items-center gap-1"
              >
                finsage.ai
              </a>
              <span className="text-[10px] text-slate-700">•</span>
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{profile?.name ? `Hello, ${profile.name}` : t('marketLive')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowLanguageSwitcher(true)}
            className="flex items-center gap-2.5 px-4 py-2.5 glass-surface rounded-2xl hover:bg-white/10 buttery-glide shadow-sm active:scale-95"
          >
            <Languages size={18} className="text-brand-primary" />
            <span className="text-sm font-bold text-slate-200">{language.nativeName}</span>
          </button>

          <button 
            onClick={() => setShowCurrencySwitcher(true)}
            className="flex items-center gap-2.5 px-4 py-2.5 glass-surface rounded-2xl hover:bg-white/10 buttery-glide shadow-sm active:scale-95"
          >
            <span className="text-lg font-bold text-brand-primary">{selectedCurrency.symbol}</span>
            <span className="text-sm font-bold text-slate-200">{selectedCurrency.code}</span>
          </button>
          
          <div className="flex items-center gap-2 ml-2">
            <button 
              onClick={() => setMessages([])}
              className="p-2.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-2xl transition-all active:scale-95"
              title={t('clearChat')}
            >
              <Trash2 size={20} />
            </button>
            <button 
              onClick={() => {
                setProfile(null);
                setMessages([]);
              }}
              className="p-2.5 text-slate-400 hover:text-brand-primary hover:bg-indigo-500/10 rounded-2xl transition-all active:scale-95"
              title={t('resetProfile')}
            >
              <RefreshCcw size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex overflow-hidden">
        {/* Language Switcher Modal */}
        <AnimatePresence>
          {showLanguageSwitcher && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6"
              onClick={() => setShowLanguageSwitcher(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass-card rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-white/30"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-8 border-b border-slate-100/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary shadow-inner">
                      <Languages size={24} />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">{t('switchLanguage')}</h2>
                  </div>
                  <button 
                    onClick={() => setShowLanguageSwitcher(false)}
                    className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 transition-all active:scale-95"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="p-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {LANGUAGES.map((lang) => (
                    <button
                      key={lang.code}
                      onClick={() => {
                        setLanguage(lang);
                        setShowLanguageSwitcher(false);
                        setMessages(prev => [...prev, {
                          role: 'model',
                          content: `Language switched to **${lang.name}**. How can I help you in this language?`,
                          timestamp: new Date()
                        }]);
                      }}
                      className={cn(
                        "group flex flex-col items-center justify-center p-5 rounded-3xl border transition-all text-center active:scale-95",
                        language.code === lang.code 
                          ? "bg-brand-primary border-brand-primary text-white shadow-xl shadow-indigo-500/30" 
                          : "bg-slate-50/50 border-slate-100 hover:border-brand-primary hover:bg-indigo-50/50"
                      )}
                    >
                      <span className={cn(
                        "text-xl font-bold transition-colors",
                        language.code === lang.code ? "text-white" : "text-slate-900 group-hover:text-brand-primary"
                      )}>{lang.nativeName}</span>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest mt-1",
                        language.code === lang.code ? "text-indigo-100" : "text-slate-400"
                      )}>{lang.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Currency Switcher Modal */}
        <AnimatePresence>
          {showCurrencySwitcher && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6"
              onClick={() => setShowCurrencySwitcher(false)}
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="glass-card rounded-[2.5rem] shadow-2xl max-w-2xl w-full overflow-hidden border border-white/30"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="p-8 border-b border-slate-100/50 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary shadow-inner">
                      <Wallet size={24} />
                    </div>
                    <h2 className="text-2xl font-display font-bold text-slate-900 tracking-tight">{t('switchCurrency')}</h2>
                  </div>
                  <button 
                    onClick={() => setShowCurrencySwitcher(false)}
                    className="p-2.5 hover:bg-slate-100 rounded-full text-slate-400 transition-all active:scale-95"
                  >
                    <X size={24} />
                  </button>
                </div>
                <div className="p-8 grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {currencies.map((curr) => (
                    <button
                      key={curr.code}
                      onClick={() => {
                        setSelectedCurrency(curr);
                        setShowCurrencySwitcher(false);
                        setMessages(prev => [...prev, {
                          role: 'model',
                          content: `Currency switched to **${curr.name} (${curr.symbol})**. All financial values will now be shown in this currency.`,
                          timestamp: new Date()
                        }]);
                      }}
                      className={cn(
                        "group flex flex-col items-center justify-center p-5 rounded-3xl border transition-all text-center active:scale-95",
                        selectedCurrency.code === curr.code 
                          ? "bg-brand-primary border-brand-primary text-white shadow-xl shadow-indigo-500/30" 
                          : "bg-slate-50/50 border-slate-100 hover:border-brand-primary hover:bg-indigo-50/50"
                      )}
                    >
                      <span className={cn(
                        "text-2xl font-bold transition-colors",
                        selectedCurrency.code === curr.code ? "text-white" : "text-slate-900 group-hover:text-brand-primary"
                      )}>{curr.symbol}</span>
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest mt-1",
                        selectedCurrency.code === curr.code ? "text-indigo-100" : "text-slate-400"
                      )}>{curr.code}</span>
                      <span className={cn(
                        "text-[9px] font-medium mt-0.5",
                        selectedCurrency.code === curr.code ? "text-indigo-200" : "text-slate-500"
                      )}>{curr.name}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Live Mode Overlay */}
        <AnimatePresence>
          {isLiveMode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-brand-primary/95 backdrop-blur-2xl flex flex-col items-center justify-center text-white p-6"
            >
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-white/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-brand-secondary/20 rounded-full blur-[120px]" />
              </div>

              <button 
                onClick={() => {
                  stopLiveSession();
                  setIsLiveMode(false);
                }}
                className="absolute top-8 right-8 p-4 bg-white/10 hover:bg-white/20 rounded-full transition-all border border-white/20 active:scale-95 z-10"
              >
                <X size={28} />
              </button>

              <div className="text-center space-y-12 max-w-lg w-full relative z-10">
                <div className="relative flex items-center justify-center">
                  {/* Multiple pulsing rings for depth */}
                  <AnimatePresence>
                    {isLiveActive && (
                      <>
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 2, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 2, ease: "easeOut" }}
                          className="absolute w-40 h-40 bg-white/20 rounded-full blur-xl"
                        />
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.6, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 2, delay: 0.6, ease: "easeOut" }}
                          className="absolute w-40 h-40 bg-white/10 rounded-full blur-lg"
                        />
                        <motion.div
                          initial={{ scale: 0.8, opacity: 0 }}
                          animate={{ scale: 1.3, opacity: 0 }}
                          transition={{ repeat: Infinity, duration: 2, delay: 1.2, ease: "easeOut" }}
                          className="absolute w-40 h-40 bg-white/5 rounded-full blur-md"
                        />
                      </>
                    )}
                  </AnimatePresence>

                  <motion.div
                    animate={isLiveActive ? { 
                      scale: isAiSpeaking ? [1, 1.15, 1] : [1, 1.05, 1],
                      boxShadow: isAiSpeaking ? [
                        "0 0 0px 0px rgba(255,255,255,0)",
                        "0 0 60px 20px rgba(255,255,255,0.4)",
                        "0 0 0px 0px rgba(255,255,255,0)"
                      ] : [
                        "0 0 0px 0px rgba(255,255,255,0)",
                        "0 0 40px 10px rgba(255,255,255,0.2)",
                        "0 0 0px 0px rgba(255,255,255,0)"
                      ]
                    } : {}}
                    transition={{ repeat: Infinity, duration: isAiSpeaking ? 1.5 : 2.5 }}
                    className={cn(
                      "relative w-48 h-48 backdrop-blur-3xl rounded-full flex items-center justify-center text-white border shadow-2xl overflow-hidden transition-all duration-500",
                      isAiSpeaking ? "bg-white/20 border-white/50" : "bg-white/10 border-white/30"
                    )}
                  >
                    {isLiveActive ? (
                      <div className="flex items-center gap-1.5 h-24">
                        {[...Array(15)].map((_, i) => (
                          <motion.div
                            key={i}
                            animate={isAiSpeaking ? { 
                              height: [20, Math.random() * 80 + 30, 20],
                              opacity: [0.6, 1, 0.6],
                              backgroundColor: ["#ffffff", "#cbd5e1", "#ffffff"]
                            } : { 
                              height: [10, Math.random() * 30 + 10, 10],
                              opacity: [0.3, 0.6, 0.3]
                            }}
                            transition={{ 
                              repeat: Infinity, 
                              duration: isAiSpeaking ? 0.4 + Math.random() * 0.3 : 0.8 + Math.random() * 0.5, 
                              delay: i * 0.04,
                              ease: "easeInOut"
                            }}
                            className="w-2 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)]"
                          />
                        ))}
                      </div>
                    ) : (
                      <motion.div
                        initial={{ scale: 0.9 }}
                        animate={{ scale: 1 }}
                        className="flex flex-col items-center gap-2"
                      >
                        <MicOff size={64} className="opacity-50" />
                      </motion.div>
                    )}
                  </motion.div>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col items-center gap-2">
                    <motion.h2 
                      animate={isLiveActive ? { opacity: [1, 0.6, 1] } : {}}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="text-5xl font-display font-bold tracking-tight"
                    >
                      {isProcessing ? "Thinking..." : isAiSpeaking ? "Speaking..." : isLiveActive ? "Listening..." : "Ready to Talk?"}
                    </motion.h2>
                    {(isLiveActive || isProcessing) && (
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: "120px" }}
                        className="h-1.5 bg-white/20 rounded-full overflow-hidden"
                      >
                        <motion.div 
                          animate={{ 
                            x: ["-100%", "100%"],
                            backgroundColor: isProcessing ? ["#ffffff", "#818cf8", "#ffffff"] : ["#ffffff", "#ffffff", "#ffffff"]
                          }}
                          transition={{ repeat: Infinity, duration: isProcessing ? 1 : 1.5, ease: "linear" }}
                          className="h-full w-1/2 bg-white shadow-[0_0_10px_rgba(255,255,255,0.8)]"
                        />
                      </motion.div>
                    )}
                  </div>
                  <p className="text-indigo-100 text-xl opacity-80 font-medium max-w-sm mx-auto">
                    {isLiveActive 
                      ? t('speakNaturally')
                      : t('startVoiceConversation')}
                  </p>
                </div>

                {isLiveActive && liveTranscripts.length > 0 && (
                  <div className="w-full max-h-[35vh] overflow-y-auto bg-black/20 backdrop-blur-xl rounded-[2.5rem] p-8 space-y-6 text-left border border-white/10 custom-scrollbar shadow-inner">
                    <AnimatePresence mode="popLayout">
                      {liveTranscripts.slice(-6).map((t, i) => (
                        <motion.div 
                          key={i}
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          className={cn(
                            "flex flex-col gap-2",
                            t.role === 'user' ? "items-end" : "items-start"
                          )}
                        >
                  <div className={cn(
                    "max-w-[85%] px-5 py-3 rounded-2xl text-base leading-relaxed shadow-sm glass-surface",
                    t.role === 'user' 
                      ? "bg-brand-primary text-white rounded-tr-none border border-white/10" 
                      : "text-white rounded-tl-none border border-white/5"
                  )}>
                            <span className="text-[9px] font-bold uppercase tracking-[0.2em] opacity-50 block mb-1">
                              {t.role === 'user' ? 'You' : 'Advisor'}
                            </span>
                            {t.text}
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                )}

                <div className="pt-4">
                  {!isLiveActive ? (
                    <button
                      onClick={startLiveSession}
                      className="w-full py-6 bg-white text-brand-primary rounded-3xl font-bold text-xl hover:bg-indigo-50 transition-all shadow-2xl shadow-indigo-900/40 active:scale-[0.98]"
                    >
                      {t('startConversation')}
                    </button>
                  ) : (
                    <button
                      onClick={stopLiveSession}
                      className="w-full py-6 bg-rose-500 text-white rounded-3xl font-bold text-xl hover:bg-rose-600 transition-all shadow-2xl shadow-rose-900/40 active:scale-[0.98]"
                    >
                      {t('endCall')}
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {/* Mobile Insights Modal */}
        <AnimatePresence>
          {showInsights && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 lg:hidden"
            >
              <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={() => setShowInsights(false)} />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                className="absolute right-0 top-0 bottom-0 w-[90%] glass-sidebar shadow-2xl flex flex-col border-l border-white/20"
              >
                <div className="p-8 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-brand-primary/10 rounded-2xl text-brand-primary shadow-inner">
                      <TrendingUp size={24} />
                    </div>
                    <h2 className="font-display font-bold text-2xl tracking-tight text-white">{t('financialHub')}</h2>
                  </div>
                  <button onClick={() => setShowInsights(false)} className="p-2.5 hover:bg-white/5 rounded-full transition-all active:scale-95">
                    <X size={24} className="text-slate-500" />
                  </button>
                </div>
                <div className="p-6 border-b border-white/10">
                  <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/10">
                    <button
                      onClick={() => setSidebarTab('strategies')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-bold transition-all uppercase tracking-widest",
                        sidebarTab === 'strategies' ? "bg-zinc-800 text-brand-primary shadow-sm" : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {t('strategies')}
                    </button>
                    <button
                      onClick={() => setSidebarTab('calculators')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-bold transition-all uppercase tracking-widest",
                        sidebarTab === 'calculators' ? "bg-zinc-800 text-brand-primary shadow-sm" : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {t('tools')}
                    </button>
                    <button
                      onClick={() => setSidebarTab('govtSchemes')}
                      className={cn(
                        "flex-1 py-3 rounded-xl text-sm font-bold transition-all uppercase tracking-widest",
                        sidebarTab === 'govtSchemes' ? "bg-zinc-800 text-brand-primary shadow-sm" : "text-slate-400 hover:text-slate-200"
                      )}
                    >
                      {t('govtSchemes')}
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
                  {sidebarTab === 'strategies' ? (
                    <InvestmentStrategies profile={profile} language={language!} currency={selectedCurrency} />
                  ) : sidebarTab === 'govtSchemes' ? (
                    <section>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Landmark size={14} /> {t('govtSchemes')}
                      </h3>
                      <div className="space-y-4">
                        <div className="p-4 bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20">
                          <p className="text-xs font-bold text-white mb-2">{profile.location ? `${profile.location} Specific Schemes` : 'National Schemes'}</p>
                          <p className="text-[10px] text-slate-400 leading-relaxed italic">
                            {profile.location 
                              ? `Detected location: ${profile.location}. Analyzing region-specific benefits...` 
                              : 'Analyzing pan-India government social security schemes...'}
                          </p>
                        </div>
                        <GovtSchemes profile={profile} language={language!} currency={selectedCurrency} />
                      </div>
                    </section>
                  ) : (
                    <section>
                      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Calculator size={14} /> {t('tools')}
                      </h3>
                      <FinancialCalculators language={language!} currency={selectedCurrency} />
                    </section>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sidebar - Profile Summary */}
        <aside className="hidden lg:flex w-96 glass-sidebar border-r border-white/10 flex-col overflow-y-auto custom-scrollbar">
          <div className="p-8 space-y-10">
            <section>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                <User size={14} /> {t('yourProfile')}
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 shadow-sm">
                  <span className="text-sm font-medium text-slate-400">{t('fullName')}</span>
                  <span className="text-sm font-bold text-white">{profile.name}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 shadow-sm">
                  <span className="text-sm font-medium text-slate-400">{t('age')}</span>
                  <span className="text-sm font-bold text-white">{profile.age} {t('years')}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 shadow-sm">
                  <span className="text-sm font-medium text-slate-400">{t('income')}</span>
                  <span className="text-sm font-bold text-white">{formatCurrency(profile.monthlyIncome)}/{t('mo')}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5 shadow-sm">
                  <span className="text-sm font-medium text-slate-400">{t('riskProfile')}</span>
                  <span className={cn(
                    "text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-widest",
                    profile.riskTolerance === 'low' ? "bg-emerald-500/20 text-emerald-400" :
                    profile.riskTolerance === 'medium' ? "bg-amber-500/20 text-amber-400" :
                    "bg-rose-500/20 text-rose-400"
                  )}>
                    {t(profile.riskTolerance)}
                  </span>
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-5 flex items-center gap-2">
                <Target size={14} /> {t('financialGoals')}
              </h3>
              <div className="space-y-5">
                {profile.shortTermGoals.length > 0 && (
                  <div className="p-5 bg-white/5 rounded-[2rem] border border-white/5 shadow-sm">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest">{t('shortTerm')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.shortTermGoals.map((goal, i) => (
                        <span key={i} className="text-[10px] font-bold px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-sm">
                          {translateGoal(goal)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {profile.longTermGoals.length > 0 && (
                  <div className="p-5 bg-white/5 rounded-[2rem] border border-white/5 shadow-sm">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-3 tracking-widest">{t('longTerm')}</h4>
                    <div className="flex flex-wrap gap-2">
                      {profile.longTermGoals.map((goal, i) => (
                        <span key={i} className="text-[10px] font-bold px-3 py-1.5 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20 shadow-sm">
                          {translateGoal(goal)}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section>
              <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/10 mb-8 overflow-x-auto custom-scrollbar no-scrollbar gap-1">
                <button
                  onClick={() => setSidebarTab('strategies')}
                  className={cn(
                    "flex-1 min-w-[80px] py-3 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest whitespace-nowrap",
                    sidebarTab === 'strategies' ? "bg-zinc-800 text-brand-primary shadow-md" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {t('strategies')}
                </button>
                <button
                  onClick={() => setSidebarTab('calculators')}
                  className={cn(
                    "flex-1 min-w-[70px] py-3 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest whitespace-nowrap",
                    sidebarTab === 'calculators' ? "bg-zinc-800 text-brand-primary shadow-md" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {t('tools')}
                </button>
                <button
                  onClick={() => setSidebarTab('news')}
                  className={cn(
                    "flex-1 min-w-[70px] py-3 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest whitespace-nowrap",
                    sidebarTab === 'news' ? "bg-zinc-800 text-brand-primary shadow-md" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {t('news')}
                </button>
                <button
                  onClick={() => setSidebarTab('govtSchemes')}
                  className={cn(
                    "flex-1 min-w-[100px] py-3 rounded-xl text-[10px] font-bold transition-all uppercase tracking-widest whitespace-nowrap",
                    sidebarTab === 'govtSchemes' ? "bg-zinc-800 text-brand-primary shadow-md" : "text-slate-400 hover:text-slate-200"
                  )}
                >
                  {t('govtSchemes')}
                </button>
              </div>

              {sidebarTab === 'strategies' ? (
                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Shield size={14} /> {t('investmentStrategies')}
                  </h3>
                  <div className="glass-card p-6 rounded-[2rem] border border-white/10 shadow-xl">
                    <InvestmentStrategies profile={profile} language={language!} currency={selectedCurrency} />
                  </div>
                </div>
              ) : sidebarTab === 'calculators' ? (
                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Calculator size={14} /> {t('quickCalculators')}
                  </h3>
                  <div className="glass-card p-6 rounded-[2rem] border border-white/10 shadow-xl">
                    <FinancialCalculators language={language!} currency={selectedCurrency} />
                  </div>
                </div>
              ) : sidebarTab === 'govtSchemes' ? (
                <div className="space-y-6">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Landmark size={14} /> {t('govtSchemes')}
                  </h3>
                  <div className="glass-card p-6 rounded-[2rem] border border-white/10 shadow-xl space-y-4">
                    <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 flex items-center gap-4">
                      <div className="p-2 bg-emerald-500/20 rounded-lg">
                        <Landmark size={18} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white uppercase tracking-tight">{profile.location ? `${profile.location} Benefits` : 'Social Security'}</p>
                        <p className="text-[10px] text-slate-500">Government schemes tailored to your profile</p>
                      </div>
                    </div>
                    <GovtSchemes profile={profile} language={language!} currency={selectedCurrency} />
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <NewsFeed language={language} />
                </div>
              )}
            </section>
          </div>
        </aside>

        {/* Chat Area */}
        <section className="flex-1 flex flex-col bg-[#050505] relative">
          <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 custom-scrollbar">
            <AnimatePresence initial={false}>
              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "flex w-full",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}
                >
                  <div className={cn(
                    "max-w-[90%] md:max-w-[75%] rounded-[2rem] p-6 md:p-8 shadow-xl relative group transition-all glass-card",
                    msg.role === 'user' 
                      ? "bg-brand-primary text-white rounded-tr-none shadow-indigo-500/20" 
                      : "text-slate-200 rounded-tl-none shadow-black/20"
                  )}>
                    <div className="markdown-body">
                      <Markdown>{msg.content}</Markdown>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-current/10">
                      <div className={cn(
                        "text-[10px] font-bold uppercase tracking-widest opacity-50",
                        msg.role === 'user' ? "text-right" : "text-left"
                      )}>
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                      {msg.role === 'model' && (
                        <button 
                          onClick={() => handleManualPlay(msg.content)}
                          className="p-2 hover:bg-zinc-800 rounded-xl text-slate-400 hover:text-brand-primary transition-all active:scale-95"
                          title="Play Audio"
                        >
                          <Volume2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <div className="flex justify-start">
                <div className="glass-surface rounded-[2rem] rounded-tl-none p-6 shadow-xl shadow-black/20 flex items-center gap-4">
                  <div className="flex gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.div 
                        key={i}
                        animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
                        transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                        className="w-2 h-2 bg-brand-primary rounded-full" 
                      />
                    ))}
                  </div>
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-widest">
                    {isVoiceLoading ? t('generatingVoice') : t('analyzingMarkets')}
                  </span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 md:p-10 glass-header border-t border-white/10">
            <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto relative group">
              <div className="absolute inset-0 bg-brand-primary/5 rounded-3xl blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t('chatPlaceholder')}
                className="w-full pl-8 pr-32 py-6 glass-surface rounded-3xl focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary text-white placeholder:text-slate-500 transition-all outline-none shadow-2xl shadow-black/50 relative z-10 text-lg"
              />
              <div className="absolute right-3 top-3 bottom-3 flex gap-2.5 z-20">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={cn(
                    "px-4 rounded-2xl transition-all flex flex-col items-center justify-center active:scale-95 gap-1",
                    isListening ? "bg-rose-500 text-white shadow-lg shadow-rose-500/30" : "bg-zinc-800 text-slate-400 hover:bg-zinc-700"
                  )}
                  title="Voice Input"
                >
                  {isListening ? (
                    <>
                      <Waveform isAnimating={true} color="bg-white" barCount={4} />
                      <span className="text-[8px] font-bold uppercase tracking-tighter">Listening</span>
                    </>
                  ) : (
                    <Mic size={22} />
                  )}
                </button>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="px-6 bg-brand-primary text-white rounded-2xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center shadow-lg shadow-indigo-500/30 active:scale-95"
                >
                  <Send size={22} />
                </button>
              </div>
            </form>
            <div className="flex items-center justify-center gap-6 mt-6">
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">
                {t('aiAdvisorDisclaimer')}
              </p>
              <div className="w-1 h-1 bg-zinc-800 rounded-full" />
              <p className="text-[10px] text-slate-500 uppercase tracking-[0.2em] font-bold">
                {t('secureEncrypted')}
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function LanguageSelection({ onSelect, appName }: { onSelect: (lang: Language) => void, appName: string }) {
  const t = (lang: Language, key: TranslationKeys) => {
    const langCode = lang.code as keyof typeof translations || 'en';
    return (translations[langCode] || translations.en)[key] || translations.en[key];
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 selection:bg-brand-primary/30">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl w-full glass-card rounded-[3rem] p-12 text-center space-y-12 shadow-2xl border border-white/10"
      >
        <div className="space-y-4">
          <motion.div 
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="inline-flex items-center gap-3 px-6 py-2 bg-brand-primary/10 rounded-full text-brand-primary border border-brand-primary/20 mb-4"
          >
            <div className="w-2 h-2 bg-brand-primary rounded-full animate-pulse" />
            <span className="text-xs font-black uppercase tracking-[0.3em]">AI Financial Advisor</span>
          </motion.div>
          <h1 className="text-6xl font-display font-black text-white tracking-tighter leading-none">
            {t(LANGUAGES[0], 'welcomeTo')} <span className="text-brand-primary">{appName}</span>
          </h1>
          <p className="text-xl text-slate-400 font-medium max-w-xl mx-auto leading-relaxed">
            {t(LANGUAGES[0], 'personalAdvisor')}
          </p>
        </div>

        <div className="space-y-6">
          <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">{t(LANGUAGES[0], 'selectLanguage')}</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {LANGUAGES.map((lang) => (
              <button
                key={lang.code}
                onClick={() => onSelect(lang)}
                className="group flex flex-col items-center justify-center p-6 bg-white/5 hover:bg-brand-primary rounded-[2rem] border border-white/5 hover:border-brand-primary transition-all duration-300 active:scale-95 shadow-lg hover:shadow-indigo-500/40"
              >
                <span className="text-2xl font-bold text-white mb-1 group-hover:scale-110 transition-transform">{lang.nativeName}</span>
                <span className="text-[10px] font-bold text-slate-500 group-hover:text-indigo-100 uppercase tracking-widest">{lang.name}</span>
              </button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function Onboarding({ onSubmit, language, appName, t }: { 
  onSubmit: (profile: FinancialProfile) => void, 
  language: Language, 
  appName: string,
  t: (key: TranslationKeys) => any
}) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<FinancialProfile>({
    name: '',
    age: 25,
    monthlyIncome: 50000,
    monthlyExpenses: 30000,
    savings: 100000,
    riskTolerance: 'medium',
    shortTermGoals: [],
    longTermGoals: [],
    dependents: 0,
  });

  const [customShortTerm, setCustomShortTerm] = useState('');
  const [customLongTerm, setCustomLongTerm] = useState('');

  const shortTermGoalsList = [
    'emergencyFund',
    'travel',
    'buyingCar',
    'gadgetPurchase',
    'shortCourse',
    'weddingExpenses'
  ];

  const longTermGoalsList = [
    'retirementPlanning',
    'buyingHome',
    'childEducation',
    'wealthCreation',
    'taxSaving',
    'businessCapital'
  ];

  const translateGoal = (goal: string) => {
    return t(goal as TranslationKeys) || goal;
  };

  const handleShortTermToggle = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      shortTermGoals: prev.shortTermGoals.includes(goal) 
        ? prev.shortTermGoals.filter(g => g !== goal) 
        : [...prev.shortTermGoals, goal]
    }));
  };

  const handleLongTermToggle = (goal: string) => {
    setFormData(prev => ({
      ...prev,
      longTermGoals: prev.longTermGoals.includes(goal) 
        ? prev.longTermGoals.filter(g => g !== goal) 
        : [...prev.longTermGoals, goal]
    }));
  };

  const addCustomShortTerm = () => {
    if (customShortTerm.trim() && !formData.shortTermGoals.includes(customShortTerm.trim())) {
      setFormData(prev => ({
        ...prev,
        shortTermGoals: [...prev.shortTermGoals, customShortTerm.trim()]
      }));
      setCustomShortTerm('');
    }
  };

  const addCustomLongTerm = () => {
    if (customLongTerm.trim() && !formData.longTermGoals.includes(customLongTerm.trim())) {
      setFormData(prev => ({
        ...prev,
        longTermGoals: [...prev.longTermGoals, customLongTerm.trim()]
      }));
      setCustomLongTerm('');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-6 selection:bg-brand-primary/30">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-xl w-full glass-card rounded-[2.5rem] overflow-hidden"
      >
        <div className="h-2.5 bg-white/5">
          <motion.div 
            className="h-full bg-brand-primary shadow-[0_0_15px_rgba(99,102,241,0.5)]" 
            initial={{ width: '0%' }}
            animate={{ width: `${(step / 3) * 100}%` }}
          />
        </div>
        
        <div className="p-10">
          {step === 1 && (
            <div className="space-y-8">
              <div className="flex items-center gap-5 mb-10">
                <div className="w-14 h-14 bg-brand-primary/20 rounded-[1.25rem] flex items-center justify-center text-brand-primary shadow-inner">
                  <User size={28} />
                </div>
                <div>
                  <h2 className="text-3xl font-display font-bold text-white tracking-tight">{t('basicDetails')}</h2>
                  <p className="text-slate-500 font-medium">{t('tellUsAboutSituation')}</p>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">{t('fullName')}</label>
                <input 
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  className="w-full px-5 py-4 glass-surface rounded-2xl focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-medium text-white placeholder:text-slate-600"
                  placeholder={t('enterFullName')}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">{t('age')}</label>
                  <input 
                    type="number" 
                    value={isNaN(formData.age) ? '' : formData.age}
                    onChange={e => setFormData({...formData, age: e.target.value === '' ? NaN : parseInt(e.target.value)})}
                    className="w-full px-5 py-4 glass-surface rounded-2xl focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-medium text-white placeholder:text-slate-600"
                    placeholder="25"
                  />
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">{t('dependents')}</label>
                  <input 
                    type="number" 
                    value={isNaN(formData.dependents) ? '' : formData.dependents}
                    onChange={e => setFormData({...formData, dependents: e.target.value === '' ? NaN : parseInt(e.target.value)})}
                    className="w-full px-5 py-4 glass-surface rounded-2xl focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-medium text-white placeholder:text-slate-600"
                    placeholder="0"
                  />
                </div>
              </div>
 
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">{t('monthlyIncome')}</label>
                  <div className="relative group">
                    <IndianRupee className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-primary transition-colors" size={20} />
                    <input 
                      type="number" 
                      value={isNaN(formData.monthlyIncome) ? '' : formData.monthlyIncome}
                      onChange={e => setFormData({...formData, monthlyIncome: e.target.value === '' ? NaN : parseInt(e.target.value)})}
                      className="w-full pl-14 pr-5 py-4 glass-surface rounded-2xl focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-medium text-white placeholder:text-slate-600"
                      placeholder="50,000"
                    />
                  </div>
                </div>
                <div className="space-y-2.5">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">{t('monthlyExpenses')}</label>
                  <div className="relative group">
                    <IndianRupee className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-primary transition-colors" size={20} />
                    <input 
                      type="number" 
                      value={isNaN(formData.monthlyExpenses) ? '' : formData.monthlyExpenses}
                      onChange={e => setFormData({...formData, monthlyExpenses: e.target.value === '' ? NaN : parseInt(e.target.value)})}
                      className="w-full pl-14 pr-5 py-4 glass-surface rounded-2xl focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-medium text-white placeholder:text-slate-600"
                      placeholder="30,000"
                    />
                  </div>
                </div>
              </div>
 
              <button 
                onClick={() => setStep(2)}
                disabled={!formData.name.trim() || isNaN(formData.age) || isNaN(formData.dependents) || isNaN(formData.monthlyIncome) || isNaN(formData.monthlyExpenses)}
                className="btn-primary w-full flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
              >
                {t('continue')} <ChevronRight size={22} />
              </button>
            </div>
          )}
 
          {step === 2 && (
            <div className="space-y-8">
              <div className="flex items-center gap-5 mb-10">
                <div className="w-14 h-14 bg-amber-500/10 rounded-[1.25rem] flex items-center justify-center text-amber-400 shadow-inner">
                  <ShieldCheck size={28} />
                </div>
                <div>
                  <h2 className="text-3xl font-display font-bold text-white tracking-tight">{t('riskAndSavings')}</h2>
                  <p className="text-slate-500 font-medium">{t('definingBoundaries')}</p>
                </div>
              </div>
 
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">{t('riskTolerance')}</label>
                <div className="grid grid-cols-3 gap-4">
                  {(['low', 'medium', 'high'] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setFormData({...formData, riskTolerance: r})}
                      className={cn(
                        "py-4 rounded-2xl border font-bold text-sm transition-all capitalize active:scale-95",
                        formData.riskTolerance === r 
                          ? "bg-brand-primary border-brand-primary text-white shadow-xl shadow-indigo-500/30" 
                          : "glass-surface text-slate-400 hover:border-white/20"
                      )}
                    >
                      {t(r)}
                    </button>
                  ))}
                </div>
              </div>
 
              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] ml-1">{t('currentSavings')}</label>
                <div className="relative group">
                  <Wallet className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-primary transition-colors" size={20} />
                  <input 
                    type="number" 
                    value={isNaN(formData.savings) ? '' : formData.savings}
                    onChange={e => setFormData({...formData, savings: e.target.value === '' ? NaN : parseInt(e.target.value)})}
                    className="w-full pl-14 pr-5 py-4 glass-surface rounded-2xl focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary outline-none transition-all font-medium text-white placeholder:text-slate-600"
                    placeholder="1,00,000"
                  />
                </div>
              </div>
 
              <div className="flex gap-5 pt-4">
                <button 
                  onClick={() => setStep(1)}
                  className="btn-secondary flex-1"
                >
                  {t('back')}
                </button>
                <button 
                  onClick={() => setStep(3)}
                  disabled={isNaN(formData.savings)}
                  className="btn-primary flex-[2] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {t('continue')} <ChevronRight size={22} />
                </button>
              </div>
            </div>
          )}
 
          {step === 3 && (
            <div className="space-y-8 max-h-[75vh] overflow-y-auto pr-2 custom-scrollbar">
              <div className="flex items-center gap-5 mb-6">
                <div className="w-14 h-14 bg-emerald-500/10 rounded-[1.25rem] flex items-center justify-center text-emerald-400 shadow-inner">
                  <Target size={28} />
                </div>
                <div>
                  <h2 className="text-3xl font-display font-bold text-white tracking-tight">{t('financialGoals')}</h2>
                  <p className="text-slate-500 font-medium">{t('whatAreWeAimingFor')}</p>
                </div>
              </div>
 
              <div className="space-y-8">
                <section>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">{t('shortTermGoalsRange')}</h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {shortTermGoalsList.map(goal => (
                      <button
                        key={goal}
                        onClick={() => handleShortTermToggle(goal)}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all active:scale-95",
                          formData.shortTermGoals.includes(goal)
                            ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 shadow-md shadow-emerald-500/20"
                            : "glass-surface text-slate-400 hover:border-white/20"
                        )}
                      >
                        <span className="text-xs font-bold leading-tight">{translateGoal(goal)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <input 
                      type="text"
                      placeholder={t('addCustomShortTerm')}
                      value={customShortTerm}
                      onChange={e => setCustomShortTerm(e.target.value)}
                      className="flex-1 px-5 py-3 glass-surface rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-medium text-white placeholder:text-slate-600"
                    />
                    <button 
                      onClick={addCustomShortTerm}
                      className="p-3 bg-brand-primary text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </section>
 
                <section>
                  <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 ml-1">{t('longTermGoalsRange')}</h3>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {longTermGoalsList.map(goal => (
                      <button
                        key={goal}
                        onClick={() => handleLongTermToggle(goal)}
                        className={cn(
                          "p-4 rounded-2xl border text-left transition-all active:scale-95",
                          formData.longTermGoals.includes(goal)
                            ? "bg-indigo-500/10 border-brand-primary text-brand-primary shadow-md shadow-indigo-500/20"
                            : "glass-surface text-slate-400 hover:border-white/20"
                        )}
                      >
                        <span className="text-xs font-bold leading-tight">{translateGoal(goal)}</span>
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <input 
                      type="text"
                      placeholder={t('addCustomLongTerm')}
                      value={customLongTerm}
                      onChange={e => setCustomLongTerm(e.target.value)}
                      className="flex-1 px-5 py-3 glass-surface rounded-2xl text-sm outline-none focus:ring-4 focus:ring-brand-primary/20 focus:border-brand-primary transition-all font-medium text-white placeholder:text-slate-600"
                    />
                    <button 
                      onClick={addCustomLongTerm}
                      className="p-3 bg-brand-primary text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </section>
              </div>
 
              <div className="flex gap-5 pt-6 pb-2">
                <button 
                  onClick={() => setStep(2)}
                  className="btn-secondary flex-1"
                >
                  {t('back')}
                </button>
                <button 
                  onClick={() => onSubmit(formData)}
                  disabled={formData.shortTermGoals.length === 0 && formData.longTermGoals.length === 0}
                  className="btn-primary flex-[2] bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                >
                  {t('startAdvisor')} <TrendingUp size={22} />
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
