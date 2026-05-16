import React, { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, Clock, RefreshCw, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { Language } from '../types';
import { translations, TranslationKeys } from '../translations';

interface NewsItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  thumbnail: string;
  source?: string;
}

interface NewsFeedProps {
  language?: Language | null;
}

const NewsFeed: React.FC<NewsFeedProps> = ({ language }) => {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');

  const t = (key: TranslationKeys) => {
    if (!language) return translations.en[key];
    return translations[language.code as keyof typeof translations]?.[key] || translations.en[key];
  };

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const sources = [
        { name: 'Economic Times', url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms' },
        { name: 'Moneycontrol', url: 'https://www.moneycontrol.com/rss/marketreports.xml' },
        { name: 'Business Standard', url: 'https://www.business-standard.com/rss/markets-106.rss' }
      ];

      const allItems: NewsItem[] = [];
      
      const fetchPromises = sources.map(async (source) => {
        try {
          const cacheBuster = Date.now();
          const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}&api_key=your_api_key_here&_=${cacheBuster}`;
          // Note: If you don't have an api_key, rss2json might have stricter limits, but for this app we'll use the free tier which doesn't strictly require one for low volume.
          const res = await fetch(`https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.url)}&_=${cacheBuster}`);
          const data = await res.json();
          if (data.status === 'ok') {
            return data.items.map((item: any) => ({
              ...item,
              source: source.name
            }));
          }
          return [];
        } catch (e) {
          console.error(`Failed to fetch from ${source.name}`, e);
          return [];
        }
      });

      const results = await Promise.all(fetchPromises);
      results.forEach(items => allItems.push(...items));

      // Sort by date descending
      const sortedItems = allItems.sort((a, b) => 
        new Date(b.pubDate).getTime() - new Date(a.pubDate).getTime()
      );

      if (sortedItems.length > 0) {
        setNews(sortedItems.slice(0, 20));
        setLastUpdated(new Date());
      } else {
        throw new Error('No news articles found');
      }
    } catch (err) {
      console.error('Error fetching news:', err);
      setError('Unable to load market news. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews();
    // Refresh news every 15 minutes
    const interval = setInterval(fetchNews, 15 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredNews = news.filter(item => 
    item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
          <Newspaper size={14} /> Market Pulse
        </h3>
        <button 
          onClick={fetchNews}
          disabled={loading}
          className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-brand-primary transition-all disabled:opacity-50"
          title="Refresh News"
        >
          <RefreshCw size={12} className={cn(loading && "animate-spin")} />
        </button>
      </div>

      <div className="relative group px-1 buttery-glide">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-brand-primary transition-colors" size={14} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('searchNews')}
          className="w-full glass-surface border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-brand-primary/50 focus:ring-1 focus:ring-brand-primary/20 transition-all"
        />
      </div>

      <div className="space-y-4">
        {loading && news.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="p-4 glass-surface rounded-2xl border border-white/5 animate-pulse space-y-3">
              <div className="h-3 bg-white/10 rounded w-3/4" />
              <div className="h-2 bg-white/10 rounded w-1/2" />
              <div className="flex justify-between pt-2">
                <div className="h-2 bg-white/10 rounded w-1/4" />
                <div className="h-2 bg-white/10 rounded w-1/4" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="p-6 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-center">
            <p className="text-xs text-rose-400 font-medium">{error}</p>
            <button 
              onClick={fetchNews}
              className="mt-3 text-[10px] font-bold text-rose-400 uppercase tracking-widest hover:underline"
            >
              Retry
            </button>
          </div>
        ) : filteredNews.length === 0 ? (
          <div className="p-8 text-center bg-white/5 rounded-2xl border border-white/5">
            <Search size={24} className="mx-auto text-slate-600 mb-3 opacity-20" />
            <p className="text-xs text-slate-500 font-medium">No news found matching your search.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredNews.map((item, idx) => (
              <motion.div
                key={item.link}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                layout
                className="group p-4 glass-surface hover:bg-white/10 border border-white/5 hover:border-brand-primary/30 rounded-2xl buttery-glide cursor-pointer relative overflow-hidden"
                onClick={() => window.open(item.link, '_blank')}
              >
                <div className="absolute top-0 left-0 w-1 h-full bg-brand-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                
                <h4 className="text-xs font-bold text-white leading-relaxed group-hover:text-brand-primary transition-colors line-clamp-2 mb-2">
                  {item.title}
                </h4>
                
                <div className="flex items-center justify-between text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} />
                      {new Date(item.pubDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    {item.source && (
                      <span className="text-brand-primary/60 border border-brand-primary/20 px-1.5 py-0.5 rounded uppercase leading-none">
                        {item.source}
                      </span>
                    )}
                    {new Date().getTime() - new Date(item.pubDate).getTime() < 3600000 && (
                      <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-brand-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    Read More <ExternalLink size={10} />
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      <div className="px-1 flex items-center justify-between">
        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
          Dynamic Multiple Sources
        </p>
        <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">
          Updated: {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

export default NewsFeed;
