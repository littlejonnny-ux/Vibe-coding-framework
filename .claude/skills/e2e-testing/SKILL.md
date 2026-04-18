---
name: e2e-testing
description: E2E testing with Playwright for user-facing mechanics. Auto-activates when a PR contains new UI mechanics (new page, form, CRUD, status change, role restriction, navigation).
tier: STD+
triggers:
  - new page with interactive elements
  - CRUD operation (create/edit/delete entity)
  - status change workflow
  - form with validation and submission
  - role restriction
  - navigation transition
---

# Skill: E2E-тестирование (Playwright)

## Принцип

**Механика без E2E-теста — незавершённая механика.**

Каждая пользовательская механика, доходящая до merge, сопровождается E2E-тестом.
Тест пишется в том же PR, не откладывается.

---

## Что считается пользовательской механикой (требует E2E)

- Новая страница с интерактивными элементами
- CRUD-операция (создание, редактирование, удаление сущности)
- Смена статуса (workflow: draft → active → approved)
- Форма с валидацией и отправкой данных
- Ролевое ограничение (пользователь X не должен видеть/делать Y)
- Навигационный переход (клик → открывается детальная страница)

## Что НЕ требует E2E

- Чистая бизнес-логика без UI (calculations.ts) — покрыта unit-тестами
- Data layer (hooks/) без нового UI — покрыт unit-тестами
- Стилевые правки (CSS, цвета, отступы)
- Docs-only изменения

---

## Playwright — npm-пакет проекта

Playwright устанавливается как зависимость проекта:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

**`@playwright/test` — это `devDependencies` в `package.json`, не MCP-сервер и не Claude Code plugin.**

> Playwright MCP (`@playwright/mcp`) — отдельный опциональный инструмент для глобальной конфигурации
> пользователя. Он не входит в проектный workflow VKF и не требуется для E2E-тестирования.

---

## Структура тестов

```
src/__tests__/e2e/
├── navigation.spec.ts        # ОБЯЗАТЕЛЬНЫЙ baseline: загрузка страниц, отсутствие 500-ошибок
├── auth.spec.ts              # Логин, роли, редиректы, смена пароля
├── [module].spec.ts          # По одному файлу на модуль (kpi-cards, participants, …)
├── negative.spec.ts          # Негативные сценарии (запреты, валидация)
└── helpers/
    ├── auth.helper.ts        # Логин под разными ролями
    ├── seed.helper.ts        # Подготовка тестовых данных
    └── constants.ts          # Тестовые credentials, URLs
```

---

## Шаблон playwright.config.ts

```typescript
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './src/__tests__/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: process.env.CI ? undefined : {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
```

## Шаблон auth.helper.ts

```typescript
import { Page } from '@playwright/test';

export async function loginAs(page: Page, role: 'admin' | 'manager' | 'participant') {
  const credentials = {
    admin:       { email: process.env.TEST_ADMIN_EMAIL!,       password: process.env.TEST_ADMIN_PASSWORD! },
    manager:     { email: process.env.TEST_MANAGER_EMAIL!,     password: process.env.TEST_MANAGER_PASSWORD! },
    participant: { email: process.env.TEST_PARTICIPANT_EMAIL!, password: process.env.TEST_PARTICIPANT_PASSWORD! },
  };

  const { email, password } = credentials[role];
  await page.goto('/login');
  await page.fill('[data-testid="email"]', email);
  await page.fill('[data-testid="password"]', password);
  await page.click('[data-testid="submit"]');
  await page.waitForURL('/dashboard');
}
```

## Формат E2E-теста

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('Module: описание группы', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  test('Пользователь выполняет действие — результат корректен', async ({ page }) => {
    // Arrange: подготовка состояния
    await page.goto('/target-page');

    // Act: выполнение действия
    await page.click('[data-testid="action-button"]');

    // Assert: проверка результата
    await expect(page.locator('[data-testid="result"]')).toBeVisible();
  });
});
```

---

## Обязательный baseline: navigation.spec.ts

Создаётся при инициализации E2E-тестирования в проекте. Проверяет что ключевые маршруты загружаются без 500-ошибок.

```typescript
import { test, expect } from '@playwright/test';
import { loginAs } from './helpers/auth.helper';

