import React from 'react';
import { Languages } from 'lucide-react';
import { useLang, Lang } from '../../context/LanguageContext';

const OPTIONS: { id: Lang; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'zh', label: '中文' },
];

/**
 * Language switch (English / 中文) for the employee-facing screens. Available to
 * every role; the choice is saved per device.
 */
export const LanguageSelector: React.FC = () => {
  const { lang, setLang, t } = useLang();

  return (
    <div className="bg-white p-5 sm:p-8 rounded-2xl sm:rounded-[2.5rem] border border-slate-100 shadow-sm animate-in slide-in-from-bottom-4">
      <div className="flex items-center gap-3 mb-5 sm:mb-6">
        <div className="p-2.5 sm:p-3 bg-primary-light rounded-xl sm:rounded-2xl text-primary">
          <Languages size={20} />
        </div>
        <div>
          <h3 className="text-lg sm:text-xl font-semibold text-slate-900">{t('lang.title')}</h3>
          <p className="text-[10px] sm:text-xs font-bold text-slate-400">{t('lang.desc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        {OPTIONS.map(opt => (
          <button
            key={opt.id}
            onClick={() => setLang(opt.id)}
            className={`flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-3 rounded-xl sm:rounded-2xl border-2 font-bold text-xs sm:text-sm transition-all ${
              lang === opt.id
                ? 'border-primary bg-primary-light/50 text-primary'
                : 'border-transparent bg-slate-50 text-slate-500 hover:bg-slate-100'
            }`}
          >
            <span className="truncate">{opt.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
