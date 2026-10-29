/*
 * Starts the API on the path RUN.json declares.
 *
 * The office starts every product with an empty PostgreSQL database, so the
 * repository's own migrations are applied before the HTTP server starts. The
 * server itself is the built entry point (dist/api/main.js), run in the
 * foreground exactly as the README's deploy section does.
 */
const { spawnSync } = require('child_process');
const path = require('path');

const prisma = require.resolve('prisma/build/index.js');

const migration = spawnSync(process.execPath, [prisma, 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
});

if (migration.error) {
  console.error('Failed to run "prisma migrate deploy":', migration.error.message);
  process.exit(1);
}

if (migration.status !== 0) {
  console.error('"prisma migrate deploy" exited with code %s', migration.status);
  process.exit(migration.status === null ? 1 : migration.status);
}

require(path.join(__dirname, '..', 'dist', 'api', 'main.js'));
