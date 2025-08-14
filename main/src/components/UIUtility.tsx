import React from 'react';

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-gray-800/70 border border-gray-700 rounded p-4 ${className}`}>{children}</div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-4">
      <h3 className="text-sm font-semibold text-gray-200 mb-2">{title}</h3>
      {children}
    </section>
  );
}
