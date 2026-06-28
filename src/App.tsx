import { useState, useEffect } from 'react';
import { auth } from './firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';

// Import Custom Modular Panels
import AuthGate from './components/AuthGate';
import HeroBanner from './components/HeroBanner';
import TodoListPanel from './components/TodoListPanel';
import DailyPlannerPanel from './components/DailyPlannerPanel';
import MotivationPanel from './components/MotivationPanel';
import PomodoroPanel from './components/PomodoroPanel';
import DailyGoalsPanel from './components/DailyGoalsPanel';
import ProductivityCoach from './components/ProductivityCoach';
import CalendarPanel from './components/CalendarPanel';

// Import Icons
import { Bot, LogOut, Sparkles } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<'todo' | 'planner' | 'motivation' | 'pomo' | 'goals' | 'calendar' | null>(null);
  const [currentThemeIndex, setCurrentThemeIndex] = useState(() => {
    const local = localStorage.getItem('hero_theme_idx');
    return local ? parseInt(local) : 0;
  });
  const [coachOpen, setCoachOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [showVoiceNotice, setShowVoiceNotice] = useState(false);

  // Monitor Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Check browser speech recognition support once per session
  useEffect(() => {
    const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    const dismissed = sessionStorage.getItem('voice_notice_dismissed');
    if (!supported && !dismissed) {
      setShowVoiceNotice(true);
    }
  }, []);

  const handleThemeChange = () => {
    const nextIdx = (currentThemeIndex + 1) % 5;
    setCurrentThemeIndex(nextIdx);
    localStorage.setItem('hero_theme_idx', nextIdx.toString());
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setActivePanel(null);
      setCoachOpen(false);
    } catch (err) {
      console.error("Logout failed:", err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen w-full bg-[#8E1616] flex flex-col items-center justify-center text-[#F5E8C7]">
        <div className="text-center flex flex-col items-center gap-4">
          <Bot className="w-16 h-16 text-yellow-400 animate-bounce" />
          <h2 className="text-3xl font-bold font-sans tracking-wide">Initializing Chrono...</h2>
          <span className="text-sm font-mono opacity-60">Synchronizing database security rules</span>
        </div>
      </div>
    );
  }

  // If user is not authenticated, show the login/register gate
  if (!user) {
    return <AuthGate onSuccess={() => {}} />;
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'Member';

  return (
    <div id="main" className="min-h-screen w-full bg-[#8E1616] flex flex-col relative pb-10 overflow-x-hidden font-sans">
      
      {/* Navigation Header */}
      <nav className="mx-10 my-4 h-[70px] bg-black/75 backdrop-blur-md border border-white/8 rounded-2xl shadow-lg flex justify-between items-center px-6 md:px-10 select-none">
        {/* Logo block */}
        <div className="flex items-center gap-3">
          {logoError ? (
            <svg viewBox="0 0 100 100" className="h-11 w-11 drop-shadow-[0_2px_8px_rgba(255,81,13,0.3)]">
              {/* Outer orange clock body */}
              <circle cx="50" cy="50" r="44" fill="#E65F2B" stroke="#A7330D" strokeWidth="2" />
              <circle cx="50" cy="50" r="38" fill="#F49134" />
              
              {/* Clock face ticks */}
              <line x1="50" y1="18" x2="50" y2="22" stroke="#A7330D" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="50" y1="78" x2="50" y2="82" stroke="#A7330D" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="18" y1="50" x2="22" y2="50" stroke="#A7330D" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="78" y1="50" x2="82" y2="50" stroke="#A7330D" strokeWidth="2.5" strokeLinecap="round" />
              
              <line x1="28" y1="28" x2="31" y2="31" stroke="#A7330D" strokeWidth="2" strokeLinecap="round" />
              <line x1="72" y1="28" x2="69" y2="31" stroke="#A7330D" strokeWidth="2" strokeLinecap="round" />
              <line x1="28" y1="72" x2="31" y2="69" stroke="#A7330D" strokeWidth="2" strokeLinecap="round" />
              <line x1="72" y1="72" x2="69" y2="69" stroke="#A7330D" strokeWidth="2" strokeLinecap="round" />

              {/* Eyes */}
              <ellipse cx="38" cy="42" rx="7" ry="11" fill="#FBF3DB" stroke="#1A0202" strokeWidth="2" />
              <ellipse cx="38" cy="42" rx="3.5" ry="6" fill="#1A0202" />
              <circle cx="37" cy="39" r="1.5" fill="#FFFFFF" />
              
              <ellipse cx="62" cy="42" rx="7" ry="11" fill="#FBF3DB" stroke="#1A0202" strokeWidth="2" />
              <ellipse cx="62" cy="42" rx="3.5" ry="6" fill="#1A0202" />
              <circle cx="61" cy="39" r="1.5" fill="#FFFFFF" />

              {/* Eyelashes */}
              <path d="M 32 32 Q 35 27 35 27" stroke="#1A0202" strokeWidth="2" strokeLinecap="round" />
              <path d="M 38 31 Q 39 25 39 25" stroke="#1A0202" strokeWidth="2" strokeLinecap="round" />
              <path d="M 44 32 Q 43 27 43 27" stroke="#1A0202" strokeWidth="2" strokeLinecap="round" />

              <path d="M 56 32 Q 57 27 57 27" stroke="#1A0202" strokeWidth="2" strokeLinecap="round" />
              <path d="M 62 31 Q 61 25 61 25" stroke="#1A0202" strokeWidth="2" strokeLinecap="round" />
              <path d="M 68 32 Q 65 27 65 27" stroke="#1A0202" strokeWidth="2" strokeLinecap="round" />

              {/* Smiling mouth */}
              <path d="M 42 56 Q 50 62 58 56" fill="none" stroke="#1A0202" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 41 57 C 40 55 43 54 43 54" fill="none" stroke="#1A0202" strokeWidth="2" strokeLinecap="round" />
              <path d="M 59 57 C 60 55 57 54 57 54" fill="none" stroke="#1A0202" strokeWidth="2" strokeLinecap="round" />
              
              {/* Hands */}
              <line x1="50" y1="50" x2="50" y2="35" stroke="#1A0202" strokeWidth="3" strokeLinecap="round" />
              <line x1="50" y1="50" x2="64" y2="50" stroke="#1A0202" strokeWidth="3" strokeLinecap="round" />
              <circle cx="50" cy="50" r="4" fill="#1A0202" />

              {/* Cheeks */}
              <circle cx="31" cy="51" r="2.5" fill="#E65F2B" opacity="0.6" />
              <circle cx="69" cy="51" r="2.5" fill="#E65F2B" opacity="0.6" />
            </svg>
          ) : (
            <img 
              src="https://cdn.dribbble.com/userupload/10905160/file/original-6c2179d180b7931102af662df509ada7.jpg?resize=1504x1128&vertical=center" 
              alt="Chrono Logo" 
              className="h-11 w-11 object-cover rounded-full drop-shadow-[0_2px_8px_rgba(255,81,13,0.3)] border border-orange-500/30"
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
            />
          )}
          <span className="text-2xl font-bold text-[#F5E8C7] tracking-wider font-sans">Chrono</span>
        </div>

        {/* User Greeting & controls */}
        <div className="flex items-center gap-4">
          <span className="hidden sm:inline-block text-sm font-medium text-[#F5E8C7]/65">
            Hi, {displayName} 👋
          </span>
          <button 
            type="button" 
            onClick={handleThemeChange}
            className="text-xs md:text-sm font-semibold text-[#F5E8C7] border-2 border-[#F5E8C7] py-2 px-4 rounded-full cursor-pointer hover:bg-[#F5E8C7] hover:text-[#8E1616] transition-all shadow-sm"
          >
            Change Theme
          </button>
          <button 
            type="button" 
            onClick={handleLogout}
            className="text-xs md:text-sm font-semibold text-[#F5E8C7] border border-[#F5E8C7]/35 py-2 px-4 rounded-full cursor-pointer hover:bg-white/10 transition-all flex items-center gap-1.5"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </nav>

      {/* Live Widgets & Time Info */}
      <HeroBanner currentThemeIndex={currentThemeIndex} onThemeChange={handleThemeChange} />

      {/* Bento Grid Category Cards */}
      <section className="allElems w-full p-6 md:p-10 pt-4 flex flex-wrap items-start justify-center gap-6 relative select-none">
        
        {/* Card 1: To Do List */}
        <div 
          onClick={() => setActivePanel('todo')}
          className="elem bg-[#ffbf64] h-[380px] w-[270px] text-3xl rounded-xl overflow-hidden relative cursor-pointer hover:scale-[1.03] transition-transform shadow-[0_4px_15px_rgba(255,81,13,0.25)] flex flex-col justify-end"
        >
          <img 
            src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400" 
            alt="To Do List Illustration" 
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
          <h2 className="relative z-10 p-5 font-bold text-3xl text-[#F5E8C7] drop-shadow-md flex flex-col">
            <span className="text-xs text-[#ffbf64] font-semibold tracking-widest uppercase mb-1 font-mono">productivity list</span>
            To Do List
          </h2>
        </div>

        {/* Card 2: Daily Planner */}
        <div 
          onClick={() => setActivePanel('planner')}
          className="elem bg-[#ffbf64] h-[380px] w-[270px] text-3xl rounded-xl overflow-hidden relative cursor-pointer hover:scale-[1.03] transition-transform shadow-[0_4px_15px_rgba(255,81,13,0.25)] flex flex-col justify-end"
        >
          <img 
            src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400" 
            alt="Daily Planner Illustration" 
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
          <h2 className="relative z-10 p-5 font-bold text-3xl text-[#F5E8C7] drop-shadow-md flex flex-col">
            <span className="text-xs text-[#ffbf64] font-semibold tracking-widest uppercase mb-1 font-mono">hourly timeline</span>
            Daily Planner
          </h2>
        </div>

        {/* Card 3: Motivation */}
        <div 
          onClick={() => setActivePanel('motivation')}
          className="elem bg-[#ffbf64] h-[380px] w-[270px] text-3xl rounded-xl overflow-hidden relative cursor-pointer hover:scale-[1.03] transition-transform shadow-[0_4px_15px_rgba(255,81,13,0.25)] flex flex-col justify-end"
        >
          <img 
            src="https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=400" 
            alt="Motivation Illustration" 
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
          <h2 className="relative z-10 p-5 font-bold text-3xl text-[#F5E8C7] drop-shadow-md flex flex-col">
            <span className="text-xs text-[#ffbf64] font-semibold tracking-widest uppercase mb-1 font-mono">daily quotes</span>
            Motivation
          </h2>
        </div>

        {/* Card 4: Pomodoro Timer */}
        <div 
          onClick={() => setActivePanel('pomo')}
          className="elem bg-[#ffbf64] h-[380px] w-[270px] text-3xl rounded-xl overflow-hidden relative cursor-pointer hover:scale-[1.03] transition-transform shadow-[0_4px_15px_rgba(255,81,13,0.25)] flex flex-col justify-end"
        >
          <img 
            src="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400" 
            alt="Pomodoro Timer Illustration" 
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
          <h2 className="relative z-10 p-5 font-bold text-3xl text-[#F5E8C7] drop-shadow-md flex flex-col">
            <span className="text-xs text-[#ffbf64] font-semibold tracking-widest uppercase mb-1 font-mono">focus loop</span>
            Pomodoro Timer
          </h2>
        </div>

        {/* Card 5: Daily Goals */}
        <div 
          onClick={() => setActivePanel('goals')}
          className="elem bg-[#ffbf64] h-[380px] w-[270px] text-3xl rounded-xl overflow-hidden relative cursor-pointer hover:scale-[1.03] transition-transform shadow-[0_4px_15px_rgba(255,81,13,0.25)] flex flex-col justify-end"
        >
          <img 
            src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400" 
            alt="Daily Goals Illustration" 
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
          <h2 className="relative z-10 p-5 font-bold text-3xl text-[#F5E8C7] drop-shadow-md flex flex-col">
            <span className="text-xs text-[#ffbf64] font-semibold tracking-widest uppercase mb-1 font-mono">gamified stats</span>
            Daily Goals
          </h2>
        </div>

        {/* Card 6: Google Calendar */}
        <div
          onClick={() => setActivePanel('calendar')}
          className="elem bg-[#ffbf64] h-[380px] w-[270px] text-3xl rounded-xl overflow-hidden relative cursor-pointer hover:scale-[1.03] transition-transform shadow-[0_4px_15px_rgba(255,81,13,0.25)] flex flex-col justify-end"
        >
          <img
            src="https://play-lh.googleusercontent.com/vEoqLbT_QkYcEaawWBRc22N6i98OUtOUpM1LmKdVs_xx7lCsUyFfV0ZiqoUXjMijUteiBhhN4K5MpoF96FRNOg=w600-h300-pc0xffffff-pd"
            alt="Calendar"
            className="absolute inset-0 w-full h-full object-cover opacity-80"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent pointer-events-none" />
          <h2 className="relative z-10 p-5 font-bold text-3xl text-[#F5E8C7] drop-shadow-md flex flex-col">
            <span className="text-xs text-[#ffbf64] font-semibold tracking-widest uppercase mb-1 font-mono">sync events</span>
            Google Calendar
          </h2>
        </div>

      </section>

      {/* Floating 🤖 Always Visible Coach Button */}
      <button 
        type="button"
        onClick={() => setCoachOpen(!coachOpen)}
        className="fixed bottom-6 right-6 z-[400] w-14 h-14 bg-gradient-to-r from-purple-700 to-[#ff510d] rounded-full shadow-2xl hover:shadow-purple-500/30 text-white flex items-center justify-center cursor-pointer hover:scale-110 active:scale-95 transition-all outline-none animate-bounce"
        style={{ animationDuration: '4s' }}
        title="Chat with Chrono-Coach"
      >
        <Bot className="w-7 h-7" />
        <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#8E1616] animate-ping" />
        <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#8E1616]" />
      </button>

      {/* Panel Overlays */}
      {activePanel === 'todo' && (
        <TodoListPanel userId={user.uid} onClose={() => setActivePanel(null)} />
      )}
      {activePanel === 'planner' && (
        <DailyPlannerPanel userId={user.uid} onClose={() => setActivePanel(null)} />
      )}
      {activePanel === 'motivation' && (
        <MotivationPanel onClose={() => setActivePanel(null)} />
      )}
      {activePanel === 'pomo' && (
        <PomodoroPanel onClose={() => setActivePanel(null)} />
      )}
      {activePanel === 'goals' && (
        <DailyGoalsPanel userId={user.uid} onClose={() => setActivePanel(null)} />
      )}
      {activePanel === 'calendar' && (
        <CalendarPanel onClose={() => setActivePanel(null)} />
      )}

      {/* Productivity Coach Side Drawer */}
      <ProductivityCoach 
        userId={user.uid} 
        isOpen={coachOpen} 
        onClose={() => setCoachOpen(false)} 
      />

      {/* Dismissable Voice Notice Banner */}
      {showVoiceNotice && (
        <div className="fixed bottom-4 left-4 z-[500] bg-black/90 text-white text-xs px-4 py-3 rounded-xl border border-white/10 flex items-center gap-3 max-w-xs shadow-2xl animate-fade-in">
          <span>🎤 Voice input works best in Chrome or Edge</span>
          <button 
            onClick={() => {
              setShowVoiceNotice(false);
              sessionStorage.setItem('voice_notice_dismissed', '1');
            }} 
            className="text-white/60 hover:text-white font-bold text-sm cursor-pointer ml-auto"
          >
            ✕
          </button>
        </div>
      )}

    </div>
  );
}

