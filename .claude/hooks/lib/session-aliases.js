const fs = require('fs');
const path = require('path');

function listAliases(options = {}) {
  const { limit = 10 } = options;
  const aliasFile = path.join(process.cwd(), '.claude', 'sessions', 'aliases.json');
  try {
    if (!fs.existsSync(aliasFile)) return [];
    const data = JSON.parse(fs.readFileSync(aliasFile, 'utf8'));
    if (!Array.isArray(data)) return [];
    return data.slice(0, limit);
  } catch {
    return [];
  }
}

module.exports = { listAliases };
