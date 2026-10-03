const path = require('path');
const { pathToFileURL } = require('url');

function withCommonHeaders(response) {
  response.setHeader('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

async function loadLib() {
  const libPath = path.join(__dirname, '..', 'frontend', 'api', 'lib', 'ryanair.js');
  return import(pathToFileURL(libPath).href);
}

module.exports = async function handler(request, response) {
  withCommonHeaders(response);

  if (request.method === 'OPTIONS') {
    response.status(200).end();
    return;
  }

  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { getMeta } = await loadLib();
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
};
