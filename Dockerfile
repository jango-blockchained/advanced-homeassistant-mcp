# Use Node.js 20 as the base image
FROM node:20-slim

# Install curl for healthcheck
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy source code first
COPY . .

# Install dependencies
RUN npm install

# Build TypeScript
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/src/index.js"] 