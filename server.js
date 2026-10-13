import cors from 'cors';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { getMeta, searchFlights } from './backend/src/ryanair.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

function defaultDateRange() {
  const start = new Date();
  start.setUTCDate(start.getUTCDate() + 1);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 90);

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

app.get('/api/health', (_request, response) => {
  response.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  response.json({ ok: true, now: new Date().toISOString() });
});

app.get('/api/meta', async (request, response) => {
  try {
    response.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    const departureCountry = String(request.query.departureCountry || 'de').toLowerCase();
    const payload = await getMeta(departureCountry, request.query.force === '1');
    response.json(payload);
  } catch (error) {
    response.status(502).json({
      error: 'meta_fetch_failed',
      message: error.message,
    });
  }
});

app.get('/api/search', async (request, response) => {
  const defaults = defaultDateRange();
  const departureCountry = String(request.query.departureCountry || 'de').toLowerCase();
  const destinationCountry = String(request.query.destinationCountry || 'ma').toLowerCase();
  const mode = request.query.mode === 'roundtrip' ? 'roundtrip' : 'oneway';
  const weekendFlex = request.query.weekendFlex === '1' || request.query.weekendFlex === 'true';

  try {
    response.set('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
    const payload = await searchFlights({
      departureCountry,
      destinationCountry,
      mode,
      weekendFlex,
      startDate: String(request.query.startDate || defaults.startDate),
      endDate: String(request.query.endDate || defaults.endDate),
      market: String(request.query.market || 'en-gb'),
      language: String(request.query.language || 'gb'),
      currency: String(request.query.currency || 'EUR'),
      force: request.query.force === '1',
    });

    response.json(payload);
  } catch (error) {
    response.status(502).json({
      error: 'search_failed',
      message: error.message,
    });
  }
});

async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';
  const publicPath = path.resolve(__dirname, 'frontend/public');
  app.use(express.static(publicPath));

  if (!isProduction) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      root: path.resolve(__dirname, 'frontend'),
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'custom',
    });
    app.use(vite.middlewares);

    app.get('*', async (req, res, next) => {
      try {
        const url = req.originalUrl;
        const indexPath = path.resolve(__dirname, 'frontend/index.html');
        let template = await fs.readFile(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  } else {
    const distPath = path.resolve(__dirname, 'frontend/dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
