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

---

**Маркер 6 — Новый auth flow (AuthProvider, route guard, role-based routing)**
- **Контекст:** PR добавляет auth context provider, proxy/middleware с сессией, серверный layout с ROUTE_PERMISSIONS, страницу логина
- **Результативно:** security-reviewer + code-reviewer — оба полезны
- **Избыточно:** e2e-testing — только если помимо логина нет хотя бы одного полноценного рабочего маршрута
- **Маркер:** Новый auth flow (AuthProvider, proxy.ts/middleware, ROUTE_PERMISSIONS) → запускать security-reviewer и code-reviewer. e2e-testing — только если есть реальный user journey за пределами страницы логина. Подтверждено на Stage 3 KPI-System-2.

---

**Маркер 7 — API routes с role-based access control**
- **Контекст:** PR добавляет новые API routes с проверкой роли пользователя, статусными машинами, user input в route handlers
- **Результативно:** security-reviewer КРИТИЧЕН + code-reviewer полезен
- **Избыточно:** e2e-testing — если unit-тесты покрывают 80%+ route handlers
- **Маркер:** Новые API routes с role-based access control → ОБЯЗАТЕЛЬНО security-reviewer + code-reviewer. Если unit-тесты покрывают 80%+ route handlers — e2e-testing можно пропустить. Подтверждено на Stage 6 KPI-System-2.

---

**Маркер 8 — Dashboard UI: только read-only display, без форм и мутаций**
- **Контекст:** PR добавляет новые страницы/компоненты с charts, таблицами, метриками — без форм и записей в БД
- **Результативно:** code-reviewer полезен; e2e-testing ценен (role routing, разные dashboards per role)
- **Избыточно:** security-reviewer (read-only данные через TanStack Query + RLS, нет форм, нет мутаций, нет user input)
- **Маркер:** Новые dashboard UI-компоненты (только read-only display, без форм и мутаций) → code-reviewer + e2e-testing, пропускать security-reviewer. Подтверждено на Stage 7 KPI-System-2.

---

**Маркер 9 — CRUD modal с complex forms и мутациями в БД**
- **Контекст:** PR добавляет CRUD modal с useFieldArray, мутациями через хуки/API, user input из форм пишется в БД
- **Результативно:** ВСЕ ТРИ критичны — code-reviewer (сложная форма), e2e-testing (ключевой CRUD flow), security-reviewer (user input → мутации = attack surface)
- **Избыточно:** ничего
- **Маркер:** CRUD modal с complex forms (useFieldArray, мутации в БД) → запускать ВСЕ THREE: code-reviewer + e2e-testing + security-reviewer. Форма с мутациями = attack surface. Подтверждено на Stage 8 KPI-System-2.
