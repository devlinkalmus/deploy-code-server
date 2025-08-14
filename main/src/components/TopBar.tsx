import React, { useState, useEffect } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { Switch } from './ui/switch';
import { cn } from '../lib/utils';
import { Mic, MicOff, Bell, Settings } from 'lucide-react';

interface TopBarProps {
  brandName?: string;
  personaName?: string;
  personaAvatar?: string;
  onVoiceToggle?: (enabled: boolean) => void;
  voiceEnabled?: boolean;
}

export default function TopBar({ 
  brandName = "JRVI",
  personaName = "JRVI Assistant",
  personaAvatar,
  onVoiceToggle,
  voiceEnabled = false
}: TopBarProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="bg-card border-b border-border px-6 py-3">
      <div className="flex items-center justify-between">
        {/* Left section - Brand and Persona */}
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarImage src={personaAvatar} alt={personaName} />
              <AvatarFallback className="bg-primary text-primary-foreground">
                {brandName.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-xl font-bold text-foreground">{brandName}</h1>
              <p className="text-sm text-muted-foreground">{personaName}</p>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-muted-foreground">Online</span>
          </div>
        </div>

        {/* Center section - System Status */}
        <div className="hidden md:flex items-center space-x-6">
          <div className="text-center">
            <div className="text-sm font-medium text-foreground">
              {formatTime(currentTime)}
            </div>
            <div className="text-xs text-muted-foreground">
              {formatDate(currentTime)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-sm font-medium text-green-600">98.7%</div>
            <div className="text-xs text-muted-foreground">Uptime</div>
          </div>
          
          <div className="text-center">
            <div className="text-sm font-medium text-blue-600">2.1s</div>
            <div className="text-xs text-muted-foreground">Response</div>
          </div>
        </div>

        {/* Right section - Controls */}
        <div className="flex items-center space-x-4">
          {/* Voice Toggle */}
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-8 w-8 transition-colors",
                voiceEnabled ? "text-green-600 hover:text-green-700" : "text-muted-foreground"
              )}
              onClick={() => onVoiceToggle?.(!voiceEnabled)}
            >
              {voiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
            </Button>
            <Switch
              checked={voiceEnabled}
              onCheckedChange={onVoiceToggle}
            />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Voice
            </span>
          </div>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-8 w-8 relative">
            <Bell className="h-4 w-4" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-xs text-white font-medium">3</span>
            </div>
          </Button>

          {/* Quick Settings */}
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Mobile time/status section */}
      <div className="md:hidden mt-3 flex items-center justify-between text-sm">
        <div className="text-foreground">
          {formatTime(currentTime)} • {formatDate(currentTime)}
        </div>
        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
          <span>Uptime: 98.7%</span>
          <span>Response: 2.1s</span>
        </div>
      </div>
    </div>
  );
}