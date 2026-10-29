const { execFileSync, spawn } = require('node:child_process');
const { existsSync, readFileSync, writeFileSync } = require('node:fs');
const { randomBytes } = require('node:crypto');
const net = require('node:net');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const prismaSchema = 'src/prisma/schema.prisma';
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const docker = process.platform === 'win32' ? 'docker.exe' : 'docker';

const DEFAULT_DATABASE_URL =
  'postgresql://postgres:postgres@localhost:5432/conduit?schema=public';

const log = (message) => process.stdout.write(`[dev] ${message}\n`);

const parseEnv = (content) => {
  const values = {};

  for (const rawLine of content.split(/\r?\n/)) {
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

    if (key) {
      values[key] = value;
    }
  }

  return values;
};

const loadEnvFile = () => {
  if (!existsSync(envPath)) {
    return;
  }

  const values = parseEnv(readFileSync(envPath, 'utf8'));

  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

const ensureEnvFile = (defaults) => {
  const existing = existsSync(envPath) ? readFileSync(envPath, 'utf8') : '';
  const present = parseEnv(existing);
  const missing = Object.entries(defaults).filter(
    ([key]) => !(key in present) && process.env[key] === undefined,
  );

  if (missing.length === 0) {
    return;
  }

  const lines = existing.trim().length > 0 ? [existing.trimEnd(), ''] : [];

  for (const [key, value] of missing) {
    lines.push(`${key}=${value}`);
  }

  writeFileSync(envPath, `${lines.join('\n')}\n`, 'utf8');

  for (const [key, value] of missing) {
    process.env[key] = value;
  }

  log(`Wrote ${missing.map(([key]) => key).join(', ')} to .env`);
};

const run = (command, args) => {
  log(`$ ${[command, ...args].join(' ')}`);
  execFileSync(command, args, {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });
};

const canConnect = (host, port, timeoutMs = 2000) =>
  new Promise((resolve) => {
    const socket = net.connect({ host, port });

    const finish = (reachable) => {
      socket.removeAllListeners();
      socket.destroy();
      resolve(reachable);
    };

    socket.setTimeout(timeoutMs);
    socket.once('connect', () => finish(true));
    socket.once('timeout', () => finish(false));
    socket.once('error', () => finish(false));
  });

const waitForDatabase = async (host, port, timeoutMs = 60000) => {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (await canConnect(host, port)) {
      return;
    }

    log(`Waiting for PostgreSQL on ${host}:${port} ...`);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  throw new Error(
    `PostgreSQL did not become reachable on ${host}:${port} within ${timeoutMs / 1000}s.`,
  );
};

const databaseTarget = (databaseUrl) => {
  try {
    const parsed = new URL(databaseUrl);

    return {
      host: parsed.hostname || 'localhost',
      port: Number(parsed.port) || 5432,
    };
  } catch {
    return { host: 'localhost', port: 5432 };
  }
};

const isLocalHost = (host) => ['localhost', '127.0.0.1', '::1'].includes(host);

const ensureDatabase = async (databaseUrl) => {
  const { host, port } = databaseTarget(databaseUrl);

  if (!isLocalHost(host)) {
    log(`Using the PostgreSQL instance at ${host}:${port} from DATABASE_URL`);
    return;
  }

  if (await canConnect(host, port)) {
    log(`PostgreSQL is already reachable on ${host}:${port}`);
    return;
  }

  log('Starting the PostgreSQL container ...');

  try {
    run(docker, ['compose', 'up', '-d', 'db']);
  } catch {
    throw new Error(
      'Could not start the PostgreSQL container. Install Docker with Docker Compose ' +
        'and try again, or set DATABASE_URL to a running PostgreSQL 18 instance.',
    );
  }

  await waitForDatabase(host, port);
};

const main = async () => {
  loadEnvFile();

  ensureEnvFile({
    DATABASE_URL: DEFAULT_DATABASE_URL,
    JWT_SECRET: randomBytes(32).toString('hex'),
    NODE_ENV: 'development',
    PORT: '3000',
  });

  const databaseUrl = process.env.DATABASE_URL || DEFAULT_DATABASE_URL;

  if (!existsSync(path.join(rootDir, 'node_modules'))) {
    run(npm, ['install', '--no-audit', '--no-fund']);
  }

  await ensureDatabase(databaseUrl);

  run(npx, ['prisma', 'generate']);
  run(npx, ['prisma', 'migrate', 'deploy', '--schema', prismaSchema]);

  log('Starting the API in watch mode on http://localhost:' + (process.env.PORT || '3000'));

  const server = spawn(npm, ['run', 'start'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });

  const shutdown = () => {
    server.kill('SIGTERM');
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  server.on('exit', (code) => {
    process.exit(code === null ? 0 : code);
  });
};

main().catch((error) => {
  log(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
