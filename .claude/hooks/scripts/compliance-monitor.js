#!/usr/bin/env node
/**
 * VKF Compliance Monitor — logs which VKF mechanisms fired during session.
 *
 * Cross-platform (Windows, macOS, Linux)
 *
 * Runs on Stop events. Executes Type A (git/filesystem) and Type B (transcript)
 * checks and writes one JSON line to .claude/sessions/compliance-log.jsonl.
 * Never blocks Claude Code — exits 0 in all cases.
 */

const path = require('path');
const fs = require('fs');
const {
  runCommand,
  log,
  readFile,
  appendFile,
  ensureDir,
  getSessionsDir,
  getProjectName,
  getSessionIdShort,
  stripAnsi
} = require('../lib/utils');

// ─── Tier check ──────────────────────────────────────────────────────────────

function getTier() {
  try {
    const content = fs.readFileSync(path.join(process.cwd(), 'CLAUDE.md'), 'utf8');
    const m = content.match(/\b(LITE|STANDARD|ENTERPRISE)\b/i);
    return m ? m[1].toUpperCase() : 'STANDARD';
  } catch {
    return 'STANDARD';
  }
}

// ─── Type A: git / filesystem checks ─────────────────────────────────────────

function checkUpdateDocsAfterMerge() {
  try {
    const log5 = runCommand('git log --oneline -5');
    if (!log5.success) return null;
    const lines = log5.output.split('\n').filter(Boolean);
    const mergeIdx = lines.findIndex(l => l.toLowerCase().includes('merge'));
    if (mergeIdx === -1) return null;
    // Look for a docs: commit before the merge (lower index = newer)
    return lines.slice(0, mergeIdx).some(l => /^[a-f0-9]+ docs:/i.test(l));
  } catch {
    return null;
  }
}

function checkRetrospectiveAfterMerge() {
  try {
    const log5 = runCommand('git log --oneline -5');
    if (!log5.success) return null;
    const hasMerge = log5.output.toLowerCase().includes('merge');
    if (!hasMerge) return null;
    const diff = runCommand('git diff HEAD~3..HEAD --name-only');
    if (!diff.success) return null;
    return diff.output.split('\n').some(f =>
      f.includes('LEARNED_OVERRIDES.md') || f.includes('LEARNED_PATTERNS.md')
    );
  } catch {
    return null;
  }
}

function checkE2eTestsWritten() {
  try {
    const diff = runCommand('git diff HEAD~1..HEAD --name-only');
    if (!diff.success) return null;
    const files = diff.output.split('\n');
    const hasUi = files.some(f => /\.(tsx|jsx)$/.test(f) && !f.includes('.spec.'));
    if (!hasUi) return null;
    return files.some(f => f.endsWith('.spec.ts') && f.includes('e2e'));
  } catch {
    return null;
  }
}

function checkBuildClean() {
  try {
    const log10 = runCommand('git log --oneline -10');
    if (!log10.success) return true;
    const lines = log10.output.split('\n').filter(Boolean);
    const featIdx = lines.findIndex(l => /^[a-f0-9]+ feat:/i.test(l));
    if (featIdx === -1) return true;
    // Any "fix: build" or "fix: type" after (newer than) the feat commit = build broke
    return !lines.slice(0, featIdx).some(l => /^[a-f0-9]+ fix:.*(build|type)/i.test(l));
  } catch {
    return null;
  }
}

function checkProjectContextFreshness() {
  try {
    const result = runCommand('git log -1 --format=%at -- PROJECT_CONTEXT.md');
    if (!result.success || !result.output) return null;
    const ts = parseInt(result.output, 10);
    if (isNaN(ts)) return null;
    const daysSince = Math.floor((Date.now() / 1000 - ts) / 86400);
    return daysSince;
  } catch {
    return null;
  }
}

function checkBackportAnalyzerRan() {
  try {
    const log5 = runCommand('git log --oneline -5');
    if (!log5.success) return null;
    const hasMerge = log5.output.toLowerCase().includes('merge');
    if (!hasMerge) return null;
    return log5.output.split('\n').some(l => /learn:|backport/i.test(l));
  } catch {
    return null;
  }
}

function checkCodeReviewRan() {
  try {
    const log10 = runCommand('git log --oneline -10');
    if (!log10.success) return null;
    const lines = log10.output.split('\n').filter(Boolean);
    const hasDocsOnly = lines.every(l => /^[a-f0-9]+ docs:/i.test(l));
    if (hasDocsOnly) return null;
    const featIdx = lines.findIndex(l => /^[a-f0-9]+ feat:/i.test(l));
    if (featIdx === -1) return false;
    return lines.slice(0, featIdx).some(l => /^[a-f0-9]+ fix:/i.test(l));
  } catch {
    return null;
  }
}

