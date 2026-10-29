# Conduit API (Express + Prisma)

Diese API ist eine TypeScript-Implementierung der [RealWorld](https://github.com/gothinkster/realworld)-Spezifikation für Conduit: Registrierung und Anmeldung per JWT, Profile mit Folgen-Funktion, Artikel mit Tags, Kommentaren und Favoriten sowie eine aus dem Artikeltext berechnete Lesezeit (`readingTime`). Die Anwendung besteht aus zwei Teilen, die zusammen gestartet werden: dem HTTP-Server `api` und der PostgreSQL-Datenbank `db`.

## Technologie-Stack

- **Sprache:** TypeScript
- **Laufzeit:** Node.js in einem Nx-Monorepo
- **Web-Framework:** Express
- **ORM:** Prisma
- **Datenbank:** PostgreSQL 18
- **Tests:** Jest

## Voraussetzungen

- Node.js 18 oder neuer mit npm
- Docker mit dem Compose-Plugin (für die lokale PostgreSQL-Datenbank)

## Entwicklung starten

Der gesamte Entwicklungs-Stack – API und PostgreSQL – startet mit einem einzigen Befehl:

```shell
./scripts/dev.sh
```

Der Launcher erledigt die Einrichtung selbst und ist wiederholt ausführbar:

- Er legt beim ersten Start eine `.env` mit einer zufällig erzeugten `JWT_SECRET` an.
- Er installiert die npm-Abhängigkeiten.
- Er startet PostgreSQL 18 über `compose.yaml`, sofern unter der konfigurierten Adresse noch keine Datenbank erreichbar ist.
- Er erzeugt den Prisma Client und wendet die Datenbankmigrationen an.
- Er startet die API im Entwicklungsmodus unter `http://localhost:3000`.

Die API ist danach unter `http://localhost:3000/api` erreichbar; der Health-Endpunkt ist `GET http://localhost:3000/`. Mit `Ctrl+C` wird die API beendet. Die Datenbank läuft weiter und lässt sich mit `docker compose down` stoppen; die Daten bleiben im Volume `conduit-db-data` erhalten.

Die erforderlichen Umgebungsvariablen liest die Anwendung aus der `.env` im Projektwurzelverzeichnis:

| Variable | Bedeutung |
| --- | --- |
| `DATABASE_URL` | PostgreSQL-Verbindungszeichenfolge, z. B. `postgresql://app:app@localhost:5432/app` |
| `JWT_SECRET` | Geheimer Schlüssel zum Signieren der JWTs |
| `NODE_ENV` | Laufzeitmodus, im Entwicklungssatz `development` |
| `PORT` | Port des HTTP-Servers, standardmäßig `3000` |

## Datenbank befüllen

Das Projekt enthält ein Seed-Skript, das Demo-Benutzer, Artikel und Kommentare mit zufälligen Daten anlegt:

```shell
npx prisma db seed
```

## API

Basis-URL: `http://localhost:3000/api`. Geschützte Endpunkte erwarten den Header `Authorization: Bearer <token>`; das Token liefern Registrierung und Anmeldung.

### Endpunkte

| Methode | Pfad | Authentifizierung | Anfrage-Body |
| --- | --- | --- | --- |
| `POST` | `/api/users` | keine | `{ "user": { "username", "email", "password" } }` |
| `POST` | `/api/users/login` | keine | `{ "user": { "email", "password" } }` |
| `GET` | `/api/user` | Bearer-Token | – |
| `PUT` | `/api/user` | Bearer-Token | `{ "user": { "email", "username", "password", "bio", "image" } }` |
| `GET` | `/api/profiles/:username` | optional | – |
| `POST` | `/api/profiles/:username/follow` | Bearer-Token | – |
| `DELETE` | `/api/profiles/:username/follow` | Bearer-Token | – |
| `GET` | `/api/articles` | optional | Query: `offset`, `limit`, `tag`, `author`, `favorited` |
| `GET` | `/api/articles/feed` | Bearer-Token | Query: `offset`, `limit` |
| `POST` | `/api/articles` | Bearer-Token | `{ "article": { "title", "description", "body", "tagList" } }` |
| `GET` | `/api/articles/:slug` | optional | – |
| `PUT` | `/api/articles/:slug` | Bearer-Token | `{ "article": { "title", "description", "body" } }` |
| `DELETE` | `/api/articles/:slug` | Bearer-Token | – |
| `GET` | `/api/articles/:slug/comments` | optional | – |
| `POST` | `/api/articles/:slug/comments` | Bearer-Token | `{ "comment": { "body" } }` |
| `DELETE` | `/api/articles/:slug/comments/:id` | Bearer-Token | – |
| `POST` | `/api/articles/:slug/favorite` | Bearer-Token | – |
| `DELETE` | `/api/articles/:slug/favorite` | Bearer-Token | – |
| `GET` | `/api/tags` | optional | – |

Registrierung und Artikel-Erstellung antworten mit `201`, das Löschen eines Artikels mit `204`, alle übrigen Endpunkte mit `200`.

### Benutzer-Antwort

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

### Artikel-Antwort

Jede Artikel-Antwort – einzelner Artikel, Artikelliste, Feed, erstellter oder aktualisierter Artikel sowie Favorisieren und Entfavorisieren – enthält zusätzlich das Feld `readingTime`:

```json
{
  "article": {
    "slug": "how-to-train-your-dragon",
    "title": "How to train your dragon",
    "description": "Ever wonder how?",
    "body": "You have to believe in yourself.",
    "readingTime": 1,
    "tagList": ["dragons", "training"],
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "favorited": false,
    "favoritesCount": 0,
    "author": {
      "username": "jane",
      "bio": null,
      "image": "https://api.realworld.io/images/smiley-cyrus.jpeg",
      "following": false
    }
  }
}
```

`readingTime` ist die geschätzte Lesezeit in Minuten: Die Wörter des Artikeltexts werden durch 200 geteilt und auf die nächste ganze Minute aufgerundet, mindestens jedoch 1. Der Wert wird bei jeder Antwort im gemeinsamen Article-Mapper berechnet und nicht in der Datenbank gespeichert.

## Produktions-Build

```shell
npm run build
```

Der Build schreibt die ausführbare Anwendung nach `dist/api`.

## Deployment auf einem Server

Auf dem Server werden die Abhängigkeiten aus der Lockdatei installiert, die Migrationen angewendet und anschließend der gebaute Server gestartet:

```shell
npm ci && npx prisma migrate deploy && node dist/api/main.js
```

Dafür müssen `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production` und bei Bedarf `PORT` als Umgebungsvariablen gesetzt sein.

## Funktionen

- Registrierung, Anmeldung und Aktualisierung von Benutzern mit JWT-Authentifizierung
- Profile mit Biografie, Avatar und Folgen/Entfolgen
- Artikel erstellen, lesen, aktualisieren, löschen und paginiert auflisten
- Personalisierter Feed der gefolgten Autoren
- Tags je Artikel und Liste der beliebtesten Tags
- Kommentare zu Artikeln erstellen, lesen und löschen
- Artikel favorisieren und entfavorisieren
- Lesezeit (`readingTime`) in jeder Artikel-Antwort
- Seed-Skript für Demo-Inhalte
- Automatische Datenbankmigrationen beim Start des Servers
