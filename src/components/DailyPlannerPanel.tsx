import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { Sparkles, Save, Clock, HelpCircle, Calendar, AlertCircle } from 'lucide-react';
import { useGCal } from '../gcal/GCalContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import MicButton from './MicButton';

interface DailyPlannerPanelProps {
  userId: string;
  onClose: () => void;
}

const hours = Array.from({ length: 18 }, (_, idx) => `${6 + idx}:00 - ${7 + idx}:00`);

export default function DailyPlannerPanel({ userId, onClose }: DailyPlannerPanelProps) {
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  });

  const [plannerData, setPlannerData] = useState<{ [key: number]: string }>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;
    const local = localStorage.getItem(`planner_${todayStr}_${userId}`);
    return local ? JSON.parse(local) : {};
  });
  const [briefInput, setBriefInput] = useState('');
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const plannerMic = useSpeechRecognition({
    lang: 'en-IN',
    onResult: (text) => setBriefInput(prev => prev ? prev + ' ' + text : text)
  });

  const { isConnected, addEvent } = useGCal();
  const [syncing, setSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState('');

  const showSyncToast = (msg: string) => {
    setSyncToast(msg);
    setTimeout(() => setSyncToast(''), 4000);
  };

  const handleSyncToCalendar = async () => {
    if (!isConnected) {
      showSyncToast('⚠️ Connect Google Calendar first.');
      return;
    }
    const planToSync = plannerData;
    if (Object.keys(planToSync).length === 0) {
      showSyncToast('⚠️ Generate a plan first before syncing.');
      return;
    }

    setSyncing(true);
    let successCount = 0;
    const today = selectedDate;

    for (const [indexStr, val] of Object.entries(planToSync)) {
      const title = val as string;
      if (!title || !title.trim()) continue;
      const hourIndex = parseInt(indexStr);
      const actualHour = 6 + hourIndex; // slots start at 6am
      const startTime = `${String(actualHour).padStart(2, '0')}:00`;
      const endTime = `${String(actualHour + 1).padStart(2, '0')}:00`;

      // Extract raw title if it contains description like "Title (Description)"
      let eventTitle = title.trim();
      let eventDesc = '';
      const match = eventTitle.match(/^([^(]+)\s*\(([^)]+)\)$/);
      if (match) {
        eventTitle = match[1].trim();
        eventDesc = match[2].trim();
      }

      const result = await addEvent({
        title: eventTitle,
        date: today,
        startTime,
        endTime,
        description: eventDesc
      });
      if (result) successCount++;

      // Small delay to avoid hitting Calendar API rate limits
      await new Promise(r => setTimeout(r, 150));
    }

    showSyncToast(`📅 ${successCount} slots synced to Google Calendar!`);
    setSyncing(false);
  };

  // Fetch planner data from Firestore for the selected date
  useEffect(() => {
    // Immediate local load so that switching dates has zero latency
    const local = localStorage.getItem(`planner_${selectedDate}_${userId}`);
    if (local) {
      try {
        setPlannerData(JSON.parse(local));
      } catch (e) {}
    } else {
      setPlannerData({});
    }

    let isInitial = true;
    const docRef = doc(db, 'users', userId, 'planner', selectedDate);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const cloudData = docSnap.data() as { [key: number]: string };
        setPlannerData(cloudData);
        localStorage.setItem(`planner_${selectedDate}_${userId}`, JSON.stringify(cloudData));
      } else {
        // Fallback to local storage or clear it
        const localDataStr = localStorage.getItem(`planner_${selectedDate}_${userId}`);
        if (localDataStr && isInitial) {
          try {
            const localData = JSON.parse(localDataStr);
            if (Object.keys(localData).length > 0) {
              setPlannerData(localData);
              setDoc(docRef, localData).catch(err => {
                console.error("Failed to sync local planner to Firestore:", err);
              });
              isInitial = false;
              return;
            }
          } catch (e) {}
        }
        setPlannerData({});
      }
      isInitial = false;
    }, (err) => {
      console.error("Firestore loader error:", err);
      const localDataStr = localStorage.getItem(`planner_${selectedDate}_${userId}`);
      if (localDataStr) {
        try {
          setPlannerData(JSON.parse(localDataStr));
        } catch (e) {}
      }
    });

    return () => unsubscribe();
  }, [selectedDate, userId]);

  // Sync state changes with localStorage backup
  const saveToLocalStorage = (data: { [key: number]: string }) => {
    localStorage.setItem(`planner_${selectedDate}_${userId}`, JSON.stringify(data));
  };

  const handleSlotChange = async (index: number, val: string) => {
    const updated = { ...plannerData, [index]: val };
    setPlannerData(updated);
    saveToLocalStorage(updated);

    // Auto-save to Firestore on input change with a small debounce, or just let them save manually/auto-save
    try {
      await setDoc(doc(db, 'users', userId, 'planner', selectedDate), updated);
    } catch (e) {
      console.error("Auto-save Firestore error:", e);
    }
  };

  const handleManualSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    try {
      await setDoc(doc(db, 'users', userId, 'planner', selectedDate), plannerData);
      setMessage("✓ Planner saved successfully!");
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      console.error(err);
      setError("Failed to save schedule to Cloud. Local backup saved.");
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateDay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!briefInput.trim()) {
      setError("Please specify a brief about your tasks and focus today!");
      return;
    }

    plannerMic.stop();
    setGenerating(true);
    setError('');
    setMessage('');

    try {
      const response = await fetch('/api/generate-day', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          brief: briefInput.trim(),
          hours
        })
      });

      if (!response.ok) {
        throw new Error(`Schedule generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (result && Array.isArray(result.schedule)) {
        const newPlanner: { [key: number]: string } = {};
        
        result.schedule.forEach((block: { hourSlot: string; title: string; description: string }) => {
          // Find index matching hourSlot
          const idx = hours.findIndex(h => h === block.hourSlot);
          if (idx !== -1) {
            newPlanner[idx] = block.title ? `${block.title} (${block.description})` : '';
          }
        });

        setPlannerData(newPlanner);
        saveToLocalStorage(newPlanner);
        
        // Save to Firestore immediately
        await setDoc(doc(db, 'users', userId, 'planner', selectedDate), newPlanner);
        setBriefInput('');
        setMessage("✓ Hourly schedule successfully formulated by Gemini!");
      } else {
        throw new Error("Invalid schedule format from AI generator");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to generate AI schedule. Try again shortly.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#8E1616] p-6 md:p-10 overflow-y-auto flex flex-col font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h2 className="text-4xl md:text-6xl font-bold text-[#F5E8C7]">Plan Your Day</h2>
          <p className="text-[#F5E8C7]/60 text-sm mt-1">Design an actionable hourly roadmap so deadlines are never missed.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-3 rounded-lg border-2 border-yellow-400 bg-white text-black font-semibold text-sm outline-none cursor-pointer"
          />
          <button 
            onClick={onClose}
            className="bg-yellow-400 text-black font-semibold px-6 py-3.5 rounded-lg cursor-pointer transition-all active:scale-95 text-base shadow-lg"
          >
            Close
          </button>
        </div>
      </div>

      {/* Main Container Grid */}
      <div className="flex flex-col xl:flex-row gap-8 flex-1">
        {/* Left Section - AI Schedule Brief */}
        <div className="w-full xl:w-[35%] flex flex-col gap-6">
          <div className="bg-[#F5E8C7] rounded-2xl p-6 shadow-xl">
            <h3 className="text-2xl font-bold text-[#8E1616] mb-4 border-b-2 border-[#ffb082] pb-2 flex items-center gap-2">
              <Sparkles className="w-6 h-6 animate-pulse" />
              AI Schedule Generator
            </h3>
            <p className="text-[#8E1616]/75 text-sm mb-4 leading-relaxed">
              Stuck planning your day? Tell Gemini what's on your mind—exams, meal times, workouts, deadlines—and it will map out a healthy hourly balance of study, breaks, and personal commitments.
            </p>

            <form onSubmit={handleGenerateDay} className="flex flex-col gap-4">
              <div className="relative">
                <textarea 
                  placeholder="E.g., I have a history exam tomorrow, gym at 6pm, need to cook dinner, and must review 3 biology chapters..."
                  value={briefInput}
                  onChange={(e) => setBriefInput(e.target.value)}
                  disabled={generating}
                  className="w-full h-36 p-4 pr-12 text-base bg-[#ffb082]/20 border border-[#ffb082] rounded-lg outline-none text-[#8E1616] placeholder:text-[#8E1616]/40 focus:bg-[#ffb082]/30 resize-none leading-relaxed"
                />
                <div className="absolute right-3 bottom-3">
                  <MicButton
                    isListening={plannerMic.isListening}
                    isSupported={plannerMic.isSupported}
                    onToggle={() => plannerMic.isListening ? plannerMic.stop() : plannerMic.start()}
                    variant="lightBg"
                    size="md"
                  />
                </div>
              </div>

              {plannerMic.isListening && (
                <div className="flex items-center gap-2 text-red-600 text-xs font-semibold animate-pulse bg-red-100/85 p-2 rounded-lg">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-ping" />
                  <span>Listening... speak daily brief</span>
                </div>
              )}

              {plannerMic.error && (
                <div className="text-red-700 text-xs bg-red-100/90 border border-red-200 p-2.5 rounded-lg flex flex-col gap-1">
                  <span className="font-bold">🎤 Mic error:</span>
                  {plannerMic.error === 'not-allowed' ? (
                    <span>Microphone access denied. Please click the mic icon in your browser address bar to allow access.</span>
                  ) : (
                    <span>{plannerMic.error}</span>
                  )}
                </div>
              )}

              <button 
                type="submit"
                disabled={generating || !briefInput.trim()}
                className="w-full p-4 text-lg font-bold rounded-lg bg-[#8E1616] text-[#F5E8C7] flex items-center justify-center gap-2 cursor-pointer transition-all hover:bg-[#ff510d] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
              >
                <Sparkles className="w-5 h-5" />
                {generating ? 'Formulating Schedule...' : '✨ Generate My Day'}
              </button>

              {/* Show sync button only after a plan exists */}
              {isConnected && Object.keys(plannerData).some(k => plannerData[parseInt(k)]) && (
                <button
                  type="button"
                  onClick={handleSyncToCalendar}
                  disabled={syncing}
                  className="w-full p-4 text-lg font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50 shadow-md mt-3"
                >
                  <Calendar className="w-5 h-5" />
                  {syncing ? `⏳ Syncing...` : '📅 Sync Plan to Google Calendar'}
                </button>
              )}
            </form>
          </div>

          <div className="bg-[#F5E8C7]/15 border border-[#F5E8C7]/30 rounded-2xl p-6 text-[#F5E8C7] flex flex-col gap-3">
            <h4 className="text-lg font-bold text-yellow-400 flex items-center gap-1.5">
              <HelpCircle className="w-5 h-5" /> Quick Tips
            </h4>
            <ul className="list-disc list-inside space-y-2 text-sm leading-relaxed opacity-90">
              <li>Type directly in any block on the right to edit details manually.</li>
              <li>Changes are securely synchronized to your profile in real-time.</li>
              <li>Toggle dates at the top to plan ahead for tomorrow or review yesterday.</li>
            </ul>
          </div>
        </div>

        {/* Right Section - Hourly Scheduler */}
        <div className="w-full xl:w-[65%] bg-[#ff510d] rounded-2xl p-6 shadow-xl flex flex-col h-[75vh] xl:h-auto min-h-[500px]">
          <div className="flex justify-between items-center mb-4 border-b border-[#ffb082]/50 pb-2">
            <h3 className="text-2xl font-bold text-[#F5E8C7] flex items-center gap-2">
              <Clock className="w-6 h-6" /> Hourly Roadmap ({hours.length} slots)
            </h3>
            <button 
              onClick={handleManualSave}
              disabled={saving}
              className="bg-[#F5E8C7] text-[#8E1616] font-bold py-2.5 px-4 rounded-lg flex items-center gap-1.5 cursor-pointer hover:bg-white transition-all active:scale-95 shadow-sm"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Saving...' : 'Save Plan'}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-100 text-red-800 p-3 rounded-lg mb-4 text-sm font-semibold">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {message && (
            <div className="bg-green-100 text-green-800 p-3 rounded-lg mb-4 text-sm font-semibold">
              {message}
            </div>
          )}

          <div className="flex-1 overflow-y-auto space-y-3.5 pr-2">
            {hours.map((timeLabel, index) => (
              <div key={index} className="flex items-center gap-4 bg-[#ffb082] rounded-xl p-3 shadow-sm border border-orange-400/30">
                <div className="w-24 text-sm font-bold text-indigo-900 select-none flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 shrink-0 text-indigo-700" />
                  <span>{timeLabel.split(' ')[0]}</span>
                </div>
                <input 
                  type="text"
                  value={plannerData[index] || ''}
                  onChange={(e) => handleSlotChange(index, e.target.value)}
                  placeholder="No activities scheduled..."
                  className="flex-1 bg-white/75 rounded-lg py-2.5 px-4 text-base font-semibold text-[#8E1616] placeholder:text-[#8E1616]/30 outline-none focus:bg-white border-2 border-transparent focus:border-[#8E1616] transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {syncToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] bg-black/90 text-white px-6 py-3 rounded-full text-sm font-semibold shadow-2xl">
          {syncToast}
        </div>
      )}
    </div>
  );
}
