const { execFileSync } = require('node:child_process');
const { existsSync } = require('node:fs');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');
const serverEntry = path.join(rootDir, 'dist', 'api', 'main.js');
const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

if (!existsSync(serverEntry)) {
  execFileSync(npm, ['run', 'build'], {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  });
}

execFileSync(
  process.execPath,
  [
    require.resolve('prisma'),
    'migrate',
    'deploy',
    '--schema',
    'src/prisma/schema.prisma',
  ],
  {
    cwd: rootDir,
    stdio: 'inherit',
    env: process.env,
  },
);

require(serverEntry);
