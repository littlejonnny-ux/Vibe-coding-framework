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
| **CLI** | Альтернатива MCP для проектов без подключённых сервисов | — | Через bash/scripts |

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

## MCP-серверы

На Max Plan с Opus (1M контекст) overhead от MCP descriptions составляет 0.2–0.3% контекстного окна — незначительно. MCP предпочтительнее CLI: структурированные данные, меньше парсинга, меньше ошибок.

| Сервис | Тип | Конфигурация | Scope |
|---|---|---|---|
| GitHub | MCP (глобальный) | `~/.claude.json` → mcpServers → github | Все репозитории |
| Supabase | MCP (глобальный) | `~/.claude.json` → mcpServers → supabase | Все проекты (без project_ref) |
| Context7 | Plugin | `/plugin install context7@claude-plugins-official` | Глобальный |
| Vercel | Не нужен | auto-deploy через git push | — |
| Playwright | MCP (по необходимости) | Добавить в проектный .claude.json | ENTERPRISE tier |

**Правила:**
- Не более 10 MCP одновременно (качество контекста)
- Не более 80 tools активных
- Неиспользуемые в конкретном проекте — отключать через `disabledMcpServers` в проектном `.claude/settings.json`
- При 1M контексте (Opus Max Plan) 3–4 MCP — абсолютно нормально

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
