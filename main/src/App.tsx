import React from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from "react-router-dom";
import ChatUI from "./components/ChatUI";
import EnhancedDashboard from "./components/EnhancedDashboard";
import IDEInterface from "./components/IDEInterface";
import DrawingBoard from "./components/DrawingBoard";
import MatrixRain from "./components/MatrixRain";

// Main App component
function Shell() {
  const location = useLocation();
  const showCenteredText = location.pathname === "/" || location.pathname === "/home";
  return (
    <div className="relative min-h-screen text-white">
      <MatrixRain showText={showCenteredText} />
      <div className="relative z-10">
        <nav className="bg-gray-800/60 backdrop-blur p-4 flex gap-4 border-b border-gray-700">
          <Link to="/dashboard" className="px-3 py-2 rounded hover:bg-gray-700 transition-colors">📊 Dashboard</Link>
          <Link to="/chat" className="px-3 py-2 rounded hover:bg-gray-700 transition-colors">💬 Chat</Link>
          <Link to="/ide" className="px-3 py-2 rounded hover:bg-gray-700 transition-colors">🔧 IDE</Link>
          <Link to="/drawing-board" className="px-3 py-2 rounded hover:bg-gray-700 transition-colors">🎨 DB</Link>
        </nav>
        <div className="p-4">
          <Routes>
            <Route path="/dashboard" element={<EnhancedDashboard />} />
            <Route path="/chat" element={<ChatUI />} />
            <Route path="/ide" element={<IDEInterface />} />
            <Route path="/drawing-board" element={<DrawingBoard />} />
            <Route path="/" element={<div />} />
            <Route path="*" element={<EnhancedDashboard />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Shell />
    </Router>
  );
}