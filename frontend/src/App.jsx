import { useEffect, useState } from 'react';
import { Analytics } from '@vercel/analytics/react';
import { fetchMeta, searchFlights } from './api.js';

const AUTO_REFRESH_MS = 5 * 60 * 1000;
const RANGE_PRESETS = [30, 60, 90];
const LANGUAGE_OPTIONS = [
  { value: 'de', label: 'DE' },
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
];
const LOCALES = {
  de: 'de-DE',
  en: 'en-GB',
  es: 'es-ES',
};

const TEXT = {
  de: {
    eyebrow: 'Ryanair Fare Finder',
    title: 'Ryanair App - Wiam',
    heroCopy:
      'Wähle Abflug- und Zielland, filtere dynamisch nach Abflugstadt und sieh je Flughafen die günstigsten Tage zuerst - inklusive passender Rückflüge im selben Zeitraum.',
    language: 'Sprache',
    filters: 'Filter',
    refreshPrices: 'Preise aktualisieren',
    refreshing: 'Aktualisiert…',
    departureCountry: 'Abflugland',
    destinationCountry: 'Zielland',
    searchMode: 'Suchmodus',
    oneWay: 'One Way',
    roundtrip: 'Wochenendtrip',
    weekend: 'Wochenende',
    weekendFlex: '+/- 2 Tage',
    timeRange: 'Zeitraum',
    custom: 'Benutzerdefiniert',
    nextDays: 'Nächste {days} Tage',
    month: 'Monat',
    noMonthFilter: 'Kein Monatsfilter',
    from: 'Von',
    to: 'Bis',
    filterByAirport: 'Nach Flughafen filtern',
    airportPlaceholder: 'z. B. Berlin, Köln, Marrakesch',
    loadedAt: 'Zuletzt geladen: {value}',
    refreshFailed: 'Letzte Hintergrundaktualisierung fehlgeschlagen: {message}',
    departureAirportsForCountry: 'Verfügbare Startflughäfen in {country}: {count}.',
    loading: 'Preise werden geladen…',
    noAirportMatches: 'Keine Flughäfen passen aktuell zu deinem Filter.',
    noFlightsForDirection: 'Für diese Richtung wurden aktuell keine passenden Flüge gefunden.',
    cheapestDay: 'Günstigster Tag',
    matches: 'Treffer',
    outbound: 'Hinflug',
    inbound: 'Rückflug',
    tripDays: 'Trip {days} Tage',
    flight: 'Flug',
    bookNow: 'Direkt buchen',
    airports: 'Abflughäfen',
    noDataYet: 'Noch keine Daten geladen',
    fromCountryToCountry: '{from} nach {to}',
    cheapestFlightsFromCountryToCountry: 'Günstigste Flüge von {from} nach {to}',
    noIndexTitle: 'Ryanair App - Wiam',
    footer: 'Diese App ist Open Source und nicht für kommerzielle Verwendung lizenziert.',
  },
  en: {
    eyebrow: 'Ryanair Fare Finder',
    title: 'Ryanair App - Wiam',
    heroCopy:
      'Choose a departure and destination country, filter dynamically by departure airport and see the cheapest days first for each airport - including matching return flights within the same date range.',
    language: 'Language',
    filters: 'Filters',
    refreshPrices: 'Refresh prices',
    refreshing: 'Refreshing…',
    departureCountry: 'Departure country',
    destinationCountry: 'Destination country',
    searchMode: 'Search mode',
    oneWay: 'One Way',
    roundtrip: 'Weekend trip',
    weekend: 'Weekend',
    weekendFlex: '+/- 2 days',
    timeRange: 'Time range',
    custom: 'Custom',
    nextDays: 'Next {days} days',
    month: 'Month',
    noMonthFilter: 'No month filter',
    from: 'From',
    to: 'To',
    filterByAirport: 'Filter by airport',
    airportPlaceholder: 'e.g. Berlin, Cologne, Marrakesh',
    loadedAt: 'Last updated: {value}',
    refreshFailed: 'Last background refresh failed: {message}',
    departureAirportsForCountry: 'Available departure airports in {country}: {count}.',
    loading: 'Loading prices…',
    noAirportMatches: 'No airports match your current filter.',
    noFlightsForDirection: 'No matching flights were found for this direction right now.',
    cheapestDay: 'Cheapest day',
    matches: 'matches',
    outbound: 'Outbound',
    inbound: 'Return',
    tripDays: 'Trip {days} days',
    flight: 'Flight',
    bookNow: 'Book now',
    airports: 'departure airports',
    noDataYet: 'No data loaded yet',
    fromCountryToCountry: '{from} to {to}',
    cheapestFlightsFromCountryToCountry: 'Cheapest flights from {from} to {to}',
    noIndexTitle: 'Ryanair App - Wiam',
    footer: 'This app is open source and not licensed for commercial use.',
  },
  es: {
    eyebrow: 'Ryanair Fare Finder',
    title: 'Ryanair App - Wiam',
    heroCopy:
      'Elige un país de salida y otro de destino, filtra dinámicamente por aeropuerto de salida y consulta primero los días más baratos para cada aeropuerto, incluyendo vuelos de regreso dentro del mismo periodo.',
    language: 'Idioma',
    filters: 'Filtros',
    refreshPrices: 'Actualizar precios',
    refreshing: 'Actualizando…',
    departureCountry: 'País de salida',
    destinationCountry: 'País de destino',
    searchMode: 'Modo de búsqueda',
    oneWay: 'Solo ida',
    roundtrip: 'Viaje de fin de semana',
    weekend: 'Fin de semana',
    weekendFlex: '+/- 2 días',
    timeRange: 'Periodo',
    custom: 'Personalizado',
    nextDays: 'Próximos {days} días',
    month: 'Mes',
    noMonthFilter: 'Sin filtro mensual',
    from: 'Desde',
    to: 'Hasta',
    filterByAirport: 'Filtrar por aeropuerto',
    airportPlaceholder: 'p. ej. Berlín, Colonia, Marrakech',
    loadedAt: 'Última actualización: {value}',
    refreshFailed: 'La última actualización en segundo plano falló: {message}',
    departureAirportsForCountry: 'Aeropuertos de salida disponibles en {country}: {count}.',
    loading: 'Cargando precios…',
    noAirportMatches: 'Ningún aeropuerto coincide con tu filtro actual.',
    noFlightsForDirection: 'No se encontraron vuelos adecuados para esta dirección en este momento.',
    cheapestDay: 'Día más barato',
    matches: 'resultados',
    outbound: 'Ida',
    inbound: 'Vuelta',
    tripDays: 'Viaje de {days} días',
    flight: 'Vuelo',
    bookNow: 'Reservar ahora',
    airports: 'aeropuertos de salida',
    noDataYet: 'Todavía no hay datos cargados',
    fromCountryToCountry: '{from} a {to}',
    cheapestFlightsFromCountryToCountry: 'Vuelos más baratos de {from} a {to}',
    noIndexTitle: 'Ryanair App - Wiam',
    footer: 'Esta aplicación es de código abierto y no está licenciada para uso comercial.',
  },
};

