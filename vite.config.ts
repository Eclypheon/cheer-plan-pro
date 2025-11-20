import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(() => ({
    server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/urlshorten/isgd': {
        target: 'https://is.gd',
        changeOrigin: true,
        rewrite: (path) => {
          // Extract query parameters and reconstruct the path properly
          const [basePath, queryString] = path.split('?');
          const newPath = '/create.php' + (queryString ? '?' + queryString : '');
          return newPath;
        },
        configure: (proxy, _options) => {
          // Add headers to make the request look more like a regular browser request
          proxy.on('proxyReq', (proxyReq, req, res) => {
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
            proxyReq.setHeader('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8');
            proxyReq.setHeader('Accept-Language', 'en-US,en;q=0.5');
            proxyReq.setHeader('Accept-Encoding', 'gzip, deflate');
            proxyReq.setHeader('Connection', 'keep-alive');
            proxyReq.setHeader('Upgrade-Insecure-Requests', '1');
            proxyReq.setHeader('Cache-Control', 'max-age=0');
            // Remove potentially suspicious headers
            proxyReq.removeHeader('x-forwarded-for');
            proxyReq.removeHeader('x-forwarded-proto');
            proxyReq.removeHeader('x-forwarded-host');
          });
        }
      },
      '/api/urlshorten/cleanuri': {
        target: 'https://cleanuri.com',
        changeOrigin: true,
        rewrite: (path) => {
          const [basePath, queryString] = path.split('?');
          const newPath = '/api/v1/shorten' + (queryString ? '?' + queryString : '');
          return newPath;
        }
      },
      '/api/urlshorten/shrtcode': {
        target: 'https://api.shrtco.de',
        changeOrigin: true,
        rewrite: (path) => {
          const [basePath, queryString] = path.split('?');
          const newPath = '/v2/shorten' + (queryString ? '?' + queryString : '');
          return newPath;
        }
      },
      '/api/urlshorten/tinyurl': {
        target: 'https://tinyurl.com',
        changeOrigin: true,
        rewrite: (path) => {
          // TinyURL API endpoint for creating short URLs
          const [basePath, queryString] = path.split('?');
          const newPath = '/api-create.php' + (queryString ? '?' + queryString : '');
          return newPath;
        }
      }
    }
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'og-image.png'],
      manifest: {
        name: 'Cheerleading Routine Builder Pro',
        short_name: 'CheerPlan Pro',
        description: 'Professional cheerleading routine planning tool for coaches and athletes',
        theme_color: '#020817',
        background_color: '#020817',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        prefer_related_applications: false,
        icons: [
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'maskable'
          },
          {
            src: 'icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']
      },
      // Disable auto install prompt - we'll handle it manually for mobile only
      disable: false,
      devOptions: {
        enabled: true
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
