#!/bin/bash

# macos-setup.sh

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}Setting up MCP Integration for Claude Desktop${NC}"

# Function to compare version numbers
version_greater_equal() {
    printf '%s\n' "$2" "$1" | sort -V -C
}

# Check if Homebrew is installed
if ! command -v brew &> /dev/null; then
    echo -e "${RED}Homebrew is not installed. Installing Homebrew...${NC}"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
fi

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed. Installing via Homebrew...${NC}"
    brew install node@20
    brew link node@20
else
    NODE_VERSION=$(node -v)
    if ! version_greater_equal "${NODE_VERSION//v/}" "20.10.0"; then
        echo -e "${RED}Node.js version must be 20.10.0 or higher. Current version: $NODE_VERSION${NC}"
        echo -e "${BLUE}Installing Node.js 20 via Homebrew...${NC}"
        brew install node@20
        brew link node@20
    fi
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${RED}npm is not installed. Please install npm and try again.${NC}"
    exit 1
fi

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo -e "${RED}jq is not installed. Installing via Homebrew...${NC}"
    brew install jq
fi

# Create MCP directory if it doesn't exist
MCP_DIR="$HOME/.mcp"
mkdir -p "$MCP_DIR"

# Clone the Home Assistant MCP repository
echo -e "${BLUE}Cloning Home Assistant MCP repository...${NC}"
git clone https://github.com/jango-blockchained/homeassistant-mcp.git "$MCP_DIR/homeassistant-mcp"
cd "$MCP_DIR/homeassistant-mcp"

# Install dependencies and build
echo -e "${BLUE}Installing dependencies and building...${NC}"
npm install
npm run build

# Create Claude Desktop config directory (macOS specific path)
CLAUDE_CONFIG_DIR="$HOME/Library/Application Support/Claude"
mkdir -p "$CLAUDE_CONFIG_DIR"

# Prompt for configurations
echo -e "${BLUE}Please enter your configurations:${NC}"
read -p "Home Assistant URL (e.g., http://homeassistant.local:8123): " HASS_HOST
read -p "Home Assistant Long-lived access token: " HASS_TOKEN

# Create .env file for Home Assistant
cat > "$MCP_DIR/homeassistant-mcp/.env" << EOL
NODE_ENV=production
HASS_HOST=$HASS_HOST
HASS_TOKEN=$HASS_TOKEN
PORT=3000
EOL

# Create base configuration for Home Assistant
CONFIG_JSON='{
  "mcpServers": {
    "homeassistant": {
      "command": "node",
      "args": [
        "'$MCP_DIR'/homeassistant-mcp/dist/index.js"
      ],
      "env": {
        "HASS_TOKEN": "'$HASS_TOKEN'",
        "HASS_HOST": "'$HASS_HOST'",
        "NODE_ENV": "production",
        "PORT": "3000"
      }
    }
  }
}'

# Prompt for enabling Brave Search
read -p "Do you want to enable Brave Search integration? (y/n): " ENABLE_BRAVE_SEARCH

if [[ $ENABLE_BRAVE_SEARCH =~ ^[Yy]$ ]]; then
    # Install Brave Search MCP globally only if enabled
    echo -e "${BLUE}Installing Brave Search MCP...${NC}"
    npm install -g @modelcontextprotocol/server-brave-search
    
    read -p "Brave Search API Key: " BRAVE_API_KEY
    
    # Add Brave Search to the configuration
    CONFIG_JSON=$(echo $CONFIG_JSON | jq '.mcpServers += {
      "brave-search": {
        "command": "npx",
        "args": ["-y", "@modelcontextprotocol/server-brave-search"],
        "env": {
          "BRAVE_API_KEY": "'$BRAVE_API_KEY'"
        }
      }
    }')
fi

# Write the final configuration to file
echo $CONFIG_JSON | jq '.' > "$CLAUDE_CONFIG_DIR/claude_desktop_config.json"

# Set proper permissions
chmod 600 "$CLAUDE_CONFIG_DIR/claude_desktop_config.json"
chmod 600 "$MCP_DIR/homeassistant-mcp/.env"

echo -e "${GREEN}Installation complete!${NC}"
echo -e "${BLUE}Configuration files created at:${NC}"
echo " - $CLAUDE_CONFIG_DIR/claude_desktop_config.json"
echo " - $MCP_DIR/homeassistant-mcp/.env"
echo -e "${BLUE}To use the integration:${NC}"
echo "1. Make sure Claude Desktop is installed from https://claude.ai/download"
echo "2. Restart Claude Desktop"
echo "3. Home Assistant MCP integration is now available"
if [[ $ENABLE_BRAVE_SEARCH =~ ^[Yy]$ ]]; then
    echo "4. Brave Search MCP integration is also available"
fi
echo -e "${RED}Note: Keep your access tokens and API keys secure and never share them with others${NC}"

# Optional: Test the installations
read -p "Would you like to test the installations? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}Testing Home Assistant MCP connection...${NC}"
    node "$MCP_DIR/homeassistant-mcp/dist/index.js" test
    if [[ $ENABLE_BRAVE_SEARCH =~ ^[Yy]$ ]]; then
        echo -e "${BLUE}Testing Brave Search MCP...${NC}"
        npx @modelcontextprotocol/server-brave-search test
    fi
fi 