# Plugins, Tools и инфраструктура

Этот файл определяет, что устанавливается как plugin, что копируется как skill-файл, что используется как MCP, и что заменяется CLI-инструментами.

---

## Принцип разделения

| Тип | Когда использовать | Обновления | Контроль |
|---|---|---|---|
| **Plugin** (`/plugin install`) | Функция существует как качественный standalone-плагин в marketplace | Автоматические | Нет (работает «как есть») |
| **Skill-файл** (.md в .claude/skills/) | Функции нет как плагина, или нужна адаптация под workflow | Ручные | Полный (можно редактировать) |
| **Agent-файл** (.md в .claude/agents/) | Нужен отдельный subagent с ограниченным scope | Ручные | Полный |
| **MCP** | Внешний сервис, часто используемый в контексте | Автоматические | Настройка через .claude.json |
| **CLI** | Замена MCP для освобождения контекстного окна | — | Через bash/scripts |

---

## Plugins (устанавливаются через /plugin install)

```bash
# STANDARD tier — обязательные
/plugin install code-review@claude-code-plugins
/plugin install context7@claude-plugins-official
/plugin install security-guidance@claude-code-plugins
/plugin install code-simplifier@claude-plugins-official
/plugin install claude-md-management@...    # проверить актуальное имя

# ENTERPRISE tier — дополнительные (по необходимости)
# /plugin install ralph-loop@claude-code-plugins     # автономные циклы
# /plugin install playwright@...                      # E2E тестирование
```

**Правило:** Не более 5–6 plugins одновременно. Descriptions каждого plugin занимают место в контекстном окне, влияя на качество ответов.

---

## Skill-файлы (копируются из ECC)

| Skill | Файл | Тир |
|---|---|---|
| coding-standards | `.claude/skills/coding-standards/SKILL.md` | ALL |
| search-first | `.claude/skills/search-first/SKILL.md` | STD+ |
| strategic-compact | `.claude/skills/strategic-compact/SKILL.md` | STD+ |
| verification-loop | `.claude/skills/verification-loop/SKILL.md` | ENT |

---

## Agent-файлы (копируются из ECC)

| Agent | Файл | Модель | Тир |
|---|---|---|---|
| planner | `.claude/agents/planner.md` | opus | STD+ |
| code-reviewer | `.claude/agents/code-reviewer.md` | opus | STD+ |
| security-reviewer | `.claude/agents/security-reviewer.md` | opus | STD+ |
| build-error-resolver | `.claude/agents/build-error-resolver.md` | opus | ALL |
| database-reviewer | `.claude/agents/database-reviewer.md` | opus | STD+ |

---

## MCP vs CLI

| Сервис | MCP | CLI-замена | Рекомендация |
|---|---|---|---|
| GitHub | @modelcontextprotocol/server-github | `gh` CLI | **CLI** — освобождает контекстное окно для качества |
| Supabase | @supabase/mcp-server-supabase | проектные скрипты db.js | **CLI** — освобождает контекстное окно для качества |
| Vercel | mcp.vercel.com | auto-deploy через git push | **Не нужен** — push → auto-deploy |
| Context7 | — | Plugin context7 | **Plugin** (не MCP) |
| Playwright | @playwright/mcp | Plugin или CLI | **По необходимости** (ENT tier) |

**Правило:** Не более 10 MCP одновременно. Не более 80 tools активных. Отключать неиспользуемые через `disabledMcpServers` в проектном .claude/settings.json.

---

## Hooks (автоматические триггеры)

| Hook | Событие | Скрипт | Тир |
|---|---|---|---|
| Session start | SessionStart | `session-start.js` | STD+ |
| Session end | Stop | `session-end.js` | STD+ |
| Pre-compact | PreCompact | `pre-compact.js` | STD+ |
| Suggest compact | PreToolUse (Edit/Write) | `suggest-compact.js` | STD+ |

Hooks настраиваются через `.claude/hooks/hooks.json`. Скрипты — в `.claude/hooks/scripts/`.

---

## Инициализация нового проекта — чеклист

### LITE
- [ ] Скопировать framework в .claude/ проекта
- [ ] Создать CLAUDE.md

### STANDARD (в дополнение)
- [ ] Установить 5 plugins
- [ ] Настроить hooks (hooks.json + скрипты)
- [ ] Настроить settings.json (model, tokens, autocompact)
- [ ] Создать базовый CI: lint → typecheck → test → build

### ENTERPRISE (в дополнение к STANDARD)
- [ ] Установить дополнительные plugins (Playwright, Ralph Loop)
- [ ] Полный CI pipeline с branch protection
