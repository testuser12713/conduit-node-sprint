import express from 'express';
import cors from 'cors';
import * as bodyParser from 'body-parser';
import { spawnSync } from 'child_process';
import routes from './app/routes/routes';
import HttpException from './app/models/http-exception.model';

const app = express();

/**
 * App Configuration
 */

app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(routes);

// Serves images
app.use(express.static(__dirname + '/assets'));

app.get('/', (req: express.Request, res: express.Response) => {
  res.json({ status: 'API is running on /api' });
});

/* eslint-disable */
export const errorHandler = (
  err: Error | HttpException,
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) => {
  if (err && err.name === 'UnauthorizedError') {
    return res.status(401).json({
      status: 'error',
      message: 'missing authorization credentials',
    });
  } else if (err instanceof HttpException) {
    res.status(err.errorCode).json(err.message);
  } else if (err) {
    // Anything that is not an HttpException may carry a raw Prisma/SQL message
    // or an internal stacktrace; answer with a fixed message in the
    // HttpException body shape instead of echoing err.message.
    res.status(500).json({ errors: { body: ['internal server error'] } });
  }
};

app.use(errorHandler);

/**
 * Database schema
 *
 * The API always starts against a database the product itself prepared: the
 * repository's own Prisma migrations are applied before the port is bound, so a
 * freshly provisioned, empty database serves requests immediately.
 */

function applyMigrations(): void {
  if (!process.env.DATABASE_URL) {
    console.error(
      'DATABASE_URL is not set. Point it at the PostgreSQL database from RUN.json before starting the API.',
    );
    process.exit(1);
  }

  let prismaCli: string;
  try {
    prismaCli = require.resolve('prisma/build/index.js');
  } catch {
    console.warn(
      'Prisma CLI is not installed; skipping automatic migrations. Apply them with "npx prisma migrate deploy" before starting the API.',
    );
    return;
  }

  const result = spawnSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    console.error(
      'Database migrations failed. Check DATABASE_URL and the migrations in src/prisma/migrations.',
    );
    process.exit(1);
  }
}

/**
 * Server activation
 */

applyMigrations();

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.info(`server up on port ${PORT}`);
});
