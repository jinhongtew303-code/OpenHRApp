// Generates assets/icon.png and assets/splash*.png for @capacitor/assets.
// Run: node scripts/make-icon.mjs   (sharp is already a dependency)
import sharp from 'sharp';
import { mkdirSync } from 'fs';

mkdirSync('assets', { recursive: true });

const BLUE = '#2563EB';
const DARK = '#1E3A8A';

// App icon: blue rounded field, white clock, small green check — "attendance".
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${BLUE}"/>
      <stop offset="1" stop-color="${DARK}"/>
    </linearGradient>
  </defs>
  <rect width="1024" height="1024" rx="220" fill="url(#g)"/>
  <circle cx="512" cy="500" r="250" fill="none" stroke="#ffffff" stroke-width="46"/>
  <line x1="512" y1="500" x2="512" y2="330" stroke="#ffffff" stroke-width="42" stroke-linecap="round"/>
  <line x1="512" y1="500" x2="636" y2="560" stroke="#ffffff" stroke-width="42" stroke-linecap="round"/>
  <circle cx="512" cy="500" r="30" fill="#ffffff"/>
  <circle cx="700" cy="690" r="120" fill="#22C55E" stroke="#ffffff" stroke-width="24"/>
  <path d="M648 690 l40 42 l72 -82" fill="none" stroke="#ffffff" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;

// Splash: white field, centered small logo mark.
const splashSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="2732" height="2732" viewBox="0 0 2732 2732">
  <rect width="2732" height="2732" fill="#ffffff"/>
  <g transform="translate(1366,1250)">
    <circle cx="0" cy="0" r="230" fill="none" stroke="${BLUE}" stroke-width="42"/>
    <line x1="0" y1="0" x2="0" y2="-160" stroke="${BLUE}" stroke-width="40" stroke-linecap="round"/>
    <line x1="0" y1="0" x2="116" y2="56" stroke="${BLUE}" stroke-width="40" stroke-linecap="round"/>
    <circle cx="0" cy="0" r="28" fill="${BLUE}"/>
  </g>
  <text x="1366" y="1700" font-family="Arial, sans-serif" font-size="150" font-weight="bold" fill="${DARK}" text-anchor="middle">EZ HR</text>
</svg>`;

await sharp(Buffer.from(iconSvg)).png().toFile('assets/icon.png');
await sharp(Buffer.from(splashSvg)).png().toFile('assets/splash.png');
// Dark splash (same, @capacitor/assets prefers one to avoid a warning)
await sharp(Buffer.from(splashSvg.replace('#ffffff', '#0B1220'))).png().toFile('assets/splash-dark.png');
console.log('Wrote assets/icon.png, assets/splash.png, assets/splash-dark.png');