function formatTemplate(template, values = {}) {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  );
}

function getLocale(language) {
  return LOCALES[language] || LOCALES.de;
}

function formatDateInput(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function createDefaultDates() {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + 90);

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
}

function applyRangePreset(days) {
  const start = new Date();
  start.setDate(start.getDate() + 1);
  const end = new Date(start);
  end.setDate(end.getDate() + days);

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
}

function createMonthOptions(language, count = 8) {
  const options = [];
  const now = new Date();
  const baseYear = now.getFullYear();
  const baseMonth = now.getMonth();

  for (let index = 0; index < count; index += 1) {
    const date = new Date(baseYear, baseMonth + index, 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    const value = `${year}-${String(month + 1).padStart(2, '0')}`;
    const label = new Intl.DateTimeFormat(getLocale(language), {
      month: 'long',
      year: 'numeric',
    }).format(date);

    options.push({ value, label });
  }

  return options;
}

function applyMonthPreset(monthValue) {
  const [year, month] = monthValue.split('-').map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);

  return {
    startDate: formatDateInput(start),
    endDate: formatDateInput(end),
  };
}

function formatPrice(value, language) {
  return new Intl.NumberFormat(getLocale(language), {
    style: 'currency',
    currency: 'EUR',
  }).format(value);
}

