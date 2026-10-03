const RYANAIR_BASE = 'https://www.ryanair.com';
const SEARCH_CONCURRENCY = 4;
const DEFAULT_DEPARTURE_COUNTRY = 'de';
const DEFAULT_DESTINATION_BY_DEPARTURE = {
  de: 'ma',
  ma: 'de',
  es: 'de',
};
const COUNTRY_PRIORITY = ['de', 'ma', 'es'];
const COUNTRY_NAMES = new Intl.DisplayNames(['de-DE'], { type: 'region' });

function toIsoDate(value) {
  return value.toISOString().slice(0, 10);
}

function addDays(value, amount) {
  const next = new Date(value);
  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function enumerateDateWindows(startDate, endDate, maxDays = 31) {
  const windows = [];
  let cursor = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  while (cursor <= end) {
    const windowStart = new Date(cursor);
    const windowEnd = addDays(windowStart, maxDays - 1);
    if (windowEnd > end) {
      windowEnd.setTime(end.getTime());
    }

    windows.push({
      startDate: toIsoDate(windowStart),
      endDate: toIsoDate(windowEnd),
    });

    cursor = addDays(windowEnd, 1);
  }

  return windows;
}

function priceValue(price) {
  return Number(price?.value ?? 0);
}

function weekdayIndex(value) {
  return new Date(value).getUTCDay();
}

function cacheGet(key) {
  void key;
  return null;
}

function cacheSet(key, value, ttl) {
  void key;
  void ttl;
  return value;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Ryanair request failed: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

async function mapWithLimit(items, limit, iteratee) {
  const results = [];
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const currentIndex = cursor;
      cursor += 1;
      results[currentIndex] = await iteratee(items[currentIndex], currentIndex);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function normalizeAirportRecord(record) {
  return {
    iataCode: record.iataCode,
    name: record.name,
    cityName: record.city?.name ?? record.name,
    seoName: record.seoName,
    countryCode: record.countryCode,
    timeZone: record.timeZone,
    coordinates: record.coordinates,
  };
}

async function getAirports(force = false) {
  const cacheKey = 'airports';
  if (!force) {
    const cached = cacheGet(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const url = `${RYANAIR_BASE}/api/views/locate/3/airports/en/active`;
  const payload = await fetchJson(url);
  const airports = payload
    .map(normalizeAirportRecord);

  return cacheSet(cacheKey, airports);
}

function getCountryName(countryCode) {
  try {
    return COUNTRY_NAMES.of(countryCode.toUpperCase()) ?? countryCode.toUpperCase();
  } catch {
    return countryCode.toUpperCase();
  }
}

function slugifyCountryName(value) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function sortCountryCodes(codes) {
  return [...codes].sort((left, right) => {
    const leftPriority = COUNTRY_PRIORITY.indexOf(left);
    const rightPriority = COUNTRY_PRIORITY.indexOf(right);

    if (leftPriority !== -1 || rightPriority !== -1) {
      if (leftPriority === -1) {
        return 1;
      }
      if (rightPriority === -1) {
        return -1;
      }
      return leftPriority - rightPriority;
    }

    return getCountryName(left).localeCompare(getCountryName(right), 'de');
  });
}

function buildSectionDefinitions(departureCountry, destinationCountry) {
  const departureName = getCountryName(departureCountry);
  const destinationName = getCountryName(destinationCountry);
  const departureSlug = slugifyCountryName(departureName);
  const destinationSlug = slugifyCountryName(destinationName);

  return [
    {
      id: `${departureSlug}-nach-${destinationSlug}`,
      title: `${departureName} nach ${destinationName}`,
      description: `Günstigste Flüge von ${departureName} nach ${destinationName}`,
      departureCountry,
      arrivalCountry: destinationCountry,
    },
    {
      id: `${destinationSlug}-nach-${departureSlug}`,
      title: `${destinationName} nach ${departureName}`,
      description: `Günstigste Rückflüge von ${destinationName} nach ${departureName}`,
      departureCountry: destinationCountry,
      arrivalCountry: departureCountry,
    },
  ];
}

function getSectionDefinition(sectionDefinitions, departureCountryCode, arrivalCountryCode) {
  return (
    sectionDefinitions.find(
      (section) =>
        section.departureCountry === departureCountryCode && section.arrivalCountry === arrivalCountryCode
    ) ?? null
  );
}

async function getRoutesForDeparture(departureCode, force = false) {
  const cacheKey = `routes:${departureCode}`;
  if (!force) {
    const cached = cacheGet(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const url = `${RYANAIR_BASE}/api/views/locate/searchWidget/routes/en/airport/${departureCode}`;
  const payload = await fetchJson(url);
  const routes = payload.map((route) => ({
    iataCode: route.arrivalAirport.code,
    name: route.arrivalAirport.name,
    cityName: route.arrivalAirport.city?.name ?? route.arrivalAirport.name,
    countryCode: route.arrivalAirport.country.code,
    seoName: route.arrivalAirport.seoName,
  }));

  return cacheSet(cacheKey, routes);
}

async function getEligibleNetwork(departureCountry, destinationCountry, force = false) {
  const airports = await getAirports(force);
  const relevantCountries = new Set([departureCountry, destinationCountry]);
  const departures = airports.filter((airport) => relevantCountries.has(airport.countryCode));
  const routesPerDeparture = await mapWithLimit(departures, SEARCH_CONCURRENCY, async (airport) => {
    const routes = await getRoutesForDeparture(airport.iataCode, force);
    const allowedCountries = new Set(
      airport.countryCode === departureCountry ? [destinationCountry] : [departureCountry]
    );
    const arrivals = routes.filter((route) => allowedCountries.has(route.countryCode));

    return {
      departureAirport: airport,
      arrivals,
      arrivalCodes: new Set(arrivals.map((route) => route.iataCode)),
      arrivalMap: new Map(arrivals.map((route) => [route.iataCode, route])),
    };
  });

  const filtered = routesPerDeparture.filter((entry) => entry.arrivals.length > 0);

  return {
    airports,
    departures: filtered,
  };
}

async function getDepartureCountries(force = false) {
  const cacheKey = 'departure-countries';
  if (!force) {
    const cached = cacheGet(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const airports = await getAirports(force);
  const countries = sortCountryCodes(Array.from(new Set(airports.map((airport) => airport.countryCode)))).map(
    (code) => ({ code, name: getCountryName(code) })
  );

  return cacheSet(cacheKey, countries);
}

async function getDestinationCountries(departureCountry, force = false) {
  const cacheKey = `destination-countries:${departureCountry}`;
  if (!force) {
    const cached = cacheGet(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const airports = await getAirports(force);
  const departureAirports = airports.filter((airport) => airport.countryCode === departureCountry);
  const routesPerDeparture = await mapWithLimit(departureAirports, SEARCH_CONCURRENCY, async (airport) => {
    const routes = await getRoutesForDeparture(airport.iataCode, force);
    return routes;
  });

  const destinationCodes = new Set();
  for (const routes of routesPerDeparture) {
    for (const route of routes) {
      if (route.countryCode !== departureCountry) {
        destinationCodes.add(route.countryCode);
      }
    }
  }

  const destinations = sortCountryCodes(Array.from(destinationCodes)).map((code) => ({
    code,
    name: getCountryName(code),
  }));

  return cacheSet(cacheKey, destinations);
}

function buildSearchUrl(params) {
  const query = new URLSearchParams({
    adultPaxCount: '1',
    market: params.market,
    language: params.language,
    currency: params.currency,
    ...params.extra,
  });

  return `${RYANAIR_BASE}${params.path}?${query.toString()}`;
}

function buildBookingUrl(flight, language) {
  const base = `https://www.ryanair.com/${language}/en/trip/flights/select`;
  const query = new URLSearchParams({
    adults: '1',
    teens: '0',
    children: '0',
    infants: '0',
    originIata: flight.departureAirport.iataCode,
    destinationIata: flight.arrivalAirport.iataCode,
    dateOut: flight.outboundDate.slice(0, 10),
    isReturn: flight.mode === 'roundtrip' ? 'true' : 'false',
  });

  if (flight.mode === 'roundtrip' && flight.inboundDate) {
    query.set('dateIn', flight.inboundDate.slice(0, 10));
  }

  return `${base}?${query.toString()}`;
}

function normalizeOneWayFare(fare, section, metadataAirport, language) {
  const outbound = fare.outbound;
  const normalized = {
    id: outbound.flightKey,
    mode: 'oneway',
    section,
    departureAirport: {
      iataCode: outbound.departureAirport.iataCode,
      name: outbound.departureAirport.name,
      cityName: outbound.departureAirport.city?.name ?? metadataAirport.cityName,
      countryCode: outbound.departureAirport.city?.countryCode ?? metadataAirport.countryCode,
    },
    arrivalAirport: {
      iataCode: outbound.arrivalAirport.iataCode,
      name: outbound.arrivalAirport.name,
      cityName: outbound.arrivalAirport.city?.name ?? outbound.arrivalAirport.name,
      countryCode: outbound.arrivalAirport.city?.countryCode ?? null,
    },
    outboundDate: outbound.departureDate,
    inboundDate: null,
    durationDays: null,
    totalPrice: priceValue(fare.summary?.price ?? outbound.price),
    outboundPrice: priceValue(outbound.price),
    inboundPrice: null,
    priceUpdated: outbound.priceUpdated,
    flightNumber: outbound.flightNumber,
    bookingUrl: '',
  };

  normalized.bookingUrl = buildBookingUrl(normalized, language);
  return normalized;
}

function normalizeRoundTripFare(fare, section, metadataAirport, language) {
  const outbound = fare.outbound;
  const inbound = fare.inbound;
  const normalized = {
    id: `${outbound.flightKey}:${inbound.flightKey}`,
    mode: 'roundtrip',
    section,
    departureAirport: {
      iataCode: outbound.departureAirport.iataCode,
      name: outbound.departureAirport.name,
      cityName: outbound.departureAirport.city?.name ?? metadataAirport.cityName,
      countryCode: outbound.departureAirport.city?.countryCode ?? metadataAirport.countryCode,
    },
    arrivalAirport: {
      iataCode: outbound.arrivalAirport.iataCode,
      name: outbound.arrivalAirport.name,
      cityName: outbound.arrivalAirport.city?.name ?? outbound.arrivalAirport.name,
      countryCode: outbound.arrivalAirport.city?.countryCode ?? null,
    },
    outboundDate: outbound.departureDate,
    inboundDate: inbound.departureDate,
    durationDays: fare.tripDurationDays ?? null,
    totalPrice: priceValue(fare.summary?.price),
    outboundPrice: priceValue(outbound.price),
    inboundPrice: priceValue(inbound.price),
    priceUpdated: Math.max(outbound.priceUpdated ?? 0, inbound.priceUpdated ?? 0),
    flightNumber: `${outbound.flightNumber} / ${inbound.flightNumber}`,
    bookingUrl: '',
  };

  normalized.bookingUrl = buildBookingUrl(normalized, language);
  return normalized;
}

function buildRoundTripFromLegs(outboundLeg, inboundLeg, section, language) {
  const outboundDate = new Date(outboundLeg.outboundDate);
  const inboundDate = new Date(inboundLeg.outboundDate);
  const durationDays = Math.round((inboundDate - outboundDate) / (24 * 60 * 60 * 1000));

  const normalized = {
    id: `${outboundLeg.id}:${inboundLeg.id}`,
    mode: 'roundtrip',
    section,
    departureAirport: outboundLeg.departureAirport,
    arrivalAirport: outboundLeg.arrivalAirport,
    outboundDate: outboundLeg.outboundDate,
    inboundDate: inboundLeg.outboundDate,
    durationDays,
    totalPrice: outboundLeg.totalPrice + inboundLeg.totalPrice,
    outboundPrice: outboundLeg.totalPrice,
    inboundPrice: inboundLeg.totalPrice,
    priceUpdated: Math.max(outboundLeg.priceUpdated ?? 0, inboundLeg.priceUpdated ?? 0),
    flightNumber: `${outboundLeg.flightNumber} / ${inboundLeg.flightNumber}`,
    bookingUrl: '',
  };

  normalized.bookingUrl = buildBookingUrl(normalized, language);
  return normalized;
}

function matchesWeekendPattern(outboundDate, inboundDate, durationDays, weekendFlex) {
  const outboundWeekday = weekdayIndex(outboundDate);
  const inboundWeekday = inboundDate ? weekdayIndex(inboundDate) : null;
  const normalizedDuration = Number(durationDays ?? 0);

  if (inboundWeekday === null) {
    return true;
  }

  const outboundDays = weekendFlex ? [2, 3, 4, 5, 6] : [4, 5, 6];
  const inboundDays = weekendFlex ? [0, 1, 2, 3] : [0, 1];
  const maxDuration = weekendFlex ? 5 : 3;

  return (
    outboundDays.includes(outboundWeekday) &&
    inboundDays.includes(inboundWeekday) &&
    normalizedDuration >= 1 &&
    normalizedDuration <= maxDuration
  );
}

function groupFlights(flights, sectionDefinitions) {
  const grouped = new Map(sectionDefinitions.map((section) => [section.id, new Map()]));

  for (const flight of flights) {
    const sectionMap = grouped.get(flight.section);
    if (!sectionMap) {
      continue;
    }
    if (!sectionMap.has(flight.departureAirport.iataCode)) {
      sectionMap.set(flight.departureAirport.iataCode, {
        id: `${flight.section}-${flight.departureAirport.iataCode}`,
        section: flight.section,
        departureAirport: flight.departureAirport,
        previewFlight: null,
        lowestPrice: Number.POSITIVE_INFINITY,
        totalFlights: 0,
        flights: [],
      });
    }

    const entry = sectionMap.get(flight.departureAirport.iataCode);
    entry.flights.push(flight);
    entry.totalFlights += 1;
  }

  return sectionDefinitions.map((section) => {
    const map = grouped.get(section.id) ?? new Map();
    const groups = Array.from(map.values())
      .map((group) => {
        group.flights.sort((left, right) => {
          if (left.totalPrice !== right.totalPrice) {
            return left.totalPrice - right.totalPrice;
          }
          return new Date(left.outboundDate) - new Date(right.outboundDate);
        });
        group.previewFlight = group.flights[0] ?? null;
        group.lowestPrice = group.previewFlight?.totalPrice ?? 0;
        return group;
      })
      .sort((left, right) => {
        if (left.lowestPrice !== right.lowestPrice) {
          return left.lowestPrice - right.lowestPrice;
        }
        return left.departureAirport.cityName.localeCompare(right.departureAirport.cityName, 'de');
      });

    return {
      id: section.id,
      title: section.title,
      description: section.description,
      departureCountry: section.departureCountry,
      arrivalCountry: section.arrivalCountry,
      groups,
    };
  });
}

async function searchOneWay(network, options, sectionDefinitions) {
  const legs = await fetchOneWayLegs(network, options, sectionDefinitions);

  return legs;
}

async function fetchOneWayLegs(network, options, sectionDefinitions) {
  const departures = network.departures;
  const searchResults = await mapWithLimit(departures, SEARCH_CONCURRENCY, async (entry) => {
    const windows = enumerateDateWindows(options.startDate, options.endDate);
    const dedupedFlights = new Map();

    for (const window of windows) {
      const url = buildSearchUrl({
        path: '/api/farfnd/v4/oneWayFares',
        market: options.market,
        language: options.language,
        currency: options.currency,
        extra: {
          departureAirportIataCode: entry.departureAirport.iataCode,
          outboundDepartureDateFrom: window.startDate,
          outboundDepartureDateTo: window.endDate,
        },
      });

      const payload = await fetchJson(url);
      for (const fare of payload.fares ?? []) {
        if (!entry.arrivalCodes.has(fare.outbound.arrivalAirport.iataCode)) {
          continue;
        }

        const route = entry.arrivalMap.get(fare.outbound.arrivalAirport.iataCode);
        const section = getSectionDefinition(
          sectionDefinitions,
          entry.departureAirport.countryCode,
          route?.countryCode
        );
        if (!section) {
          continue;
        }

        const normalized = normalizeOneWayFare(fare, section.id, entry.departureAirport, options.language);
        dedupedFlights.set(normalized.id, normalized);
      }
    }

    return Array.from(dedupedFlights.values());
  });

  return searchResults.flat();
}

function buildTripWindow(startDate, endDate, weekendFlex) {
  const start = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);

  return {
    inboundFrom: toIsoDate(addDays(start, 1)),
    inboundTo: toIsoDate(addDays(end, weekendFlex ? 5 : 3)),
  };
}

async function searchRoundTrip(network, options, sectionDefinitions) {
  const tripWindow = buildTripWindow(options.startDate, options.endDate, options.weekendFlex);
  const outboundLegs = await fetchOneWayLegs(
    network,
    {
      startDate: options.startDate,
      endDate: options.endDate,
      market: options.market,
      language: options.language,
      currency: options.currency,
    },
    sectionDefinitions
  );
  const inboundLegs = await fetchOneWayLegs(
    network,
    {
      startDate: tripWindow.inboundFrom,
      endDate: tripWindow.inboundTo,
      market: options.market,
      language: options.language,
      currency: options.currency,
    },
    sectionDefinitions
  );

  const inboundIndex = new Map();
  for (const leg of inboundLegs) {
    const key = `${leg.departureAirport.iataCode}:${leg.arrivalAirport.iataCode}`;
    if (!inboundIndex.has(key)) {
      inboundIndex.set(key, []);
    }
    inboundIndex.get(key).push(leg);
  }

  for (const legs of inboundIndex.values()) {
    legs.sort((left, right) => new Date(left.outboundDate) - new Date(right.outboundDate));
  }

  return outboundLegs.flatMap((outboundLeg) => {
    const section = getSectionDefinition(
      sectionDefinitions,
      outboundLeg.departureAirport.countryCode,
      outboundLeg.arrivalAirport.countryCode
    );
    if (!section) {
      return [];
    }

    const returnKey = `${outboundLeg.arrivalAirport.iataCode}:${outboundLeg.departureAirport.iataCode}`;
    const matchingInboundLegs = inboundIndex.get(returnKey) ?? [];

    return matchingInboundLegs
      .filter((inboundLeg) => new Date(inboundLeg.outboundDate) > new Date(outboundLeg.outboundDate))
      .map((inboundLeg) => buildRoundTripFromLegs(outboundLeg, inboundLeg, section.id, options.language))
      .filter((fare) =>
        matchesWeekendPattern(fare.outboundDate, fare.inboundDate, fare.durationDays, options.weekendFlex)
      );
  });
}

export async function getMeta(departureCountry = DEFAULT_DEPARTURE_COUNTRY, force = false) {
  const departureCountries = await getDepartureCountries(force);
  const validDepartureCountry = departureCountries.some((country) => country.code === departureCountry)
    ? departureCountry
    : departureCountries[0]?.code ?? DEFAULT_DEPARTURE_COUNTRY;
  const destinationCountries = await getDestinationCountries(validDepartureCountry, force);
  const suggestedDefaultDestination = DEFAULT_DESTINATION_BY_DEPARTURE[validDepartureCountry];
  const defaultDestinationCountry = destinationCountries.some(
    (country) => country.code === suggestedDefaultDestination
  )
    ? suggestedDefaultDestination
    : destinationCountries[0]?.code ?? DEFAULT_DESTINATION_BY_DEPARTURE.de;
  const network = await getEligibleNetwork(validDepartureCountry, defaultDestinationCountry, force);

  return {
    generatedAt: new Date().toISOString(),
    refreshIntervalMs: 0,
    defaultDepartureCountry: validDepartureCountry,
    defaultDestinationCountry,
    departureCountries,
    departureAirportCount: network.airports.filter((airport) => airport.countryCode === validDepartureCountry).length,
    destinationCountries,
  };
}

export async function searchFlights({
  departureCountry = DEFAULT_DEPARTURE_COUNTRY,
  destinationCountry = DEFAULT_DESTINATION_BY_DEPARTURE.de,
  mode = 'oneway',
  weekendFlex = false,
  startDate,
  endDate,
  market = 'en-gb',
  language = 'gb',
  currency = 'EUR',
  force = false,
}) {
  const normalizedDepartureCountry = String(departureCountry || DEFAULT_DEPARTURE_COUNTRY).toLowerCase();
  const normalizedDestinationCountry = String(
    destinationCountry || DEFAULT_DESTINATION_BY_DEPARTURE[normalizedDepartureCountry] || DEFAULT_DESTINATION_BY_DEPARTURE.de
  ).toLowerCase();
  const cacheKey = `search:${normalizedDepartureCountry}:${normalizedDestinationCountry}:${mode}:${weekendFlex ? 'flex' : 'strict'}:${startDate}:${endDate}:${market}:${language}:${currency}`;
  if (!force) {
    const cached = cacheGet(cacheKey);
    if (cached) {
      return {
        ...cached,
        meta: {
          ...cached.meta,
          fromCache: true,
        },
      };
    }
  }

  const sectionDefinitions = buildSectionDefinitions(normalizedDepartureCountry, normalizedDestinationCountry);
  const network = await getEligibleNetwork(normalizedDepartureCountry, normalizedDestinationCountry, force);
  const flights = mode === 'roundtrip'
    ? await searchRoundTrip(
        network,
        { startDate, endDate, weekendFlex, market, language, currency },
        sectionDefinitions
      )
    : await searchOneWay(
        network,
        { startDate, endDate, market, language, currency },
        sectionDefinitions
      );

  const sections = groupFlights(flights, sectionDefinitions);
  const result = {
    generatedAt: new Date().toISOString(),
    meta: {
      fromCache: false,
      refreshIntervalMs: 0,
      search: {
        departureCountry: normalizedDepartureCountry,
        destinationCountry: normalizedDestinationCountry,
        mode,
        weekendFlex,
        startDate,
        endDate,
        market,
        language,
        currency,
      },
    },
    sections,
  };

  cacheSet(cacheKey, result);
  return result;
}
