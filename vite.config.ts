import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import fs from 'fs';
import type { Plugin } from 'vite';

// White-label build step (see src/config/brand.ts). With no VITE_APP_NAME /
// VITE_SKIP_LANDING set, the output is unchanged.
function brandPlugin(env: Record<string, string>): Plugin {
  const name = (env.VITE_APP_NAME || '').trim();
  const shortName = (env.VITE_APP_SHORT_NAME || '').trim() || name;
  const skipLanding = (env.VITE_SKIP_LANDING || '').trim().toLowerCase() === 'true';
  const esc = (v: string) => v.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  let outDir = 'dist';
  return {
    name: 'openhr-brand',
    configResolved(cfg) { outDir = cfg.build.outDir; },
    transformIndexHtml(html) {
      let out = html;
      if (name) {
        out = out
          .replace(/<title>[^<]*<\/title>/, `<title>${esc(name)}</title>`)
          .replace(/(<meta name="apple-mobile-web-app-title" content=")[^"]*"/, `$1${esc(shortName)}"`);
      }
      // The static landing preview in index.html would flash before React mounts.
      if (skipLanding) out = out.replace('</head>', '<style>#static-hero{display:none}</style></head>');
      return out;
    },
    closeBundle() {
      if (!name) return;
      const file = path.resolve(outDir, 'manifest.json');
      if (!fs.existsSync(file)) return;
      const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
      manifest.name = name;
      manifest.short_name = shortName;
      manifest.description = name;
      fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
    },
  };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      build: {
        minify: 'esbuild',
      },
      esbuild: {
        pure: mode === 'production' ? ['console.log', 'console.warn'] : [],
      },
      plugins: [
        brandPlugin(env),
        tailwindcss(),
        react(),
        VitePWA({
          registerType: 'prompt',
          injectRegister: 'inline',
          manifest: false,
          strategies: 'injectManifest',
          srcDir: 'src',
          filename: 'sw.ts',
          injectManifest: {
            globPatterns: ['**/*.{js,css,html,ico,svg,woff2,webp,png}'],
            globIgnores: ['db-migrate.html'],
            maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
          },
        }),
      ],
      resolve: {
        alias: {
          '@': path.resolve(process.cwd(), './src'),
        }
      }
    };
});
