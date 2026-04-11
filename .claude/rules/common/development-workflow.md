# Development Workflow / Процесс разработки

> This file extends [common/git-workflow.md](./git-workflow.md) with the full feature development process that happens before git operations.

The Feature Implementation Workflow describes the development pipeline: research, planning, TDD, code review, and then committing to git.

## Feature Implementation Workflow

0. **Research & Reuse** _(mandatory before any new implementation)_
   - **GitHub code search first:** Run `gh search repos` and `gh search code` to find existing implementations, templates, and patterns before writing anything new.
   - **Library docs second:** Use Context7 or primary vendor docs to confirm API behavior, package usage, and version-specific details before implementing.
   - **Web search as last resort:** Use WebSearch only when GitHub search and primary docs are insufficient.
   - **Check package registries:** Search npm, PyPI, crates.io, and other registries before writing utility code. Prefer battle-tested libraries over hand-rolled solutions.
   - **Search for adaptable implementations:** Look for open-source projects that solve 80%+ of the problem and can be forked, ported, or wrapped.
   - Prefer adopting or porting a proven approach over writing net-new code when it meets the requirement.

1. **Plan First**
   - Use **planner** agent to create implementation plan
   - Generate planning docs before coding: PRD, architecture, system_design, tech_doc, task_list
   - Identify dependencies and risks
   - Break down into phases

2. **TDD Approach** _(STANDARD and ENTERPRISE tiers)_
   - Write tests first (RED)
   - Implement to pass tests (GREEN)
   - Refactor (IMPROVE)
   - Verify 80%+ coverage

3. **Code Review**
   - Use **code-reviewer** agent immediately after writing code
   - Address CRITICAL and HIGH issues
   - Fix MEDIUM issues when possible

4. **Commit & Push**
   - Detailed commit messages
   - Follow conventional commits format
   - See [git-workflow.md](./git-workflow.md) for commit message format and PR process

## Error Recovery Protocol

When Claude Code encounters repeated failures (same error persisting after multiple fix attempts), follow this escalation protocol:

### Attempt Tracking
- **Attempt 1–2:** Normal fix cycle. Use build-error-resolver agent, apply minimal diffs.
- **Attempt 3:** PAUSE. Before attempting another fix:
  1. Re-read the error message from scratch (don't rely on context from previous attempts)
  2. Check if the fix approach is fundamentally wrong (not just a typo)
  3. Consider alternative approach: different library, different pattern, different architecture
  4. If alternative exists — switch to it. If not — proceed to attempt 3 with fresh approach.
- **After attempt 3 fails:** STOP. Do NOT attempt further fixes automatically.

### STOP Protocol (after 3 failed attempts)
When stopping:
1. **Describe the problem clearly** to the user:
   - What error occurs (exact message)
   - What was tried (3 approaches, briefly)
   - Why each failed
2. **Propose 2–3 alternative approaches:**
   - Different architectural solution
   - Reverting the change and approaching differently
   - Accepting a temporary workaround
3. **Ask the user** which approach to take. Do NOT proceed without user input.

### What Counts as a "Failed Attempt"
- Same error persists after fix
- Fix resolves one error but introduces a new one of equal or greater severity
- Build/typecheck still fails after applying the fix
- Test that was passing now fails due to the fix

### What Does NOT Count (reset the counter)
- User provides new information or clarification — reset to attempt 1
- Error changes fundamentally (different file, different category) — reset to attempt 1
- User explicitly says "try again" — reset to attempt 1

### Scope
This protocol applies to:
- Build errors (npm run build)
- TypeScript errors (tsc --noEmit)
- Test failures that block merge
- Lint errors that cannot be auto-fixed

This protocol does NOT apply to:
- Iterative feature development (trying different UI layouts is not "failure")
- Research/exploration phase
- User-directed changes ("try X instead" is not an error recovery)
