import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, updateDoc, writeBatch } from 'firebase/firestore';
import { Task } from '../types';
import { Sparkles, Calendar, CheckCircle, Trash2, AlertCircle } from 'lucide-react';
import { useGCal } from '../gcal/GCalContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import MicButton from './MicButton';

interface TodoListPanelProps {
  userId: string;
  onClose: () => void;
}

export default function TodoListPanel({ userId, onClose }: TodoListPanelProps) {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const local = localStorage.getItem(`tasks_${userId}`);
    return local ? JSON.parse(local) : [];
  });
  const [taskInput, setTaskInput] = useState('');
  const [details, setDetails] = useState('');
  const [imp, setImp] = useState(false);
  const [deadline, setDeadline] = useState('');
  const [prioritizing, setPrioritizing] = useState(false);
  const [error, setError] = useState('');

  const taskMic = useSpeechRecognition({
    lang: 'en-IN',
    onResult: (text) => setTaskInput(prev => prev ? prev + ' ' + text : text)
  });

  const detailsMic = useSpeechRecognition({
    lang: 'en-IN',
    onResult: (text) => setDetails(prev => prev ? prev + ' ' + text : text)
  });

  const handleMicToggle = (mic: ReturnType<typeof useSpeechRecognition>) => {
    if (mic.isListening) mic.stop();
    else mic.start();
  };

  const { isConnected, addEvent } = useGCal();
  const [calLoadingId, setCalLoadingId] = useState<string | null>(null);
  const [calToast, setCalToast] = useState('');

  const showCalToast = (msg: string) => {
    setCalToast(msg);
    setTimeout(() => setCalToast(''), 3500);
  };

  const handleAddTaskToCalendar = async (task: Task) => {
    if (!isConnected) {
      showCalToast('⚠️ Connect Google Calendar first — open the Calendar card.');
      return;
    }
    setCalLoadingId(task.id);

    // Ask the Express backend (Gemini) for a smart time suggestion
    try {
      const currentHour = new Date().getHours();
      const today = new Date().toISOString().split('T')[0];
      const targetDate = task.deadline || today;

      const res = await fetch('/api/suggest-task-time', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskName: task.task,
          details: task.details,
          deadline: task.deadline,
          currentHour,
          isImportant: task.imp
        })
      });

      if (!res.ok) throw new Error('Time suggestion failed');
      const suggestion = await res.json();

      const result = await addEvent({
        title: task.task,
        date: targetDate,
        startTime: suggestion.startTime,
        endTime: suggestion.endTime,
        description: `${task.details || ''}\n\nAI reasoning: ${suggestion.reason}`
      });

      if (result) {
        showCalToast(`📅 "${task.task}" added at ${suggestion.startTime} — ${suggestion.reason}`);
      } else {
        showCalToast('❌ Failed to add to Calendar. Check your connection.');
      }
    } catch (e: any) {
      console.error('Error adding task to calendar:', e);
      // Graceful fallback — add with a default 1hr block at next hour
      const nextHour = new Date().getHours() + 1;
      const startTime = `${String(nextHour).padStart(2, '0')}:00`;
      const endTime = `${String(nextHour + 1).padStart(2, '0')}:00`;
      const today = new Date().toISOString().split('T')[0];
      try {
        const result = await addEvent({ title: task.task, date: task.deadline || today, startTime, endTime });
        if (result) {
          showCalToast(`📅 "${task.task}" added to calendar.`);
        } else {
          showCalToast(`❌ Failed: ${e.message || 'Check your connection.'}`);
        }
      } catch (fallbackErr: any) {
        showCalToast(`❌ Error: ${fallbackErr.message || e.message || 'Check connection.'}`);
      }
    }

    setCalLoadingId(null);
  };

  // Fetch tasks in real-time from Firestore
  useEffect(() => {
    let isInitial = true;
    const q = query(
      collection(db, 'users', userId, 'tasks'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList: Task[] = [];
      snapshot.forEach((doc) => {
        taskList.push({ id: doc.id, ...doc.data() } as Task);
      });

      // Smart upload if cloud starts empty but we have local backup tasks
      if (snapshot.empty && isInitial) {
        const local = localStorage.getItem(`tasks_${userId}`);
        if (local) {
          try {
            const localTasks = JSON.parse(local) as Task[];
            if (localTasks.length > 0) {
              setTasks(localTasks);
              localTasks.forEach(async (t) => {
                const { id, ...data } = t;
                try {
                  await addDoc(collection(db, 'users', userId, 'tasks'), data);
                } catch (err) {
                  console.error("Failed to sync local task to Firestore:", err);
                }
              });
              isInitial = false;
              return;
            }
          } catch (e) {}
        }
      }

      setTasks(taskList);
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(taskList));
      isInitial = false;
    }, (err) => {
      console.error("Firestore loading error:", err);
      const local = localStorage.getItem(`tasks_${userId}`);
      if (local) {
        try {
          setTasks(JSON.parse(local));
        } catch (e) {}
      }
    });

    return () => unsubscribe();
  }, [userId]);

  // Sync with localstorage as backup
  useEffect(() => {
    localStorage.setItem(`tasks_${userId}`, JSON.stringify(tasks));
  }, [tasks, userId]);

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskInput.trim()) return;

    // Stop recording when task is submitted
    taskMic.stop();
    detailsMic.stop();

    const newTaskData = {
      task: taskInput.trim(),
      details: details.trim(),
      imp,
      deadline: deadline || "",
      completed: false,
      createdAt: new Date().toISOString(),
      aiReasoning: ""
    };

    try {
      await addDoc(collection(db, 'users', userId, 'tasks'), newTaskData);
      setTaskInput('');
      setDetails('');
      setImp(false);
      setDeadline('');
      setError('');
    } catch (err) {
      console.error("Failed to add task to Firestore, adding to state/local:", err);
      // State fallback handles it locally
      const mockId = Math.random().toString();
      setTasks(prev => [{ id: mockId, ...newTaskData }, ...prev]);
    }
  };

  const handleMarkComplete = async (taskId: string) => {
    // Instantly remove from local state for immediate user feedback
    setTasks(prev => {
      const updated = prev.filter(t => t.id !== taskId);
      localStorage.setItem(`tasks_${userId}`, JSON.stringify(updated));
      return updated;
    });

    try {
      await deleteDoc(doc(db, 'users', userId, 'tasks', taskId));
    } catch (err) {
      console.error("Failed to delete from Firestore:", err);
    }
  };

  const handleAiPrioritize = async () => {
    if (tasks.length === 0) {
      setError("Please add some tasks to prioritize first!");
      return;
    }

    setPrioritizing(true);
    setError('');

    try {
      const response = await fetch('/api/prioritize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ tasks })
      });

      if (!response.ok) {
        throw new Error(`Priority generation failed: ${response.statusText}`);
      }

      const result = await response.json();
      if (result && Array.isArray(result.prioritized)) {
        // We received prioritized ranks. Update in Firestore batch!
        const batch = writeBatch(db);
        
        result.prioritized.forEach((pItem: { taskName: string; reasoning: string }, index: number) => {
          // Find original task in our tasks state
          const original = tasks.find(t => t.task.toLowerCase() === pItem.taskName.toLowerCase());
          if (original) {
            const taskDocRef = doc(db, 'users', userId, 'tasks', original.id);
            batch.update(taskDocRef, {
              aiReasoning: pItem.reasoning,
              priorityOrder: index
            });
          }
        });

        await batch.commit();
      } else {
        throw new Error("Invalid format received from prioritization server");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to prioritize tasks. Please check your API configuration.");
    } finally {
      setPrioritizing(false);
    }
  };

  const sortedTasks = [...tasks].sort((a, b) => {
    const pA = a.priorityOrder !== undefined ? a.priorityOrder : Infinity;
    const pB = b.priorityOrder !== undefined ? b.priorityOrder : Infinity;
    if (pA !== pB) {
      return pA - pB;
    }
    const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <div className="fixed inset-0 z-[200] bg-[#8E1616] p-6 md:p-10 overflow-y-auto flex flex-col font-sans">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-4xl md:text-6xl font-bold text-[#F5E8C7]">Your Personalised Task List</h2>
        <button 
          onClick={onClose}
          className="bg-yellow-400 text-black font-semibold px-6 py-3.5 rounded-lg cursor-pointer transition-all active:scale-95 text-base shadow-lg"
        >
          Close
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 flex-1 mt-4">
        {/* Left column - Add Task Form */}
        <div className="w-full lg:w-1/3 bg-[#F5E8C7] rounded-2xl p-6 shadow-xl h-fit">
          <h3 className="text-2xl font-bold text-[#8E1616] mb-4 border-b-2 border-[#ffb082] pb-2">Add New Task</h3>
          <form onSubmit={handleAddTask} className="flex flex-col gap-4">
            <div>
              <label className="text-sm font-semibold text-[#8E1616] block mb-1">Task Title</label>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  placeholder="Enter Task Name"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  className="flex-1 p-3.5 text-lg bg-[#ffb082]/20 border border-[#ffb082] rounded-lg outline-none text-[#8E1616] placeholder:text-[#8E1616]/40 focus:bg-[#ffb082]/30"
                />
                <MicButton
                  isListening={taskMic.isListening}
                  isSupported={taskMic.isSupported}
                  onToggle={() => handleMicToggle(taskMic)}
                  variant="lightBg"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-[#8E1616] block mb-1">Details (Optional)</label>
              <div className="flex items-start gap-2">
                <textarea 
                  placeholder="Enter Details or Sub-tasks"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="flex-1 h-32 p-3.5 text-lg bg-[#ffb082]/20 border border-[#ffb082] rounded-lg outline-none text-[#8E1616] placeholder:text-[#8E1616]/40 focus:bg-[#ffb082]/30 resize-none"
                />
                <MicButton
                  isListening={detailsMic.isListening}
                  isSupported={detailsMic.isSupported}
                  onToggle={() => handleMicToggle(detailsMic)}
                  className="mt-1"
                  variant="lightBg"
                />
              </div>
            </div>

            {/* Visual feedback strip — shows when listening or when an error occurs */}
            {(taskMic.isListening || detailsMic.isListening) && (
              <div className="flex items-center gap-2 text-red-600 text-sm font-semibold animate-pulse bg-red-100/80 p-2 rounded-lg">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-ping" />
                <span>Listening... speak now (Indian-English accent optimized)</span>
              </div>
            )}

            {(taskMic.error || detailsMic.error) && (
              <div className="text-red-700 text-xs bg-red-100/90 border border-red-200 p-2.5 rounded-lg flex flex-col gap-1">
                <span className="font-bold">🎤 Microphone Error:</span>
                {(taskMic.error === 'not-allowed' || detailsMic.error === 'not-allowed') ? (
                  <span>Microphone access was denied. Please click the site settings/microphone icon in your browser address bar to allow access, or open the app in a new tab.</span>
                ) : (
                  <span>{taskMic.error || detailsMic.error}. Make sure you are using Chrome/Edge/Safari on HTTPS.</span>
                )}
              </div>
            )}

            <div className="flex items-center gap-3 py-1">
              <input 
                id="check-imp" 
                type="checkbox"
                checked={imp}
                onChange={(e) => setImp(e.target.checked)}
                className="w-5 h-5 cursor-pointer accent-[#8E1616]"
              />
              <label htmlFor="check-imp" className="text-lg font-medium text-[#8E1616] select-none cursor-pointer">
                Mark as Important
              </label>
            </div>

            <div className="flex flex-col gap-1">
              <label htmlFor="task-deadline" className="text-sm font-bold text-[#8E1616]">
                Deadline:
              </label>
              <input 
                id="task-deadline" 
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full p-3 bg-white border-2 border-[#ffb082] rounded-lg text-black outline-none focus:border-[#ff510d]"
              />
            </div>

            <button 
              type="submit"
              className="w-full p-4 mt-2 text-xl font-bold rounded-lg bg-[#8E1616] text-[#F5E8C7] cursor-pointer transition-all hover:bg-[#ff510d] hover:text-white active:scale-97 shadow-md"
            >
              Add Task
            </button>
          </form>
        </div>

        {/* Right column - Tasks List */}
        <div className="w-full lg:w-2/3 bg-[#F5E8C7] rounded-2xl p-6 shadow-xl flex flex-col lg:h-[720px] min-h-[550px]">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 pb-2 border-b-2 border-[#ffb082]">
            <h3 className="text-2xl font-bold text-[#8E1616]">Active Tasks ({tasks.length})</h3>
            
            <button 
              onClick={handleAiPrioritize}
              disabled={prioritizing || tasks.length === 0}
              className="w-full sm:w-auto bg-gradient-to-r from-purple-700 to-[#ff510d] text-white font-bold py-3 px-6 rounded-xl shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-98 transition-all"
            >
              <Sparkles className="w-5 h-5 animate-pulse" />
              {prioritizing ? '⏳ AI Prioritizing...' : '✨ AI Prioritize Tasks'}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-100 text-red-800 p-3 rounded-lg mb-4 text-sm font-semibold">
              <AlertCircle className="w-5 h-5" />
              {error}
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#8E1616]/60">
              <CheckCircle className="w-16 h-16 opacity-30 mb-2" />
              <p className="text-xl font-semibold">No tasks scheduled yet!</p>
              <p className="text-sm">Add some tasks on the left to start planning.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-3.5 overflow-y-auto pr-1">
              {sortedTasks.map((t) => (
                <div key={t.id} className="bg-[#ffb082] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 border-l-8 border-[#8E1616]">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="text-2xl font-bold text-[#8E1616] leading-tight">{t.task}</h5>
                      {t.imp && (
                        <span className="text-xs bg-red-600 text-white font-bold px-2.5 py-1 rounded-full uppercase tracking-wider animate-pulse">
                          Important
                        </span>
                      )}
                    </div>
                    {t.details && <p className="text-sm text-[#8E1616]/80 font-medium whitespace-pre-wrap">{t.details}</p>}
                    
                    {t.deadline && (
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-[#8E1616] bg-white/40 px-2 py-1 rounded-md w-fit mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Deadline: {t.deadline}</span>
                      </div>
                    )}

                    {t.aiReasoning && (
                      <div className="bg-purple-700/85 text-white p-3.5 rounded-xl border-l-4 border-amber-400 mt-2 shadow-inner text-sm font-medium">
                        <span className="font-bold flex items-center gap-1 text-[#ffbf64] text-xs uppercase tracking-wider mb-1">
                          <Sparkles className="w-3.5 h-3.5" /> AI Priority Reasoning
                        </span>
                        {t.aiReasoning}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button 
                      onClick={() => handleMarkComplete(t.id)}
                      className="flex items-center justify-center gap-1 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-lg font-bold cursor-pointer transition-all active:scale-95 shadow-sm"
                    >
                      <Trash2 className="w-5 h-5" />
                      Complete
                    </button>

                    <button
                      onClick={() => handleAddTaskToCalendar(t)}
                      disabled={calLoadingId === t.id}
                      className="flex items-center gap-1.5 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-base font-semibold cursor-pointer transition-all disabled:opacity-50 shadow-sm"
                    >
                      <Calendar className="w-4 h-4" />
                      {calLoadingId === t.id ? '⏳' : '+ Cal'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Toast for calendar feedback */}
      {calToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] bg-black/90 text-white px-6 py-3 rounded-full text-sm font-semibold shadow-2xl">
          {calToast}
        </div>
      )}
    </div>
  );
}
