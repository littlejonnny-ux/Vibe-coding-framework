# Testing Requirements

## Test Coverage: 80%+ (STANDARD and ENTERPRISE tiers)

Test types by tier:

| Test Type | LITE | STANDARD | ENTERPRISE |
|-----------|------|----------|------------|
| Unit Tests | — | Required | Required |
| Integration Tests | — | Required | Required |
| E2E Tests | — | — | Required |

## Test-Driven Development (STANDARD and ENTERPRISE)

Preferred workflow for business logic and API routes:
1. Write test first (RED)
2. Run test — it should FAIL
3. Write minimal implementation (GREEN)
4. Run test — it should PASS
5. Refactor (IMPROVE)
6. Verify coverage (80%+)

## Troubleshooting Test Failures

1. Check test isolation
2. Verify mocks are correct
3. Fix implementation, not tests (unless tests are wrong)
