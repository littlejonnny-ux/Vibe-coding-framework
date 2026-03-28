# Skills, Agents и Commands

---

## Skills (файлы .md в .claude/skills/)

| # | Skill | Источник | Тир | Назначение |
|---|---|---|---|---|
| 1 | coding-standards | ECC | ALL | Стиль кода, именование, организация файлов, code quality checklist |
| 2 | search-first | ECC | STD+ | Исследование перед кодированием: npm/GitHub/MCP/skills |
| 3 | strategic-compact | ECC | STD+ | Управление контекстным окном, compaction decision guide |
| 4 | verification-loop | ECC | ENT | Build → typecheck → lint → test → security → diff review |

Skills загружаются в контекст только при активации по триггеру. Неактивированные skills не потребляют токены (кроме ~50 токенов на описание в YAML-заголовке).

---

## Agents (файлы .md в .claude/agents/)

| # | Agent | Источник | Модель | Тир | Назначение |
|---|---|---|---|---|---|
| 1 | planner | ECC | opus | STD+ | Декомпозиция сложных задач на шаги с файлами и рисками |
| 2 | code-reviewer | ECC | sonnet | STD+ | Quality + security review с confidence-based filtering (>80%) |
| 3 | security-reviewer | ECC | sonnet | STD+ | OWASP Top 10, secrets, input validation, CSRF, XSS |
| 4 | build-error-resolver | ECC | sonnet | ALL | Исправление ошибок сборки: npm run build failed |
| 5 | database-reviewer | ECC | sonnet | STD+ | Supabase queries, RLS, миграции, N+1, unbounded queries |

Agents — это отдельные экземпляры Claude Code с ограниченным scope. Каждый вызов агента = отдельный расход токенов. Вызывать только по триггеру.

### Правила делегирования агенту

**Делегировать, если:**
- Задача чётко определена и ограничена по scope
- Агент имеет необходимые tools
- Основной контекст не нужно передавать целиком
- Параллельное выполнение даёт выигрыш

**НЕ делегировать, если:**
- Задача тривиальна (<20 строк изменений)
- Решение очевидно и не требует второго мнения
- Задача требует полного контекста текущей сессии

---

## Commands (slash-команды)

| Command | Кто вызывает | Тир | Назначение |
|---|---|---|---|
| /plan | CC по триггеру или пользователь | STD+ | Создание implementation plan для сложных задач |
| /code-review | CC автоматически по workflow | STD+ | Мультиагентный code review PR |
| /update-docs | CC автоматически после merge | STD+ | Обновление живых документов проекта |
| /build-fix | CC автоматически при ошибке build | ALL | Исправление ошибок сборки |
| /tdd | CC по триггеру | STD+ | Переключение в режим TDD для бизнес-логики |
| /verify | CC по триггеру | ENT | Запуск verification loop (6 фаз) |
| /compact | CC по рекомендации suggest-compact или вручную | STD+ | Ручная compaction контекста |

---

## Plugins (устанавливаются через /plugin install)

| Plugin | Тир | Что делает |
|---|---|---|
| Code Review [PLUGIN] | STD+ | Мультиагентный review с confidence scoring |
| Context7 [PLUGIN] | STD+ | Актуальная документация библиотек по версиям |
| Security Guidance [PLUGIN] | STD+ | PreToolUse hook: предупреждает о security-паттернах |
| Code Simplifier [PLUGIN] | STD+ | Behavior-preserving cleanup кода после сессии |
| CLAUDE.md Management [PLUGIN] | STD+ | Аудит качества CLAUDE.md, фиксация learnings |

Plugins устанавливаются один раз. Их descriptions потребляют токены постоянно. Не устанавливать больше 5–6 одновременно.

---

## Что НЕ использовать как MCP (замена CLI)

| Вместо MCP | Используем | Экономия |
|---|---|---|
| GitHub MCP | `gh` CLI | ~2000 токенов |
| Supabase MCP | проектные скрипты db.js / db-schema.js | ~3000 токенов |
| Vercel MCP | auto-deploy через git push | ~1500 токенов |
