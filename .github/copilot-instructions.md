# AI Agent Instructions for `homeassistant-mcp`

This document provides essential guidance for AI agents working on the `homeassistant-mcp` codebase.

## 1. Architecture & Core Concepts

The project is a **Model Context Protocol (MCP)** server for Home Assistant. It has two primary modes of operation, determined by which entry point is used:

1.  **Standalone HTTP/WebSocket Server (`src/index.ts`)**: This is the main entry point. It creates an Express server that handles HTTP REST, WebSocket, and Server-Sent Events (SSE) transports. This is the mode for production deployments and general use.
2.  **STDIO Server (`src/stdio-server.ts`)**: A lightweight, dependency-minimal server that communicates over `stdin`/`stdout`. This is used for integration with tools like the Smithery CLI and other local clients that manage the server as a child process.

### Key Components:

-   **`src/index.ts`**: The main application entry point. It initializes the Express app, sets up middleware (security, logging), and instantiates the `MCPServer`.
-   **`src/mcp/MCPServer.ts`**: The core of the application. It manages different transport layers (HTTP, WebSocket, STDIO), loads tools, and handles the MCP request/response lifecycle. It is designed to be transport-agnostic.
-   **`src/mcp/transports/`**: Contains the logic for different communication protocols. The `http.transport.ts` is crucial as it hooks into the main Express app created in `src/index.ts`.
-   **`src/tools/`**: This directory contains all the "tools" that the MCP server exposes. Each tool is a self-contained module that interacts with the Home Assistant API. See `src/tools/homeassistant/` for examples.
-   **`src/hass/`**: This directory contains the client for interacting with the Home Assistant WebSocket API. It's the primary way the server communicates with Home Assistant.

## 2. Developer Workflow & Commands

The project has recently transitioned from Bun to **`esbuild` and `node`**. The `package.json` contains the most up-to-date commands.

### Building the Project

The project is written in TypeScript and must be compiled to CommonJS (`.cjs`) before running.

-   **Build everything**:
    ```bash
    npm run build:all
    ```
    This command compiles `src/index.ts`, `src/stdio-server.ts`, and `src/http-server.ts` into the `dist/` directory.

### Running the Server

-   **Run the main HTTP/WebSocket server**:
    ```bash
    npm run start
    ```
-   **Run the STDIO-only server**:
    ```bash
    npm run start:stdio
    ```

### Testing

-   **Run all tests**:
    ```bash
    bun test
    ```
    *Note: The test runner is still `bun test` even though the runtime is Node.*

### Smithery Integration

Smithery is used for deployment and local development testing.

-   **Run the server in a Smithery-like environment**:
    ```bash
    npx @smithery/cli playground-stdio -- npm run start:stdio
    ```
    This is the most important command for debugging deployment issues. It simulates how the Smithery platform will run the STDIO server.

## 3. Code Conventions & Patterns

### Module System: CommonJS

The entire project is being converted from ESM to **CommonJS (CJS)** to ensure compatibility with the Smithery runtime.

-   **DO NOT** use `.js` extensions in `import` or `export` statements.
    ```typescript
    // Correct
    import { MCPServer } from '../mcp/MCPServer';

    // Incorrect
    import { MCPServer } from '../mcp/MCPServer.js';
    ```
-   The build process (`esbuild`) is configured to output `.cjs` files. Ensure `package.json` scripts reflect this.

### Configuration

-   Configuration is managed via environment variables, loaded by `dotenv`.
-   The `src/config.ts` file is responsible for parsing and validating environment variables.

### Error Handling

-   The project uses `winston` for logging. Use the logger from `src/utils/logger.ts` instead of `console.log`.
-   When catching errors, always check if the error is an `instanceof Error` before accessing properties like `message`.

    ```typescript
    try {
      // ...
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logger.error(`Something went wrong: ${errorMessage}`);
    }
    ```

## 4. Key Dependencies

-   **`express`**: The web server framework.
-   **`fastmcp`**: Used in `stdio-server.ts` and `http-server.ts` for a lightweight MCP implementation. Note that `src/index.ts` uses a custom, more complex MCP server implementation.
-   **`esbuild`**: The build tool for compiling TypeScript to CommonJS.
-   **`winston`**: The logging library.
-   **`ws`**: The WebSocket client for connecting to Home Assistant.
