import React, { useState, useEffect } from 'react';
import { useGCal, GCalEvent } from '../gcal/GCalContext';
import { Calendar, Wifi, WifiOff, Plus, RefreshCw, Clock, MapPin } from 'lucide-react';

interface CalendarPanelProps {
  onClose: () => void;
}

function formatEventTime(event: GCalEvent): string {
  if (event.start.dateTime) {
    return new Date(event.start.dateTime).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  }
  return 'All day';
}

function formatEventDate(event: GCalEvent): string {
  const dateStr = event.start.dateTime || event.start.date || '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
}

export default function CalendarPanel({ onClose }: CalendarPanelProps) {
  const { isConnected, connect, disconnect, fetchTodayEvents, fetchUpcomingEvents, addEvent } = useGCal();

  const [todayEvents, setTodayEvents] = useState<GCalEvent[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<GCalEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [addLoading, setAddLoading] = useState(false);
  const [toast, setToast] = useState('');

  // Quick Add form state
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0]);
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  const loadEvents = async () => {
    if (!isConnected) return;
    setLoading(true);
    try {
      const [today, upcoming] = await Promise.all([fetchTodayEvents(), fetchUpcomingEvents(7)]);
      setTodayEvents(today);
      setUpcomingEvents(upcoming);
    } catch (err) {
      console.error('Error loading events:', err);
      showToast('⚠️ Session expired or error fetching events.');
    } finally {
      setLoading(false);
    }
  };

  // Load events when connected or panel opens
  useEffect(() => {
    if (isConnected) loadEvents();
  }, [isConnected]);

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate || !newStart || !newEnd) {
      showToast('❌ Please fill in all fields.');
      return;
    }
    if (newStart >= newEnd) {
      showToast('❌ End time must be after start time.');
      return;
    }
    setAddLoading(true);
    try {
      const result = await addEvent({ title: newTitle, date: newDate, startTime: newStart, endTime: newEnd });
      if (result) {
        showToast(`✅ "${newTitle}" added to Google Calendar!`);
        setNewTitle('');
        setNewStart('');
        setNewEnd('');
        loadEvents(); // Refresh event lists
      } else {
        showToast('❌ Failed to add event. Try reconnecting.');
      }
    } catch (err: any) {
      console.error('Error in handleQuickAdd:', err);
      showToast(`❌ Error: ${err.message || 'Failed to add event.'}`);
    }
    setAddLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#8E1616] p-6 md:p-10 overflow-y-auto flex flex-col font-sans select-none">

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-4xl md:text-6xl font-bold text-[#F5E8C7] flex items-center gap-3">
            <Calendar className="w-10 h-10 text-[#ffbf64]" />
            Google Calendar
          </h2>
          <p className="text-[#F5E8C7]/60 text-sm mt-1">
            Sync your schedule and never miss a deadline.
          </p>
        </div>
        <button onClick={onClose} className="bg-[#EBFD3F] hover:bg-[#d9ec2f] text-black font-bold px-7 py-3 rounded-xl cursor-pointer transition-all active:scale-95 text-base shadow-lg">
          Close
        </button>
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] bg-black/90 text-white px-6 py-3 rounded-full text-sm font-semibold shadow-2xl border border-white/10 animate-fade-in">
          {toast}
        </div>
      )}

      {/* Connection Status Strip */}
      <div className="flex flex-wrap items-center gap-4 bg-white/5 border border-white/10 rounded-2xl p-5 mb-8">
        <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-400 shadow-[0_0_8px_#4ade80]' : 'bg-gray-500'}`} />
        <span className="text-[#F5E8C7] font-semibold flex-1">
          {isConnected ? 'Connected to Google Calendar' : 'Not connected — click below to link your Google account'}
        </span>
        {!isConnected ? (
          <button
            onClick={connect}
            className="flex items-center gap-2 bg-white text-gray-800 font-bold px-5 py-2.5 rounded-xl cursor-pointer hover:-translate-y-0.5 transition-all shadow-md"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-5 w-5" />
            Connect Google Calendar
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              onClick={loadEvents}
              disabled={loading}
              className="flex items-center gap-1.5 bg-[#F5E8C7]/10 hover:bg-[#F5E8C7]/20 text-[#F5E8C7] font-semibold px-4 py-2 rounded-lg cursor-pointer transition-all text-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={disconnect}
              className="text-red-400 border border-red-400/40 hover:bg-red-400/10 font-semibold px-4 py-2 rounded-lg cursor-pointer transition-all text-sm"
            >
              Disconnect
            </button>
          </div>
        )}
      </div>

      {!isConnected ? (
        /* Not connected — show friendly prompt */
        <div className="flex-1 flex flex-col items-center justify-center text-center py-16 gap-4">
          <WifiOff className="w-20 h-20 text-[#F5E8C7]/20" />
          <h3 className="text-2xl font-bold text-[#F5E8C7]/60">Connect your Google Calendar</h3>
          <p className="text-[#F5E8C7]/40 max-w-md text-sm leading-relaxed">
            Once connected, you'll see today's events in the banner, add tasks directly to your calendar, and sync your AI-generated daily plan in one click.
          </p>
          <button
            onClick={connect}
            className="mt-4 flex items-center gap-3 bg-white text-gray-800 font-bold px-8 py-4 rounded-2xl cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all shadow-lg text-lg"
          >
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="h-6 w-6" />
            Connect with Google
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 flex-1">

          {/* Left column: Today + Upcoming */}
          <div className="xl:col-span-2 flex flex-col gap-6">

            {/* Today's Events */}
            <div className="bg-[#F5E8C7] rounded-2xl p-6 shadow-xl">
              <h3 className="text-2xl font-bold text-[#8E1616] mb-4 flex items-center gap-2 border-b-2 border-[#ffb082] pb-2">
                <Clock className="w-6 h-6" /> Today's Events
              </h3>
              {loading ? (
                <p className="text-[#8E1616]/60 text-sm">Loading events...</p>
              ) : todayEvents.length === 0 ? (
                <p className="text-[#8E1616]/50 italic text-sm py-4">No events today. Your schedule is wide open! 🎉</p>
              ) : (
                <div className="flex flex-col gap-3 max-h-[280px] overflow-y-auto pr-1">
                  {todayEvents.map(ev => (
                    <div key={ev.id} className="flex gap-4 bg-[#ffb082]/30 border-l-4 border-[#ff510d] rounded-r-xl p-4">
                      <div className="text-sm font-bold text-[#ff510d] min-w-[70px] pt-0.5">{formatEventTime(ev)}</div>
                      <div className="flex flex-col gap-1">
                        <div className="font-bold text-[#8E1616] text-base leading-tight">{ev.summary || 'Untitled'}</div>
                        {ev.location && (
                          <div className="flex items-center gap-1 text-xs text-[#8E1616]/60">
                            <MapPin className="w-3 h-3" /> {ev.location}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Upcoming 7 Days */}
            <div className="bg-[#F5E8C7] rounded-2xl p-6 shadow-xl flex-1">
              <h3 className="text-2xl font-bold text-[#8E1616] mb-4 flex items-center gap-2 border-b-2 border-[#ffb082] pb-2">
                <Calendar className="w-6 h-6" /> Next 7 Days
              </h3>
              {loading ? (
                <p className="text-[#8E1616]/60 text-sm">Loading...</p>
              ) : upcomingEvents.length === 0 ? (
                <p className="text-[#8E1616]/50 italic text-sm py-4">No events in the next 7 days.</p>
              ) : (
                <div className="flex flex-col gap-3 max-h-[320px] overflow-y-auto pr-1">
                  {upcomingEvents.map(ev => (
                    <div key={ev.id} className="flex items-center gap-4 bg-white/60 rounded-xl p-4 hover:bg-white transition-colors">
                      <div className="flex flex-col items-center bg-[#8E1616] text-[#F5E8C7] rounded-xl px-3 py-2 min-w-[56px] text-center flex-shrink-0">
                        <span className="text-[10px] font-bold uppercase">{formatEventDate(ev).split(' ')[0]}</span>
                        <span className="text-lg font-bold leading-tight">{formatEventDate(ev).split(' ')[1]}</span>
                        <span className="text-[10px] opacity-70">{formatEventDate(ev).split(' ')[2]}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <div className="font-bold text-[#8E1616] leading-tight">{ev.summary || 'Untitled'}</div>
                        <div className="text-xs text-[#8E1616]/60 font-semibold">{formatEventTime(ev)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right column: Quick Add */}
          <div className="flex flex-col gap-6">
            <div className="bg-[#F5E8C7] rounded-2xl p-6 shadow-xl">
              <h3 className="text-2xl font-bold text-[#8E1616] mb-4 flex items-center gap-2 border-b-2 border-[#ffb082] pb-2">
                <Plus className="w-6 h-6" /> Quick Add Event
              </h3>
              <form onSubmit={handleQuickAdd} className="flex flex-col gap-4">
                <input
                  type="text"
                  placeholder="Event title"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full p-3.5 border-2 border-[#ffb082] rounded-xl bg-white text-black outline-none focus:border-[#ff510d] text-base"
                />
                <div>
                  <label className="text-xs font-bold text-[#8E1616] block mb-1">Date</label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={e => setNewDate(e.target.value)}
                    className="w-full p-3 border-2 border-[#ffb082] rounded-xl bg-white text-black outline-none focus:border-[#ff510d]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-[#8E1616] block mb-1">Start Time</label>
                    <input
                      type="time"
                      value={newStart}
                      onChange={e => setNewStart(e.target.value)}
                      className="w-full p-3 border-2 border-[#ffb082] rounded-xl bg-white text-black outline-none focus:border-[#ff510d]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-[#8E1616] block mb-1">End Time</label>
                    <input
                      type="time"
                      value={newEnd}
                      onChange={e => setNewEnd(e.target.value)}
                      className="w-full p-3 border-2 border-[#ffb082] rounded-xl bg-white text-black outline-none focus:border-[#ff510d]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={addLoading}
                  className="w-full p-4 bg-[#8E1616] hover:bg-[#ff510d] text-[#F5E8C7] font-bold rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 text-base shadow-md"
                >
                  <Plus className="w-5 h-5" />
                  {addLoading ? 'Adding...' : 'Add to Calendar'}
                </button>
              </form>
            </div>

            {/* Legend / Tips card */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-[#F5E8C7] text-sm leading-relaxed">
              <h4 className="font-bold text-[#ffbf64] mb-2">💡 What else is connected</h4>
              <ul className="space-y-2 opacity-80 list-disc list-inside">
                <li>Today's events appear in the hero banner strip</li>
                <li>Each To-Do task has an "Add to Cal" button</li>
                <li>Your AI-generated daily plan can sync here in one click</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
