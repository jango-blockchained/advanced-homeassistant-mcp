# Development Guide

Guide for developers who want to contribute to or extend the Home Assistant MCP server.

## Development Setup

### Prerequisites

- Bun v1.0.26 or higher
- Node.js v18+ (for compatibility testing)
- Git
- A Home Assistant instance for testing

### Initial Setup

```bash
# Clone the repository
git clone https://github.com/jango-blockchained/advanced-homeassistant-mcp.git
cd advanced-homeassistant-mcp

# Install dependencies
bun install

# Copy environment template
cp .env.example .env

# Edit .env with your Home Assistant details
```

### Running in Development Mode

```bash
# Start server with hot reload
bun run dev

# Run tests
bun test

# Run linter
bun run lint

# Type check
bun run type-check
```

## Project Structure

```
advanced-homeassistant-mcp/
├── src/
│   ├── tools/          # MCP tool implementations
│   ├── client/         # Home Assistant API client
│   ├── security/       # Security features
│   ├── transport/      # Transport layer (stdio, HTTP, WS)
│   └── index.ts        # Main entry point
├── __tests__/          # Test files
├── docs/               # Documentation
├── dist-ts/            # Compiled TypeScript
└── package.json        # Project configuration
```

## Adding a New Tool

1. Create a new file in `src/tools/`
2. Implement the tool following the MCP tool specification
3. Add tests in `__tests__/tools/`
4. Update documentation in `docs/TOOLS_REFERENCE.md`
5. Export the tool from `src/tools/index.ts`

Example tool structure:

```typescript
export const myNewTool = {
  name: 'my_new_tool',
  description: 'Description of what the tool does',
  inputSchema: {
    type: 'object',
    properties: {
      // Define input parameters
    },
    required: ['param1']
  },
  execute: async (params, context) => {
    // Tool implementation
    return {
      content: [{
        type: 'text',
        text: 'Tool result'
      }]
    };
  }
};
```

## Testing

### Running Tests

```bash
# Run all tests
bun test

# Run specific test file
bun test __tests__/tools/lights.test.ts

# Run with coverage
bun test --coverage
```

### Writing Tests

Tests should cover:
- Tool input validation
- Success cases
- Error cases
- Edge cases

## Code Style

### TypeScript Guidelines

- Use strict TypeScript mode
- Prefer `const` over `let`
- Use descriptive variable names
- Add JSDoc comments for public APIs
- Keep functions small and focused

### Linting

```bash
# Run linter
bun run lint

# Fix auto-fixable issues
bun run lint --fix
```

## Building

```bash
# Build for production
bun run build

# Build for specific target
bun run build:stdio
bun run build:http
```

## Docker Development

```bash
# Build Docker image
docker build -t homeassistant-mcp:dev .

# Run development container
docker run -it --rm \
  -v $(pwd):/app \
  -e HA_URL=http://your-ha:8123 \
  -e HA_TOKEN=your-token \
  homeassistant-mcp:dev
```

## Debugging

### VS Code

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug MCP Server",
      "runtimeExecutable": "bun",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal"
    }
  ]
}
```

### Debug Logging

Enable debug mode:

```bash
DEBUG=true bun run dev
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines.

## Related Documentation

- [Architecture](ARCHITECTURE.md) - System architecture
- [Contributing](CONTRIBUTING.md) - Contribution guidelines
- [Tools Reference](TOOLS_REFERENCE.md) - Tool documentation
