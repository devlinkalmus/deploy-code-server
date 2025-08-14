import React from 'react';

export default function SuggestionsPanel() {
  return (
    <aside className="bg-gray-800/70 border border-gray-700 rounded p-3 text-gray-300">
      <div className="text-sm font-medium">Suggestions</div>
      <ul className="mt-2 text-xs list-disc list-inside space-y-1">
        <li>Connect persona-aware tips</li>
        <li>Expose quick plugin actions</li>
        <li>Show context diffs</li>
      </ul>
    </aside>
  );
}
