# Learned Overrides

> Этот файл заполняется автоматически по результатам post-merge retrospective.
> Claude Code читает его перед принятием решения об активации skills/agents.
> Маркеры из этого файла ПЕРЕОПРЕДЕЛЯЮТ правила из TRIGGER_MAP.md.

---

## Маркеры

### [2026-04-16] Backport из KPI-System-2

**Маркер 1 — Изменения только в `.claude/`**
- **Контекст:** PR с diff исключительно в `.claude/` (workflow, rules, skills — конфиг фреймворка, не код проекта)
- **Избыточно:** code-reviewer, security-reviewer, database-reviewer, e2e-testing
- **Маркер:** Изменения исключительно в `.claude/` → пропускать code-reviewer, security-reviewer, database-reviewer, e2e-testing. Подтверждено на 2 реальных PR.

---

**Маркер 2 — Docs-only PR**
- **Контекст:** PR содержит только `.md` файлы (документация, планы, контекст)
- **Избыточно:** все review-агенты
- **Маркер:** Docs-only PRs (.md файлы) → пропускать все review-агенты. Подтверждено на 2 реальных PR.

---

**Маркер 3 — Чистая бизнес-логика + unit-тесты (без UI, auth, API routes)**
- **Контекст:** Добавление/изменение функций расчёта или обработки данных без HTTP-слоя, UI-компонентов или auth
- **Избыточно:** security-reviewer, e2e-testing
- **Маркер:** Изменения только в модулях бизнес-логики + unit-тесты (TDD) → пропускать security-reviewer (нет attack surface) и e2e-testing (покрыто unit-тестами). Подтверждено на Stage 4 KPI-System-2.

---

**Маркер 4 — Data layer: только `hooks/`, без новых страниц/UI**
- **Контекст:** Изменения только в `hooks/` (TanStack Query или аналог) без добавления новых страниц или UI-компонентов
- **Избыточно:** e2e-testing, security-reviewer
- **Маркер:** Изменения только в `hooks/` без новых страниц/UI-компонентов → пропускать e2e-testing и security-reviewer. RLS auto-filtering через Supabase JWT достаточен; уязвимости в client-side data-fetching wrappers без API routes маловероятны. Подтверждено на Stage 5 KPI-System-2.

---

**Маркер 5 — Supabase миграции с RLS-политиками**
- **Контекст:** PR содержит SQL-миграции с RLS-политиками, PostgreSQL functions, множеством таблиц
- **Результативно:** database-reviewer И security-reviewer — оба критически важны
- **Маркер:** Supabase миграции с RLS-политиками → ОБЯЗАТЕЛЬНО запускать database-reviewer И security-reviewer. database-reviewer проверяет схему/индексы, security-reviewer проверяет дыры в RLS. Подтверждено на Stage 2 KPI-System-2 (9 миграций, 18 таблиц).
