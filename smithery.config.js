/**
 * Smithery Build Configuration
 * 
 * This configuration file optimizes the build process for Smithery deployment.
 * It handles external dependencies and build options for the MCP server.
 * 
 * @see https://smithery.ai/docs/build/deployments/typescript
 */

module.exports = {
  esbuild: {
    // Mark problematic packages as external to avoid bundling issues
    // These are either too large, have native dependencies, or are better loaded at runtime
    external: [
      // Large dependencies that should be loaded at runtime
      "@valibot/to-json-schema",
      "effect",
      
      // Native modules and binaries
      "fsevents",
      "bufferutil",
      "utf-8-validate",
      
      // FastMCP and MCP SDK - let runtime handle these
      "fastmcp",
      "@modelcontextprotocol/sdk",
      "@smithery/sdk",
      
      // Express and middleware stack
      "express",
      "swagger-ui-express",
      "helmet",
      "cors",
      
      // WebSocket libraries
      "ws",
      
      // Audio/Speech processing (optional features)
      "node-record-lpcm16",
      
      // OpenAPI and validation
      "openapi-types",
      "ajv",
      
      // XML processing
      "@xmldom/xmldom",
      
      // Anthropic and OpenAI SDKs
      "@anthropic-ai/sdk",
      "openai",
    ],
    
    // Enable minification for production
    minify: process.env.NODE_ENV === 'production',
    
    // Target Node.js 18+ as specified in package.json
    target: "node18",
    
    // Enable source maps for debugging
    sourcemap: true,
    
    // Platform configuration
    platform: "node",
    
    // Output format
    format: "esm",
  },
};
