# Coding Agent Workflow for Transposaune

> **Note**: This file is read by custom instructions in the repository. GitHub Copilot CLI reads this via the `<repository_custom_instructions>` section in its system prompt.

## Project Overview

Transposaune is an Electron app for sheet music transposition:
- Upload scanned sheet music (PDF, PNG, JPG)
- OCR via Audiveris (bundled)
- Select parts from SATB scores
- Transpose (focus on Bb instruments)
- Print with selected part highlighted

## Automated Testing (CRITICAL)

**Before making ANY changes**, establish baseline:
```bash
npm test  # Must pass before starting work
```

**After making changes**, validate:
```bash
npm run validate  # Lint + Type-check + Tests + Build
```

### Quick Test Commands
- `npm test` - Fast check (lint + type-check + unit tests)
- `npm run test:unit:watch` - Watch mode for TDD
- `npm run test:coverage` - Check coverage thresholds
- `npm run validate` - Full validation before commit

### Git Hooks
Pre-commit hook automatically runs validation. **Do not bypass** unless emergency.

## Task Management Workflow

### 1. Start Task
```bash
# Check available work
bd ready

# Mark task in progress
bd update <task-id> --status=in_progress

# Establish baseline
npm test
```

### 2. Make Changes

**Guidelines:**
- Make **minimal, surgical changes** only
- Add tests for new code (required for coverage)
- Run `npm test` frequently during development
- Use `npm run test:unit:watch` for TDD

**Test Requirements:**
- New function/hook → Add unit test in `__tests__/` directory
- New component → Add component test
- Bug fix → Add regression test
- Coverage must stay above thresholds (70% lines/functions/statements, 65% branches)

### 3. Validate Changes

```bash
# Quick validation
npm test

# Full validation (before commit)
npm run validate
```

**All checks must pass:**
- ✅ Linting (ESLint)
- ✅ Type checking (TypeScript)
- ✅ Unit tests (27+ tests)
- ✅ Coverage thresholds (>70% except branches >65%)
- ✅ Build successful

### 4. Commit Protocol

```bash
# Close task
bd close <task-id>

# Stage changes
git add <changed-files>

# Commit with task reference
git commit -m "<task-id>: <description>"

# Push (if applicable)
git push
```

**Example:**
```bash
bd close TP-rh7.1
git add package.json tsconfig.json src/main/audiveris.ts
git commit -m "TP-rh7.1: Initialize npm project with TypeScript"
```

## Testing Details

### Test Structure
```
src/
├── main/__tests__/          # Main process tests
├── renderer/
│   ├── hooks/__tests__/     # React hooks tests
│   └── components/__tests__/ # Component tests
test/
├── setup.ts                  # Global test setup
├── fixtures/                 # Test data
e2e/                          # End-to-end tests
```

### Writing Tests

**Naming Convention:**
- `MyComponent.tsx` → `MyComponent.test.tsx`
- `useMyHook.ts` → `useMyHook.test.ts`

**Example Hook Test:**
```typescript
import { renderHook, act } from '@testing-library/react'
import { useMyHook } from '../useMyHook'

test('should update state', () => {
  const { result } = renderHook(() => useMyHook())
  act(() => {
    result.current.update('value')
  })
  expect(result.current.value).toBe('value')
})
```

**Example Component Test:**
```typescript
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MyComponent } from '../MyComponent'

test('should call onClick', async () => {
  const onClick = vi.fn()
  render(<MyComponent onClick={onClick} />)
  await userEvent.click(screen.getByRole('button'))
  expect(onClick).toHaveBeenCalled()
})
```

## CI/CD Pipeline

### Automatic Checks (on every PR/push)
1. **Lint** - ESLint validation
2. **Type Check** - TypeScript compilation
3. **Unit Tests** - All 27+ tests with coverage
4. **Build** - Multi-platform (Linux, macOS, Windows)
5. **E2E Tests** - Full application tests

### Scheduled Validation
- Runs every 6 hours
- Ensures codebase health for agent development
- Generates test summaries

## Task Management Commands

- `bd ready` - See available work
- `bd update <id> --status=in_progress` - Start task
- `bd close <id>` - Complete task
- `bd list --status=open` - See all open issues

## Common Scenarios

### Adding New Feature
```bash
bd update <task-id> --status=in_progress
npm run test:unit:watch  # Start watch mode

# Write test first (TDD)
touch src/renderer/hooks/__tests__/useNewFeature.test.ts

# Implement feature
touch src/renderer/hooks/useNewFeature.ts

# Tests pass? Validate!
npm run validate

# Commit
bd close <task-id>
git add src/renderer/hooks/
git commit -m "<task-id>: Add new feature"
```

### Fixing Bug
```bash
# Write regression test that reproduces bug
npm run test:unit:watch

# Fix bug
# Verify test now passes

# Full validation
npm run validate

# Commit
bd close <task-id>
git commit -m "<task-id>: Fix bug with regression test"
```

### Coverage Too Low
```bash
# Check coverage
npm run test:coverage

# Add tests in __tests__ directories
# Re-check coverage
npm run test:coverage

# Should be above thresholds
```

## Troubleshooting

### Tests Fail
```bash
npm run test:unit:watch  # Interactive debugging
npm run test:unit:ui     # Visual UI for debugging
```

### Type Errors
```bash
npx tsc --noEmit --pretty  # See detailed errors
```

### Build Fails
```bash
npm run setup:audiveris
npm run build
```

### Clean Rebuild
```bash
rm -rf node_modules out dist
npm install
npm run setup:audiveris
npm run build
```

## Documentation

- `TESTING.md` - Comprehensive testing guide
- `AGENT_WORKFLOW.md` - Detailed workflow for AI agents
- `TEST_SUMMARY.md` - Testing setup summary
- `README.md` - Project overview

## Success Criteria

Before closing any task:
- ✅ `npm run validate` passes
- ✅ All tests passing
- ✅ Coverage above thresholds
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Build succeeds
- ✅ Task requirements met
- ✅ Code committed with task reference

## Emergency Recovery

### Revert to Last Good State
```bash
git log --oneline
git reset --hard <last-good-commit>
npm run validate
```

### Bypass Git Hook (EMERGENCY ONLY)
```bash
git commit --no-verify
# THEN IMMEDIATELY:
npm run validate
# Fix issues before continuing
```

---

**Last Updated**: 2025-12-11
**Status**: ✅ All validation passing
