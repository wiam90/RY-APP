http://localhost:5173http://localhost:5173## Plan: Ryanair DE-MA Fare Finder

Die App bleibt eine lokale Web-App mit kleinem lokalem Backend, wird aber jetzt explizit als dynamisch filterbare Preisübersicht mit gruppierten Abflughäfen geplant. Das Backend kapselt die Ryanair-Endpunkte, aggregiert Deutschland↔Marokko-Verbindungen, liefert normalisierte One-Way- und Round-Trip-Daten und unterstützt sowohl manuelle Suche als auch automatisches Revalidieren alle 5 Minuten. Im Frontend werden Flüge je Abflughafen in Akkordeons gruppiert; die Vorschau zeigt immer den günstigsten verfügbaren Abflugtag, erst im aufgeklappten Zustand erscheinen alle Flüge dieses Flughafens preisaufsteigend. Das visuelle System soll sich klar an den öffentlich erkennbaren Ryanair-Merkmalen orientieren: kräftiges Dunkelblau, markantes Gelb, weiße Flächen, klare CTA-Hierarchie, sachliche Aviation-UI statt generischem Reiseportal-Look.

**Steps**
1. Phase 1: Grundarchitektur festlegen. Das leere Projekt in Frontend und Backend aufteilen. Das Backend bleibt verpflichtend, um Ryanair-Endpunkte gegen CORS, Fehlerfälle, Caching und periodische Aktualisierung sauber zu kapseln.
2. Phase 1: Datenmodell erweitern. Neben einzelnen FlightResult-Einträgen ein gruppiertes Modell pro Abflughafen vorsehen, zum Beispiel AirportGroupResult mit Sektion, Abflughafen-Metadaten, günstigstem Vorschauflug, Anzahl Treffer, Liste aller zugehörigen Flüge und letztem Aktualisierungszeitpunkt. Dadurch ist die Akkordeon-Ansicht schon auf API-Ebene stabil abbildbar.
3. Phase 1: Filtermodell konkretisieren. Die Suchparameter umfassen Datumsbereich, Modus One-Way oder Trip, Wochenend-/Long-Weekend-Schablone, optionale Aufenthaltsdauer sowie einen dynamischen Textfilter für die Stadt des Abflughafens. Der Stadtfilter muss clientseitig sofort reagieren können, ohne für jede Eingabe neue Ryanair-Requests auszulösen.
4. Phase 2: Flughäfen und Route-Matrix dynamisch aufbauen. Die aktive Flughafenliste über den Locate-Airports-Endpoint laden, Ryanair-Flughäfen in Deutschland und Marokko über countryCode filtern und pro Abflughafen die echten Zielrouten laden. Nur Paare behalten, die tatsächlich Deutschland→Marokko oder Marokko→Deutschland bedienen. Keine statische Airport-Liste als Primärquelle verwenden.
5. Phase 2: Suchstrategie je Sektion definieren. Sektion Deutschland zeigt nur Abflüge aus deutschen Flughäfen nach Marokko; Sektion Marokko nur Abflüge aus marokkanischen Flughäfen nach Deutschland. Die spätere UI-Gruppierung erfolgt immer nach Abflughafen innerhalb dieser Sektionen.
6. Phase 2: Backend-Endpunkte planen. Ein Metadaten-Endpoint für verfügbare Airports und Route-Paare, ein Such-Endpoint für aggregierte Ergebnisse und optional ein Status-/Refresh-Marker in derselben Suchantwort. Ein separater Refresh-Endpunkt ist nicht zwingend nötig, wenn dieselbe Anfrage mit Cache-Bypass neu ausgeführt werden kann.
7. Phase 3: One-Way-Logik definieren. Für nicht-tripbasierte Suchen die Ryanair-OneWayFares-Abfrage pro Abflughafen verwenden, weil sie ohne fixes Ziel alle günstigen Ziele im Zeitraum liefert. Danach nur Ziele der jeweils anderen Ländergruppe behalten und in interne Ergebnisse transformieren.
8. Phase 3: Wochenend- und Long-Weekend-Logik definieren. Für Trip-Suchen den RoundTripFares-Endpoint je gültigem Länderpaar verwenden, weil er Outbound, Inbound, Gesamtpreis und tripDurationDays liefert. Das Backend erzeugt aus dem UI-Filter feste Muster wie Fr-So, Fr-Mo oder Do-Mo. Diese Trip-Muster so modellieren, dass sie später ohne Architekturwechsel erweitert werden können.
9. Phase 3: Ergebnisaggregation nach Abflughafen einziehen. Nach der Rohsuche alle Treffer je Sektion nach departureAirport.iataCode gruppieren. Pro Gruppe den günstigsten Flug als Akkordeon-Vorschau bestimmen, idealerweise mit Datum, Ziel, Preis und Kurzstatus. Innerhalb jeder Gruppe alle Flüge strikt nach günstigstem Preis und danach nach Abflugdatum sortieren.
10. Phase 3: Leistungs- und Aktualisierungsstrategie absichern. Serverseitiges Caching mit kurzer TTL einplanen, aber zusätzlich automatisches Revalidieren der aktuell sichtbaren Suche alle 5 Minuten vorsehen. Die Frontend-Logik soll dabei Hintergrundaktualisierungen ausführen, ohne geöffnete Akkordeons oder aktive Filter zurückzusetzen. Laufende Refreshes müssen entdoppelt werden, damit kein Request-Sturm entsteht.
11. Phase 4: UI-Struktur neu auf die Aggregation ausrichten. Oben eine Filterleiste mit Datum-von/bis, Suchmodus, Wochenend-/Trip-Schablone und einem Texteingabefeld zum Filtern nach Stadt des Abflughafens. Darunter zwei Sektionen Deutschland und Marokko. Innerhalb jeder Sektion erscheinen Akkordeons je Abflughafen, nicht einzelne Karten auf oberster Ebene.
12. Phase 4: Akkordeon-Verhalten präzisieren. Der geschlossene Zustand zeigt immer den günstigsten Abflugtag als Vorschau mit Preis, Route und Anzahl weiterer passender Flüge ab diesem Flughafen. Der geöffnete Zustand zeigt alle Flüge dieser Gruppe, jeweils preisaufsteigend sortiert. So bleibt die Übersicht auch bei vielen 90-Tage-Treffern handhabbar.
13. Phase 4: Sortier- und Filterverhalten festlegen. Zuerst die Flughafengruppen selbst nach ihrem günstigsten Vorschaupreis sortieren, danach sekundär nach Abflughafenname. Der Stadtfilter arbeitet auf den Gruppennamen und Flughafenmetadaten, zum Beispiel Berlin, Köln, Marrakesch, Düsseldorf. Innerhalb geöffneter Gruppen bleiben die Flüge ebenfalls preisaufsteigend sortiert.
14. Phase 4: Refresh-UX definieren. Zusätzlich zur Auto-Aktualisierung alle 5 Minuten bleibt ein manueller Aktualisieren-Button erhalten. Die UI zeigt den letzten erfolgreichen Aktualisierungszeitpunkt an und markiert, wenn gerade im Hintergrund neu geladen wird. Ein stiller Auto-Refresh darf den Benutzerkontext nicht stören.
15. Phase 4: Deeplink-Strategie definieren. Für jeden Einzelflug einen direkten Ryanair-Buchungslink aus den verfügbaren Flugdaten bilden. Für Trip-Suchen Outbound und Inbound in den Link übernehmen; für One-Way-Suchen ein One-Way-Booking-Link. Zusätzlich ein Fallback auf generische Streckenseiten vorsehen.
16. Phase 5: Visuelle Richtung auf Ryanair-Corporate-Design anlehnen. Aus öffentlichen Quellen eindeutig erkennbare Merkmale übernehmen: Ryanair-Blau als Primärfläche, kräftiges Gelb für Haupt-CTAs und Akzente, weiße Karten- oder Panel-Flächen, hoher Kontrast, sachlich-kommerzielle Airline-Optik. Keine violetten oder neutralen SaaS-Farben. Designsystem mit CSS-Variablen planen, damit Primärfarben, Hover-Zustände und Statusfarben konsistent bleiben.
17. Phase 5: Komponentenstil konkretisieren. Filterleiste, Akkordeon-Header, Preis-Badges und Buchungsbuttons müssen wie Airline-Commerce wirken: klare Preisbetonung, starke CTA-Flächen, saubere Tabellen- oder Kartenrhythmik. Mobile und Desktop beide einplanen, damit Akkordeons und Filter auch auf kleineren Screens nutzbar bleiben.
18. Phase 5: Fehler- und Statusverhalten planen. Ladezustand, leere Treffer, teilweise unvollständige Treffer und Ryanair-Fehler sauber behandeln. Bei Auto-Refresh im Fehlerfall bestehende Daten sichtbar lassen und nur den Refresh-Status degradieren, statt die Liste zu leeren.
19. Phase 6: Verifikation vorbereiten. Backend gegen echte Ryanair-Antworten prüfen: Airport-Liste, Route-Discovery, One-Way für deutsche und marokkanische Ausgangsflughäfen, Round-Trip für mindestens ein Wochenende. Danach UI manuell prüfen: Akkordeon-Gruppierung, Stadtfilter, Sortierung, Auto-Refresh im 5-Minuten-Rhythmus, Erhalt des UI-Zustands und funktionierende Deeplinks.

