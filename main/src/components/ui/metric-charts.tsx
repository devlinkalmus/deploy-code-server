import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

interface MetricChartProps {
  data: any[];
  title: string;
  height?: number;
}

interface ProgressMetricsProps extends MetricChartProps {
  dataKey: string;
  color: string;
}

export function ProgressMetrics({ data, title, dataKey, color, height = 250 }: ProgressMetricsProps) {
  return (
    <div className="bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="date" 
            stroke="#9CA3AF"
            fontSize={12}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#F9FAFB'
            }}
            formatter={(value) => [`${value}%`, 'Progress']}
          />
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

interface PriorityBreakdownProps {
  data: {
    name: string;
    value: number;
    color: string;
  }[];
  title: string;
  height?: number;
}

export function PriorityBreakdown({ data, title, height = 300 }: PriorityBreakdownProps) {
  return (
    <div className="bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#F9FAFB'
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

interface VelocityChartProps {
  data: {
    week: string;
    tasksCompleted: number;
    tasksPlanned: number;
    velocity: number;
  }[];
  title: string;
  height?: number;
}

export function VelocityChart({ data, title, height = 300 }: VelocityChartProps) {
  return (
    <div className="bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis 
            dataKey="week" 
            stroke="#9CA3AF"
            fontSize={12}
          />
          <YAxis 
            stroke="#9CA3AF"
            fontSize={12}
          />
          <Tooltip 
            contentStyle={{
              backgroundColor: '#1F2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#F9FAFB'
            }}
          />
          <Legend />
          <Bar dataKey="tasksCompleted" fill="#10B981" name="Tasks Completed" />
          <Bar dataKey="tasksPlanned" fill="#3B82F6" name="Tasks Planned" />
          <Line
            type="monotone"
            dataKey="velocity"
            stroke="#F59E0B"
            strokeWidth={3}
            name="Velocity %"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}