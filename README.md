# ![Conduit API](project-logo.png)

[![Build Status](https://travis-ci.org/anishkny/node-express-realworld-example-app.svg?branch=master)](https://travis-ci.org/anishkny/node-express-realworld-example-app)

> Conduit API (RealWorld) with authentication, articles, tags, comments, favorites and profiles. Every article response additionally carries the estimated reading time `readingTime` in minutes.

## Overview

This repository contains the Conduit API, a Node.js/Express implementation of the [RealWorld](https://github.com/gothinkster/realworld-example-apps) specification. The API manages users, articles, tags, comments, favorites and profiles, and stores everything in PostgreSQL through Prisma.

All article responses — single article, article list, feed as well as the responses after creating and updating an article — include the field `readingTime`: the rounded-up reading time of the article text at 200 words per minute, at least 1. The value is computed from `body` at response time; there is no database column and no migration for it. Comment responses do not include `readingTime`.

## Tech stack

- **Language:** TypeScript
- **Runtime:** Node.js
- **Framework:** Express
- **ORM / database:** Prisma with PostgreSQL 18
- **Build and workspace:** Nx
- **Tests:** Jest
- **Local database:** Docker Compose (`compose.yaml`)

## Prerequisites

- Node.js 22 and npm
- Docker with Docker Compose, for the local PostgreSQL instance

Nothing else needs to be set up: the development launcher takes care of the database, the environment file, the Prisma client and the migrations.

## Quick start (development)

A single command starts the whole application — API and database:

```shell
npm run dev
```

The launcher `scripts/dev.cjs` performs all the steps itself:

- it installs the npm dependencies when `node_modules` is missing,
- it creates a `.env` with `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV` and `PORT` when the file does not exist yet,
- it starts PostgreSQL 18 through Docker Compose (`compose.yaml`, port `5432`),
- it generates the Prisma client and applies all migrations,
- it starts the API in watch mode on <http://localhost:3000>.

The API is then reachable at <http://localhost:3000/api>; the root path `/` answers with:

```json
{ "status": "API is running on /api" }
```

The database can afterwards be stopped with `docker compose down`. The launcher keeps using a PostgreSQL instance that is already reachable; it only starts the container from `compose.yaml` when `DATABASE_URL` points to a local address where no database is answering yet.

## Configuration

The launcher writes missing values into the `.env` file in the project root. To use custom values, edit that file or set the variables directly in the environment; environment variables that are already set take precedence.

| Variable | Purpose | Launcher default |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:postgres@localhost:5432/conduit?schema=public` |
| `JWT_SECRET` | Secret used to sign the JWTs | randomly generated (32 bytes, hex) |
| `NODE_ENV` | Runtime environment | `development` |
| `PORT` | Port of the API | `3000` |

In production, `DATABASE_URL` and `JWT_SECRET` must be provided from the outside; never keep `JWT_SECRET` in the repository.

## Database and seed

`npm run dev` applies the migrations automatically. The database then contains an empty schema.

To populate it with demo data:

```shell
npx prisma db seed
```

The seed script creates twelve demo users together with articles and comments. The credentials of the demo users are generated randomly; there are no fixed demo logins.

## Build, production and deployment

Create a production build:

```shell
npx nx build api
```

Install, migrate and start on a server:

```shell
npm ci && npx prisma migrate deploy && node dist/api/main.js
```

`DATABASE_URL` and `JWT_SECRET` must be set in the environment for this. Alternatively, build a container from the included `Dockerfile`:

```shell
npx nx docker-build api
docker run -p 3000:3000 -e DATABASE_URL=... -e JWT_SECRET=... api
```

## API

Base path: `/api`. Protected endpoints expect the header `Authorization: Token <jwt>` (or `Bearer <jwt>`). Request and response bodies are JSON.

### Authentication and users

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| `POST` | `/api/users` | – | `{ "user": { "username": string, "email": string, "password": string } }` | `201 { "user": { "email", "username", "bio", "image", "token" } }` |
| `POST` | `/api/users/login` | – | `{ "user": { "email": string, "password": string } }` | `200 { "user": { "email", "username", "bio", "image", "token" } }` |
| `GET` | `/api/user` | yes | – | `200 { "user": { "email", "username", "bio", "image", "token" } }` |
| `PUT` | `/api/user` | yes | `{ "user": { "email"?, "username"?, "password"?, "bio"?, "image"? } }` | `200 { "user": { ... } }` |

### Profiles

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/profiles/:username` | optional | – | `200 { "profile": { "username", "bio", "image", "following" } }` |
| `POST` | `/api/profiles/:username/follow` | yes | – | `200 { "profile": { ... } }` |
| `DELETE` | `/api/profiles/:username/follow` | yes | – | `200 { "profile": { ... } }` |

### Articles

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/articles?offset&limit&tag&author&favorited` | optional | – | `200 { "articles": Article[], "articlesCount": number }` |
| `GET` | `/api/articles/feed?offset&limit` | yes | – | `200 { "articles": Article[], "articlesCount": number }` |
| `GET` | `/api/articles/:slug` | optional | – | `200 { "article": Article }` |
| `POST` | `/api/articles` | yes | `{ "article": { "title", "description", "body", "tagList": string[] } }` | `201 { "article": Article }` |
| `PUT` | `/api/articles/:slug` | yes | `{ "article": { "title"?, "description"?, "body"? } }` | `200 { "article": Article }` |
| `DELETE` | `/api/articles/:slug` | yes | – | `204` |

Example of an article response (`GET /api/articles/:slug`):

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

`readingTime` is an integer number of minutes, at least `1` — also for an empty `body`.

### Comments and favorites

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/articles/:slug/comments` | optional | – | `200 { "comments": Comment[] }` |
| `POST` | `/api/articles/:slug/comments` | yes | `{ "comment": { "body": string } }` | `200 { "comment": Comment }` |
| `DELETE` | `/api/articles/:slug/comments/:id` | yes | – | `200 {}` |
| `POST` | `/api/articles/:slug/favorite` | yes | – | `200 { "article": Article }` |
| `DELETE` | `/api/articles/:slug/favorite` | yes | – | `200 { "article": Article }` |

Comment responses contain `id`, `createdAt`, `updatedAt`, `body` and `author` — but no `readingTime`.

### Tags

| Method | Path | Auth | Body | Response |
| --- | --- | --- | --- | --- |
| `GET` | `/api/tags` | optional | – | `200 { "tags": string[] }` |

Returns the ten most used tags.

## Features

- Registration, login and JWT authentication
- Read and update the user profile
- View, follow and unfollow other users' profiles
- Create, read, update and delete articles
- Article list with filters by tag, author and favorite, plus pagination
- Personal feed of followed authors
- Create, read and delete comments on articles
- Favorite and unfavorite articles
- Popular tags
- Estimated reading time `readingTime` in all article responses
- Demo data through a seed script

## Tests and checks

```shell
npm test
npx nx build api
```
