# ![Conduit-API (Node/Express/Prisma)](project-logo.png)

[![Build-Status](https://travis-ci.org/anishkny/node-express-realworld-example-app.svg?branch=master)](https://travis-ci.org/anishkny/node-express-realworld-example-app)

> Eine Express- und Prisma-API, die die [RealWorld](https://github.com/gothinkster/realworld-example-apps)-Spezifikation umsetzt: Registrierung und Anmeldung per JWT, Artikel mit Tags und Kommentaren, Favoriten, Profile mit Follow-Funktion und seit dem Lesezeichen-Feature eine eigene, paginierte Liste der gemerkten Artikel pro Nutzer.

## Tech-Stack

- **Sprache:** TypeScript auf Node.js 20
- **Framework:** Express in einem Nx-Monorepo
- **ORM:** Prisma mit Migrationen unter `src/prisma/migrations`
- **Datenbank:** PostgreSQL 18
- **Authentifizierung:** JWT über `express-jwt` und die bestehende Token-Middleware
- **Tests:** Jest mit Prisma-Mock

## Voraussetzungen

Vor dem ersten Start installierst du nur zwei Dinge:

1. **Node.js 20** – die passende Version steht in `.nvmrc`.
2. **Docker mit Docker Compose v2** – damit startet das Projekt die PostgreSQL-Datenbank.

Weiter ist nichts vorzubereiten: keine manuelle Datenbank, keine Migration, keine `.env`-Datei.

## Schnellstart: die komplette Anwendung starten

Ein einziger Befehl startet das gesamte Produkt – die API **und** die PostgreSQL-Datenbank:

```shell
npm run dev
```

Der Befehl führt das Skript `dev.sh` aus und erledigt dabei alles, was sonst manuell nötig wäre:

- Er legt beim ersten Aufruf eine `.env` mit einer generierten Datenbank-Passphrase und einem generierten `JWT_SECRET` an und setzt `DATABASE_URL`, `NODE_ENV` und `PORT`.
- Er startet den PostgreSQL-18-Container über `compose.yaml` und wartet, bis die Datenbank Verbindungen annimmt.
- Er installiert die npm-Abhängigkeiten und erzeugt den Prisma Client.
- Er spielt die Prisma-Migrationen ein (beim Serverstart werden ausstehende Migrationen zusätzlich automatisch angewendet).
- Er startet die API mit Hot Reload unter `http://localhost:3000`; der Health-Endpunkt ist `http://localhost:3000/`, die API liegt unter `http://localhost:3000/api`.

Zum Beenden drückst du `Ctrl+C`. Die Datenbank läuft danach im Hintergrund weiter und wird beim nächsten Start wiederverwendet; stoppen kannst du sie mit `docker compose stop db`, endgültig entfernen inklusive Daten mit `docker compose down -v`.

## Umgebungsvariablen

`npm run dev` schreibt die Entwicklungswerte selbst in `.env`. Für andere Umgebungen (etwa den Produktivbetrieb) setzt du sie direkt in der Umgebung des Prozesses oder in einer `.env`-Datei:

| Variable       | Bedeutung                                                       | Beispiel                                                              |
| -------------- | --------------------------------------------------------------- | --------------------------------------------------------------------- |
| `DATABASE_URL` | Verbindung zur PostgreSQL-Datenbank                             | `postgresql://benutzer:passwort@localhost:5432/conduit?schema=public` |
| `JWT_SECRET`   | Schlüssel zum Signieren der JWTs; niemals im Repository ablegen | zufälliger Wert, z. B. 64 Hex-Zeichen                                 |
| `NODE_ENV`     | Laufzeitumgebung                                                | `development` oder `production`                                       |
| `PORT`         | Port, auf dem die API lauscht (Standard: `3000`)                | `3000`                                                                |

Fehlt `DATABASE_URL`, bricht der Serverstart mit einer Meldung ab, die genau diese Variable nennt.

## Datenbank befüllen (Seed)

Das Projekt enthält ein Seed-Skript, das Beispielnutzer, Artikel und Kommentare anlegt:

```shell
npx prisma db seed
```

Es verwendet die Verbindung aus `DATABASE_URL`; bei laufender Entwicklungsumgebung ist das die Datenbank aus `compose.yaml`. Feste Demo-Zugangsdaten gibt es nicht – die Seed-Nutzer werden mit zufälligen Namen, E-Mail-Adressen und Passwörtern erzeugt. Lege für eigene Anmeldungen einfach über `POST /api/users` einen Nutzer an.

## Tests

```shell
npm test
```

Die Jest-Tests liegen unter `src/tests/` und decken unter anderem Artikel, Favoriten, Lesezeichen und Authentifizierung ab.

## Build und Deployment

Für einen Produktionsbuild:

```shell
npm run build
```

Das Ergebnis landet in `dist/api`. Auf einem entfernten Server installierst du die Abhängigkeiten, spielst die Migrationen ein und startest den gebauten Server:

```shell
npm ci && npx prisma migrate deploy && node dist/api/main.js
```

Alternativ lässt sich das Image über die `Dockerfile` bauen (`npx nx docker-build api`); es erwartet ebenfalls einen vorherigen Build in `dist/api`.

## Funktionen

- Registrierung, Anmeldung und Profilpflege mit JWT-Authentifizierung
- Artikel erstellen, lesen, aktualisieren und löschen, mit Tags und Paginierung
- Personalisierter Feed der gefolgten Autoren
- Kommentare zu Artikeln
- Favoriten mit `favorited` und `favoritesCount` in jeder Artikel-Antwort
- Profile mit Follow-Funktion
- Lesezeichen: pro Nutzer setzen, entfernen und paginiert auflisten; jede Artikel-Antwort trägt ein `bookmarked`-Flag
- Beliebte Tags

## API

Alle Endpunkte liegen unter `http://localhost:3000/api`. Anfragen und Antworten sind JSON. Geschützte Endpunkte erwarten den Header `Authorization: Bearer <JWT>`; die handelnde Person wird ausschließlich aus diesem Token ermittelt. Fehler kommen im bestehenden Format:

```json
{ "errors": { "article": ["not found"] } }
```

### Authentifizierung

**POST /api/users** – Nutzer anlegen (`201`)

```json
{
  "user": {
    "username": "jane",
    "email": "jane@example.com",
    "password": "secret"
  }
}
```

```json
{
  "user": {
    "username": "jane",
    "email": "jane@example.com",
    "token": "<JWT>",
    "bio": null,
    "image": null
  }
}
```

**POST /api/users/login** – Anmelden (`200`); Body wie bei der Registrierung, Antwort wie oben.

**GET /api/user** – angemeldeten Nutzer lesen (Auth erforderlich), Antwort `{ "user": { ... } }`.

**PUT /api/user** – Nutzer aktualisieren (Auth erforderlich); Body `{ "user": { "email"?, "username"?, "password"?, "bio"?, "image"? } }`, Antwort `{ "user": { ... } }`.

### Artikel

**GET /api/articles** – Artikelliste (Auth optional). Query: `limit` (Standard 20), `offset` (Standard 0), `tag`, `author`, `favorited`.

```json
{
  "articles": [
    {
      "slug": "mein-artikel",
      "title": "Mein Artikel",
      "description": "Kurzbeschreibung",
      "body": "Inhalt",
      "tagList": ["node", "prisma"],
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z",
      "favorited": false,
      "favoritesCount": 0,
      "bookmarked": false,
      "author": {
        "username": "jane",
        "bio": null,
        "image": null,
        "following": false
      }
    }
  ],
  "articlesCount": 1
}
```

**GET /api/articles/feed** – Feed der gefolgten Autoren (Auth erforderlich). Query: `limit`, `offset`; Antwort wie oben.

**GET /api/articles/:slug** – einzelnen Artikel lesen (Auth optional), Antwort `{ "article": { ... } }`.

**POST /api/articles** – Artikel anlegen (Auth erforderlich, `201`)

```json
{
  "article": {
    "title": "Mein Artikel",
    "description": "Kurzbeschreibung",
    "body": "Inhalt",
    "tagList": ["node", "prisma"]
  }
}
```

Antwort: `{ "article": { ... } }` im Schema der Artikelliste.

**PUT /api/articles/:slug** – Artikel aktualisieren (Auth erforderlich); Body `{ "article": { "title"?, "description"?, "body"?, "tagList"? } }`, Antwort `{ "article": { ... } }`.

**DELETE /api/articles/:slug** – Artikel löschen (Auth erforderlich, `204`). Zugehörige Lesezeichen werden mitgelöscht.

### Lesezeichen

**POST /api/articles/:slug/bookmark** – Lesezeichen setzen (Auth erforderlich, kein Body). Antwort `{ "article": { ..., "bookmarked": true } }`. Der Aufruf ist idempotent; ein unbekannter Slug antwortet mit `404`.

**DELETE /api/articles/:slug/bookmark** – Lesezeichen entfernen (Auth erforderlich). Antwort `{ "article": { ..., "bookmarked": false } }`, ebenfalls idempotent; unbekannter Slug `404`.

**GET /api/articles/bookmarks** – eigene Lesezeichen (Auth erforderlich). Query: `limit` (Standard 20), `offset` (Standard 0). Antwort wie bei `GET /api/articles`; `articlesCount` nennt die Gesamtzahl der Lesezeichen, sortiert nach dem Anlagedatum des Artikels absteigend, jeder Artikel hat `bookmarked: true`.

### Favoriten

**POST /api/articles/:slug/favorite** – favorisieren (Auth erforderlich), **DELETE /api/articles/:slug/favorite** – Favorit entfernen (Auth erforderlich). Beide antworten mit `{ "article": { ... } }`; Lesezeichen und Favoriten bleiben unabhängig voneinander.

### Kommentare

**GET /api/articles/:slug/comments** – Kommentare lesen (Auth optional), Antwort `{ "comments": [ ... ] }`.

**POST /api/articles/:slug/comments** – Kommentar schreiben (Auth erforderlich); Body `{ "comment": { "body": "Text" } }`, Antwort `{ "comment": { ... } }`.

**DELETE /api/articles/:slug/comments/:id** – Kommentar löschen (Auth erforderlich), Antwort `{}` mit `200`.

### Profile

**GET /api/profiles/:username** – Profil lesen (Auth optional), **POST /api/profiles/:username/follow** – folgen (Auth erforderlich), **DELETE /api/profiles/:username/follow** – nicht mehr folgen (Auth erforderlich). Antwort jeweils `{ "profile": { "username", "bio", "image", "following" } }`.

### Tags

**GET /api/tags** – die zehn beliebtesten Tags, Antwort `{ "tags": ["node", "prisma"] }`.
