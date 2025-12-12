# GitHub Copilot CLI & Custom Instructions

## How GitHub Copilot CLI Reads CLAUDE.md

**Yes, GitHub Copilot CLI reads CLAUDE.md!** 

It works through the `<repository_custom_instructions>` section in the system prompt. When you're in this repository, Copilot automatically includes the contents of `CLAUDE.md` in its context.

### Evidence
Looking at the system prompt I operate under, there's this section:

```xml
<repository_custom_instructions>
# Claude Workflow for Transposaune

## Commit Protocol
...
</repository_custom_instructions>
```

This means **CLAUDE.md is automatically loaded** and used by GitHub Copilot CLI when working in this repository.

## How It Works

1. **File Location**: `CLAUDE.md` at repository root
2. **Auto-loaded**: Copilot CLI reads it when working in this directory
3. **Provides Context**: Instructions, workflows, and guidelines
4. **Consistent Behavior**: All coding agents see the same instructions

## What This Means

### ✅ For Claude Desktop (Anthropic)
- Uses `.claude/settings.local.json` for permissions
- Reads CLAUDE.md for project context
- Follows commit protocol and workflow

### ✅ For GitHub Copilot CLI (this agent)
- Automatically loads CLAUDE.md via `<repository_custom_instructions>`
- Follows testing requirements and validation steps
- Respects the workflow guidelines

### ✅ For Other AI Agents
- Can read CLAUDE.md as standard markdown documentation
- Provides clear workflow and testing requirements
- Self-documenting repository

## Best Practices

### Update CLAUDE.md When:
- Adding new test requirements
- Changing commit protocols
- Adding new validation steps
- Updating workflow procedures

### Keep CLAUDE.md:
- **Concise** - Key information only
- **Actionable** - Clear steps and commands
- **Current** - Update with project changes
- **Universal** - Applicable to all coding agents

## Current Setup

```
transposaune/
├── CLAUDE.md                    # ← Main workflow (auto-loaded by Copilot CLI)
├── AGENT_WORKFLOW.md            # ← Detailed agent guide
├── TESTING.md                   # ← Comprehensive testing docs
├── TEST_SUMMARY.md              # ← Quick reference
└── .claude/
    └── settings.local.json      # ← Claude Desktop permissions
```

## Testing the Setup

To verify Copilot CLI is reading CLAUDE.md, ask it:

```bash
@workspace What is the commit protocol for this repository?
```

It should reference the workflow defined in CLAUDE.md.

## Documentation Hierarchy

1. **CLAUDE.md** - Core workflow (auto-loaded)
   - Commit protocol
   - Testing requirements
   - Task management
   - Quick reference

2. **AGENT_WORKFLOW.md** - Detailed workflow
   - Step-by-step instructions
   - Common scenarios
   - Troubleshooting
   - Best practices

3. **TESTING.md** - Testing guide
   - How to write tests
   - Test structure
   - Coverage requirements
   - IDE integration

4. **TEST_SUMMARY.md** - Quick summary
   - What's implemented
   - Quick commands
   - Current status

## Why This Matters

### Independent Agent Development
- Agents know testing is required
- Validation happens automatically
- Consistent workflow across all agents
- No manual oversight needed

### Quality Assurance
- Pre-commit hooks prevent bad code
- CI/CD validates all changes
- Coverage thresholds enforced
- Type safety maintained

### Maintainability
- Self-documenting codebase
- Clear expectations for contributors
- Automated validation
- Easy onboarding

## Example Agent Session

```bash
# Agent starts work
$ npm test  # ← Reads from CLAUDE.md
✅ All tests passing

# Makes changes
$ npm run test:unit:watch  # ← From CLAUDE.md workflow

# Validates before commit
$ npm run validate  # ← Required by CLAUDE.md
✅ Linting passed
✅ Type-check passed
✅ Tests passed (27/27)
✅ Coverage above thresholds
✅ Build successful

# Commits following protocol
$ bd close TP-xyz
$ git add src/
$ git commit -m "TP-xyz: Description"  # ← Format from CLAUDE.md
```

## Updating Instructions

### To update agent behavior:
1. Edit `CLAUDE.md`
2. Update with new requirements
3. Commit changes
4. **All future agent sessions will use new instructions automatically**

### Example Update:
```bash
# Add new testing requirement to CLAUDE.md
git add CLAUDE.md
git commit -m "docs: Add E2E test requirement for new features"

# Next agent session will see this requirement
```

## FAQ

### Q: Does Copilot CLI always read CLAUDE.md?
**A:** Yes, when working in this repository directory.

### Q: Can I override CLAUDE.md?
**A:** Yes, but not recommended. It ensures consistency.

### Q: What if CLAUDE.md conflicts with other docs?
**A:** CLAUDE.md takes precedence as it's auto-loaded into the system prompt.

### Q: How do I know Copilot is following CLAUDE.md?
**A:** Ask it about the workflow - it will reference CLAUDE.md guidelines.

### Q: Does this work for other AI agents?
**A:** They need to explicitly read it, but it's standard markdown they can parse.

---

**Last Updated**: 2025-12-11
**Applies To**: GitHub Copilot CLI, Claude Desktop, and other AI coding agents
