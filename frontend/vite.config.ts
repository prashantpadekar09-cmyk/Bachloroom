import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const repoRoot = path.resolve(__dirname, '..');
  const env = loadEnv(mode, repoRoot, '');
  const googleClientId = env.VITE_GOOGLE_CLIENT_ID || env.GOOGLE_CLIENT_ID || '';
  const apiProxyTarget = (env.VITE_API_PROXY_TARGET || env.API_PROXY_TARGET || '').trim();
  const apiProxyPort = (env.API_PORT || env.PORT || '3000').trim();
  const resolvedApiProxyTarget = apiProxyTarget || `http://localhost:${apiProxyPort}`;
  return {
    root: __dirname,
    envDir: repoRoot,
    plugins: [react(), tailwindcss()],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'import.meta.env.VITE_GOOGLE_CLIENT_ID': JSON.stringify(googleClientId),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'motion/react'],
    },
    server: {
      host: true,
      allowedHosts: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      proxy: {
        '/api': {
          target: resolvedApiProxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
