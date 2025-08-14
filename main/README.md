# JRVI Copilot Fullstack Starter

![CI](https://github.com/devlinkalmus/jrvi/actions/workflows/ci.yml/badge.svg)

A modern fullstack application with React frontend and Express backend, featuring a comprehensive JRVI HUD/Dashboard interface.

## 🚀 Quick Start

### Option 1: GitHub Codespaces (Recommended)
```bash
git clone https://github.com/devlinkalmus/jrvi.git
cd jrvi
npm install
npm run start
```

### Option 2: Local Development
```bash
git clone https://github.com/devlinkalmus/jrvi.git
cd jrvi
npm install
npm run dev:fullstack
```

## ✅ Features

### JRVI HUD/Dashboard Interface
- **Comprehensive Dashboard** - Full JRVI HUD with sidebar navigation and integrated panels
- **Sidebar Navigation** - Agents, Memory Pulse, Forecasts, Sandbox Logs, Replay Editor, Kernels, Plugins, Settings
- **Top Bar Interface** - Brand name, persona avatar, real-time system time, voice toggle controls
- **Animated Graphs** - Memory pulse visualization and logic forecasts with real-time data
- **Plugin Monitor** - Health status, version info, and fallback toggles for all system plugins
- **Integrated Chat Panel** - Always-visible AI chat interface using backend chat logic
- **ShadCN UI Components** - Modern, accessible UI components for all interface elements

### Frontend (React + TypeScript + Tailwind + ShadCN UI)
- **JRVI HUD Dashboard** - Complete management interface with real-time monitoring
- **Memory Pulse Visualization** - Animated graphs showing memory operations and neural activity
- **Plugin Management** - Interactive plugin health monitoring with toggles and metrics
- **Agent Management** - Monitor and control AI agents with status indicators
- **Chat Interface** - Enhanced AI chat with persona support and message details
- **Responsive Design** - Mobile-friendly collapsible sidebar and adaptive layouts

### Backend (Express + Node.js)
- **RESTful API** endpoints for all frontend features
- **Chat Logic Engine** - AI response generation and message persistence
- **Plugin System** - Health monitoring and fallback management
- **Enhanced Logging** - Comprehensive system logging with universal logger
- **CORS enabled** for cross-origin requests

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | System status and health metrics |
| `/api/health` | GET | Server health check |
| `/api/chat` | POST | Enhanced chat with persona support |
| `/api/personas` | GET | Available AI personas |
| `/api/memory/stats` | GET | Memory system statistics |
| `/api/system/plugins` | GET | Plugin registry and health data |

## 🛠 Development Scripts

```bash
# Start both frontend and backend for production
npm run start

# Development mode with hot reload
npm run dev:fullstack

# Frontend only (Vite dev server)
npm run dev

# Backend only (Express server)
npm run server:dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗 Project Structure

```
jrvi/
├── src/                     # React frontend
│   ├── components/          # React components
│   │   ├── ui/             # ShadCN UI base components
│   │   ├── JRVIHUD.tsx     # Main HUD dashboard
│   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   ├── TopBar.tsx      # Top status bar
│   │   ├── MemoryPulse.tsx # Memory visualization
│   │   ├── PluginMonitor.tsx # Plugin management
│   │   └── ChatUI.tsx      # Enhanced chat interface
│   ├── lib/                # Utilities and helpers
│   │   └── utils.ts        # ShadCN utilities
│   ├── App.tsx             # Main app with HUD
│   └── main.tsx            # React entry point
├── server/                 # Express backend
│   ├── index.js            # API server with enhanced logging
│   ├── logger.js           # Universal logging system
│   └── kernel.js           # Kernel enforcement system
├── dist/                   # Production build output
└── package.json            # Dependencies and scripts
```

## 🔧 Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling framework
- **ShadCN UI** - Modern component library
- **Lucide React** - Beautiful icons
- **Vite** - Build tool and dev server

### Backend
- **Express.js** - Web framework
- **Node.js** - Runtime environment
- **Universal Logger** - Enhanced logging system
- **CORS** - Cross-origin resource sharing
- **Nodemon** - Development auto-restart

## 🎯 JRVI HUD Features

### Comprehensive Dashboard
- **Multi-panel Interface** - Sidebar navigation with 8 main sections
- **Real-time Monitoring** - Live system metrics and health indicators
- **Responsive Design** - Collapsible sidebar for mobile and desktop
- **Always-visible Chat** - Integrated AI assistant panel

### Memory Pulse Visualization
- **Animated Graphs** - Real-time memory activity visualization
- **Statistics Overview** - Total memories, STM/LTM breakdown, importance metrics
- **Activity Timeline** - Recent memory operations with categorization
- **Load Distribution** - Visual progress bars for memory utilization

### Plugin Management
- **Health Monitoring** - Visual status indicators (healthy/warning/error)
- **Version Tracking** - Current version display and update information
- **Fallback Controls** - Toggle fallback modes for each plugin
- **Performance Metrics** - Response times and error counts
- **Interactive Controls** - Enable/disable plugins with immediate feedback

### Agent Management
- **Status Monitoring** - Active, busy, idle states with visual indicators
- **Task Tracking** - Current active tasks and workload
- **Uptime Statistics** - System reliability metrics
- **Agent Controls** - Management interface for AI agents

## 🚀 Deployment

### Quick Deploy Commands
```bash
# Build the frontend
npm run build

# Start production server
npm run start
```

The production build serves the React app from the Express server at `http://localhost:3001`.

### Railway Deployment

1. Push to GitHub (main). Dockerfile is auto-detected.
2. In Railway: New Project → Deploy from GitHub → select this repo.
3. Health check path: `/api/health`. PORT is provided by Railway automatically.
4. Optional: set `NODE_ENV=production` in Railway Variables.

## 📝 Environment Variables

Create a `.env` file in the root directory:
```env
PORT=3001
NODE_ENV=production
```

## 🎨 UI Components

The application uses ShadCN UI components for a modern, accessible interface:
- **Tabs** - Navigation and content organization
- **Cards** - Content containers with headers and descriptions
- **Buttons** - Interactive elements with variants
- **Switches** - Toggle controls for plugins and features
- **Progress** - Visual progress indicators
- **Avatars** - User and persona representations
- **Badges** - Status and category indicators

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `npm run dev:fullstack`
5. Submit a pull request

## 📄 License

MIT License - feel free to use this starter for your projects!

---

**Made with ❤️ for GitHub Copilot developers**

*Featuring the complete JRVI HUD/Dashboard interface with real-time monitoring, plugin management, and AI chat integration.*
A modern fullstack application with React frontend and Express backend, featuring a comprehensive JRVI HUD/Dashboard interface.

## 🚀 Quick Start

### Option 1: GitHub Codespaces (Recommended)
```bash
git clone https://github.com/devlinkalmus/jrvi.git
cd jrvi
npm install
npm run start
```

### Option 2: Local Development
```bash
git clone https://github.com/devlinkalmus/jrvi.git
cd jrvi
npm install
npm run dev:fullstack
```

## ✅ Features

### JRVI HUD/Dashboard Interface
- **Comprehensive Dashboard** - Full JRVI HUD with sidebar navigation and integrated panels
- **Sidebar Navigation** - Agents, Memory Pulse, Forecasts, Sandbox Logs, Replay Editor, Kernels, Plugins, Settings
- **Top Bar Interface** - Brand name, persona avatar, real-time system time, voice toggle controls
- **Animated Graphs** - Memory pulse visualization and logic forecasts with real-time data
- **Plugin Monitor** - Health status, version info, and fallback toggles for all system plugins
- **Integrated Chat Panel** - Always-visible AI chat interface using backend chat logic
- **ShadCN UI Components** - Modern, accessible UI components for all interface elements

### Frontend (React + TypeScript + Tailwind + ShadCN UI)
- **JRVI HUD Dashboard** - Complete management interface with real-time monitoring
- **Memory Pulse Visualization** - Animated graphs showing memory operations and neural activity
- **Plugin Management** - Interactive plugin health monitoring with toggles and metrics
- **Agent Management** - Monitor and control AI agents with status indicators
- **Chat Interface** - Enhanced AI chat with persona support and message details
- **Responsive Design** - Mobile-friendly collapsible sidebar and adaptive layouts

### Backend (Express + Node.js)
- **RESTful API** endpoints for all frontend features
- **Chat Logic Engine** - AI response generation and message persistence
- **Plugin System** - Health monitoring and fallback management
- **Enhanced Logging** - Comprehensive system logging with universal logger
- **CORS enabled** for cross-origin requests

## 📡 API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/status` | GET | System status and health metrics |
| `/api/health` | GET | Server health check |
| `/api/chat` | POST | Enhanced chat with persona support |
| `/api/personas` | GET | Available AI personas |
| `/api/memory/stats` | GET | Memory system statistics |
| `/api/system/plugins` | GET | Plugin registry and health data |

## 🛠 Development Scripts

```bash
# Start both frontend and backend for production
npm run start

# Development mode with hot reload
npm run dev:fullstack

# Frontend only (Vite dev server)
npm run dev

# Backend only (Express server)
npm run server:dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🏗 Project Structure

```
jrvi/
├── src/                     # React frontend
│   ├── components/          # React components
│   │   ├── ui/             # ShadCN UI base components
│   │   ├── JRVIHUD.tsx     # Main HUD dashboard
│   │   ├── Sidebar.tsx     # Navigation sidebar
│   │   ├── TopBar.tsx      # Top status bar
│   │   ├── MemoryPulse.tsx # Memory visualization
│   │   ├── PluginMonitor.tsx # Plugin management
│   │   └── ChatUI.tsx      # Enhanced chat interface
│   ├── lib/                # Utilities and helpers
│   │   └── utils.ts        # ShadCN utilities
│   ├── App.tsx             # Main app with HUD
│   └── main.tsx            # React entry point
├── server/                 # Express backend
│   ├── index.js            # API server with enhanced logging
│   ├── logger.js           # Universal logging system
│   └── kernel.js           # Kernel enforcement system
├── dist/                   # Production build output
└── package.json            # Dependencies and scripts
```

## 🔧 Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling framework
- **ShadCN UI** - Modern component library
- **Lucide React** - Beautiful icons
- **Vite** - Build tool and dev server

### Backend
- **Express.js** - Web framework
- **Node.js** - Runtime environment
- **Universal Logger** - Enhanced logging system
- **CORS** - Cross-origin resource sharing
- **Nodemon** - Development auto-restart

## 🎯 JRVI HUD Features

### Comprehensive Dashboard
- **Multi-panel Interface** - Sidebar navigation with 8 main sections
- **Real-time Monitoring** - Live system metrics and health indicators
- **Responsive Design** - Collapsible sidebar for mobile and desktop
- **Always-visible Chat** - Integrated AI assistant panel

### Memory Pulse Visualization
- **Animated Graphs** - Real-time memory activity visualization
- **Statistics Overview** - Total memories, STM/LTM breakdown, importance metrics
- **Activity Timeline** - Recent memory operations with categorization
- **Load Distribution** - Visual progress bars for memory utilization

### Plugin Management
- **Health Monitoring** - Visual status indicators (healthy/warning/error)
- **Version Tracking** - Current version display and update information
- **Fallback Controls** - Toggle fallback modes for each plugin
- **Performance Metrics** - Response times and error counts
- **Interactive Controls** - Enable/disable plugins with immediate feedback

### Agent Management
- **Status Monitoring** - Active, busy, idle states with visual indicators
- **Task Tracking** - Current active tasks and workload
- **Uptime Statistics** - System reliability metrics
- **Agent Controls** - Management interface for AI agents

## 🚀 Deployment

### Quick Deploy Commands
```bash
# Build the frontend
npm run build

# Start production server
npm run start
```

The production build serves the React app from the Express server at `http://localhost:3001`.

## 📝 Environment Variables

Create a `.env` file in the root directory:
```env
PORT=3001
NODE_ENV=production
```

## 🎨 UI Components

The application uses ShadCN UI components for a modern, accessible interface:
- **Tabs** - Navigation and content organization
- **Cards** - Content containers with headers and descriptions
- **Buttons** - Interactive elements with variants
- **Switches** - Toggle controls for plugins and features
- **Progress** - Visual progress indicators
- **Avatars** - User and persona representations
- **Badges** - Status and category indicators

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test with `npm run dev:fullstack`
5. Submit a pull request

## 📄 License

MIT License - feel free to use this starter for your projects!

---

**Made with ❤️ for GitHub Copilot developers**

*Featuring the complete JRVI HUD/Dashboard interface with real-time monitoring, plugin management, and AI chat integration.*
