import React, { useEffect, useState } from 'react';
import { Flame, ChevronRight, Gift } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { claimableRewards, PunctualityProgress, PunctualityRewardConfig } from '../../utils/punctuality';

interface Props {
  userId: string;
  onOpen: () => void;
}

/** Home-screen teaser: current streak, next gift, and a badge when a reward is waiting. */
export const StreakMiniCard: React.FC<Props> = ({ userId, onOpen }) => {
  const [state, setState] = useState<{ config: PunctualityRewardConfig; progress: PunctualityProgress; waiting: number } | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const config = await hrService.getRewardConfig();
        if (!config.enabled) return;
        const [progress, claims] = await Promise.all([
          hrService.getPunctualityProgress(userId, config),
          hrService.getRewardClaims(userId),
        ]);
        const keys = new Set(claims.map(c => `${c.kind}:${c.period}`));
        if (alive) setState({ config, progress, waiting: claimableRewards(progress, config, keys).length });
      } catch (e) {
        console.warn('[StreakMiniCard] load failed', e);
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  if (!state) return null;
  const { config, progress, waiting } = state;
  const filled = progress.currentStreak % config.streakTarget;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full text-left relative overflow-hidden rounded-2xl md:rounded-[2rem] p-4 text-white shadow-lg bg-gradient-to-r from-orange-500 via-rose-500 to-fuchsia-600 active:scale-[0.98] transition-all animate-in slide-in-from-bottom-4"
    >
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-white/20"><Flame size={22} className="text-yellow-200" /></div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/80">连续准时 Streak</p>
          <p className="font-black text-xl leading-tight">{progress.currentStreak} 天 <span className="text-xs font-semibold text-white/85">· 还差 {progress.toNextGift} 天拿礼物 🎁</span></p>
        </div>
        {waiting > 0
          ? <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-yellow-300 text-rose-700 text-[11px] font-black animate-bounce"><Gift size={12} />领奖 {waiting}</span>
          : <ChevronRight size={18} className="text-white/80" />}
      </div>
      <div className="flex gap-1 mt-3">
        {Array.from({ length: config.streakTarget }, (_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full ${i < filled ? 'bg-yellow-200' : 'bg-white/25'}`} />
        ))}
      </div>
    </button>
  );
};
