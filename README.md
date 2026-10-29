# Conduit API (Express + Prisma)

This API is a TypeScript implementation of the [RealWorld](https://github.com/gothinkster/realworld) specification for Conduit: registration and login with JWT, profiles with follow support, articles with tags, comments and favorites, plus a reading time (`readingTime`) calculated from the article body. The application consists of two parts that start together: the `api` HTTP server and the `db` PostgreSQL database.

## Tech stack

- **Language:** TypeScript
- **Runtime:** Node.js in an Nx monorepo
- **Web framework:** Express
- **ORM:** Prisma
- **Database:** PostgreSQL 18
- **Tests:** Jest

## Prerequisites

- Node.js 18 or newer with npm
- Docker (the Compose plugin is recommended; without it the launcher starts the database container directly with `docker run`)

## Start development

The entire development stack – API and PostgreSQL – starts with a single command:

```shell
./scripts/dev.sh
```

The launcher handles setup itself and can be run repeatedly:

- On first start it creates a `.env` with a randomly generated `JWT_SECRET`.
- It installs the npm dependencies, including dev dependencies.
- It starts PostgreSQL 18 via `compose.yaml` if no database is reachable at the configured address.
- It generates the Prisma client and applies the database migrations.
- It starts the API in development mode at `http://localhost:3000`.

The API is then available at `http://localhost:3000/api`; the health endpoint is `GET http://localhost:3000/`. Press `Ctrl+C` to stop the API. The database keeps running and can be stopped with `docker compose down` (or `docker stop conduit-postgres` if the launcher started it with `docker run`); the data stays in the `conduit-db-data` volume.

The application reads the required environment variables from the `.env` file in the project root:

| Variable | Meaning |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string, for example `postgresql://app:app@localhost:5432/app` |
| `JWT_SECRET` | Secret key used to sign JWTs |
| `NODE_ENV` | Runtime mode, `development` in the development setup |
| `PORT` | HTTP server port, `3000` by default |

## Seed the database

The project includes a seed script that creates demo users, articles and comments with random data:

```shell
npx prisma db seed
```

## API

Base URL: `http://localhost:3000/api`. Protected endpoints expect the header `Authorization: Bearer <token>`; registration and login return the token.

### Endpoints

| Method | Path | Authentication | Request body |
| --- | --- | --- | --- |
| `POST` | `/api/users` | none | `{ "user": { "username", "email", "password" } }` |
| `POST` | `/api/users/login` | none | `{ "user": { "email", "password" } }` |
| `GET` | `/api/user` | Bearer token | – |
| `PUT` | `/api/user` | Bearer token | `{ "user": { "email", "username", "password", "bio", "image" } }` |
| `GET` | `/api/profiles/:username` | optional | – |
| `POST` | `/api/profiles/:username/follow` | Bearer token | – |
| `DELETE` | `/api/profiles/:username/follow` | Bearer token | – |
| `GET` | `/api/articles` | optional | Query: `offset`, `limit`, `tag`, `author`, `favorited` |
| `GET` | `/api/articles/feed` | Bearer token | Query: `offset`, `limit` |
| `POST` | `/api/articles` | Bearer token | `{ "article": { "title", "description", "body", "tagList" } }` |
| `GET` | `/api/articles/:slug` | optional | – |
| `PUT` | `/api/articles/:slug` | Bearer token | `{ "article": { "title", "description", "body" } }` |
| `DELETE` | `/api/articles/:slug` | Bearer token | – |
| `GET` | `/api/articles/:slug/comments` | optional | – |
| `POST` | `/api/articles/:slug/comments` | Bearer token | `{ "comment": { "body" } }` |
| `DELETE` | `/api/articles/:slug/comments/:id` | Bearer token | – |
| `POST` | `/api/articles/:slug/favorite` | Bearer token | – |
| `DELETE` | `/api/articles/:slug/favorite` | Bearer token | – |
| `GET` | `/api/tags` | optional | – |

Registration and article creation respond with `201`, deleting an article with `204`, and all other endpoints with `200`.

### User response

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

### Article response

Every article response – single article, article list, feed, created or updated article, and favorite/unfavorite – additionally contains the `readingTime` field:

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

`readingTime` is the estimated reading time in minutes: the article body's word count is divided by 200 and rounded up to the next whole minute, with a minimum of 1. The value is calculated on every response in the shared article mapper and is not stored in the database.

## Production build

```shell
npm run build
```

The build writes the runnable application to `dist/api`.

## Deploy on a server

On the server, install the dependencies from the lockfile, apply the migrations and then start the built server:

```shell
npm ci && npx prisma migrate deploy && node dist/api/main.js
```

`DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production` and, if needed, `PORT` must be set as environment variables.

## Features

- Registration, login and user updates with JWT authentication
- Profiles with bio, avatar and follow/unfollow
- Create, read, update, delete and paginate articles
- Personal feed of followed authors
- Tags per article and a list of popular tags
- Create, read and delete article comments
- Favorite and unfavorite articles
- Reading time (`readingTime`) in every article response
- Seed script for demo content
- Automatic database migrations when the server starts
