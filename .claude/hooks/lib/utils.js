const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function getSessionsDir() {
  const root = getProjectRoot();
  return path.join(root, '.claude', 'sessions');
}

function getSessionSearchDirs() {
  const dirs = [getSessionsDir()];
  const homeDir = path.join(getHomeDir(), '.claude', 'sessions');
  if (homeDir !== dirs[0]) {
    dirs.push(homeDir);
  }
  return dirs;
}

function getLearnedSkillsDir() {
  const root = getProjectRoot();
  return path.join(root, '.claude', 'sessions', 'learned-skills');
}

function getTempDir() {
  return process.env.TEMP || process.env.TMP || require('os').tmpdir();
}

function getDateTimeString() {
  return `${getDateString()} ${getTimeString()}`;
}

function getDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getTimeString() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  return `${h}:${min}`;
}

function getSessionIdShort() {
  const sessionId = process.env.CLAUDE_SESSION_ID || '';
  if (sessionId) return sessionId.slice(0, 8);
  return String(process.pid).slice(-6);
}

function getProjectName() {
  const root = getProjectRoot();
  try {
    const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
    if (pkg.name) return pkg.name;
  } catch {}
  return path.basename(root);
}

function findFiles(dir, pattern, options = {}) {
  if (!fs.existsSync(dir)) return [];
  const { maxAge } = options;
  const now = Date.now();
  const maxAgeMs = maxAge ? maxAge * 24 * 60 * 60 * 1000 : Infinity;
  const regexStr = '^' + pattern.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$';
  const regex = new RegExp(regexStr);
  try {
    const entries = fs.readdirSync(dir);
    const results = [];
    for (const entry of entries) {
      if (!regex.test(entry)) continue;
      const fullPath = path.join(dir, entry);
      try {
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) continue;
        if (now - stat.mtimeMs > maxAgeMs) continue;
        results.push({ path: fullPath, mtime: stat.mtimeMs });
      } catch {}
    }
    results.sort((a, b) => b.mtime - a.mtime);
    return results;
  } catch {
    return [];
  }
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function appendFile(filePath, text) {
  fs.appendFileSync(filePath, text, 'utf8');
}

function readFile(filePath) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

function writeFile(filePath, text) {
  fs.writeFileSync(filePath, text, 'utf8');
}

function runCommand(cmd) {
  try {
    const output = execSync(cmd, {
      encoding: 'utf8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
    return { success: true, output };
  } catch (err) {
    return { success: false, output: (err.stderr || err.message || '').trim() };
  }
}

function stripAnsi(str) {
  if (!str) return str;
  return str.replace(/\u001b\[[0-9;]*m/g, '');
}

function log(msg) {
  process.stderr.write(msg + '\n');
}

function getProjectRoot() {
  try {
    return execSync('git rev-parse --show-toplevel', {
      encoding: 'utf8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim();
  } catch {
    return process.cwd();
  }
}

function getHomeDir() {
  return process.env.USERPROFILE || process.env.HOME || require('os').homedir();
}

module.exports = {
  getSessionsDir,
  getSessionSearchDirs,
  getLearnedSkillsDir,
  getTempDir,
  getDateTimeString,
  getDateString,
  getTimeString,
  getSessionIdShort,
  getProjectName,
  findFiles,
  ensureDir,
  appendFile,
  readFile,
  writeFile,
  runCommand,
  stripAnsi,
  log
};
