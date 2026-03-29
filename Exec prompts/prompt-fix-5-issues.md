# Промпт для Claude Code — исправление 5 проблем в framework

Выполни следующие 5 исправлений в репозитории. Все исправления связаны с переходом на Max Plan (подписка, не API) — убираем финансовую мотивацию, заменяем на мотивацию качества контекста.

---

## Исправление 1 — Agents: переключить с Sonnet на Opus

В файлах `.claude/agents/` измени поле `model:` в YAML-заголовке:

**`.claude/agents/code-reviewer.md`** — замени `model: sonnet` на `model: opus`

**`.claude/agents/security-reviewer.md`** — замени `model: sonnet` на `model: opus`

**`.claude/agents/build-error-resolver.md`** — замени `model: sonnet` на `model: opus`

**`.claude/agents/database-reviewer.md`** — замени `model: sonnet` на `model: opus`

**`.claude/agents/planner.md`** — оставить `model: opus` (уже правильно)

---

## Исправление 2 — PLUGINS_AND_TOOLS.md: убрать финансовую мотивацию

В файле `.claude/workflow/PLUGINS_AND_TOOLS.md`:

**2a.** В таблице «Принцип разделения» строка с CLI:

Было:
```
| **CLI** | Замена MCP для экономии токенов | — | Через bash/scripts |
```

Стало:
```
| **CLI** | Замена MCP для освобождения контекстного окна | — | Через bash/scripts |
```

**2b.** В таблице «MCP vs CLI» замени колонку «Рекомендация»:

Было:
```
| GitHub | @modelcontextprotocol/server-github | `gh` CLI | **CLI** — экономия ~2000 токенов |
| Supabase | @supabase/mcp-server-supabase | проектные скрипты db.js | **CLI** — экономия ~3000 токенов |
| Vercel | mcp.vercel.com | auto-deploy через git push | **Не нужен** — push → auto-deploy |
```

Стало:
```
| GitHub | @modelcontextprotocol/server-github | `gh` CLI | **CLI** — освобождает контекстное окно для качества |
| Supabase | @supabase/mcp-server-supabase | проектные скрипты db.js | **CLI** — освобождает контекстное окно для качества |
| Vercel | mcp.vercel.com | auto-deploy через git push | **Не нужен** — push → auto-deploy |
```

**2c.** Строку:
```
**Правило:** Не более 5–6 plugins одновременно. Каждый потребляет токены на descriptions.
```

Замени на:
```
**Правило:** Не более 5–6 plugins одновременно. Descriptions каждого plugin занимают место в контекстном окне, влияя на качество ответов.
```

**2d.** В таблице Agent-файлов замени модели:

Было:
```
| planner | `.claude/agents/planner.md` | opus | STD+ |
| code-reviewer | `.claude/agents/code-reviewer.md` | sonnet | STD+ |
| security-reviewer | `.claude/agents/security-reviewer.md` | sonnet | STD+ |
| build-error-resolver | `.claude/agents/build-error-resolver.md` | sonnet | ALL |
| database-reviewer | `.claude/agents/database-reviewer.md` | sonnet | STD+ |
```

Стало:
```
| planner | `.claude/agents/planner.md` | opus | STD+ |
| code-reviewer | `.claude/agents/code-reviewer.md` | opus | STD+ |
| security-reviewer | `.claude/agents/security-reviewer.md` | opus | STD+ |
| build-error-resolver | `.claude/agents/build-error-resolver.md` | opus | ALL |
| database-reviewer | `.claude/agents/database-reviewer.md` | opus | STD+ |
```

---

## Исправление 3 — TRIGGER_MAP.md: убрать «экономия токенов»

В файле `.claude/workflow/TRIGGER_MAP.md`:

Было:
```
## Правила «когда НЕ активировать» (экономия токенов)
```

Стало:
```
## Правила «когда НЕ активировать» (сохранение качества контекста и usage limits)
```

---

## Исправление 4 — SKILLS_AND_AGENTS.md: переформулировать через качество

В файле `.claude/workflow/SKILLS_AND_AGENTS.md`:

**4a.** Было:
```
Skills загружаются в контекст только при активации по триггеру. Неактивированные skills не потребляют токены (кроме ~50 токенов на описание в YAML-заголовке).
```

Стало:
```
Skills загружаются в контекст только при активации по триггеру. Неактивированные skills не занимают место в контекстном окне (кроме минимального описания в YAML-заголовке).
```

**4b.** Было:
```
Agents — это отдельные экземпляры Claude Code с ограниченным scope. Каждый вызов агента расходует сообщения из usage limit. Вызывать только по триггеру.
```

Стало:
```
Agents — это отдельные экземпляры Claude Code с ограниченным scope. Каждый вызов агента расходует сообщения из usage limit (Max Plan). Вызывать только по триггеру для рационального использования лимита.
```

