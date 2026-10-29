const { execFileSync } = require('child_process');
const path = require('path');

const prismaCli = require.resolve('prisma/build/index.js');

execFileSync(process.execPath, [prismaCli, 'migrate', 'deploy'], {
  cwd: __dirname,
  env: process.env,
  stdio: 'inherit',
});

require(path.join(__dirname, 'dist', 'api', 'main.js'));
