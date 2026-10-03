// For Vercel: API routes are at /api relative to the site
// For local dev: set VITE_API_BASE_URL in .env.local if you want a different backend
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL 
  ? (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  : '';

function buildApiUrl(path) {
  return `${API_BASE_URL}${path}`;
}

export async function fetchMeta(departureCountry) {
  const params = new URLSearchParams({
    departureCountry,
  });
  const response = await fetch(buildApiUrl(`/api/meta?${params.toString()}`));
  if (!response.ok) {
    throw new Error('Metadaten konnten nicht geladen werden.');
  }

  return response.json();
}

export async function searchFlights(query, force = false) {
  const params = new URLSearchParams({
    departureCountry: query.departureCountry,
    destinationCountry: query.destinationCountry,
    mode: query.mode,
    startDate: query.startDate,
    endDate: query.endDate,
    weekendFlex: query.weekendFlex ? '1' : '0',
    market: 'en-gb',
    language: 'gb',
    currency: 'EUR',
  });

  if (force) {
    params.set('force', '1');
  }

  const response = await fetch(buildApiUrl(`/api/search?${params.toString()}`));
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message || 'Preise konnten nicht geladen werden.');
  }

  return response.json();
}