// ─── Type B: transcript checks ────────────────────────────────────────────────

function parseTranscript(transcriptPath) {
  const defaults = {
    claude_md_read: false,
    vkf_workflow_read: false,
    trigger_map_read: false,
    agents_activated: []
  };

  if (!transcriptPath) return defaults;

  try {
    const content = readFile(transcriptPath);
    if (!content) return defaults;

    const agentsSet = new Set();
    let claudeMdRead = false;
    let vkfWorkflowRead = false;
    let triggerMapRead = false;

    const lines = content.split('\n').filter(Boolean);
    for (const line of lines) {
      let entry;
      try { entry = JSON.parse(line); } catch { continue; }

      const blocks = [];

      if (entry.type === 'tool_use') {
        blocks.push({ name: entry.tool_name || entry.name, input: entry.tool_input || entry.input });
      }

      if (entry.type === 'assistant' && Array.isArray(entry.message?.content)) {
        for (const b of entry.message.content) {
          if (b.type === 'tool_use') blocks.push({ name: b.name, input: b.input });
        }
      }

      for (const block of blocks) {
        const toolName = block.name || '';
        const input = block.input || {};
        const filePath = input.file_path || '';

        if (toolName === 'Read') {
          if (filePath.includes('CLAUDE.md')) claudeMdRead = true;
          if (filePath.includes('VIBE_CODING_WORKFLOW.md')) vkfWorkflowRead = true;
          if (filePath.includes('TRIGGER_MAP.md')) triggerMapRead = true;
        }

        if (toolName === 'Task' || toolName === 'Agent') {
          const prompt = input.prompt || input.description || '';
          const agentType = input.subagent_type || '';
          if (agentType) agentsSet.add(agentType);
          else if (prompt) {
            // Try to extract agent name from prompt heuristically
            const m = prompt.match(/\b(planner|code-reviewer|security-reviewer|build-error-resolver|database-reviewer)\b/i);
            if (m) agentsSet.add(m[1].toLowerCase());
          }
        }
      }
    }

    return {
      claude_md_read: claudeMdRead,
      vkf_workflow_read: vkfWorkflowRead,
      trigger_map_read: triggerMapRead,
      agents_activated: Array.from(agentsSet)
    };
  } catch {
    return defaults;
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const MAX_STDIN = 512 * 1024;
let stdinData = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', chunk => {
  if (stdinData.length < MAX_STDIN) stdinData += chunk.substring(0, MAX_STDIN - stdinData.length);
});
process.stdin.on('end', () => {
  try { runMain(); } catch { process.exit(0); }
});

function runMain() {
  if (getTier() === 'LITE') process.exit(0);

  let transcriptPath = null;
  try {
    const input = JSON.parse(stdinData);
    transcriptPath = input.transcript_path || null;
  } catch {
    transcriptPath = process.env.CLAUDE_TRANSCRIPT_PATH || null;
  }

  // Type A checks
  const typeA = {
    update_docs_after_merge: checkUpdateDocsAfterMerge(),
    retrospective_after_merge: checkRetrospectiveAfterMerge(),
    e2e_tests_written: checkE2eTestsWritten(),
    build_clean: checkBuildClean(),
    project_context_days_stale: checkProjectContextFreshness(),
    backport_analyzer_ran: checkBackportAnalyzerRan(),
    code_review_ran: checkCodeReviewRan()
  };

  // Type B checks
  const typeB = parseTranscript(transcriptPath);

  const branchResult = runCommand('git rev-parse --abbrev-ref HEAD');

  const record = {
    timestamp: new Date().toISOString(),
    session_id: getSessionIdShort(),
    project: getProjectName() || 'unknown',
    branch: branchResult.success ? branchResult.output : 'unknown',
    checks: {
      ...typeA,
      claude_md_read: typeB.claude_md_read,
      vkf_workflow_read: typeB.vkf_workflow_read,
      trigger_map_read: typeB.trigger_map_read,
      agents_activated: typeB.agents_activated
    }
  };

  try {
    const sessionsDir = getSessionsDir();
    ensureDir(sessionsDir);
    const logFile = path.join(sessionsDir, 'compliance-log.jsonl');
    appendFile(logFile, JSON.stringify(record) + '\n');
    log(`[ComplianceMonitor] Logged to ${logFile}`);
  } catch {
    // Silent — never block
  }

  process.exit(0);
}
