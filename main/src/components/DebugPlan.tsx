import React, { useState, useEffect } from "react";

interface PlanData {
  projectName: string;
  version: string;
  lastUpdated: string;
  currentPhase: string;
  status: string;
  components: Record<string, any>;
  roadmap: Record<string, any>;
  priorityItems: Array<any>;
  technicalDebt: string[];
  blockers: any[];
  resources: Record<string, string>;
}

export default function DebugPlan() {
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/debug/plan')
      .then(response => response.json())
      .then(data => {
        setPlanData(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div className="p-8">Loading plan data...</div>;
  }

  if (error) {
    return <div className="p-8 text-red-400">Error: {error}</div>;
  }

  if (!planData) {
    return <div className="p-8">No plan data available</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-blue-400">🤖 Copilot Development Plan</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-green-400">Project Overview</h2>
          <p><strong>Name:</strong> {planData.projectName}</p>
          <p><strong>Version:</strong> {planData.version}</p>
          <p><strong>Current Phase:</strong> {planData.currentPhase}</p>
          <p><strong>Status:</strong> <span className="text-yellow-400">{planData.status}</span></p>
          <p><strong>Last Updated:</strong> {new Date(planData.lastUpdated).toLocaleString()}</p>
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-purple-400">Component Progress</h2>
          {Object.entries(planData.components).map(([key, component]: [string, any]) => (
            <div key={key} className="mb-3">
              <div className="flex justify-between">
                <span className="capitalize">{key}</span>
                <span className="text-sm text-gray-400">{component.progress}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${component.progress}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-orange-400">Priority Items</h2>
          {planData.priorityItems.map((item, index) => (
            <div key={item.id} className="mb-3 p-3 bg-gray-700 rounded">
              <div className="flex justify-between items-start">
                <span className="font-medium">{item.title}</span>
                <span className={`px-2 py-1 rounded text-xs ${
                  item.priority === 'high' ? 'bg-red-600' : 
                  item.priority === 'medium' ? 'bg-yellow-600' : 'bg-blue-600'
                }`}>
                  {item.priority}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">
                {item.category} • Due: {item.dueDate}
              </p>
            </div>
          ))}
        </div>

        <div className="bg-gray-800 p-6 rounded-lg">
          <h2 className="text-xl font-semibold mb-4 text-cyan-400">Technical Debt</h2>
          <ul className="space-y-2">
            {planData.technicalDebt.map((debt, index) => (
              <li key={index} className="flex items-center">
                <span className="text-yellow-500 mr-2">⚠️</span>
                {debt}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-8 bg-gray-800 p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4 text-indigo-400">Roadmap Phases</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(planData.roadmap).map(([key, phase]: [string, any]) => (
            <div key={key} className="bg-gray-700 p-4 rounded">
              <h3 className="font-semibold text-lg mb-2">
                {phase.name}
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  phase.status === 'current' ? 'bg-green-600' : 
                  phase.status === 'upcoming' ? 'bg-blue-600' : 'bg-gray-600'
                }`}>
                  {phase.status}
                </span>
              </h3>
              <p className="text-sm text-gray-400 mb-3">{phase.estimatedCompletion}</p>
              <ul className="text-sm space-y-1">
                {phase.tasks.map((task: string, index: number) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-2">
                      {task.startsWith('✓') ? '✓' : task.startsWith('⏳') ? '⏳' : '•'}
                    </span>
                    <span className={task.startsWith('✓') ? 'line-through text-gray-500' : ''}>
                      {task.replace(/^[✓⏳•]\s*/, '')}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 text-center">
        <pre className="bg-gray-900 p-4 rounded text-xs text-left overflow-auto">
          {JSON.stringify(planData, null, 2)}
        </pre>
      </div>
    </div>
  );
}