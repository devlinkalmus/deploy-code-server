import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { 
  Circle, 
  Square, 
  Hexagon, 
  Play, 
  Pause, 
  RotateCcw, 
  Copy, 
  GitFork, 
  Users, 
  Crown, 
  Shield,
  Eye,
  Plus,
  Settings,
  FileText,
  AlertTriangle
} from 'lucide-react';

// Types for Drawing Board entities
export interface DrawingBoardNode {
  id: string;
  type: 'module' | 'system' | 'sandbox' | 'clone';
  name: string;
  position: { x: number; y: number };
  authority: 'father' | 'mother' | 'child';
  personaId?: string;
  status: 'active' | 'idle' | 'error' | 'pending';
  connections: string[];
  metadata: {
    version: string;
    created: string;
    lastModified: string;
    brandAffinity: string[];
  };
}

export interface DrawingBoardConnection {
  id: string;
  from: string;
  to: string;
  type: 'data' | 'control' | 'authority' | 'fallback';
  status: 'active' | 'inactive' | 'pending';
}

export interface PersonaInfo {
  id: string;
  name: string;
  type: 'father' | 'mother' | 'child';
  permissions: string[];
  brandAffinity: string[];
}

export interface Proposal {
  id: string;
  type: string;
  proposedBy: string;
  timestamp: string;
  status: string;
  details: any;
}

// API functions
const API_BASE = '/api/drawing-board';

const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const response = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      'X-JRVI-Persona': 'jrvi-father',
      ...options.headers,
    },
    ...options,
  });
  return response.json();
};

