# ![Node/Express/Prisma Example App](project-logo.png)

Die Conduit-API ist ein Beispiel für eine vollständige Blog-Plattform nach der
[RealWorld](https://github.com/gothinkster/realworld-example-apps)-Spezifikation.
Sie bietet Registrierung und Anmeldung mit JWT, Profile mit Follow-Funktion,
Artikel mit Tags, Favoriten und Kommentare. Jede Artikel-Antwort enthält
zusätzlich `readingTime`, die geschätzte Lesezeit des Artikeltexts in ganzen
Minuten, die zur Laufzeit aus dem Text berechnet und nicht in der Datenbank
gespeichert wird.

## Technischer Aufbau

- **Sprache:** TypeScript auf Node.js
- **Build-System:** Nx-Workspace
- **Web-Framework:** Express
- **Datenbank:** PostgreSQL 18 über Prisma (ORM und Migrationen)
- **Tests:** Jest (Unit-Tests unter `src/tests/`)

## Installation

Voraussetzungen: Node.js und npm sowie Docker für die lokale Datenbank.

```shell
npm install
```

Anschließend den Prisma Client erzeugen:

```shell
npx prisma generate
```

## Datenbank starten

Die mitgelieferte `compose.yaml` startet eine PostgreSQL-Instanz mit den
Zugangsdaten für die lokale Entwicklung:

```shell
docker compose up -d db
```

Die Datenbank ist danach unter `127.0.0.1:5432` erreichbar (Benutzer `conduit`,
Passwort `conduit`, Datenbank `conduit`).

## Umgebungsvariablen

Die Anwendung liest ihre Konfiguration aus Umgebungsvariablen. Die Vorlage
`.env.example` dokumentiert sie. Für die lokale Entwicklung werden die Werte in
der Shell gesetzt:

| Variable       | Beschreibung                                                | Beispiel                                                    |
| -------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| `DATABASE_URL` | PostgreSQL-Verbindung, die Prisma verwendet                 | `postgresql://conduit:conduit@127.0.0.1:5432/conduit`        |
| `JWT_SECRET`   | Schlüssel zum Signieren der JWTs (per `openssl rand -hex 32`) | geheimer Zufallswert                                        |
| `PORT`         | Port, auf dem der Express-Server lauscht (Standard `3000`)  | `3000`                                                      |
| `NODE_ENV`     | Laufzeitumgebung                                            | `development`                                               |

So werden die Werte für die lokale Entwicklung gesetzt:

```shell
export DATABASE_URL="postgresql://conduit:conduit@127.0.0.1:5432/conduit"
export JWT_SECRET="$(openssl rand -hex 32)"
export PORT=3000
export NODE_ENV=development
```

## Anwendung starten

Die Datenbankmigrationen werden beim Start automatisch angewendet, damit eine
frisch gestartete Instanz sofort einsatzbereit ist.

```shell
npx nx serve api
```

Der Server ist danach unter `http://localhost:3000` erreichbar; die API liegt
unter `/api`, und `GET /` beantwortet einen Health-Check.

## Produktions-Build

```shell
npx nx build api
node dist/api/main.js
```

## Datenbank mit Demo-Inhalten füllen

Das Seed-Skript legt Beispielbenutzer, Artikel und Kommentare an:

```shell
npx prisma db seed
```

## Tests ausführen

```shell
npm test
```

## API-Endpunkte

Alle Endpunkte unter `/api` erwarten und liefern JSON. Geschützte Endpunkte
benötigen den Header `Authorization: Bearer <token>`.

### Artikel

| Methode  | Pfad                          | Authentifizierung | Beschreibung                                  |
| -------- | ----------------------------- | ----------------- | --------------------------------------------- |
| `GET`    | `/api/articles`               | optional          | Artikel auflisten (Query: `offset`, `limit`, `tag`, `author`, `favorited`) |
| `GET`    | `/api/articles/feed`          | erforderlich      | Artikel von gefolgten Autoren auflisten       |
| `GET`    | `/api/articles/:slug`         | optional          | Einen Artikel abrufen                         |
| `POST`   | `/api/articles`               | erforderlich      | Artikel erstellen                             |
| `PUT`    | `/api/articles/:slug`         | erforderlich      | Artikel aktualisieren                         |
| `DELETE` | `/api/articles/:slug`         | erforderlich      | Artikel löschen                               |
| `POST`   | `/api/articles/:slug/favorite`   | erforderlich   | Artikel favorisieren                          |
| `DELETE` | `/api/articles/:slug/favorite`   | erforderlich   | Favorit entfernen                             |

Ein Artikel in einer Antwort hat folgende Form:

```json
{
  "article": {
    "slug": "mein-glueckliches-leben-123",
    "title": "Mein glückliches Leben",
    "description": "Eine kurze Beschreibung",
    "body": "Die Geschichte meines glücklichen Lebens.",
    "tagList": ["life", "happiness"],
    "createdAt": "2021-10-01T12:00:00.000Z",
    "updatedAt": "2021-10-02T12:00:00.000Z",
    "favorited": false,
    "favoritesCount": 0,
    "author": {
      "username": "RealWorld",
      "bio": "Mein glückliches Leben",
      "image": null,
      "following": false
    },
    "readingTime": 1
  }
}
```

`GET /api/articles` und `GET /api/articles/feed` liefern dieselbe Artikelform
als Liste:

```json
{
  "articles": [],
  "articlesCount": 0
}
```

### Kommentare

| Methode  | Pfad                                | Authentifizierung | Beschreibung              |
| -------- | ----------------------------------- | ----------------- | ------------------------- |
| `GET`    | `/api/articles/:slug/comments`      | optional          | Kommentare auflisten      |
| `POST`   | `/api/articles/:slug/comments`      | erforderlich      | Kommentar erstellen       |
| `DELETE` | `/api/articles/:slug/comments/:id`  | erforderlich      | Kommentar löschen         |

### Profile und Authentifizierung

| Methode  | Pfad                          | Authentifizierung | Beschreibung              |
| -------- | ----------------------------- | ----------------- | ------------------------- |
| `POST`   | `/api/users`                  | –                 | Benutzer registrieren     |
| `POST`   | `/api/users/login`            | –                 | Anmelden und JWT erhalten |
| `GET`    | `/api/user`                   | erforderlich      | Aktuellen Benutzer abrufen |
| `PUT`    | `/api/user`                   | erforderlich      | Aktuellen Benutzer ändern |
| `GET`    | `/api/profiles/:username`     | optional          | Profil abrufen            |
| `POST`   | `/api/profiles/:username/follow`   | erforderlich | Profil folgen            |
| `DELETE` | `/api/profiles/:username/follow`   | erforderlich | Profil nicht mehr folgen |

### Tags

| Methode | Pfad           | Authentifizierung | Beschreibung        |
| ------- | -------------- | ----------------- | ------------------- |
| `GET`   | `/api/tags`    | –                 | Beliebte Tags holen |

## Funktionen

- Registrierung, Anmeldung und JWT-Authentifizierung
- Profile mit Bio, Bild und Follow-Funktion
- Artikel erstellen, lesen, aktualisieren, löschen, filtern und favorisieren
- Tags je Artikel
- Kommentare zu Artikeln
- Geschätzte Lesezeit (`readingTime`) in jeder Artikel-Antwort
