# 🛠️ Development Guide

Complete development guide for contributing to Home Assistant MCP. Learn how to set up your development environment, build, test, and contribute.

## 📋 Table of Contents

- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Building](#building)
- [Testing](#testing)
- [Debugging](#debugging)
- [Code Style](#code-style)
- [Git Workflow](#git-workflow)
- [Release Process](#release-process)

---

## Development Setup

### Prerequisites

**Required**:
- [Bun](https://bun.sh) v1.0.26+ (recommended) or [Node.js](https://nodejs.org/) v18.0.0+
- [Git](https://git-scm.com/)
- [Home Assistant](https://www.home-assistant.io/) instance (for testing)
- Code editor (VS Code recommended)

**Optional**:
- [Docker](https://www.docker.com/) (for containerized development)
- [Redis](https://redis.io/) (for cache testing)

### Initial Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jango-blockchained/advanced-homeassistant-mcp.git
   cd advanced-homeassistant-mcp
   ```

2. **Install dependencies**:
   ```bash
   bun install
   # or with npm
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env`:
   ```env
   # Home Assistant (use test instance)
   HOME_ASSISTANT_URL=http://localhost:8123
   HOME_ASSISTANT_TOKEN=your_test_token
   
   # Development settings
   NODE_ENV=development
   LOG_LEVEL=debug
   DEBUG=true
   PORT=3000
   
   # Disable rate limiting for dev
   RATE_LIMIT_ENABLED=false
   ```

4. **Build the project**:
   ```bash
   bun run build:all
   ```

5. **Run tests**:
   ```bash
   bun test
   ```

6. **Start development server**:
   ```bash
   bun run dev
   ```

### VS Code Setup

**Recommended extensions**:
```json
{
  "recommendations": [
    "dbaeumer.vscode-eslint",
    "esbenp.prettier-vscode",
    "ms-vscode.vscode-typescript-next",
    "bradlc.vscode-tailwindcss",
    "eamodio.gitlens"
  ]
}
```

**Settings** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib",
  "typescript.enablePromptUseWorkspaceTsdk": true
}
```

---

## Project Structure

### Overview

```
advanced-homeassistant-mcp/
├── src/                       # Source code
│   ├── mcp/                  # MCP protocol implementation
│   ├── tools/                # Tool implementations
│   ├── hass/                 # Home Assistant client
│   ├── middleware/           # Middleware components
│   ├── security/             # Security utilities
│   ├── utils/                # Utility functions
│   ├── types/                # TypeScript types
│   └── index.ts              # Main entry point
├── docs/                      # Documentation
├── __tests__/                # Test files
├── dist/                      # Build output
├── bin/                       # Executable scripts
├── docker/                    # Docker files
├── .github/                   # GitHub workflows
└── package.json              # Project metadata
```

### Key Directories

**`src/mcp/`** - MCP Protocol:
```
mcp/
├── MCPServer.ts              # Core MCP server
├── transport.ts              # Transport layer
├── transports/               # Transport implementations
│   ├── stdio.transport.ts
│   ├── http.transport.ts
│   └── websocket.transport.ts
├── resources.ts              # Resource management
├── prompts.ts                # Prompt templates
└── utils/                    # MCP utilities
```

**`src/tools/`** - Tool Implementations:
```
tools/
├── homeassistant/            # HA-specific tools
│   ├── lights.tool.ts
│   ├── climate.tool.ts
│   ├── media-player.tool.ts
│   ├── maintenance.tool.ts
│   └── smart-scenarios.tool.ts
├── base-tool.ts              # Base tool class
├── control.tool.ts           # Generic control
└── index.ts                  # Tool registry
```

**`__tests__/`** - Tests:
```
__tests__/
├── unit/                     # Unit tests
│   ├── tools/
│   ├── mcp/
│   └── utils/
├── integration/              # Integration tests
└── e2e/                      # End-to-end tests
```

---

## Building

### Build Commands

```bash
# Build all targets (Bun + Node)
bun run build:all

# Build for Bun only (fastest)
bun run build

# Build stdio server for Node.js
bun run build:stdio

# Build HTTP server for Node.js
bun run build:node

# Build for Smithery deployment
bun run smithery:build

# Clean build artifacts
bun run clean
```

### Build Process

The build process:
1. Compiles TypeScript to JavaScript
2. Bundles dependencies
3. Creates optimized output in `dist/`
4. Generates source maps (development)
5. Minifies code (production)

### Build Targets

| Target | Runtime | Entry Point | Output |
|--------|---------|-------------|--------|
| Bun | Bun | `src/index.ts` | `dist/index.js` |
| Node stdio | Node.js | `src/stdio-server.ts` | `dist/stdio-server.js` |
| Node HTTP | Node.js | `src/http-server.ts` | `dist/http-server.js` |
| Smithery | Node.js | `src/http-server.ts` | `dist/smithery.cjs` |

### Optimization

**Production build**:
```bash
NODE_ENV=production bun run build:all
```

Optimizations applied:
- Dead code elimination
- Tree shaking
- Minification
- Source map generation

---

## Testing

### Test Structure

```
__tests__/
├── unit/                     # Unit tests (isolated)
├── integration/              # Integration tests (with HA)
├── e2e/                      # End-to-end tests
├── fixtures/                 # Test data
└── setup.ts                  # Test configuration
```

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test __tests__/unit/tools/lights.test.ts

# Run tests in watch mode
bun test --watch

# Run with coverage
bun test --coverage

# Run integration tests only
bun test __tests__/integration/

# Update snapshots
bun test --update-snapshots

# Clear test cache
bun test --clear-cache
```

### Writing Tests

**Unit Test Example**:
```typescript
// __tests__/unit/tools/lights.test.ts
import { describe, it, expect, beforeEach } from 'bun:test';
import { LightsTool } from '@/tools/homeassistant/lights.tool';

describe('LightsTool', () => {
  let lightsTool: LightsTool;
  
  beforeEach(() => {
    lightsTool = new LightsTool(mockHassClient);
  });
  
  it('should turn on light with correct parameters', async () => {
    const result = await lightsTool.execute({
      action: 'turn_on',
      entity_id: 'light.test',
      brightness: 255
    });
    
    expect(result.success).toBe(true);
    expect(result.data.brightness).toBe(255);
  });
  
  it('should validate brightness range', () => {
    expect(() => {
      lightsTool.validate({
        brightness: 300  // Invalid: max 255
      });
    }).toThrow();
  });
});
```

**Integration Test Example**:
```typescript
// __tests__/integration/mcp-server.test.ts
import { describe, it, expect } from 'bun:test';
import { MCPServer } from '@/mcp/MCPServer';

describe('MCP Server Integration', () => {
  it('should connect to Home Assistant', async () => {
    const server = new MCPServer(testConfig);
    await server.initialize();
    
    const health = await server.healthCheck();
    expect(health.homeAssistant.connected).toBe(true);
  });
  
  it('should execute light control tool', async () => {
    const response = await server.handleRequest({
      method: 'tools/call',
      params: {
        name: 'lights_control',
        arguments: {
          action: 'turn_on',
          entity_id: 'light.test'
        }
      }
    });
    
    expect(response.success).toBe(true);
  });
});
```

### Test Configuration

**setup.ts**:
```typescript
import { beforeAll, afterAll } from 'bun:test';

// Global test setup
beforeAll(() => {
  // Load test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
  
  // Setup mocks
  setupMocks();
});

// Global test teardown
afterAll(() => {
  // Cleanup
  cleanupMocks();
});
```

### Mocking

**Mock Home Assistant Client**:
```typescript
// __mocks__/hass-client.ts
export const mockHassClient = {
  callService: jest.fn((domain, service, data) => {
    return Promise.resolve({
      success: true,
      data: { ...data }
    });
  }),
  
  getStates: jest.fn(() => {
    return Promise.resolve([
      { entity_id: 'light.test', state: 'on' }
    ]);
  })
};
```

### Coverage Goals

- **Unit tests**: 80%+ coverage
- **Integration tests**: Critical paths
- **E2E tests**: Main workflows

---

## Debugging

### VS Code Debugging

**launch.json**:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "bun",
      "request": "launch",
      "name": "Debug Bun",
      "program": "${workspaceFolder}/src/index.ts",
      "cwd": "${workspaceFolder}",
      "stopOnEntry": false,
      "console": "integratedTerminal"
    },
    {
      "type": "node",
      "request": "launch",
      "name": "Debug stdio",
      "program": "${workspaceFolder}/dist/stdio-server.js",
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal"
    },
    {
      "type": "bun",
      "request": "launch",
      "name": "Debug Tests",
      "program": "${workspaceFolder}/node_modules/.bin/bun",
      "args": ["test", "${file}"]
    }
  ]
}
```

### Command Line Debugging

**Bun with inspector**:
```bash
bun --inspect src/index.ts
# Open chrome://inspect in Chrome
```

**Node.js with inspector**:
```bash
node --inspect dist/stdio-server.js
```

### Debug Logging

**Enable debug logs**:
```bash
DEBUG=true LOG_LEVEL=debug bun run dev
```

**In code**:
```typescript
import { logger } from '@/utils/logger';

logger.debug('Debug message', { data: value });
logger.info('Info message');
logger.warn('Warning message');
logger.error('Error message', error);
```

### Breakpoints

**In TypeScript**:
```typescript
debugger; // Pauses execution
```

**Conditional breakpoints** (VS Code):
```typescript
// Right-click line number → Add Conditional Breakpoint
// Condition: user.id === 123
```

---

## Code Style

### TypeScript Guidelines

**Use strict mode**:
```typescript
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true
  }
}
```

**Type everything**:
```typescript
// Good
function greet(name: string): string {
  return `Hello, ${name}`;
}

// Bad
function greet(name) {
  return `Hello, ${name}`;
}
```

**Use interfaces for objects**:
```typescript
interface User {
  id: string;
  name: string;
  email: string;
}

const user: User = {
  id: '123',
  name: 'John',
  email: 'john@example.com'
};
```

### Naming Conventions

```typescript
// Classes: PascalCase
class LightsTool { }

// Interfaces: PascalCase with 'I' prefix (optional)
interface IConfig { }

// Functions: camelCase
function handleRequest() { }

// Constants: UPPER_SNAKE_CASE
const MAX_RETRY_COUNT = 3;

// Private members: prefix with underscore
class Example {
  private _privateValue: string;
}

// File names: kebab-case
// lights-tool.ts
// home-assistant-client.ts
```

### Code Organization

**Imports order**:
```typescript
// 1. Node.js built-ins
import { readFile } from 'fs/promises';

// 2. External dependencies
import express from 'express';
import { z } from 'zod';

// 3. Internal modules (with alias)
import { logger } from '@/utils/logger';
import { BaseTool } from '@/tools/base-tool';

// 4. Types
import type { Config } from '@/types';
```

**Function structure**:
```typescript
async function processRequest(request: Request): Promise<Response> {
  // 1. Validate input
  validateRequest(request);
  
  // 2. Extract data
  const data = extractData(request);
  
  // 3. Process
  const result = await processData(data);
  
  // 4. Format response
  return formatResponse(result);
}
```

### ESLint & Prettier

**Run linter**:
```bash
bun run lint
bun run lint --fix  # Auto-fix issues
```

**Format code**:
```bash
bun run format
```

**Pre-commit hook** (automatic):
```bash
# Installed via Husky
# Runs lint and format on staged files
```

### Documentation

**JSDoc for public APIs**:
```typescript
/**
 * Controls Home Assistant lights
 * @param params - Light control parameters
 * @returns Promise resolving to control result
 * @throws {ValidationError} If parameters are invalid
 * @example
 * ```typescript
 * await lightsTool.execute({
 *   action: 'turn_on',
 *   entity_id: 'light.living_room'
 * });
 * ```
 */
async function execute(params: LightsParams): Promise<ToolResult> {
  // Implementation
}
```

---

## Git Workflow

### Branch Strategy

```
main (protected)
  ├── develop
  │   ├── feature/add-new-tool
  │   ├── feature/improve-logging
  │   └── bugfix/fix-auth-issue
  └── release/v1.2.0
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting)
- `refactor`: Code refactoring
- `test`: Tests
- `chore`: Maintenance

**Examples**:
```bash
feat(tools): add vacuum control tool
fix(auth): resolve JWT token expiration issue
docs: update installation guide
refactor(mcp): simplify transport layer
test: add integration tests for lights tool
chore: update dependencies
```

### Pull Request Process

1. **Create feature branch**:
   ```bash
   git checkout -b feature/my-feature
   ```

2. **Make changes and commit**:
   ```bash
   git add .
   git commit -m "feat: add new feature"
   ```

3. **Push to GitHub**:
   ```bash
   git push origin feature/my-feature
   ```

4. **Create Pull Request**:
   - Fill in PR template
   - Link related issues
   - Request reviews

5. **Address review comments**:
   ```bash
   git add .
   git commit -m "fix: address review comments"
   git push
   ```

6. **Merge** (after approval):
   - Squash and merge (preferred)
   - Or merge commit

---

## Release Process

### Version Bumping

**Automated** (GitHub Actions):
1. Go to Actions → "Version Bump and Release"
2. Click "Run workflow"
3. Select: patch | minor | major
4. System automatically:
   - Updates version in package.json
   - Creates git tag
   - Generates changelog
   - Publishes to npm
   - Builds Docker image
   - Creates GitHub release

**Manual**:
```bash
# Patch (1.0.0 → 1.0.1)
npm version patch

# Minor (1.0.0 → 1.1.0)
npm version minor

# Major (1.0.0 → 2.0.0)
npm version major

# Push tags
git push --follow-tags
```

### Changelog

Automatically generated from commits:
- Uses conventional commits
- Groups by type (feat, fix, etc.)
- Includes breaking changes
- Links to issues/PRs

### Pre-release Checklist

- [ ] All tests passing
- [ ] Documentation updated
- [ ] CHANGELOG.md reviewed
- [ ] Breaking changes documented
- [ ] Migration guide (if needed)
- [ ] Version bumped
- [ ] Git tag created

---

## Development Workflows

### Adding a New Tool

1. **Create tool file**:
   ```bash
   touch src/tools/homeassistant/my-tool.tool.ts
   ```

2. **Implement tool**:
   ```typescript
   import { BaseTool } from '../base-tool';
   
   export class MyTool extends BaseTool {
     name = 'my_tool';
     description = 'My tool description';
     
     async execute(params: MyParams): Promise<ToolResult> {
       // Implementation
     }
   }
   ```

3. **Register tool**:
   ```typescript
   // src/tools/index.ts
   import { MyTool } from './homeassistant/my-tool.tool';
   
   export const tools = [
     // ...
     new MyTool(hassClient),
   ];
   ```

4. **Add tests**:
   ```typescript
   // __tests__/unit/tools/my-tool.test.ts
   describe('MyTool', () => {
     it('should work', async () => {
       // Test
     });
   });
   ```

5. **Update documentation**:
   - Add to TOOLS_REFERENCE.md
   - Add examples to EXAMPLES.md

### Debugging Issues

1. **Enable debug logging**
2. **Reproduce issue**
3. **Check logs**
4. **Add breakpoints**
5. **Step through code**
6. **Identify root cause**
7. **Write failing test**
8. **Fix issue**
9. **Verify test passes**

---

## Helpful Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Bun Documentation](https://bun.sh/docs)
- [MCP Specification](https://modelcontextprotocol.io/)
- [Home Assistant API](https://developers.home-assistant.io/docs/api/rest/)

---

**Ready to contribute?** See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines!
