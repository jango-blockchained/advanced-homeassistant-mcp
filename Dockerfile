# Use Node.js as base for building
FROM node:20-slim as builder

# Set working directory
WORKDIR /app

# Install bun with the latest version
RUN npm install -g bun@1.0.35

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

# Copy package.json and install dependencies
COPY package.json ./
RUN bun install --frozen-lockfile || bun install

# Copy source files and build
COPY src ./src
COPY tsconfig*.json ./
RUN bun build ./src/index.ts --target=bun --minify --outdir=./dist

# Create a smaller production image
FROM node:20-slim as runner

# Install bun in production image with the latest version
RUN npm install -g bun@1.0.35

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

# Copy only the necessary files from builder
COPY --from=builder --chown=bunjs:nodejs /app/dist ./dist
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
CMD ["/bin/bash", "-c", "/app/docker/speech/setup-audio.sh || echo 'Audio setup failed, continuing anyway' && bun --smol run fix-env.js"] 