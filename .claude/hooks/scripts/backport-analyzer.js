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

function readLearnedPatterns() {
  const filePath = path.join(process.cwd(), '.claude', 'workflow', 'LEARNED_PATTERNS.md');
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

function extractPatterns(content) {
  if (!content || content.includes('Раздел пуст')) return [];

  const patterns = [];
  const sections = content.split(/^### /m).slice(1);

  sections.forEach(section => {
    const lines = section.split('\n');
    const title = lines[0].trim();
    const areaLine = lines.find(l => l.startsWith('- **Область:**'));
    const patternLine = lines.find(l => l.startsWith('- **Паттерн:**'));
    if (title && patternLine) {
      const area = areaLine ? areaLine.replace(/^-\s*\*\*Область:\*\*\s*/, '').trim() : '';
      const pattern = patternLine.replace(/^-\s*\*\*Паттерн:\*\*\s*/, '').trim();
      const projectSpecificPatterns = [
        /trigger_goals/i, /kpi.system/i, /carm/i, /smarttech/i,
        /конкретн/i, /только для/i, /специфик/i,
      ];
      const isUniversal = !projectSpecificPatterns.some(p => p.test(pattern));
      patterns.push({ title, area, pattern, isUniversal, raw: section });
    }
  });

  return patterns;
}

function generateBackportReport(mergeInfo, learnedOverrides, learnedPatterns) {
  const frameworkPath = getFrameworkPath();
  const frameworkOverrides = frameworkPath
    ? readFile(path.join(frameworkPath, '.claude', 'workflow', 'LEARNED_OVERRIDES.md'))
    : '';
  const frameworkPatterns = frameworkPath
    ? readFile(path.join(frameworkPath, '.claude', 'workflow', 'LEARNED_PATTERNS.md'))
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

  const projectPatterns = extractPatterns(learnedPatterns);
  const frameworkExistingPatterns = extractPatterns(frameworkPatterns);

  const newPatterns = projectPatterns.filter(
    pp => !frameworkExistingPatterns.some(fp => fp.pattern.includes(pp.pattern.slice(0, 50)))
  );
  const universalPatterns = newPatterns.filter(p => p.isUniversal);

  if (newMarkers.length === 0 && universalPatterns.length === 0) {
    report += `Новых универсальных маркеров и паттернов не обнаружено — framework актуален.\n`;
    return report;
  }

  if (newMarkers.length > 0) {
    report += `**Обнаружены новые маркеры (${newMarkers.length}):**\n\n`;
    newMarkers.forEach((marker, i) => {
      report += `${i + 1}. ${marker.text}\n`;
      report += `   *Тип: ${marker.isUniversal ? 'УНИВЕРСАЛЬНЫЙ' : 'ПРОЕКТНЫЙ'}*\n\n`;
    });
  }

  if (universalPatterns.length > 0) {
    report += `**Обнаружены новые технические паттерны (${universalPatterns.length}):**\n\n`;
    universalPatterns.forEach((p, i) => {
      report += `${i + 1}. [${p.area}] ${p.pattern}\n\n`;
    });
  }

  const universalMarkers = newMarkers.filter(m => m.isUniversal);

  if (universalMarkers.length === 0 && universalPatterns.length === 0) {
    report += `Все новые маркеры специфичны для этого проекта — backport не нужен.\n`;
    return report;
  }

  report += `---\n`;
  report += `### Требует вашего решения\n\n`;
  if (universalMarkers.length > 0) {
    report += `**${universalMarkers.length} универсальных маркера** готовы к переносу в Vibe-Coding-Framework:\n\n`;
    universalMarkers.forEach((marker, i) => {
      report += `${i + 1}. ${marker.text}\n`;
    });
  }
  if (universalPatterns.length > 0) {
    report += `\n**${universalPatterns.length} технических паттерна** готовы к переносу в Vibe-Coding-Framework:\n\n`;
    universalPatterns.forEach((p, i) => {
      report += `${i + 1}. [${p.area}] ${p.pattern}\n`;
    });
  }

  if (frameworkPath) {
    report += `\n**Framework путь:** \`${frameworkPath}\`\n`;
    report += `\nЧтобы перенести — подтвердите: **"да, перенеси в framework"**\n`;
    report += `Чтобы пропустить — подтвердите: **"пропустить backport"**\n`;
  } else {
    report += `\n**Репозиторий Vibe-Coding-Framework не найден автоматически.**\n`;
    report += `Укажите путь: добавьте в CLAUDE.md проекта строку:\n`;
    report += `VIBE_FRAMEWORK_PATH=C:\\Users\\Evgeny\\Documents\\GitHub\\Vibe-Coding-Framework\n`;
  }

  return report;
}

function executeBackport(universalMarkers, universalPatterns, frameworkPath) {
  const today = new Date().toISOString().split('T')[0];
  const projectName = path.basename(process.cwd());
  let filesAdded = [];

  if (universalMarkers.length > 0) {
    const overridesPath = path.join(frameworkPath, '.claude', 'workflow', 'LEARNED_OVERRIDES.md');
    const existing = readFile(overridesPath);
    let addition = `\n### [${today}] Backport из ${projectName}\n`;
    universalMarkers.forEach(marker => {
      addition += `- **Маркер:** ${marker.text}\n`;
    });
    addition += `\n`;
    writeFile(overridesPath, existing + addition);
    filesAdded.push('.claude/workflow/LEARNED_OVERRIDES.md');
  }

  if (universalPatterns.length > 0) {
    const patternsPath = path.join(frameworkPath, '.claude', 'workflow', 'LEARNED_PATTERNS.md');
    const existing = readFile(patternsPath);
    let addition = '';
    universalPatterns.forEach(p => {
      addition += `\n### [${today}] ${p.title}\n`;
      addition += `- **Область:** ${p.area}\n`;
      addition += `- **Паттерн:** ${p.pattern}\n`;
      addition += `- **Источник:** Backport из ${projectName}\n`;
    });
    writeFile(patternsPath, existing + addition);
    filesAdded.push('.claude/workflow/LEARNED_PATTERNS.md');
  }

  if (filesAdded.length === 0) return 'Нечего переносить.';

  run(`git add ${filesAdded.join(' ')}`, frameworkPath);
  run(
    `git commit -m "learn: backport from ${projectName} (${today})"`,
    frameworkPath
  );
  run(`git push origin main`, frameworkPath);

  return `Backport выполнен. ${universalMarkers.length} маркеров и ${universalPatterns.length} паттернов добавлены в framework.`;
}

async function main() {
  const claudeMdPath = path.join(process.cwd(), 'CLAUDE.md');
  const claudeMdContent = readFile(claudeMdPath);
  if (claudeMdContent) {
    const tierMatch = claudeMdContent.match(/\b(LITE|STANDARD|ENTERPRISE)\b/i);
    if (tierMatch && tierMatch[1].toUpperCase() === 'LITE') {
      console.log('ℹ️ LITE тир — POST-MERGE BACKPORT пропускается.');
      process.exit(0);
    }
  }

  const mergeInfo = analyzeLastMerge();
  const learnedOverrides = readLearnedOverrides();
  const learnedPatterns = readLearnedPatterns();
  const report = generateBackportReport(mergeInfo, learnedOverrides, learnedPatterns);

  console.log(report);
  process.exit(0);
}

main().catch(err => {
  console.error('[BackportAnalyzer] Error:', err.message);
  process.exit(0);
});
