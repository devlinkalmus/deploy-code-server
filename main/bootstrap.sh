#!/bin/bash

set -e

mkdir -p src/components
mkdir -p src/kernels
mkdir -p src/context

# App and entry
cat > src/App.tsx <<'EOT'
import React from "react";
import { BrowserRouter as Router, Routes, Route, Link } from "react-router-dom";
import ChatUI from "./components/ChatUI";
import Dashboard from "./components/Dashboard";
import IDEInterface from "./components/IDEInterface";

export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-900 text-white">
        <nav className="bg-gray-800 p-4 flex gap-4">
          <Link to="/dashboard" className="hover:underline">Dashboard</Link>
          <Link to="/chat" className="hover:underline">Chat</Link>
          <Link to="/ide" className="hover:underline">IDE</Link>
        </nav>
        <Routes>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/chat" element={<ChatUI />} />
          <Route path="/ide" element={<IDEInterface />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </div>
    </Router>
  );
}
EOT

cat > src/main.tsx <<'EOT'
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOT

cat > src/index.css <<'EOT'
@tailwind base;
@tailwind components;
@tailwind utilities;
EOT

cat > tailwind.config.js <<'EOT'
module.exports = {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
};
EOT

cat > postcss.config.js <<'EOT'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
EOT

cat > tsconfig.json <<'EOT'
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "strict": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "jsx": "react-jsx",
    "noEmit": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "allowSyntheticDefaultImports": true
  },
  "include": ["src"]
}
EOT

cat > tsconfig.node.json <<'EOT'
{
  "compilerOptions": {
    "composite": true,
    "module": "ESNext",
    "moduleResolution": "Node",
    "allowSyntheticDefaultImports": true
  },
  "include": ["vite.config.ts"]
}
EOT

cat > package.json <<'EOT'
{
  "name": "jrvi-app",
  "version": "1.0.0",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-router-dom": "^6.14.1"
  },
  "devDependencies": {
    "@types/react": "^18.2.6",
    "@types/react-dom": "^18.2.4",
    "@vitejs/plugin-react": "^4.0.0",
    "autoprefixer": "^10.4.15",
    "postcss": "^8.4.24",
    "tailwindcss": "^3.3.2",
    "typescript": "^5.1.6",
    "vite": "^4.3.9"
  }
}
EOT

cat > vite.config.ts <<'EOT'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000
  }
});
EOT

cat > index.html <<'EOT'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>JRVI</title>
  </head>
  <body class="bg-black text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
EOT

cat > .env.example <<'EOT'
OPENAI_KEY=your_openai_key_here
CLAUDE_KEY=your_claude_key_here
GEMINI_KEY=your_gemini_key_here
EOT

# Components
cat > src/components/Navigation.tsx <<'EOT'
import React from "react";
import { Link } from "react-router-dom";

export default function Navigation() {
  return (
    <nav className="bg-gray-800 p-4 flex gap-4">
      <Link to="/dashboard" className="hover:underline">Dashboard</Link>
      <Link to="/chat" className="hover:underline">Chat</Link>
      <Link to="/ide" className="hover:underline">IDE</Link>
    </nav>
  );
}
EOT

cat > src/components/ChatUI.tsx <<'EOT'
import React from "react";
export default function ChatUI() {
  return <div>Chat UI Placeholder</div>;
}
EOT

cat > src/components/Dashboard.tsx <<'EOT'
import React from "react";
export default function Dashboard() {
  return <div>Dashboard Placeholder</div>;
}
EOT

cat > src/components/IDEInterface.tsx <<'EOT'
import React from "react";
export default function IDEInterface() {
  return <div>IDE Interface Placeholder</div>;
}
EOT

echo "✅ All files and folders created."
echo "👉 Next steps:"
echo "1. Run: npm install"
echo "2. Run: npm run dev"
echo "3. Open http://localhost:3000"
