# Use Bun as base for building
FROM oven/bun:1-slim as builder

# Set working directory
WORKDIR /app

# Install Python and other dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Create and activate virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV VIRTUAL_ENV="/opt/venv"

# Upgrade pip in virtual environment
RUN /opt/venv/bin/python -m pip install --upgrade pip

# Install Python packages in virtual environment
RUN /opt/venv/bin/python -m pip install --no-cache-dir numpy scipy

# Copy package.json and bun.lock and install dependencies
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts

# Install ts-node for running TypeScript directly
RUN bun add ts-node --dev --ignore-scripts

# Copy source files (skip TypeScript compilation for now)
COPY src ./src
COPY tsconfig*.json ./

# Create a smaller production image
FROM oven/bun:1-slim as runner

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    alsa-utils \
    pulseaudio \
    && rm -rf /var/lib/apt/lists/*

# Configure ALSA
COPY docker/speech/asound.conf /etc/asound.conf

# Create and activate virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
ENV VIRTUAL_ENV="/opt/venv"

# Upgrade pip in virtual environment
RUN /opt/venv/bin/python -m pip install --upgrade pip

# Install Python packages in virtual environment
RUN /opt/venv/bin/python -m pip install --no-cache-dir numpy scipy

# Create a non-root user and add to audio group
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --gid 1001 bunjs && \
    adduser bunjs audio

WORKDIR /app

# Copy Python virtual environment from builder
COPY --from=builder --chown=bunjs:nodejs /opt/venv /opt/venv

# Copy source files
COPY --chown=bunjs:nodejs . .

# Copy only the necessary files from builder (skip dist since we're not compiling)
COPY --from=builder --chown=bunjs:nodejs /app/node_modules ./node_modules

# Ensure audio setup script is executable
RUN chmod +x /app/docker/speech/setup-audio.sh

# Create logs and audio directories with proper permissions
RUN mkdir -p /app/logs /app/audio && chown -R bunjs:nodejs /app/logs /app/audio

# Switch to non-root user
USER bunjs

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:4000/health || exit 1

# Expose port
EXPOSE ${PORT:-4000}

# Start the application with audio setup
CMD ["/bin/bash", "-c", "(/app/docker/speech/setup-audio.sh 2>&1 &) && bun run src/index.ts"] 