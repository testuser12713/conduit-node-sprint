# ![Node/Express/Prisma Example App](project-logo.png)

[![Build-Status](https://travis-ci.org/anishkny/node-express-realworld-example-app.svg?branch=master)](https://travis-ci.org/anishkny/node-express-realworld-example-app)

> Beispielhafte Node.js-Codebasis (Express + Prisma) mit realen Anwendungsfällen (CRUD, Authentifizierung, fortgeschrittene Muster usw.), die der [RealWorld](https://github.com/gothinkster/realworld-example-apps)-API-Spezifikation folgt.

<a href="https://thinkster.io/tutorials/node-json-api" target="_blank"><img width="454" src="https://raw.githubusercontent.com/gothinkster/realworld/master/media/learn-btn-hr.png" /></a>

## Funktionen

- Registrierung und Anmeldung von Benutzern mit JSON Web Tokens
- Artikel erstellen, lesen, aktualisieren und löschen
- Personalisierter Feed der Autoren, denen man folgt
- Artikel favorisieren und entfavorisieren
- Kommentare zu Artikeln
- Tags und Suche nach Tag, Autor oder Favorit
- Profile anderer Benutzer ansehen sowie folgen und entfolgen
- Geschätzte Lesezeit (`readingTime`) in Minuten für jeden Artikel, berechnet mit 200 Wörtern pro Minute
- Seed-Skript für Demo-Benutzer, Artikel und Kommentare

## Tech-Stack

- **Sprache:** TypeScript auf Node.js
- **HTTP-Framework:** Express
- **ORM:** Prisma
- **Datenbank:** PostgreSQL 18
- **Build-Werkzeug:** Nx (esbuild)
- **Tests:** Jest
- **Formatierung:** Prettier

## Voraussetzungen

- Node.js 18 oder neuer mit npm
- Docker für die lokale PostgreSQL-Datenbank (der Launcher startet sie automatisch)

Wer bereits eine eigene PostgreSQL-Instanz betreibt, kann in `.env` eine passende `DATABASE_URL` hinterlegen; der Launcher startet dann keinen eigenen Container.

## Entwicklung starten

Ein einziger Befehl startet die ganze Anwendung für die Entwicklung – Datenbank und API:

```shell
npm run dev
```

Der Launcher `scripts/dev.js` übernimmt dabei alle nötigen Schritte:

1. Er legt bei Bedarf eine `.env` mit `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV` und `PORT` an. Vorhandene Werte bleiben unverändert.
2. Er startet PostgreSQL 18 im Docker-Container `conduit-postgres` (Image `docker.io/library/postgres:18.6-trixie`), sofern `DATABASE_URL` nicht auf eine andere Datenbank zeigt, und wartet, bis die Datenbank Anfragen annimmt.
3. Er installiert fehlende npm-Abhängigkeiten.
4. Er erzeugt den Prisma Client.
5. Er spielt die vorhandenen Prisma-Migrationen ein.
6. Er startet die API im Watch-Modus unter <http://localhost:3000>.

Alle Endpunkte der API liegen unter `/api`. Mit `Strg+C` wird die API beendet; der Datenbank-Container läuft weiter und wird beim nächsten Start wiederverwendet. Er lässt sich mit `docker stop conduit-postgres` anhalten.

### Umgebungsvariablen

Der Launcher schreibt die benötigten Variablen in die `.env` im Projektverzeichnis. Die Datei gehört nicht ins Repository.

| Variable       | Bedeutung                                        | Wert des Launchers                                          |
| -------------- | ------------------------------------------------ | ----------------------------------------------------------- |
| `DATABASE_URL` | Verbindungszeichenfolge zur PostgreSQL-Datenbank | `postgresql://conduit@localhost:5432/conduit?schema=public` |
| `JWT_SECRET`   | Schlüssel zum Signieren der JWTs                 | zufällig erzeugt (32 Byte, hexadezimal)                     |
| `NODE_ENV`     | Laufzeitumgebung                                 | `development`                                               |
| `PORT`         | Port, auf dem die API lauscht                    | `3000`                                                      |

## Demo-Daten laden

Das Projekt enthält ein Seed-Skript, das Demo-Benutzer mit zufälligen Zugangsdaten, Artikel und Kommentare anlegt. Es wird in einem zweiten Terminal ausgeführt, während die Anwendung läuft:

```shell
npx prisma db seed
```

## API

Basis-URL: <http://localhost:3000/api>. Geschützte Endpunkte erwarten den Header `Authorization: Token <JWT>`; alternativ wird `Bearer <JWT>` akzeptiert.

| Methode  | Pfad                               | Authentifizierung | Body                                                              | Antwort                                                    |
| -------- | ---------------------------------- | ----------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| `POST`   | `/api/users`                       | –                 | `{ "user": { "username", "email", "password" } }`                 | `201` `{ "user": User }`                                   |
| `POST`   | `/api/users/login`                 | –                 | `{ "user": { "email", "password" } }`                             | `200` `{ "user": User }`                                   |
| `GET`    | `/api/user`                        | erforderlich      | –                                                                 | `200` `{ "user": User }`                                   |
| `PUT`    | `/api/user`                        | erforderlich      | `{ "user": { "email", "username", "password", "bio", "image" } }` | `200` `{ "user": User }`                                   |
| `GET`    | `/api/profiles/:username`          | optional          | –                                                                 | `200` `{ "profile": Profile }`                             |
| `POST`   | `/api/profiles/:username/follow`   | erforderlich      | –                                                                 | `200` `{ "profile": Profile }`                             |
| `DELETE` | `/api/profiles/:username/follow`   | erforderlich      | –                                                                 | `200` `{ "profile": Profile }`                             |
| `GET`    | `/api/articles`                    | optional          | –                                                                 | `200` `{ "articles": Article[], "articlesCount": number }` |
| `GET`    | `/api/articles/feed`               | erforderlich      | –                                                                 | `200` `{ "articles": Article[], "articlesCount": number }` |
| `POST`   | `/api/articles`                    | erforderlich      | `{ "article": { "title", "description", "body", "tagList" } }`    | `201` `{ "article": Article }`                             |
| `GET`    | `/api/articles/:slug`              | optional          | –                                                                 | `200` `{ "article": Article }`                             |
| `PUT`    | `/api/articles/:slug`              | erforderlich      | `{ "article": { "title", "description", "body" } }`               | `200` `{ "article": Article }`                             |
| `DELETE` | `/api/articles/:slug`              | erforderlich      | –                                                                 | `204` ohne Inhalt                                          |
| `GET`    | `/api/articles/:slug/comments`     | optional          | –                                                                 | `200` `{ "comments": Comment[] }`                          |
| `POST`   | `/api/articles/:slug/comments`     | erforderlich      | `{ "comment": { "body" } }`                                       | `200` `{ "comment": Comment }`                             |
| `DELETE` | `/api/articles/:slug/comments/:id` | erforderlich      | –                                                                 | `200` `{}`                                                 |
| `POST`   | `/api/articles/:slug/favorite`     | erforderlich      | –                                                                 | `200` `{ "article": Article }`                             |
| `DELETE` | `/api/articles/:slug/favorite`     | erforderlich      | –                                                                 | `200` `{ "article": Article }`                             |
| `GET`    | `/api/tags`                        | optional          | –                                                                 | `200` `{ "tags": string[] }`                               |

`GET /api/articles` akzeptiert die Query-Parameter `offset`, `limit`, `tag`, `author` und `favorited`.

Ein Artikel-Objekt in einer Antwort sieht so aus:

```json
{
  "article": {
    "slug": "how-reading-time-works",
    "title": "How reading time works",
    "description": "A short introduction",
    "body": "The full article text ...",
    "tagList": ["example", "reading"],
    "createdAt": "2026-10-29T10:00:00.000Z",
    "updatedAt": "2026-10-29T10:00:00.000Z",
    "favorited": false,
    "favoritesCount": 0,
    "author": {
      "username": "jane-doe",
      "bio": null,
      "image": null,
      "following": false
    },
    "readingTime": 3
  }
}
```

`readingTime` ist eine ganze Zahl größer oder gleich 1. Sie ergibt sich aus der Wortanzahl des `body` geteilt durch 200, aufgerundet; ein leerer Text ergibt 1.

## Build für Produktion

Die Anwendung wird mit Nx nach `dist/api` gebaut:

```shell
npm run build
```

Der Produktionsstart wendet zuerst die Prisma-Migrationen an und startet dann den gebauten Server:

```shell
node scripts/start.js
```

Dafür müssen `DATABASE_URL` und `JWT_SECRET` in der Umgebung gesetzt sein.

## Deployment auf einem entfernten Server

Die Abhängigkeiten installieren, neue Migrationen einspielen und den Server starten:

```shell
npm ci
npx prisma generate
npx prisma migrate deploy
node dist/api/main.js
```

Alternativ übernimmt `node scripts/start.js` die Migrationen und den Serverstart in einem Schritt. Für den Betrieb als Container steht ein `Dockerfile` bereit:

```shell
npx nx docker-build api
docker run -p 3000:3000 -e DATABASE_URL=... -e JWT_SECRET=... api
```
