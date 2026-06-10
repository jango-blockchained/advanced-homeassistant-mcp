# Use Bun as base for building
FROM oven/bun:1-slim as builder

# Set working directory
WORKDIR /app

# Copy package.json and bun.lock and install dependencies
COPY package.json bun.lock ./
RUN bun install --ignore-scripts

# Copy source files
COPY src ./src
COPY tsconfig*.json ./

# Build the application (compile TypeScript to JavaScript)
RUN bun run build && bun run build:stdio && bun run build:http

# Create a smaller production image
FROM oven/bun:1-slim as runner

# Install only the system deps we actually need at runtime
# (curl for HEALTHCHECK; no Python/audio — those belong in docker-compose.speech.yml)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --gid 1001 bunjs

WORKDIR /app

# Copy built artifacts and production node_modules from builder
COPY --from=builder --chown=bunjs:nodejs /app/dist ./dist
COPY --from=builder --chown=bunjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=bunjs:nodejs /app/package.json ./package.json

# Create logs directory with proper permissions
RUN mkdir -p /app/logs && chown -R bunjs:nodejs /app/logs

# Switch to non-root user
USER bunjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:${PORT:-7123}/health || exit 1

# Set the default host to 0.0.0.0 so it's accessible externally outside of this container
ENV HOST=0.0.0.0

# Expose port (default 7123 for Smithery, can be overridden)
EXPOSE ${PORT:-7123}

# Start the HTTP MCP server
CMD ["bun", "run", "dist/http-server.mjs"]
