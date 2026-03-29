# VIBE CODING WORKFLOW
## Универсальный операционный стандарт вайбкодинга
### Версия 2.0

---

## Назначение

Этот документ — координирующий центр автоматизированного vibe-coding процесса. Он определяет:
- Какой уровень сложности (тир) применить к проекту
- Какие механизмы активировать, а какие пропустить
- Как управлять контекстным окном и токенами
- Как накапливать и применять опыт

Claude Code читает этот документ в начале каждой сессии. Пользователь определяет только ЧТО делать. Документ определяет КАК.

---

## Структура framework

```
.claude/
├── VIBE_CODING_WORKFLOW.md          ← ТЫ ЗДЕСЬ (конституция)
├── workflow/                        # Главы конституции
│   ├── SKILLS_AND_AGENTS.md         # Tier-матрицы, триггеры активации
│   ├── TRIGGER_MAP.md               # Карта триггеров + «когда НЕ активировать»
│   ├── CYCLE.md                     # Полный цикл задачи по тирам
│   ├── RETROSPECTIVE.md             # Post-merge ретроспектива
│   ├── LEARNED_OVERRIDES.md         # Накопленные маркеры (растёт)
│   ├── CONTEXT_MANAGEMENT.md         # Context quality, compaction, usage limits
│   ├── ARCHITECTURE_PRINCIPLES.md   # 11 принципов кода (frontend + backend)
│   └── PLUGINS_AND_TOOLS.md         # Plugins, skill-файлы, MCP, commands, hooks
├── blueprints/                      # Шаблоны-генераторы
│   ├── CLAUDE_MD_BLUEPRINT.md       # Генератор CLAUDE.md проекта
│   └── TECH_SPEC_BLUEPRINT.md       # Генератор ТЗ проекта
├── contexts/                        # Режимы работы
│   ├── dev.md                       # Разработка
│   ├── review.md                    # Code review
│   └── research.md                  # Исследование
├── rules/                           # Постоянные правила
│   ├── common/                      # Универсальные (8 файлов)
│   └── typescript/                  # TypeScript/React (3 файла)
├── skills/                          # Skill-файлы (4 skill)
├── agents/                          # Agent-файлы (5 agents)
├── hooks/                           # Hooks + JS-скрипты
└── sessions/                        # Memory persistence (автоматически)
```

---

## Выбор тира

### Таблица критериев

| Критерий | LITE | STANDARD | ENTERPRISE |
|---|---|---|---|
| Пользователей | <10 | 10–500 | 500+ или regulated |
| Файлов в проекте | <30 | 30–200 | 200+ |
| Финансовые расчёты | Нет | Возможно | Да |
| Данные пользователей (PII/salary) | Нет | Да | Да |
| Масштабирование планируется | Нет | Да | Да |
| Команда разработки | 1 (vibe-coding) | 1–2 | 2+ |
| Срок жизни проекта | Недели | Месяцы | Годы |
| Допустимость регрессий | Высокая | Средняя | Низкая |

**Правило:** Если ≥3 критерия попадают в более высокий тир — использовать более высокий тир.

### LITE — минимальный процесс
Скрипты, прототипы, pet-projects. Расход токенов: базовый (1×).

### STANDARD — рабочий процесс
Production-приложения, внутренние инструменты, MVP с планами роста. Расход токенов: умеренный (2–3×).

### ENTERPRISE — максимальный процесс
Критические системы, финансовые данные, regulated environments. Расход токенов: высокий (4–6×).

---

## Порядок работы Claude Code в каждой сессии

```
1. Читает CLAUDE.md проекта → ЧТО за проект, КАКИЕ правила
   ↓
2. Читает VIBE_CODING_WORKFLOW.md → КАК работать, КАКОЙ тир
   ↓
3. Получает задачу от пользователя
   ↓
4. Сопоставляет с TRIGGER_MAP.md → какие skills/agents активировать
   ↓
5. Проверяет LEARNED_OVERRIDES.md → есть ли маркеры,
   переопределяющие стандартные триггеры
   ↓
6. Активирует минимально необходимый набор механизмов
   ↓
7. Выполняет задачу по циклу тира (CYCLE.md)
   ↓
8. Post-merge retrospective (RETROSPECTIVE.md)
   ↓
9. Обновляет LEARNED_OVERRIDES.md
```

---

## Ссылки на главы

| Глава | Файл | Читать когда |
|---|---|---|
| Skills, Agents, Commands | `workflow/SKILLS_AND_AGENTS.md` | При определении набора инструментов |
| Карта триггеров | `workflow/TRIGGER_MAP.md` | При получении задачи |
| Цикл задачи | `workflow/CYCLE.md` | При выполнении задачи |
| Ретроспектива | `workflow/RETROSPECTIVE.md` | После merge |
| Накопленный опыт | `workflow/LEARNED_OVERRIDES.md` | При определении набора инструментов |
| Контекст и performance | `workflow/CONTEXT_MANAGEMENT.md` | При старте сессии и при предупреждениях о контексте |
| Архитектура кода | `workflow/ARCHITECTURE_PRINCIPLES.md` | При написании кода |
| Plugins и инструменты | `workflow/PLUGINS_AND_TOOLS.md` | При инициализации проекта |
| Blueprint CLAUDE.md | `blueprints/CLAUDE_MD_BLUEPRINT.md` | При создании нового проекта |
| Blueprint ТЗ | `blueprints/TECH_SPEC_BLUEPRINT.md` | При создании нового проекта |

---

## Обновление документа

Этот документ обновляется только по явному решению пользователя.

Автоматически обновляемые файлы:
- `workflow/LEARNED_OVERRIDES.md` — после каждого post-merge retrospective
- Проектные живые документы (PROJECT_CONTEXT.md, UI_PATTERNS.md, CODE_LEARNINGS.md) — после каждого merge через /update-docs

---

## Регламент обновления модели

Раз в квартал пользователь проверяет актуальность названия модели в `~/.claude/settings.json`. Если Anthropic выпустила новую версию — обновить значение поля `"model"`.
