Run the full E2E test suite (Playwright).

## Steps

1. Ensure the app is running, or set `PLAYWRIGHT_BASE_URL` for CI mode
2. Run all E2E tests:
   ```bash
   npx playwright test
   ```
3. If failures — read Playwright output, identify: broken mechanic or outdated test
4. **Broken mechanic** → fix it before merge
5. **Intentional UI change** → update the test, document the change
6. After a successful full run — update `PROJECT_CONTEXT.md`:
   ```
   **E2E full scope:** последний — [today], merge без full scope с тех пор: 0
   ```

## Rules

- Never merge with failing E2E tests
- `merges_without_full_e2e` counter resets to 0 after a successful full run
- Full scope automatically triggers when the counter ≥ 5, or when `/e2e-full` is invoked explicitly

See full mechanics: `.claude/skills/e2e-testing/SKILL.md`
