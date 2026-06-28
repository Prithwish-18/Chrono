import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { collection, addDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { ChatMessage } from '../types';
import { Sparkles, Send, Bot, X, CheckSquare, Calendar, ChevronRight, Check } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import MicButton from './MicButton';

interface ProductivityCoachProps {
  userId: string;
  isOpen: boolean;
  onClose: () => void;
}

const hours = Array.from({ length: 18 }, (_, idx) => `${6 + idx}:00 - ${7 + idx}:00`);

export default function ProductivityCoach({ userId, isOpen, onClose }: ProductivityCoachProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [appliedPlans, setAppliedPlans] = useState<Set<string>>(new Set());
  const chatEndRef = useRef<HTMLDivElement>(null);

  const coachMic = useSpeechRecognition({
    lang: 'en-IN',
    onResult: (text) => {
      setUserInput(prev => prev ? prev + ' ' + text : text);
    }
  });

  // Load chat history from localStorage on load
  useEffect(() => {
    const localHistory = localStorage.getItem(`coach_history_${userId}`);
    if (localHistory) {
      setMessages(JSON.parse(localHistory));
    } else {
      // Warm initial welcome from Chrono-Coach
      setMessages([
        {
          id: 'welcome',
          sender: 'coach',
          text: "Hey! I'm **Chrono-Coach**, your high-performance personal productivity mentor. Procrastinating? Deadlines creeping up? Overwhelmed?\n\nTell me what's on your plate (e.g., 'I have 3 math exams in 2 days and zero motivation'). I'll draft an extreme action plan for you, and we can auto-populate your planner or task lists instantly!",
          timestamp: new Date().toISOString()
        }
      ]);
    }
  }, [userId]);

  // Scroll to bottom when messaging updates
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const saveHistory = (msgs: ChatMessage[]) => {
    localStorage.setItem(`coach_history_${userId}`, JSON.stringify(msgs));
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim() || loading) return;

    coachMic.stop();

    const userMsgText = userInput.trim();
    const newUserMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: userMsgText,
      timestamp: new Date().toISOString()
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    saveHistory(updatedMessages);
    setUserInput('');
    setLoading(true);

    try {
      // Map message history to simple roles for Gemini
      const apiHistory = updatedMessages.map(m => ({
        role: m.sender === 'user' ? 'user' as const : 'model' as const,
        text: m.text
      }));

      const response = await fetch('/api/productivity-coach', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: userMsgText,
          history: apiHistory.slice(0, -1) // pass historical turns excluding the current one
        })
      });

      if (!response.ok) throw new Error("Chrono-Coach had an issue connecting");
      const result = await response.json();

      if (result) {
        const coachMsg: ChatMessage = {
          id: Math.random().toString(),
          sender: 'coach',
          text: result.reply,
          timestamp: new Date().toISOString(),
          suggestedTasks: result.suggestedTasks,
          suggestedPlannerBlocks: result.suggestedPlannerBlocks
        };

        const finalMessages = [...updatedMessages, coachMsg];
        setMessages(finalMessages);
        saveHistory(finalMessages);
      }
    } catch (err: any) {
      console.error(err);
      const errorMsg: ChatMessage = {
        id: Math.random().toString(),
        sender: 'coach',
        text: "Apologies, my systems are currently taking a quick breather. Let me know if you want me to re-formulate our plan!",
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const applySuggestedPlan = async (messageId: string, suggestedTasks?: any[], suggestedPlannerBlocks?: any[]) => {
    if (appliedPlans.has(messageId)) return;

    try {
      // 1. Write suggested tasks to Firestore
      if (suggestedTasks && suggestedTasks.length > 0) {
        for (const task of suggestedTasks) {
          await addDoc(collection(db, 'users', userId, 'tasks'), {
            task: task.name,
            details: task.details,
            imp: task.imp,
            deadline: "",
            completed: false,
            createdAt: new Date().toISOString(),
            aiReasoning: "Formulated by Chrono-Coach"
          });
        }
      }

      // 2. Write suggested planner blocks to Firestore
      if (suggestedPlannerBlocks && suggestedPlannerBlocks.length > 0) {
        const todayStr = new Date().toISOString().split('T')[0];
        const plannerDocRef = doc(db, 'users', userId, 'planner', todayStr);
        
        // Load current planner blocks to prevent overwriting other hours
        const docSnap = await getDoc(plannerDocRef);
        const currentPlanner = docSnap.exists() ? docSnap.data() : {};

        suggestedPlannerBlocks.forEach(block => {
          currentPlanner[block.hourSlotIndex] = `${block.title} (Coaching Action Plan)`;
        });

        await setDoc(plannerDocRef, currentPlanner);
      }

      // Mark applied
      setAppliedPlans(prev => {
        const next = new Set(prev);
        next.add(messageId);
        return next;
      });

    } catch (err) {
      console.error("Failed to apply suggested coach plan:", err);
      alert("Encountered an issue applying the suggested goals. Try refreshing.");
    }
  };

  const handleClearChat = () => {
    if (window.confirm("Do you want to clear your conversation history?")) {
      localStorage.removeItem(`coach_history_${userId}`);
      setMessages([
        {
          id: 'welcome',
          sender: 'coach',
          text: "Hey! I'm **Chrono-Coach**, your high-performance personal productivity mentor. Procrastinating? Deadlines creeping up? Overwhelmed?\n\nTell me what's on your plate (e.g., 'I have 3 math exams in 2 days and zero motivation'). I'll draft an extreme action plan for you, and we can auto-populate your planner or task lists instantly!",
          timestamp: new Date().toISOString()
        }
      ]);
      setAppliedPlans(new Set());
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-[500] w-full md:w-[480px] bg-[#140202] text-[#F5E8C7] shadow-2xl flex flex-col font-sans border-l border-white/10">
      
      {/* Header */}
      <div className="p-5 bg-[#8E1616] flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <Bot className="w-7 h-7 text-yellow-400 animate-pulse" />
          <div>
            <h3 className="text-xl font-bold leading-none text-white">Chrono-Coach</h3>
            <span className="text-xs text-yellow-400/80 font-mono font-medium">HIGH PERFORMANCE COACH</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleClearChat}
            className="text-xs text-[#F5E8C7]/50 hover:text-[#F5E8C7] font-mono cursor-pointer"
          >
            Clear
          </button>
          <button 
            onClick={onClose}
            className="text-[#F5E8C7] hover:text-white p-1 rounded-md cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Messages view */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m) => {
          const isUser = m.sender === 'user';
          const hasActionPlan = (m.suggestedTasks && m.suggestedTasks.length > 0) || (m.suggestedPlannerBlocks && m.suggestedPlannerBlocks.length > 0);
          const isApplied = appliedPlans.has(m.id);

          return (
            <div key={m.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl p-4 shadow-sm relative ${isUser ? 'bg-orange-600 text-white rounded-tr-none' : 'bg-white/5 border border-white/10 text-[#F5E8C7] rounded-tl-none'}`}>
                
                {/* Text render (supports simple formatting) */}
                <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium"
                    dangerouslySetInnerHTML={{
                      __html: m.text
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    }}
                  />

                {/* Suggested Plans detected block */}
                {!isUser && hasActionPlan && (
                  <div className="mt-4 bg-[#ffbf64]/10 border-2 border-dashed border-[#ffbf64]/40 rounded-xl p-3.5 text-xs text-[#F5E8C7]">
                    <div className="flex items-center gap-1.5 font-bold text-[#ffbf64] uppercase tracking-wider mb-2 select-none">
                      <Sparkles className="w-4 h-4 animate-pulse" />
                      Plan Detected
                    </div>

                    <div className="space-y-1.5 mb-3">
                      {m.suggestedTasks && m.suggestedTasks.length > 0 && (
                        <div className="flex items-center gap-1 text-white/90">
                          <CheckSquare className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Suggests adding {m.suggestedTasks.length} To-Do tasks</span>
                        </div>
                      )}
                      {m.suggestedPlannerBlocks && m.suggestedPlannerBlocks.length > 0 && (
                        <div className="flex items-center gap-1 text-white/90">
                          <Calendar className="w-3.5 h-3.5 text-yellow-400" />
                          <span>Suggests booking {m.suggestedPlannerBlocks.length} scheduler slots</span>
                        </div>
                      )}
                    </div>

                    {!isApplied ? (
                      <button 
                        onClick={() => applySuggestedPlan(m.id, m.suggestedTasks, m.suggestedPlannerBlocks)}
                        className="w-full bg-gradient-to-r from-purple-700 to-[#ff510d] hover:from-purple-600 hover:to-orange-500 text-white font-bold py-2.5 px-3 rounded-lg flex items-center justify-center gap-1 transition-all cursor-pointer shadow-md text-xs active:scale-97"
                      >
                        Apply Plan to Dashboard
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="w-full bg-green-700/50 border border-green-500 text-green-300 font-bold py-2 px-3 rounded-lg flex items-center justify-center gap-1 select-none text-xs">
                        <Check className="w-4 h-4" />
                        Plan Applied Successfully!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-none p-4 text-sm font-semibold flex items-center gap-2 text-yellow-400">
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              <span>Coaching plan formulation in progress...</span>
            </div>
          </div>
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input Form */}
      <div className="flex flex-col gap-1.5 p-4 bg-[#8E1616]/20 border-t border-white/10">
        <form onSubmit={handleSendMessage} className="flex gap-2 items-center">
          <input 
            type="text" 
            placeholder="I have 3 exams in 2 days..."
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={loading}
            className="flex-1 p-3 rounded-xl border border-white/15 bg-white/5 text-sm text-white placeholder:text-[#F5E8C7]/30 outline-none focus:border-[#ffbf64] focus:bg-white/10"
          />
          <MicButton
            isListening={coachMic.isListening}
            isSupported={coachMic.isSupported}
            onToggle={() => coachMic.isListening ? coachMic.stop() : coachMic.start()}
            size="md"
          />
          <button 
            type="submit" 
            disabled={loading || !userInput.trim()}
            className="bg-yellow-400 hover:bg-yellow-300 disabled:opacity-50 text-black p-3 rounded-xl flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        {coachMic.isListening && (
          <p className="text-xs text-red-400 font-semibold animate-pulse ml-1 flex items-center gap-1.5 select-none">
            <span className="w-2 h-2 bg-red-400 rounded-full animate-ping" />
            <span>🎤 Listening... speak your situation</span>
          </p>
        )}
        {coachMic.error && (
          <p className="text-xs text-red-400 font-semibold ml-1 mt-1 leading-relaxed">
            🎤 Mic error: {coachMic.error === 'not-allowed' ? 'Microphone permission was denied. Please allow microphone access in your browser or open the app in a new tab.' : coachMic.error}
          </p>
        )}
      </div>
    </div>
  );
}
