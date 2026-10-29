# ![Conduit API](project-logo.png)

Conduit ist eine REST-API für eine Blogging-Plattform. Nutzer registrieren sich, melden sich per JWT an und verwalten Artikel mit Tags, Kommentaren und Favoriten. Zusätzlich kann jeder angemeldete Nutzer Artikel als Lesezeichen speichern, wieder entfernen und seine Lesezeichen paginiert abrufen. Alle Daten liegen in PostgreSQL, der Zugriff erfolgt über Prisma; jede Artikel-Antwort enthält ein nutzerbezogenes `bookmarked`-Flag.

## Tech-Stack

- **Sprache:** TypeScript
- **Framework:** Express in einem Nx-Monorepo (ein API-Service)
- **ORM:** Prisma mit Migrationen in `src/prisma/migrations`
- **Datenbank:** PostgreSQL 18
- **Tests:** Jest (`jest.config.ts`, `src/tests`)
- **Build:** esbuild über Nx
- **Code-Stil:** Prettier und ESLint

## Voraussetzungen

- Node.js 18 oder neuer mit npm
- Docker mit Docker Compose (für die lokale PostgreSQL-Datenbank)

## Schnellstart für die Entwicklung

```shell
npm run dev
```

Dieser eine Befehl startet das gesamte Produkt. Der Launcher (`dev.js`) erledigt dabei alles selbst:

1. Er installiert die Abhängigkeiten, falls `node_modules` noch fehlt.
2. Er legt beim ersten Start eine `.env` mit Entwicklungsstandardwerten an, darunter ein zufällig erzeugtes `JWT_SECRET`.
3. Er startet PostgreSQL 18 als Docker-Container (`compose.yaml`, Port 5432) und wartet, bis die Datenbank Verbindungen annimmt.
4. Er erzeugt den Prisma-Client und wendet alle Migrationen an.
5. Er startet die API im Watch-Modus auf `http://localhost:3000`. Alle fachlichen Routen liegen unter `/api`, die Statusroute ist `GET /`.

Beenden lässt sich der Launcher mit `Strg+C`. Die Datenbank läuft danach weiter; stoppen lässt sie sich mit `docker compose down`. Die Daten bleiben im Docker-Volume erhalten und werden erst mit `docker compose down -v` gelöscht.

## Umgebungsvariablen

| Variable       | Bedeutung                                                              | Standardwert des Launchers              |
| -------------- | ---------------------------------------------------------------------- | --------------------------------------- |
| `DATABASE_URL` | Verbindungsadresse der PostgreSQL-Datenbank                            | `postgresql://app@127.0.0.1:5432/app`   |
| `JWT_SECRET`   | Schlüssel zum Signieren und Prüfen der JWTs                            | zufällig erzeugt, 32 Byte als Hex       |
| `NODE_ENV`     | Laufzeitumgebung                                                       | `development`                           |
| `PORT`         | Port, auf dem die API lauscht                                          | `3000`                                  |

`npm run dev` schreibt fehlende Werte in die `.env` und überschreibt vorhandene Einträge nicht. Bereits gesetzte Umgebungsvariablen haben Vorrang vor der `.env`. In Produktion müssen `DATABASE_URL` und `JWT_SECRET` von außen gesetzt werden; einen Standardwert für `JWT_SECRET` gibt es dort nicht.

## Beispieldaten einspielen (Seed)

Während `npm run dev` läuft, in einem zweiten Terminal:

```shell
npx prisma db seed
```

Der Seed legt 12 Demo-Nutzer mit je 12 Artikeln, Kommentaren und 2 bis 4 Lesezeichen an. Die Demo-Nutzer haben zufällig erzeugte E-Mail-Adressen und Passwörter; es gibt also kein festes Demo-Login. Für eigene Zugänge reicht eine Registrierung über `POST /api/users`.

## Produktion bauen und starten

```shell
npm ci --include=dev
npx prisma generate
npm run build
node start.js
```

`start.js` wendet zuerst alle Migrationen auf die Datenbank an und startet danach den gebauten Server aus `dist/api/main.js`. Vor dem Start müssen `DATABASE_URL` und `JWT_SECRET` gesetzt sein, außerdem empfiehlt sich `NODE_ENV=production`; `PORT` ist optional und steht standardmäßig auf `3000`.

Alternativ als Docker-Image. Die Migrationen müssen vorher einmal gegen dieselbe Datenbank laufen (`DATABASE_URL=... npx prisma migrate deploy`); das Image selbst führt keine Migrationen aus:

