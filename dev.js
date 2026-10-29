const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const isWindows = process.platform === 'win32';
const npmCommand = isWindows ? 'npm.cmd' : 'npm';
const localBin = (name) =>
  path.join(root, 'node_modules', '.bin', isWindows ? `${name}.cmd` : name);
const envFile = path.join(root, '.env');
const defaultDatabaseUrl = 'postgresql://app@127.0.0.1:5432/app';

const log = (message) => console.info(`[dev] ${message}`);

const sleep = (milliseconds) => {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds);
};

const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    ...options,
  });

  if (result.error) {
    console.error(`[dev] Could not run ${command}: ${result.error.message}`);
    process.exit(1);
  }

  if (result.status !== 0) {
    console.error(`[dev] ${command} ${args.join(' ')} exited with code ${result.status}`);
    process.exit(result.status === null ? 1 : result.status);
  }
};

const parseEnv = (content) => {
  const values = {};
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || line.trim().startsWith('#')) {
      continue;
    }
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[match[1]] = value;
  }
  return values;
};

const ensureEnvFile = () => {
  const defaults = {
    DATABASE_URL: defaultDatabaseUrl,
    JWT_SECRET: crypto.randomBytes(32).toString('hex'),
    NODE_ENV: 'development',
    PORT: '3000',
  };

  const exists = fs.existsSync(envFile);
  let content = exists ? fs.readFileSync(envFile, 'utf8') : '';
  const existing = parseEnv(content);
  const missing = Object.keys(defaults).filter((key) => !existing[key]);

  if (!exists) {
    content = '# Created by "npm run dev". Adjust the values and restart the launcher.\n';
  }

  if (missing.length) {
    content = content.replace(/\s*$/, '');
    content += content.length ? '\n' : '';
    for (const key of missing) {
      content += `${key}=${defaults[key]}\n`;
    }
    fs.writeFileSync(envFile, content, 'utf8');
    log(`Wrote ${missing.join(', ')} to .env`);
  }

  const values = parseEnv(fs.readFileSync(envFile, 'utf8'));
  for (const [key, value] of Object.entries(values)) {
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
};

const startDatabase = () => {
  if (process.env.DATABASE_URL !== defaultDatabaseUrl) {
    log('DATABASE_URL points to an existing database - the local PostgreSQL container is not started.');
    return;
  }

  log('Starting PostgreSQL (docker compose up -d db)...');
  run('docker', ['compose', 'up', '-d', 'db']);

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const probe = spawnSync(
      'docker',
      ['compose', 'exec', '-T', 'db', 'pg_isready', '-U', 'app', '-d', 'app'],
      { cwd: root, stdio: 'ignore' },
    );
    if (probe.status === 0) {
      log('PostgreSQL is ready.');
      return;
    }
    sleep(1000);
  }

  console.error('[dev] PostgreSQL did not become ready within 60 seconds. Is Docker running?');
  process.exit(1);
};

const main = () => {
  ensureEnvFile();

  if (!fs.existsSync(localBin('nx'))) {
    log('Installing dependencies (npm ci)...');
    run(npmCommand, ['ci', '--no-audit', '--no-fund']);
  }

  startDatabase();

  log('Generating the Prisma client...');
  run(localBin('prisma'), ['generate']);

  log('Applying database migrations...');
  run(localBin('prisma'), ['migrate', 'deploy']);

  const port = process.env.PORT || '3000';
  log(`Starting the API on http://localhost:${port} (all routes under /api)...`);

  const server = spawn(localBin('nx'), ['serve', 'api'], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });

  const stop = (signal) => {
    if (!server.killed) {
      server.kill(signal);
    }
  };

  process.on('SIGINT', () => stop('SIGINT'));
  process.on('SIGTERM', () => stop('SIGTERM'));

  server.on('error', (error) => {
    console.error(`[dev] Could not start the API: ${error.message}`);
    process.exit(1);
  });

  server.on('exit', (code, signal) => {
    if (signal) {
      process.exit(0);
    }
    process.exit(code === null ? 1 : code);
  });
};

main();
