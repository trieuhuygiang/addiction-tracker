#!/bin/bash

# Addiction Tracker - Complete Setup Script
# This script handles: dependency installation, .env setup, and database initialization

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Logging functions
info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
}

title() {
    echo ""
    echo -e "${BLUE}${1}${NC}"
    echo ""
}

# Check if running in correct directory
if [ ! -f "package.json" ]; then
    error "package.json not found. Please run this script from the project root directory."
    exit 1
fi

clear

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║         🧠 Addiction Tracker - Complete Setup 🔥             ║"
echo "║                    One Command Setup                          ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Step 1: Check and install dependencies
title "Step 1: Checking Dependencies"

if [ -d "node_modules" ]; then
    success "Dependencies already installed"
else
    info "Installing dependencies..."
    npm install
    if [ $? -eq 0 ]; then
        success "Dependencies installed"
    else
        error "Failed to install dependencies"
        exit 1
    fi
fi

# Step 2: Setup .env file
title "Step 2: Setting Up Environment Variables"

ENV_FILE=".env"
if [ -f "$ENV_FILE" ]; then
    success ".env file already exists"
else
    if [ -f ".env.example" ]; then
        info "Creating .env from .env.example..."
        cp .env.example "$ENV_FILE"
        success ".env file created"
        
        warn "Please edit .env with your database credentials:"
        info "  DB_HOST=localhost"
        info "  DB_PORT=5432"
        info "  DB_USER=tracker_user"
        info "  DB_PASSWORD=your_password"
        info "  DB_NAME=addiction_tracker"
        info "  SESSION_SECRET=<generated automatically>"
        echo ""
        read -p "Press Enter once you've configured .env, or Ctrl+C to cancel: "
    else
        error ".env.example not found"
        info "Creating default .env file..."
        cat > "$ENV_FILE" << 'ENVFILE'
# Application Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=tracker_user
DB_PASSWORD=tracker_password
DB_NAME=addiction_tracker

# Session Configuration
SESSION_SECRET=your_session_secret_here
ENVFILE
        warn "Please edit .env with your actual database credentials"
        read -p "Press Enter once you've configured .env, or Ctrl+C to cancel: "
    fi
fi

# Step 3: Initialize database
title "Step 3: Initializing Database"

info "Setting up database tables..."
if npm run setup > /dev/null 2>&1; then
    success "Database initialized"
else
    warn "Database setup may have failed - continuing anyway"
    warn "You may need to manually create tables or verify PostgreSQL is running"
fi

# Step 4: Start server
title "Step 4: Starting Server"

success "All setup complete! Starting server..."
echo ""
info "Your app will be available at: http://localhost:3000"
echo ""
info "💡 First time? Create an account and start logging your progress!"
echo ""

npm start
