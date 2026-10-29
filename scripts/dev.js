#!/usr/bin/env node
/**
 * Development launcher for the whole product.
 *
 * Starts every service of the product: the PostgreSQL database (through
 * Docker Compose) and the API. On the way it installs the dependencies, creates
 * the local .env with a generated JWT secret, generates the Prisma client and
 * applies the database migrations.
 */
const { spawn, spawnSync } = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const envFile = path.join(root, '.env');
const envExampleFile = path.join(root, '.env.example');
const isWindows = process.platform === 'win32';

const log = (message) => console.log(`\n[dev] ${message}`);

const fail = (message) => {
  console.error(`\n[dev] ${message}`);
  process.exit(1);
};

const run = (command, args) => {
  log(`$ ${command} ${args.join(' ')}`);
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: isWindows,
    env: process.env,
  });

  if (result.error) {
    fail(`Could not run "${command}": ${result.error.message}`);
  }

  if (result.status !== 0) {
    process.exit(result.status === null ? 1 : result.status);
  }
};

const ensureEnvFile = () => {
  const exists = fs.existsSync(envFile);

  if (!exists && !fs.existsSync(envExampleFile)) {
    fail('Missing .env and .env.example. Cannot configure the environment.');
  }

  let content = fs.readFileSync(exists ? envFile : envExampleFile, 'utf8');

  if (!/^JWT_SECRET=.+$/m.test(content)) {
    const secret = crypto.randomBytes(32).toString('hex');
    content = /^JWT_SECRET=.*$/m.test(content)
      ? content.replace(/^JWT_SECRET=.*$/m, `JWT_SECRET=${secret}`)
      : `${content.replace(/\s*$/, '')}\nJWT_SECRET=${secret}\n`;
    fs.writeFileSync(envFile, content);
    log('Created .env with a freshly generated JWT_SECRET.');
    return;
  }

  if (!exists) {
    fs.writeFileSync(envFile, content);
    log('Created .env from .env.example.');
  }
};

const loadEnvFile = () => {
  const content = fs.readFileSync(envFile, 'utf8');

  content.split(/\r?\n/).forEach((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);

    if (!match) {
      return;
    }

    const [, key, rawValue] = match;
    let value = rawValue;

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
};

const dependenciesAreMissing = () => {
  const modules = path.join(root, 'node_modules');

  if (!fs.existsSync(modules)) {
    return true;
  }

  const installedLock = path.join(modules, '.package-lock.json');
  const projectLock = path.join(root, 'package-lock.json');

  if (!fs.existsSync(installedLock) || !fs.existsSync(projectLock)) {
    return true;
  }

  return fs.statSync(installedLock).mtimeMs < fs.statSync(projectLock).mtimeMs;
};

const startDatabase = () => {
  log('Starting the PostgreSQL database with Docker Compose...');
  run('docker', ['compose', 'up', '-d', '--wait', 'db']);
};

const main = () => {
  ensureEnvFile();
  loadEnvFile();

  if (!process.env.DATABASE_URL) {
    fail('DATABASE_URL is missing. Set it in .env (see .env.example).');
  }

  if (dependenciesAreMissing()) {
    run('npm', ['install', '--no-audit', '--no-fund']);
  } else {
    log('Dependencies are already installed, skipping npm install.');
  }

  run('npx', ['prisma', 'generate']);

  startDatabase();

  log('Applying the database migrations...');
  run('npx', ['prisma', 'migrate', 'deploy']);

  log(`Starting the API on http://localhost:${process.env.PORT || 3000} ...`);
  const api = spawn('npm', ['start'], {
    cwd: root,
    stdio: 'inherit',
    shell: isWindows,
    env: process.env,
  });

  const forwardSignal = (signal) => {
    if (!api.killed) {
      api.kill(signal);
    }
  };

  process.on('SIGINT', () => forwardSignal('SIGINT'));
  process.on('SIGTERM', () => forwardSignal('SIGTERM'));

  api.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code === null ? 0 : code);
  });
};

main();
