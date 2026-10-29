/*
 * One-command development launcher for the whole product.
 *
 * It creates the local environment file when it is missing (including a
 * generated JWT secret), installs the dependencies, generates the Prisma
 * client, starts the PostgreSQL container declared in compose.yaml, waits
 * until the database accepts connections, applies the Prisma migrations and
 * then runs the API in watch mode in the foreground.
 *
 * The office's own start path is scripts/start.js (see RUN.json); this script
 * only bundles the steps a developer would otherwise run by hand.
 */
const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const net = require('net');
const path = require('path');

const root = path.join(__dirname, '..');
const envPath = path.join(root, '.env');
const envExamplePath = path.join(root, '.env.example');
const defaultDatabaseUrl = 'postgresql://app@localhost:5432/app';

const externalDatabaseUrl = process.env.DATABASE_URL;

const loadEnvFile = (file) => {
  const values = {};
  if (!fs.existsSync(file)) {
    return values;
  }

  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const separator = trimmed.indexOf('=');
    if (separator === -1) {
      continue;
    }
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }

  return values;
};

const ensureEnvFile = () => {
  const existed = fs.existsSync(envPath);
  let content = existed
    ? fs.readFileSync(envPath, 'utf8')
    : fs.existsSync(envExamplePath)
    ? fs.readFileSync(envExamplePath, 'utf8')
    : '';

  let changed = !existed;

  if (!/^DATABASE_URL=/m.test(content)) {
    content = `${content.trimEnd()}\nDATABASE_URL=${defaultDatabaseUrl}\n`;
    changed = true;
  }

  if (!/^NODE_ENV=/m.test(content)) {
    content = `${content.trimEnd()}\nNODE_ENV=development\n`;
    changed = true;
  }

  const secretLine = /^JWT_SECRET=(.*)$/m.exec(content);
  if (!secretLine || !secretLine[1].trim()) {
    const generated = `JWT_SECRET=${crypto.randomBytes(32).toString('hex')}`;
    content = secretLine
      ? content.replace(/^JWT_SECRET=.*$/m, generated)
      : `${content.trimEnd()}\n${generated}\n`;
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(
      envPath,
      content.endsWith('\n') ? content : `${content}\n`
    );
    console.log(existed ? 'Updated .env.' : 'Created .env from .env.example.');
  }
};

const fail = (message) => {
  console.error(message);
  process.exit(1);
};

const run = (command, args, env) =>
  spawnSync(command, args, { stdio: 'inherit', cwd: root, env });

const waitForPort = (databaseUrl, timeoutMs = 60000) =>
  new Promise((resolve, reject) => {
    let parsed;
    try {
      parsed = new URL(databaseUrl);
    } catch (error) {
      reject(new Error(`Invalid DATABASE_URL: ${error.message}`));
      return;
    }

    const host = parsed.hostname || 'localhost';
    const port = Number(parsed.port || 5432);
    const deadline = Date.now() + timeoutMs;

    const attempt = () => {
      const socket = net.connect({ host, port });
      socket.once('connect', () => {
        socket.destroy();
        console.log(`Database is reachable at ${host}:${port}.`);
        resolve();
      });
      socket.once('error', () => {
        socket.destroy();
        if (Date.now() >= deadline) {
          reject(
            new Error(
              `Database at ${host}:${port} did not become reachable within ${
                timeoutMs / 1000
              }s.`
            )
          );
          return;
        }
        console.log(`Waiting for database at ${host}:${port} ...`);
        setTimeout(attempt, 1000);
      });
    };

    attempt();
  });

const main = async () => {
  ensureEnvFile();

  const env = { ...loadEnvFile(envPath), ...process.env };
  const databaseUrl = env.DATABASE_URL || defaultDatabaseUrl;

  if (!fs.existsSync(path.join(root, 'node_modules', '.bin', 'nx'))) {
    console.log('Installing dependencies ...');
    const install = run('npm', ['install', '--no-audit', '--no-fund'], env);
    if (install.error || install.status !== 0) {
      fail('Dependency installation failed.');
    }
  }

  const prismaEntry = require.resolve('prisma/build/index.js');

  console.log('Generating the Prisma client ...');
  const generate = run(process.execPath, [prismaEntry, 'generate'], env);
  if (generate.error || generate.status !== 0) {
    fail('"prisma generate" failed.');
  }

  if (externalDatabaseUrl) {
    console.log(
      'Using DATABASE_URL from the environment; not starting the local database container.'
    );
  } else {
    console.log('Starting the PostgreSQL container ...');
    const compose = run('docker', ['compose', 'up', '-d', 'db'], env);
    if (compose.error || compose.status !== 0) {
      fail(
        'Could not start the database. Is Docker with the Compose plugin installed?'
      );
    }
    await waitForPort(databaseUrl);
  }

  console.log('Applying the Prisma migrations ...');
  const migrate = run(
    process.execPath,
    [prismaEntry, 'migrate', 'deploy'],
    env
  );
  if (migrate.error || migrate.status !== 0) {
    fail('"prisma migrate deploy" failed.');
  }

  console.log('Starting the API on port %s ...', env.PORT || 3000);
  const nxEntry = require.resolve('nx/bin/nx.js');
  const server = spawn(process.execPath, [nxEntry, 'serve', 'api'], {
    stdio: 'inherit',
    cwd: root,
    env,
  });

  const forward = (signal) => {
    if (!server.killed) {
      server.kill(signal);
    }
  };
  process.on('SIGINT', () => forward('SIGINT'));
  process.on('SIGTERM', () => forward('SIGTERM'));

  server.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code === null ? 0 : code);
  });
};

main().catch((error) => fail(error.message));
