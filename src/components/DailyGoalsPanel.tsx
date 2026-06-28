import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Goal, StreakData } from '../types';
import { Sparkles, Award, Flame, Star, CheckSquare, Plus, Trash2, Calendar, LayoutGrid, Heart } from 'lucide-react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import MicButton from './MicButton';

interface DailyGoalsPanelProps {
  userId: string;
  onClose: () => void;
}

const getLocalDateString = (dateObj: Date = new Date()) => {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function DailyGoalsPanel({ userId, onClose }: DailyGoalsPanelProps) {
  const todayStr = getLocalDateString();

  // Goals and Streaks State
  const [allTimeGoals, setAllTimeGoals] = useState<Goal[]>(() => {
    const local = localStorage.getItem(`goals_${userId}`);
    return local ? JSON.parse(local) : [];
  });
  const [goals, setGoals] = useState<Goal[]>(() => {
    const local = localStorage.getItem(`goals_${userId}`);
    if (local) {
      try {
        const all = JSON.parse(local) as Goal[];
        const today = getLocalDateString();
        return all.filter(g => g.date === today);
      } catch (e) {}
    }
    return [];
  });
  const [streak, setStreak] = useState<StreakData>({ current: 0, best: 0, lastDate: "" });
  const [points, setPoints] = useState(0);

  // Inputs State
  const [goalName, setGoalName] = useState('');
  const [category, setCategory] = useState<'Study' | 'Work' | 'Health' | 'Personal'>('Study');
  const [target, setTarget] = useState('');
  const [unit, setUnit] = useState('');

  const goalMic = useSpeechRecognition({
    lang: 'en-IN',
    onResult: (text) => setGoalName(prev => prev ? prev + ' ' + text : text)
  });

  // AI Suggestions State
  const [showAiSuggest, setShowAiSuggest] = useState(false);
  const [focusInput, setFocusInput] = useState('');
  const [deadlineInput, setDeadlineInput] = useState('');
  const [suggesting, setSuggesting] = useState(false);
  const [suggestions, setSuggestions] = useState<Array<{ name: string; category: 'Study' | 'Work' | 'Health' | 'Personal'; target: number; unit: string }>>([]);

  // Load Streak & Points
  useEffect(() => {
    // Load points
    const localPoints = localStorage.getItem(`points_${userId}`);
    if (localPoints) setPoints(parseInt(localPoints));

    // Load streak
    const localStreak = localStorage.getItem(`streak_${userId}`);
    if (localStreak) {
      const parsedStreak = JSON.parse(localStreak) as StreakData;
      setStreak(parsedStreak);
    } else {
      setStreak({ current: 0, best: 0, lastDate: "" });
    }
  }, [userId]);

  // Fetch all goals for the user in real-time
  useEffect(() => {
    let isInitial = true;
    const q = query(collection(db, 'users', userId, 'goals'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allList: Goal[] = [];
      snapshot.forEach((doc) => {
        allList.push({ id: doc.id, ...doc.data() } as Goal);
      });

      // Smart upload if cloud starts empty but we have local backup goals
      if (snapshot.empty && isInitial) {
        const local = localStorage.getItem(`goals_${userId}`);
        if (local) {
          try {
            const localGoals = JSON.parse(local) as Goal[];
            if (localGoals.length > 0) {
              setAllTimeGoals(localGoals);
              const todayList = localGoals.filter(g => g.date === todayStr);
              setGoals(todayList);
              localGoals.forEach(async (g) => {
                const { id, ...data } = g;
                try {
                  await addDoc(collection(db, 'users', userId, 'goals'), data);
                } catch (err) {
                  console.error("Failed to sync local goal to Firestore:", err);
                }
              });
              isInitial = false;
              return;
            }
          } catch (e) {}
        }
      }

      setAllTimeGoals(allList);
      
      // Filter today's goals
      const todayList = allList.filter(g => g.date === todayStr);
      setGoals(todayList);
      localStorage.setItem(`goals_${userId}`, JSON.stringify(allList));
      isInitial = false;
    }, (err) => {
      console.error("Firestore loading error:", err);
      const local = localStorage.getItem(`goals_${userId}`);
      if (local) {
        try {
          const all = JSON.parse(local) as Goal[];
          setAllTimeGoals(all);
          setGoals(all.filter(g => g.date === todayStr));
        } catch (e) {}
      }
    });

    return () => unsubscribe();
  }, [userId, todayStr]);

  // Handle streak progression on day transitions or completions
  useEffect(() => {
    if (!streak.lastDate) return;

    if (streak.lastDate !== todayStr) {
      // It's a new day! Verify if any goals were completed yesterday
      const yesterdayStr = getLocalDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));
      const yesterdayGoals = allTimeGoals.filter(g => g.date === yesterdayStr);
      const yesterdayCompleted = yesterdayGoals.filter(g => g.completed).length;

      let currentStreak = streak.current;
      if (yesterdayGoals.length > 0 && yesterdayCompleted === 0) {
        // Reset streak if goals existed yesterday but none completed
        currentStreak = 0;
      }

      // Check for larger day skips (e.g. over 1 day missed)
      const lastDateObj = new Date(streak.lastDate + 'T00:00:00');
      const todayObj = new Date(todayStr + 'T00:00:00');
      const diffDays = Math.round((todayObj.getTime() - lastDateObj.getTime()) / (1000 * 60 * 60 * 24));
      if (diffDays > 1) {
        currentStreak = 0;
      }

      const updatedStreak = {
        ...streak,
        current: currentStreak,
        lastDate: todayStr
      };
      setStreak(updatedStreak);
      localStorage.setItem(`streak_${userId}`, JSON.stringify(updatedStreak));
    }
  }, [allTimeGoals, todayStr, streak, userId]);

  const updatePoints = (newPoints: number) => {
    setPoints(newPoints);
    localStorage.setItem(`points_${userId}`, newPoints.toString());
  };

  const getLevel = (pts: number) => {
    if (pts >= 1000) return 'Platinum';
    if (pts >= 500) return 'Gold';
    if (pts >= 200) return 'Silver';
    return 'Bronze';
  };

  const handleAddGoal = async (name: string, cat: 'Study' | 'Work' | 'Health' | 'Personal', tar: number, unt: string) => {
    if (!name || isNaN(tar) || tar <= 0) return;

    const newGoalData = {
      name,
      category: cat,
      target: tar,
      current: 0,
      unit: unt || 'units',
      completed: false,
      date: todayStr
    };

    try {
      await addDoc(collection(db, 'users', userId, 'goals'), newGoalData);
    } catch (err) {
      console.error("Firestore add goal error:", err);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const tarNum = parseInt(target);
    if (!goalName.trim() || isNaN(tarNum) || tarNum <= 0) return;

    goalMic.stop();
    handleAddGoal(goalName.trim(), category, tarNum, unit.trim());
    setGoalName('');
    setTarget('');
    setUnit('');
  };

  const handleIncrement = async (goalId: string, currentVal: number, targetVal: number) => {
    const nextVal = currentVal + 1;
    const isCompleted = nextVal >= targetVal;

    try {
      const docRef = doc(db, 'users', userId, 'goals', goalId);
      await updateDoc(docRef, {
        current: nextVal,
        completed: isCompleted
      });

      if (isCompleted) {
        handleCompletionRewards();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleComplete = async (goalId: string, targetVal: number) => {
    try {
      const docRef = doc(db, 'users', userId, 'goals', goalId);
      await updateDoc(docRef, {
        current: targetVal,
        completed: true
      });
      handleCompletionRewards();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCompletionRewards = () => {
    // 10 pts per goal completed
    const nextPoints = points + 10;
    updatePoints(nextPoints);

    // If this is the first goal completed today, update streak
    const completedToday = goals.filter(g => g.completed).length;
    if (completedToday === 0) {
      const newCurrent = streak.current + 1;
      const newBest = Math.max(streak.best, newCurrent);
      const updatedStreak = {
        current: newCurrent,
        best: newBest,
        lastDate: todayStr
      };
      setStreak(updatedStreak);
      localStorage.setItem(`streak_${userId}`, JSON.stringify(updatedStreak));
    }
  };

  // 5C: Fetch AI suggested goals from Express API
  const handleFetchAiSuggestions = async () => {
    if (!focusInput.trim() || !deadlineInput.trim()) return;
    setSuggesting(true);
    setSuggestions([]);

    try {
      const res = await fetch('/api/suggest-goals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          focus: focusInput.trim(),
          deadlines: deadlineInput.trim()
        })
      });

      if (!res.ok) throw new Error("API suggested goals failed");
      const data = await res.json();
      if (data && Array.isArray(data.goals)) {
        setSuggestions(data.goals);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSuggesting(false);
    }
  };

  const handleAddAllSuggestions = async () => {
    const batch = writeBatch(db);
    
    suggestions.forEach(s => {
      const newDocRef = doc(collection(db, 'users', userId, 'goals'));
      batch.set(newDocRef, {
        name: s.name,
        category: s.category,
        target: s.target,
        current: 0,
        unit: s.unit,
        completed: false,
        date: todayStr
      });
    });

    try {
      await batch.commit();
      setSuggestions([]);
      setShowAiSuggest(false);
      setFocusInput('');
      setDeadlineInput('');
    } catch (err) {
      console.error("Batch save of suggestions failed:", err);
    }
  };

  // Generate 84-day Heatmap consistency grid arrays
  const heatmapDays = (() => {
    const dates: string[] = [];
    for (let i = 83; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dates.push(getLocalDateString(d));
    }
    return dates;
  })();

  const activeDaysCount = (() => {
    // Counts how many distinct days had at least 1 completed goal
    const datesWithCompleted = new Set<string>();
    allTimeGoals.forEach(g => {
      if (g.completed) datesWithCompleted.add(g.date);
    });
    return datesWithCompleted.size;
  })();

  const totalCompletedGoals = allTimeGoals.filter(g => g.completed).length;

  return (
    <div className="fixed inset-0 z-[200] bg-[#8E1616] p-6 md:p-10 overflow-y-auto flex flex-col font-sans">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl md:text-6xl font-bold text-[#F5E8C7]">Daily Goals</h1>
        <button 
          onClick={onClose}
          className="bg-yellow-400 text-black font-semibold px-6 py-3.5 rounded-lg cursor-pointer transition-all active:scale-95 text-base shadow-lg"
        >
          Close
        </button>
      </div>

      {/* Streak & Points Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 bg-[#F5E8C7] rounded-xl p-4 gap-4 mb-8 shadow-xl border border-yellow-300/20 select-none">
        <div className="flex items-center justify-center gap-3 text-2xl font-bold text-[#8E1616]">
          <Flame className="w-8 h-8 text-orange-500 animate-bounce" />
          <span>Streak: {streak.current} days</span>
        </div>
        <div className="flex items-center justify-center gap-3 text-2xl font-bold text-[#8E1616]">
          <Star className="w-8 h-8 text-yellow-500 fill-current animate-spin" style={{ animationDuration: '6s' }} />
          <span>Points: {points}</span>
        </div>
        <div className="flex items-center justify-center gap-3 text-2xl font-bold text-[#8E1616]">
          <Award className="w-8 h-8 text-indigo-700 animate-pulse" />
          <span>Level: {getLevel(points)}</span>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 flex-1">
        
        {/* Left Column: Form + Goals */}
        <div className="flex flex-col gap-6">
          
          {/* Add Daily Goal */}
          <div className="bg-[#F5E8C7] p-6 rounded-2xl shadow-xl">
            <h3 className="text-2xl font-bold text-[#8E1616] mb-4 border-b-2 border-[#ffb082] pb-1.5 flex items-center justify-between">
              <span>Add Daily Goal</span>
              
              {goals.length === 0 && (
                <button 
                  onClick={() => setShowAiSuggest(true)}
                  className="bg-gradient-to-r from-purple-700 to-[#ff510d] text-white text-xs font-bold py-2 px-4 rounded-lg flex items-center gap-1 cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-md"
                >
                  <Sparkles className="w-4 h-4" />
                  Suggest Goals for Me
                </button>
              )}
            </h3>

            <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <input 
                    type="text" 
                    placeholder="Goal Name (e.g., Read biology notes)" 
                    value={goalName}
                    onChange={(e) => setGoalName(e.target.value)}
                    className="flex-1 p-3.5 text-base border-2 border-[#ffb082] rounded-lg bg-white outline-none focus:border-[#ff510d] text-black"
                  />
                  <MicButton
                    isListening={goalMic.isListening}
                    isSupported={goalMic.isSupported}
                    onToggle={() => goalMic.isListening ? goalMic.stop() : goalMic.start()}
                    variant="lightBg"
                  />
                </div>
                {goalMic.isListening && (
                  <div className="flex items-center gap-2 text-red-600 text-xs font-semibold animate-pulse mt-1.5 bg-red-100/85 p-1 px-2 rounded w-fit">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                    <span>Listening... speak goal name</span>
                  </div>
                )}
                {goalMic.error && (
                  <div className="text-red-700 text-xs bg-red-100/90 border border-red-200 p-2 rounded-lg flex flex-col gap-1 mt-1.5 w-fit max-w-full">
                    <span className="font-bold">🎤 Mic error:</span>
                    {goalMic.error === 'not-allowed' ? (
                      <span>Microphone access was denied. Allow microphone access in browser settings, or open in a new tab.</span>
                    ) : (
                      <span>{goalMic.error}</span>
                    )}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-3">
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="p-3.5 text-sm border-2 border-[#ffb082] rounded-lg bg-white outline-none text-black cursor-pointer"
                >
                  <option value="Study">Study</option>
                  <option value="Work">Work</option>
                  <option value="Health">Health</option>
                  <option value="Personal">Personal</option>
                </select>
                <input 
                  type="number" 
                  placeholder="Target (e.g., 30)" 
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  className="p-3.5 text-sm border-2 border-[#ffb082] rounded-lg bg-white outline-none text-black"
                  min="1"
                />
                <input 
                  type="text" 
                  placeholder="Unit (e.g., pages)" 
                  value={unit}
                  onChange={(e) => setUnit(e.target.value)}
                  className="p-3.5 text-sm border-2 border-[#ffb082] rounded-lg bg-white outline-none text-black"
                />
              </div>
              <button 
                type="submit"
                className="bg-[#8E1616] hover:bg-[#ff510d] text-[#F5E8C7] text-lg font-bold p-3.5 rounded-lg transition-colors cursor-pointer active:scale-98 shadow-md"
              >
                Add Goal
              </button>
            </form>
          </div>

          {/* Today's Goals List */}
          <div className="bg-[#F5E8C7] p-6 rounded-2xl shadow-xl flex-1 min-h-[300px]">
            <h3 className="text-2xl font-bold text-[#8E1616] mb-4 border-b-2 border-[#ffb082] pb-1.5 flex items-center gap-1.5">
              <CheckSquare className="w-6 h-6" /> Today's Goals ({goals.length})
            </h3>

            {goals.length === 0 ? (
              <div className="text-center py-12 text-[#8E1616]/60 flex flex-col items-center justify-center gap-2">
                <LayoutGrid className="w-12 h-12 opacity-30 animate-pulse" />
                <p className="text-lg font-semibold">No goals set for today yet.</p>
                <p className="text-xs">Add one above or ask Gemini for high-quality recommendations!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-4 max-h-[45vh] overflow-y-auto pr-1">
                {goals.map((goal) => {
                  const percent = Math.min(100, Math.round((goal.current / goal.target) * 100));
                  return (
                    <div 
                      key={goal.id} 
                      className={`p-4 bg-white rounded-xl shadow-sm border-l-8 transition-all flex flex-col gap-2 relative ${
                        goal.completed ? 'opacity-65 bg-gray-100 border-l-gray-400' : 
                        goal.category === 'Study' ? 'border-l-[#ff510d]' :
                        goal.category === 'Work' ? 'border-l-[#8E1616]' :
                        goal.category === 'Health' ? 'border-l-green-600' : 'border-l-[#ffbf64]'
                      }`}
                    >
                      <div className="flex justify-between items-center select-none">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase tracking-wider text-white ${
                          goal.category === 'Study' ? 'bg-[#ff510d]' :
                          goal.category === 'Work' ? 'bg-[#8E1616]' :
                          goal.category === 'Health' ? 'bg-green-600' : 'bg-amber-500 text-black'
                        }`}>
                          {goal.category}
                        </span>
                        
                        {!goal.completed ? (
                          <div className="flex gap-2.5">
                            <button 
                              onClick={() => handleIncrement(goal.id, goal.current, goal.target)}
                              className="w-8 h-8 bg-[#ffb082]/30 hover:bg-[#ffb082] text-[#8E1616] font-bold rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-all text-xs"
                            >
                              +1
                            </button>
                            <button 
                              onClick={() => handleComplete(goal.id, goal.target)}
                              className="w-8 h-8 bg-green-100 hover:bg-green-200 text-green-700 font-bold rounded-full flex items-center justify-center cursor-pointer active:scale-95 transition-all text-xs"
                            >
                              ✓
                            </button>
                          </div>
                        ) : (
                          <span className="text-green-600 font-bold text-sm tracking-wide flex items-center gap-1.5 select-none">
                            ✓ Achieved
                          </span>
                        )}
                      </div>

                      <div>
                        <h4 className={`text-xl font-bold leading-tight ${goal.completed ? 'line-through text-gray-500' : 'text-[#333]'}`}>{goal.name}</h4>
                        <div className="flex justify-between text-xs font-semibold text-gray-500 mt-1 select-none font-mono">
                          <span>Achieved</span>
                          <span>{goal.current} / {goal.target} {goal.unit} ({percent}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden mt-1.5 select-none">
                          <div 
                            className={`h-full transition-all duration-300 ${goal.completed ? 'bg-gray-400' : 'bg-[#ff510d]'}`}
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Heatmap + Stats */}
        <div className="flex flex-col gap-6">
          
          {/* Consistency Heatmap */}
          <div className="bg-[#F5E8C7] p-6 rounded-2xl shadow-xl">
            <h3 className="text-2xl font-bold text-[#8E1616] mb-3 border-b-2 border-[#ffb082] pb-1 flex items-center gap-1.5 select-none">
              <Calendar className="w-6 h-6" /> Consistency Heatmap
            </h3>

            {/* Grid display */}
            <div className="flex flex-col gap-1 select-none">
              <div className="flex justify-between px-1 text-[11px] font-bold text-[#8E1616] mb-1 font-mono">
                {Array.from({ length: 6 }, (_, i) => {
                  const d = new Date();
                  d.setDate(d.getDate() - (84 - i * 14));
                  return <div key={i} className="text-xs text-[#F5E8C7]/40">
                    {d.toLocaleString('default', { month: 'short' })}
                  </div>;
                })}
              </div>

              <div className="flex gap-2">
                <div className="flex flex-col justify-between py-1 text-[10px] font-bold text-[#8E1616] font-mono h-[110px]">
                  <div>M</div><div>W</div><div>F</div><div>S</div>
                </div>

                <div className="grid grid-cols-12 grid-rows-7 gap-1 w-full h-[110px] flex-1">
                  {heatmapDays.map((dateStr) => {
                    const dayGoals = allTimeGoals.filter(g => g.date === dateStr);
                    const completed = dayGoals.filter(g => g.completed).length;
                    const total = dayGoals.length;
                    const ratio = total > 0 ? (completed / total) : 0;
                    
                    let bgClass = 'bg-white/10 border border-black/10'; // 0
                    if (total > 0) {
                      if (ratio >= 1.0) bgClass = 'bg-[#8E1616]'; // 4
                      else if (ratio >= 0.67) bgClass = 'bg-[#ff510d]'; // 3
                      else if (ratio >= 0.34) bgClass = 'bg-[#ffbf64]'; // 2
                      else bgClass = 'bg-[#ffb082]'; // 1
                    }

                    return (
                      <div 
                        key={dateStr}
                        className={`w-full h-full rounded-sm relative group cursor-pointer hover:scale-125 transition-transform ${bgClass}`}
                      >
                        {/* Tooltip */}
                        <div className="absolute bottom-[125%] left-1/2 -translate-x-1/2 bg-black/85 text-white font-semibold text-[10px] p-2 rounded-md shadow-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-250 select-none z-50 whitespace-nowrap leading-tight">
                          {dateStr}: {completed}/{total} goals
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end items-center gap-1 text-[10px] text-[#8E1616] font-bold font-mono mt-3">
                <span>Less</span>
                <div className="w-3 h-3 bg-white/10 border border-black/10 rounded-sm" />
                <div className="w-3 h-3 bg-[#ffb082] rounded-sm" />
                <div className="w-3 h-3 bg-[#ffbf64] rounded-sm" />
                <div className="w-3 h-3 bg-[#ff510d] rounded-sm" />
                <div className="w-3 h-3 bg-[#8E1616] rounded-sm" />
                <span>More</span>
              </div>
            </div>
          </div>

          {/* Stats Panel */}
          <div className="bg-[#F5E8C7] p-6 rounded-2xl shadow-xl flex-1">
            <h3 className="text-2xl font-bold text-[#8E1616] mb-4 border-b-2 border-[#ffb082] pb-1 select-none">
              Stats Overview
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 hover:translate-y-[-2px] transition-transform">
                <span className="text-3xl select-none">🔥</span>
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 font-sans">Best Streak</div>
                  <div className="text-xl font-bold text-[#8E1616]">{streak.best} days</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 hover:translate-y-[-2px] transition-transform">
                <span className="text-3xl select-none">✅</span>
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 font-sans">Total Completed</div>
                  <div className="text-xl font-bold text-[#8E1616]">{totalCompletedGoals}</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 hover:translate-y-[-2px] transition-transform">
                <span className="text-3xl select-none">📅</span>
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 font-sans">Active Days</div>
                  <div className="text-xl font-bold text-[#8E1616]">{activeDaysCount}</div>
                </div>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm flex items-center gap-3 hover:translate-y-[-2px] transition-transform">
                <span className="text-3xl select-none">🏆</span>
                <div>
                  <div className="text-[11px] font-semibold text-gray-500 font-sans">Current Level</div>
                  <div className="text-xl font-bold text-[#8E1616]">{getLevel(points)}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Suggest Goals Modal Dialog */}
      {showAiSuggest && (
        <div className="fixed inset-0 z-[300] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#F5E8C7] border-2 border-[#ffb082] rounded-[24px] p-6 md:p-8 w-full max-w-[500px] shadow-2xl relative">
            <h3 className="text-2xl md:text-3xl font-bold text-[#8E1616] mb-2 flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-700 animate-pulse" />
              Chrono Goal suggestions
            </h3>
            <p className="text-sm text-[#8E1616]/75 mb-4 leading-relaxed">
              Answer 2 quick questions to let Gemini formulate daily goals custom-tailored to your priorities.
            </p>

            {suggestions.length === 0 ? (
              <div className="flex flex-col gap-4">
                <div>
                  <label className="text-xs font-bold text-[#8E1616] block mb-1">1. What's your primary focus today?</label>
                  <input 
                    type="text" 
                    placeholder="E.g., Finish my chemistry labs, study coding" 
                    value={focusInput}
                    onChange={(e) => setFocusInput(e.target.value)}
                    disabled={suggesting}
                    className="w-full p-3 border border-[#ffb082] rounded-lg text-black outline-none bg-white text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-[#8E1616] block mb-1">2. Any major deadlines or upcoming tests?</label>
                  <input 
                    type="text" 
                    placeholder="E.g., Lab report due tomorrow, math test on Friday" 
                    value={deadlineInput}
                    onChange={(e) => setDeadlineInput(e.target.value)}
                    disabled={suggesting}
                    className="w-full p-3 border border-[#ffb082] rounded-lg text-black outline-none bg-white text-sm"
                  />
                </div>

                <div className="flex gap-3 mt-2 justify-end">
                  <button 
                    type="button" 
                    onClick={() => setShowAiSuggest(false)}
                    className="px-4 py-2 text-sm bg-gray-300 hover:bg-gray-400 text-black font-semibold rounded-lg cursor-pointer transition-all active:scale-95"
                  >
                    Cancel
                  </button>
                  <button 
                    type="button" 
                    onClick={handleFetchAiSuggestions}
                    disabled={suggesting || !focusInput.trim() || !deadlineInput.trim()}
                    className="px-5 py-2.5 text-sm bg-purple-700 hover:bg-purple-600 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <Sparkles className="w-4 h-4" />
                    {suggesting ? 'Formulating...' : 'Generate Goals'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <h4 className="font-bold text-sm text-[#8E1616]">We suggest these {suggestions.length} goals for today:</h4>
                <div className="flex flex-col gap-2.5 max-h-[35vh] overflow-y-auto pr-1">
                  {suggestions.map((s, idx) => (
                    <div key={idx} className="bg-white/80 p-3 rounded-lg border-l-4 border-purple-600 flex flex-col gap-1">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-extrabold uppercase bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                          {s.category}
                        </span>
                        <span className="text-xs font-semibold text-gray-500">
                          Target: {s.target} {s.unit}
                        </span>
                      </div>
                      <p className="font-semibold text-sm text-gray-800 leading-tight">{s.name}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 justify-end mt-2">
                  <button 
                    type="button" 
                    onClick={() => setSuggestions([])}
                    className="px-4 py-2 text-sm bg-gray-300 hover:bg-gray-400 text-black font-semibold rounded-lg cursor-pointer"
                  >
                    Back
                  </button>
                  <button 
                    type="button" 
                    onClick={handleAddAllSuggestions}
                    className="px-5 py-2.5 text-sm bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg cursor-pointer flex items-center gap-1.5 shadow-md"
                  >
                    <Plus className="w-4 h-4" />
                    Accept & Import All Goals
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
