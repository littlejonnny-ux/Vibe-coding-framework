# Database Workflow

## Source of Truth — DB Schema, Not Documentation

NEVER generate SQL from documentation or memory. Before any schema change — read the actual schema from the database.

## Mandatory Schema Change Pipeline

Any schema change (ALTER, CREATE, DROP) must follow ALL steps. Skipping is prohibited.

1. **Introspection** — Read current schema from the database
2. **Data dependency check** — SELECT COUNT before destructive operations. If > 0 — migrate data first
3. **Code dependency check** — grep across codebase for references to the changed object
4. **Safety assessment** — If destructive (DROP COLUMN, ALTER TYPE, DELETE):
   - If dependent data or code exists — migrate data and update code FIRST
   - Only then execute the destructive operation
   - NEVER drop a column/table that code references
5. **Execute SQL**
6. **Verification** — Read schema again, confirm result matches expectation
7. **Update code** — Adapt code to new schema (if needed), in the SAME commit

## Automatic Safeguards (mandatory, no exceptions)

- Before DROP/DELETE — always SELECT COUNT dependent records. If > 0 — migrate data first
- Before ALTER COLUMN TYPE — verify compatibility with existing data
- Before any change — grep codebase. If code references the changed object — update code in the SAME commit
- After execution — mandatory verification via schema re-read
- If verification doesn't match expectation — STOP and report to user

## Order: Database First, Then Code

1. Execute SQL in database
2. Verify result
3. Update/write code for new schema
4. Commit code

Code expecting a non-existent schema must NEVER reach production.

## Absolute Prohibitions

- **DROP TABLE** — prohibited. Use soft delete (is_active = false) or rename instead
- **TRUNCATE** — prohibited
- **DROP COLUMN** with dependent data without prior migration — prohibited
- **SQL based on documentation** instead of actual schema — prohibited
- **Direct auth schema changes** — prohibited (use Auth API or Dashboard only)

## If Something Goes Wrong

If SQL executed but verification shows unexpected result — STOP and report to user. Do not attempt to fix independently. This is the only case requiring user intervention.
