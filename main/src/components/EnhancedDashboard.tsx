import React, { useState, useEffect } from "react";
import { AnalyticsAreaChart, MultiLayerAreaChart } from "./ui/area-chart";
import { ProgressMetrics, PriorityBreakdown, VelocityChart } from "./ui/metric-charts";

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

interface Analytics {
  timeSeriesData: any[];
  priorityBreakdown: {
    name: string;
    value: number;
    color: string;
  }[];
  velocityData: {
    week: string;
    tasksCompleted: number;
    tasksPlanned: number;
    velocity: number;
  }[];
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
  analytics: Analytics;
}

interface ApiResponse {
  success: boolean;
  timestamp: string;
  data: PlanData;
}

export default function EnhancedDashboard() {
  const [planData, setPlanData] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlan = async () => {
      try {
  const response = await fetch('/api/debug/plan');
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
            <span className="ml-3 text-white">Loading analytics dashboard...</span>
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

  // Prepare chart data
  const progressChartData = [
    {
      key: 'overallProgress',
      name: 'Overall Progress',
      color: '#3B82F6'
    },
    {
      key: 'frontendProgress',
      name: 'Frontend',
      color: '#10B981'
    },
    {
      key: 'backendProgress',
      name: 'Backend',
      color: '#F59E0B'
    },
    {
      key: 'coreFeatures',
      name: 'Core Features',
      color: '#8B5CF6'
    }
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header Section */}
      <div className="bg-gray-800 rounded-lg shadow p-8">
        <h1 className="text-3xl font-bold text-white mb-4">{planData.projectName} Analytics Dashboard</h1>
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

      {/* Main Analytics Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <MultiLayerAreaChart
          data={planData.analytics.timeSeriesData}
          dataKeys={progressChartData}
          title="📈 Multi-Layer Progress Trends"
          height={400}
        />
        
        <AnalyticsAreaChart
          data={planData.analytics.timeSeriesData}
          dataKeys={[
            { key: 'tasksCompleted', name: 'Tasks Completed', color: '#10B981' },
            { key: 'tasksPlanned', name: 'Tasks Planned', color: '#3B82F6' }
          ]}
          title="📊 Task Completion Analytics"
          height={400}
        />
      </div>

      {/* Secondary Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <ProgressMetrics
          data={planData.analytics.timeSeriesData}
          title="🎯 Overall Progress Trend"
          dataKey="overallProgress"
          color="#3B82F6"
          height={250}
        />
        
        <PriorityBreakdown
          data={planData.analytics.priorityBreakdown}
          title="⚠️ Technical Debt Priority"
          height={250}
        />
        
        <VelocityChart
          data={planData.analytics.velocityData}
          title="🚀 Development Velocity"
          height={250}
        />
      </div>

      {/* Milestones with Enhanced Visuals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-white mb-4">🎯 Milestones Progress</h2>
          <div className="space-y-4">
            {planData.milestones.map((milestone) => (
              <div key={milestone.id} className="border-l-4 border-blue-500 pl-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-semibold text-white">{milestone.name}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    milestone.status === 'completed' ? 'bg-green-600 text-white' :
                    milestone.status === 'in-progress' ? 'bg-yellow-600 text-white' :
                    'bg-gray-600 text-white'
                  }`}>
                    {milestone.status}
                  </span>
                </div>
                <div className="relative w-full bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-500 ease-in-out"
                    style={{ width: `${milestone.progress}%` }}
                  ></div>
                  <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-50 animate-pulse"></div>
                </div>
                <p className="text-sm text-gray-300 font-medium">{milestone.progress}% complete</p>
                <ul className="mt-2 space-y-1">
                  {milestone.tasks.map((task, index) => (
                    <li key={index} className="text-sm text-gray-400 flex items-center">
                      <span className={`w-3 h-3 rounded-full mr-2 ${
                        task.status === 'completed' ? 'bg-green-500 animate-pulse' :
                        task.status === 'in-progress' ? 'bg-yellow-500 animate-bounce' :
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
          <h2 className="text-xl font-bold text-white mb-4">📋 Next Steps</h2>
          <ul className="space-y-3">
            {planData.nextSteps.map((step, index) => (
              <li key={index} className="flex items-start text-gray-300 group hover:text-white transition-colors">
                <span className="text-blue-500 mr-3 mt-1 group-hover:text-blue-400">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Enhanced Technical Debt & Dependencies */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-white mb-4">⚠️ Technical Debt</h2>
          <div className="space-y-3">
            {planData.technicalDebt.map((debt, index) => (
              <div key={index} className="border border-gray-700 rounded-lg p-4 hover:border-gray-600 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-medium text-white">{debt.item}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    debt.priority === 'high' ? 'bg-red-600 text-white animate-pulse' :
                    debt.priority === 'medium' ? 'bg-yellow-600 text-white' :
                    'bg-green-600 text-white'
                  }`}>
                    {debt.priority}
                  </span>
                </div>
                <p className="text-sm text-gray-400">⏱️ Estimated effort: {debt.estimatedEffort}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-white mb-4">📦 Dependencies</h2>
          <div className="space-y-4">
            <div className="border-l-4 border-green-500 pl-4">
              <strong className="text-white">🎨 Frontend:</strong> 
              <div className="flex flex-wrap gap-2 mt-2">
                {planData.dependencies.frontend.map((dep, index) => (
                  <span key={index} className="bg-green-900 text-green-200 px-2 py-1 rounded text-xs">
                    {dep}
                  </span>
                ))}
              </div>
            </div>
            <div className="border-l-4 border-blue-500 pl-4">
              <strong className="text-white">🔧 Backend:</strong> 
              <div className="flex flex-wrap gap-2 mt-2">
                {planData.dependencies.backend.map((dep, index) => (
                  <span key={index} className="bg-blue-900 text-blue-200 px-2 py-1 rounded text-xs">
                    {dep}
                  </span>
                ))}
              </div>
            </div>
            <div className="border-l-4 border-purple-500 pl-4">
              <strong className="text-white">🔮 Planned:</strong> 
              <div className="flex flex-wrap gap-2 mt-2">
                {planData.dependencies.planned.map((dep, index) => (
                  <span key={index} className="bg-purple-900 text-purple-200 px-2 py-1 rounded text-xs">
                    {dep}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-8 text-center">
        <button 
          onClick={() => window.location.reload()} 
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 transform hover:scale-105"
        >
          🔄 Refresh Analytics Data
        </button>
      </div>
    </div>
  );
}