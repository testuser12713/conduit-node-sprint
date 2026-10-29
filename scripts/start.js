/**
 * Production entry point used by RUN.json.
 *
 * Every office run starts the database empty, so the repository's own Prisma
 * migrations are applied before the API starts serving. The migration command is
 * started with the same Node.js binary that runs this file, so no global tool or
 * shell is required.
 */
const { execFileSync } = require('node:child_process');
const path = require('node:path');

const prismaCli = require.resolve('prisma/build/index.js');

execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: process.env,
});

require(path.join(__dirname, '..', 'dist', 'api', 'main.js'));
