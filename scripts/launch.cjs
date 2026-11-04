const { join } = require('node:path');
const { existsSync } = require('node:fs');
const { spawn } = require('node:child_process');
const root = join(__dirname, '..');
const cli = join(root, 'node_modules', 'electron', 'cli.js');
if (!existsSync(cli)) { console.error('Run node scripts/setup.js --desktop first.'); process.exitCode = 1; }
else { const child = spawn(process.execPath, [cli, root], { cwd: root, stdio: 'inherit', windowsHide: true }); child.on('error', error => { console.error(error.message); process.exitCode = 1; }); child.on('exit', code => { process.exitCode = code || 0; }); }
