import React from 'react';
import { Flame, Gift, Trophy } from 'lucide-react';
import type { PunctualityProgress, PunctualityRewardConfig } from '../../utils/punctuality';

interface Props {
  progress: PunctualityProgress;
  config: PunctualityRewardConfig;
}

/** Big streak counter with a dot track towards the next small gift. */
export const StreakHero: React.FC<Props> = ({ progress, config }) => {
  const target = config.streakTarget;
  const filled = progress.currentStreak % target;
  const today = progress.today?.outcome;

  return (
    <div className="relative overflow-hidden rounded-[2rem] p-6 md:p-8 text-white shadow-xl bg-gradient-to-br from-orange-500 via-rose-500 to-fuchsia-600">
      <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full bg-white/10" />
      <div className="absolute -right-4 bottom-0 w-24 h-24 rounded-full bg-white/10" />

      <div className="relative flex items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/80">连续准时 On-time streak</p>
          <div className="flex items-end gap-2 mt-2">
            <span className="text-6xl md:text-7xl font-black leading-none tabular-nums">{progress.currentStreak}</span>
            <span className="text-lg font-bold pb-2">天 days</span>
          </div>
        </div>
        <div className={`p-4 rounded-2xl bg-white/20 backdrop-blur ${progress.currentStreak > 0 ? 'animate-pulse' : ''}`}>
          <Flame size={40} className={progress.currentStreak > 0 ? 'text-yellow-200' : 'text-white/50'} />
        </div>
      </div>

      {/* Dot track to the next gift */}
      <div className="relative mt-6">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: target }, (_, i) => (
            <div
              key={i}
              className={`h-2.5 flex-1 rounded-full transition-all duration-500 ${i < filled ? 'bg-yellow-200 shadow-[0_0_8px_rgba(254,240,138,0.8)]' : 'bg-white/25'}`}
            />
          ))}
          <Gift size={22} className="ml-1 text-yellow-200 shrink-0" />
        </div>
        <p className="mt-3 text-sm font-semibold">
          再准时 <span className="text-yellow-200 text-lg font-black">{progress.toNextGift}</span> 天就有小礼物 🎁
          <span className="block text-xs font-medium text-white/80">{progress.toNextGift} more on-time day{progress.toNextGift === 1 ? '' : 's'} to your next gift</span>
        </p>
      </div>

      <div className="relative mt-5 flex flex-wrap gap-2 text-xs font-semibold">
        <span className="px-3 py-1.5 rounded-full bg-white/20 flex items-center gap-1.5">
          <Trophy size={13} /> 最佳 Best: {progress.bestStreak}
        </span>
        {today === 'ON_TIME' && <span className="px-3 py-1.5 rounded-full bg-emerald-400/90">✅ 今天准时 On time today</span>}
        {today === 'LATE' && <span className="px-3 py-1.5 rounded-full bg-black/25">⏰ 今天迟到了，明天再来！</span>}
        {!today && <span className="px-3 py-1.5 rounded-full bg-white/20">⏳ 今天还没打卡 Not checked in yet</span>}
      </div>
    </div>
  );
};
