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
import VoiceNotesPanel from './components/VoiceNotesPanel';

// Import Hooks
import { useNotifications } from './hooks/useNotifications';
import { useTaskReminders } from './hooks/useTaskReminders';

// Import Icons
import { Bot, LogOut, Sparkles, Bell, BellOff, Mic, Volume2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<'todo' | 'planner' | 'motivation' | 'pomo' | 'goals' | 'calendar' | 'voicenotes' | null>(null);
  const [currentThemeIndex, setCurrentThemeIndex] = useState(() => {
    const local = localStorage.getItem('hero_theme_idx');
    return local ? parseInt(local) : 0;
  });
  const [coachOpen, setCoachOpen] = useState(false);
  const [logoError, setLogoError] = useState(false);
  const [showVoiceNotice, setShowVoiceNotice] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);

  // Monitor Auth State Changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Notifications integration
  const { permission, requestPermission, notify } = useNotifications();
  useTaskReminders({ userId: user?.uid || '', onNotify: notify });

  const handleNotificationToggle = async () => {
    if (permission === 'granted') {
      alert('🔔 Notifications are already enabled.');
      return;
    }
    const result = await requestPermission();
    if (result === 'granted') {
      notify('Chrono Notifications Enabled', "You'll be reminded before your task deadlines!");
    } else {
      alert('⚠️ Notifications blocked. Please enable them in your browser settings to receive alerts.');
    }
  };

  // Check browser speech recognition support once per session
  useEffect(() => {
    const supported = 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window;
    const dismissed = sessionStorage.getItem('voice_notice_dismissed');
    if (!supported && !dismissed) {
      setShowVoiceNotice(true);
    }
  }, []);

  // Auto show notification prompt after successful login if default permission
  useEffect(() => {
    if (!user) return;
    const dismissed = localStorage.getItem('chrono_notif_prompt_dismissed');
    if (permission === 'default' && !dismissed) {
      const timer = setTimeout(() => {
        setShowNotifPrompt(true);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [user, permission]);

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
      <nav className="mx-3 sm:mx-10 my-3 sm:my-4 py-3 sm:py-0 sm:h-[70px] bg-black/75 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg flex flex-col sm:flex-row justify-between items-center px-4 sm:px-6 md:px-10 gap-3 select-none">
        {/* Logo block */}
        <div className="flex items-center gap-3">
          {logoError ? (
            <svg viewBox="0 0 100 100" className="h-9 w-9 sm:h-11 sm:w-11 drop-shadow-[0_2px_8px_rgba(255,81,13,0.3)]">
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

              {/* Eyelashes */}
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
              className="h-9 w-9 sm:h-11 sm:w-11 object-cover rounded-full drop-shadow-[0_2px_8px_rgba(255,81,13,0.3)] border border-orange-500/30"
              referrerPolicy="no-referrer"
              onError={() => setLogoError(true)}
            />
          )}
          <span className="text-xl sm:text-2xl font-bold text-[#F5E8C7] tracking-wider font-sans">Chrono</span>
        </div>

        {/* User Greeting & controls */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap justify-center">
          <span className="hidden md:inline-block text-sm font-medium text-[#F5E8C7]/65">
            Hi, {displayName} 👋
          </span>
          <button
            type="button"
            onClick={handleNotificationToggle}
            className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
              permission === 'granted' 
                ? 'bg-green-500/10 border-green-500/30 text-green-400' 
                : 'bg-white/5 border-white/10 text-[#F5E8C7]/60 hover:text-[#F5E8C7]'
            }`}
            title={permission === 'granted' ? 'Reminders On' : 'Enable Reminders'}
          >
            {permission === 'granted' ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
          </button>
          <button 
            type="button" 
            onClick={handleThemeChange}
            className="text-xs font-semibold text-[#F5E8C7] border-2 border-[#F5E8C7] py-1.5 sm:py-2 px-3 sm:px-4 rounded-full cursor-pointer hover:bg-[#F5E8C7] hover:text-[#8E1616] transition-all shadow-sm"
          >
            Change Theme
          </button>
          <button 
            type="button" 
            onClick={handleLogout}
            className="text-xs font-semibold text-[#F5E8C7] border border-[#F5E8C7]/35 py-1.5 sm:py-2 px-3 sm:px-4 rounded-full cursor-pointer hover:bg-white/10 transition-all flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" />
            Logout
          </button>
        </div>
      </nav>

      {/* Live Widgets & Time Info */}
      <HeroBanner currentThemeIndex={currentThemeIndex} onThemeChange={handleThemeChange} />

      {/* Bento Grid Category Cards */}
      <section className="allElems w-full p-4 sm:p-6 md:p-10 pt-2 sm:pt-4 flex flex-wrap items-start justify-center gap-3 sm:gap-6 relative select-none">
        
        {/* Card 1: To Do List */}
        <div 
          onClick={() => setActivePanel('todo')}
          className="elem bg-[#ffbf64] h-[170px] sm:h-[380px] w-[calc(50%-6px)] sm:w-[270px] text-xl sm:text-3xl rounded-xl overflow-hidden relative cursor-pointer hover:scale-[1.03] transition-transform shadow-[0_4px_15px_rgba(255,81,13,0.25)] flex flex-col justify-end"
        >
          <img 
            src="https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=400" 
            alt="To Do List Illustration" 
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
          <h2 className="relative z-10 p-3 sm:p-5 font-bold text-lg sm:text-3xl text-[#F5E8C7] drop-shadow-md flex flex-col">
            <span className="text-[9px] sm:text-xs text-[#ffbf64] font-semibold tracking-widest uppercase mb-0.5 sm:mb-1 font-mono">productivity list</span>
            To Do List
          </h2>
        </div>

        {/* Card 2: Daily Planner */}
        <div 
          onClick={() => setActivePanel('planner')}
          className="elem bg-[#ffbf64] h-[170px] sm:h-[380px] w-[calc(50%-6px)] sm:w-[270px] text-xl sm:text-3xl rounded-xl overflow-hidden relative cursor-pointer hover:scale-[1.03] transition-transform shadow-[0_4px_15px_rgba(255,81,13,0.25)] flex flex-col justify-end"
        >
          <img 
            src="https://images.unsplash.com/photo-1506784983877-45594efa4cbe?w=400" 
            alt="Daily Planner Illustration" 
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
          <h2 className="relative z-10 p-3 sm:p-5 font-bold text-lg sm:text-3xl text-[#F5E8C7] drop-shadow-md flex flex-col">
            <span className="text-[9px] sm:text-xs text-[#ffbf64] font-semibold tracking-widest uppercase mb-0.5 sm:mb-1 font-mono">hourly timeline</span>
            Daily Planner
          </h2>
        </div>

        {/* Card 3: Motivation */}
        <div 
          onClick={() => setActivePanel('motivation')}
          className="elem bg-[#ffbf64] h-[170px] sm:h-[380px] w-[calc(50%-6px)] sm:w-[270px] text-xl sm:text-3xl rounded-xl overflow-hidden relative cursor-pointer hover:scale-[1.03] transition-transform shadow-[0_4px_15px_rgba(255,81,13,0.25)] flex flex-col justify-end"
        >
          <img 
            src="https://images.unsplash.com/photo-1519834785169-98be25ec3f84?w=400" 
            alt="Motivation Illustration" 
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
          <h2 className="relative z-10 p-3 sm:p-5 font-bold text-lg sm:text-3xl text-[#F5E8C7] drop-shadow-md flex flex-col">
            <span className="text-[9px] sm:text-xs text-[#ffbf64] font-semibold tracking-widest uppercase mb-0.5 sm:mb-1 font-mono">daily quotes</span>
            Motivation
          </h2>
        </div>

        {/* Card 4: Pomodoro Timer */}
        <div 
          onClick={() => setActivePanel('pomo')}
          className="elem bg-[#ffbf64] h-[170px] sm:h-[380px] w-[calc(50%-6px)] sm:w-[270px] text-xl sm:text-3xl rounded-xl overflow-hidden relative cursor-pointer hover:scale-[1.03] transition-transform shadow-[0_4px_15px_rgba(255,81,13,0.25)] flex flex-col justify-end"
        >
          <img 
            src="https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400" 
            alt="Pomodoro Timer Illustration" 
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
          <h2 className="relative z-10 p-3 sm:p-5 font-bold text-lg sm:text-3xl text-[#F5E8C7] drop-shadow-md flex flex-col">
            <span className="text-[9px] sm:text-xs text-[#ffbf64] font-semibold tracking-widest uppercase mb-0.5 sm:mb-1 font-mono">focus loop</span>
            Pomodoro Timer
          </h2>
        </div>

        {/* Card 5: Daily Goals */}
        <div 
          onClick={() => setActivePanel('goals')}
          className="elem bg-[#ffbf64] h-[170px] sm:h-[380px] w-[calc(50%-6px)] sm:w-[270px] text-xl sm:text-3xl rounded-xl overflow-hidden relative cursor-pointer hover:scale-[1.03] transition-transform shadow-[0_4px_15px_rgba(255,81,13,0.25)] flex flex-col justify-end"
        >
          <img 
            src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=400" 
            alt="Daily Goals Illustration" 
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
          <h2 className="relative z-10 p-3 sm:p-5 font-bold text-lg sm:text-3xl text-[#F5E8C7] drop-shadow-md flex flex-col">
            <span className="text-[9px] sm:text-xs text-[#ffbf64] font-semibold tracking-widest uppercase mb-0.5 sm:mb-1 font-mono">gamified stats</span>
            Daily Goals
          </h2>
        </div>

        {/* Card 6: Google Calendar */}
        <div
          onClick={() => setActivePanel('calendar')}
          className="elem bg-[#ffbf64] h-[170px] sm:h-[380px] w-[calc(50%-6px)] sm:w-[270px] text-xl sm:text-3xl rounded-xl overflow-hidden relative cursor-pointer hover:scale-[1.03] transition-transform shadow-[0_4px_15px_rgba(255,81,13,0.25)] flex flex-col justify-end"
        >
          <img
            src="https://play-lh.googleusercontent.com/vEoqLbT_QkYcEaawWBRc22N6i98OUtOUpM1LmKdVs_xx7lCsUyFfV0ZiqoUXjMijUteiBhhN4K5MpoF96FRNOg=w600-h300-pc0xffffff-pd"
            alt="Calendar"
            className="absolute inset-0 w-full h-full object-cover opacity-80"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
          <h2 className="relative z-10 p-3 sm:p-5 font-bold text-lg sm:text-3xl text-[#F5E8C7] drop-shadow-md flex flex-col">
            <span className="text-[9px] sm:text-xs text-[#ffbf64] font-semibold tracking-widest uppercase mb-0.5 sm:mb-1 font-mono">sync events</span>
            Google Calendar
          </h2>
        </div>

        {/* Card 7: Voice Notes */}
        <div 
          onClick={() => setActivePanel('voicenotes')}
          className="elem bg-[#ff510d] h-[170px] sm:h-[380px] w-[calc(50%-6px)] sm:w-[270px] text-xl sm:text-3xl rounded-xl overflow-hidden relative cursor-pointer hover:scale-[1.03] transition-transform shadow-[0_4px_15px_rgba(255,81,13,0.25)] flex flex-col justify-end"
        >
          <img 
            src="https://images.unsplash.com/photo-1478737270239-2f02b77fc618?w=400" 
            alt="Voice Recorder Background" 
            className="absolute inset-0 w-full h-full object-cover opacity-70"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />
          <h2 className="relative z-10 p-3 sm:p-5 font-bold text-lg sm:text-3xl text-[#F5E8C7] drop-shadow-md flex flex-col">
            <span className="text-[9px] sm:text-xs text-[#ffbf64] font-semibold tracking-widest uppercase mb-0.5 sm:mb-1 font-mono">audio journaling</span>
            Voice Notes
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
      {activePanel === 'voicenotes' && (
        <VoiceNotesPanel userId={user.uid} onClose={() => setActivePanel(null)} />
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
            type="button"
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

      {/* Gentle Notifications Prompt Banner */}
      {showNotifPrompt && (
        <div className="fixed bottom-24 sm:bottom-6 right-4 sm:right-24 sm:max-w-sm z-[500] bg-black/90 text-white p-4 rounded-xl border border-white/10 shadow-2xl flex items-start gap-3 animate-fade-in">
          <Bell className="w-5 h-5 text-[#ffbf64] flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[#F5E8C7]">Never Miss a Deadline</p>
            <p className="text-xs text-white/60 mt-1">Enable desktop reminders to get notified with a beep sound when task deadlines approach.</p>
            <div className="flex gap-2 mt-3">
              <button 
                type="button"
                onClick={() => { 
                  handleNotificationToggle(); 
                  setShowNotifPrompt(false); 
                }} 
                className="text-xs bg-[#ff510d] text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-[#ff6224] transition-colors cursor-pointer"
              >
                Enable Reminders
              </button>
              <button 
                type="button"
                onClick={() => { 
                  setShowNotifPrompt(false); 
                  localStorage.setItem('chrono_notif_prompt_dismissed', '1'); 
                }} 
                className="text-xs text-white/50 px-3 py-1.5 hover:text-white transition-colors cursor-pointer"
              >
                Not Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
