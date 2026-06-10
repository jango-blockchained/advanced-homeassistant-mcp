# Design Documentation

**Purpose**: Architectural decisions, design patterns, and MCP implementation choices.
**Last Updated**: 2026-05-06

## Core Design Principles

1. **Transport Agnosticism**: Core MCP logic in `MCPServer.ts` works with any transport (stdio, HTTP, WebSocket)
2. **Tool Encapsulation**: Each tool is self-contained with validation, execution, and formatting
3. **Middleware Chain**: Cross-cutting concerns (auth, rate-limit, validation) via decorator pattern
4. **Type Safety**: Full TypeScript strict mode with Valibot/Zod schema validation

## MCP Architecture (from Context7 research)

### Three Pillars
- **Tools**: Functions LLMs can call (24 tools in this project)
- **Resources**: File-like data (entity states, device lists)
- **Prompts**: Pre-written templates for specific workflows

### Server Capabilities
```typescript
// From Context7: MCP server structure
{
  tools: {},      // Tool implementations
  resources: {},  // Resource providers  
  prompts: {}     // Prompt templates
}
```

## Transport Layer Design

### Strategy Pattern Implementation
```
Transport (interface)
  ├── StdioTransport (src/mcp/transports/stdio.transport.ts)
  ├── HttpTransport (src/mcp/transports/http.transport.ts)
  └── WebSocketTransport (src/mcp/transports/websocket.transport.ts)
```

**Key Decision**: Three entry points for different use cases:
- `src/index.ts` → HTTP + WebSocket (production)
- `src/stdio-server.ts` → STDIO (Smithery, local clients)
- `src/http-server.ts` → HTTP-only (minimal deployment)

## Tool Design Pattern

### BaseTool Abstract Class
```typescript
// src/mcp/tools/base-tool.ts (from Context7 pattern)
abstract class BaseTool {
  name: string;
  description: string;  
  
  abstract execute(params: any): Promise<ToolResult>;
  validate(params: any): ValidationResult { /* common validation */ }
  getSchema(): JSONSchema { /* return schema */ }
}
```

### Tool Registration (Factory + Registry)
```typescript
// src/mcp/tools/index.ts
class ToolRegistry {
  private tools = new Map<string, BaseTool>();
  
  register(tool: BaseTool): void {
    this.tools.set(tool.name, tool);
  }
  
  get(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }
}
```

### Tool Implementation Example
```typescript
// src/mcp/tools/homeassistant/lights.tool.ts
class LightsTool extends BaseTool {
  name = 'lights_control';
  description = 'Control Home Assistant lights';
  
  async execute(params: LightsParams): Promise<ToolResult> {
    // 1. Validate (inherited)
    this.validate(params);
    
    // 2. Call HA API
    const result = await this.hassClient.callService(
      'light',
      params.action,
      params.data
    );
    
    // 3. Format response
    return this.formatResponse(result);
  }
}
```

## Middleware Design (Decorator Pattern)

### Chain Implementation
```typescript
// src/mcp/middleware/
function withAuth(handler: RequestHandler): RequestHandler {
  return async (req, res) => {
    await authenticate(req);
    return handler(req, res);
  };
}

function withRateLimit(handler: RequestHandler): RequestHandler {
  return async (req, res) => {
    await checkRateLimit(req);
    return handler(req, res);
  };
}

// Compose: const handler = withAuth(withRateLimit(baseHandler));
```

**Why Decorator?** Allows flexible, composable middleware without inheritance hierarchies.

## Error Handling Strategy

### Two-Layer Error Handling
1. **Tool Level**: Validation errors, HA API errors
2. **Server Level**: Transport errors, middleware errors

```typescript
// Consistent error format (from Context7 best practices)
{
  success: false,
  error: {
    code: 'VALIDATION_ERROR',
    message: 'Invalid brightness: must be 0-255',
    details: { field: 'brightness', value: 300 }
  }
}
```

### Error Type Checking
```typescript
// Mandatory pattern (from AGENTS.md)
catch (error) {
  const msg = error instanceof Error ? error.message : String(error);
  logger.error(`Tool execution failed: ${msg}`);
}
```

## Security Design

### Authentication Flow
```
Request → JWT Validation → HA Token Verification → Tool Execution
```

**Key Components** (from Context7 security patterns):
- `src/security/auth.ts`: JWT validation
- `src/mcp/middleware/auth.ts`: Request authentication
- `src/config.ts`: Token validation with Valibot

### Input Sanitization
- **sanitize-html**: For user-provided HTML/rich text
- **Valibot schemas**: For structured input validation
- **Helmet**: Security headers for HTTP transport

## Resource Management

### State Caching Strategy
```typescript
// src/mcp/resources.ts
class ResourceManager {
  private cache: Map<string, { data: any, expiry: number }>;
  
  async getResource(uri: string): Promise<Resource> {
    // Check cache first
    const cached = this.cache.get(uri);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    
    // Fetch from HA
    const data = await this.fetchFromHA(uri);
    this.cache.set(uri, {
      data,
      expiry: Date.now() + TTL
    });
    return data;
  }
}
```

## Testing Design

### Three-Tier Strategy (from Context7 + repo analysis)
1. **Unit Tests** (`__tests__/unit/`): Isolated tool logic
2. **Integration Tests** (`__tests__/integration/`): Tool + HA client
3. **E2E Tests** (`__tests__/e2e/`): Full MCP protocol flow

### Test Preload Requirement
```typescript
// test/setup.ts (auto-loaded via bunfig.toml)
// Sets HASS_TOKEN, JWT_SECRET for all tests
```

**Why?** MCP servers need valid tokens to initialize, even for unit tests with mocks.

## Build System Design

### esbuild Over tsc
**Decision**: Use esbuild for bundling, tsc for type checking only.

**Rationale** (from package.json analysis):
- esbuild: Fast bundling, external deps handling, CJS/ESM output
- tsc: Only for `--noEmit` type checking (not used in build)

### External Dependencies
```json
// package.json build scripts
--external:express --external:ws --external:winston
// Why? Large deps not bundled, loaded at runtime
```

## Smithery Deployment Design

### Minimal Entry Point
```typescript
// src/smithery-sdk.ts (from Context7 pattern)
// Lightweight MCP implementation for Smithery registry
// Uses fastmcp instead of custom MCPServer
```

**Why Separate?** Smithery has specific runtime requirements; full server is overkill.

## Related Design Docs
- Architecture: `docs/ARCHITECTURE.md`
- API Reference: `docs/TOOLS_REFERENCE.md`
- Development: `docs/DEVELOPMENT.md`
- MCP Spec: https://modelcontextprotocol.io/
