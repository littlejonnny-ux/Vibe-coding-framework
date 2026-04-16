Write an E2E test for the current UI mechanic using Playwright.

Follow the e2e-testing skill: `.claude/skills/e2e-testing/SKILL.md`

## Steps

1. Identify the user mechanic in the current PR (new page, form, CRUD, status change, role restriction, navigation)
2. Create or update the corresponding spec file in `src/__tests__/e2e/`
3. Use `auth.helper.ts` for login setup in `beforeEach`
4. Follow **Arrange / Act / Assert** structure
5. Use `data-testid` selectors — not CSS class selectors
6. Run the test:
   ```bash
   npx playwright test [spec-file]
   ```
7. Fix until green

## Rules

- Do NOT use `page.waitForTimeout()` — use `waitForSelector`, `waitForURL`, `waitForResponse`
- Do NOT hardcode credentials — use environment variables
- Each test must be independent (own setup, no shared mutable state between tests)
- Test must be in the same PR as the mechanic — do not postpone
