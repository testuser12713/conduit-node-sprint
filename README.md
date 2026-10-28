# ![Conduit API](project-logo.png)

Conduit ist eine REST-API für eine Blogging-Plattform im Stil von Medium. Sie
bietet Registrierung und Anmeldung per JSON Web Token, Profile mit Folge-
Beziehungen, Artikel mit Tags, Kommentaren und Favoriten sowie Lesezeichen:
Angemeldete Nutzer können Artikel merken und wieder entfernen, jede
Artikel-Antwort enthält für den anfragenden Nutzer das Feld `bookmarked`, und
eine paginierte Liste der eigenen Lesezeichen steht unter
`GET /api/articles/bookmarks` bereit. Die API basiert auf dem
[RealWorld](https://github.com/gothinkster/realworld)-Vertrag und wird mit
Express, Prisma und PostgreSQL betrieben.

## Tech-Stack

- **Sprache:** TypeScript
- **Framework:** Express im Nx-Workspace (Projekt `api`)
- **ORM:** Prisma, Migrationen unter `src/prisma/migrations`
- **Datenbank:** PostgreSQL (Version 18)
- **Tests:** Jest über `npx nx test api`

## Installation

```shell
npm ci
npx prisma generate
```

## Datenbank starten

Die API benötigt eine PostgreSQL-Datenbank. Für die lokale Entwicklung lässt
sich eine Wegwerf-Datenbank mit Docker starten (Passwort selbst setzen):

```shell
export DB_PASSWORD="$(openssl rand -hex 16)"

docker run --name conduit-db \
  -e POSTGRES_USER=conduit \
  -e POSTGRES_PASSWORD="$DB_PASSWORD" \
  -e POSTGRES_DB=conduit \
  -p 5432:5432 \
  -d docker.io/library/postgres:18.6-trixie
```

## Umgebungsvariablen

Die Anwendung liest ihre Konfiguration ausschließlich aus der Umgebung. Es sind
keine Zugangsdaten im Repository hinterlegt.

| Variable       | Pflicht | Beschreibung                                                                 |
| -------------- | ------- | ---------------------------------------------------------------------------- |
| `DATABASE_URL` | ja      | PostgreSQL-Verbindungszeichenfolge, z. B. aus `RUN.json`                     |
| `JWT_SECRET`   | ja      | geheimer Schlüssel zum Signieren der Tokens; pro Umgebung neu erzeugen       |
| `NODE_ENV`     | nein    | `production` oder `development` (Standard: kein gesetzter Wert)              |
| `PORT`         | nein    | HTTP-Port der API (Standard: `3000`)                                         |

Beispiel für eine lokale Sitzung:

```shell
export DATABASE_URL="postgresql://conduit:$DB_PASSWORD@localhost:5432/conduit?schema=public"
export JWT_SECRET="$(openssl rand -hex 32)"
export NODE_ENV=production
```

## Schema anwenden

Alle mitgelieferten Migrationen auf die Datenbank anwenden:

```shell
npx prisma migrate deploy
```

## Starten

Entwicklungsmodus beziehungsweise normaler Start:

```shell
npx nx serve api
```

Die API lauscht anschließend unter `http://localhost:3000/api`. Der
Gesundheits-Endpunkt `GET /` antwortet mit
`{"status":"API is running on /api"}`.

## Produktionsbuild

```shell
npx nx build api
node dist/api/main.js
```

## Demo-Daten

Das Seed-Skript legt zufällig erzeugte Demo-Nutzer samt Artikeln und Kommentaren
an. Feste Demo-Zugangsdaten werden nicht erzeugt; für eigene Tests einen Nutzer
über `POST /api/users` registrieren.

```shell
npx prisma db seed
```

## Verwendung

Alle Endpunkte liegen unter `/api`. Geschützte Endpunkte erwarten den
JWT im Header:

```http
Authorization: Token <jwt>
```

`Bearer <jwt>` wird ebenfalls akzeptiert. Jede Antwort der Artikel-Routen trägt
den Header `Cache-Control: private, no-store`, weil `bookmarked` vom anfragenden
Nutzer abhängt. Artikel-Antworten enthalten niemals die Liste der Nutzer, die
einen Artikel gemerkt haben, sondern nur das boolesche Feld `bookmarked`.

### Artikel-Antwortformat

```json
{
  "article": {
    "slug": "how-to-train-your-dragon-1",
    "title": "How to train your dragon",
    "description": "Ever wonder how?",
    "body": "It takes a Jacobian",
    "tagList": ["dragons", "training"],
    "createdAt": "2026-01-01T10:00:00.000Z",
    "updatedAt": "2026-01-01T10:00:00.000Z",
    "favorited": false,
    "favoritesCount": 0,
    "bookmarked": false,
    "author": {
      "username": "jake",
      "bio": null,
      "image": null,
      "following": false
    }
  }
}
```

### Authentifizierung

| Methode | Pfad             | Auth      | Body / Query                                        | Antwort                                                  |
| ------- | ---------------- | --------- | --------------------------------------------------- | -------------------------------------------------------- |
| POST    | `/api/users`     | nein      | `{"user":{"username","email","password"}}`          | `201` `{"user":{"email","username","bio","image","token"}}` |
| POST    | `/api/users/login` | nein    | `{"user":{"email","password"}}`                     | `200` `{"user":{... ,"token":"<jwt>"}}`                   |
| GET     | `/api/user`      | Token     | –                                                   | `200` `{"user":{"email","username","bio","image","token"}}` |
| PUT     | `/api/user`      | Token     | `{"user":{"email?","username?","password?","bio?","image?"}}` | `200` `{"user":{...}}`                    |

### Profile

| Methode | Pfad                              | Auth  | Body / Query | Antwort                                                            |
| ------- | --------------------------------- | ----- | ------------ | ------------------------------------------------------------------ |
| GET     | `/api/profiles/:username`         | optional | –         | `200` `{"profile":{"username","bio","image","following"}}`           |
| POST    | `/api/profiles/:username/follow`  | Token | –            | `200` `{"profile":{"username","bio","image","following":true}}`      |
| DELETE  | `/api/profiles/:username/follow`  | Token | –            | `200` `{"profile":{"username","bio","image","following":false}}`     |

### Artikel

| Methode | Pfad                                | Auth     | Body / Query                                                                 | Antwort                                  |
| ------- | ----------------------------------- | -------- | ---------------------------------------------------------------------------- | ---------------------------------------- |
| GET     | `/api/articles`                     | optional | `offset`, `limit`, `tag`, `author`, `favorited`                              | `200` `{"articles":[…],"articlesCount":n}` |
| GET     | `/api/articles/feed`                | Token    | `offset`, `limit`                                                            | `200` `{"articles":[…],"articlesCount":n}` |
| GET     | `/api/articles/bookmarks`           | Token    | `offset`, `limit` (Standard `0`, `10`; `limit` höchstens `50`)                | `200` `{"articles":[…],"articlesCount":n}` |
| GET     | `/api/articles/:slug`               | optional | –                                                                            | `200` `{"article":{…}}`                  |
| POST    | `/api/articles`                     | Token    | `{"article":{"title","description","body","tagList":[]}}`                    | `201` `{"article":{…}}`                  |
| PUT     | `/api/articles/:slug`               | Token    | `{"article":{"title?","description?","body?","tagList?":[]}}`                 | `200` `{"article":{…}}`                  |
| DELETE  | `/api/articles/:slug`               | Token    | –                                                                            | `204`                                    |
| POST    | `/api/articles/:slug/favorite`      | Token    | –                                                                            | `200` `{"article":{…}}`                  |
| DELETE  | `/api/articles/:slug/favorite`      | Token    | –                                                                            | `200` `{"article":{…}}`                  |
| POST    | `/api/articles/:slug/bookmark`      | Token    | –                                                                            | `200` `{"article":{…}}`                  |
| DELETE  | `/api/articles/:slug/bookmark`      | Token    | –                                                                            | `200` `{"article":{…}}`                  |

Das Merken ist idempotent: ein zweites `POST` bleibt bei `200` mit
`bookmarked: true`, ein wiederholtes `DELETE` bei `200` mit
`bookmarked: false`. Ohne gültigen Token antworten die Lesezeichen-Endpunkte mit
`401`; ein unbekannter Slug mit `404` im Format `{"errors":{…}}`. Beim Löschen
eines Artikels werden seine Lesezeichen mit entfernt.

Beispiel:

```shell
curl -X POST http://localhost:3000/api/articles/how-to-train-your-dragon-1/bookmark \
  -H "Authorization: Token $TOKEN"
```

### Kommentare

| Methode | Pfad                                | Auth     | Body / Query              | Antwort                                          |
| ------- | ----------------------------------- | -------- | ------------------------- | ------------------------------------------------ |
| GET     | `/api/articles/:slug/comments`      | optional | –                         | `200` `{"comments":[{"id","body","author",…}]}`  |
| POST    | `/api/articles/:slug/comments`      | Token    | `{"comment":{"body"}}`    | `200` `{"comment":{"id","body","author",…}}`    |
| DELETE  | `/api/articles/:slug/comments/:id`  | Token    | –                         | `200` `{}`                                       |

### Tags

| Methode | Pfad        | Auth     | Body / Query | Antwort                              |
| ------- | ----------- | -------- | ------------ | ------------------------------------ |
| GET     | `/api/tags` | optional | –            | `200` `{"tags":["dragon","training"]}` |

## Funktionen

- Registrierung, Anmeldung und Profilpflege mit JWT-Authentifizierung
- Profile mit Folgen und Entfolgen
- Artikel erstellen, lesen, aktualisieren und löschen
- Tags und Kommentare zu Artikeln
- Artikel favorisieren und Favoriten-Zähler
- Artikel merken und Lesezeichen entfernen (idempotent)
- Paginierte Liste der eigenen Lesezeichen, neueste zuerst
- `bookmarked` in jeder Artikel-Antwort und `Cache-Control: private, no-store`
  auf allen Artikel-Routen
- Lesezeichen werden beim Löschen eines Artikels automatisch mit entfernt

## Tests

```shell
npx nx test api
```