**Relevant files**
- /Users/wiamaouraghe/Desktop/Ryanair App/frontend — Browser-App für Filterleiste, Stadtfilter, Akkordeon-Gruppierung, Ergebnisdarstellung und Auto-Refresh-UX
- /Users/wiamaouraghe/Desktop/Ryanair App/backend — lokaler API-Proxy für Ryanair-Metadaten, Gruppierungslogik, Caching, Revalidierung und Fehlerisolierung
- /Users/wiamaouraghe/Desktop/Ryanair App/shared or frontend/src/types plus backend/src/types — gemeinsame Typen für Filter, Rohflug, Gruppenergebnis, Refresh-Status und Deeplink-Daten
- /Users/wiamaouraghe/Desktop/Ryanair App/README.md — lokale Startanleitung, bekannte Einschränkungen, Refresh-Verhalten und Hinweis auf öffentliche Ryanair-Endpunkte

**Verification**
1. Metadaten-Test: bestätigen, dass nur deutsche und marokkanische Ryanair-Airports gesammelt werden und die Route-Matrix nur echte DE↔MA-Paare enthält.
2. Stadtfilter-Test: Eingaben wie Berlin, Köln, Marrakesch oder Düsseldorf filtern die Flughafengruppen sofort korrekt, ohne neue Suchabfrage an Ryanair auszulösen.
3. Aggregations-Test: alle Flüge desselben Abflughafens landen in genau einer Akkordeon-Gruppe, und die Vorschau zeigt den billigsten Treffer dieser Gruppe.
4. Sortier-Test: Flughafengruppen sind nach günstigstem Vorschaupreis sortiert; geöffnete Flüge innerhalb der Gruppe ebenfalls nach Preis und dann Datum.
5. Round-Trip-Test: Wochenendmuster Fr-So und Long-Weekend-Muster Do-Mo liefern nur Trips mit passender Aufenthaltsdauer und korrekt summiertem Gesamtpreis.
6. Auto-Refresh-Test: dieselbe Suche wird im Hintergrund alle 5 Minuten revalidiert, Zeitstempel aktualisieren sich, und geöffnete Akkordeons sowie aktive Filter bleiben erhalten.
7. Fehlerfall-Test: bei einem Refresh-Fehler bleiben die letzten gültigen Ergebnisse sichtbar und nur der Status zeigt die fehlgeschlagene Aktualisierung.
8. Deeplink-Test: mehrere echte Treffer aus beiden Sektionen öffnen die erwartete Ryanair-Buchungsstrecke.
9. Responsive-Test: Filterleiste, Akkordeons und Buchungsbuttons bleiben auf Desktop und Mobil nutzbar.
10. Design-Test: die App wirkt klar in Ryanair-Blau/Gelb/Weiß und nicht wie ein generisches Template.

