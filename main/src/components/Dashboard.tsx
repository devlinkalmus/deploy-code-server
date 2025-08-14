import React, { useState, useEffect } from "react";

interface Task {
  name: string;
  status: string;
}

interface Milestone {
  id: string;
  name: string;
  status: string;
  progress: number;
  tasks: Task[];
}

interface TechnicalDebt {
  item: string;
  priority: string;
  estimatedEffort: string;
}

interface Dependencies {
  frontend: string[];
  backend: string[];
  planned: string[];
}

interface PlanData {
  projectName: string;
  version: string;
  currentPhase: string;
  lastUpdated: string;
  milestones: Milestone[];
  nextSteps: string[];
  technicalDebt: TechnicalDebt[];
  dependencies: Dependencies;
}

interface ApiResponse {
  success: boolean;
  timestamp: string;
  data: PlanData;
}

export default function Dashboard() {
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/debug/plan');
        const result: ApiResponse = await response.json();
        
        if (result.success) {
          setPlanData(result.data);
        } else {
          setError('Failed to fetch plan data');
        }
      } catch (err) {
        setError('Network error while fetching plan data');
      } finally {
        setLoading(false);
      }
    };

    fetchPlan();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <div className="bg-gray-800 rounded-lg shadow p-8 mb-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-white">Loading plan data...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-900 border border-red-600 rounded-lg p-4 mb-8">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-200">Error</h3>
              <div className="mt-2 text-sm text-red-300">{error}</div>
            </div>
          </div>
        </div>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!planData) {
    return (
      <div className="p-8">
        <div className="bg-gray-800 rounded-lg shadow p-8">
          <p className="text-white">No plan data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="bg-gray-800 rounded-lg shadow p-8 mb-8">
        <h1 className="text-3xl font-bold text-white mb-4">{planData.projectName} Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white">
          <div>
            <p className="text-gray-300">Version:</p>
            <p className="font-semibold">{planData.version}</p>
          </div>
          <div>
            <p className="text-gray-300">Current Phase:</p>
            <p className="font-semibold">{planData.currentPhase}</p>
          </div>
          <div>
            <p className="text-gray-300">Last Updated:</p>
            <p className="font-semibold">{new Date(planData.lastUpdated).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-white mb-4">Milestones</h2>
          <div className="space-y-4">
            {planData.milestones.map((milestone) => (
              <div key={milestone.id} className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-white">{milestone.name}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    milestone.status === 'completed' ? 'bg-green-600 text-white' :
                    milestone.status === 'in-progress' ? 'bg-yellow-600 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {milestone.status}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mb-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${milestone.progress}%` }}
                  ></div>
                </div>
                <p className="text-sm text-gray-300">{milestone.progress}% complete</p>
                <ul className="mt-2 space-y-1">
                  {milestone.tasks.map((task, index) => (
                    <li key={index} className="text-sm text-gray-400 flex items-center">
                      <span className={`w-2 h-2 rounded-full mr-2 ${
                        task.status === 'completed' ? 'bg-green-500' :
                        task.status === 'in-progress' ? 'bg-yellow-500' :
                        'bg-gray-500'
                      }`}></span>
                      {task.name}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-white mb-4">Next Steps</h2>
          <ul className="space-y-2">
            {planData.nextSteps.map((step, index) => (
              <li key={index} className="flex items-start text-gray-300">
                <span className="text-blue-500 mr-2">•</span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div className="bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-white mb-4">Technical Debt</h2>
          <div className="space-y-3">
            {planData.technicalDebt.map((debt, index) => (
              <div key={index} className="border border-gray-700 rounded p-3">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-white">{debt.item}</h3>
                  <span className={`px-2 py-1 rounded text-xs ${
                    debt.priority === 'high' ? 'bg-red-600 text-white' :
                    debt.priority === 'medium' ? 'bg-yellow-600 text-white' :
                    'bg-green-600 text-white'
                  }`}>
                    {debt.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-400">Estimated effort: {debt.estimatedEffort}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-white mb-4">Dependencies</h2>
          <div className="space-y-4">
            <div>
              <strong className="text-white">Frontend:</strong> 
              <p className="text-gray-300">{planData.dependencies.frontend.join(', ')}</p>
            </div>
            <div>
              <strong className="text-white">Backend:</strong> 
              <p className="text-gray-300">{planData.dependencies.backend.join(', ')}</p>
            </div>
            <div>
              <strong className="text-white">Planned:</strong> 
              <p className="text-gray-300">{planData.dependencies.planned.join(', ')}</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <button 
          onClick={() => window.location.reload()} 
          className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white"
        >
          Refresh Plan Data
        </button>
      </div>
    </div>
  );
}