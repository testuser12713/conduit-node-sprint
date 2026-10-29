#!/usr/bin/env node
/**
 * Development launcher: starts the whole product with one command.
 *
 * It prepares the local environment, starts the PostgreSQL database, applies the
 * Prisma migrations and finally runs the API through Nx in watch mode.
 *
 * Requirements: Node.js and Docker. Use DATABASE_URL to point the launcher at an
 * already running PostgreSQL instance instead of the bundled container.
 */
'use strict';

const { execFileSync, spawn } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');

const databaseContainer = 'conduit-postgres';
const databaseImage = 'docker.io/library/postgres:18.6-trixie';
const localDatabaseUrl =
  'postgresql://conduit@localhost:5432/conduit?schema=public';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const log = (message) => console.log(`[dev] ${message}`);
const fail = (message) => {
  console.error(`[dev] ${message}`);
  process.exit(1);
};

const readEnvFile = () => {
  const values = new Map();

  if (!fs.existsSync(envPath)) {
    return values;
  }

  for (const rawLine of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();

    if (!line || line.startsWith('#')) {
      continue;
    }

    const separator = line.indexOf('=');

    if (separator === -1) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values.set(key, value);
  }

  return values;
};

const ensureEnvFile = () => {
  const values = readEnvFile();
  const additions = [];

  if (!values.has('DATABASE_URL')) {
    additions.push(`DATABASE_URL=${localDatabaseUrl}`);
  }

  if (!values.has('JWT_SECRET')) {
    additions.push(`JWT_SECRET=${crypto.randomBytes(32).toString('hex')}`);
  }

  if (!values.has('NODE_ENV')) {
    additions.push('NODE_ENV=development');
  }

  if (!values.has('PORT')) {
    additions.push('PORT=3000');
  }

  if (additions.length > 0) {
    const existing = fs.existsSync(envPath)
      ? fs.readFileSync(envPath, 'utf8')
      : '';
    const separator =
      existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';

    fs.appendFileSync(envPath, `${separator}${additions.join('\n')}\n`);

    log(
      `.env updated: ${additions.map((line) => line.split('=')[0]).join(', ')}`
    );
  }

  return readEnvFile();
};

const buildEnvironment = (values) => {
  const environment = { ...process.env };

  for (const [key, value] of values) {
    if (environment[key] === undefined) {
      environment[key] = value;
    }
  }

  return environment;
};

const run = (command, args, options = {}) =>
  execFileSync(command, args, { cwd: root, stdio: 'inherit', ...options });

const capture = (command, args) => {
  try {
    return execFileSync(command, args, {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
};

const sleep = (milliseconds) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const ensureDatabaseContainer = async () => {
  if (capture('docker', ['--version']) === null) {
    fail(
      'Docker was not found. Install Docker or set DATABASE_URL in .env to an already running PostgreSQL instance.'
    );
  }

  const running = capture('docker', [
    'inspect',
    '--format',
    '{{.State.Running}}',
    databaseContainer,
  ]);

  if (running === null) {
    log(
      `Starting PostgreSQL container ${databaseContainer} (${databaseImage}) ...`
    );

    run('docker', [
      'run',
      '--detach',
      '--name',
      databaseContainer,
      '--env',
      'POSTGRES_USER=conduit',
      '--env',
      'POSTGRES_DB=conduit',
      '--env',
      'POSTGRES_HOST_AUTH_METHOD=trust',
      '--publish',
      '5432:5432',
      '--volume',
      'conduit-postgres-data:/var/lib/postgresql',
      databaseImage,
    ]);
  } else if (running !== 'true') {
    log(`Starting existing PostgreSQL container ${databaseContainer} ...`);
    run('docker', ['start', databaseContainer]);
  } else {
    log(`PostgreSQL container ${databaseContainer} is already running.`);
  }

  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (
      capture('docker', [
        'exec',
        databaseContainer,
        'pg_isready',
        '-U',
        'conduit',
        '-d',
        'conduit',
      ])
    ) {
      log('PostgreSQL is ready.');
      return;
    }

    await sleep(1000);
  }

  fail(
    'PostgreSQL did not become ready in time. Check the container with "docker logs ' +
      databaseContainer +
      '".'
  );
};

const ensureDependencies = () => {
  if (!fs.existsSync(path.join(root, 'node_modules'))) {
    log('Installing dependencies ...');
    run(npmCommand, ['install', '--no-audit', '--no-fund']);
  }
};

const runPrisma = (args, environment) => {
  const prismaCli = require.resolve('prisma/build/index.js');
  run(process.execPath, [prismaCli, ...args], { env: environment });
};

const startApi = (environment) => {
  const nxCli = require.resolve('nx/bin/nx.js');
  const child = spawn(process.execPath, [nxCli, 'serve', 'api'], {
    cwd: root,
    env: environment,
    stdio: 'inherit',
  });

  const forward = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));

  child.on('exit', (code, signal) => {
    if (signal) {
      process.exit(0);
    }

    process.exit(code ?? 0);
  });
};

const main = async () => {
  const values = ensureEnvFile();
  const environment = buildEnvironment(values);

  if (environment.DATABASE_URL === localDatabaseUrl) {
    await ensureDatabaseContainer();
  } else {
    log(
      'DATABASE_URL points to an external database; the local container is not started.'
    );
  }

  ensureDependencies();

  log('Generating the Prisma Client ...');
  runPrisma(['generate'], environment);

  log('Applying database migrations ...');
  runPrisma(['migrate', 'deploy'], environment);

  log(
    'Starting the API at http://localhost:' +
      (environment.PORT || '3000') +
      ' ...'
  );
  startApi(environment);
};

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
