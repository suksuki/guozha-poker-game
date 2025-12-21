#!/bin/bash

# =================================================================
# Guozha Poker Mobile - WSL Startup Script
# =================================================================

# Color codes for better visibility
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}==================================================${NC}"
echo -e "${BLUE}   Guozha Poker Mobile Development Environment   ${NC}"
echo -e "${BLUE}==================================================${NC}"

# 1. Get WSL IP Address
WSL_IP=$(hostname -I | awk '{print $1}')

if [ -z "$WSL_IP" ]; then
    echo -e "${YELLOW}Warning: Could not detect WSL IP address. Falling back to 0.0.0.0${NC}"
    WSL_IP="0.0.0.0"
fi

# 2. Check Node.js and NPM
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Error: Node.js is not installed. Please install Node.js (v18+) first.${NC}"
    exit 1
fi

NODE_VER=$(node -v)
echo -e "Node.js detected: ${GREEN}${NODE_VER}${NC}"

# 3. Check node_modules
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}node_modules not found. Running npm install...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}Error: npm install failed.${NC}"
        exit 1
    fi
    echo -e "${GREEN}Dependencies installed successfully.${NC}"
else
    echo -e "${GREEN}node_modules found.${NC}"
fi

# 4. Starting Dev Server
echo -e "${BLUE}Starting Vite development server on ${WSL_IP}...${NC}"
echo -e "${YELLOW}Access the app at: http://${WSL_IP}:5173${NC}"
echo -e "${BLUE}--------------------------------------------------${NC}"

# Run Vite dev server with host flag to ensure accessibility from Windows
npm run dev -- --host $WSL_IP
