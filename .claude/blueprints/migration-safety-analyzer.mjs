#!/usr/bin/env node
/**
 * Migration Safety Analyzer — 3-level protection for Supabase migrations.
 *
 * Level 1 (BLOCK): DROP TABLE, TRUNCATE, DELETE without WHERE
 * Level 2 (BLOCK unless marker): DROP COLUMN, ALTER TYPE, SET NOT NULL, DROP CONSTRAINT, RLS
 * Level 3 (INFO): dry-run row-count stub (requires live preview DB)
 *
 * Escape-hatch markers (in last commit message or PR body):
 *   [explicit-data-loss: reason]  — acknowledges L1 destructive op; requires backup file
 *   [column-unused: reason]       — acknowledges DROP COLUMN on unused column
 *   [type-compatible: reason]     — acknowledges ALTER COLUMN TYPE
 *   [rls-reviewed: reason]        — acknowledges RLS/POLICY change
 *   [execute-reviewed: reason]    — acknowledges dynamic EXECUTE in plpgsql
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ROOT = process.cwd();
const MIGRATIONS_DIR = process.argv[2] || 'supabase/migrations';

// ─── Git helper (spawnSync — no shell, static args, no user input) ────────────

function git(...args) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    timeout: 10000,
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result.status === 0 ? (result.stdout || '').trim() : '';
}

// ─── Escape-hatch marker detection ───────────────────────────────────────────

function parseMarkers(text) {
  return {
    explicitDataLoss: /\[explicit-data-loss\s*:/i.test(text),
    columnUnused:     /\[column-unused\s*:/i.test(text),
    typeCompatible:   /\[type-compatible\s*:/i.test(text),
    rlsReviewed:      /\[rls-reviewed\s*:/i.test(text),
    executeReviewed:  /\[execute-reviewed\s*:/i.test(text),
  };
}

function getCommitMarkers() {
  const msg = git('log', '-1', '--pretty=%B');
  return parseMarkers(msg);
}

function getPrBodyMarkers() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return parseMarkers('');
  try {
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const body = event?.pull_request?.body || '';
    return parseMarkers(body);
  } catch {
    return parseMarkers('');
  }
}

function getDbReviewerVerdict() {
  const eventPath = process.env.GITHUB_EVENT_PATH;
  if (!eventPath || !fs.existsSync(eventPath)) return null;
  try {
    const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));
    const body = event?.pull_request?.body || '';
    const match = body.match(/<!--\s*DB-REVIEWER-VERDICT\s*-->([\s\S]*?)<!--\s*\/DB-REVIEWER-VERDICT\s*-->/i);
    if (!match) return null;
    const verdict = match[1].trim().toUpperCase();
    if (verdict.includes('APPROVED')) return 'APPROVED';
    if (verdict.includes('REJECTED')) return 'REJECTED';
    return null;
  } catch {
    return null;
  }
}

// ─── SQL pre-processing ───────────────────────────────────────────────────────

function stripSqlCommentsAndLiterals(sql) {
  let result = sql;

  // Strip dollar-quoted strings (e.g. $$ ... $$ or $tag$ ... $tag$)
  result = result.replace(/\$([^$]*)\$[\s\S]*?\$\1\$/g, "''");

  // Strip single-quoted string literals
  result = result.replace(/'(?:[^'\\]|\\.)*'/g, "''");

  // Strip double-quoted identifiers
  result = result.replace(/"(?:[^"\\]|\\.)*"/g, '""');

  // Strip block comments /* ... */
  result = result.replace(/\/\*[\s\S]*?\*\//g, ' ');

  // Strip line comments -- ...
  result = result.replace(/--[^\n]*/g, ' ');

  return result;
}

// ─── Extract plpgsql bodies from dollar-quoted blocks ────────────────────────
// Must run on RAW sql (before stripSqlCommentsAndLiterals replaces $$ with '')

function extractPlpgsqlBodies(rawSql) {
  const bodies = [];
  // Match $tag$...$tag$ (including $$...$$)
  const re = /\$([^$\s]*)\$([\s\S]*?)\$\1\$/g;
  let match;
  while ((match = re.exec(rawSql)) !== null) {
    bodies.push(match[2]);
  }
  return bodies;
}

