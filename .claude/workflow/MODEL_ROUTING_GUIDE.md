# Model Routing Guide

## Принципы маршрутизации моделей

Этот документ описывает логику выбора модели для каждого агента и типа задачи.
Изменён: апрель 2026 (оптимизация usage limits Max Plan).

## Таблица маршрутизации агентов

| Агент | Модель | Обоснование |
|-------|--------|-------------|
| planner | **opus** | Архитектурные решения требуют глубокого reasoning |
| code-reviewer | sonnet | Паттерн-матчинг задача, Sonnet справляется на уровне Opus в >90% случаев |
| security-reviewer | sonnet | Проверка по чеклисту OWASP, не требует extended thinking |
| build-error-resolver | sonnet | Детерминированная задача: найти ошибку → применить фикс |
| database-reviewer | sonnet | SQL-паттерны и schema review — structured reasoning, не creative |

## Субагенты (Task tool)

`CLAUDE_CODE_SUBAGENT_MODEL=haiku` — все субагентные задачи делегируются на Haiku:
- Чтение файлов и поиск по коду
- Парсинг вывода тестов
- Простые трансформации текста

## Переопределение для сессии

Если текущая задача требует Opus для конкретного агента — переопредели в начале сессии:
```
/model opus
```
После завершения задачи верниcь к Sonnet:
```
/model sonnet
```

## Лимиты thinking tokens

`MAX_THINKING_TOKENS=10000` — cap на extended thinking.
- Предотвращает аномальные выбросы (дефолт без cap: до 31,999 токенов)
- Для большинства задач агенты используют меньше 10k — cap не ограничивает качество
- Если нужен полный thinking budget: установи `MAX_THINKING_TOKENS=31999` на сессию

## MCP Tool Deferral

`ENABLE_TOOL_SEARCH=auto:5` — tool descriptions MCP-серверов загружаются on-demand,
а не на каждое сообщение. Экономия: ~5,000–15,000 токенов на каждое сообщение
в сессиях где MCP не используется активно.
