# ![Conduit API](project-logo.png)

[![Build Status](https://travis-ci.org/anishkny/node-express-realworld-example-app.svg?branch=master)](https://travis-ci.org/anishkny/node-express-realworld-example-app)

> Conduit-API (RealWorld) mit Authentifizierung, Artikeln, Tags, Kommentaren, Favoriten und Profilen. Jede Artikel-Antwort liefert zusätzlich die geschätzte Lesezeit `readingTime` in Minuten.

## Überblick

Dieses Repository enthält die Conduit-API, eine Node.js-/Express-Umsetzung der [RealWorld](https://github.com/gothinkster/realworld-example-apps)-Spezifikation. Die API verwaltet Benutzer, Artikel, Tags, Kommentare, Favoriten und Profile und speichert alles in PostgreSQL über Prisma.

Alle Artikel-Antworten – Einzelartikel, Artikelliste, Feed sowie die Antworten nach dem Anlegen und Aktualisieren – enthalten das Feld `readingTime`: die aufgerundete Lesezeit des Artikeltexts bei 200 Wörtern pro Minute, mindestens 1. Der Wert wird zur Antwortzeit aus `body` berechnet; es gibt dafür kein Datenbankfeld und keine Migration. Kommentar-Antworten enthalten kein `readingTime`.

## Tech-Stack

- **Sprache:** TypeScript
- **Runtime:** Node.js
- **Framework:** Express
- **ORM / Datenbank:** Prisma mit PostgreSQL 18
- **Build und Workspace:** Nx
- **Tests:** Jest
- **Lokale Datenbank:** Docker Compose (`compose.yaml`)

## Voraussetzungen

- Node.js 22 und npm
- Docker mit Docker Compose, für die lokale PostgreSQL-Instanz

Weitere Einrichtung ist nicht nötig: Datenbank, Umgebungsdatei, Prisma Client und Migrationen übernimmt der Entwicklungs-Launcher.

## Schnellstart (Entwicklung)

Ein einziger Befehl startet die komplette Anwendung – API und Datenbank:

```shell
npm run dev
```

Der Launcher `scripts/dev.cjs` übernimmt dabei alle Schritte selbst:

- er installiert fehlende npm-Abhängigkeiten,
- er legt eine `.env` mit `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV` und `PORT` an, falls sie noch fehlt,
- er startet PostgreSQL 18 über Docker Compose (`compose.yaml`, Port `5432`),
- er generiert den Prisma Client und wendet alle Migrationen an,
- er startet die API im Watch-Modus auf <http://localhost:3000>.

Danach ist die API unter <http://localhost:3000/api> erreichbar; der Wurzelpfad `/` antwortet mit:

```json
{ "status": "API is running on /api" }
```

Die Datenbank lässt sich anschließend mit `docker compose down` wieder stoppen. Eine bereits erreichbare PostgreSQL-Instanz verwendet der Launcher weiter; nur wenn unter `DATABASE_URL` eine lokale Adresse steht und dort noch keine Datenbank antwortet, startet er den Container aus `compose.yaml`.

## Konfiguration

Der Launcher schreibt fehlende Werte in die Datei `.env` im Projektwurzelverzeichnis. Für eigene Werte die Datei bearbeiten oder die Variablen direkt in der Umgebung setzen; bereits gesetzte Umgebungsvariablen haben Vorrang.

| Variable | Bedeutung | Standardwert des Launchers |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL-Verbindungszeichenfolge | `postgresql://postgres:postgres@localhost:5432/conduit?schema=public` |
| `JWT_SECRET` | Geheimer Schlüssel zum Signieren der JWTs | zufällig erzeugt (32 Byte, hex) |
| `NODE_ENV` | Laufzeitumgebung | `development` |
| `PORT` | Port der API | `3000` |

In Produktion müssen `DATABASE_URL` und `JWT_SECRET` von außen gesetzt werden; `JWT_SECRET` niemals im Repository ablegen.

## Datenbank und Seed

Die Migrationen wendet `npm run dev` automatisch an. Die Datenbank enthält danach ein leeres Schema.

Zum Befüllen mit Demo-Daten:

```shell
npx prisma db seed
```

Das Seed-Skript legt zwölf Demo-Nutzer samt Artikeln und Kommentaren an. Die Zugangsdaten der Demo-Nutzer werden zufällig erzeugt; feste Demo-Logins gibt es nicht.

## Build, Produktion und Deployment

Produktions-Build erstellen:

```shell
npx nx build api
```

Auf einem Server installieren, migrieren und starten:

```shell
npm ci && npx prisma migrate deploy && node dist/api/main.js
```

Dabei müssen `DATABASE_URL` und `JWT_SECRET` in der Umgebung gesetzt sein. Alternativ lässt sich ein Container aus dem mitgelieferten `Dockerfile` bauen:

```shell
npx nx docker-build api
docker run -p 3000:3000 -e DATABASE_URL=... -e JWT_SECRET=... api
```

## API

Basis-Pfad: `/api`. Geschützte Endpunkte erwarten den Header `Authorization: Token <jwt>` (alternativ `Bearer <jwt>`). Anfrage- und Antwortkörper sind JSON.

### Authentifizierung und Benutzer

| Methode | Pfad | Auth | Body | Antwort |
| --- | --- | --- | --- | --- |
| `POST` | `/api/users` | – | `{ "user": { "username": string, "email": string, "password": string } }` | `201 { "user": { "email", "username", "bio", "image", "token" } }` |
| `POST` | `/api/users/login` | – | `{ "user": { "email": string, "password": string } }` | `200 { "user": { "email", "username", "bio", "image", "token" } }` |
| `GET` | `/api/user` | ja | – | `200 { "user": { "email", "username", "bio", "image", "token" } }` |
| `PUT` | `/api/user` | ja | `{ "user": { "email"?, "username"?, "password"?, "bio"?, "image"? } }` | `200 { "user": { ... } }` |

### Profile

| Methode | Pfad | Auth | Body | Antwort |
| --- | --- | --- | --- | --- |
| `GET` | `/api/profiles/:username` | optional | – | `200 { "profile": { "username", "bio", "image", "following" } }` |
| `POST` | `/api/profiles/:username/follow` | ja | – | `200 { "profile": { ... } }` |
| `DELETE` | `/api/profiles/:username/follow` | ja | – | `200 { "profile": { ... } }` |

### Artikel

| Methode | Pfad | Auth | Body | Antwort |
| --- | --- | --- | --- | --- |
| `GET` | `/api/articles?offset&limit&tag&author&favorited` | optional | – | `200 { "articles": Article[], "articlesCount": number }` |
| `GET` | `/api/articles/feed?offset&limit` | ja | – | `200 { "articles": Article[], "articlesCount": number }` |
| `GET` | `/api/articles/:slug` | optional | – | `200 { "article": Article }` |
| `POST` | `/api/articles` | ja | `{ "article": { "title", "description", "body", "tagList": string[] } }` | `201 { "article": Article }` |
| `PUT` | `/api/articles/:slug` | ja | `{ "article": { "title"?, "description"?, "body"? } }` | `200 { "article": Article }` |
| `DELETE` | `/api/articles/:slug` | ja | – | `204` |

Beispiel einer Artikel-Antwort (`GET /api/articles/:slug`):

```json
{
  "article": {
    "slug": "how-to-train-your-dragon",
    "title": "How to train your dragon",
    "description": "Ever wonder how?",
    "body": "It takes a Jacobian ...",
    "readingTime": 3,
    "tagList": ["dragons", "training"],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "favorited": false,
    "favoritesCount": 0,
    "author": {
      "username": "jake",
      "bio": null,
      "image": null,
      "following": false
    }
  }
}
```

`readingTime` ist eine ganze Zahl in Minuten, mindestens `1` – auch bei leerem `body`.

### Kommentare und Favoriten

| Methode | Pfad | Auth | Body | Antwort |
| --- | --- | --- | --- | --- |
| `GET` | `/api/articles/:slug/comments` | optional | – | `200 { "comments": Comment[] }` |
| `POST` | `/api/articles/:slug/comments` | ja | `{ "comment": { "body": string } }` | `200 { "comment": Comment }` |
| `DELETE` | `/api/articles/:slug/comments/:id` | ja | – | `200 {}` |
| `POST` | `/api/articles/:slug/favorite` | ja | – | `200 { "article": Article }` |
| `DELETE` | `/api/articles/:slug/favorite` | ja | – | `200 { "article": Article }` |

Kommentar-Antworten enthalten `id`, `createdAt`, `updatedAt`, `body` und `author` – aber kein `readingTime`.

### Tags

| Methode | Pfad | Auth | Body | Antwort |
| --- | --- | --- | --- | --- |
| `GET` | `/api/tags` | optional | – | `200 { "tags": string[] }` |

Liefert die zehn meistverwendeten Tags.

## Funktionen

- Registrierung, Login und JWT-Authentifizierung
- Benutzerprofil lesen und aktualisieren
- Profile anderer Benutzer anzeigen, folgen und entfolgen
- Artikel anlegen, lesen, aktualisieren und löschen
- Artikelliste mit Filtern nach Tag, Autor und Favorit sowie Pagination
- Persönlicher Feed gefolgter Autoren
- Kommentare zu Artikeln anlegen, lesen und löschen
- Artikel favorisieren und entfavorisieren
- Beliebte Tags
- Geschätzte Lesezeit `readingTime` in allen Artikel-Antworten
- Demo-Daten über ein Seed-Skript

## Tests und Prüfung

```shell
npm test
npx nx build api
```
