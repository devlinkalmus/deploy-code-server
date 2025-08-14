import React, { useState } from 'react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';
import { 
  Users, 
  Brain, 
  TrendingUp, 
  FileText, 
  RotateCcw, 
  Cpu, 
  Puzzle, 
  Settings,
  ChevronLeft,
  ChevronRight,
  Palette
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
}

const sidebarTabs = [
  { id: 'agents', label: 'Agents', icon: Users },
  { id: 'memory-pulse', label: 'Memory Pulse', icon: Brain },
  { id: 'forecasts', label: 'Forecasts', icon: TrendingUp },
  { id: 'sandbox-logs', label: 'Sandbox Logs', icon: FileText },
  { id: 'replay-editor', label: 'Replay Editor', icon: RotateCcw },
  { id: 'kernels', label: 'Kernels', icon: Cpu },
  { id: 'plugins', label: 'Plugins', icon: Puzzle },
  { id: 'drawing-board', label: 'Drawing Board', icon: Palette },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ 
  activeTab, 
  onTabChange, 
  collapsed = false, 
  onCollapsedChange 
}: SidebarProps) {
  const toggleCollapsed = () => {
    onCollapsedChange?.(!collapsed);
  };

  return (
    <div className={cn(
      "bg-card border-r border-border transition-all duration-300 flex flex-col",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Header with collapse toggle */}
      <div className="p-4 border-b border-border flex items-center justify-between">
        {!collapsed && (
          <h2 className="text-lg font-semibold text-foreground">JRVI HUD</h2>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleCollapsed}
          className="h-8 w-8"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {sidebarTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <Button
                key={tab.id}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start transition-all duration-200",
                  collapsed ? "px-2" : "px-3",
                  isActive && "bg-accent text-accent-foreground"
                )}
                onClick={() => onTabChange(tab.id)}
              >
                <Icon className={cn("h-4 w-4", !collapsed && "mr-3")} />
                {!collapsed && <span>{tab.label}</span>}
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        {!collapsed && (
          <div className="text-xs text-muted-foreground">
            JRVI System v2.0
          </div>
        )}
        <div className={cn(
          "mt-2 h-2 bg-muted rounded-full overflow-hidden",
          collapsed && "mx-2"
        )}>
          <div 
            className="h-full bg-primary transition-all duration-1000"
            style={{ width: '75%' }}
          />
        </div>
        {!collapsed && (
          <div className="text-xs text-muted-foreground mt-1">
            System Health: 75%
          </div>
        )}
      </div>
    </div>
  );
}