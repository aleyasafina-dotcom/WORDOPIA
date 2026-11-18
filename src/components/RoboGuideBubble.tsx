import React from 'react';
import { Volume2, Bot } from 'lucide-react';
import type { RoboMood } from '../types/game.ts';
import { soundEngine } from '../utils/soundEngine.ts';

interface RoboGuideBubbleProps {
  message: string;
  mood?: RoboMood;
  title?: string;
  compact?: boolean;
}

export const RoboGuideBubble: React.FC<RoboGuideBubbleProps> = ({
  message,
  mood = 'mesra',
  title = 'ROBO · Rakan Pengembara',
  compact = false,
}) => {
  const accentColor =
    mood === 'amaran'
      ? '#FFB547'
      : mood === 'bangga' || mood === 'teruja'
      ? '#A5F05A'
      : '#00C8F0';

  const moodLabel =
    mood === 'amaran'
      ? 'Mod Amaran'
      : mood === 'berfikir'
      ? 'Mod Analisis'
      : mood === 'bangga'
      ? 'Mod Syabas'
      : mood === 'teruja'
      ? 'Mod Teruja'
      : 'Mod Panduan';

  const handleSpeak = () => {
    soundEngine.playRoboChirp();
    const prevVoice = soundEngine.voiceEnabled;
    soundEngine.voiceEnabled = true;
    soundEngine.speakMalay(message);
    soundEngine.voiceEnabled = prevVoice;
  };

  return (
    <div
      className={`holo-panel rounded-2xl ${compact ? 'p-3.5' : 'p-4'} transition-transform duration-200`}
      style={{ borderColor: `${accentColor}55` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border"
          style={{
            backgroundColor: `${accentColor}1A`,
            borderColor: `${accentColor}66`,
            color: accentColor,
          }}
        >
          <Bot className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs font-medium text-[#00C8F0]">
              <span className="font-display font-semibold text-[#F4F8FF]">{title}</span>
              <span aria-hidden="true" className="text-[#F4F8FF]/40">·</span>
              <span style={{ color: accentColor }}>{moodLabel}</span>
            </div>
            <button
              type="button"
              onClick={handleSpeak}
              title="Dengar suara ROBO"
              className="flex items-center gap-1.5 rounded-lg border border-[#00C8F0]/30 bg-[#00C8F0]/10 px-2.5 py-1 text-xs font-medium text-[#00C8F0] transition-colors hover:bg-[#00C8F0]/20 whitespace-nowrap shrink-0"
            >
              <Volume2 className="h-3.5 w-3.5" />
              <span>Dengar</span>
            </button>
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-[#F4F8FF]/95">{message}</p>
        </div>
      </div>
    </div>
  );
};
