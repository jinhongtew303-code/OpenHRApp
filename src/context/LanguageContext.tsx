import React, { createContext, useContext, useState } from 'react';

/**
 * Lightweight language switch (English / 中文) for the employee-facing screens
 * the PA uses most: the Home punch cards, the bottom navigation and the Profile
 * page. The rest of the app stays English. The choice is per-device
 * (localStorage) — it does not sync to the server.
 */
export type Lang = 'en' | 'zh';

const LANG_KEY = 'openhr-lang';

function getStoredLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'zh') return saved;
  } catch { /* localStorage unavailable */ }
  return 'en';
}

type Dict = Record<string, string>;

const EN: Dict = {
  // bottom nav
  'nav.home': 'Home',
  'nav.history': 'History',
  'nav.leave': 'Leave',
  'nav.account': 'Account',
  // workday card
  'work.today': 'Today',
  'work.overtime': 'OT',
  'work.checkIn': 'Check In',
  'work.break': 'Lunch Out',
  'work.back': 'Lunch Back',
  'work.checkOut': 'Check Out',
  'work.startBreak': 'Start Break',
  'work.endBreak': 'End Break',
  'work.notCheckedIn': 'Not checked in yet today',
  // location card
  'loc.title': 'Location',
  'loc.gpsOk': 'GPS OK',
  'loc.gpsOff': 'GPS off',
  'loc.none': 'No check-in yet today',
  'loc.map': 'View on map',
  // mileage card
  'mile.title': 'Mileage',
  'mile.today': 'Today',
  'mile.startReading': 'Start reading',
  'mile.inProgress': 'Trip in progress',
  'mile.takePhoto': 'Photo of odometer',
  'mile.retake': 'Retake photo',
  'mile.startPh': 'Odometer reading at start (km)',
  'mile.endPh': 'Odometer reading at end (km)',
  'mile.confirmStart': 'Confirm Start',
  'mile.confirmEnd': 'Confirm End',
  'mile.start': 'Start Trip',
  'mile.end': 'End Trip',
  'mile.hint': 'Record when you drive your own car out for work: photo of odometer + reading',
  'mile.tooLow': 'End reading cannot be less than start reading',
  'mile.photoFail': 'Could not process the photo, try again',
  'mile.okStart': 'Saved: start mileage',
  'mile.okEnd': 'Saved: end mileage',
  'mile.fail': 'Action failed, please retry',
  // profile / language
  'lang.title': 'Language',
  'lang.desc': 'Choose your preferred language',
  'lang.en': 'English',
  'lang.zh': '中文',
  // generic
  'common.retryFail': 'Action failed, please retry',
  'break.okStart': 'Saved: lunch out',
  'break.okEnd': 'Saved: lunch back',
};

const ZH: Dict = {
  'nav.home': '主页',
  'nav.history': '考勤',
  'nav.leave': '请假',
  'nav.account': '我的',
  'work.today': '今日打卡',
  'work.overtime': '加班',
  'work.checkIn': '上班',
  'work.break': '午休外出',
  'work.back': '午休回来',
  'work.checkOut': '下班',
  'work.startBreak': '外出午休',
  'work.endBreak': '午休回来',
  'work.notCheckedIn': '今天还没打卡上班',
  'loc.title': '打卡地点',
  'loc.gpsOk': 'GPS 正常',
  'loc.gpsOff': 'GPS 已关闭',
  'loc.none': '今天还没打卡',
  'loc.map': '在地图查看',
  'mile.title': '里程',
  'mile.today': '今日',
  'mile.startReading': '出发读数',
  'mile.inProgress': '行程进行中',
  'mile.takePhoto': '拍里程表照片',
  'mile.retake': '重新拍照',
  'mile.startPh': '出发时里程表读数 (km)',
  'mile.endPh': '返回时里程表读数 (km)',
  'mile.confirmStart': '确认出发',
  'mile.confirmEnd': '确认返回',
  'mile.start': '开始里程',
  'mile.end': '结束里程',
  'mile.hint': '开自己的车出外工作时记录，拍里程表 + 填读数',
  'mile.tooLow': '返回读数不能小于出发读数',
  'mile.photoFail': '照片处理失败，请重试',
  'mile.okStart': '已记录：出发里程',
  'mile.okEnd': '已记录：返回里程',
  'mile.fail': '操作失败，请重试',
  'lang.title': '语言 Language',
  'lang.desc': '选择你偏好的语言',
  'lang.en': 'English',
  'lang.zh': '中文',
  'common.retryFail': '操作失败，请重试',
  'break.okStart': '已记录：外出午休',
  'break.okEnd': '已记录：午休回来',
};

const DICTS: Record<Lang, Dict> = { en: EN, zh: ZH };

interface LanguageContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLangState] = useState<Lang>(getStoredLang);

  const setLang = (l: Lang) => {
    setLangState(l);
    try { localStorage.setItem(LANG_KEY, l); } catch { /* noop */ }
  };

  const t = (key: string) => DICTS[lang][key] ?? EN[key] ?? key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLang = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used within LanguageProvider');
  return ctx;
};
