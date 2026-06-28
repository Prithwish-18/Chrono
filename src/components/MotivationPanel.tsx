import React, { useState, useEffect } from 'react';
import { Quote as QuoteIcon, RefreshCw } from 'lucide-react';

interface MotivationPanelProps {
  onClose: () => void;
}

interface QuoteData {
  quote: string;
  author: string;
}

export default function MotivationPanel({ onClose }: MotivationPanelProps) {
  const [quoteData, setQuoteData] = useState<QuoteData>({
    quote: "Loading your daily dose of inspiration...",
    author: ""
  });
  const [loading, setLoading] = useState(false);

  const fetchQuote = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://dummyjson.com/quotes/random');
      if (!response.ok) throw new Error("Quote fetch failed");
      const data = await response.json();
      setQuoteData({
        quote: data.quote,
        author: data.author
      });
    } catch (error) {
      console.error("Error fetching quote:", error);
      // Fallbacks
      const fallbackQuotes = [
        { quote: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
        { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" },
        { quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
        { quote: "Procrastination is the thief of time.", author: "Edward Young" },
        { quote: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" }
      ];
      const randomFallback = fallbackQuotes[Math.floor(Math.random() * fallbackQuotes.length)];
      setQuoteData(randomFallback);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, []);

  const quoteLength = quoteData.quote.length;
  const fontSizeClass = quoteLength > 150 
    ? "text-xl md:text-2xl lg:text-3xl" 
    : quoteLength > 80 
    ? "text-2xl md:text-3xl lg:text-4xl" 
    : "text-2xl md:text-4xl lg:text-5xl";

  return (
    <div className="fixed inset-0 z-[200] bg-[#8E1616] p-6 md:p-10 overflow-y-auto flex flex-col font-sans select-none">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl md:text-5xl font-bold text-[#F5E8C7]">Inspirational Quotes</h2>
        <button 
          onClick={onClose}
          className="bg-[#EBFD3F] hover:bg-[#d9ec2f] text-black font-bold px-7 py-3.5 rounded-xl cursor-pointer transition-all active:scale-95 text-base shadow-lg font-sans"
        >
          Close
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4">
        <div className="relative w-full max-w-4xl rounded-[30px] my-4">
          {/* Neon Glow effect behind the card */}
          <div className="absolute inset-[-15px] rounded-[30px] bg-[#ff9558] blur-[60px] opacity-80 z-[8] pointer-events-none" />

          {/* Actual Card */}
          <div className="relative rounded-[30px] bg-[#ff5900] p-8 md:p-12 z-[10] flex flex-col justify-between shadow-2xl border border-orange-400/30 min-h-[400px]">
            
            {/* Quote Icon */}
            <div className="absolute top-[13%] right-[7%] -translate-x-1/2 -translate-y-1/2 opacity-20 pointer-events-none text-white drop-shadow-[1px_4px_5px_#8E1616]">
              <QuoteIcon className="w-16 h-16 md:w-24 md:h-24 stroke-[3px]" />
            </div>

            {/* Top Indicator */}
            <div className="bg-[#F5E8C7] px-6 py-4 rounded-tl-[20px] rounded-br-[90px] w-fit shadow-md border-r-4 border-b-4 border-yellow-500/20">
              <h2 className="text-xl md:text-3xl font-bold text-[#8E1616]">Quote of the Day</h2>
            </div>

            {/* Main Quote Text */}
            <div className="my-8 flex-1 flex items-center">
              <h1 className={`${fontSizeClass} font-medium text-[#F5E8C7] leading-relaxed drop-shadow-sm italic`}>
                "{quoteData.quote}"
              </h1>
            </div>

            {/* Author and Actions block */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6 mt-6 pt-4 border-t border-white/10">
              <div className="bg-[#F5E8C7] px-8 py-4 rounded-tr-[90px] rounded-bl-[20px] shadow-md border-l-4 border-t-4 border-yellow-500/20 w-fit max-w-full">
                <h3 className="text-lg md:text-2xl font-bold text-[#8E1616]">
                  {quoteData.author ? `- ${quoteData.author}` : ''}
                </h3>
              </div>

              {/* Refresh quote button */}
              <button 
                onClick={fetchQuote}
                disabled={loading}
                className="self-end sm:self-auto bg-yellow-400 hover:bg-[#EBFD3F] text-black p-4 rounded-full shadow-lg cursor-pointer flex items-center justify-center transition-all hover:scale-110 active:scale-95 disabled:opacity-50 border border-orange-400/25"
                title="Fetch another quote"
              >
                <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
