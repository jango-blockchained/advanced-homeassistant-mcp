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
    external: [
      // MCP SDK - loaded at runtime via require() to avoid ESM bundling issues
      "@modelcontextprotocol/sdk",
      "@modelcontextprotocol/sdk/server/mcp.js",
      
      // Native binary modules
      "fsevents",
      "bufferutil", 
      "utf-8-validate",
      "better-sqlite3",
      "node-record-lpcm16",
    ],
    
    // Enable minification for smaller bundle
    minify: true,
    
    // Target Node.js 18+
    target: "node18",
  },
};
