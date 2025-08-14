import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Brain, Activity, Clock, Database } from 'lucide-react';

interface MemoryStats {
  total: number;
  stm: number;
  ltm: number;
  avgImportance: number;
  recentActivity: number;
}

interface MemoryPulseProps {
  memoryStats?: MemoryStats;
}

export default function MemoryPulse({ memoryStats }: MemoryPulseProps) {
  const [pulseData, setPulseData] = useState<number[]>([]);
  const [activityData, setActivityData] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Mock memory stats if not provided
  const defaultStats: MemoryStats = {
    total: 1247,
    stm: 23,
    ltm: 1224,
    avgImportance: 0.67,
    recentActivity: 15
  };

  const stats = memoryStats || defaultStats;

  useEffect(() => {
    // Simulate loading
    const loadingTimer = setTimeout(() => setIsLoading(false), 1500);

    // Generate initial data
    const initialPulse = Array.from({ length: 50 }, () => Math.random() * 100);
    const initialActivity = Array.from({ length: 20 }, () => Math.random() * 50 + 25);
    
    setPulseData(initialPulse);
    setActivityData(initialActivity);

    // Update data periodically
    const interval = setInterval(() => {
      setPulseData(prev => {
        const newData = [...prev.slice(1), Math.random() * 100];
        return newData;
      });

      setActivityData(prev => {
        const newData = [...prev.slice(1), Math.random() * 50 + 25];
        return newData;
      });
    }, 2000);

    return () => {
      clearTimeout(loadingTimer);
      clearInterval(interval);
    };
  }, []);

  const PulseGraph = ({ data, height = 60, color = "#3b82f6" }) => {
    if (isLoading) {
      return (
        <div className={`w-full animate-pulse bg-muted rounded`} style={{ height }}>
          <div className="flex items-center justify-center h-full">
            <div className="text-xs text-muted-foreground">Loading...</div>
          </div>
        </div>
      );
    }

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;

    return (
      <div className="w-full relative" style={{ height }}>
        <svg width="100%" height="100%" className="overflow-visible">
          <defs>
            <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={color} stopOpacity="0.8" />
              <stop offset="100%" stopColor={color} stopOpacity="0.1" />
            </linearGradient>
          </defs>
          <path
            d={data
              .map((value, index) => {
                const x = (index / (data.length - 1)) * 100;
                const y = ((max - value) / range) * 100;
                return `${index === 0 ? 'M' : 'L'} ${x}% ${y}%`;
              })
              .join(' ')}
            stroke={color}
            strokeWidth="2"
            fill="none"
            className="animate-pulse"
          />
          <path
            d={`${data
              .map((value, index) => {
                const x = (index / (data.length - 1)) * 100;
                const y = ((max - value) / range) * 100;
                return `${index === 0 ? 'M' : 'L'} ${x}% ${y}%`;
              })
              .join(' ')} L 100% 100% L 0% 100% Z`}
            fill="url(#pulseGradient)"
          />
        </svg>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Brain className="h-6 w-6 text-primary" />
          <div>
            <h3 className="text-xl font-semibold">Memory Pulse</h3>
            <p className="text-sm text-muted-foreground">Real-time memory system monitoring</p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Activity className="h-4 w-4 mr-2" />
          Live View
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4 text-blue-600" />
              <div>
                <p className="text-sm text-muted-foreground">Total Memories</p>
                <p className="text-2xl font-bold">{stats.total.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-4 w-4 text-green-600" />
              <div>
                <p className="text-sm text-muted-foreground">Short Term</p>
                <p className="text-2xl font-bold">{stats.stm}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Brain className="h-4 w-4 text-purple-600" />
              <div>
                <p className="text-sm text-muted-foreground">Long Term</p>
                <p className="text-2xl font-bold">{stats.ltm.toLocaleString()}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Activity className="h-4 w-4 text-orange-600" />
              <div>
                <p className="text-sm text-muted-foreground">Avg Importance</p>
                <p className="text-2xl font-bold">{(stats.avgImportance * 100).toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Memory Pulse Graph */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Memory Activity Pulse</span>
          </CardTitle>
          <CardDescription>
            Real-time visualization of memory operations and neural activity
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PulseGraph data={pulseData} height={120} color="#3b82f6" />
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Last 5 minutes</span>
            <span>Peak: {Math.max(...pulseData).toFixed(1)} operations/sec</span>
          </div>
        </CardContent>
      </Card>

      {/* Memory Load Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Memory Load Distribution</CardTitle>
          <CardDescription>
            Current memory utilization across different systems
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Short-term Memory</span>
              <span>{((stats.stm / stats.total) * 100).toFixed(1)}%</span>
            </div>
            <Progress value={(stats.stm / stats.total) * 100} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Long-term Memory</span>
              <span>{((stats.ltm / stats.total) * 100).toFixed(1)}%</span>
            </div>
            <Progress value={(stats.ltm / stats.total) * 100} className="h-2" />
          </div>
          
          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Recent Activity</span>
              <span>{stats.recentActivity} operations</span>
            </div>
            <Progress value={(stats.recentActivity / 50) * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Memory Activity</CardTitle>
          <CardDescription>Timeline of recent memory operations</CardDescription>
        </CardHeader>
        <CardContent>
          <PulseGraph data={activityData} height={80} color="#10b981" />
          <div className="mt-4 space-y-2">
            {[
              { time: '14:32:15', action: 'Memory consolidation', type: 'STM → LTM' },
              { time: '14:31:42', action: 'Pattern recognition', type: 'Query' },
              { time: '14:30:18', action: 'New memory creation', type: 'Store' },
              { time: '14:29:33', action: 'Memory retrieval', type: 'Access' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <div>
                    <p className="text-sm font-medium">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
                <span className="text-xs bg-muted px-2 py-1 rounded">{activity.type}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}