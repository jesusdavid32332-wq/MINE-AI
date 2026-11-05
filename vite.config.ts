import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

function minesApiPlugin(): Plugin {
  return {
    name: 'mines-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/health' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ status: 'ok', service: 'MINES AI Backend' }));
          return;
        }

        if (req.url === '/api/win10k-info' && req.method === 'GET') {
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              platform: 'WIN10K (win10kk.com)',
              official_api_available: false,
              architecture: 'Provably Fair HMAC-SHA256 (Server Seed + Client Seed + Nonce)',
              investigation_result:
                'WIN10K no dispone de una API pública o autorizada para consultar casillas ocultas en partidas activas. La arquitectura criptográfica mantiene el Server Seed oculto hasta finalizar la ronda para prevenir manipulaciones. MINES AI opera legítimamente mediante captura de pantalla asistida por visión y registro manual de eventos auténticos.',
              honest_disclaimer:
                'MINES AI no realiza trampas ni hacks. Calcula probabilidades condicionales matemáticas exactas basadas en la configuración del juego y analiza la distribución empírica de partidas guardadas por el usuario.',
            })
          );
          return;
        }

        if (req.url === '/api/analyze-screenshot' && req.method === 'POST') {
          let body = '';
          req.on('data', (chunk) => {
            body += chunk;
          });
          req.on('end', async () => {
            try {
              const { imageBase64, mimeType, mineCount } = JSON.parse(body);
              if (!imageBase64) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'La imagen base64 es requerida' }));
                return;
              }

              // Dynamically import the geminiService
              const { analyzeMinesScreenshot } = await import('./server/geminiService.ts');
              const analysis = await analyzeMinesScreenshot(imageBase64, mimeType, mineCount);

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(analysis));
            } catch (err: unknown) {
              console.error('Error analyzing screenshot:', err);
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(
                JSON.stringify({
                  error: err instanceof Error ? err.message : 'Error desconocido al analizar la captura',
                })
              );
            }
          });
          return;
        }

        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    define: {
      'process.env': {},
    },
    plugins: [react(), tailwindcss(), minesApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});

