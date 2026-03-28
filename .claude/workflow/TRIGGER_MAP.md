# Карта триггеров

Этот файл определяет, какие skills, agents и commands активировать для какого типа задачи. Claude Code сопоставляет описание задачи с таблицами ниже и активирует минимально необходимый набор.

**ВАЖНО:** Перед активацией проверь LEARNED_OVERRIDES.md — маркеры из него ПЕРЕОПРЕДЕЛЯЮТ правила из этого файла.

---

## Триггеры активации skills

| Сигнал в задаче | Skills | Тир |
|---|---|---|
| «Добавь фильтр», «поправь кнопку», «измени текст» | coding-standards | ALL |
| «Создай новую страницу», «добавь компонент» | coding-standards + search-first | STD+ |
| «Добавь API endpoint», «создай серверную функцию» | coding-standards + search-first | STD+ |
| «Измени формулу», «обнови бизнес-логику» | coding-standards + verification-loop | STD+ |
| «Добавь колонку в БД», «создай таблицу» | coding-standards | STD+ |
| «Добавь авторизацию», «настрой RLS» | coding-standards + search-first | STD+ |
| «Рефакторинг 10+ файлов» | coding-standards + verification-loop | ENT |
| «Добавь workflow согласования» | coding-standards + verification-loop | ENT |
| Сессия длинная, context >50% | strategic-compact | STD+ |

## Триггеры активации agents

| Ситуация | Agent | Тир |
|---|---|---|
| Задача затрагивает >3 файла, неочевидная архитектура | planner | STD+ |
| PR содержит код (не docs/CSS only) + соответствует правилам /code-review | code-reviewer | STD+ |
| PR содержит auth/RLS/API/формы с пользовательским вводом | security-reviewer | STD+ |
| PR содержит Supabase queries/RLS/миграции | database-reviewer | STD+ |
| `npm run build` failed | build-error-resolver | ALL |

## Триггеры активации commands

| Ситуация | Command | Тир |
|---|---|---|
| Сложная задача, нужна декомпозиция | /plan | STD+ |
| После push, перед merge (если обязателен) | /code-review | STD+ |
| После merge | /update-docs | STD+ |
| Build failed | /build-fix | ALL |
| Бизнес-логика, формулы, серверные routes | /tdd | STD+ |
| Перед merge крупного PR (>200 строк) | /verify | ENT |
| Сессия длинная, context забит | /compact | STD+ |

---

## Правила «когда НЕ активировать» (экономия токенов)

| Ситуация | Пропускаемые механизмы |
|---|---|
| Docs-only изменения (.md файлы) | /code-review, security-reviewer, tdd, tests |
| CSS-only правки | /code-review, security-reviewer, tdd, tests |
| Однофайловый фикс <50 строк с очевидным scope | planner, verification-loop |
| Текстовые правки (labels, placeholder, tooltip) | Все кроме lint + commit |
| Правка в одном компоненте <50 строк | planner |
| Добавление/изменение .gitignore, README, конфигов | Все кроме lint + commit |

---

## Принцип минимальной активации

Claude Code всегда стремится к минимальному набору механизмов, достаточному для качественного выполнения задачи. Если задача простая — не нужно активировать сложные механизмы только потому что они доступны.

**Базовая формула:** lint + commit + push — это минимум для любой задачи в любом тире. Всё остальное — по триггерам.
