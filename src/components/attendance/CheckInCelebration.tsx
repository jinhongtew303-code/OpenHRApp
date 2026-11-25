import React, { useEffect, useRef, useState } from 'react';
import { Flame, Gift, Loader2 } from 'lucide-react';
import { hrService } from '../../services/hrService';
import { claimableRewards, PunctualityProgress, PunctualityRewardConfig } from '../../utils/punctuality';

interface Props {
  userId: string;
  onDone: () => void;
  onOpenRewards: () => void;
}

const CONFETTI = ['🎉', '✨', '🎊', '⭐', '🔥', '💛'];

/**
 * Shown right after a check-in. On time → confetti + streak; late → a kind
 * nudge for tomorrow. Renders nothing when rewards are switched off.
 */
export const CheckInCelebration: React.FC<Props> = ({ userId, onDone, onOpenRewards }) => {
  // The parent re-renders every second (clock), so keep the latest callback in a ref.
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const [state, setState] = useState<{ config: PunctualityRewardConfig; progress: PunctualityProgress; waiting: number } | null | 'off'>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const config = await hrService.getRewardConfig();
        if (!config.enabled) { if (alive) setState('off'); return; }
        const [progress, claims] = await Promise.all([
          hrService.getPunctualityProgress(userId, config),
          hrService.getRewardClaims(userId),
        ]);
        const keys = new Set(claims.map(c => `${c.kind}:${c.period}`));
        if (alive) setState({ config, progress, waiting: claimableRewards(progress, config, keys).length });
      } catch {
        if (alive) setState('off');
      }
    })();
    return () => { alive = false; };
  }, [userId]);

  // Rewards off (or unreachable): behave like before — close shortly after success.
  useEffect(() => {
    if (state !== 'off') return;
    const t = setTimeout(() => doneRef.current(), 1500);
    return () => clearTimeout(t);
  }, [state]);

  if (state === 'off') return null;

  const loading = state === null;
  const onTime = !loading && state.progress.today?.outcome === 'ON_TIME';
  const justEarned = onTime && state.progress.currentStreak > 0
    && state.progress.currentStreak % state.config.streakTarget === 0;

  return (
    <div className="fixed inset-0 z-[10001] flex items-center justify-center p-6 bg-black/50 backdrop-blur-sm animate-in fade-in" onClick={onDone}>
      {onTime && (
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 24 }, (_, i) => (
            <span
              key={i}
              className="absolute text-2xl animate-bounce"
              style={{ left: `${(i * 37) % 100}%`, top: `${(i * 53) % 90}%`, animationDelay: `${(i % 6) * 120}ms` }}
            >
              {CONFETTI[i % CONFETTI.length]}
            </span>
          ))}
        </div>
      )}

      <div
        className="relative w-full max-w-sm rounded-[2rem] bg-white p-7 text-center shadow-2xl animate-in zoom-in-95 duration-500"
        onClick={e => e.stopPropagation()}
      >
        {loading ? (
          <Loader2 className="mx-auto animate-spin text-primary" size={36} />
        ) : onTime ? (
          <>
            <div className="mx-auto w-20 h-20 rounded-full bg-gradient-to-br from-orange-400 to-rose-500 flex items-center justify-center shadow-lg">
              <Flame size={40} className="text-yellow-100" />
            </div>
            <h2 className="mt-4 text-2xl font-black text-slate-800">准时打卡！🎉</h2>
            <p className="text-slate-500 text-sm">You're on time — nice!</p>
            <p className="mt-4 text-5xl font-black text-rose-500 tabular-nums">{state.progress.currentStreak}</p>
            <p className="text-sm font-bold text-slate-600">连续准时天数 day streak</p>
            {justEarned ? (
              <p className="mt-4 px-4 py-3 rounded-2xl bg-amber-50 text-amber-700 font-bold text-sm">🎁 恭喜！你赢得了一份小礼物，快去领取！</p>
            ) : (
              <p className="mt-4 text-sm text-slate-500">再准时 <b className="text-rose-500">{state.progress.toNextGift}</b> 天就有小礼物 🎁</p>
            )}
          </>
        ) : (
          <>
            <div className="text-6xl">⏰</div>
            <h2 className="mt-3 text-xl font-black text-slate-800">打卡成功</h2>
            <p className="mt-2 text-sm text-slate-500">今天迟到了一点，连续记录重新开始。明天准时来，重新冲刺礼物吧 💪</p>
            <p className="text-xs text-slate-400 mt-1">Checked in late today — tomorrow is a fresh start!</p>
          </>
        )}

        {!loading && (
          <div className="mt-6 flex gap-2">
            {(state.waiting > 0 || justEarned) && (
              <button type="button" onClick={onOpenRewards} className="flex-1 py-3 rounded-2xl bg-rose-500 text-white font-bold text-sm flex items-center justify-center gap-1.5">
                <Gift size={16} /> 去领奖
              </button>
            )}
            <button type="button" onClick={onDone} className="flex-1 py-3 rounded-2xl bg-slate-800 text-white font-bold text-sm">好的 OK</button>
          </div>
        )}
      </div>
    </div>
  );
};