function formatDate(value, language) {
  return new Intl.DateTimeFormat(getLocale(language), {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatTimestamp(value, language) {
  return new Intl.DateTimeFormat(getLocale(language), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(value));
}

function getCountryName(countryCode, language) {
  try {
    return (
      new Intl.DisplayNames([getLocale(language)], { type: 'region' }).of(countryCode.toUpperCase()) ||
      countryCode.toUpperCase()
    );
  } catch {
    return countryCode.toUpperCase();
  }
}

function getTranslatedText(language, key, values) {
  const text = TEXT[language]?.[key] ?? TEXT.de[key] ?? key;
  return values ? formatTemplate(text, values) : text;
}

function getSectionCopy(section, language) {
  const from = getCountryName(section.departureCountry, language);
  const to = getCountryName(section.arrivalCountry, language);

  return {
    title: getTranslatedText(language, 'fromCountryToCountry', { from, to }),
    description: getTranslatedText(language, 'cheapestFlightsFromCountryToCountry', { from, to }),
  };
}

function sortCountries(countries, language) {
  const priority = ['de', 'ma', 'es'];

  return [...countries].sort((left, right) => {
    const leftPriority = priority.indexOf(left.code);
    const rightPriority = priority.indexOf(right.code);

    if (leftPriority !== -1 || rightPriority !== -1) {
      if (leftPriority === -1) {
        return 1;
      }
      if (rightPriority === -1) {
        return -1;
      }
      return leftPriority - rightPriority;
    }

    return getCountryName(left.code, language).localeCompare(getCountryName(right.code, language), getLocale(language));
  });
}

function filterSections(sections, term) {
  const needle = term.trim().toLowerCase();
  if (!needle) {
    return sections;
  }

  return sections
    .map((section) => ({
      ...section,
      groups: section.groups.filter((group) => {
        const haystack = [
          group.departureAirport.cityName,
          group.departureAirport.name,
          group.departureAirport.iataCode,
        ]
          .join(' ')
          .toLowerCase();
        return haystack.includes(needle);
      }),
    }))
    .filter((section) => section.groups.length > 0);
}

function FlightItem({ flight, language }) {
  return (
    <article className="flight-item">
      <div>
        <p className="flight-route">
          {flight.departureAirport.cityName} ({flight.departureAirport.iataCode}) → {flight.arrivalAirport.cityName} ({flight.arrivalAirport.iataCode})
        </p>
        <p className="flight-dates">
          {getTranslatedText(language, 'outbound')}: {formatDate(flight.outboundDate, language)}
          {flight.inboundDate ? ` | ${getTranslatedText(language, 'inbound')}: ${formatDate(flight.inboundDate, language)}` : ''}
        </p>
        <p className="flight-meta">
          {flight.mode === 'roundtrip'
            ? getTranslatedText(language, 'tripDays', { days: flight.durationDays })
            : getTranslatedText(language, 'oneWay')}{' '}
          | {getTranslatedText(language, 'flight')} {flight.flightNumber}
        </p>
      </div>
      <div className="flight-actions">
        <span className="price-pill">{formatPrice(flight.totalPrice, language)}</span>
        <a className="booking-link" href={flight.bookingUrl} target="_blank" rel="noreferrer">
          {getTranslatedText(language, 'bookNow')}
        </a>
      </div>
    </article>
  );
}

function AirportAccordion({ group, expanded, language, onToggle }) {
  return (
    <section className={`airport-group ${expanded ? 'open' : ''}`}>
      <button className="airport-toggle" onClick={onToggle} type="button">
        <div>
          <p className="airport-city">{group.departureAirport.cityName}</p>
          <p className="airport-name">
            {group.departureAirport.name} · {group.departureAirport.iataCode}
          </p>
        </div>
        <div className="airport-preview">
          <span className="preview-badge">{getTranslatedText(language, 'cheapestDay')}</span>
          <strong>{formatDate(group.previewFlight.outboundDate, language)}</strong>
          <span>
            {group.previewFlight.arrivalAirport.cityName} · {group.totalFlights} {getTranslatedText(language, 'matches')}
          </span>
          <span className="price-pill preview-price">{formatPrice(group.previewFlight.totalPrice, language)}</span>
        </div>
      </button>
      {expanded ? (
        <div className="airport-flights">
          {group.flights.map((flight) => (
            <FlightItem key={flight.id} flight={flight} language={language} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

export default function App() {
  const defaults = createDefaultDates();
  const [language, setLanguage] = useState('de');
  const [query, setQuery] = useState({
    departureCountry: 'de',
    destinationCountry: 'ma',
    mode: 'oneway',
    weekendFlex: false,
    startDate: defaults.startDate,
    endDate: defaults.endDate,
  });
  const [rangePreset, setRangePreset] = useState('90');
  const [monthPreset, setMonthPreset] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [meta, setMeta] = useState(null);
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [refreshError, setRefreshError] = useState('');

  const monthOptions = createMonthOptions(language);

  async function loadMeta() {
    const payload = await fetchMeta(query.departureCountry);
    setMeta(payload);
    setQuery((current) => {
      const nextDepartureCountry = payload.defaultDepartureCountry || current.departureCountry;
      const availableCountries = payload.destinationCountries ?? [];
      const isCurrentCountryValid = availableCountries.some(
        (country) => country.code === current.destinationCountry
      );

      if (isCurrentCountryValid) {
        return {
          ...current,
          departureCountry: nextDepartureCountry,
        };
      }

      return {
        ...current,
        departureCountry: nextDepartureCountry,
        destinationCountry: payload.defaultDestinationCountry || availableCountries[0]?.code || 'ma',
      };
    });
  }

  async function loadResults(options = {}) {
    const { force = false, silent = false } = options;

    if (silent) {
      setRefreshing(true);
      setRefreshError('');
    } else {
      setLoading(true);
      setError('');
    }

    try {
      const payload = await searchFlights(query, force);
      setData(payload);
    } catch (loadError) {
      if (silent) {
        setRefreshError(loadError.message);
      } else {
        setError(loadError.message);
      }
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  }

  useEffect(() => {
    loadMeta().catch(() => {
      setMeta(null);
    });
  }, [query.departureCountry]);

  useEffect(() => {
    loadResults();
  }, [query.departureCountry, query.destinationCountry, query.mode, query.weekendFlex, query.startDate, query.endDate]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      loadResults({ force: true, silent: true });
    }, AUTO_REFRESH_MS);

    return () => window.clearInterval(intervalId);
  }, [query.departureCountry, query.destinationCountry, query.mode, query.weekendFlex, query.startDate, query.endDate]);

  let visibleSections = filterSections(data?.sections ?? [], cityFilter);
  // Beim Wochenendtrip: nur die Hinflug-Richtung anzeigen und nach Wochentagen filtern
  if (query.mode === 'roundtrip') {
    // Wochenendtage: 5 = Freitag, 6 = Samstag, 0 = Sonntag
    // Mit +/- 2 Tage: 4 = Donnerstag bis 1 = Montag
    const allowedDays = query.weekendFlex ? [4, 5, 6, 0, 1] : [5, 6, 0];
    
    visibleSections = visibleSections
      .filter((section) => {
        // Behalte nur Sections, die vom Abflugland zum Zielland gehen
        return section.departureCountry === query.departureCountry && section.arrivalCountry === query.destinationCountry;
      })
      .map((section) => ({
        ...section,
        groups: section.groups
          .map((group) => ({
            ...group,
            flights: group.flights.filter((flight) => {
              const outboundDay = new Date(flight.outboundDate).getDay();
              const inboundDay = new Date(flight.inboundDate).getDay();
              
              return allowedDays.includes(outboundDay) && allowedDays.includes(inboundDay);
            }),
          }))
          .filter((group) => group.flights.length > 0), // Entferne Groups ohne Flights
      }))
      .filter((section) => section.groups.length > 0); // Entferne Sections ohne Groups
  }
  const availableDepartureAirports = meta?.departureAirportCount ?? 0;
  const departureCountries = sortCountries(meta?.departureCountries ?? [], language);
  const destinationCountries = sortCountries(meta?.destinationCountries ?? [], language);
  const selectedDepartureName = getCountryName(query.departureCountry, language);
  const t = (key, values) => getTranslatedText(language, key, values);

  const swapCountries = () => {
    setQuery((current) => ({
      ...current,
      departureCountry: current.destinationCountry,
      destinationCountry: current.departureCountry,
    }));
  };

  return (
    <div className="page-shell">
      <header className="hero">
        <div className="hero-topbar">
          <p className="eyebrow">{t('eyebrow')}</p>
          <label className="language-switcher">
            <span>{t('language')}</span>
            <select value={language} onChange={(event) => setLanguage(event.target.value)}>
              {LANGUAGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </label>
        </div>
        <h1>{t('title')}</h1>
        <p className="hero-copy">{t('heroCopy')}</p>
      </header>

      <main className="content-grid">
        <section className="panel filter-panel">
          <div className="panel-header">
            <h2>{t('filters')}</h2>
            <button className="secondary-button" type="button" onClick={() => loadResults({ force: true })} disabled={loading || refreshing}>
              {refreshing ? t('refreshing') : t('refreshPrices')}
            </button>
          </div>

          <div className="form-grid">
            <div className="country-swap-wrapper">
              <label>
                {t('departureCountry')}
                <select
                  value={query.departureCountry}
                  onChange={(event) =>
                    setQuery((current) => ({
                      ...current,
                      departureCountry: event.target.value,
                    }))
                  }
                >
                  {departureCountries.map((country) => (
                    <option key={country.code} value={country.code}>{getCountryName(country.code, language)}</option>
                  ))}
                </select>
              </label>
              <button className="swap-button" type="button" onClick={swapCountries} title="Swap departure and destination">⇄</button>
              <label>
                {t('destinationCountry')}
                <select
                  value={query.destinationCountry}
                  onChange={(event) => setQuery((current) => ({ ...current, destinationCountry: event.target.value }))}
                >
                  {destinationCountries.map((country) => (
                    <option key={country.code} value={country.code}>{getCountryName(country.code, language)}</option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              {t('searchMode')}
              <select
                value={query.mode}
                onChange={(event) =>
                  setQuery((current) => ({
                    ...current,
                    mode: event.target.value,
                  }))
                }
              >
                <option value="oneway">{t('oneWay')}</option>
                <option value="roundtrip">{t('roundtrip')}</option>
              </select>
            </label>
            <label className="full-width weekend-field">
              {t('weekend')}
              <span className="checkbox-row">
                <input
                  type="checkbox"
                  checked={query.weekendFlex}
                  onChange={(event) =>
                    setQuery((current) => ({
                      ...current,
                      weekendFlex: event.target.checked,
                    }))
                  }
                  disabled={query.mode !== 'roundtrip'}
                />
                <span>{t('weekendFlex')}</span>
              </span>
            </label>
            <label>
              {t('timeRange')}
              <select
                value={rangePreset}
                onChange={(event) => {
                  const value = event.target.value;
                  setRangePreset(value);
                  if (value === 'custom') {
                    return;
                  }

                  const nextDates = applyRangePreset(Number(value));
                  setMonthPreset('');
                  setQuery((current) => ({ ...current, ...nextDates }));
                }}
              >
                <option value="custom">{t('custom')}</option>
                {RANGE_PRESETS.map((days) => (
                  <option key={days} value={String(days)}>{t('nextDays', { days })}</option>
                ))}
              </select>
            </label>
            <label>
              {t('month')}
              <select
                value={monthPreset}
                onChange={(event) => {
                  const value = event.target.value;
                  setMonthPreset(value);
                  if (!value) {
                    return;
                  }

                  const nextDates = applyMonthPreset(value);
                  setRangePreset('custom');
                  setQuery((current) => ({ ...current, ...nextDates }));
                }}
              >
                <option value="">{t('noMonthFilter')}</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>{month.label}</option>
                ))}
              </select>
            </label>
            <div className="date-row full-width">
              <label>
                {t('from')}
                <input
                  type="date"
                  value={query.startDate}
                  onChange={(event) => {
                    setRangePreset('custom');
                    setMonthPreset('');
                    setQuery((current) => ({ ...current, startDate: event.target.value }));
                  }}
                />
              </label>
              <label>
                {t('to')}
                <input
                  type="date"
                  value={query.endDate}
                  onChange={(event) => {
                    setRangePreset('custom');
                    setMonthPreset('');
                    setQuery((current) => ({ ...current, endDate: event.target.value }));
                  }}
                />
              </label>
            </div>
            <label className="full-width">
              {t('filterByAirport')}
              <input
                type="text"
                placeholder={t('airportPlaceholder')}
                value={cityFilter}
                onChange={(event) => setCityFilter(event.target.value)}
              />
            </label>
          </div>

          <div className="status-strip">
            <span>{data ? t('loadedAt', { value: formatTimestamp(data.generatedAt, language) }) : t('noDataYet')}</span>
          </div>
          {refreshError ? <p className="inline-warning">{t('refreshFailed', { message: refreshError })}</p> : null}
          {meta ? (
            <p className="meta-hint">
              {t('departureAirportsForCountry', { country: selectedDepartureName, count: availableDepartureAirports })}
            </p>
          ) : null}
        </section>

        <section className="results-column">
          {loading ? <div className="panel loading-panel">{t('loading')}</div> : null}
          {error ? <div className="panel error-panel">{error}</div> : null}
          {!loading && !error && visibleSections.length === 0 ? (
            <div className="panel empty-panel">{t('noAirportMatches')}</div>
          ) : null}
          {!loading && !error
            ? visibleSections.map((section) => (
                <section key={section.id} className="panel section-panel">
                  <div className="panel-header section-header">
                    <div>
                      <h2>{getSectionCopy(section, language).title}</h2>
                      <p className="section-description">{getSectionCopy(section, language).description}</p>
                    </div>
                    <span>{section.groups.length} {t('airports')}</span>
                  </div>
                  {section.groups.length === 0 ? (
                    <p className="section-empty">{t('noFlightsForDirection')}</p>
                  ) : (
                    section.groups.map((group) => (
                      <AirportAccordion
                        key={group.id}
                        group={group}
                        expanded={Boolean(expanded[group.id])}
                        language={language}
                        onToggle={() =>
                          setExpanded((current) => ({
                            ...current,
                            [group.id]: !current[group.id],
                          }))
                        }
                      />
                    ))
                  )}
                </section>
              ))
            : null}
        </section>
      </main>

      <footer className="app-footer">
        <p>{t('footer')}</p>
      </footer>
      <Analytics />
    </div>
  );
}
