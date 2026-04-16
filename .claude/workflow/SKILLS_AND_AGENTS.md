# Skills, Agents и Commands

---

## Skills (файлы .md в .claude/skills/)

| # | Skill | Источник | Тир | Назначение |
|---|---|---|---|---|
| 1 | coding-standards | ECC | ALL | Стиль кода, именование, организация файлов, code quality checklist |
| 2 | search-first | ECC | STD+ | Исследование перед кодированием: npm/GitHub/MCP/skills |
| 3 | strategic-compact | ECC | STD+ | Управление контекстным окном, compaction decision guide |
| 4 | verification-loop | ECC | ENT | Build → typecheck → lint → test → security → diff review |
| 5 | e2e-testing | ECC | STD+ | E2E-тесты Playwright: трёхуровневая схема, счётчик, CI-интеграция |

Skills загружаются в контекст только при активации по триггеру. Неактивированные skills не занимают место в контекстном окне (кроме минимального описания в YAML-заголовке).

---

## Agents (файлы .md в .claude/agents/)

| # | Agent | Источник | Модель | Тир | Назначение |
|---|---|---|---|---|---|
| 1 | planner | ECC | opus | STD+ | Декомпозиция сложных задач на шаги с файлами и рисками |
| 2 | code-reviewer | ECC | sonnet | STD+ | Quality + security review с confidence-based filtering (>80%) |
| 3 | security-reviewer | ECC | sonnet | STD+ | OWASP Top 10, secrets, input validation, CSRF, XSS |
| 4 | build-error-resolver | ECC | sonnet | ALL | Исправление ошибок сборки: npm run build failed |
| 5 | database-reviewer | ECC | sonnet | STD+ | Supabase queries, RLS, миграции, N+1, unbounded queries |

> Модели обновлены в апреле 2026 (оптимизация usage limits).
> Подробнее: workflow/MODEL_ROUTING_GUIDE.md

Agents — это отдельные экземпляры Claude Code с ограниченным scope. Каждый вызов агента расходует сообщения из usage limit (Max Plan). Вызывать только по триггеру для рационального использования лимита.

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
| /e2e | CC по триггеру (новая UI-механика) | STD+ | Написать E2E-тест для текущей механики (Playwright) |
| /e2e-full | CC по счётчику (≥5) или вручную | STD+ | Full scope прогон всех E2E-тестов |

> **Примечание по `/e2e` и `/e2e-full`:** Playwright (`@playwright/test`) — это npm-пакет проекта
> (`devDependencies`), не MCP-сервер и не Claude Code plugin. Устанавливается командой
> `npm install -D @playwright/test`. Полная механика: `.claude/skills/e2e-testing/SKILL.md`.

---

## Plugins (установлены глобально)

| Plugin | Источник | Тир | Назначение |
|--------|----------|-----|------------|
| github | claude-plugins-official | STD+ | GitHub интеграция: PR, issues, code search |
| supabase | claude-plugins-official | STD+ | Supabase интеграция: SQL, схема, auth |
| context7 | claude-plugins-official | STD+ | Актуальная документация библиотек по версиям |
| code-review | claude-plugins-official | STD+ | Мультиагентный review с confidence scoring |
| security-guidance | claude-plugins-official | STD+ | PreToolUse hook: предупреждает о security-паттернах |
| code-simplifier | claude-plugins-official | STD+ | Behavior-preserving cleanup кода |
| typescript-lsp | claude-plugins-official | STD+ | LSP-интеграция: быстрый поиск символов вместо grep |
| frontend-design | claude-plugins-official | STD+ | UI/UX компоненты, дизайн-токены, accessibility |

Plugins устанавливаются через интерфейс Claude Code (Settings → Plugins). Не более 8 одновременно для поддержания качества контекста.

---

## Накопленный опыт (автоматически обновляемые файлы)

| Файл | Назначение | Читается |
|------|------------|----------|
| `workflow/LEARNED_OVERRIDES.md` | Маркеры — когда пропускать/добавлять механизмы | Шаг 5 сессии — переопределяет триггеры |
| `workflow/LEARNED_PATTERNS.md` | Технические паттерны — нетривиальное API-поведение, workarounds | Шаг 5 сессии — дополняет реализацию |

LEARNED_OVERRIDES переопределяет стандартные триггеры активации. LEARNED_PATTERNS дополняет реализацию, но не отменяет триггеры.

