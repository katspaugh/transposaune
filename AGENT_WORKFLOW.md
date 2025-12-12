# Agent Workflow Guide

This guide is specifically for AI coding agents working on Transposaune independently.

## Pre-flight Checklist

Before starting any task:
```bash
# 1. Check current state
npm run lint
npm run type-check
npm run test:unit

# 2. Ensure build works
npm run build

# 3. Review task
bd ready
```

## Development Workflow

### 1. Start Task
```bash
# Pick a task and mark in progress
bd update <task-id> --status=in_progress
```

### 2. Make Changes
- Make **minimal, surgical changes**
- Focus only on the task requirements
- Don't refactor unrelated code

### 3. Validate Changes
```bash
# Quick validation (recommended after each change)
npm run lint
npm run type-check
npm run test:unit

# Full validation (before committing)
npm run validate
```

### 4. Add Tests
For any new code, add tests:
- **New function/hook**: Add unit test in `__tests__` directory
- **New component**: Add component test
- **New feature**: Add E2E test if applicable

Test file naming:
- `useMyHook.ts` → `useMyHook.test.ts`
- `MyComponent.tsx` → `MyComponent.test.tsx`

### 5. Verify Coverage
```bash
npm run test:coverage

# Check that coverage meets minimums:
# - Lines: 70%
# - Functions: 70%
# - Branches: 70%
# - Statements: 70%
```

### 6. Complete Task
```bash
# Close task
bd close <task-id>

# Stage changes
git add <changed-files>

# Commit with task reference
git commit -m "<task-id>: <description>"

# Push if applicable
git push
```

## Test-Driven Development

Recommended approach:
1. Write failing test
2. Implement feature
3. Run `npm test` → should pass
4. Refactor if needed
5. Run `npm test` again

## Common Scenarios

### Adding a New React Hook
```bash
# 1. Create hook
touch src/renderer/hooks/useMyFeature.ts

# 2. Create test
touch src/renderer/hooks/__tests__/useMyFeature.test.ts

# 3. Implement and test
npm run test:unit:watch  # Watch mode for TDD

# 4. Validate
npm run validate
```

### Adding a New Component
```bash
# 1. Create component
touch src/renderer/components/MyComponent.tsx

# 2. Create test
touch src/renderer/components/__tests__/MyComponent.test.tsx

# 3. Test in watch mode
npm run test:unit:watch

# 4. Validate
npm run validate
```

### Fixing a Bug
```bash
# 1. Write regression test that reproduces bug
# 2. Run test - should fail
npm run test:unit

# 3. Fix bug
# 4. Run test - should pass
npm run test:unit

# 5. Full validation
npm run validate
```

### Adding Main Process Code
```bash
# 1. Add code to src/main/
# 2. Create test in src/main/__tests__/
# 3. Mock external dependencies (fs, child_process, etc.)
# 4. Validate
npm run validate
```

## Debugging Test Failures

### Unit Test Fails
```bash
# Run with UI for interactive debugging
npm run test:unit:ui

# Or watch mode with verbose output
npm run test:unit:watch
```

### Type Check Fails
```bash
# See detailed errors
npx tsc --noEmit --pretty

# Fix type errors, then
npm run type-check
```

### Lint Fails
```bash
# Try auto-fix first
npm run lint:fix

# If issues remain, fix manually then
npm run lint
```

### Build Fails
```bash
# Check for missing dependencies
npm install

# Rebuild
npm run build
```

### E2E Test Fails
```bash
# Make sure app builds first
npm run build

# Run with UI for debugging
npm run test:e2e:ui

# Check test-results/ for screenshots
```

## CI/CD Integration

All pull requests automatically run:
- ✅ Linting
- ✅ Type checking
- ✅ Unit tests with coverage
- ✅ Build on all platforms
- ✅ E2E tests on all platforms

**Do not merge if CI fails.**

## Code Quality Standards

### Test Coverage
- Maintain >70% coverage on all metrics
- Add tests for all new code
- Add regression tests for bug fixes

### Code Style
- Follow ESLint rules (auto-fixable)
- Use TypeScript strict mode
- No `any` types (use `unknown` if needed)

### Component Structure
```typescript
// Good: typed props, clear structure
interface Props {
  onSubmit: (value: string) => void
}

export const MyComponent: React.FC<Props> = ({ onSubmit }) => {
  return <button onClick={() => onSubmit('value')}>Click</button>
}
```

### Hook Structure
```typescript
// Good: clear return type, proper error handling
export const useMyHook = (): {
  data: string | null
  error: Error | null
  isLoading: boolean
} => {
  const [data, setData] = useState<string | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  return { data, error, isLoading }
}
```

## Emergency Recovery

### All Tests Broken
```bash
# Revert to last known good state
git log --oneline  # Find last good commit
git reset --hard <commit-sha>
npm run validate  # Verify it works
```

### Can't Build
```bash
# Clean rebuild
rm -rf node_modules out dist
npm install
npm run setup:audiveris
npm run build
```

### Git Hooks Blocking Commit
```bash
# Only if absolutely necessary
git commit --no-verify

# But fix issues immediately after
npm run validate
```

## Performance Tips

- Use `test:unit:watch` during development (faster feedback)
- Run `lint:fix` before manual fixes (saves time)
- Run `validate` only before commits (comprehensive but slow)
- Use `test:unit:ui` for complex debugging (visual interface)

## Success Criteria

Before marking task complete:
- ✅ All tests pass (`npm test`)
- ✅ Full validation passes (`npm run validate`)
- ✅ Coverage thresholds met (>70%)
- ✅ No TypeScript errors
- ✅ No linting errors
- ✅ Build succeeds
- ✅ Task requirements met
- ✅ Code committed with task reference

## Resources

- See `TESTING.md` for detailed testing guide
- See `README.md` for project overview
- See `CLAUDE.md` for commit protocol
- Check `.github/workflows/` for CI configuration
