# Blueprint: Генерация CLAUDE.md проекта

---

## Когда использовать

При инициализации нового проекта. Пользователь описывает проект, Claude Code генерирует CLAUDE.md по этому шаблону.

---

## Инструкция для Claude Code

При получении описания нового проекта:

### Шаг 1 — Определи тир
Сопоставь описание с таблицей из VIBE_CODING_WORKFLOW.md (Часть «Выбор тира»). Если ≥3 критерия в более высоком тире — используй более высокий. Сообщи пользователю выбранный тир и обоснование.

### Шаг 2 — Определи модульную структуру
Проанализируй бизнес-домен. Каждая крупная сущность/фича = модуль. Зафиксируй в секции «Структура модулей».

### Шаг 3 — Определи живые документы
На основе типа проекта определи, какие живые документы нужны:
- **Всегда:** PROJECT_CONTEXT.md, CODE_LEARNINGS.md
- **Web-приложение с UI:** + UI_PATTERNS.md
- **API без UI:** + API_PATTERNS.md
- **Data pipeline:** + DATA_PATTERNS.md
- **Любой с ТЗ:** + TECHNICAL_SPECIFICATION.md

### Шаг 4 — Определи развилки (2–3 вопроса пользователю)
Вариативные решения, где нет объективно лучшего ответа:
- Тёмная или светлая тема? (для UI-проектов)
- Какие шрифты?
- Монорепо или отдельные репозитории? (если несколько сервисов)

Все технические развилки (ORM, форматтер, test runner) — Claude Code решает сам на основе стека и best practices.

### Шаг 5 — Сгенерируй CLAUDE.md
По шаблону ниже. Покажи пользователю на утверждение. Не начинай работу до утверждения.

---

## Шаблон CLAUDE.md

```markdown
# CLAUDE.md

## Проект
[Краткое описание: назначение, целевая аудитория, масштаб]

## Тир workflow
[LITE / STANDARD / ENTERPRISE] — определён по VIBE_CODING_WORKFLOW.md.
Полный workflow — в .claude/VIBE_CODING_WORKFLOW.md.

## Стек
| Компонент | Технология |
|---|---|
| Frontend | [фреймворк + язык] |
| Backend / БД | [сервис] |
| Хостинг | [платформа] |
| Аутентификация | [метод] |
| Стили | [подход] |
| Тестирование | [runner + библиотеки] |

## Обязательное чтение
Перед любой работой прочитай:
1. `.claude/VIBE_CODING_WORKFLOW.md` — процесс, тиры, триггеры
2. Этот файл (`CLAUDE.md`) — правила проекта
3. `TECHNICAL_SPECIFICATION.md` — бизнес-логика, формулы, роли
4. `UI_PATTERNS.md` — принятые UI-решения (если UI-проект)
5. `PROJECT_CONTEXT.md` — карта файлов, текущий статус

## Активированные механизмы
[Список skills, agents, commands, plugins — из tier-матрицы SKILLS_AND_AGENTS.md]

## Структура модулей
[Модульная структура, определённая из бизнес-домена]
```
[пример:]
```
src/
├── features/
│   ├── [module-1]/       # [описание]
│   ├── [module-2]/       # [описание]
│   ├── [module-3]/       # [описание]
│   └── shared/           # Общие компоненты
├── lib/                  # Утилиты, расчёты, константы
├── hooks/                # Custom hooks (data layer)
├── types/                # TypeScript типы
└── app/                  # Роутинг, layouts, API routes
```

## Правила работы
1. Перед реализацией новой фичи — спроси, что именно нужно. Не додумывай.
2. Перед изменением файла — прочитай его актуальную версию.
3. Не устанавливай новые npm-пакеты без подтверждения.
4. Не удаляй и не переписывай работающий код без объяснения причины.
5. Обрабатывай ошибки явно. Не оставляй catch пустым.
6. Общие константы — в одном файле, не дублируй.
7. Новые UI-решения должны соответствовать UI_PATTERNS.md. Новое — зафиксируй.
8. [Проектно-специфичные правила]

## Работа с базой данных
[Если проект использует БД — полный pipeline из rules/common/database-workflow.md,
адаптированный под конкретный стек проекта: инструменты интроспекции, выполнения SQL,
формат connection string]

## Build & Dev
```bash
[команды установки, запуска, сборки]
```

## CI
[STANDARD+ только]
GitHub Actions: `.github/workflows/ci.yml`
Pipeline: lint → typecheck → test → build
[ENTERPRISE: branch protection enabled, CI обязателен для merge]

## Git
- Ветки: `feature/название` для фич, `fix/описание` для исправлений
- Коммиты на английском: feat:, fix:, refactor:, docs:, test:, chore:
- Автоматический push → PR → merge (без подтверждения пользователя)

