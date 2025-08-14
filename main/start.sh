#!/bin/bash

echo "🚀 JRVI Copilot Fullstack Starter"
echo "================================="
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    echo ""
fi

# Build the frontend if dist doesn't exist
if [ ! -d "dist" ]; then
    echo "🏗️ Building frontend..."
    npm run build
    echo ""
fi

echo "✅ Setup complete!"
echo ""
echo "🌟 Available Commands:"
echo "  npm run start         - Production server (frontend + backend)"
echo "  npm run dev:fullstack - Development with hot reload"
echo "  npm run server        - Backend only"
echo "  npm run dev           - Frontend only"
echo ""
echo "📡 API Endpoints (when server is running):"
echo "  http://localhost:3001/api/status      - System status"
echo "  http://localhost:3001/api/health      - Health check"
echo "  http://localhost:3001/api/dashboard   - Dashboard data"
echo "  http://localhost:3001/api/execute     - Code execution"
echo "  http://localhost:3001/api/chat/messages - Chat API"
echo ""
echo "🎯 Ready for GitHub Copilot enhancement!"
echo ""
echo "To start: npm run start"
