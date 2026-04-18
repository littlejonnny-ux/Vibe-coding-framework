# Полный цикл задачи по тирам

---

## LITE

```
Пользователь: описывает задачу
  ↓
Claude Code: читает CLAUDE.md (правила проекта, стек, запреты)
  ↓
[LITE: проверка Ultraplan НЕ выполняется — тир слишком простой]
  ↓
Claude Code: создаёт feature-ветку (feature/название или fix/описание)
  ↓
Claude Code: пишет код
  ↓
Claude Code: npm run lint → исправляет errors и warnings
  ↓
Claude Code: git add + commit (conventional: feat:/fix:/refactor:/docs:/test:)
  ↓
Claude Code: git push → merge в main
  ↓
ОБЯЗАТЕЛЬНО перед финальным сообщением:
   git status --porcelain
   Если не пусто — закоммитить всё, что относится к проекту, артефакты в .gitignore.
  ↓
Пользователь: проверяет результат
```

---

## STANDARD

```
Пользователь: описывает задачу
  ↓
Claude Code: читает CLAUDE.md + VIBE_CODING_WORKFLOW.md
  ↓
[Шаг 0.5] Проверка на Ultraplan (см. TRIGGER_MAP.md → «Триггеры Ultraplan»):
  → ≥2 сигналов A или ≥1 сигнала B → предложить Ultraplan → ждать ответа
  → Пользователь пишет «продолжай» → продолжить цикл
  → Пользователь пишет /ultraplan → запустить облачное планирование
  ↓
Claude Code: определяет сложность (см. TRIGGER_MAP.md)
  ↓
[Если сложная: >3 файлов, неочевидная архитектура]
  → Активирует planner agent → декомпозиция на шаги
[Если стандартная]
  → Начинает реализацию
  ↓
Claude Code: создаёт feature-ветку
  ↓
[Если незнакомая библиотека/паттерн]
  → Активирует search-first skill
  ↓
[Если БД-изменения]
  → DB pipeline (см. rules/common/database-workflow.md):
    интроспекция → проверка зависимостей → SQL → верификация
  ↓
Claude Code: пишет/обновляет код
  ↓
[Если бизнес-логика / серверные API routes]
  → Пишет unit-тесты (tdd-workflow)
  ↓
[Если build/typecheck/test fails]
  → Активирует build-error-resolver agent
  → Error Recovery Protocol (rules/common/development-workflow.md):
    Attempt 1–2: normal fix. Attempt 3: pause + rethink.
    After 3 fails: STOP, describe problem, propose alternatives, ask user.
  ↓
PRE-COMMIT ЧЕКЛИСТ:
  1. npm run lint → исправить errors, warnings
  2. npm run typecheck → исправить type errors (если TypeScript)
  3. npm run test → исправить falling tests (если есть тесты)
  4. Self-review по чеклисту:
     - [ ] Нет дублирования кода или констант
     - [ ] Все ошибки обрабатываются явно (нет пустых catch)
     - [ ] Нет хардкода значений, которые должны быть настраиваемыми
     - [ ] Новые файлы не превышают 300 строк
     - [ ] Изменения не ломают существующий функционал
     - [ ] UI соответствует UI_PATTERNS.md (если применимо)
     - [ ] Бизнес-логика соответствует TECHNICAL_SPECIFICATION.md
     - [ ] Новые компоненты соответствуют ARCHITECTURE_PRINCIPLES.md
     - [ ] Если PR содержит новую UI-механику — написан E2E-тест (см. skills/e2e-testing/SKILL.md)
     - [ ] E2E-тесты запущены по трёхуровневой схеме (см. skills/e2e-testing/SKILL.md → Трёхуровневая схема)
  ↓
Claude Code: git add + commit (conventional commits)
  ↓
АВТОМАТИЧЕСКИЙ ЦИКЛ ДО MERGE (без участия пользователя):
  1. git push -u origin <branch>
  2. gh pr create --title "Описание"
  3. Определить: нужен ли /code-review (см. правила ниже)
     [Если да] → /code-review
       → Если blocking issues (confidence ≥80):
         → Исправить → закоммитить → запушить → повторить /code-review
         → Цикл пока не чисто
     [Если нет] → пропустить
  4. /update-docs (обновить PROJECT_CONTEXT.md, TECHNICAL_SPECIFICATION.md,
     UI_PATTERNS.md, CODE_LEARNINGS.md — те, что изменились)
  5. Закоммитить обновления документации → запушить
  6. gh pr merge --merge --delete-branch
  7. git checkout main → git pull
  7.5. ОБЯЗАТЕЛЬНО: проверка чистоты working directory

   ```bash
   git status --porcelain
   ```

   Если вывод пуст — working directory чист, переходить к шагу 8.

   Если вывод НЕ пуст — есть файлы, не попавшие в коммит:
   - Для каждого файла определить:
     a) Относится к проекту (код, тесты, конфиги) — git add + коммит + push
     b) Генерируемый артефакт (playwright-report/, test-results/, .next/, node_modules/, *.log) — добавить в .gitignore, закоммитить .gitignore
   - Повторить git status --porcelain
   - Только когда вывод пуст — переходить к шагу 8

   НЕЛЬЗЯ выводить финальное сообщение (шаг 8) при непустом git status.

  8. Вывести Living Docs Dashboard — обязательная таблица статуса документов.

     Для каждого документа из списка ниже:
     - Проверить через `git diff origin/main..HEAD --name-only` — изменялся ли файл в этом PR
     - Если изменялся — ✅
     - Если НЕ изменялся — ❌ + краткое объективное пояснение (одно предложение)

     | # | Документ | Статус | Комментарий |
     |---|----------|--------|-------------|
     | 1 | PROJECT_CONTEXT.md | ✅/❌ | — |
     | 2 | TECHNICAL_SPECIFICATION.md | ✅/❌ | — |
     | 3 | UI_PATTERNS.md | ✅/❌ | — |
     | 4 | CODE_LEARNINGS.md | ✅/❌ | — |
     | 5 | LEARNED_OVERRIDES.md | ✅/❌ | — |
     | 6 | LEARNED_PATTERNS.md | ✅/❌ | — |
     | 7 | ARCHITECTURE_PRINCIPLES.md | ✅/❌ | — |

     "✅ PR #N замёржен, main обновлён. Living docs: X/Y обновлены."
  ↓
POST-MERGE RETROSPECTIVE (см. RETROSPECTIVE.md):
  1. Сбор данных (git diff --stat, затронутые файлы)
  2. Анализ активаций (skills, agents, /code-review)
  3. Оценка необходимости (результативность каждого механизма)
  4. Фиксация маркеров → LEARNED_OVERRIDES.md
  5. Извлечение технических паттернов → LEARNED_PATTERNS.md
  ↓
POST-MERGE BACKPORT (только STANDARD и ENTERPRISE):
  1. node .claude/hooks/scripts/backport-analyzer.js
  2. Показать результат анализа пользователю
  3. Дождаться решения: "перенеси в framework" или "пропустить"
  4. Если подтверждено — выполнить backport в Vibe-Coding-Framework репо
  ↓
Пользователь: проверяет результат в браузере
```

