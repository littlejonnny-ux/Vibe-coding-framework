#!/usr/bin/env node
/**
 * Backport Analyzer — анализирует lessons learned после merge
 * и предлагает пользователю перенести универсальные знания
 * в репозиторий Vibe-Coding-Framework.
 *
 * Запускается: после каждого merge в main (вызывается из CYCLE.md)
 * НЕ запускается: для docs-only изменений и LITE-тира
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function getFrameworkPath() {
  if (process.env.VIBE_FRAMEWORK_PATH) {
    return process.env.VIBE_FRAMEWORK_PATH;
  }
  const currentDir = process.cwd();
  const parentDir = path.dirname(currentDir);
  const candidates = [
    path.join(parentDir, 'Vibe-Coding-Framework'),
    path.join(parentDir, 'Vibe-coding-framework'),
    path.join(parentDir, 'vibe-coding-framework'),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, '.claude', 'workflow', 'LEARNED_OVERRIDES.md'))) {
      return candidate;
    }
  }
  return null;
}

function run(cmd, cwd) {
  try {
    return execSync(cmd, { cwd: cwd || process.cwd(), encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function readFile(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  } catch {
    return '';
  }
}

function writeFile(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

function analyzeLastMerge() {
  const diffStat = run('git diff origin/main~1..origin/main --stat');
  const diffFiles = run('git diff origin/main~1..origin/main --name-only');
  const lastCommitMsg = run('git log --oneline -1');

  const lines = diffStat.split('\n');
  const summary = lines[lines.length - 1] || '';
  const filesChanged = diffFiles.split('\n').filter(Boolean);

  const codeFiles = filesChanged.filter(f => /\.(ts|tsx|js|jsx)$/.test(f));
  const docsOnly = filesChanged.every(f => f.endsWith('.md'));
  const hasDbChanges = filesChanged.some(f => f.includes('migration') || f.includes('supabase'));
  const hasAuthChanges = filesChanged.some(f =>
    f.includes('auth') || f.includes('middleware') || f.includes('session')
  );

  return {
    summary,
    filesChanged,
    codeFiles,
    docsOnly,
    hasDbChanges,
    hasAuthChanges,
    lastCommitMsg,
    isSmallChange:
      codeFiles.length <= 1 && summary.includes('insertion') && parseInt(summary) < 50,
  };
}

function readLearnedOverrides() {
  const filePath = path.join(process.cwd(), '.claude', 'workflow', 'LEARNED_OVERRIDES.md');
  return readFile(filePath);
}

function extractMarkers(content) {
  if (!content || content.includes('Раздел пуст')) return [];

  const markers = [];
  const lines = content.split('\n');

  lines.forEach(line => {
    if (line.startsWith('- **Маркер:**') || line.includes('Маркер:')) {
      const text = line.replace(/^-\s*\*\*Маркер:\*\*\s*/, '').trim();
      if (text) {
        const projectSpecificPatterns = [
          /trigger_goals/i,
          /kpi.system/i,
          /carm/i,
          /smarttech/i,
          /конкретн/i,
          /только для/i,
          /специфик/i,
        ];
        const isUniversal = !projectSpecificPatterns.some(p => p.test(text));
        markers.push({ text, isUniversal });
      }
    }
  });

  return markers;
}

function generateBackportReport(mergeInfo, learnedOverrides) {
  const frameworkPath = getFrameworkPath();
  const frameworkOverrides = frameworkPath
    ? readFile(path.join(frameworkPath, '.claude', 'workflow', 'LEARNED_OVERRIDES.md'))
    : '';

  const today = new Date().toISOString().split('T')[0];
  const prNumber =
    run('gh pr list --state merged --limit 1 --json number -q ".[0].number"') || 'N/A';

  let report = `\n`;
  report += `## POST-MERGE BACKPORT ANALYSIS\n`;
  report += `**PR:** #${prNumber} | **Date:** ${today}\n`;
  report += `**Commit:** ${mergeInfo.lastCommitMsg}\n`;
  report += `**Files changed:** ${mergeInfo.filesChanged.length} (${mergeInfo.codeFiles.length} code files)\n\n`;

  if (mergeInfo.docsOnly) {
    report += `Docs-only изменение — backport не требуется.\n`;
    return report;
  }

  report += `### Анализ lessons learned\n\n`;

  const projectMarkers = extractMarkers(learnedOverrides);
  const frameworkMarkers = extractMarkers(frameworkOverrides);

  const newMarkers = projectMarkers.filter(
    pm => !frameworkMarkers.some(fm => fm.text.includes(pm.text.slice(0, 50)))
  );

  if (newMarkers.length === 0) {
    report += `Новых универсальных маркеров не обнаружено — framework актуален.\n`;
    return report;
  }

  report += `**Обнаружены новые маркеры (${newMarkers.length}):**\n\n`;
  newMarkers.forEach((marker, i) => {
    report += `${i + 1}. ${marker.text}\n`;
    report += `   *Тип: ${marker.isUniversal ? 'УНИВЕРСАЛЬНЫЙ' : 'ПРОЕКТНЫЙ'}*\n\n`;
  });

  const universalMarkers = newMarkers.filter(m => m.isUniversal);

  if (universalMarkers.length === 0) {
    report += `Все новые маркеры специфичны для этого проекта — backport не нужен.\n`;
    return report;
  }

  report += `---\n`;
  report += `### Требует вашего решения\n\n`;
  report += `**${universalMarkers.length} универсальных маркера** готовы к переносу в Vibe-Coding-Framework:\n\n`;
  universalMarkers.forEach((marker, i) => {
    report += `${i + 1}. ${marker.text}\n`;
  });

  if (frameworkPath) {
    report += `\n**Framework путь:** \`${frameworkPath}\`\n`;
    report += `\nЧтобы перенести — подтвердите: **"да, перенеси в framework"**\n`;
    report += `Чтобы пропустить — подтвердите: **"пропустить backport"**\n`;
  } else {
    report += `\n**Репозиторий Vibe-Coding-Framework не найден автоматически.**\n`;
    report += `Укажите путь: добавьте в CLAUDE.md проекта строку:\n`;
    report += `VIBE_FRAMEWORK_PATH=C:\Users\Evgeny\Documents\GitHub\Vibe-Coding-Framework\n`;
  }

  return report;
}

function executeBackport(universalMarkers, frameworkPath) {
  const overridesPath = path.join(frameworkPath, '.claude', 'workflow', 'LEARNED_OVERRIDES.md');
  const existing = readFile(overridesPath);
  const today = new Date().toISOString().split('T')[0];
  const projectName = path.basename(process.cwd());

  let addition = `\n### [${today}] Backport из ${projectName}\n`;
  universalMarkers.forEach(marker => {
    addition += `- **Маркер:** ${marker.text}\n`;
  });
  addition += `\n`;

  const updated = existing + addition;
  writeFile(overridesPath, updated);

  run(`git add .claude/workflow/LEARNED_OVERRIDES.md`, frameworkPath);
  run(
    `git commit -m "learn: backport universal markers from ${projectName} (${today})"`,
    frameworkPath
  );
  run(`git push origin main`, frameworkPath);

  return `Backport выполнен. ${universalMarkers.length} маркеров добавлены в framework и запущены.`;
}

async function main() {
  const mergeInfo = analyzeLastMerge();
  const learnedOverrides = readLearnedOverrides();
  const report = generateBackportReport(mergeInfo, learnedOverrides);

  console.log(report);
  process.exit(0);
}

main().catch(err => {
  console.error('[BackportAnalyzer] Error:', err.message);
  process.exit(0);
});
