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
