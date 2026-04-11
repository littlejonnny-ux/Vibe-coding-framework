# Performance Optimization

## Model Selection

See `workflow/MODEL_ROUTING_GUIDE.md` for the authoritative model routing table.

Quick reference:
- **Default session model:** Sonnet (set in settings.local.json)
- **Planner agent:** Opus (architectural decisions requiring deep reasoning)
- **All other agents:** Sonnet (code-reviewer, security-reviewer, build-error-resolver, database-reviewer)
- **Subagents (Task tool):** Haiku (CLAUDE_CODE_SUBAGENT_MODEL in settings.local.json)
- **MAX_THINKING_TOKENS:** 10000 (cap in settings.local.json, override per-session: `export MAX_THINKING_TOKENS=31999`)

## Context Window Management

Avoid last 20% of context window for:
- Large-scale refactoring
- Feature implementation spanning multiple files
- Debugging complex interactions

Lower context sensitivity tasks:
- Single-file edits
- Independent utility creation
- Documentation updates
- Simple bug fixes

## Build Troubleshooting

If build fails:
1. Use **build-error-resolver** agent
2. Analyze error messages
3. Fix incrementally
4. Verify after each fix
5. If 3 attempts fail — follow Error Recovery Protocol in `rules/common/development-workflow.md`
