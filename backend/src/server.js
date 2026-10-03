import cors from 'cors';
import express from 'express';
import { getMeta, searchFlights } from './ryanair.js';

const app = express();
const PORT = process.env.PORT || 8787;

function getAllowedOrigins() {
  const rawOrigins = process.env.CORS_ORIGIN || '';

  return rawOrigins
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

const allowedOrigins = getAllowedOrigins();

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by CORS'));
    },
  })
);
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

app.listen(PORT, () => {
  console.log(`Ryanair API proxy listening on port ${PORT}`);
});