**Decisions**
- Bestätigt: lokale Web-App ist korrekt.
- Bestätigt: Standard-Zeitraum beim Start sind die nächsten 90 Tage.
- Bestätigt: Wochenendlogik soll komplette Trips abbilden und auf Long-Weekend-Schemata wie Do-Mo erweiterbar sein.
- Neu bestätigt: Stadtbasierter Filter auf den Abflughafen ist Pflicht und soll dynamisch reagieren.
- Neu bestätigt: Preise sollen automatisch alle 5 Minuten aktualisiert werden, zusätzlich zu manuellem Refresh.
- Neu bestätigt: Ergebnisse werden je Abflughafen akkordeonartig aggregiert; die Vorschau zeigt den günstigsten Abflugtag, aufgeklappt dann alle Flüge preisaufsteigend.
- Neu bestätigt: das visuelle System soll sich erkennbar an Ryanair-Corporate-Farben und öffentlicher Markenoptik orientieren.
- Empfehlung: One-Way und Trip-Suche im selben Produkt unterstützen, aber klar getrennt im Backend modellieren.
- Empfehlung: dynamische Route-Discovery statt statischer Airport-Paare, damit die App bei Ryanair-Netzänderungen robuster bleibt.
- Ausdrücklich nicht im ersten Schnitt: Multi-City, Gepäckpreise, Umstiege, Benutzerkonten, Persistenzdatenbank.

**Further Considerations**
1. Empfehlenswert ist ein einziger Suchscreen mit zwei Modi statt zwei Seiten, weil Stadtfilter, Auto-Refresh und Akkordeon-Logik dann nur einmal gebaut werden müssen.
2. Falls Round-Trip-Abfragen über alle Paare für 90 Tage lokal zu schwer werden, ist die erste Optimierung weiterhin serverseitiges Caching pro Suche; erst danach sollte der Nutzer stärker zur Airport-Vorauswahl gezwungen werden.
3. Für das Design sollte die Umsetzung die Marke zitieren, nicht kopieren: Farbe, Kontrast, CTA-Hierarchie und Tonalität übernehmen, aber keine exakte 1:1-Nachbildung kompletter proprietärer Seitenlayouts erzwingen.