```shell
npx nx docker-build api
docker run -p 3000:3000 \
  -e DATABASE_URL="postgresql://<benutzer>:<passwort>@<host>:5432/<datenbank>" \
  -e JWT_SECRET="<signierschluessel>" \
  api
```

## Verwendung der API

Basis-URL: `http://localhost:3000/api`. Geschützte Endpunkte erwarten den Token im Header, entweder als `Authorization: Token <jwt>` oder als `Authorization: Bearer <jwt>`. Registrierung und Login liefern den Token in der Antwort.

Fachliche und Validierungsfehler haben das Format `{ "errors": { "<feld>": ["<meldung>"] } }`. Fehlende oder ungültige Zugangsdaten ergeben `401` mit `{ "status": "error", "message": "..." }`, unbekannte Ressourcen `404` und ungültige Eingaben `422`. Ein unerwarteter Serverfehler liefert `500` mit `{ "errors": { "body": ["internal server error"] } }` und ohne interne Details.

### Endpunkte

| Methode  | Pfad                                      | Auth     | Body / Query                                                                 |
| -------- | ----------------------------------------- | -------- | ---------------------------------------------------------------------------- |
| `GET`    | `/api/tags`                               | optional | –                                                                            |
| `POST`   | `/api/users`                              | –        | `{ "user": { username, email, password } }`                                   |
| `POST`   | `/api/users/login`                        | –        | `{ "user": { email, password } }`                                             |
| `GET`    | `/api/user`                               | nötig    | –                                                                            |
| `PUT`    | `/api/user`                               | nötig    | `{ "user": { email?, username?, password?, bio?, image? } }`                  |
| `GET`    | `/api/profiles/:username`                 | optional | –                                                                            |
| `POST`   | `/api/profiles/:username/follow`          | nötig    | –                                                                            |
| `DELETE` | `/api/profiles/:username/follow`          | nötig    | –                                                                            |
| `GET`    | `/api/articles`                           | optional | Query: `limit`, `offset`, `tag`, `author`, `favorited`                        |
| `GET`    | `/api/articles/feed`                      | nötig    | Query: `limit`, `offset`                                                     |
| `POST`   | `/api/articles`                           | nötig    | `{ "article": { title, description, body, tagList } }`                        |
| `GET`    | `/api/articles/bookmarks`                 | nötig    | Query: `limit` (1–100, Standard 10), `offset` (≥ 0, Standard 0)               |
| `GET`    | `/api/articles/:slug`                     | optional | –                                                                            |
| `PUT`    | `/api/articles/:slug`                     | nötig    | `{ "article": { title?, description?, body?, tagList? } }`                    |
| `DELETE` | `/api/articles/:slug`                     | nötig    | –                                                                            |
| `GET`    | `/api/articles/:slug/comments`            | optional | –                                                                            |
| `POST`   | `/api/articles/:slug/comments`            | nötig    | `{ "comment": { body } }`                                                     |
| `DELETE` | `/api/articles/:slug/comments/:id`        | nötig    | –                                                                            |
| `POST`   | `/api/articles/:slug/favorite`            | nötig    | –                                                                            |
| `DELETE` | `/api/articles/:slug/favorite`            | nötig    | –                                                                            |
| `POST`   | `/api/articles/:slug/bookmark`            | nötig    | –                                                                            |
| `DELETE` | `/api/articles/:slug/bookmark`            | nötig    | –                                                                            |

`GET /api/articles/bookmarks` wird vor `GET /api/articles/:slug` ausgewertet, damit `bookmarks` nicht als Slug interpretiert wird.

### Artikel-Antwort

Alle Artikel-Antworten haben dieselbe Form. `bookmarked` bezieht sich auf den Anfragenden und ist ohne Token immer `false`:

```json
{
  "article": {
    "slug": "mein-erster-artikel-1",
    "title": "Mein erster Artikel",
    "description": "Eine kurze Zusammenfassung",
    "body": "Der vollständige Text des Artikels.",
    "tagList": ["einführung", "conduit"],
    "createdAt": "2026-01-15T10:00:00.000Z",
    "updatedAt": "2026-01-15T10:00:00.000Z",
    "favorited": false,
    "favoritesCount": 0,
    "bookmarked": true,
    "author": {
      "username": "jane",
      "bio": null,
      "image": "https://api.realworld.io/images/smiley-cyrus.jpeg",
      "following": false
    }
  }
}
```

### Lesezeichen

