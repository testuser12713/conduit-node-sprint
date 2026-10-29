# ![Conduit-API](project-logo.png)

> Eine vollständige Node.js-Implementierung der [RealWorld](https://github.com/gothinkster/realworld-example-apps)-API („Conduit“) mit Express, Prisma und PostgreSQL.

Dieses Repository enthält die komplette Conduit-API: Registrierung und Anmeldung über JWT, Artikel mit Tags und Kommentaren, Favoriten, Profile mit Folgen-Funktion sowie Lesezeichen für Artikel. Die Anwendung ist als Nx-Monorepo aufgebaut, das Ziel `api` ist der einzige Dienst. Die Daten liegen dauerhaft in PostgreSQL; die Prisma-Migrationen im Repository legen das Schema an.

## Technologie-Stack

- **Sprache:** TypeScript
- **Laufzeit:** Node.js mit Nx-Monorepo (Ziel `api`)
- **Framework:** Express
- **ORM:** Prisma
- **Datenbank:** PostgreSQL 18
- **Tests:** Jest mit Prisma-Mock (Nx-Testkonfiguration)
- **Client-Mock im Repository:** `@ngneat/falso` für die Seed-Daten

## Funktionen

- Registrierung, Anmeldung und Aktualisierung von Benutzern über JWT
- Artikel erstellen, lesen, aktualisieren und löschen
- Paginierte Artikellisten mit Filtern nach Tag, Autor und Favorit sowie ein personalisierter Feed
- Favoriten und Lesezeichen für Artikel, jeweils idempotent
- Paginierte Liste der eigenen Lesezeichen, sortiert nach Erstellungsdatum
- Kommentare zu Artikeln erstellen, lesen und löschen
- Beliebte Tags
- Profile anzeigen sowie anderen Benutzern folgen und entfolgen
- Jede Artikel-Antwort enthält das `bookmarked`-Flag des anfragenden Benutzers
- Beim Löschen eines Artikels werden zugehörige Kommentare, Favoriten und Lesezeichen kaskadierend entfernt

## Voraussetzungen

- Node.js 18 oder neuer (npm ist enthalten)
- Docker mit dem Compose-Plugin für die PostgreSQL-Datenbank

## Schnellstart für die Entwicklung

Das gesamte Produkt – API und PostgreSQL-Datenbank – startet mit einem einzigen Befehl aus dem Projektverzeichnis:

```shell
npm run dev
```

Der Launcher `scripts/dev.js` erledigt dabei alles, was sonst von Hand nötig wäre:

- er legt beim ersten Start die Datei `.env` aus `.env.example` an und erzeugt ein zufälliges `JWT_SECRET`,
- er installiert die Abhängigkeiten, falls `node_modules` noch fehlt,
- er generiert den Prisma-Client,
- er startet den PostgreSQL-Container aus `compose.yaml` und wartet, bis die Datenbank Verbindungen annimmt,
- er wendet die Prisma-Migrationen an und
- er startet die API im Watch-Modus auf Port `3000`.

Danach sind erreichbar:

- API-Basis: `http://localhost:3000/api`
- Health-Endpunkt: `http://localhost:3000/`

Ist `DATABASE_URL` bereits in der Shell gesetzt, verwendet der Launcher diese Datenbank und startet keinen lokalen Container. Die Datenbank lässt sich separat mit `docker compose up -d db` und `docker compose down` verwalten.

## Umgebungsvariablen

Der Launcher schreibt die benötigten Werte selbst in `.env`; die Datei ist von Git ausgeschlossen und darf niemals eingecheckt werden. `.env.example` dient als Vorlage.

| Variable       | Beschreibung                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------ |
| `DATABASE_URL` | Verbindungszeichenfolge zu PostgreSQL, lokal `postgresql://app@localhost:5432/app`               |
| `JWT_SECRET`   | Schlüssel zum Signieren der JWTs; der Launcher erzeugt lokal einen zufälligen Wert               |
| `NODE_ENV`     | Laufzeitumgebung, lokal `development`                                                             |
| `PORT`         | Optionaler Port der API, Standard `3000`                                                         |

In Produktion werden diese Werte direkt in der Umgebung des Hosts gesetzt, nicht über eine eingecheckte Datei.

## Build für die Produktion

```shell
npm run build
```

Der Build liegt anschließend unter `dist/api`. Der Einstiegspunkt ist `dist/api/main.js`.

## Tests

```shell
npm test
```

Die Jest-Suite nutzt die vorhandene Nx-Konfiguration und den Prisma-Mock unter `src/tests/prisma-mock.ts`.

## Seed-Daten

Die Datenbank lässt sich optional mit Demo-Inhalten füllen:

```shell
npx prisma db seed
```

Das Skript legt zwölf Demo-Benutzer mit jeweils zwölf Artikeln und Kommentaren an. Die Zugangsdaten der Demo-Benutzer werden zufällig erzeugt und sind nicht vorgegeben; für eine eigene Anmeldung registriert man sich über `POST /api/users` oder legt einen Benutzer über die API an. Die Datenbank muss dafür laufen und `DATABASE_URL` gesetzt sein.

## API

Alle Routen liegen unter `http://localhost:3000/api`. Geschützte Routen erwarten den Header `Authorization: Bearer <token>`; das Token liefern Registrierung und Anmeldung.

### Antwortform eines Artikels

Jede Artikel-Antwort verwendet dieselbe Form:

```json
{
  "article": {
    "slug": "how-to-train-your-dragon",
    "title": "How to train your dragon",
    "description": "Ever wonder how?",
    "body": "It takes a Jacobian",
    "tagList": ["dragons", "training"],
    "createdAt": "2026-10-29T12:00:00.000Z",
    "updatedAt": "2026-10-29T12:00:00.000Z",
    "favorited": false,
    "favoritesCount": 0,
    "author": {
      "username": "jane",
      "bio": null,
      "image": "https://api.realworld.io/images/smiley-cyrus.jpeg",
      "following": false
    },
    "bookmarked": false
  }
}
```

### Endpunkte

| Methode  | Pfad                                    | Authentifizierung | Beschreibung                                                        |
| -------- | --------------------------------------- | ----------------- | ------------------------------------------------------------------- |
| `POST`   | `/users`                                | –                 | Benutzer registrieren                                               |
| `POST`   | `/users/login`                          | –                 | Benutzer anmelden                                                   |
| `GET`    | `/user`                                 | Bearer JWT        | Aktuellen Benutzer abrufen                                          |
| `PUT`    | `/user`                                 | Bearer JWT        | Aktuellen Benutzer aktualisieren                                    |
| `GET`    | `/profiles/:username`                   | optional          | Profil abrufen                                                      |
| `POST`   | `/profiles/:username/follow`            | Bearer JWT        | Benutzer folgen                                                     |
| `DELETE` | `/profiles/:username/follow`            | Bearer JWT        | Benutzer entfolgen                                                  |
| `GET`    | `/tags`                                 | optional          | Beliebte Tags abrufen                                               |
| `GET`    | `/articles`                             | optional          | Artikel paginiert abrufen (`limit`, `offset`, `tag`, `author`, `favorited`) |
| `GET`    | `/articles/feed`                        | Bearer JWT        | Feed des angemeldeten Benutzers                                     |
| `GET`    | `/articles/bookmarks`                   | Bearer JWT        | Eigene Lesezeichen (`limit` Standard 10, `offset` Standard 0)       |
| `POST`   | `/articles`                             | Bearer JWT        | Artikel erstellen                                                   |
| `GET`    | `/articles/:slug`                       | optional          | Einzelnen Artikel abrufen                                           |
| `PUT`    | `/articles/:slug`                       | Bearer JWT        | Artikel aktualisieren                                               |
| `DELETE` | `/articles/:slug`                       | Bearer JWT        | Artikel löschen                                                     |
| `GET`    | `/articles/:slug/comments`              | optional          | Kommentare eines Artikels abrufen                                   |
| `POST`   | `/articles/:slug/comments`              | Bearer JWT        | Kommentar erstellen                                                 |
| `DELETE` | `/articles/:slug/comments/:id`          | Bearer JWT        | Kommentar löschen                                                   |
| `POST`   | `/articles/:slug/favorite`              | Bearer JWT        | Artikel favorisieren                                                |
| `DELETE` | `/articles/:slug/favorite`              | Bearer JWT        | Favorit entfernen                                                   |
| `POST`   | `/articles/:slug/bookmark`              | Bearer JWT        | Artikel als Lesezeichen merken                                      |
| `DELETE` | `/articles/:slug/bookmark`              | Bearer JWT        | Lesezeichen entfernen                                               |

### Beispiele

**Benutzer registrieren**

```http
POST /api/users
Content-Type: application/json

{
  "user": {
    "username": "jane",
    "email": "jane@example.com",
    "password": "secret"
  }
}
```

Antwort `201 Created`:

```json
{
  "user": {
    "email": "jane@example.com",
    "username": "jane",
    "bio": null,
    "image": "https://api.realworld.io/images/smiley-cyrus.jpeg",
    "token": "<jwt>"
  }
}
```

**Artikel erstellen**

```http
POST /api/articles
Authorization: Bearer <jwt>
Content-Type: application/json

{
  "article": {
    "title": "How to train your dragon",
    "description": "Ever wonder how?",
    "body": "It takes a Jacobian",
    "tagList": ["dragons", "training"]
  }
}
```

Antwort `201 Created`: `{ "article": { ... } }` in der oben gezeigten Artikelform.

**Lesezeichen setzen und entfernen**

```http
POST /api/articles/how-to-train-your-dragon/bookmark
Authorization: Bearer <jwt>
```

Antwort `200 OK` mit `article.bookmarked === true`. Ein weiterer `POST` auf denselben Artikel bleibt folgenlos und antwortet ebenfalls `200 OK`. Das Gegenstück ist `DELETE /api/articles/how-to-train-your-dragon/bookmark` mit `article.bookmarked === false` in der Antwort.

**Eigene Lesezeichen abrufen**

```http
GET /api/articles/bookmarks?limit=10&offset=0
Authorization: Bearer <jwt>
```

Antwort `200 OK`:

```json
{
  "articles": [
    {
      "slug": "how-to-train-your-dragon",
      "title": "How to train your dragon",
      "description": "Ever wonder how?",
      "body": "It takes a Jacobian",
      "tagList": ["dragons", "training"],
      "createdAt": "2026-10-29T12:00:00.000Z",
      "updatedAt": "2026-10-29T12:00:00.000Z",
      "favorited": false,
      "favoritesCount": 0,
      "author": {
        "username": "jane",
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

Die Liste enthält ausschließlich die Lesezeichen des angemeldeten Benutzers, absteigend nach dem Erstellungsdatum der Artikel. `articlesCount` ist die Gesamtzahl der Lesezeichen, unabhängig von `limit` und `offset`.

### Fehler

- `401 Unauthorized` ohne gültiges Token im von der Authentifizierung erzeugten Format
- `404 Not Found` bei unbekanntem Artikel-Slug: `{ "errors": { "article": ["not found"] } }`
- `422 Unprocessable Entity` bei ungültigen Eingaben, etwa fehlenden Pflichtfeldern oder bereits vergebenen Benutzernamen

## Deploy auf einem entfernten Server

Umgebungsvariablen (`DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, optional `PORT`) im Host setzen. Danach:

```shell
npm ci && npm run build && npx prisma migrate deploy && node dist/api/main.js
```

Alternativ lässt sich ein Container-Image über die mitgelieferte `Dockerfile` bauen:

```shell
npx nx docker-build api
docker run -p 3000:3000 -t api
```
