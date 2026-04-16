# Learned Patterns

> Этот файл заполняется автоматически после каждого merge (шаг 5 ретроспективы).
> Claude Code извлекает нетривиальные технические паттерны, обнаруженные в ходе сессии,
> и записывает их сюда для повторного использования в будущих сессиях.
>
> Claude Code читает этот файл при получении задачи (после TRIGGER_MAP, вместе с LEARNED_OVERRIDES).
> Если текущая задача затрагивает область, для которой есть паттерн — применяет его.

---

## Паттерны

### [2026-04-16] Backport из KPI-System-2

---

### Next.js 16: middleware.ts переименован в proxy.ts
- **Область:** Next.js 16 (breaking change)
- **Паттерн:** Файл `middleware.ts` → `proxy.ts`; экспортируемая функция — `export async function proxy(...)`, не `export default function middleware(...)`
- **Почему нетривиально:** Все туториалы и официальная документация до 2026 используют `middleware.ts`. Next.js 16 сломал это соглашение. При создании нового проекта на Next.js 16 — создавать `src/proxy.ts`, иначе middleware не применится.
- **Пример:**
  ```ts
  // src/proxy.ts — Next.js 16
  export async function proxy(request: NextRequest) {
    return updateSession(request);
  }
  export const config = { matcher: ["/((?!_next/static|...).*)" ] };
  ```

---

### Supabase API routes: двойной клиент (anon verify + service_role fetch)
- **Область:** Supabase SSR + Next.js App Router API routes
- **Паттерн:** В API route нужны ДВА клиента: anon-key client для верификации JWT из cookies, service_role client для получения профиля пользователя в обход RLS.
- **Почему нетривиально:** Один клиент не справляется с обоими: anon-client не может читать чужой профиль (RLS блокирует); service_role-client не имеет доступа к куки сессии. Комбинация — единственный рабочий паттерн.
- **Пример:**
  ```ts
  // src/lib/api-auth.ts
  // Шаг 1: verify JWT через anon-client (читает cookies)
  const anonClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, { cookies });
  const { data: { user } } = await anonClient.auth.getUser();
  // Шаг 2: fetch profile через service_role (обходит RLS)
  const serviceClient = createClient(); // service_role
  const { data: profile } = await serviceClient.from("users").select("*").eq("auth_id", user.id).single();
  ```

---

### Supabase: GENERATED ALWAYS колонки в TypeScript типах
- **Область:** Supabase + TypeScript codegen
- **Паттерн:** Колонки `GENERATED ALWAYS AS IDENTITY` (или computed) в автогенерированных типах Supabase появляются только в `Row`, не в `Insert`/`Update`. При создании ViewModel-типов их нужно явно исключать из мутирующих форм.
- **Почему нетривиально:** TypeScript компилятор не подскажет — тип совместим. Ошибка появится только в runtime при попытке вставить значение в GENERATED ALWAYS колонку.
- **Пример:** `Insert` типы не содержат GENERATED колонки, `Row` — содержат. Используй `Tables<'your_table'>['Insert']` для мутаций, не `Tables<'your_table'>['Row']`.

---

### Изоляция бизнес-логики в одном модуле
- **Область:** Архитектурный паттерн (расчёты, финансовая/доменная логика)
- **Паттерн:** Все функции расчёта живут в одном модуле (`src/lib/calculations.ts` или аналог). Нет расчётов в компонентах, хуках или API routes. Функции принимают минимальные интерфейсы, возвращают новые значения (иммутабельно). Unit-тесты покрывают все evaluation methods без моков UI.
- **Почему нетривиально:** Удобно класть логику рядом с компонентом, но при этом теряется возможность unit-тестировать её изолированно и переиспользовать в API routes. Единый модуль = один источник истины + полное покрытие тестами без моков React.

---

### Zod v4 + @hookform/resolvers: совместимость без изменений
- **Область:** Zod v4 + react-hook-form v7
- **Паттерн:** Zod v4 (`zod@^4.x`) — major rewrite, но `import { z } from "zod"` и базовый API (`z.object`, `z.string().email()`, `z.infer<>`) остались совместимы. `zodResolver` из `@hookform/resolvers@^5.x` работает с Zod v4 без изменений.
- **Почему нетривиально:** Большинство migration guides пугают breaking changes. В реальности для стандартных форм (string, email, min, required) переход с Zod v3 → v4 требует только обновления пакета. Формат ошибок изменился, но `formState.errors` через zodResolver абстрагирует это.