### Когда нужен /code-review

Определяется по `git diff origin/main --name-only` и `git diff origin/main --stat`.

**Обязателен для:**
- Изменений в бизнес-логике (calculations, workflow, формулы)
- Изменений в схеме БД (миграции, новые таблицы/колонки)
- Новых компонентов (создание файла с нуля)
- PR больше ~200 строк кода (insertions + deletions в .ts/.tsx/.js/.jsx)
- Auth-код, RLS-политики, API routes

**Пропускается для:**
- Docs-only изменений (только .md файлы)
- Мелких фиксов с понятным scope (добавить клик, поправить фильтр, убрать лимит, исправить текст)
- Стилевых правок (только .css файлы)
- Правок в одном файле, где изменение очевидно и локально

---

## ENTERPRISE

Как STANDARD, плюс:
- TDD обязательный для всего кода (не только бизнес-логики)
- Verification loop после каждого PR (build → typecheck → lint → test → security → diff review)
- E2E тесты для всех workflow-механик (CI gate, блокирует merge; подробнее: skills/e2e-testing/SKILL.md)
- CI pipeline (lint → typecheck → test → build) как обязательный gate перед merge
- Strategic compaction автоматическое (suggest-compact hook)

POST-MERGE RETROSPECTIVE (см. RETROSPECTIVE.md):
  1. Сбор данных (git diff --stat, затронутые файлы)
  2. Анализ активаций (skills, agents, /code-review)
  3. Оценка необходимости (результативность каждого механизма)
  4. Фиксация маркеров → LEARNED_OVERRIDES.md
  5. Извлечение технических паттернов → LEARNED_PATTERNS.md
  ↓
POST-MERGE BACKPORT:
  1. node .claude/hooks/scripts/backport-analyzer.js
  2. Показать результат анализа пользователю
  3. Дождаться решения: "перенеси в framework" или "пропустить"
  4. Если подтверждено — выполнить backport в Vibe-Coding-Framework репо
  ↓
ОБЯЗАТЕЛЬНО: проверка чистоты working directory

   ```bash
   git status --porcelain
   ```

   Если вывод пуст — working directory чист, переходить к Living Docs Dashboard.

   Если вывод НЕ пуст — есть файлы, не попавшие в коммит:
   - Для каждого файла определить:
     a) Относится к проекту (код, тесты, конфиги) — git add + коммит + push
     b) Генерируемый артефакт (playwright-report/, test-results/, .next/, node_modules/, *.log) — добавить в .gitignore, закоммитить .gitignore
   - Повторить git status --porcelain
   - Только когда вывод пуст — переходить к Living Docs Dashboard

   НЕЛЬЗЯ выводить финальное сообщение при непустом git status.
  ↓
Living Docs Dashboard (обязательно после merge):

     | # | Документ | Статус | Комментарий |
     |---|----------|--------|-------------|
     | 1 | PROJECT_CONTEXT.md | ✅/❌ | — |
     | 2 | TECHNICAL_SPECIFICATION.md | ✅/❌ | — |
     | 3 | UI_PATTERNS.md | ✅/❌ | — |
     | 4 | CODE_LEARNINGS.md | ✅/❌ | — |
     | 5 | LEARNED_OVERRIDES.md | ✅/❌ | — |
     | 6 | LEARNED_PATTERNS.md | ✅/❌ | — |
     | 7 | ARCHITECTURE_PRINCIPLES.md | ✅/❌ | — |

     "✅ PR #N замёржен, main обновлён. Living docs: X/Y обновлены."
  ↓
Пользователь: проверяет результат в браузере

---

## Секция «Запрещено»

Каждый проект имеет список абсолютных запретов в CLAUDE.md. Типовые (включаются по умолчанию при генерации CLAUDE.md):

- inline styles (кроме единичных динамических значений)
- `!important` в CSS
- `console.log` в production
- Хардкод значений, которые должны быть настраиваемыми
- Дублирование констант и утилит между файлами
- Пустые catch-блоки
- Установка npm-пакетов без подтверждения пользователя

Проектно-специфичные запреты добавляются в CLAUDE.md при инициализации.