export default function DrawingBoard() {
  // State management
  const [nodes, setNodes] = useState<DrawingBoardNode[]>([]);
  const [connections, setConnections] = useState<DrawingBoardConnection[]>([]);
  const [selectedNode, setSelectedNode] = useState<DrawingBoardNode | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [currentPersona, setCurrentPersona] = useState<PersonaInfo>({
    id: 'jrvi-father',
    name: 'JRVI Father',
    type: 'father',
    permissions: ['create', 'update', 'delete', 'clone', 'manage_personas'],
    brandAffinity: ['JRVI']
  });
  const [showProposalDialog, setShowProposalDialog] = useState(false);
  const [pendingProposals, setPendingProposals] = useState<Proposal[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Load initial data from API
  useEffect(() => {
    loadDrawingBoardState();
    loadPendingProposals();
    loadAuditLogs();
  }, []);

  const loadDrawingBoardState = async () => {
    try {
      const response = await apiCall('/state');
      if (response.success) {
        setNodes(response.data.nodes);
        setConnections(response.data.connections);
      }
    } catch (error) {
      console.error('Failed to load Drawing Board state:', error);
    }
  };

  const loadPendingProposals = async () => {
    try {
      const response = await apiCall('/proposals');
      if (response.success) {
        setPendingProposals(response.data);
      }
    } catch (error) {
      console.error('Failed to load proposals:', error);
    }
  };

  const loadAuditLogs = async () => {
    try {
      const response = await apiCall('/audit-logs?limit=10');
      if (response.success) {
        setAuditLogs(response.data);
      }
    } catch (error) {
      console.error('Failed to load audit logs:', error);
    }
  };

  // Canvas drawing logic
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw connections
    connections.forEach(connection => {
      const fromNode = nodes.find(n => n.id === connection.from);
      const toNode = nodes.find(n => n.id === connection.to);
      
      if (fromNode && toNode) {
        ctx.beginPath();
        ctx.moveTo(fromNode.position.x + 60, fromNode.position.y + 30);
        ctx.lineTo(toNode.position.x + 60, toNode.position.y + 30);
        
        // Style based on connection type
        switch (connection.type) {
          case 'authority':
            ctx.strokeStyle = '#fbbf24'; // amber
            ctx.lineWidth = 3;
            ctx.setLineDash([]);
            break;
          case 'control':
            ctx.strokeStyle = '#3b82f6'; // blue
            ctx.lineWidth = 2;
            ctx.setLineDash([]);
            break;
          case 'fallback':
            ctx.strokeStyle = '#6b7280'; // gray
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            break;
          default:
            ctx.strokeStyle = '#10b981'; // emerald
            ctx.lineWidth = 1;
            ctx.setLineDash([]);
        }
        
        if (connection.status === 'inactive') {
          ctx.globalAlpha = 0.3;
        } else {
          ctx.globalAlpha = 1;
        }
        
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    });
  }, [nodes, connections]);

  // Handle node interactions
  const handleNodeClick = (node: DrawingBoardNode) => {
    setSelectedNode(node);
  };

  const handleCloneNode = async (node: DrawingBoardNode) => {
    if (currentPersona.type !== 'father' && !currentPersona.permissions.includes('clone')) {
      alert('Insufficient permissions to clone nodes. Only Father authority can create clones.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiCall('/propose-clone', {
        method: 'POST',
        body: JSON.stringify({
          sourceNodeId: node.id,
          targetName: `${node.name} Clone`,
          brandAffinity: node.metadata.brandAffinity
        })
      });

      if (response.success) {
        await loadPendingProposals();
        setShowProposalDialog(true);
      } else {
        alert(`Failed to create clone proposal: ${response.error}`);
      }
    } catch (error) {
      alert('Failed to create clone proposal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePersona = async () => {
    if (currentPersona.type !== 'father') {
      alert('Only Father authority can create/update personas.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await apiCall('/propose-persona', {
        method: 'POST',
        body: JSON.stringify({
          personaName: `New Persona ${Date.now()}`,
          personaType: 'child',
          permissions: ['read'],
          brandAffinity: ['JRVI']
        })
      });

      if (response.success) {
        await loadPendingProposals();
        setShowProposalDialog(true);
      } else {
        alert(`Failed to create persona proposal: ${response.error}`);
      }
    } catch (error) {
      alert('Failed to create persona proposal');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproveProposals = async () => {
    if (pendingProposals.length === 0) return;

    setIsLoading(true);
    try {
      const proposalIds = pendingProposals.map(p => p.id);
      const response = await apiCall('/approve-proposals', {
        method: 'POST',
        body: JSON.stringify({ proposalIds })
      });

      if (response.success) {
        await loadDrawingBoardState();
        await loadPendingProposals();
        await loadAuditLogs();
        setShowProposalDialog(false);
      } else {
        alert(`Failed to approve proposals: ${response.error}`);
      }
    } catch (error) {
      alert('Failed to approve proposals');
    } finally {
      setIsLoading(false);
    }
  };

  const getNodeIcon = (node: DrawingBoardNode) => {
    switch (node.type) {
      case 'system':
        return <Hexagon className="w-4 h-4" />;
      case 'module':
        return <Square className="w-4 h-4" />;
      case 'sandbox':
        return <Circle className="w-4 h-4" />;
      case 'clone':
        return <Copy className="w-4 h-4" />;
      default:
        return <Circle className="w-4 h-4" />;
    }
  };

  const getAuthorityIcon = (authority: string) => {
    switch (authority) {
      case 'father':
        return <Crown className="w-3 h-3 text-yellow-400" />;
      case 'mother':
        return <Shield className="w-3 h-3 text-blue-400" />;
      case 'child':
        return <Users className="w-3 h-3 text-green-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500';
      case 'idle':
        return 'bg-yellow-500';
      case 'error':
        return 'bg-red-500';
      case 'pending':
        return 'bg-blue-500';
      default:
        return 'bg-gray-500';
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="h-full bg-gray-900 text-white flex relative">
      {/* Left Sidebar - Controls */}
      <div className="w-80 bg-gray-800 border-r border-gray-700 p-4 overflow-y-auto">
        <div className="space-y-4">
          {/* Current Authority Status */}
          <Card className="bg-gray-700 border-gray-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                {getAuthorityIcon(currentPersona.type)}
                Authority Status
              </CardTitle>
              <CardDescription className="text-gray-300">
                Current persona and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Persona:</span>
                <Badge variant="outline">{currentPersona.name}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Type:</span>
                <Badge variant={currentPersona.type === 'father' ? 'default' : 'secondary'}>
                  {currentPersona.type}
                </Badge>
              </div>
              <div className="text-xs text-gray-400">
                Permissions: {currentPersona.permissions.join(', ')}
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className="bg-gray-700 border-gray-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                className="w-full" 
                variant="outline"
                onClick={handleCreatePersona}
                disabled={currentPersona.type !== 'father' || isLoading}
              >
                <Plus className="w-4 h-4 mr-2" />
                {isLoading ? 'Creating...' : 'Create Persona'}
              </Button>
              <Button 
                className="w-full" 
                variant="outline"
                onClick={() => setShowProposalDialog(true)}
                disabled={pendingProposals.length === 0}
              >
                <FileText className="w-4 h-4 mr-2" />
                Review Proposals ({pendingProposals.length})
              </Button>
            </CardContent>
          </Card>

          {/* Selected Node Details */}
          {selectedNode && (
            <Card className="bg-gray-700 border-gray-600">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  {getNodeIcon(selectedNode)}
                  {selectedNode.name}
                </CardTitle>
                <CardDescription className="flex items-center gap-2">
                  {getAuthorityIcon(selectedNode.authority)}
                  <span className="capitalize">{selectedNode.authority}</span>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(selectedNode.status)}`} />
                  <span className="capitalize">{selectedNode.status}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Type:</span>
                    <span>{selectedNode.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Version:</span>
                    <span>{selectedNode.metadata.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Persona:</span>
                    <span>{selectedNode.personaId || 'None'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Brands:</span>
                    <div className="flex gap-1">
                      {selectedNode.metadata.brandAffinity.map(brand => (
                        <Badge key={brand} variant="outline" className="text-xs">
                          {brand}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleCloneNode(selectedNode)}
                    disabled={currentPersona.type === 'child' || isLoading}
                  >
                    <GitFork className="w-3 h-3 mr-1" />
                    {isLoading ? 'Cloning...' : 'Clone'}
                  </Button>
                  <Button size="sm" variant="outline">
                    <Settings className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Audit Trail */}
          <Card className="bg-gray-700 border-gray-600">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="text-xs space-y-1">
                {auditLogs.length > 0 ? (
                  auditLogs.slice(0, 5).map((log, index) => (
                    <div key={index} className="flex justify-between text-gray-400">
                      <span>{formatTime(log.timestamp)}</span>
                      <span className="truncate ml-2">{log.action.replace(/_/g, ' ')}</span>
                    </div>
                  ))
                ) : (
                  <>
                    <div className="flex justify-between text-gray-400">
                      <span>12:34 PM</span>
                      <span>Node cloned: Analytics Module</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>12:30 PM</span>
                      <span>Authority verified: Father</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>12:25 PM</span>
                      <span>Drawing Board initialized</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative" ref={containerRef}>
        {/* Canvas for connections */}
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="absolute inset-0 pointer-events-none"
        />

        {/* Node overlay */}
        <div className="absolute inset-0 overflow-hidden">
          {nodes.map(node => (
            <div
              key={node.id}
              className={`absolute cursor-pointer transition-all transform hover:scale-105 ${
                selectedNode?.id === node.id ? 'ring-2 ring-blue-400' : ''
              }`}
              style={{
                left: node.position.x,
                top: node.position.y,
                width: 120,
                height: 60
              }}
              onClick={() => handleNodeClick(node)}
            >
              <Card className={`h-full ${
                node.status === 'error' ? 'border-red-500' : 
                node.status === 'active' ? 'border-green-500' : 
                'border-gray-600'
              } bg-gray-800`}>
                <CardContent className="p-2 h-full flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      {getNodeIcon(node)}
                      {getAuthorityIcon(node.authority)}
                    </div>
                    <div className={`w-2 h-2 rounded-full ${getStatusColor(node.status)}`} />
                  </div>
                  <div className="text-xs font-medium truncate">{node.name}</div>
                  <div className="text-xs text-gray-400 truncate">{node.type}</div>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Floating action button for new nodes */}
        <div className="absolute bottom-4 right-4">
          <Button 
            size="lg" 
            className="rounded-full w-14 h-14"
            disabled={currentPersona.type === 'child'}
          >
            <Plus className="w-6 h-6" />
          </Button>
        </div>

        {/* Authority status indicator */}
        <div className="absolute top-4 right-4">
          <Card className="bg-gray-800 border-gray-600">
            <CardContent className="p-3 flex items-center gap-2">
              {getAuthorityIcon(currentPersona.type)}
              <span className="text-sm font-medium">{currentPersona.name}</span>
              <Badge variant="outline" className="text-xs">
                {currentPersona.type}
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Proposal Dialog */}
      {showProposalDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="w-96 bg-gray-800 border-gray-600">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                Pending Proposals
              </CardTitle>
              <CardDescription>
                Review and approve the following actions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {pendingProposals.map((proposal, index) => (
                <div key={index} className="p-3 bg-gray-700 rounded border">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{proposal.type.replace(/_/g, ' ').toUpperCase()}</div>
                      <div className="text-sm text-gray-400">by {proposal.proposedBy}</div>
                      <div className="text-xs text-gray-500">{formatTime(proposal.timestamp)}</div>
                      {proposal.details.targetName && (
                        <div className="text-xs text-gray-300 mt-1">Target: {proposal.details.targetName}</div>
                      )}
                    </div>
                    <Badge variant="outline">{proposal.status}</Badge>
                  </div>
                </div>
              ))}
              
              <div className="flex gap-2 pt-4">
                <Button 
                  className="flex-1" 
                  onClick={handleApproveProposals}
                  disabled={isLoading || pendingProposals.length === 0}
                >
                  {isLoading ? 'Approving...' : 'Approve All'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setShowProposalDialog(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}