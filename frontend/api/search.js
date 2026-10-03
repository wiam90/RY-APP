import { searchFlights } from './lib/ryanair.js';

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

export default async function handler(request, response) {
  // CORS & SEO headers
  response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const defaults = defaultDateRange();
  const departureCountry = String(request.query.departureCountry || 'de').toLowerCase();
  const destinationCountry = String(request.query.destinationCountry || 'ma').toLowerCase();
  const mode = request.query.mode === 'roundtrip' ? 'roundtrip' : 'oneway';
  const weekendFlex = request.query.weekendFlex === '1' || request.query.weekendFlex === 'true';

  try {
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

    response.status(200).json(payload);
  } catch (error) {
    console.error('Search request failed:', error);
    response.status(502).json({
      error: 'search_failed',
      message: error.message,
    });
  }
}
