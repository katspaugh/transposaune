# Testing Guide for Transposaune

This project has comprehensive automated testing to enable independent development by coding agents without manual testing.

## Test Structure

```
├── src/
│   ├── main/__tests__/          # Main process unit tests
│   ├── renderer/
│   │   ├── hooks/__tests__/     # React hooks tests
│   │   └── components/__tests__/ # Component tests
├── test/                         # Test setup and utilities
├── e2e/                          # End-to-end tests
├── vitest.config.ts             # Unit test configuration
├── playwright.config.ts         # E2E test configuration
└── .eslintrc.json              # Linting rules
```

## Running Tests

### All Tests
```bash
npm test                  # Lint + Type-check + Unit tests
npm run validate          # Full validation (lint + type-check + coverage + build)
```

### Unit Tests
```bash
npm run test:unit         # Run unit tests once
npm run test:unit:watch   # Run in watch mode (for development)
npm run test:unit:ui      # Run with Vitest UI
npm run test:coverage     # Run with coverage report
```

### End-to-End Tests
```bash
npm run test:e2e          # Run E2E tests
npm run test:e2e:ui       # Run with Playwright UI
```

### Code Quality
```bash
npm run lint              # Check for linting errors
npm run lint:fix          # Auto-fix linting errors
npm run type-check        # TypeScript type checking
```

## Coverage Requirements

Minimum coverage thresholds (enforced in CI):
- **Lines**: 70%
- **Functions**: 70%
- **Branches**: 70%
- **Statements**: 70%

Coverage reports are generated in `./coverage/`

## CI/CD Pipeline

### Pull Request Checks
Every PR automatically runs:
1. **Lint** - ESLint validation
2. **Type Check** - TypeScript validation
3. **Unit Tests** - All unit tests with coverage
4. **Build** - Build on Linux, macOS, and Windows
5. **E2E Tests** - End-to-end tests on all platforms

### Agent Validation (Scheduled)
Runs every 6 hours to ensure codebase health:
- Full test suite with coverage
- Multi-platform builds
- Test result summaries

## Writing Tests

### Unit Tests (Vitest)

Example for React hooks:
```typescript
import { renderHook, act } from '@testing-library/react'
import { useTranspose } from '../useTranspose'

test('should update semitones', () => {
  const { result } = renderHook(() => useTranspose())
  act(() => {
    result.current.setSemitones(-2)
  })
  expect(result.current.semitones).toBe(-2)
})
```

Example for components:
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../Button'

test('should call onClick', async () => {
  const onClick = vi.fn()
  render(<Button onClick={onClick}>Click</Button>)
  await userEvent.click(screen.getByRole('button'))
  expect(onClick).toHaveBeenCalled()
})
```

### E2E Tests (Playwright)

```typescript
import { test, expect, _electron as electron } from '@playwright/test'

test('should launch app', async () => {
  const app = await electron.launch({
    args: ['./out/main/index.js']
  })
  const window = await app.firstWindow()
  await expect(window).toHaveTitle(/Transposaune/)
  await app.close()
})
```

## Test Utilities

### Mocks Available
- `window.electron.ipcRenderer` - Electron IPC mocked
- `OpenSheetMusicDisplay` - Music rendering mocked
- `fs`, `child_process` - Node.js modules can be mocked

### Test Setup
Global test setup in `test/setup.ts`:
- Jest DOM matchers
- Electron IPC mocks
- OpenSheetMusicDisplay mocks

## For Coding Agents

### Before Making Changes
```bash
npm test                  # Baseline test run
```

### After Making Changes
```bash
npm run validate          # Full validation
```

### Debug Test Failures
```bash
npm run test:unit:watch   # Interactive unit test debugging
npm run test:e2e:ui       # Interactive E2E test debugging
```

### Test-Driven Development
1. Write test first (red)
2. Implement feature (green)
3. Run `npm test` to verify
4. Commit with passing tests

## Common Issues

### Electron Tests Fail
- Ensure app is built: `npm run build`
- Check Audiveris is installed: `npm run setup:audiveris`

### Coverage Too Low
- Add tests for new code
- Aim for >70% coverage on all metrics

### E2E Tests Timeout
- Increase timeout in test
- Check if app launches manually: `npm run start`

## IDE Integration

### VS Code
Install recommended extensions:
- ESLint
- Vitest
- Playwright Test for VS Code

### Running Tests in IDE
- Click ▶️ button next to test functions
- View coverage inline in editor
- Debug with breakpoints

## Best Practices

1. **Test in isolation** - Mock external dependencies
2. **One assertion per test** - Keep tests focused
3. **Descriptive names** - `should [expected behavior] when [condition]`
4. **Arrange-Act-Assert** - Clear test structure
5. **No flaky tests** - Tests must be deterministic
6. **Fast tests** - Unit tests should run in milliseconds

## Continuous Improvement

Tests should be updated when:
- New features are added
- Bugs are fixed (add regression test)
- Code is refactored
- Coverage drops below threshold

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Testing Library](https://testing-library.com/)
- [ESLint Rules](https://eslint.org/docs/rules/)
