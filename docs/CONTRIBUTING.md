# 🤝 Contributing Guide

Thank you for your interest in contributing to Home Assistant MCP! This guide will help you get started with contributing to the project.

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Process](#development-process)
- [Contribution Guidelines](#contribution-guidelines)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all. By participating in this project, you agree to abide by our code of conduct.

### Our Standards

**Positive behavior includes**:
- Using welcoming and inclusive language
- Being respectful of differing viewpoints
- Gracefully accepting constructive criticism
- Focusing on what is best for the community
- Showing empathy towards others

**Unacceptable behavior includes**:
- Trolling, insulting/derogatory comments, and personal attacks
- Public or private harassment
- Publishing others' private information
- Other conduct which could reasonably be considered inappropriate

### Enforcement

Instances of abusive, harassing, or otherwise unacceptable behavior may be reported by contacting the project team. All complaints will be reviewed and investigated promptly and fairly.

---

## How Can I Contribute?

### 🐛 Reporting Bugs

Before creating bug reports, please check existing issues to avoid duplicates.

**When you create a bug report, include**:

- **Clear title**: Descriptive summary of the issue
- **Description**: Detailed explanation of the problem
- **Steps to reproduce**: Exact steps to reproduce the behavior
- **Expected behavior**: What you expected to happen
- **Actual behavior**: What actually happened
- **Environment**: OS, MCP version, Bun/Node version, HA version
- **Logs**: Relevant log output (sanitize sensitive data!)
- **Screenshots**: If applicable

**Example bug report**:
```markdown
## Bug: Lights tool fails with RGB color values

**Description**
Setting RGB color on lights fails with validation error.

**To Reproduce**
1. Call lights_control tool
2. Set rgb_color to [255, 0, 0]
3. Error occurs

**Expected**
Light should turn red.

**Actual**
Error: "Invalid RGB color format"

**Environment**
- OS: macOS 14.0
- MCP Version: 1.1.0
- Runtime: Bun 1.0.26
- HA Version: 2024.1.0

**Logs**
```
ERROR: Validation failed for rgb_color
```

**Additional Context**
Works fine with color_temp parameter.
```

### 💡 Suggesting Enhancements

Enhancement suggestions are tracked as GitHub issues.

**When suggesting enhancements, include**:

- **Clear title**: Descriptive summary of the enhancement
- **Use case**: Why would this be useful?
- **Proposed solution**: How should it work?
- **Alternatives**: Other solutions you've considered
- **Examples**: How other tools/projects handle this

**Example enhancement**:
```markdown
## Enhancement: Add support for light groups

**Use Case**
Users want to control multiple lights as a single entity without creating explicit groups in Home Assistant.

**Proposed Solution**
Add `group` parameter to lights_control:
```typescript
{
  action: "turn_on",
  group: ["light.living_room", "light.kitchen"],
  brightness: 200
}
```

**Alternatives**
- Require users to create HA groups (current workaround)
- Add separate group control tool

**Examples**
- Home Assistant UI supports this
- Other smart home APIs have group support
```

### 📝 Improving Documentation

Documentation improvements are always welcome!

**Areas for improvement**:
- Fixing typos or unclear explanations
- Adding missing examples
- Improving organization
- Adding diagrams or visuals
- Translating documentation

**Process**:
1. Find documentation file in `docs/`
2. Make improvements
3. Submit pull request
4. No tests needed for doc-only changes

### 🔧 Contributing Code

See sections below for detailed code contribution process.

### 💬 Helping Others

Help others in:
- GitHub Discussions
- Issue comments
- Code reviews
- Documentation reviews

---

## Getting Started

### 1. Fork the Repository

Click the "Fork" button on GitHub to create your own copy.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR_USERNAME/advanced-homeassistant-mcp.git
cd advanced-homeassistant-mcp
```

### 3. Add Upstream Remote

```bash
git remote add upstream https://github.com/jango-blockchained/advanced-homeassistant-mcp.git
```

### 4. Install Dependencies

```bash
bun install
```

### 5. Create Development Environment

```bash
cp .env.example .env
# Edit .env with your Home Assistant details
```

### 6. Verify Setup

```bash
bun run build:all
bun test
```

---

## Development Process

### 1. Find or Create an Issue

- Check existing issues
- Create new issue if needed
- Get issue assigned to you (comment on issue)
- Discuss approach if complex change

### 2. Create Feature Branch

```bash
# Update main branch
git checkout main
git pull upstream main

# Create feature branch
git checkout -b feature/my-feature
# or
git checkout -b bugfix/fix-issue-123
```

**Branch naming**:
- `feature/` - New features
- `bugfix/` - Bug fixes
- `docs/` - Documentation only
- `refactor/` - Code refactoring
- `test/` - Test additions/fixes

### 3. Make Changes

**Write code**:
- Follow code style guidelines
- Add comments for complex logic
- Keep changes focused and minimal

**Write tests**:
- Add unit tests for new functions
- Add integration tests for new features
- Ensure existing tests still pass

**Update documentation**:
- Update relevant docs
- Add examples if applicable
- Update CHANGELOG.md

### 4. Commit Changes

```bash
git add .
git commit -m "feat: add new feature"
```

**Commit message format**:
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation only
- `style` - Formatting, missing semi-colons, etc.
- `refactor` - Code refactoring
- `test` - Adding tests
- `chore` - Maintenance tasks

**Examples**:
```bash
feat(tools): add vacuum control support
fix(auth): resolve JWT expiration bug
docs: improve installation guide
refactor(mcp): simplify transport layer
test: add tests for lights tool
chore: update dependencies
```

### 5. Push Changes

```bash
git push origin feature/my-feature
```

### 6. Create Pull Request

- Go to your fork on GitHub
- Click "New Pull Request"
- Fill in the PR template
- Link related issues
- Request reviews

---

## Contribution Guidelines

### Code Quality

**TypeScript**:
- Use strict TypeScript
- Avoid `any` types
- Provide proper type definitions
- Use interfaces for objects

**Example**:
```typescript
// Good ✓
interface LightParams {
  entity_id: string;
  brightness?: number;
  rgb_color?: [number, number, number];
}

async function controlLight(params: LightParams): Promise<Result> {
  // Implementation
}

// Bad ✗
async function controlLight(params: any): Promise<any> {
  // Implementation
}
```

**Error Handling**:
- Use try-catch for async operations
- Provide meaningful error messages
- Log errors appropriately

```typescript
// Good ✓
try {
  const result = await hassClient.callService(/*...*/);
  return result;
} catch (error) {
  logger.error('Failed to control light', { error, entity_id });
  throw new ToolError('Light control failed', { cause: error });
}

// Bad ✗
const result = await hassClient.callService(/*...*/);
return result;
```

**Performance**:
- Avoid unnecessary computations
- Use caching when appropriate
- Be mindful of memory usage
- Profile performance-critical code

### Testing Requirements

**Unit Tests**:
```typescript
// Required for new functions
describe('MyFunction', () => {
  it('should handle valid input', () => {
    const result = myFunction(validInput);
    expect(result).toBe(expectedOutput);
  });
  
  it('should throw on invalid input', () => {
    expect(() => myFunction(invalidInput)).toThrow();
  });
});
```

**Integration Tests**:
```typescript
// Required for new features
describe('MyFeature Integration', () => {
  it('should work end-to-end', async () => {
    const server = await setupTestServer();
    const result = await server.handleRequest(request);
    expect(result.success).toBe(true);
  });
});
```

**Coverage**:
- Aim for 80%+ code coverage
- Critical paths must be tested
- Edge cases should be tested

### Documentation Requirements

**Code Documentation**:
```typescript
/**
 * Controls Home Assistant lights
 * 
 * @param params - Light control parameters
 * @returns Promise resolving to control result
 * @throws {ValidationError} If parameters are invalid
 * @throws {HassError} If Home Assistant API fails
 * 
 * @example
 * ```typescript
 * const result = await controlLight({
 *   entity_id: 'light.living_room',
 *   brightness: 200
 * });
 * ```
 */
async function controlLight(params: LightParams): Promise<ToolResult> {
  // Implementation
}
```

**README Updates**:
- Update if adding new features
- Update if changing installation
- Keep examples up to date

**Tool Documentation**:
- Add to TOOLS_REFERENCE.md
- Include examples
- Document all parameters
- Show error cases

### Commit Guidelines

**Atomic Commits**:
- One logical change per commit
- Can be understood in isolation
- Can be reverted independently

**Good commits**:
```bash
git commit -m "feat(tools): add vacuum control"
git commit -m "test(vacuum): add unit tests"
git commit -m "docs(tools): document vacuum control"
```

**Bad commits**:
```bash
git commit -m "add stuff"
git commit -m "WIP"
git commit -m "feat: add vacuum, fix lights, update docs, refactor auth"
```

---

## Pull Request Process

### Before Submitting

**Checklist**:
- [ ] Code follows style guidelines
- [ ] Tests added and passing
- [ ] Documentation updated
- [ ] No console.log() or debugger statements
- [ ] No commented-out code
- [ ] Commits follow conventional format
- [ ] Branch is up to date with main
- [ ] No merge conflicts

**Self Review**:
```bash
# View your changes
git diff main...feature/my-feature

# Run linter
bun run lint

# Run tests
bun test

# Check types
bun run typecheck
```

### Creating the PR

**Use the template**:
```markdown
## Description
Brief description of changes.

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Documentation update
- [ ] Refactoring

## Related Issues
Fixes #123
Related to #456

## Testing
- [ ] Unit tests added
- [ ] Integration tests added
- [ ] Manual testing performed

## Checklist
- [ ] Code follows style guidelines
- [ ] Documentation updated
- [ ] Tests passing
- [ ] No breaking changes (or documented)

## Screenshots (if applicable)
[Add screenshots]

## Additional Notes
[Any additional information]
```

### During Review

**Be responsive**:
- Respond to comments promptly
- Ask questions if unclear
- Be open to feedback

**Make requested changes**:
```bash
# Make changes
git add .
git commit -m "fix: address review comments"
git push
```

**Resolve conversations**:
- Mark as resolved when addressed
- Explain your reasoning if disagreeing

### After Approval

**Squash merge** (preferred):
- Combines all commits into one
- Clean history
- Easier to revert

**Merge commit**:
- Preserves all commits
- Used for large features

---

## Code Review Guidelines

### For Contributors

**When your PR is reviewed**:
- Don't take it personally
- Reviews make code better
- Learn from feedback
- It's okay to disagree (respectfully)

### For Reviewers

**Be constructive**:
```markdown
<!-- Good ✓ -->
Consider using Promise.all() here for better performance:
```typescript
const results = await Promise.all(promises);
```

<!-- Bad ✗ -->
This is slow and wrong.
```

**Be specific**:
```markdown
<!-- Good ✓ -->
This function should validate the brightness parameter to ensure it's between 0 and 255.

<!-- Bad ✗ -->
Add validation.
```

**Suggest, don't demand**:
```markdown
<!-- Good ✓ -->
Optional: You might consider extracting this into a helper function.

<!-- Bad ✗ -->
Extract this function.
```

---

## Community

### Communication Channels

**GitHub Discussions**:
- Ask questions
- Share ideas
- Get help
- Discuss features

**GitHub Issues**:
- Bug reports
- Feature requests
- Specific problems

**Pull Requests**:
- Code contributions
- Documentation improvements
- Technical discussions

### Getting Help

**Before asking**:
1. Check documentation
2. Search existing issues
3. Search discussions
4. Try debugging yourself

**When asking**:
- Be specific
- Provide context
- Include code/logs
- Share what you've tried

**Example good question**:
```markdown
I'm trying to add a new tool for controlling cameras, but I'm getting a TypeScript error.

Here's my code:
```typescript
// Code snippet
```

Error:
```
// Error message
```

I've tried:
- Checking existing tools for examples
- Reading the BaseTool documentation
- Searching for similar issues

What am I missing?
```

### Recognition

Contributors are recognized in:
- CONTRIBUTORS file
- Release notes
- GitHub contributors page
- Annual contributor highlights

---

## First-Time Contributors

### Good First Issues

Look for issues labeled:
- `good first issue` - Easy to solve
- `help wanted` - Extra help needed
- `documentation` - Doc improvements

### Getting Started

1. **Start small**: Fix typos, improve docs
2. **Learn the codebase**: Read existing code
3. **Ask questions**: Don't hesitate to ask
4. **Take your time**: No pressure

### Mentorship

- Request help in issue comments
- Tag maintainers for guidance
- Join discussions for learning
- Pair program if available

---

## Licensing

By contributing, you agree that your contributions will be licensed under the MIT License.

**Copyright Notice**:
```typescript
/**
 * Copyright (c) 2024 jango-blockchained
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction...
 */
```

---

## Thank You!

Your contributions make this project better for everyone. We appreciate your time and effort!

**Questions?** Ask in [GitHub Discussions](https://github.com/jango-blockchained/advanced-homeassistant-mcp/discussions)!

**Ready to contribute?** Check out [good first issues](https://github.com/jango-blockchained/advanced-homeassistant-mcp/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22)!

---

**Other Resources**:
- [Development Guide](DEVELOPMENT.md) - Setup and workflow
- [Architecture Guide](ARCHITECTURE.md) - System design
- [Testing Guide](TESTING.md) - Testing practices