## Живые документы
[Список документов, обновляемых через /update-docs после каждого merge]
- PROJECT_CONTEXT.md — карта файлов, статус, проблемы
- TECHNICAL_SPECIFICATION.md — бизнес-логика (если менялась)
- UI_PATTERNS.md — UI-решения (если новые)
- CODE_LEARNINGS.md — паттерны и learnings кодовой базы

> **Примечание:** Технические паттерны уровня framework (нетривиальное поведение API,
> workarounds, universal patterns) записываются в `.claude/workflow/LEARNED_PATTERNS.md`
> (шаг 5 ретроспективы), а не в CODE_LEARNINGS.md. CODE_LEARNINGS.md — проектный уровень,
> LEARNED_PATTERNS.md — framework уровень.

## Запрещено
- inline styles (кроме единичных динамических значений)
- `!important`
- `console.log` в production
- Хардкод значений, которые должны быть настраиваемыми
- Дублирование констант и утилит между файлами
- Пустые catch-блоки
- [Проектно-специфичные запреты]
```

---

## Константные блоки (Тип A — включаются без вопросов)

Следующие секции включаются в каждый CLAUDE.md без вариативности:
- Правила работы (пп. 1–6 — универсальны)
- Git workflow (conventional commits, feature-ветки, auto push)
- Секция «Запрещено» (базовый набор)
- Ссылка на VIBE_CODING_WORKFLOW.md
- Обязательное чтение

---

## Автоматические развилки (Тип B — Claude Code решает сам)

| Развилка | Как решает Claude Code |
|---|---|
| Валидация форм | Zod + React Hook Form (если React) / Zod standalone (если API) |
| Форматтер | Prettier (если JS/TS) / Black (если Python) |
| Test runner | Vitest (если Vite) / Jest (если Next.js без Turbopack) / Playwright (E2E) |
| ORM/Query builder | Drizzle или Prisma (если SQL) / Supabase client (если Supabase) |
| Лinter | ESLint (если JS/TS) / Ruff (если Python) |
| State management | TanStack Query (server state) + useState/useReducer (local state) |

Claude Code указывает выбранный вариант и причину в комментарии рядом с секцией «Стек».

---

## CI Pipeline (STANDARD+ тир — генерируется автоматически)

При инициализации STANDARD+ проекта Claude Code создаёт `.github/workflows/ci.yml`.

### Базовый шаблон (Next.js + TypeScript)

```yaml
name: CI

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  quality:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'
      - run: npm ci
      - name: Lint
        run: npm run lint
      - name: TypeCheck
        run: npx tsc --noEmit
      - name: Test
        run: npm run test -- --run
      - name: Build
        run: npm run build
```

### Адаптация по стеку

| Стек | Адаптация |
|---|---|
| pnpm | `pnpm install --frozen-lockfile`, cache: 'pnpm' |
| yarn | `yarn --frozen-lockfile`, cache: 'yarn' |
| Jest вместо Vitest | `npm run test -- --ci` |
| Playwright (ENTERPRISE) | Отдельный job `e2e:` с `npx playwright install --with-deps` |

### Правила

- CI генерируется один раз при инициализации, далее обновляется по запросу
- STANDARD: CI информационный — Claude Code мёржит через `gh pr merge` независимо от CI
- ENTERPRISE: CI обязателен — настроить branch protection, merge только при зелёном CI
- Файл `.github/workflows/ci.yml` включается в первый коммит проекта

---

## Пользовательские развилки (Тип C — спросить у пользователя)

Формулировать на понятном языке, без CS-терминологии. Максимум 2–3 вопроса.

Примеры:
- «Тёмная или светлая тема для интерфейса?»
- «Какие шрифты предпочитаете? Или оставить на моё усмотрение?»
- «Приложение будет использоваться только с компьютера, или также с телефона?»

---

## Framework Backport Configuration

Для работы механизма автоматического backport добавь в `CLAUDE.md` проекта путь к локальной папке Vibe-Coding-Framework:

```
VIBE_FRAMEWORK_PATH=[полный путь к папке Vibe-Coding-Framework на этом компьютере]
```

**Примеры:**
- Windows: `VIBE_FRAMEWORK_PATH=C:\Users\[имя пользователя]\Documents\GitHub\Vibe-Coding-Framework`
- macOS/Linux: `VIBE_FRAMEWORK_PATH=/Users/[имя пользователя]/projects/Vibe-Coding-Framework`

**Важно:** путь определяется на каждом компьютере отдельно. Спроси у пользователя где находится локальная копия framework при инициализации нового проекта.
