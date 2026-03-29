# Промпт для Claude Code — MCP-переход

Выполни следующие действия для перехода с CLI на MCP для GitHub и Supabase.

---

## 1. Установи GitHub MCP

Добавь в глобальный файл `~/.claude.json` (НЕ settings.json, а именно .claude.json) в секцию `mcpServers`:

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "PLACEHOLDER_NEEDS_REAL_TOKEN"
      }
    }
  }
}
```

Если файл `~/.claude.json` уже существует и содержит другие настройки — сохрани их, добавь `mcpServers` рядом. Если секция `mcpServers` уже есть — добавь `github` в неё, не перезаписывая существующие серверы.

**ВАЖНО:** Значение `GITHUB_PERSONAL_ACCESS_TOKEN` оставь как `PLACEHOLDER_NEEDS_REAL_TOKEN` — пользователь заменит его сам. НЕ пытайся создать токен.

---

## 2. Установи Supabase MCP

Добавь в тот же файл `~/.claude.json` в секцию `mcpServers`:

```json
{
  "supabase": {
    "type": "http",
    "url": "https://mcp.supabase.com/mcp"
  }
}
```

Supabase MCP установлен БЕЗ project_ref — это даёт доступ ко всем проектам в аккаунте. При первом использовании Claude Code откроет браузер для авторизации в Supabase.

---

## 3. Обнови `.claude/workflow/PLUGINS_AND_TOOLS.md`

### 3a. В таблице «Принцип разделения» замени строку CLI:

Было:
```
| **CLI** | Замена MCP для освобождения контекстного окна | — | Через bash/scripts |
```

Стало:
```
| **CLI** | Альтернатива MCP для проектов без подключённых сервисов | — | Через bash/scripts |
```

### 3b. Замени всю секцию «MCP vs CLI» (от заголовка `## MCP vs CLI` до конца секции включая правило про 10 MCP):

Стало:
```
## MCP-серверы

На Max Plan с Opus (1M контекст) overhead от MCP descriptions составляет 0.2–0.3% контекстного окна — незначительно. MCP предпочтительнее CLI: структурированные данные, меньше парсинга, меньше ошибок.

| Сервис | Тип | Конфигурация | Scope |
|---|---|---|---|
| GitHub | MCP (глобальный) | `~/.claude.json` → mcpServers → github | Все репозитории |
| Supabase | MCP (глобальный) | `~/.claude.json` → mcpServers → supabase | Все проекты (без project_ref) |
| Context7 | Plugin | `/plugin install context7@claude-plugins-official` | Глобальный |
| Vercel | Не нужен | auto-deploy через git push | — |
| Playwright | MCP (по необходимости) | Добавить в проектный .claude.json | ENTERPRISE tier |

**Правила:**
- Не более 10 MCP одновременно (качество контекста)
- Не более 80 tools активных
- Неиспользуемые в конкретном проекте — отключать через `disabledMcpServers` в проектном `.claude/settings.json`
- При 1M контексте (Opus Max Plan) 3–4 MCP — абсолютно нормально
```

---

## 4. Обнови `.claude/workflow/SKILLS_AND_AGENTS.md`

### 4a. Замени всю секцию «Что НЕ использовать как MCP» (от заголовка до конца секции):

Стало:
```
## MCP-серверы (установлены глобально)

| MCP | Scope | Назначение |
|---|---|---|
| GitHub | Все репозитории | PR management, issues, code search, review |
| Supabase | Все проекты | Интроспекция схемы, SQL, auth, storage, migrations |

На Max Plan с 1M контекстом overhead от MCP descriptions незначителен (0.2–0.3%). MCP предпочтительнее CLI — структурированные данные, богатый API, меньше ошибок парсинга.
```

---

## 5. Обнови `.claude/workflow/CONTEXT_MANAGEMENT.md`

В конце файла, в секции «Context Window Management», после строки про `/cost` добавь новую строку:

```
- MCP-серверы (GitHub, Supabase) — допустимы на Max Plan. Overhead 0.2–0.3% при 1M контексте. Отключать через `disabledMcpServers` только если проект не использует соответствующий сервис
```

---

## 6. Закоммить и запушь

Сообщение коммита: `feat: transition from CLI to MCP for GitHub and Supabase, update documentation`

---

## После выполнения — напомни пользователю:

1. **GitHub MCP:** Нужно заменить `PLACEHOLDER_NEEDS_REAL_TOKEN` в `~/.claude.json` на реальный GitHub Personal Access Token. Создать токен: GitHub → Settings → Developer settings → Personal access tokens → Generate new token. Scopes: `repo`, `read:org`, `read:user`.

2. **Supabase MCP:** При первом обращении к Supabase через MCP — Claude Code откроет браузер для авторизации. Нужно будет залогиниться в Supabase и дать доступ.

3. **Проверка:** После настройки токена — перезапустить Claude Code и попросить: «Покажи список моих GitHub репозиториев через MCP» и «Покажи список моих Supabase проектов через MCP».
