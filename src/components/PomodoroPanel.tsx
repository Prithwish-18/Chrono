import React, { useState, useEffect, useRef } from 'react';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import MicButton from './MicButton';

interface PomodoroPanelProps {
  onClose: () => void;
}

export default function PomodoroPanel({ onClose }: PomodoroPanelProps) {
  const [time, setTime] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [isWorkSession, setIsWorkSession] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [voiceStatus, setVoiceStatus] = useState('');

  const pomodoroMic = useSpeechRecognition({
    lang: 'en-IN',
    continuous: true,
    onResult: (text) => {
      const lower = text.toLowerCase().trim();
      if (lower.includes('start') || lower.includes('begin') || lower.includes('go')) {
        handleStart();
        setVoiceStatus('▶️ Started via voice');
      } else if (lower.includes('pause') || lower.includes('stop')) {
        handlePause();
        setVoiceStatus('⏸️ Paused via voice');
      } else if (lower.includes('reset') || lower.includes('restart')) {
        handleReset();
        setVoiceStatus('🔄 Reset via voice');
      } else {
        setVoiceStatus(`Heard: "${text}" — say start, pause, or reset`);
      }
      setTimeout(() => setVoiceStatus(''), 3000);
    }
  });

  // Synthesize alarm procedurally so it's 100% reliable and asset-independent
  const playAlarmSound = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      // Multi-note cute alarm chime
      const playTone = (freq: number, startTime: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(0.3, startTime + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
        
        osc.start(startTime);
        osc.stop(startTime + duration);
      };

      const now = ctx.currentTime;
      playTone(523.25, now, 0.4);       // C5
      playTone(659.25, now + 0.2, 0.4); // E5
      playTone(783.99, now + 0.4, 0.4); // G5
      playTone(1046.50, now + 0.6, 0.8); // C6
    } catch (e) {
      console.error("Audio synth error:", e);
    }
  };

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setTime((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  // Clean transition when timer reaches 0
  useEffect(() => {
    if (time === 0 && isRunning) {
      setIsRunning(false);
      playAlarmSound();
      
      setIsWorkSession((curr) => {
        const nextIsWork = !curr;
        setTime(nextIsWork ? 25 * 60 : 5 * 60);
        return nextIsWork;
      });
    }
  }, [time, isRunning]);

  const handleStart = () => {
    setIsRunning(true);
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setTime(isWorkSession ? 25 * 60 : 5 * 60);
  };

  const minutes = Math.floor(time / 60);
  const seconds = time % 60;
  const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;
  const formattedSeconds = seconds < 10 ? `0${seconds}` : seconds;

  // Percentage for the progress circle
  const totalDuration = isWorkSession ? 25 * 60 : 5 * 60;
  const percentage = ((totalDuration - time) / totalDuration) * 100;

  return (
    <div className="fixed inset-0 z-[200] bg-[#8E1616] p-4 sm:p-8 md:p-14 overflow-y-auto flex flex-col justify-between select-none">
      
      {/* Top Header Row */}
      <div className="flex justify-between items-center w-full gap-4 pb-4 border-b border-white/10">
        <h2 className="text-white text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-medium font-sans tracking-tight leading-none select-none">
          Study with me!
        </h2>
        <button 
          type="button"
          onClick={onClose}
          className="bg-[#EBFD3F] hover:bg-[#d9ec2f] text-black font-bold px-4 sm:px-7 py-2 sm:py-3 rounded-xl cursor-pointer transition-all active:scale-95 text-sm sm:text-lg shadow-md font-sans flex-shrink-0"
        >
          Close
        </button>
      </div>

      {/* Central Interactive Block */}
      <div className="flex-1 flex flex-col items-center justify-center py-6">
        <div className="text-center flex flex-col items-center gap-6 md:gap-8 w-full max-w-md">
          
          {/* Mode Switcher */}
          <div className="flex gap-2 bg-black/35 p-1 rounded-2xl border border-white/10 shadow-inner w-full max-w-xs justify-center">
            <button
              type="button"
              onClick={() => {
                setIsRunning(false);
                setIsWorkSession(true);
                setTime(25 * 60);
              }}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                isWorkSession 
                  ? 'bg-[#FF510D] text-[#FBF3DB] shadow-lg scale-105' 
                  : 'text-[#F5E8C7]/65 hover:text-white hover:bg-white/5'
              }`}
            >
              🎯 Focus (25m)
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRunning(false);
                setIsWorkSession(false);
                setTime(5 * 60);
              }}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                !isWorkSession 
                  ? 'bg-[#FF510D] text-[#FBF3DB] shadow-lg scale-105' 
                  : 'text-[#F5E8C7]/65 hover:text-white hover:bg-white/5'
              }`}
            >
              ☕ Break (5m)
            </button>
          </div>

          {/* Main Orange Clock Face */}
          <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-[350px] md:h-[350px] rounded-full bg-[#FF510D] flex flex-col items-center justify-center border-4 sm:border-[8px] border-[#FED988] shadow-[0_25px_50px_-12px_rgba(0,0,0,0.4)] transition-all">
            <span className="text-[#FBF3DB]/60 text-[10px] sm:text-xs md:text-sm font-bold font-mono tracking-widest uppercase mb-1">
              {isWorkSession ? '🎯 Focus Session' : '☕ Short Break'}
            </span>
            <span className="font-sans text-[#FBF3DB] text-[55px] sm:text-[80px] md:text-[105px] font-semibold leading-none tracking-tight select-none">
              {formattedMinutes}:{formattedSeconds}
            </span>
            <span className={`text-[#EBFD3F] text-[9px] sm:text-[11px] font-bold tracking-widest uppercase mt-2 sm:mt-3 px-2.5 sm:px-3 py-1 rounded-full bg-black/15 border border-white/5 transition-all ${isRunning ? 'animate-pulse' : 'opacity-50'}`}>
              {isRunning ? '● Running' : 'Paused'}
            </span>
          </div>

          {/* Symmetrical Controls Row */}
          <div className="flex gap-2 sm:gap-4 justify-center w-full">
            <button 
              type="button"
              onClick={handleStart}
              className="flex-1 max-w-[100px] py-2 sm:py-3 text-sm sm:text-lg md:text-xl font-bold bg-[#00C82B] text-black rounded-lg shadow-[0_8px_16px_rgba(0,0,0,0.15)] hover:bg-[#00b527] hover:scale-105 transition-all select-none active:scale-95 cursor-pointer"
            >
              Start
            </button>
            <button 
              type="button"
              onClick={handlePause}
              className="flex-1 max-w-[100px] py-2 sm:py-3 text-sm sm:text-lg md:text-xl font-bold bg-[#00C82B] text-black rounded-lg shadow-[0_8px_16px_rgba(0,0,0,0.15)] hover:bg-[#00b527] hover:scale-105 transition-all select-none active:scale-95 cursor-pointer"
            >
              Pause
            </button>
            <button 
              type="button"
              onClick={handleReset}
              className="flex-1 max-w-[100px] py-2 sm:py-3 text-sm sm:text-lg md:text-xl font-bold bg-[#00C82B] text-black rounded-lg shadow-[0_8px_16px_rgba(0,0,0,0.15)] hover:bg-[#00b527] hover:scale-105 transition-all select-none active:scale-95 cursor-pointer"
            >
              Reset
            </button>
          </div>

          {/* Voice control section */}
          <div className="mt-4 sm:mt-8 flex flex-col items-center gap-2 sm:gap-3 bg-black/25 p-4 sm:p-5 rounded-2xl max-w-sm w-full border border-white/5 mx-auto">
            <div className="flex items-center gap-3">
              <MicButton
                isListening={pomodoroMic.isListening}
                isSupported={pomodoroMic.isSupported}
                onToggle={() => pomodoroMic.isListening ? pomodoroMic.stop() : pomodoroMic.start()}
                size="lg"
              />
              <span className="text-[#F5E8C7]/80 text-base font-semibold">
                {pomodoroMic.isListening ? '🎤 Listening for commands...' : 'Voice commands'}
              </span>
            </div>
            {voiceStatus && (
              <p className="text-[#ffbf64] text-sm font-semibold animate-pulse">{voiceStatus}</p>
            )}
            {pomodoroMic.isSupported && (
              <p className="text-[#F5E8C7]/40 text-xs text-center leading-normal">
                Try saying: <span className="text-[#F5E8C7]/70 font-bold font-mono">"start"</span>, <span className="text-[#F5E8C7]/70 font-bold font-mono">"pause"</span>, or <span className="text-[#F5E8C7]/70 font-bold font-mono">"reset"</span>
              </p>
            )}
            {pomodoroMic.error && (
              <div className="text-red-300 text-xs bg-red-950/40 border border-red-500/20 p-2.5 rounded-lg flex flex-col gap-1 mt-1 text-center w-full">
                <span className="font-bold">🎤 Mic error:</span>
                {pomodoroMic.error === 'not-allowed' ? (
                  <span>Microphone access was denied. Please allow microphone access in your browser settings to use voice controls.</span>
                ) : (
                  <span>{pomodoroMic.error}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Decorative empty bottom spacer */}
      <div className="h-4"></div>
    </div>
  );
}
