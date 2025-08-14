import React from "react";
import { useLocation } from "react-router-dom";

export default function SimpleIDETest() {
  const location = useLocation();
  
  return (
    <div className="p-8 bg-white">
      <h1 className="text-2xl font-bold text-gray-900 mb-4">
        JRVI IDE Phase 14 - Simple Test
      </h1>
      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-yellow-800">
          <strong>Debug Info:</strong> Current pathname: {location.pathname}
        </p>
      </div>
      <p className="text-gray-600">
        This is a simple test to verify the IDE component can render.
      </p>
      <div className="mt-4 p-4 bg-blue-50 rounded">
        <h2 className="text-lg font-semibold text-blue-900">Phase 14 Features</h2>
        <ul className="mt-2 space-y-1 text-blue-800">
          <li>• Scaffold Generator</li>
          <li>• File Explorer</li>
          <li>• Approval Workflow</li>
          <li>• Enhanced Audit System</li>
        </ul>
      </div>
    </div>
  );
}