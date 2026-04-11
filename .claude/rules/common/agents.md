# Agent Orchestration

## Available Agents

Located in `.claude/agents/` (project-level) or `~/.claude/agents/` (user-level):

| Agent | Purpose | Model | When to Use |
|-------|---------|-------|-------------|
| planner | Implementation planning | opus | Complex features, refactoring |
| code-reviewer | Code review | sonnet | After writing code |
| security-reviewer | Security analysis | sonnet | Before commits with auth/API/input |
| build-error-resolver | Fix build errors | sonnet | When build fails |
| database-reviewer | DB query/schema review | sonnet | When writing SQL or migrations |

## Immediate Agent Usage

No user prompt needed:
1. Complex feature requests — use **planner** agent
2. Code just written/modified — use **code-reviewer** agent
3. Build or type errors — use **build-error-resolver** agent
4. Auth, API routes, sensitive data — use **security-reviewer** agent

## Iterative Retrieval (проверка результатов субагентов)

Когда orchestrator делегирует задачу через Task — оценить возврат перед использованием:

1. **Получить результат** от sub-agent
2. **Оценить:** полнота, точность, достаточность для принятия решения
3. **Если недостаточно:** переформулировать запрос с уточнением + передать предыдущий ответ
4. **Максимум 3 цикла.** После 3-го — принять лучший результат с оговорками

**Ключевое правило:** всегда передавать objective context (ЗАЧЕМ нужен ответ), не только query (ЧТО найти).

## Parallel Task Execution

ALWAYS use parallel Task execution for independent operations:

```markdown
# GOOD: Parallel execution
Launch 3 agents in parallel:
1. Agent 1: Security analysis of auth module
2. Agent 2: Performance review of cache system
3. Agent 3: Type checking of utilities

# BAD: Sequential when unnecessary
First agent 1, then agent 2, then agent 3
```

## Multi-Perspective Analysis

For complex problems, use split role sub-agents:
- Factual reviewer
- Senior engineer
- Security expert
- Consistency reviewer
- Redundancy checker