test.describe('Navigation baseline', () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, 'admin');
  });

  const routes = [
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/settings',  name: 'Settings' },
  ];

  for (const { path, name } of routes) {
    test(`${name} — страница загружается без ошибок`, async ({ page }) => {
      const errors: string[] = [];
      page.on('response', res => {
        if (res.status() >= 500) errors.push(`${res.status()} ${res.url()}`);
      });

      await page.goto(path);
      await expect(page).not.toHaveTitle(/error/i);
      expect(errors).toHaveLength(0);
    });
  }
});
```

### Когда обновлять

- Добавить маршрут в `routes` массив при появлении новой страницы в приложении
- Обновить роль в `loginAs` если маршрут требует другой роли

### Почему обязателен

Гарантирует минимальный smoke-coverage: CI не пропустит регрессию когда добавляются новые фичи без E2E-тестов. `e2e-coverage-check` job в CI проверяет наличие хотя бы одного `.spec.ts` — `navigation.spec.ts` закрывает этот gate.

---

## Трёхуровневая схема запуска

Claude Code определяет уровень автоматически на основе `git diff` перед merge.

### Уровень 1 — Пропуск E2E

**Условие:** PR не затрагивает UI. Изменения только в:
- calculations.ts, constants.ts, utils.ts
- hooks/ без новых компонентов
- .md файлы, конфиги, CSS-only

**Действие:** E2E не запускаются. `merges_without_full_e2e` += 1.

### Уровень 2 — Targeted E2E

**Условие:** PR затрагивает UI конкретного модуля.

**Действие:** запустить E2E только затронутого модуля:

```bash
npx playwright test [module].spec.ts
```

`merges_without_full_e2e` += 1.

### Уровень 3 — Full scope E2E

**Условие:** срабатывает ЛЮБОЙ из триггеров:
1. `merges_without_full_e2e` ≥ 5
2. Завершение Stage из мастер-плана
3. Изменения в auth/, middleware, RLS-политиках, api/ routes
4. Изменения затрагивают ≥3 модуля одновременно
5. Пользователь явно запросил full scope (`/e2e-full`)

**Действие:**

```bash
npx playwright test
```

`merges_without_full_e2e` = 0.

---

## Счётчик merges_without_full_e2e

Хранится в `PROJECT_CONTEXT.md` проекта в секции «Текущий статус»:

```
**E2E full scope:** последний — [дата], merge без full scope с тех пор: [N]
```

Обновляется при каждом merge через `/update-docs`:
- Уровень 1 или 2 → инкрементировать N
- Уровень 3 → записать текущую дату, сбросить N = 0

---

## CI-интеграция

Playwright запускается в отдельном CI job после основного `quality` job.

- **STANDARD:** E2E job информационный — не блокирует merge
- **ENTERPRISE:** E2E job обязателен — merge только при зелёном CI

Шаблон job находится в `.claude/blueprints/CLAUDE_MD_BLUEPRINT.md` → «E2E job шаблон».

---

## Обработка падений

Если E2E упал:
1. Читай вывод Playwright — он указывает конкретный шаг и скриншот
2. Определи: сломан тест (изменился UI) или сломана механика
3. Если сломана механика — исправь до merge, не пропускай
4. Если изменился UI намеренно — обнови тест, задокументируй изменение

**Никогда не мёржить с падающими E2E-тестами.**

---

## Нарастание тестов по этапам

Тесты накапливаются: Stage N пишет свои + прогоняет все предыдущие при full scope.
Если Stage N сломал сценарий из Stage N-1 — full scope E2E поймает, merge заблокирован.

---

## Антипаттерны

| Запрещено | Используй вместо |
|---|---|
| `page.waitForTimeout(3000)` | `waitForSelector`, `waitForURL`, `waitForResponse` |
| Хардкод credentials в тестах | Переменные окружения (`.env.test`) |
| Зависимость тестов друг от друга | Каждый тест независим, собственный setup |
| Тестировать React state | Тестировать только UI-поведение |
| Откладывать E2E «на потом» | Тест — в том же PR, что и механика |

---

## Перекрёстные ссылки

- Tier-матрица тестов: `rules/common/testing.md`
- Триггеры активации: `workflow/TRIGGER_MAP.md` → «Триггеры активации skills»
- CI шаблон: `blueprints/CLAUDE_MD_BLUEPRINT.md` → «E2E job шаблон»
- Команды: `/e2e` (написать тест для текущей механики), `/e2e-full` (прогнать все тесты)
- Счётчик: `PROJECT_CONTEXT.md` проекта → «Текущий статус»
