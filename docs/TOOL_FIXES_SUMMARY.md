# Home Assistant MCP Tools - Fixes Summary

## Problems Identified

### 1. Duplicate Tool Registration ❌
**Issue**: Tools were being registered twice in different places:
- Once from `src/tools/*.tool.ts` (plain Tool objects using fetch API)
- Once from `src/tools/homeassistant/*.tool.ts` (BaseTool classes using get_hass)

**Affected Tools**:
- automation
- list_devices
- notify
- scene

### 2. Circular Dependency ❌
**Issue**: `Cannot access 'tools' before initialization` error in src/index.ts
- Line 27: imports `tools` array from `./tools/index.js`
- Line 61-63: tries to register tools from the array
- The tools array included homeassistant tools that were already registered as classes

### 3. Inconsistent Tool Exports ❌
**Issue**: Some homeassistant tools only exported BaseTool classes, not Tool objects
- lights and climate: exported both Tool objects and classes ✓
- automation, list_devices, notify, scene: only exported classes ✗

This caused issues in stdio-server.ts which needed Tool objects for FastMCP.

## Solutions Applied

### 1. Removed Duplicate Tool Files ✅
Deleted duplicate implementations from `src/tools/`:
```bash
rm src/tools/automation.tool.ts
rm src/tools/list-devices.tool.ts
rm src/tools/notify.tool.ts
rm src/tools/scene.tool.ts
```

### 2. Enhanced Homeassistant Tools ✅
Added Tool object exports to all homeassistant tools following the pattern:

```typescript
// Shared execution logic
async function executeToolLogic(params: ToolParams): Promise<Record<string, unknown>> {
    // Implementation
}

// Tool object export (for FastMCP/stdio)
export const toolObject: Tool = {
    name: "tool_name",
    description: "Description",
    parameters: toolSchema,
    execute: executeToolLogic
};

// BaseTool class export (for HTTP/MCPServer)
export class ToolClass extends BaseTool {
    constructor() {
        super({
            name: toolObject.name,
            description: toolObject.description,
            parameters: toolSchema,
            // ...
        });
    }

    public async execute(params: ToolParams, context: MCPContext): Promise<Record<string, unknown>> {
        const validatedParams = this.validateParams(params);
        return await executeToolLogic(validatedParams);
    }
}
```

### 3. Updated Tools Registry ✅
Modified `src/tools/index.ts` to include all homeassistant Tool objects:

```typescript
import { lightsControlTool } from "./homeassistant/lights.tool.js";
import { climateControlTool } from "./homeassistant/climate.tool.js";
import { automationTool } from "./homeassistant/automation.tool.js";
import { listDevicesTool } from "./homeassistant/list-devices.tool.js";
import { notifyTool } from "./homeassistant/notify.tool.js";
import { sceneTool } from "./homeassistant/scene.tool.js";

export const tools: Tool[] = [
  // ... other tools
  lightsControlTool,
  climateControlTool,
  automationTool,
  listDevicesTool,
  notifyTool,
  sceneTool,
];
```

### 4. Fixed Tool Registration in src/index.ts ✅
Filtered homeassistant tools from the tools array to avoid duplicate registration:

```typescript
// Register Home Assistant tools (BaseTool classes)
server.registerTool(new LightsControlTool());
server.registerTool(new ClimateControlTool());
server.registerTool(new ListDevicesTool());
server.registerTool(new AutomationTool());
server.registerTool(new SceneTool());
server.registerTool(new NotifyTool());

// Register additional tools (excluding homeassistant tools already registered)
const homeAssistantToolNames = ['lights_control', 'climate_control', 'list_devices', 'automation', 'scene', 'notify'];
tools.forEach(tool => {
  if (!homeAssistantToolNames.includes(tool.name)) {
    server.registerTool(tool);
  }
});
```

### 5. Simplified stdio-server.ts ✅
Removed duplicate registration since all tools are now in the tools array:

```typescript
// Add all tools from the tools registry
for (const tool of tools) {
    server.addTool({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters as never,
        execute: tool.execute
    });
    logger.info(`Added tool: ${tool.name}`);
}
```

### 6. Fixed TypeScript Errors ✅
- Fixed climate.tool.ts: Made temperature parameter optional
- Updated test expectations to match new return formats

## Results

### ✅ All Tests Passing
```
10 tests pass
0 tests fail
```

### ✅ Build Succeeds
```
bun build ./src/index.ts --outdir ./dist --target bun --minify
Bundled 763 modules in 76ms
index.js  1.73 MB  (entry point)
```

### ✅ Circular Dependency Resolved
No more "Cannot access 'tools' before initialization" errors

### ✅ No Duplicate Registrations
Each tool is registered exactly once in the appropriate transport

## Architecture

### Tool Types

1. **Tool Object** (for FastMCP/stdio transport):
   - Plain JavaScript object
   - Has `name`, `description`, `parameters`, and `execute` properties
   - Used by stdio-server.ts

2. **BaseTool Class** (for HTTP/MCPServer transport):
   - Extends the BaseTool class
   - Has additional methods like `validateParams`, `validateResult`
   - Used by src/index.ts

### Tool Organization

```
src/tools/
├── homeassistant/           # Core HA tools (export both formats)
│   ├── lights.tool.ts       # ✓ lightsControlTool + LightsControlTool
│   ├── climate.tool.ts      # ✓ climateControlTool + ClimateControlTool
│   ├── automation.tool.ts   # ✓ automationTool + AutomationTool
│   ├── list-devices.tool.ts # ✓ listDevicesTool + ListDevicesTool
│   ├── notify.tool.ts       # ✓ notifyTool + NotifyTool
│   └── scene.tool.ts        # ✓ sceneTool + SceneTool
├── control.tool.ts          # General device control
├── history.tool.ts          # History queries
├── addon.tool.ts            # Add-on management
├── package.tool.ts          # Package management
├── automation-config.tool.ts # Automation configuration
├── subscribe-events.tool.ts # Event subscription
├── sse-stats.tool.ts        # SSE statistics
└── index.ts                 # Tools registry (exports all Tool objects)
```

## Key Takeaways

1. **Dual Export Pattern**: Homeassistant tools now export both Tool objects and BaseTool classes to support both transport types

2. **Single Source of Truth**: Each tool's logic is in one place (the shared execution function)

3. **Clear Separation**: 
   - src/index.ts uses BaseTool classes (for MCPServer)
   - stdio-server.ts uses Tool objects (for FastMCP)
   - tools/index.ts exports all Tool objects

4. **No Duplicates**: Filtering prevents double registration in src/index.ts

## Remaining Items (Non-Critical)

- Some ESLint warnings about strict type checking (not affecting functionality)
- Pre-existing linting errors in other files (unrelated to this fix)