// Detect dangerous EXECUTE patterns inside plpgsql bodies:
//   EXECUTE variable;
//   EXECUTE 'literal' || expr
//   EXECUTE format(...)
// Returns true if a suspicious EXECUTE is found.
function hasDangerousExecute(bodies) {
  for (const body of bodies) {
    // Strip line comments inside body first (simple pass)
    const cleaned = body.replace(/--[^\n]*/g, ' ');

    // Match EXECUTE followed by any expression (no lookahead — check statically after capture)
    const execRe = /\bEXECUTE\s+(\S[^\n;]*)/gi;
    let m;
    while ((m = execRe.exec(cleaned)) !== null) {
      const expr = m[1].trimEnd();

      // Safe: EXECUTE 'static string' with no concatenation (handles PostgreSQL '' escapes)
      const isStaticLiteral = /^'(?:''|[^'])*'\s*(?:INTO\s+\S+)?\s*;?\s*$/.test(expr);
      if (isStaticLiteral) continue;

      // Dangerous: concatenation, format(), or bare identifier (dynamic variable)
      const isDangerous =
        expr.includes('||') ||
        /\bformat\s*\(/.test(expr) ||
        // bare identifier at start — dynamic variable (not a quoted string)
        /^[a-z_]\w*/i.test(expr);

      if (isDangerous) return true;
    }
  }
  return false;
}

// ─── Level 1: Hard blocks ─────────────────────────────────────────────────────

const L1_PATTERNS = [
  {
    id:      'drop-table',
    pattern: /\bDROP\s+TABLE\b/i,
    message: 'DROP TABLE detected — irreversible data loss.',
    marker:  'explicitDataLoss',
  },
  {
    id:      'truncate',
    pattern: /\bTRUNCATE\b/i,
    message: 'TRUNCATE detected — deletes all rows without recovery.',
    marker:  'explicitDataLoss',
  },
  {
    id:      'delete-no-where',
    // Negative lookahead: match DELETE FROM <table> not followed by WHERE anywhere after it
    pattern: /\bDELETE\s+FROM\s+\S+(?![\s\S]*\bWHERE\b)/i,
    message: 'DELETE without WHERE — deletes all rows in table.',
    marker:  'explicitDataLoss',
  },
];

// ─── Level 2: Soft blocks (markers can unlock) ───────────────────────────────

const L2_PATTERNS = [
  {
    id:      'drop-column',
    pattern: /\bDROP\s+COLUMN\b/i,
    message: 'DROP COLUMN detected — data in column will be lost.',
    marker:  'columnUnused',
    // If we also find UPDATE/migrate-data reference before the DROP, it's safer
    mitigationPattern: /\bUPDATE\b/i,
  },
  {
    id:      'alter-column-type',
    pattern: /\bALTER\s+COLUMN\s+\S+\s+(?:SET\s+DATA\s+)?TYPE\b/i,
    message: 'ALTER COLUMN TYPE — may fail or truncate existing data.',
    marker:  'typeCompatible',
    dbReviewerOverride: true,
  },
  {
    id:      'set-not-null',
    pattern: /\bSET\s+NOT\s+NULL\b/i,
    message: 'SET NOT NULL — will fail if column contains NULLs.',
    marker:  'typeCompatible',
  },
  {
    id:      'add-unique',
    pattern: /\bADD\s+(?:CONSTRAINT\s+\S+\s+)?UNIQUE\b/i,
    message: 'ADD UNIQUE constraint — will fail if duplicate values exist.',
    marker:  'typeCompatible',
  },
  {
    id:      'drop-constraint',
    pattern: /\bDROP\s+CONSTRAINT\b/i,
    message: 'DROP CONSTRAINT — removes data integrity protection.',
    marker:  'columnUnused',
  },
  {
    id:      'rls-policy',
    pattern: /\b(?:ENABLE\s+ROW\s+LEVEL\s+SECURITY|DISABLE\s+ROW\s+LEVEL\s+SECURITY|CREATE\s+POLICY|DROP\s+POLICY|ALTER\s+POLICY)\b/i,
    message: 'RLS/POLICY change — security surface modification.',
    marker:  'rlsReviewed',
    dbReviewerOverride: true,
  },
  // Note: EXECUTE detection is handled separately via extractPlpgsqlBodies + hasDangerousExecute
  // because it requires analyzing raw dollar-quoted blocks before stripping.
];

