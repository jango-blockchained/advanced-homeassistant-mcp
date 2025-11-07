# 🏗️ Architecture Documentation

Comprehensive architecture guide for Home Assistant MCP server. Understand the system design, components, and data flow.

## 📋 Table of Contents

- [System Overview](#system-overview)
- [Architecture Layers](#architecture-layers)
- [Core Components](#core-components)
- [Data Flow](#data-flow)
- [Module Structure](#module-structure)
- [Design Patterns](#design-patterns)
- [Technology Stack](#technology-stack)
- [Scalability & Performance](#scalability--performance)

---

## System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Assistants Layer                     │
│         (Claude Desktop, Cursor, VS Code, etc.)              │
└──────────────────────┬──────────────────────────────────────┘
                       │ MCP Protocol
                       ├─── stdio (Standard I/O)
                       ├─── HTTP/REST
                       └─── WebSocket
┌──────────────────────▼──────────────────────────────────────┐
│                  Home Assistant MCP Server                   │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐  │
│  │ Transport  │  │ Middleware │  │  Resource Manager   │  │
│  │   Layer    │──│   Layer    │──│   (State/Cache)     │  │
│  └────────────┘  └────────────┘  └─────────────────────┘  │
│  ┌────────────┐  ┌────────────┐  ┌─────────────────────┐  │
│  │   Tools    │  │   Prompts  │  │     Security        │  │
│  │   Layer    │  │   Layer    │  │   (Auth/Validate)   │  │
│  └────────────┘  └────────────┘  └─────────────────────┘  │
└──────────────────────┬──────────────────────────────────────┘
                       │ Home Assistant API
                       ├─── REST API
                       └─── WebSocket API
┌──────────────────────▼──────────────────────────────────────┐
│                   Home Assistant Instance                    │
│         (Devices, Automations, Entities, Services)          │
└─────────────────────────────────────────────────────────────┘
```

### Component Interactions

```
User Request → AI Assistant → MCP Protocol
    ↓
Transport Layer (stdio/HTTP/WS)
    ↓
Middleware (Auth, Validation, Rate Limiting)
    ↓
Tool Dispatcher (Route to appropriate tool)
    ↓
Tool Execution (Business Logic)
    ↓
Home Assistant Client (API calls)
    ↓
Home Assistant (Execute command)
    ↓
Response Chain (Reverse flow)
    ↓
AI Assistant → User
```

---

## Architecture Layers

### 1. Transport Layer

**Purpose**: Handle communication between AI assistants and MCP server

**Components**:
- **stdio Transport** (`src/mcp/transports/stdio.transport.ts`)
  - Standard input/output communication
  - Primary mode for MCP clients (Claude, Cursor)
  - JSON-RPC 2.0 protocol
  
- **HTTP Transport** (`src/mcp/transports/http.transport.ts`)
  - RESTful API endpoints
  - Swagger/OpenAPI documentation
  - CORS and security headers
  
- **WebSocket Transport** (`src/websocket/`)
  - Real-time bidirectional communication
  - Event streaming
  - Connection pooling

**Key Files**:
```
src/mcp/transport.ts          # Transport abstraction
src/mcp/transports/
  ├── stdio.transport.ts       # Standard I/O
  ├── http.transport.ts        # HTTP/REST
  └── websocket.transport.ts   # WebSocket
src/stdio-server.ts            # stdio entry point
src/http-server.ts             # HTTP entry point
```

### 2. Middleware Layer

**Purpose**: Cross-cutting concerns and request processing

**Components**:

- **Authentication** (`src/security/auth.ts`)
  - JWT token validation
  - Home Assistant token verification
  - Session management

- **Rate Limiting** (`src/middleware/rate-limit.ts`)
  - Request throttling
  - Per-endpoint limits
  - DDoS protection

- **Validation** (`src/middleware/validation.ts`)
  - Input sanitization
  - Schema validation (Valibot)
  - Type checking

- **Logging** (`src/middleware/logger.ts`)
  - Request/response logging
  - Error tracking
  - Performance metrics

- **Error Handling** (`src/middleware/error-handler.ts`)
  - Centralized error processing
  - User-friendly error messages
  - Error recovery

**Key Files**:
```
src/middleware/
  ├── index.ts                 # Middleware orchestration
  ├── auth.ts                  # Authentication
  ├── rate-limit.ts            # Rate limiting
  ├── validation.ts            # Input validation
  ├── logger.ts                # Logging
  └── error-handler.ts         # Error handling
src/security/
  ├── auth.ts                  # Auth logic
  ├── jwt.ts                   # JWT handling
  └── sanitize.ts              # Input sanitization
```

### 3. Tools Layer

**Purpose**: Business logic and Home Assistant interactions

**Structure**:
```
src/tools/
  ├── homeassistant/           # HA-specific tools
  │   ├── lights.tool.ts       # Light control
  │   ├── climate.tool.ts      # Climate control
  │   ├── media-player.tool.ts # Media control
  │   ├── automation.tool.ts   # Automations
  │   ├── maintenance.tool.ts  # Maintenance
  │   └── smart-scenarios.tool.ts # Smart scenarios
  ├── base-tool.ts             # Tool base class
  ├── control.tool.ts          # Generic control
  └── index.ts                 # Tool registry
```

**Tool Architecture**:
```typescript
// Base Tool Structure
abstract class BaseTool {
  name: string;
  description: string;
  
  abstract execute(params: any): Promise<ToolResult>;
  validate(params: any): ValidationResult;
  getSchema(): JSONSchema;
}

// Example: Lights Tool
class LightsTool extends BaseTool {
  async execute(params: LightsParams) {
    // 1. Validate input
    this.validate(params);
    
    // 2. Call Home Assistant
    const result = await this.hassClient.callService(
      'light',
      params.action,
      params.data
    );
    
    // 3. Return formatted response
    return this.formatResponse(result);
  }
}
```

### 4. Resource Manager

**Purpose**: State management and caching

**Components**:

- **State Manager** (`src/mcp/resources.ts`)
  - Entity state caching
  - Resource lifecycle
  - State synchronization

- **Cache Layer** (`src/utils/cache.ts`)
  - In-memory caching
  - Redis integration (optional)
  - TTL management

- **Resource Types**:
  - Device lists
  - Entity states
  - Area/room configurations
  - Automation listings

**Key Files**:
```
src/mcp/resources.ts           # Resource manager
src/utils/cache.ts             # Cache implementation
src/context/                   # Context management
```

### 5. Home Assistant Client

**Purpose**: Communication with Home Assistant

**Components**:

- **REST Client** (`src/hass/client.ts`)
  - API endpoint calls
  - State queries
  - Service execution

- **WebSocket Client** (`src/hass/websocket.ts`)
  - Real-time events
  - State subscriptions
  - Bidirectional communication

- **Connection Pool** (`src/hass/pool.ts`)
  - Connection reuse
  - Health checking
  - Load balancing

**Key Files**:
```
src/hass/
  ├── client.ts                # HTTP client
  ├── websocket.ts             # WebSocket client
  ├── pool.ts                  # Connection pool
  └── types.ts                 # HA types
```

---

## Core Components

### MCP Server

**Location**: `src/mcp/MCPServer.ts`

**Responsibilities**:
- Protocol implementation
- Tool registration
- Resource management
- Transport coordination

**Key Methods**:
```typescript
class MCPServer {
  // Initialize server
  async initialize(): Promise<void>
  
  // Register tools
  registerTool(tool: BaseTool): void
  
  // Handle requests
  async handleRequest(request: MCPRequest): Promise<MCPResponse>
  
  // List resources
  async listResources(): Promise<Resource[]>
  
  // Get resource
  async getResource(uri: string): Promise<ResourceContent>
}
```

### Tool Registry

**Location**: `src/tools/index.ts`

**Purpose**: Central tool management

```typescript
class ToolRegistry {
  private tools: Map<string, BaseTool>;
  
  register(tool: BaseTool): void {
    this.tools.set(tool.name, tool);
  }
  
  get(name: string): BaseTool | undefined {
    return this.tools.get(name);
  }
  
  list(): BaseTool[] {
    return Array.from(this.tools.values());
  }
}
```

### Configuration Manager

**Location**: `src/config/`

**Responsibilities**:
- Environment variable loading
- Configuration validation
- Default values
- Type-safe config access

```typescript
interface Config {
  homeAssistant: {
    url: string;
    token: string;
    timeout: number;
  };
  server: {
    port: number;
    host: string;
    env: 'development' | 'production';
  };
  security: {
    jwtSecret: string;
    rateLimit: RateLimitConfig;
  };
  logging: LogConfig;
}
```

---

## Data Flow

### Request Flow

1. **Request Reception**
   ```
   AI Assistant → Transport Layer
   - Parse JSON-RPC request
   - Extract method and params
   ```

2. **Middleware Processing**
   ```
   Transport → Middleware Chain
   - Authentication
   - Rate limiting
   - Input validation
   - Logging
   ```

3. **Tool Dispatch**
   ```
   Middleware → Tool Registry
   - Lookup tool by name
   - Validate tool exists
   - Check permissions
   ```

4. **Tool Execution**
   ```
   Tool Registry → Tool Instance
   - Validate parameters
   - Execute business logic
   - Call Home Assistant API
   ```

5. **Home Assistant Interaction**
   ```
   Tool → HA Client → Home Assistant
   - REST API call
   - WebSocket message
   - Wait for response
   ```

6. **Response Formation**
   ```
   HA Response → Tool → Middleware
   - Format response
   - Add metadata
   - Error handling
   ```

7. **Response Return**
   ```
   Middleware → Transport → AI Assistant
   - Serialize JSON-RPC response
   - Send to client
   ```

### Event Flow (Real-time)

```
Home Assistant Event
    ↓
WebSocket Client (receives)
    ↓
Event Handler (processes)
    ↓
Event Dispatcher (routes)
    ↓
Subscribed Clients (notify via SSE)
    ↓
AI Assistant (receives update)
```

---

## Module Structure

### Directory Organization

```
src/
├── mcp/                       # MCP Protocol implementation
│   ├── MCPServer.ts          # Main MCP server
│   ├── transport.ts          # Transport abstraction
│   ├── transports/           # Transport implementations
│   ├── resources.ts          # Resource manager
│   ├── prompts.ts            # Prompt templates
│   └── utils/                # MCP utilities
├── tools/                     # Tool implementations
│   ├── homeassistant/        # HA-specific tools
│   ├── base-tool.ts          # Base tool class
│   ├── control.tool.ts       # Generic control
│   └── index.ts              # Tool registry
├── hass/                      # Home Assistant client
│   ├── client.ts             # HTTP client
│   ├── websocket.ts          # WebSocket client
│   └── types.ts              # Type definitions
├── middleware/                # Middleware layer
│   ├── auth.ts               # Authentication
│   ├── rate-limit.ts         # Rate limiting
│   ├── validation.ts         # Validation
│   └── logger.ts             # Logging
├── security/                  # Security utilities
│   ├── auth.ts               # Auth logic
│   ├── jwt.ts                # JWT handling
│   └── sanitize.ts           # Input sanitization
├── config/                    # Configuration
│   ├── index.ts              # Config loader
│   └── schema.ts             # Config schema
├── utils/                     # Utility functions
│   ├── cache.ts              # Caching
│   ├── logger.ts             # Logger setup
│   └── helpers.ts            # Helper functions
├── types/                     # Type definitions
│   ├── mcp.ts                # MCP types
│   ├── hass.ts               # HA types
│   └── common.ts             # Common types
├── schemas/                   # Validation schemas
│   ├── tools.ts              # Tool schemas
│   └── common.ts             # Common schemas
├── index.ts                   # Main entry (Bun)
├── stdio-server.ts            # stdio entry (Node)
└── http-server.ts             # HTTP entry (Node)
```

---

## Design Patterns

### 1. Strategy Pattern (Transport)

Different transport strategies (stdio, HTTP, WebSocket):

```typescript
interface Transport {
  send(message: Message): Promise<void>;
  receive(): Promise<Message>;
  close(): Promise<void>;
}

class StdioTransport implements Transport { }
class HttpTransport implements Transport { }
class WebSocketTransport implements Transport { }
```

### 2. Factory Pattern (Tool Creation)

```typescript
class ToolFactory {
  static create(type: string): BaseTool {
    switch (type) {
      case 'lights': return new LightsTool();
      case 'climate': return new ClimateTool();
      // ...
    }
  }
}
```

### 3. Decorator Pattern (Middleware)

```typescript
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

// Usage
const handler = withAuth(withRateLimit(baseHandler));
```

### 4. Observer Pattern (Events)

```typescript
class EventEmitter {
  private listeners: Map<string, Function[]>;
  
  on(event: string, callback: Function): void {
    this.listeners.get(event)?.push(callback);
  }
  
  emit(event: string, data: any): void {
    this.listeners.get(event)?.forEach(cb => cb(data));
  }
}
```

### 5. Singleton Pattern (Config, Logger)

```typescript
class Logger {
  private static instance: Logger;
  
  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }
}
```

---

## Technology Stack

### Core Technologies

| Technology | Purpose | Version |
|-----------|---------|---------|
| **Bun** | Runtime | >=1.0.26 |
| **TypeScript** | Language | ^5.0.0 |
| **FastMCP** | MCP Framework | ^3.22.0 |
| **Express** | HTTP Server | ^4.21.2 |
| **Winston** | Logging | ^3.11.0 |

### Key Libraries

**Validation & Schema**:
- **Valibot** - Lightweight validation
- **Zod** - Type-safe schemas
- **@valibot/to-json-schema** - JSON Schema generation

**Security**:
- **helmet** - Security headers
- **jsonwebtoken** - JWT handling
- **sanitize-html** - Input sanitization
- **express-rate-limit** - Rate limiting

**HTTP & Communication**:
- **express** - HTTP framework
- **cors** - CORS handling
- **ws** - WebSocket library
- **node-fetch** - HTTP client

**Documentation**:
- **swagger-ui-express** - API docs
- **openapi-types** - OpenAPI types

---

## Scalability & Performance

### Performance Optimizations

1. **Connection Pooling**
   - Reuse HTTP connections to Home Assistant
   - Configurable pool size
   - Health checking

2. **Caching Strategy**
   - In-memory cache for entity states
   - Configurable TTL
   - Optional Redis backend

3. **Async Processing**
   - Non-blocking I/O
   - Promise-based API
   - Event-driven architecture

4. **Resource Management**
   - Lazy loading
   - Memory-efficient data structures
   - Garbage collection optimization

### Scalability Considerations

1. **Horizontal Scaling**
   - Stateless design (mostly)
   - Shared cache (Redis)
   - Load balancer ready

2. **Vertical Scaling**
   - Efficient memory usage
   - Connection pooling
   - Resource limits

3. **Rate Limiting**
   - Per-client limits
   - Per-endpoint limits
   - Graceful degradation

### Monitoring Points

```typescript
// Performance metrics
- Request latency
- Tool execution time
- HA API response time
- Cache hit rate
- Memory usage
- Connection pool stats
```

---

## Extension Points

### Adding New Tools

1. Create tool class extending `BaseTool`
2. Implement required methods
3. Register in tool registry
4. Add schema validation
5. Write tests

### Adding Middleware

1. Create middleware function
2. Register in middleware chain
3. Order appropriately
4. Handle errors

### Adding Transport

1. Implement `Transport` interface
2. Add configuration
3. Register in server
4. Update documentation

---

## Next Steps

**For Developers**:
- [Development Guide](DEVELOPMENT.md) - Setup and workflow
- [API Reference](API_REFERENCE.md) - API documentation
- [Testing Guide](TESTING.md) - Testing practices
- [Contributing Guide](CONTRIBUTING.md) - Contribution workflow

**For Operations**:
- [Docker Guide](DOCKER_GUIDE.md) - Docker deployment
- [Security Guide](SECURITY.md) - Security practices
- [Performance Guide](PERFORMANCE.md) - Performance tuning

---

**Questions?** See [GitHub Discussions](https://github.com/jango-blockchained/advanced-homeassistant-mcp/discussions)
