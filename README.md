# ![Conduit API](project-logo.png)

Diese API ist eine vollständige Implementierung der [RealWorld](https://github.com/gothinkster/realworld-example-apps)-Spezifikation („Conduit“) auf Basis von Node.js, Express und Prisma. Sie bietet Registrierung und Anmeldung per JWT, Profile mit Folgen-Funktion, Artikel inklusive Tags, Favoriten und Kommentaren, einen personalisierten Feed sowie Lesezeichen (Bookmarks) für Artikel – getrennt von den Favoriten, mit einem `bookmarked`-Flag in jeder Artikel-Antwort und einer paginierten Lesezeichenliste.

## Funktionen

- Registrierung und Anmeldung mit E-Mail und Passwort, JWT-basierte Authentifizierung
- Eigenes Profil lesen und bearbeiten
- Profile anderer Nutzer ansehen sowie folgen/entfolgen
- Artikel erstellen, lesen, bearbeiten und löschen
- Tags und Tag-Filterung
- Artikel favorisieren und entfavorisieren
- Kommentare zu Artikeln schreiben und löschen
- Personalisierter Feed der gefolgten Autoren
- Lesezeichen: Artikel vormerken und entmerken (idempotent), paginierte Liste der eigenen Lesezeichen, `bookmarked`-Flag in allen Artikel-Antworten
- Seed-Skript mit Demo-Nutzern, Artikeln und Kommentaren

## Tech-Stack

- **Sprache:** TypeScript auf Node.js
- **Workspace/Build:** Nx
- **Framework:** Express
- **ORM:** Prisma
- **Datenbank:** PostgreSQL 18
- **Auth:** JWT (`express-jwt`, HS256)
- **Tests:** Jest mit Prisma-Mock

## Voraussetzungen

- Docker mit Docker-Compose-Plugin (Docker Engine 24+ oder Docker Desktop)
- Optional für Arbeit ohne Container: Node.js 20+ und npm

## Entwicklung starten

Das gesamte Produkt – PostgreSQL und die API – startet mit einem einzigen Befehl aus dem Projektverzeichnis:

```shell
docker compose up
```

Der Launcher erledigt alles, was zum Laufen nötig ist:

- startet die PostgreSQL-18-Datenbank (`db`) und wartet, bis sie bereit ist,
- startet den API-Container (`api`) und installiert die Abhängigkeiten (`npm ci`),
- erzeugt den Prisma Client und baut die Anwendung,
- wendet alle Prisma-Migrationen auf die Datenbank an,
- erzeugt automatisch ein zufälliges `JWT_SECRET`, wenn keines gesetzt ist,
- startet den Server auf <http://localhost:3000>.

Die API ist anschließend unter <http://localhost:3000/api> erreichbar; `GET /` liefert den Status der Anwendung.

Beenden mit `Ctrl+C`. Die Datenbankdaten bleiben in einem Docker-Volume erhalten; ein kompletter Neustart mit leerer Datenbank gelingt mit:

```shell
docker compose down -v
```

## Konfiguration

Der Launcher setzt die benötigten Werte selbst. Überschreiben lässt sich alles über Umgebungsvariablen vor dem Start:

| Variable | Bedeutung | Standard im Launcher |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL-Verbindungsadresse | Verbindung zum `db`-Container |
| `JWT_SECRET` | Schlüssel zum Signieren der JWTs | zufällig erzeugt, wenn nicht gesetzt |
| `PORT` | Port des HTTP-Servers | `3000` |
| `NODE_ENV` | Laufzeitmodus | `development` |

Ein eigenes Secret erhält man zum Beispiel mit:

```shell
JWT_SECRET=$(openssl rand -hex 32) docker compose up
```

Wird kein `JWT_SECRET` gesetzt, erzeugt der Launcher bei jedem Start ein neues. Bereits ausgegebene Tokens werden dadurch ungültig. Ein Start ohne Container (siehe „Build für die Produktion“ und „Deployment auf einem Server“) benötigt dagegen ein explizit gesetztes `JWT_SECRET`; fehlt es, bricht die Anwendung mit einer Fehlermeldung ab.

## Seed-Daten

Das Seed-Skript legt 12 Demo-Nutzer mit je 12 Artikeln und Kommentaren an. Es kann bei laufendem Produkt ausgeführt werden:

```shell
docker compose exec api npx prisma db seed
```

Die Demo-Zugangsdaten werden zufällig erzeugt; es gibt keine fest vorgegebenen Logins.

## API

Basis-URL: `http://localhost:3000/api`

Geschützte Endpunkte erwarten den Token im Header (sowohl `Token` als auch `Bearer` wird akzeptiert):

```
Authorization: Token <jwt>
```

Fehlerantworten haben das Format `{ "errors": { ... } }`, zum Beispiel `{ "errors": { "email": ["has already been taken"] } }` (422) oder `{ "errors": { "body": ["missing authorization credentials"] } }` (401).

| Methode | Pfad | Auth | Zweck |
| --- | --- | --- | --- |
| POST | `/api/users` | – | Nutzer registrieren |
| POST | `/api/users/login` | – | Anmelden |
| GET | `/api/user` | Token | Aktuellen Nutzer lesen |
| PUT | `/api/user` | Token | Aktuellen Nutzer bearbeiten |
| GET | `/api/profiles/:username` | optional | Profil lesen |
| POST | `/api/profiles/:username/follow` | Token | Nutzer folgen |
| DELETE | `/api/profiles/:username/follow` | Token | Nutzer entfolgen |
| GET | `/api/tags` | optional | Beliebte Tags |
| GET | `/api/articles` | optional | Artikelliste, Query: `limit`, `offset`, `tag`, `author`, `favorited` |
| GET | `/api/articles/feed` | Token | Feed der gefolgten Autoren, Query: `limit`, `offset` |
| GET | `/api/articles/bookmarks` | Token | Eigene Lesezeichen, Query: `limit` (Standard 10), `offset` (Standard 0) |
| POST | `/api/articles` | Token | Artikel erstellen |
| GET | `/api/articles/:slug` | optional | Einzelnen Artikel lesen |
| PUT | `/api/articles/:slug` | Token | Artikel bearbeiten |
| DELETE | `/api/articles/:slug` | Token | Artikel löschen |
| GET | `/api/articles/:slug/comments` | optional | Kommentare lesen |
| POST | `/api/articles/:slug/comments` | Token | Kommentar schreiben |
| DELETE | `/api/articles/:slug/comments/:id` | Token | Kommentar löschen |
| POST | `/api/articles/:slug/favorite` | Token | Artikel favorisieren |
| DELETE | `/api/articles/:slug/favorite` | Token | Artikel entfavorisieren |
| POST | `/api/articles/:slug/bookmark` | Token | Artikel vormerken |
| DELETE | `/api/articles/:slug/bookmark` | Token | Vormerkung entfernen |

### Anfragekörper

- `POST /api/users` und `POST /api/users/login`: `{ "user": { "email": "...", "username": "...", "password": "..." } }` (beim Login genügen `email` und `password`)
- `PUT /api/user`: `{ "user": { "email": "...", "username": "...", "password": "...", "bio": "...", "image": "..." } }` (alle Felder optional)
- `POST /api/articles` und `PUT /api/articles/:slug`: `{ "article": { "title": "...", "description": "...", "body": "...", "tagList": ["tag1", "tag2"] } }`
- `POST /api/articles/:slug/comments`: `{ "comment": { "body": "..." } }`
- `POST` und `DELETE /api/articles/:slug/bookmark` sowie die Favoriten-Endpunkte erwarten keinen Anfragekörper.

### Antwortformate

Anmeldung und Registrierung (`POST /api/users` antwortet mit 201):

```json
{
  "user": {
    "email": "jake@jake.jake",
    "username": "jake",
    "bio": null,
    "image": "https://api.realworld.io/images/smiley-cyrus.jpeg",
    "token": "<jwt>"
  }
}
```

Artikel-Antwort (gilt für alle Artikel-Endpunkte; `bookmarked` ist für den angemeldeten Nutzer wahr, wenn er den Artikel vorgemerkt hat):

```json
{
  "article": {
    "slug": "how-to-train-your-dragon",
    "title": "How to train your dragon",
    "description": "Ever wonder how?",
    "body": "You have to believe",
    "tagList": ["dragons", "training"],
    "createdAt": "2026-10-29T12:00:00.000Z",
    "updatedAt": "2026-10-29T12:00:00.000Z",
    "favorited": false,
    "favoritesCount": 0,
    "author": {
      "username": "jake",
      "bio": null,
      "image": "https://api.realworld.io/images/smiley-cyrus.jpeg",
      "following": false
    },
    "bookmarked": true
  }
}
```

Lesezeichenliste (`GET /api/articles/bookmarks`): `articlesCount` nennt die Gesamtzahl der Lesezeichen unabhängig von `limit`/`offset`, sortiert nach der neuesten Vormerkung:

```json
{
  "articles": [
    {
      "slug": "how-to-train-your-dragon",
      "title": "How to train your dragon",
      "description": "Ever wonder how?",
      "body": "You have to believe",
      "tagList": ["dragons", "training"],
      "createdAt": "2026-10-29T12:00:00.000Z",
      "updatedAt": "2026-10-29T12:00:00.000Z",
      "favorited": false,
      "favoritesCount": 0,
      "author": {
        "username": "jake",
        "bio": null,
        "image": "https://api.realworld.io/images/smiley-cyrus.jpeg",
        "following": false
      },
      "bookmarked": true
    }
  ],
  "articlesCount": 1
}
```

Weitere Formate: Profil `{ "profile": { "username", "bio", "image", "following" } }`, Tag-Liste `{ "tags": ["dragons", "training"] }`, Kommentar `{ "comment": { "id", "createdAt", "updatedAt", "body", "author" } }`. `DELETE /api/articles/:slug` antwortet mit 204, `DELETE /api/articles/:slug/comments/:id` mit 200.

### Beispiel: Artikel vormerken

```shell
curl -X POST http://localhost:3000/api/articles/how-to-train-your-dragon/bookmark \
  -H "Authorization: Token <jwt>"
```

Die Antwort enthält den Artikel mit `"bookmarked": true`. Derselbe Aufruf ist idempotent. `DELETE` auf denselben Pfad entfernt die Vormerkung und liefert `"bookmarked": false`. Ein unbekannter Slug antwortet mit 404, ein fehlender oder ungültiger Token mit 401.

## Tests

Die Testsuite nutzt Jest und mockt Prisma, benötigt also keine laufende Datenbank. Mit Node.js 20+ lokal:

```shell
npm ci
npm test
```

## Build für die Produktion

```shell
npm ci
npx prisma generate
npm run build
```

Das Ergebnis liegt unter `dist/api`. Der Produktionsstart wendet zuvor die Migrationen an und startet den kompilierten Server:

```shell
npm run start:prod
```

## Deployment auf einem Server

Voraussetzungen: Node.js 20+, eine erreichbare PostgreSQL-18-Datenbank sowie die Umgebungsvariablen `DATABASE_URL` und `JWT_SECRET`.

```shell
npm ci
npm run build
npm run start:prod
```

Alternativ lässt sich ein Docker-Image bauen und starten:

```shell
npx nx docker-build api
docker run -p 3000:3000 -e DATABASE_URL=... -e JWT_SECRET=... api
```