function executeReviewerOverride(dbReviewerVerdict) {
  return dbReviewerVerdict === 'APPROVED';
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

function analyzeMigration(filePath, markers, dbReviewerVerdict) {
  const absPath = path.join(ROOT, filePath);
  if (!fs.existsSync(absPath)) {
    return { file: filePath, findings: [{ level: 'WARN', message: 'File not found — skipped.' }] };
  }

  const raw = fs.readFileSync(absPath, 'utf8');
  const plpgsqlBodies = extractPlpgsqlBodies(raw);
  const sql = stripSqlCommentsAndLiterals(raw);
  const findings = [];

  // Level 1
  for (const check of L1_PATTERNS) {
    if (!check.pattern.test(sql)) continue;

    if (markers[check.marker]) {
      // Marker present — check backup requirement for explicit-data-loss
      if (check.marker === 'explicitDataLoss') {
        const backupDir = path.join(ROOT, 'supabase', 'backups');
        const today = new Date().toISOString().slice(0, 10);
        const hasBackup = fs.existsSync(backupDir) &&
          fs.readdirSync(backupDir).some(f => f.startsWith(today) && f.endsWith('.sql'));
        if (hasBackup) {
          findings.push({ level: 'WARN', message: `${check.message} [explicit-data-loss] marker present + backup found.` });
        } else {
          findings.push({ level: 'BLOCK', message: `${check.message} [explicit-data-loss] marker present but no backup file found in supabase/backups/${today}-*.sql.` });
        }
      } else {
        findings.push({ level: 'WARN', message: `${check.message} Override marker present.` });
      }
    } else {
      findings.push({ level: 'BLOCK', message: check.message });
    }
  }

  // Level 2
  for (const check of L2_PATTERNS) {
    if (!check.pattern.test(sql)) continue;

    // DB-reviewer override
    if (check.dbReviewerOverride && dbReviewerVerdict === 'APPROVED') {
      findings.push({ level: 'WARN', message: `${check.message} DB-reviewer APPROVED.` });
      continue;
    }

    // Mitigation pattern (e.g. UPDATE before DROP COLUMN)
    if (check.mitigationPattern && check.mitigationPattern.test(sql)) {
      findings.push({ level: 'WARN', message: `${check.message} Data migration (UPDATE) detected in same file — verify it runs before DROP.` });
      continue;
    }

    if (markers[check.marker]) {
      findings.push({ level: 'WARN', message: `${check.message} Marker [${check.marker}] present.` });
    } else {
      findings.push({ level: 'BLOCK', message: `${check.message} Add marker [${check.marker}: reason] to commit message or PR body.` });
    }
  }

  // EXECUTE dynamic SQL detection (plpgsql bodies)
  if (plpgsqlBodies.length > 0 && hasDangerousExecute(plpgsqlBodies)) {
    const executeMarkerPresent = markers.executeReviewed || markers.rlsReviewed;
    if (executeReviewerOverride(dbReviewerVerdict) || executeMarkerPresent) {
      findings.push({ level: 'WARN', message: 'Dynamic EXECUTE detected in plpgsql. Marker present or DB-reviewer APPROVED.' });
    } else {
      findings.push({ level: 'BLOCK', message: 'Dynamic EXECUTE (variable/concatenation/format) in plpgsql — SQL injection risk. Add marker [execute-reviewed: reason] to commit message or PR body.' });
    }
  }

  if (findings.length === 0) {
    findings.push({ level: 'PASS', message: 'No dangerous patterns detected.' });
  }

  return { file: filePath, findings };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

function main() {
  // --file <path> flag: analyze a single file directly (used by smoke tests)
  // Optional: --markers '{"executeReviewed":true}' to inject markers without git
  const fileArgIdx = process.argv.indexOf('--file');
  if (fileArgIdx !== -1) {
    const filePath = process.argv[fileArgIdx + 1];
    if (!filePath) {
      console.error('Usage: --file <path-to-sql-file> [--markers <json>]');
      process.exit(2);
    }

    const markersArgIdx = process.argv.indexOf('--markers');
    let injectedMarkers = {};
    if (markersArgIdx !== -1) {
      try {
        injectedMarkers = JSON.parse(process.argv[markersArgIdx + 1]);
      } catch {
        console.error('--markers must be valid JSON');
        process.exit(2);
      }
    }

    // --no-git-markers: disable reading markers from git/PR (used in smoke tests)
    const noGitMarkers = process.argv.includes('--no-git-markers');
    const commitMarkers = noGitMarkers ? parseMarkers('') : getCommitMarkers();
    const prBodyMarkers = noGitMarkers ? parseMarkers('') : getPrBodyMarkers();
    const markers = {
      explicitDataLoss: injectedMarkers.explicitDataLoss || commitMarkers.explicitDataLoss || prBodyMarkers.explicitDataLoss,
      columnUnused:     injectedMarkers.columnUnused     || commitMarkers.columnUnused     || prBodyMarkers.columnUnused,
      typeCompatible:   injectedMarkers.typeCompatible   || commitMarkers.typeCompatible   || prBodyMarkers.typeCompatible,
      rlsReviewed:      injectedMarkers.rlsReviewed      || commitMarkers.rlsReviewed      || prBodyMarkers.rlsReviewed,
      executeReviewed:  injectedMarkers.executeReviewed  || commitMarkers.executeReviewed  || prBodyMarkers.executeReviewed,
    };
    const dbReviewerVerdict = getDbReviewerVerdict();

    // Resolve relative to ROOT so the file path works from cwd
    const absFilePath = path.isAbsolute(filePath) ? filePath : path.join(ROOT, filePath);
    const relPath = path.relative(ROOT, absFilePath).replace(/\\/g, '/');

    const { findings } = analyzeMigration(relPath, markers, dbReviewerVerdict);
    const worst = findings.reduce((acc, f) => {
      if (f.level === 'BLOCK') return 'BLOCK';
      if (f.level === 'WARN' && acc !== 'BLOCK') return 'WARN';
      return acc;
    }, 'PASS');

    const icon = worst === 'BLOCK' ? '✗' : worst === 'WARN' ? '⚠' : '✓';
    console.log(`\n${icon} ${relPath}`);
    for (const f of findings) {
      const findingIcon = f.level === 'BLOCK' ? '  ✗' : f.level === 'WARN' ? '  ⚠' : '  ✓';
      console.log(`${findingIcon} ${f.message}`);
    }
    console.log('');

    if (worst === 'BLOCK') {
      console.log('❌ Migration Safety Analyzer: BLOCK');
      process.exit(1);
    } else if (worst === 'WARN') {
      console.log('⚠  Migration Safety Analyzer: WARN');
      process.exit(0);
    } else {
      console.log('✅ Migration Safety Analyzer: PASS');
      process.exit(0);
    }
  }

  // Detect changed migration files
  let diffOutput = git('diff', '--name-only', 'origin/main...HEAD');
  if (!diffOutput) diffOutput = git('diff', '--name-only', 'main...HEAD');

  const migrationFiles = diffOutput
    .split('\n')
    .filter(Boolean)
    .map(f => f.replace(/\\/g, '/'))
    .filter(f => f.startsWith(MIGRATIONS_DIR + '/') && f.endsWith('.sql'));

  if (migrationFiles.length === 0) {
    console.log('✅ Migration Safety Analyzer: No migration files in this PR — skipped.');
    process.exit(0);
  }

  const commitMarkers  = getCommitMarkers();
  const prBodyMarkers  = getPrBodyMarkers();
  const markers        = {
    explicitDataLoss: commitMarkers.explicitDataLoss || prBodyMarkers.explicitDataLoss,
    columnUnused:     commitMarkers.columnUnused     || prBodyMarkers.columnUnused,
    typeCompatible:   commitMarkers.typeCompatible   || prBodyMarkers.typeCompatible,
    rlsReviewed:      commitMarkers.rlsReviewed      || prBodyMarkers.rlsReviewed,
    executeReviewed:  commitMarkers.executeReviewed  || prBodyMarkers.executeReviewed,
  };
  const dbReviewerVerdict = getDbReviewerVerdict();

  const results = migrationFiles.map(f => analyzeMigration(f, markers, dbReviewerVerdict));

  // Print results
  let hasBlock = false;
  let hasWarn  = false;

  for (const { file, findings } of results) {
    const worst = findings.reduce((acc, f) => {
      if (f.level === 'BLOCK') return 'BLOCK';
      if (f.level === 'WARN' && acc !== 'BLOCK') return 'WARN';
      return acc;
    }, 'PASS');

    const icon = worst === 'BLOCK' ? '✗' : worst === 'WARN' ? '⚠' : '✓';
    console.log(`\n${icon} ${file}`);

    for (const f of findings) {
      const findingIcon = f.level === 'BLOCK' ? '  ✗' : f.level === 'WARN' ? '  ⚠' : '  ✓';
      console.log(`${findingIcon} ${f.message}`);
    }

    if (worst === 'BLOCK') hasBlock = true;
    if (worst === 'WARN')  hasWarn  = true;
  }

  console.log('');

  if (hasBlock) {
    console.log('❌ Migration Safety Analyzer: BLOCK');
    console.log('   One or more migrations contain dangerous operations.');
    console.log('   Fix the migration or add the appropriate escape-hatch marker:');
    console.log('     [explicit-data-loss: reason]  — for DROP TABLE / TRUNCATE / DELETE');
    console.log('     [column-unused: reason]        — for DROP COLUMN / DROP CONSTRAINT');
    console.log('     [type-compatible: reason]      — for ALTER TYPE / SET NOT NULL / ADD UNIQUE');
    console.log('     [rls-reviewed: reason]         — for RLS/POLICY changes');
    console.log('     [execute-reviewed: reason]     — for dynamic EXECUTE in plpgsql');
    process.exit(1);
  } else if (hasWarn) {
    console.log('⚠  Migration Safety Analyzer: WARN — review findings above before merge.');
    process.exit(0);
  } else {
    console.log('✅ Migration Safety Analyzer: PASS');
    process.exit(0);
  }
}

main();
