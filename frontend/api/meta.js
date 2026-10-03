import { getMeta } from './lib/ryanair.js';

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

  try {
    const departureCountry = String(request.query.departureCountry || 'de').toLowerCase();
    const force = request.query.force === '1';
    
    const payload = await getMeta(departureCountry, force);
    response.status(200).json(payload);
  } catch (error) {
    console.error('Meta request failed:', error);
    response.status(502).json({
      error: 'meta_fetch_failed',
      message: error.message,
    });
  }
}
