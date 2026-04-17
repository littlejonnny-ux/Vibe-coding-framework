#!/usr/bin/env node
/**
 * Post-Merge Reminder — напоминание о /update-docs и ретроспективе после merge
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs on Stop events. Checks if the latest commit on current branch
 * is a merge commit. If so, reminds Claude Code to run /update-docs
 * and post-merge retrospective.
 *
 * Workaround for the absence of a native PostMerge hook event
 * in Claude Code Hooks API.
 */

const path = require('path');
const fs = require('fs');
const { runCommand, log } = require('../lib/utils');

function isMergeCommit() {
  const result = runCommand('git cat-file -p HEAD');
  if (!result.success) return false;
  const parentLines = result.output.split('\n').filter(l => l.startsWith('parent '));
  return parentLines.length >= 2;
}

function isOnMain() {
  const result = runCommand('git rev-parse --abbrev-ref HEAD');
  if (!result.success) return false;
  return result.output === 'main' || result.output === 'master';
}

function getTier() {
  const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
  try {
    const content = fs.readFileSync(claudeMdPath, 'utf8');
    const match = content.match(/\b(LITE|STANDARD|ENTERPRISE)\b/i);
    return match ? match[1].toUpperCase() : 'STANDARD';
  } catch {
    return 'STANDARD';
  }
}

function alreadyRemindedThisCommit() {
  const headResult = runCommand('git rev-parse --short HEAD');
  if (!headResult.success) return false;
  const head = headResult.output;

  const tmpDir = process.env.TEMP || process.env.TMP || require('os').tmpdir();
  const markerFile = path.join(tmpDir, `claude-merge-reminded-${head}`);

  if (fs.existsSync(markerFile)) return true;

  try {
    fs.writeFileSync(markerFile, Date.now().toString(), 'utf8');
  } catch {}

  return false;
}

function main() {
  if (!isOnMain()) process.exit(0);

  const tier = getTier();
  if (tier === 'LITE') process.exit(0);

  if (!isMergeCommit()) process.exit(0);

  if (alreadyRemindedThisCommit()) process.exit(0);

  const commitResult = runCommand('git log --oneline -1');
  const commitMsg = commitResult.success ? commitResult.output : '';

  log('');
  log('┌────────────────────────────────────────────────────────────┐');
  log('│  [PostMerge] Merge detected on main!                       │');
  log('│                                                            │');
  log('│  ОБЯЗАТЕЛЬНО выполни:                                      │');
  log('│  1. /update-docs — обнови PROJECT_CONTEXT.md,              │');
  log('│     TECHNICAL_SPECIFICATION.md, UI_PATTERNS.md,            │');
  log('│     CODE_LEARNINGS.md (те, что изменились)                 │');
  log('│  2. Ретроспектива — см. .claude/workflow/RETROSPECTIVE.md  │');
  log('│     шаги 1-5: сбор данных, анализ активаций, оценка        │');
  log('│     необходимости, маркеры → LEARNED_OVERRIDES.md,         │');
  log('│     паттерны → LEARNED_PATTERNS.md                         │');
  log('│  3. Backport → node .claude/hooks/scripts/backport-analyzer.js');
  log('│                                                            │');
  log('│  Commit: ' + commitMsg.slice(0, 46).padEnd(46) + '  │');
  log('└────────────────────────────────────────────────────────────┘');
  log('');

  process.exit(0);
}

try {
  main();
} catch {
  // Never block on errors
  process.exit(0);
}
