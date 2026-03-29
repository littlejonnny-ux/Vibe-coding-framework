const fs = require('fs');
const path = require('path');

function getPackageManager() {
  const cwd = process.cwd();
  const lockFiles = [
    { file: 'pnpm-lock.yaml', name: 'pnpm' },
    { file: 'yarn.lock', name: 'yarn' },
    { file: 'bun.lockb', name: 'bun' },
    { file: 'package-lock.json', name: 'npm' },
  ];
  for (const { file, name } of lockFiles) {
    if (fs.existsSync(path.join(cwd, file))) {
      return { name, source: `lockfile (${file})` };
    }
  }
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(cwd, 'package.json'), 'utf8'));
    if (pkg.packageManager) {
      const pmName = pkg.packageManager.split('@')[0];
      return { name: pmName, source: 'package.json packageManager field' };
    }
  } catch {}
  return { name: 'npm', source: 'default' };
}

function getSelectionPrompt() {
  return [
    'Tip: Set your preferred package manager by adding a lockfile or',
    'the "packageManager" field to package.json.',
    'Supported: npm, yarn, pnpm, bun.'
  ].join('\n');
}

module.exports = { getPackageManager, getSelectionPrompt };
