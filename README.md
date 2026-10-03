# Ryanair DE-MA Fare Finder

Lokale Web-App mit React-Frontend und Node-Backend, die günstige Ryanair-Flüge zwischen Deutschland, Marokko und Spanien gruppiert nach Abflughafen darstellt.

## Funktionen

- Vier Sektionen: Deutschland → Marokko, Marokko → Deutschland, Deutschland → Spanien, Spanien → Deutschland
- Dynamischer Stadtfilter auf den Abflughafen
- Gruppierung je Abflughafen als Akkordeon
- Vorschau immer mit dem günstigsten Abflugtag pro Flughafen
- One-Way- und Trip-Modus
- Weekend- und Long-Weekend-Suche
- Automatische Aktualisierung alle 5 Minuten
- Manueller Refresh-Button
- Direkte Buchungslinks zu Ryanair
- Ryanair-inspiriertes Farbkonzept in Blau, Gelb und Weiß

## Starten

Voraussetzung: aktuelles Node.js mit eingebautem `fetch`

```bash
npm install
npm run dev
```

Optional kann das Frontend für eine externe API vorkonfiguriert werden:

```bash
cd frontend
cp .env.example .env.local
```

Dann im Browser öffnen:

- Frontend: http://localhost:5173
- Backend: http://localhost:8787

## Öffentlich deployen

Günstigste sinnvolle Variante:

- Frontend auf Vercel
- Backend auf Render

### 1. Backend auf Render

- Neues `Web Service` aus dem Git-Repository anlegen
- Root Directory: `backend`
- Build Command: `npm install`
- Start Command: `npm start`
- Environment Variable setzen:

```bash
CORS_ORIGIN=https://deine-frontend-domain.vercel.app
```

Nach dem Deploy bekommst du eine URL wie:

```bash
https://ryanair-api.onrender.com
```

### 2. Frontend auf Vercel

- Neues Projekt aus demselben Repository anlegen
- Root Directory: `frontend`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment Variable setzen:

```bash
VITE_API_BASE_URL=https://ryanair-api.onrender.com
```

### 3. Danach neu deployen

Sobald beide Variablen gesetzt sind, das Frontend erneut deployen. Das Frontend ruft dann nicht mehr lokal `/api/...` auf, sondern deine öffentliche Backend-URL.

### 4. PWA teilen

Nach dem Deploy kann die App direkt per HTTPS-Link geteilt werden. Auf Mobilgeräten lässt sie sich dann über den Browser zum Home-Bildschirm hinzufügen.

## Architektur

- [frontend/src/App.jsx](/Users/wiamaouraghe/Desktop/Ryanair%20App/frontend/src/App.jsx): UI, Filter, Auto-Refresh, Akkordeons
- [backend/src/server.js](/Users/wiamaouraghe/Desktop/Ryanair%20App/backend/src/server.js): lokale API-Endpunkte
- [backend/src/ryanair.js](/Users/wiamaouraghe/Desktop/Ryanair%20App/backend/src/ryanair.js): Ryanair-Abfragen, Gruppierung, Caching

## Umgebungsvariablen

Frontend:

```bash
VITE_API_BASE_URL=
```

- Leer lassen für lokale Entwicklung mit Vite-Proxy
- Auf Produktions-API setzen für öffentliches Hosting

Backend:

```bash
CORS_ORIGIN=
PORT=
```

- `CORS_ORIGIN`: kommagetrennte Liste erlaubter Frontend-Domains
- Wenn leer, werden alle Origins akzeptiert

## Hinweise

- Die App nutzt öffentliche Ryanair-Endpunkte. Antwortformate können sich ändern.
- Das Backend cached identische Suchen kurz, um unnötige Folgeanfragen zu reduzieren.
- Der Stadtfilter läuft absichtlich clientseitig, damit Tippen sofort reagiert.
