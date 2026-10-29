# ![Node/Express/Prisma Beispielanwendung](project-logo.png)

[![Build-Status](https://travis-ci.org/anishkny/node-express-realworld-example-app.svg?branch=master)](https://travis-ci.org/anishkny/node-express-realworld-example-app)

> Beispiel-Codebasis auf Basis von Node.js (Express + Prisma), die die [RealWorld](https://github.com/gothinkster/realworld-example-apps)-API implementiert: Artikel, Kommentare, Tags, Profile, Favoriten und Lesezeichen – inklusive Authentifizierung und Paginierung.

Das Repository enthält die Conduit-API als Nx-Monorepo. Ein angemeldeter Nutzer kann Artikel
veröffentlichen, bearbeiten und löschen, andere Nutzer abonnieren, Artikel favorisieren und
Artikel als Lesezeichen merken. Jede Artikel-Antwort enthält dafür ein `bookmarked`-Feld, und
ein eigener paginierter Endpunkt listet die Lesezeichen des angemeldeten Nutzers.

## Tech-Stack

- **Sprache:** TypeScript
- **Laufzeit:** Node.js (Nx-Monorepo, npm)
- **Framework:** Express
- **ORM:** Prisma (`src/prisma/schema.prisma`, Migrationen unter `src/prisma/migrations`)
- **Datenbank:** PostgreSQL 18
- **Tests:** Jest (`jest.config.ts`, Suiten unter `src/tests`)

## Voraussetzungen

Vor dem ersten Start werden nur diese Werkzeuge benötigt:

- [Node.js](https://nodejs.org/) 18 oder neuer mit npm
- [Docker](https://www.docker.com/) mit Docker Compose (für die PostgreSQL-Datenbank)

## Schnellstart

Repository klonen und im Projektverzeichnis **diesen einen Befehl** ausführen:

```shell
npm run dev
```

Der Befehl ist der Entwicklungs-Launcher und startet das komplette Produkt – Datenbank und API.
Er erledigt dabei selbst:

1. die Abhängigkeiten installieren (`npm install`),
2. eine `.env` aus `.env.example` anlegen und ein zufälliges `JWT_SECRET` erzeugen,
3. PostgreSQL über Docker Compose starten und auf dessen Bereitschaft warten,
4. den Prisma-Client erzeugen (`prisma generate`),
5. die Datenbankmigrationen anwenden (`prisma migrate deploy`),
6. die API im Entwicklungsmodus mit automatischem Neustart bei Änderungen starten (`nx serve`).

Danach ist die API unter `http://localhost:3000` erreichbar, alle Endpunkte liegen unter
`http://localhost:3000/api`. Mit `Strg+C` wird die API beendet; die Datenbank läuft im
Hintergrund weiter und wird mit `docker compose down` gestoppt.

## Konfiguration

Beim ersten Start legt der Launcher die Datei `.env` an. Die Standardwerte passen zur
mitgelieferten PostgreSQL-Instanz aus `compose.yaml`:

| Variable       | Standardwert                            | Bedeutung                                            |
| -------------- | --------------------------------------- | ---------------------------------------------------- |
| `DATABASE_URL` | `postgresql://app@localhost:5432/app`   | Verbindungsadresse der PostgreSQL-Datenbank           |
| `JWT_SECRET`   | beim ersten Start zufällig erzeugt      | Signaturschlüssel der ausgestellten JWTs             |
| `NODE_ENV`     | `development`                           | Laufzeitmodus                                        |
| `PORT`         | `3000`                                  | Port, auf dem die API lauscht (optional)             |

Für eine andere Datenbank oder ein festes Geheimnis werden die Werte in `.env` angepasst.

## Datenbank mit Beispieldaten füllen

Der Seed füllt die laufende Datenbank mit zufälligen Benutzern, Artikeln, Kommentaren und Tags:

```shell
npx prisma db seed
```

Die Zugangsdaten der erzeugten Benutzer sind zufällig und werden nicht ausgegeben.

## Funktionen

- Registrierung und Anmeldung mit JWT, aktuelles Konto abrufen und ändern
- Artikel erstellen, lesen, aktualisieren und löschen (Slug-basiert)
- Artikellisten mit Paginierung sowie der persönliche Feed abonnierter Autoren
- Kommentare zu Artikeln erstellen, auflisten und löschen
- Artikel favorisieren und entfavorisieren
- **Lesezeichen:** Artikel merken und entmerken (idempotent), eine paginierte Liste der eigenen
  Lesezeichen, ein `bookmarked`-Feld in jeder Artikel-Antwort und automatisches Entfernen der
  Lesezeichen beim Löschen eines Artikels
- Profilen folgen und entfolgen
- Beliebte Tags abrufen

## API

Basis-URL: `http://localhost:3000/api`. Die Wurzel `GET /` antwortet außerhalb dieses Präfixes
mit `{"status":"API is running on /api"}`.

Geschützte Endpunkte erwarten den JWT aus Registrierung oder Anmeldung im Header:

```
Authorization: Token <JWT>
```

`Bearer <JWT>` wird ebenfalls akzeptiert. Fehler werden im Format
`{"errors":{"feld":["nachricht"]}}` zurückgegeben.

### Authentifizierung und Benutzer

- `POST /api/users` – Body: `{"user":{"username":"jake","email":"jake@example.com","password":"secret"}}` – Antwort `201`:
  `{"user":{"id":1,"email":"jake@example.com","username":"jake","bio":null,"image":null,"token":"<JWT>"}}`
- `POST /api/users/login` – Body: `{"user":{"email":"jake@example.com","password":"secret"}}` – Antwort `200`:
  das Benutzerobjekt mit `token`
- `GET /api/user` – geschützt, kein Body – Antwort `200`: `{"user":{"id":1,"email":"jake@example.com","username":"jake","bio":null,"image":null,"token":"<JWT>"}}`
- `PUT /api/user` – geschützt, Body: `{"user":{"email":"…","username":"…","password":"…","bio":"…","image":"…"}}`
  (alle Felder optional) – Antwort `200`: das aktualisierte Benutzerobjekt

### Profile

- `GET /api/profiles/:username` – optional authentifiziert – Antwort `200`:
  `{"profile":{"username":"jake","bio":null,"image":null,"following":false}}`
- `POST /api/profiles/:username/follow` – geschützt, kein Body – Antwort `200`: dasselbe Profil mit `"following":true`
- `DELETE /api/profiles/:username/follow` – geschützt, kein Body – Antwort `200`: dasselbe Profil mit `"following":false`

### Artikel

Jede Artikel-Antwort hat diese Form:

```json
{
  "article": {
    "slug": "how-to-train-your-dragon",
    "title": "How to train your dragon",
    "description": "Ever wonder how?",
    "body": "You have to believe",
    "tagList": ["dragons", "training"],
    "createdAt": "2026-01-01T10:00:00.000Z",
    "updatedAt": "2026-01-01T10:00:00.000Z",
    "favorited": false,
    "favoritesCount": 0,
    "bookmarked": true,
    "author": {
      "username": "jake",
      "bio": null,
      "image": null,
      "following": false
    }
  }
}
```

- `GET /api/articles?limit=&offset=&tag=&author=&favorited=` – optional authentifiziert – Antwort `200`:
  `{"articles":[…],"articlesCount":42}`
- `GET /api/articles/feed?limit=&offset=` – geschützt – Antwort `200`: `{"articles":[…],"articlesCount":7}`
- `POST /api/articles` – geschützt, Body: `{"article":{"title":"…","description":"…","body":"…","tagList":["dragons"]}}`
  – Antwort `201`: `{"article":{…}}`
- `GET /api/articles/:slug` – optional authentifiziert – Antwort `200`: `{"article":{…}}`
- `PUT /api/articles/:slug` – geschützt, Body: `{"article":{"title":"…","description":"…","body":"…","tagList":["…"]}}`
  (alle Felder optional) – Antwort `200`: `{"article":{…}}`
- `DELETE /api/articles/:slug` – geschützt – Antwort `204` ohne Body; die Lesezeichen des Artikels
  werden kaskadierend mit entfernt

### Lesezeichen

- `POST /api/articles/:slug/bookmark` – geschützt, kein Body – Antwort `200`: `{"article":{…"bookmarked":true}}`.
  Idempotent: ein zweiter Aufruf antwortet erneut `200` mit `"bookmarked":true`, ohne ein zweites
  Lesezeichen anzulegen.
- `DELETE /api/articles/:slug/bookmark` – geschützt, kein Body – Antwort `200`: `{"article":{…"bookmarked":false}}`.
  Idempotent: auch ohne vorhandenes Lesezeichen antwortet der Aufruf `200` mit `"bookmarked":false`.
- `GET /api/articles/bookmarks?limit=&offset=` – geschützt – Antwort `200`:
  `{"articles":[…],"articlesCount":3}`. Standardwerte sind `limit=10` und `offset=0`, `limit` wird
  auf höchstens `100` begrenzt, sortiert wird nach `createdAt` absteigend. `articlesCount` ist die
  Gesamtzahl der Lesezeichen des anfragenden Nutzers. Jeder gelieferte Artikel hat
  `"bookmarked":true`.

Ein unbekannter Slug bei `POST`/`DELETE /api/articles/:slug/bookmark` antwortet mit `404` und
`{"errors":{"article":["not found"]}}`. Ein nicht numerischer oder negativer `limit`/`offset`-Wert
bei `GET /api/articles/bookmarks` antwortet mit `400` und
`{"errors":{"limit":["must be a number"]}}` bzw. `{"errors":{"offset":["must be a number"]}}`.

Beispiel mit `curl`:

```shell
# Artikel merken
curl -X POST http://localhost:3000/api/articles/how-to-train-your-dragon/bookmark \
  -H "Authorization: Token $JWT"

# Eigene Lesezeichen auflisten
curl "http://localhost:3000/api/articles/bookmarks?limit=10&offset=0" \
  -H "Authorization: Token $JWT"

# Lesezeichen wieder entfernen
curl -X DELETE http://localhost:3000/api/articles/how-to-train-your-dragon/bookmark \
  -H "Authorization: Token $JWT"
```

### Kommentare

- `GET /api/articles/:slug/comments` – optional authentifiziert – Antwort `200`:
  `{"comments":[{"id":1,"createdAt":"…","updatedAt":"…","body":"…","author":{…}}]}`
- `POST /api/articles/:slug/comments` – geschützt, Body: `{"comment":{"body":"…"}}` – Antwort `200`:
  `{"comment":{"id":1,"createdAt":"…","updatedAt":"…","body":"…","author":{…}}}`
- `DELETE /api/articles/:slug/comments/:id` – geschützt – Antwort `200`: `{}`

### Favoriten und Tags

- `POST /api/articles/:slug/favorite` – geschützt, kein Body – Antwort `200`: `{"article":{…"favorited":true}}`
- `DELETE /api/articles/:slug/favorite` – geschützt, kein Body – Antwort `200`: `{"article":{…"favorited":false}}`
- `GET /api/tags` – optional authentifiziert – Antwort `200`: `{"tags":["dragons","training"]}`

## Deployment auf einem entfernten Server

Auf dem Server werden die Abhängigkeiten installiert, der Prisma-Client erzeugt und die Anwendung
gebaut:

```shell
npm ci
npx prisma generate
npm run build
```

Anschließend startet `start:prod` die Anwendung; es wendet zuvor die Migrationen an:

```shell
npm run start:prod
```

Der Server benötigt dafür `DATABASE_URL`, `JWT_SECRET` und `NODE_ENV=production` (optional `PORT`)
als Umgebungsvariablen. Alternativ lässt sich ein Docker-Image bauen und starten:

```shell
npx nx docker-build api
docker run -p 3000:3000 -e DATABASE_URL=… -e JWT_SECRET=… -e NODE_ENV=production api
```
