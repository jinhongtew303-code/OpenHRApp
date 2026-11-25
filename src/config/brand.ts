// White-label settings, read from build-time env vars so one codebase can serve
// several deployments (e.g. the original Vercel site keeps "OpenHRApp" while a
// Netlify copy shows its own name). Unset = original OpenHRApp behaviour.
//
//   VITE_APP_NAME        Display name, e.g. "TTS MEMBER ATTENDANCE"
//   VITE_APP_SHORT_NAME  Home-screen icon label (iOS shows ~12 chars), e.g. "TTS 打卡"
//   VITE_SKIP_LANDING    "true" → open straight on the login page, hide the
//                        marketing landing page and "Register New Organization"

const env = import.meta.env as Record<string, string | undefined>;

export const CUSTOM_BRAND_NAME = (env.VITE_APP_NAME || '').trim();
export const IS_CUSTOM_BRAND = CUSTOM_BRAND_NAME.length > 0;
export const APP_NAME = CUSTOM_BRAND_NAME || 'OpenHRApp';
export const APP_SHORT_NAME = (env.VITE_APP_SHORT_NAME || '').trim() || APP_NAME;
export const SKIP_LANDING = (env.VITE_SKIP_LANDING || '').trim().toLowerCase() === 'true';

/** Short mark for the text logo: a short first word ("TTS"), else initials. */
export const brandInitials = (name = APP_NAME): string => {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length === 0) return '';
  if (words[0].length <= 4) return words[0].toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join('').toUpperCase();
};
