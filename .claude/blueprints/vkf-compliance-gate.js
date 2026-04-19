#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function git(...args) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    timeout: 10000,
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return result.status === 0 ? (result.stdout || '').trim() : '';
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

// ─── Escape hatch: [skip-vkf-gate] ────────────────────────────────────────────

const lastCommitMsg = git('log', '-1', '--pretty=%B');
if (lastCommitMsg.includes('[skip-vkf-gate]')) {
  console.log('⏭  VKF Compliance Gate: пропущен ([skip-vkf-gate] в последнем коммите).');
  process.exit(0);
}

// ─── .vkfignore ───────────────────────────────────────────────────────────────

function loadVkfIgnore() {
  const ignorePath = path.join(ROOT, '.vkfignore');
  if (!fs.existsSync(ignorePath)) return [];
  return fs.readFileSync(ignorePath, 'utf8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}

function matchesVkfIgnore(filePath, patterns) {
  return patterns.some(pattern => {
    const escaped = pattern
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*\*/g, '\x00')
      .replace(/\*/g, '[^/]*')
      .replace(/\x00/g, '.*');
    return new RegExp('^' + escaped + '$').test(filePath);
  });
}

const vkfIgnorePatterns = loadVkfIgnore();

// ─── PR diff ──────────────────────────────────────────────────────────────────

let diffOutput = git('diff', '--name-only', 'origin/main...HEAD');
if (!diffOutput) {
  diffOutput = git('diff', '--name-only', 'main...HEAD');
}
if (!diffOutput) {
  console.log('⚠️  VKF Compliance Gate: не удалось определить diff. Nothing to check — PR branch empty.');
  process.exit(0);
}

const changedFiles = diffOutput.split('\n').filter(Boolean).map(f => f.replace(/\\/g, '/'));

if (changedFiles.length === 0) {
  console.log('✅ VKF Compliance Gate: Nothing to check — PR branch empty.');
  process.exit(0);
}

// ─── Classify files ───────────────────────────────────────────────────────────

function classifyFiles(files) {
  const result = {
    uiFiles: [],
    businessLogicFiles: [],
    dbMigrationFiles: [],
    testFiles: [],
    docsFiles: [],
    configFiles: [],
    stylesFiles: [],
    other: [],
  };

  const UI_ROOTS = ['src/features/', 'src/app/'];
  const UI_EXCLUDED = [
    'src/app/layout.tsx',
    'src/app/globals.css',
    'src/app/page.tsx',
    'src/app/favicon.ico',
  ];
  const BL_ROOTS = ['src/lib/', 'src/services/', 'src/domain/'];

  for (const f of files) {
    if (
      (f.endsWith('.tsx') || f.endsWith('.jsx')) &&
      UI_ROOTS.some(r => f.startsWith(r)) &&
      !UI_EXCLUDED.includes(f) &&
      !f.includes('__tests__')
    ) {
      result.uiFiles.push(f);
    } else if (
      f.endsWith('.ts') &&
      BL_ROOTS.some(r => f.startsWith(r)) &&
      !f.endsWith('.spec.ts') &&
      !f.endsWith('.test.ts')
    ) {
      result.businessLogicFiles.push(f);
    } else if (
      f.startsWith('supabase/migrations/') ||
      (f.endsWith('.sql') && !f.startsWith('supabase/rollbacks/'))
    ) {
      result.dbMigrationFiles.push(f);
    } else if (f.endsWith('.spec.ts') || f.endsWith('.test.ts')) {
      result.testFiles.push(f);
    } else if (f.endsWith('.md')) {
      result.docsFiles.push(f);
    } else if (f.endsWith('.css') || f.startsWith('tailwind.config')) {
      result.stylesFiles.push(f);
    } else if (
      f === 'tsconfig.json' ||
      f === 'package.json' ||
      f === 'package-lock.json' ||
      f.endsWith('.yml') ||
      f.endsWith('.yaml') ||
      f.includes('eslintrc') ||
      f.includes('.eslint') ||
      f.startsWith('scripts/')
    ) {
      result.configFiles.push(f);
    } else {
      result.other.push(f);
    }
  }

  return result;
}

const classified = classifyFiles(changedFiles);

// ─── PR type label ────────────────────────────────────────────────────────────

function getPrTypeLabel(c) {
  const hasUi = c.uiFiles.length > 0;
  const hasBl = c.businessLogicFiles.length > 0;
  const hasDb = c.dbMigrationFiles.length > 0;
  const onlyPassive = !hasUi && !hasBl && !hasDb;
  if (hasUi && hasBl) return 'UI-код + бизнес-логика';
  if (hasUi) return 'UI-код';
  if (hasBl) return 'бизнес-логика';
  if (hasDb) return 'миграция БД';
  if (onlyPassive) return 'docs/config/styles only';
  return 'прочее';
}

// ─── Added files (new component detection) ───────────────────────────────────

const addedRaw = git('log', '--diff-filter=A', '--name-only', 'origin/main..HEAD')
  || git('log', '--diff-filter=A', '--name-only', 'main..HEAD');
const addedFiles = new Set(addedRaw.split('\n').filter(Boolean).map(f => f.replace(/\\/g, '/')));

// ─── Extract UI module name from path ────────────────────────────────────────

function extractModule(filePath) {
  const m = filePath.match(/^src\/(?:features|app)\/([^/]+)\//);
  return m ? m[1] : null;
}

// ─── Run checks ───────────────────────────────────────────────────────────────

const violations = [];
let checksCount = 0;
const changedSet = new Set(changedFiles);

// Check 1: UI module → E2E test
const uiFilesFiltered = classified.uiFiles.filter(f => !matchesVkfIgnore(f, vkfIgnorePatterns));
if (uiFilesFiltered.length > 0) {
  checksCount++;
  const modules = new Set(uiFilesFiltered.map(extractModule).filter(Boolean));
  const missing = [];
  for (const mod of modules) {
    const specPath = `src/__tests__/e2e/${mod}.spec.ts`;
    const inPr = changedSet.has(specPath);
    const inRepo = git('ls-files', specPath) !== '';
    if (!inPr && !inRepo) {
      missing.push({ mod, specPath });
    }
  }
  if (missing.length > 0) {
    violations.push({
      title: 'Отсутствует E2E-тест для UI-модуля',
      files: missing.map(m => m.specPath),
      what: missing.map(m =>
        `Для модуля «${m.mod}» нет «${m.specPath}». Создай тест или добавь «${m.mod}» в .vkfignore с обоснованием.`
      ).join('\n  '),
    });
  }
}

// Check 2: бизнес-логика → TECHNICAL_SPECIFICATION.md
if (classified.businessLogicFiles.length > 0) {
  checksCount++;
  const diffArgs = ['diff', 'origin/main...HEAD', '--'].concat(classified.businessLogicFiles);
  const blDiff = git(...diffArgs) || git(...['diff', 'main...HEAD', '--'].concat(classified.businessLogicFiles));
  const hasExportedChange = /^\+.*export\s+(function|const|class|async\s+function)/m.test(blDiff);
  if (hasExportedChange && !changedSet.has('TECHNICAL_SPECIFICATION.md')) {
    violations.push({
      title: 'Бизнес-логика изменена, но TECHNICAL_SPECIFICATION.md не обновлён',
      files: classified.businessLogicFiles,
      what: 'Либо обнови ТС, либо используй [skip-vkf-gate], если правка чисто техническая (переименование, рефакторинг).',
    });
  }
}

// Check 3: новые UI-компоненты → UI_PATTERNS.md
if (uiFilesFiltered.length > 0) {
  checksCount++;
  const hasNewUiFiles = uiFilesFiltered.some(f => addedFiles.has(f));
  if (hasNewUiFiles) {
    const isRefactorOrFix = /^(refactor|fix):/i.test(lastCommitMsg);
    if (!isRefactorOrFix && !changedSet.has('UI_PATTERNS.md')) {
      violations.push({
        title: 'Добавлены новые UI-компоненты, но UI_PATTERNS.md не обновлён',
        files: uiFilesFiltered.filter(f => addedFiles.has(f)),
        what: 'Обнови UI_PATTERNS.md или используй [skip-vkf-gate].',
      });
    }
  }
}

// Check 4: UI/бизнес-логика → PROJECT_CONTEXT.md
if (classified.uiFiles.length > 0 || classified.businessLogicFiles.length > 0) {
  checksCount++;
  if (!changedSet.has('PROJECT_CONTEXT.md')) {
    violations.push({
      title: 'Изменён код, но PROJECT_CONTEXT.md не обновлён',
      files: [...classified.uiFiles, ...classified.businessLogicFiles].slice(0, 5),
      what: 'Карта файлов проекта устарела. Обнови PROJECT_CONTEXT.md.',
    });
  }
}

// Check 5: миграции БД → TECHNICAL_SPECIFICATION.md + PROJECT_CONTEXT.md
if (classified.dbMigrationFiles.length > 0) {
  checksCount++;
  const missingDocs = [];
  if (!changedSet.has('TECHNICAL_SPECIFICATION.md')) missingDocs.push('TECHNICAL_SPECIFICATION.md');
  if (!changedSet.has('PROJECT_CONTEXT.md')) missingDocs.push('PROJECT_CONTEXT.md');
  if (missingDocs.length > 0) {
    violations.push({
      title: 'Миграция БД без обновления живых документов',
      files: classified.dbMigrationFiles,
      what: `Обнови: ${missingDocs.join(', ')}.`,
    });
  }
}

// ─── Output ───────────────────────────────────────────────────────────────────

const prType = getPrTypeLabel(classified);

if (violations.length === 0) {
  console.log('✅ VKF Compliance Gate: PASS');
  console.log(`   Classified as: ${prType}`);
  console.log(`   Checks passed: ${checksCount}`);
  process.exit(0);
} else {
  console.log('❌ VKF Compliance Gate: FAIL\n');
  violations.forEach((v, i) => {
    console.log(`Нарушение ${i + 1}: ${v.title}`);
    if (v.files && v.files.length > 0) {
      const shown = v.files.slice(0, 3);
      const extra = v.files.length > 3 ? ` (+${v.files.length - 3})` : '';
      console.log(`  Файлы: ${shown.join(', ')}${extra}`);
    }
    console.log(`  Что делать: ${v.what}`);
    console.log('');
  });
  console.log('Для разового пропуска добавь [skip-vkf-gate] в commit message последнего коммита.');
  console.log('Для постоянного исключения модуля — добавь в .vkfignore.');
  process.exit(1);
}