`POST /api/articles/:slug/bookmark` merkt den Artikel für den angemeldeten Nutzer vor. Die Antwort ist `200` mit `{ "article": { ... } }` und `bookmarked: true`; alle übrigen Artikelfelder bleiben unverändert. Ein unbekannter Slug ergibt `404` mit `{ "errors": { "article": ["not found"] } }`, ein fehlender Token `401`.

`DELETE /api/articles/:slug/bookmark` entfernt das Lesezeichen und antwortet mit `200` und `bookmarked: false`. Der Aufruf ist idempotent: Auch ein Artikel, der nicht gemerkt war, liefert `200`. Unbekannter Slug ergibt `404`, fehlender Token `401`.

`GET /api/articles/bookmarks?limit=10&offset=0` liefert ausschließlich die Lesezeichen des angemeldeten Nutzers, absteigend nach `createdAt` sortiert:

```json
{
  "articles": [
    {
      "slug": "mein-erster-artikel-1",
      "title": "Mein erster Artikel",
      "description": "Eine kurze Zusammenfassung",
      "body": "Der vollständige Text des Artikels.",
      "tagList": ["einführung", "conduit"],
      "createdAt": "2026-01-15T10:00:00.000Z",
      "updatedAt": "2026-01-15T10:00:00.000Z",
      "favorited": false,
      "favoritesCount": 0,
      "bookmarked": true,
      "author": {
        "username": "jane",
        "bio": null,
        "image": "https://api.realworld.io/images/smiley-cyrus.jpeg",
        "following": false
      }
    }
  ],
  "articlesCount": 1
}
```

`articlesCount` ist die Gesamtzahl der Lesezeichen unabhängig von `limit` und `offset`. Ungültige Werte werden vor der Abfrage geprüft und mit `422` beantwortet, etwa `{ "errors": { "limit": ["must be an integer between 1 and 100"] } }` oder `{ "errors": { "offset": ["must be an integer greater than or equal to 0"] } }`. Ohne Token antwortet der Endpunkt mit `401`.

### Beispiele mit curl

Registrierung:

```shell
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"user":{"username":"jane","email":"jane@example.com","password":"secret123"}}'
```

Antwort (`201`):

```json
{
  "user": {
    "id": 1,
    "email": "jane@example.com",
    "username": "jane",
    "bio": null,
    "image": "https://api.realworld.io/images/smiley-cyrus.jpeg",
    "token": "<jwt>"
  }
}
```

Artikel anlegen:

```shell
curl -X POST http://localhost:3000/api/articles \
  -H "Content-Type: application/json" \
  -H "Authorization: Token <jwt>" \
  -d '{"article":{"title":"Mein erster Artikel","description":"Eine kurze Zusammenfassung","body":"Der vollständige Text des Artikels.","tagList":["einführung"]}}'
```

Artikel merken und Lesezeichen abrufen:

```shell
curl -X POST http://localhost:3000/api/articles/mein-erster-artikel-1/bookmark \
  -H "Authorization: Token <jwt>"

curl "http://localhost:3000/api/articles/bookmarks?limit=10&offset=0" \
  -H "Authorization: Token <jwt>"
```

## Funktionen

- Registrierung, Login und JWT-Authentifizierung
- Eigenes Profil lesen und aktualisieren
- Profile anderer Nutzer ansehen, folgen und entfolgen
- Artikel anlegen, lesen, aktualisieren und löschen
- Artikellisten mit Filtern nach Tag, Autor und Favorit sowie Paginierung
- Feed der Artikel gefolgter Autoren
- Kommentare zu Artikeln anlegen, lesen und löschen
- Artikel favorisieren und Favoriten zurücknehmen
- Artikel als Lesezeichen merken und entfernen, idempotent und pro Nutzer
- Paginierte Liste der eigenen Lesezeichen
- Nutzerbezogenes `bookmarked`-Flag in jeder Artikel-Antwort
- Beliebte Tags abrufen
- Seed mit Demo-Nutzern, Artikeln, Kommentaren und Lesezeichen

## Projektstruktur

- `src/main.ts` – Einstiegspunkt des Express-Servers
- `src/app/routes` – Controller und Services für Auth, Artikel, Profile und Tags
- `src/app/middleware` – zentrale Fehlerbehandlung
- `src/prisma/schema.prisma` – Datenmodell
- `src/prisma/migrations` – SQL-Migrationen
- `src/prisma/seed.ts` – Seed-Skript
- `src/tests` – Jest-Tests
- `start.js` – Produktionsstart mit Migrationen
- `dev.js` – Entwicklungslauncher für API und Datenbank

## Tests

```shell
npm test
```

Lint:

```shell
npx nx lint api
```
