import express from 'express';
import cors from 'cors';
import * as bodyParser from 'body-parser';
import { execFileSync } from 'child_process';
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
app.use(
  (
    err: Error | HttpException,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    // @ts-ignore
    if (err && err.name === 'UnauthorizedError') {
      return res.status(401).json({
        status: 'error',
        message: 'missing authorization credentials',
      });
      // @ts-ignore
    } else if (err && err.errorCode) {
      // @ts-ignore
      res.status(err.errorCode).json(err.message);
    } else if (err) {
      res.status(500).json(err.message);
    }
  },
);

/**
 * Apply the database migrations before serving so a freshly started
 * application always finds its schema in place.
 */

const applyMigrations = (): void => {
  let prismaCli: string;

  try {
    prismaCli = require.resolve('prisma/build/index.js');
  } catch {
    console.warn(
      'Prisma CLI is not installed in this runtime; apply migrations with "prisma migrate deploy" before starting.',
    );
    return;
  }

  console.info('Applying database migrations');
  execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
    stdio: 'inherit',
  });
};

applyMigrations();

/**
 * Server activation
 */

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.info(`server up on port ${PORT}`);
});
