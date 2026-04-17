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

---

### Next.js App Router: серверный role guard через headers() + ROUTE_PERMISSIONS
- **Область:** Next.js 16 App Router + Supabase SSR
- **Паттерн:** Серверный `layout.tsx` читает `x-pathname` из `headers()` (установлен `proxy.ts`), сверяет с `ROUTE_PERMISSIONS: Record<string, Role[]>`, делает `redirect('/dashboard')` при нарушении. Логика: перебор prefix-ключей + `pathname.startsWith(prefix + '/')`.
- **Почему нетривиально:** В App Router нельзя делать redirect в middleware после проверки session (middleware не имеет доступа к Supabase session cookie при edge runtime). Layout.tsx — правильное место для role guard, потому что здесь уже есть `getUser()` и профиль пользователя.
- **Пример:**
  ```ts
  // src/app/(dashboard)/layout.tsx
  const pathname = (await headers()).get("x-pathname") ?? "/";
  if (!isAllowed(pathname, profile.system_role)) redirect("/dashboard");
  ```

---

### Recharts в Next.js App Router: компонент обязан быть "use client"
- **Область:** Recharts + Next.js App Router
- **Паттерн:** Recharts (`BarChart`, `PieChart`, `ResponsiveContainer`) использует `window`/`document` при импорте — они не SSR-совместимы. Компонент с recharts обязан иметь `"use client"` директиву, иначе сборка падает с `ReferenceError: window is not defined`.
- **Почему нетривиально:** Recharts документация не упоминает это явно, а Next.js не всегда даёт понятную ошибку (иногда падает при `next build`, не при `next dev`). Данные передаются как props из серверного родителя.

---

### RHF useFieldArray для смежных диапазонов (contiguous ranges)
- **Область:** react-hook-form v7 + динамические строки с граничными условиями
- **Паттерн:** `useFieldArray` для динамических строк (диапазоны, точки). Смежные диапазоны должны быть непрерывными (max предыдущего = min следующего) — поддерживается утилитой, вызываемой при `onChange` каждой строки, а не через Zod refinement.
- **Почему нетривиально:** Попытка сделать contiguous-validation через Zod `superRefine` на массиве приводит к сложным ошибкам и плохому UX. Вычислять bounds в `onChange` — правильный подход: данные всегда консистентны без лишних validation errors. Zod не умеет удобно делать cross-field array validation.
- **Пример:** При изменении строки `i` вызвать `calcBounds(fields, i)` и обновить min/max соседних строк через `setValue`.

---

### Supabase RPC для атомарных операций (несколько UPDATE в одной транзакции)
- **Область:** Supabase + PostgreSQL RPC
- **Паттерн:** Бизнес-операции, требующие нескольких UPDATE в одной транзакции, выносятся в PostgreSQL function и вызываются через `.rpc('function_name', { params })`. Один round-trip, атомарность гарантирована на уровне БД.
- **Почему нетривиально:** Альтернатива — несколько последовательных `.update()` из API route — не атомарна: при сбое на втором запросе данные окажутся в inconsistent state. RPC избегает этого без необходимости писать транзакционную логику на TypeScript.
- **Пример:**
  ```ts
  // API route
  await supabase.rpc('approve_item', { item_id, approved_by });
  // PostgreSQL function делает UPDATE table_a + UPDATE table_b в одной транзакции
  ```
