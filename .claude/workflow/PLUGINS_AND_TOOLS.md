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

## Plugins (устанавливаются через Claude Code UI → Plugins)

Plugins устанавливаются через интерфейс Claude Code (не через CLI команды). Установить через: Settings → Plugins → Browse.

| Plugin | Источник | Тир | Назначение |
|--------|----------|-----|------------|
| code-review | claude-plugins-official | STD+ | Code review в PR |
| context7 | claude-plugins-official | STD+ | Документация библиотек |
| security-guidance | claude-plugins-official | STD+ | Security анализ |
| code-simplifier | claude-plugins-official | STD+ | Упрощение кода |
| github | claude-plugins-official | STD+ | GitHub интеграция |
| supabase | claude-plugins-official | STD+ | Supabase интеграция |
| typescript-lsp | claude-plugins-official | STD+ | LSP-интеграция: быстрый поиск символов |
| frontend-design | claude-plugins-official | STD+ | UI/UX компоненты, дизайн-токены, accessibility |

**Правило:** Не более 8 plugins одновременно. Descriptions каждого plugin занимают место в контекстном окне, влияя на качество ответов.

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
| code-reviewer | `.claude/agents/code-reviewer.md` | sonnet | STD+ |
| security-reviewer | `.claude/agents/security-reviewer.md` | sonnet | STD+ |
| build-error-resolver | `.claude/agents/build-error-resolver.md` | sonnet | ALL |
| database-reviewer | `.claude/agents/database-reviewer.md` | sonnet | STD+ |

---

## MCP-серверы

GitHub, Supabase и Context7 заменены официальными плагинами (`claude-plugins-official`) — они легче по overhead на descriptions и официально поддерживаются Anthropic. MCP остаются опцией для сервисов без официального плагина (Playwright, специфичные корпоративные сервисы).

| Сервис | Тип | Конфигурация | Scope |
|---|---|---|---|
| GitHub | Plugin | `github@claude-plugins-official` | Все репозитории |
| Supabase | Plugin | `supabase@claude-plugins-official` | Все проекты |
| Context7 | Plugin | `context7@claude-plugins-official` | Глобальный |
| Vercel | Не нужен | auto-deploy через git push | — |
| Playwright | npm-пакет проекта | `npm install -D @playwright/test` | STD+ (при наличии UI) |

**Правила:**
- Не более 10 MCP одновременно (качество контекста)
- Не более 80 tools активных
- Неиспользуемые в конкретном проекте — отключать через `disabledMcpServers` в проектном `.claude/settings.json`
- При 1M контексте (Opus Max Plan) 3–4 MCP — абсолютно нормально

### Playwright — npm-пакет, не MCP

| Инструмент | Что это | Где используется |
|---|---|---|
| `@playwright/test` | npm devDependency проекта | E2E-тестирование в проекте (STD+) |
| `@playwright/mcp` | Глобальный MCP для пользователя | Опциональный инструмент; не требуется для workflow |

`@playwright/test` устанавливается в каждый STD+ проект с UI через `npm install -D @playwright/test`.
Подключение `@playwright/mcp` как MCP — личный выбор пользователя, не часть VKF workflow.

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
- [ ] Установить plugins по списку выше (до 8)
- [ ] Настроить hooks (hooks.json + скрипты)
- [ ] Настроить settings.json (model, tokens, autocompact)
- [ ] Создать `.github/workflows/ci.yml` по шаблону из CLAUDE_MD_BLUEPRINT.md

### ENTERPRISE (в дополнение к STANDARD)
- [ ] Установить `@playwright/test` как npm-пакет проекта (`npm install -D @playwright/test`)
- [ ] Расширить CI: добавить E2E job (шаблон в CLAUDE_MD_BLUEPRINT.md)
- [ ] Настроить branch protection: require CI pass before merge
