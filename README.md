# ![Node/Express/Prisma Example App](project-logo.png)

[![Build Status](https://travis-ci.org/anishkny/node-express-realworld-example-app.svg?branch=master)](https://travis-ci.org/anishkny/node-express-realworld-example-app)

> ### Example Node (Express + Prisma) codebase containing real world examples (CRUD, auth, advanced patterns, etc) that adheres to the [RealWorld](https://github.com/gothinkster/realworld-example-apps) API spec.

<a href="https://thinkster.io/tutorials/node-json-api" target="_blank"><img width="454" src="https://raw.githubusercontent.com/gothinkster/realworld/master/media/learn-btn-hr.png" /></a>

## Getting Started

### Prerequisites

You need Node.js, npm and Docker (for the local PostgreSQL database).

Run the following command to install dependencies:

```shell
npm install
```

### Environment variables

This project depends on some environment variables.
If you are running this project locally, create a `.env` file at the root for these variables.
Your host provider should included a feature to set them there directly to avoid exposing them.

Here are the required ones:

```
DATABASE_URL=
JWT_SECRET=
NODE_ENV=production
```

### Generate your Prisma client

Run the following command to generate the Prisma Client which will include types based on your database schema:

```shell
npx prisma generate
```

### Apply any SQL migration script

Run the following command to create/update your database based on existing sql migration scripts:

```shell
npx prisma migrate deploy
```

### Run the project

The following command starts the whole product for development — the PostgreSQL
database and the API — in one go:

```shell
./dev.sh
```

It starts the `db` service from `compose.yaml` (PostgreSQL 18, port 5432), waits
until the database accepts connections, applies the database schema with
`npx prisma migrate deploy`, and then runs the API on http://localhost:3000 in
the foreground. The API health endpoint is `GET /`.

`dev.sh` reads a local `.env` file when present. Without one it uses
`postgresql://conduit:conduit@localhost:5432/conduit?schema=public` as
`DATABASE_URL` and generates an ephemeral `JWT_SECRET` for the run. Stop the API
with `Ctrl+C`; the database keeps running in the background and can be stopped
with:

```shell
docker compose down
```

### Seed the database

The project includes a seed script to populate the database:

```shell
npx prisma db seed
```

## Deploy on a remote server

Run the following command to:
- install dependencies
- apply any new migration sql scripts
- run the server

```shell
npm ci && npx prisma migrate deploy && node dist/api/main.js
```
