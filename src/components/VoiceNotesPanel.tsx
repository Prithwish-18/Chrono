import React, { useState, useRef, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Mic, Square, Play, Pause, Trash2, Calendar, Clock, Volume2 } from 'lucide-react';
import { VoiceNote } from '../types';

interface VoiceNotesPanelProps {
  userId: string;
  onClose: () => void;
}

export default function VoiceNotesPanel({ userId, onClose }: VoiceNotesPanelProps) {
  const [notes, setNotes] = useState<VoiceNote[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [playingId, setPlayingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const audioRefs = useRef<{ [id: string]: HTMLAudioElement }>({});

  // Fetch voice notes in real-time
  useEffect(() => {
    const q = query(
      collection(db, 'users', userId, 'voiceNotes'),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setNotes(snap.docs.map(d => ({ id: d.id, ...d.data() } as VoiceNote)));
    }, (err) => {
      console.error('Failed to sync voice notes:', err);
    });

    return () => unsub();
  }, [userId]);

  // Clean up timers and audio players on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      Object.values(audioRefs.current).forEach((audio) => {
        if (audio) {
          (audio as HTMLAudioElement).pause();
        }
      });
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          
          // Firestore payload validation and insert
          await addDoc(collection(db, 'users', userId, 'voiceNotes'), {
            audioUrl: base64Audio,
            duration: recordingTime,
            createdAt: new Date().toISOString(),
            title: `Voice Note - ${new Date().toLocaleString(undefined, { 
              month: 'short', 
              day: 'numeric', 
              hour: '2-digit', 
              minute: '2-digit' 
            })}`
          });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = window.setInterval(() => {
        setRecordingTime(t => t + 1);
      }, 1000);
    } catch (err) {
      console.error('Microphone access denied or error occurred:', err);
      alert('⚠️ Unable to access microphone. Please ensure microphone permissions are granted.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this voice note?')) {
      try {
        if (playingId === id) {
          audioRefs.current[id]?.pause();
          setPlayingId(null);
        }
        await deleteDoc(doc(db, 'users', userId, 'voiceNotes', id));
      } catch (err) {
        console.error('Failed to delete voice note:', err);
      }
    }
  };

  const togglePlay = (note: VoiceNote) => {
    // Pause any currently playing audio if it is different
    if (playingId && playingId !== note.id) {
      audioRefs.current[playingId]?.pause();
    }

    if (playingId === note.id) {
      audioRefs.current[note.id]?.pause();
      setPlayingId(null);
      return;
    }

    if (!audioRefs.current[note.id]) {
      const audio = new Audio(note.audioUrl);
      audio.onended = () => {
        setPlayingId(null);
      };
      audioRefs.current[note.id] = audio;
    }

    audioRefs.current[note.id].play()
      .then(() => {
        setPlayingId(note.id);
      })
      .catch(err => {
        console.error('Failed to play audio:', err);
        alert('Could not play this voice note.');
      });
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[200] bg-[#8E1616] p-4 sm:p-8 md:p-12 overflow-y-auto flex flex-col justify-start">
      <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col">
        {/* Responsive Header */}
        <div className="flex justify-between items-center gap-3 mb-6 sm:mb-8 pb-4 border-b border-[#F5E8C7]/15">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-[#ff510d] rounded-xl text-[#F5E8C7]">
              <Mic className="w-6 h-6 sm:w-8 sm:h-8" />
            </div>
            <div>
              <h2 className="text-xl sm:text-3xl md:text-4xl font-bold text-[#F5E8C7]">Voice Memo Vault</h2>
              <p className="text-xs text-[#F5E8C7]/60 font-mono mt-0.5">Standalone journal thoughts & quick audio memos</p>
            </div>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="bg-[#F5E8C7] text-[#8E1616] font-bold px-4 sm:px-6 py-2 rounded-xl text-sm hover:scale-105 transition-transform cursor-pointer shadow-md"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Recorder Controls: Left Zone */}
          <div className="md:col-span-5 bg-black/30 border border-white/5 rounded-2xl p-6 flex flex-col items-center justify-center text-center gap-4 min-h-[260px]">
            <button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all shadow-xl border-4 cursor-pointer ${
                isRecording 
                  ? 'bg-red-600 border-red-400 animate-pulse scale-105' 
                  : 'bg-[#ff510d] border-[#FED988] hover:scale-105 hover:bg-[#ff6224]'
              }`}
            >
              {isRecording ? (
                <Square className="w-8 h-8 text-white" />
              ) : (
                <Mic className="w-8 h-8 text-[#F5E8C7]" />
              )}
            </button>
            <div>
              <p className="text-[#F5E8C7] font-bold text-lg">
                {isRecording ? `Recording... ${formatDuration(recordingTime)}` : 'Tap to start recording'}
              </p>
              <p className="text-[#F5E8C7]/60 text-xs font-mono mt-1">
                {isRecording ? 'Click again to finish and save' : 'Memos are saved to your secure profile'}
              </p>
            </div>
          </div>

          {/* Voice Notes List: Right Zone */}
          <div className="md:col-span-7 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-[#F5E8C7] flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-[#ffbf64]" />
                Saved Memos ({notes.length})
              </h3>
            </div>

            {notes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-center bg-black/15 border border-white/5 rounded-2xl p-6">
                <div className="text-4xl">🎙️</div>
                <p className="text-lg font-bold text-[#F5E8C7]">No voice notes yet</p>
                <p className="text-[#F5E8C7]/50 text-xs max-w-[260px] mx-auto">
                  Record your first standalone memo on the left to keep track of brainstorming ideas or quick speech memos.
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-1">
                {notes.map(note => (
                  <div 
                    key={note.id} 
                    className="bg-[#F5E8C7] rounded-xl p-4 flex items-center gap-3 shadow-md hover:bg-[#fff7e2] transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => togglePlay(note)}
                      className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all cursor-pointer ${
                        playingId === note.id ? 'bg-[#ff510d] text-white animate-bounce' : 'bg-[#8E1616] text-[#F5E8C7] hover:scale-105'
                      }`}
                    >
                      {playingId === note.id ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-[#8E1616] text-sm sm:text-base truncate">{note.title}</p>
                      <div className="flex items-center gap-3 text-[#8E1616]/75 text-xs font-mono mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(note.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {formatDuration(note.duration)}
                        </span>
                      </div>
                    </div>
                    <button 
                      type="button"
                      onClick={() => handleDelete(note.id)} 
                      className="p-2 rounded-lg text-red-700 hover:bg-red-500/10 cursor-pointer transition-colors flex-shrink-0"
                      title="Delete recording"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
