import type { CapacitorConfig } from '@capacitor/cli';

/**
 * EZ HR — Android shell.
 *
 * The APK is a thin wrapper that loads the live site from Vercel, so pushing a
 * code change updates everyone's app on next open with no re-install. Only
 * native changes (permissions, plugins, icon, app name) need a new APK build.
 */
const config: CapacitorConfig = {
  appId: 'com.ezhr.attendance',
  appName: 'EZ HR',
  webDir: 'dist',
  server: {
    url: 'https://open-hr-app-seven.vercel.app',
    cleartext: false,
  },
};

export default config;
