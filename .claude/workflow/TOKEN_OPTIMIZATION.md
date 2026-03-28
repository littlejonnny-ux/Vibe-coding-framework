# Token Optimization и Context Management

---

## Настройки Claude Code

```json
// ~/.claude/settings.json
{
  "model": "sonnet",
  "env": {
    "MAX_THINKING_TOKENS": "10000",
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50",
    "COMPACT_THRESHOLD": "50"
  }
}
```

| Настройка | Значение | Что делает |
|---|---|---|
| `model` | `sonnet` | Дефолтная модель для 80–90% задач. Обновлять раз в квартал |
| `MAX_THINKING_TOKENS` | `10000` | Ограничение hidden thinking. Дефолт 31999 — избыточен для большинства задач |
| `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` | `50` | Autocompact при 50% контекста вместо дефолтных 95%. Раньше и чаще = свежее контекст |
| `COMPACT_THRESHOLD` | `50` | suggest-compact.js предупреждает после 50 tool calls |

---

## Три слоя управления контекстом

### Слой 1 — Предотвращение мусора

**До попадания в контекст:**
- 5 plugins вместо 119 → экономия ~10000 токенов на описаниях
- CLI вместо MCP (gh, db.js) → экономия ~6500 токенов
- Skills активируются по триггеру, не всегда → неактивированные не загружаются
- LEARNED_OVERRIDES отсекает ненужные активации

### Слой 2 — Мониторинг заполнения

**suggest-compact.js** (hook, PreToolUse на Edit/Write):
- Считает tool calls в сессии
- При 50 calls → предупреждение: «consider /compact if transitioning phases»
- Далее каждые 25 calls → повторное предупреждение

### Слой 3 — Автоматическое обнуление с memory persistence

**Цикл работает автоматически:**

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

**Что сохраняется при compaction:**
- CLAUDE.md и rules (перечитываются)
- TodoWrite task list
- Git state (commits, ветки)
- Session file в .claude/sessions/

**Что теряется:**
- Промежуточные рассуждения
- Содержимое ранее прочитанных файлов (Claude Code перечитает при необходимости)
- Многоступенчатый контекст диалога
- Нюансы, высказанные устно, но не зафиксированные в файлах

---

## Переключение модели

Дефолт — Sonnet (указан в settings.json). Переключение на более мощную модель:

| Задача | Модель | Когда вернуться |
|---|---|---|
| Стандартное кодирование, UI, фиксы | Sonnet (дефолт) | — |
| Сложная архитектура, debugging на стыке систем | `/model` → мощнейшая доступная | После завершения сложной задачи |
| Планирование крупных фич (planner agent) | Opus (указан в agent файле) | Автоматически |
| Security analysis | Sonnet (достаточно) | — |

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

**Критические правила:**
- Не более 10 MCP одновременно
- Не более 80 tools активных
- Неиспользуемые MCP — отключать в `disabledMcpServers`
- Не более 5–6 plugins одновременно
- `/clear` между несвязанными задачами (бесплатно, мгновенный сброс)
- `/cost` для мониторинга расхода во время сессии
