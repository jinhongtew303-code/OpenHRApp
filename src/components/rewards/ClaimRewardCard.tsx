import React, { useState } from 'react';
import { Gift, Crown, Loader2 } from 'lucide-react';
import type { ClaimableReward } from '../../utils/punctuality';

interface Props {
  reward: ClaimableReward;
  onClaim: (choice: string) => Promise<void>;
}

/** An earned reward waiting for the employee to pick what they want. */
export const ClaimRewardCard: React.FC<Props> = ({ reward, onClaim }) => {
  const [choice, setChoice] = useState<string>(reward.options.length === 1 ? reward.options[0] : '');
  const [busy, setBusy] = useState(false);
  const big = reward.kind === 'MONTHLY';

  const submit = async () => {
    if (!choice || busy) return;
    setBusy(true);
    try { await onClaim(choice); } finally { setBusy(false); }
  };

  return (
    <div className={`rounded-[2rem] p-5 md:p-6 border-2 shadow-lg animate-in zoom-in-95 duration-500 ${big ? 'bg-gradient-to-br from-amber-50 to-yellow-100 border-amber-300' : 'bg-gradient-to-br from-pink-50 to-rose-50 border-rose-200'}`}>
      <div className="flex items-center gap-3">
        <div className={`p-3 rounded-2xl text-white shadow-md ${big ? 'bg-amber-500' : 'bg-rose-500'} animate-bounce`}>
          {big ? <Crown size={24} /> : <Gift size={24} />}
        </div>
        <div>
          <p className={`text-[11px] font-bold uppercase tracking-widest ${big ? 'text-amber-600' : 'text-rose-500'}`}>
            {big ? '🏆 月度大奖 Monthly reward' : '🎁 小礼物 Streak gift'}
          </p>
          <h3 className="font-bold text-slate-800">{reward.title}</h3>
        </div>
      </div>

      <p className="text-xs font-semibold text-slate-500 mt-4 mb-2">选一个你想要的 Pick one:</p>
      <div className="grid gap-2">
        {reward.options.map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => setChoice(opt)}
            className={`text-left px-4 py-3 rounded-2xl border-2 font-semibold text-sm transition-all active:scale-[0.98] ${choice === opt
              ? (big ? 'border-amber-500 bg-white text-amber-700 shadow' : 'border-rose-500 bg-white text-rose-700 shadow')
              : 'border-transparent bg-white/70 text-slate-600'}`}
          >
            {choice === opt ? '✔ ' : ''}{opt}
          </button>
        ))}
      </div>

      <button
        type="button"
        disabled={!choice || busy}
        onClick={submit}
        className={`mt-4 w-full py-3.5 rounded-2xl font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-40 ${big ? 'bg-amber-500' : 'bg-rose-500'}`}
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : <Gift size={18} />}
        领取奖励 Claim
      </button>
    </div>
  );
};
