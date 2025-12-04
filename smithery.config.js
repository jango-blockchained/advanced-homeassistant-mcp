/**
 * Smithery Build Configuration
 * 
 * This configuration file optimizes the build process for Smithery deployment.
 * It handles external dependencies and build options for the MCP server.
 * 
 * @see https://smithery.ai/docs/build/deployments/typescript
 */

export default {
  esbuild: {
    // Externalize packages that should be loaded at runtime
    // These are either native modules, SDK packages, or have ESM/CJS bundling issues
    external: [
      // MCP SDK - loaded at runtime via require() to avoid ESM bundling issues
      "@modelcontextprotocol/sdk",
      "@modelcontextprotocol/sdk/server/mcp.js",
      
      // Smithery SDK - should be loaded at runtime
      "@smithery/sdk",
      
      // FastMCP - loaded at runtime
      "fastmcp",
      
      // Native binary modules - cannot be bundled
      "fsevents",
      "bufferutil", 
      "utf-8-validate",
      "better-sqlite3",
      "node-record-lpcm16",
      
      // Heavy dependencies that work better at runtime
      "winston",
      "winston-daily-rotate-file",
    ],
    
    // Enable minification for smaller bundle size
    minify: true,
    
    // Target Node.js 18+ (matches Smithery runtime)
    target: "node18",
    
    // Use ESM format for better compatibility
    format: "esm",
  },
};
