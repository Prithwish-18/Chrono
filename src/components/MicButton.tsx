import React from 'react';
import { Mic, MicOff } from 'lucide-react';

interface MicButtonProps {
  isListening: boolean;
  isSupported: boolean;
  onToggle: () => void;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'lightBg' | 'darkBg';
}

export default function MicButton({ isListening, isSupported, onToggle, size = 'md', className = '', variant = 'darkBg' }: MicButtonProps) {
  if (!isSupported) return null; // silently hide on unsupported browsers

  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12'
  };

  const iconSizes = { sm: 'w-3.5 h-3.5', md: 'w-4 h-4', lg: 'w-5 h-5' };

  const isLight = variant === 'lightBg';

  return (
    <button
      type="button"
      onClick={onToggle}
      title={isListening ? 'Stop listening' : 'Speak'}
      className={`
        ${sizes[size]} rounded-full flex items-center justify-center flex-shrink-0
        transition-all duration-200 cursor-pointer border-2
        ${isListening
          ? 'bg-red-600 border-red-500 shadow-[0_0_12px_rgba(220,38,38,0.6)] animate-pulse'
          : isLight
            ? 'bg-white/80 border-[#8E1616]/30 hover:border-[#8E1616]/65 text-[#8E1616] hover:bg-white'
            : 'bg-[#F5E8C7]/10 border-[#F5E8C7]/25 hover:bg-[#F5E8C7]/20 hover:border-[#F5E8C7]/50'
        }
        ${className}
      `}
    >
      {isListening
        ? <MicOff className={`${iconSizes[size]} text-white`} />
        : <Mic className={`${iconSizes[size]} ${isLight ? 'text-[#8E1616]' : 'text-[#F5E8C7]'}`} />
      }
    </button>
  );
}
