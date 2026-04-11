# Context Management и Performance

> Этот файл НЕ про экономию токенов. На Max Plan токены не тарифицируются.
> Этот файл про качество контекста — чистоту рабочей памяти Claude Code,
> предотвращение деградации качества ответов и рациональное использование usage limits.

---

## Настройки Claude Code

```json
// User-level: ~/.claude.json (Windows: %USERPROFILE%\.claude.json)
// Project-level: .claude/settings.local.json
{
  "model": "sonnet",
  "env": {
    "MAX_THINKING_TOKENS": "10000",
    "CLAUDE_CODE_SUBAGENT_MODEL": "haiku",
    "ENABLE_TOOL_SEARCH": "auto:5",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50",
    "COMPACT_THRESHOLD": "50"
  }
}
```

| Настройка | Значение | Что делает |
|---|---|---|
| `model` | `sonnet` | Дефолт сессии. Opus используется только для planner agent. Обновлять раз в квартал при выходе новой версии |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | `50` | Autocompact при 50% контекста. Раньше и чаще = свежее контекст |
| `COMPACT_THRESHOLD` | `50` | suggest-compact.js предупреждает после 50 tool calls |

**MAX_THINKING_TOKENS ограничен до 10000.** Установлен в settings.local.json для предотвращения аномальных выбросов thinking-токенов. Для большинства задач агенты используют меньше — cap не снижает качество. При необходимости полного бюджета: `export MAX_THINKING_TOKENS=31999` на сессию.

---

## Зачем управлять контекстом на Max Plan

Контекстное окно — рабочая память Claude Code. При переполнении мусором (устаревшие рассуждения, ненужные файлы, промежуточные debug-выводы):
- Claude Code теряет фокус и путает инструкции
- Качество ответов деградирует
- Ранние инструкции из CLAUDE.md и rules «размываются»

Управление контекстом — это не экономия денег. Это поддержание точности и качества.

**Usage limits** — второй фактор. На Max Plan есть лимит сообщений в единицу времени. Каждый лишний вызов агента или ненужный /code-review — это сообщения из лимита. TRIGGER_MAP и LEARNED_OVERRIDES помогают не тратить лимит на бесполезные активации.

---

## Мониторинг контекста

### Команда /context
Claude Code периодически проверяет состояние контекста командой `/context`. Рекомендуется проверять:
- После каждых ~20 tool calls
- По предупреждению suggest-compact.js
- При ощущении потери фокуса или повторяющихся ошибок

### Таблица решений по ctx:%

| ctx:% | Действие |
|---|---|
| 0–40% | Работать нормально |
| 40–60% | Проверить: есть ли логическая граница? Если да — `/compact` с summary. Если mid-implementation — продолжать |
| 60–75% | Обязательно `/compact` при ближайшей логической границе. Pre-compact hook сохранит state автоматически |
| 75%+ | Немедленно `/compact` даже mid-implementation. Pre-compact hook сохранит state автоматически |

---

## Три слоя управления контекстом

### Слой 1 — Предотвращение мусора (до попадания в контекст)
- Skills активируются по триггеру, не всегда — неактивированные не загружаются
- LEARNED_OVERRIDES отсекает ненужные активации agents/skills
- TRIGGER_MAP определяет минимально необходимый набор

### Слой 2 — Мониторинг заполнения
**suggest-compact.js** (hook, PreToolUse на Edit/Write):
- Считает tool calls в сессии
- При 50 calls — предупреждение: «consider /compact if transitioning phases»
- Далее каждые 25 calls — повторное предупреждение

**Команда /context** — точный процент заполнения. Использовать по таблице решений выше.

### Слой 3 — Автоматическое обнуление с memory persistence

```
Работа в сессии
  ↓
Контекст заполняется до 50%
  ↓
[АВТОМАТИЧЕСКИ] pre-compact.js сохраняет state в .claude/sessions/
  ↓
[АВТОМАТИЧЕСКИ] Claude Code выполняет compaction (сжатие контекста)
  ↓
Продолжение работы со сжатым контекстом
  ↓
При завершении сессии:
  ↓
[АВТОМАТИЧЕСКИ] session-end.js сохраняет финальное состояние:
  - User messages (задачи)
  - Tools used
  - Files modified
  - Project, branch, worktree
  ↓
...следующая сессия...
  ↓
[АВТОМАТИЧЕСКИ] session-start.js загружает последний session-файл (до 7 дней)
  ↓
Claude Code знает, на чём остановился
```

---

## Что сохраняется при compaction

| Сохраняется | Теряется |
|---|---|
| CLAUDE.md и rules (перечитываются) | Промежуточные рассуждения |
| TodoWrite task list | Содержимое ранее прочитанных файлов |
| Git state (commits, ветки) | Многоступенчатый контекст диалога |
| Session file в .claude/sessions/ | Нюансы, высказанные устно |

Claude Code может перечитать файлы при необходимости. Критичные решения и контекст фиксируются в session file автоматически.

---

## Модель

**Дефолт сессии: Sonnet** (установлен в settings.local.json). Достаточен для 80% задач.

**Opus** используется только для planner agent (архитектурные решения). Переключить вручную: `/model opus`.

**Haiku** используется для субагентных задач (CLAUDE_CODE_SUBAGENT_MODEL=haiku в settings.local.json) — быстрые вспомогательные операции (поиск, парсинг, чтение файлов).

Подробнее: `workflow/MODEL_ROUTING_GUIDE.md`

---

## Правила ручной compaction

**Compact ПОСЛЕ:**
- Исследование завершено, переход к реализации
- Milestone завершён, переход к следующему
- Debugging закончен, переход к feature work
- Неудачный подход отброшен, переход к новому

**НЕ compact:**
- Mid-implementation (потеря переменных, путей, partial state)
- Между тесно связанными шагами одной задачи

**Совет:** `/compact` с summary: `/compact Focus on implementing auth middleware next`

---

## Context Window Management

- Не более 10 MCP одновременно (качество контекста, не стоимость)
- Не более 80 tools активных
- `/clear` между несвязанными задачами (мгновенный сброс)
- `/cost` для мониторинга usage limits
- MCP-серверы (GitHub, Supabase) — допустимы на Max Plan. Overhead 0.2–0.3% при 1M контексте. Отключать через `disabledMcpServers` только если проект не использует соответствующий сервис