**4c.** Было:
```
Plugins устанавливаются один раз. Их descriptions потребляют токены постоянно. Не устанавливать больше 5–6 одновременно.
```

Стало:
```
Plugins устанавливаются один раз. Их descriptions занимают место в контекстном окне при каждом запросе, влияя на качество ответов. Не более 5–6 одновременно для поддержания качества контекста.
```

**4d.** В таблице Agents замени модели (аналогично исправлению 2d):

Было:
```
| 2 | code-reviewer | ECC | sonnet | STD+ | Quality + security review с confidence-based filtering (>80%) |
| 3 | security-reviewer | ECC | sonnet | STD+ | OWASP Top 10, secrets, input validation, CSRF, XSS |
| 4 | build-error-resolver | ECC | sonnet | ALL | Исправление ошибок сборки: npm run build failed |
| 5 | database-reviewer | ECC | sonnet | STD+ | Supabase queries, RLS, миграции, N+1, unbounded queries |
```

Стало:
```
| 2 | code-reviewer | ECC | opus | STD+ | Quality + security review с confidence-based filtering (>80%) |
| 3 | security-reviewer | ECC | opus | STD+ | OWASP Top 10, secrets, input validation, CSRF, XSS |
| 4 | build-error-resolver | ECC | opus | ALL | Исправление ошибок сборки: npm run build failed |
| 5 | database-reviewer | ECC | opus | STD+ | Supabase queries, RLS, миграции, N+1, unbounded queries |
```

**4e.** В таблице «Что НЕ использовать как MCP»:

Было:
```
| Вместо MCP | Используем | Экономия |
|---|---|---|
| GitHub MCP | `gh` CLI | ~2000 токенов |
| Supabase MCP | проектные скрипты db.js / db-schema.js | ~3000 токенов |
| Vercel MCP | auto-deploy через git push | ~1500 токенов |
```

Стало:
```
| Вместо MCP | Используем | Причина |
|---|---|---|
| GitHub MCP | `gh` CLI | Освобождает контекстное окно для качества |
| Supabase MCP | проектные скрипты db.js / db-schema.js | Освобождает контекстное окно для качества |
| Vercel MCP | auto-deploy через git push | Не нужен — push запускает auto-deploy |
```

---

## Исправление 5 — Глобальные разрешения

Проверь файл `~/.claude/settings.json` (глобальный, в домашней директории пользователя, НЕ в проекте). Если в нём нет полного блока permissions — добавь. Если есть — убедись, что содержит все перечисленные разрешения.

Целевое содержимое `~/.claude/settings.json`:

```json
{
  "model": "claude-opus-4-6",
  "env": {
    "CLAUDE_AUTOCOMPACT_PCT_OVERRIDE": "50",
    "COMPACT_THRESHOLD": "50"
  },
  "permissions": {
    "allow": [
      "Read",
      "Write",
      "Edit",
      "MultiEdit",
      "Bash(git *)",
      "Bash(npm *)",
      "Bash(npx *)",
      "Bash(node *)",
      "Bash(gh *)",
      "Bash(mkdir *)",
      "Bash(cp *)",
      "Bash(mv *)",
      "Bash(rm *)",
      "Bash(cat *)",
      "Bash(ls *)",
      "Bash(find *)",
      "Bash(grep *)",
      "Bash(cd *)",
      "Bash(echo *)",
      "Bash(touch *)",
      "Bash(head *)",
      "Bash(tail *)",
      "Bash(wc *)",
      "Bash(sort *)",
      "Bash(sed *)",
      "Bash(awk *)",
      "Bash(curl *)",
      "Bash(wget *)",
      "Bash(chmod *)",
      "Bash(docker *)",
      "Bash(vercel *)",
      "Bash(pnpm *)",
      "Bash(yarn *)",
      "Bash(bun *)",
      "Bash(tsc *)",
      "Bash(eslint *)",
      "Bash(prettier *)",
      "Bash(vitest *)",
      "Bash(jest *)",
      "Bash(playwright *)"
    ],
    "deny": [
      "Bash(sudo *)",
      "Bash(ssh *)",
      "Bash(rm -rf /*)"
    ]
  }
}
```

Если файл уже существует и содержит другие настройки — сохрани их, обнови/добавь перечисленные поля. Не удаляй существующие записи в allow, только добавляй недостающие.

Покажи итоговый `~/.claude/settings.json` после изменений.

---

## Финализация

После выполнения всех 5 исправлений:
1. Закоммить изменения в проектных файлах с сообщением: `fix: switch all agents to Opus, replace token-saving language with context-quality focus`
2. Запушь в origin main
3. Покажи итоговый `~/.claude/settings.json`
