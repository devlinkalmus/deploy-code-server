const express = require('express');
const cors = require('cors');
const path = require('path');
const logger = require('./server/logger');

const app = express();
let PORT;
if (process.env.NODE_ENV === 'production') {
  PORT = 8080;
} else {
  PORT = 6969;
}

// Middleware
const DEBUG_ENABLED = process.env.DEBUG_API_ENABLED === 'true' || process.env.NODE_ENV !== 'production';
const allowedOrigins = (process.env.CORS_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // same-origin or server-to-server
    if (DEBUG_ENABLED) return callback(null, true);
    if (allowedOrigins.length === 0 && process.env.NODE_ENV === 'production') {
      return callback(null, false);
    }
    if (allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Static assets (production): serve Vite build output
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Generate time-series data for analytics charts
const generateTimeSeriesData = () => {
  const now = new Date();
  const data = [];
  
  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    
    data.push({
      date: date.toISOString().split('T')[0],
      name: `Day ${31 - i}`,
      overallProgress: Math.min(100, Math.max(0, 20 + (30 - i) * 2.5 + Math.random() * 10)),
      frontendProgress: Math.min(100, Math.max(0, 30 + (30 - i) * 3 + Math.random() * 15)),
      backendProgress: Math.min(100, Math.max(0, 15 + (30 - i) * 2 + Math.random() * 8)),
      coreFeatures: Math.min(100, Math.max(0, 5 + (30 - i) * 1.5 + Math.random() * 5)),
      tasksCompleted: Math.floor(Math.random() * 8) + 2,
      tasksPlanned: Math.floor(Math.random() * 10) + 5,
      velocity: Math.min(100, Math.max(20, 50 + Math.random() * 40))
    });
  }
  
  return data;
};

// Sample Copilot plan data - this represents a current build roadmap
const copilotPlan = {
  projectName: "JRVI",
  version: "1.0.0",
  currentPhase: "Development",
  lastUpdated: new Date().toISOString(),
  milestones: [
    {
      id: "milestone-1",
      name: "Frontend Foundation",
      status: "completed",
      progress: 100,
      tasks: [
        { name: "Setup React with TypeScript", status: "completed" },
        { name: "Configure Tailwind CSS", status: "completed" },
        { name: "Create basic routing", status: "completed" },
        { name: "Setup component structure", status: "completed" }
      ]
    },
    {
      id: "milestone-2", 
      name: "API Development",
      status: "in-progress",
      progress: 40,
      tasks: [
        { name: "Setup Express server", status: "completed" },
        { name: "Create debug endpoints", status: "in-progress" },
        { name: "Add authentication", status: "pending" },
        { name: "Database integration", status: "pending" }
      ]
    },
    {
      id: "milestone-3",
      name: "Core Features",
      status: "pending", 
      progress: 0,
      tasks: [
        { name: "Chat UI implementation", status: "pending" },
        { name: "Dashboard functionality", status: "pending" },
        { name: "IDE interface", status: "pending" },
        { name: "AI integration", status: "pending" }
      ]
    }
  ],
  nextSteps: [
    "Complete API debug endpoints",
    "Implement authentication system",
    "Set up database connections",
    "Begin chat UI development"
  ],
  technicalDebt: [
    {
      item: "Add comprehensive error handling",
      priority: "high",
      estimatedEffort: "2 days"
    },
    {
      item: "Implement proper logging system", 
      priority: "medium",
      estimatedEffort: "1 day"
    },
    {
      item: "Add unit tests",
      priority: "high", 
      estimatedEffort: "3 days"
    }
  ],
  dependencies: {
    frontend: ["react", "typescript", "tailwindcss", "react-router-dom"],
    backend: ["express", "cors"],
    planned: ["authentication-library", "database-orm", "ai-sdk"]
  },
  analytics: {
    timeSeriesData: generateTimeSeriesData(),
    priorityBreakdown: [
      { name: "High Priority", value: 2, color: "#EF4444" },
      { name: "Medium Priority", value: 1, color: "#F59E0B" },
      { name: "Low Priority", value: 0, color: "#10B981" }
    ],
    velocityData: generateTimeSeriesData().slice(-8).map((item, index) => ({
      week: `Week ${index + 1}`,
      tasksCompleted: item.tasksCompleted,
      tasksPlanned: item.tasksPlanned,
      velocity: item.velocity
    }))
  }
};

// Debug endpoint to return current Copilot plan (gated in production)
if (DEBUG_ENABLED) {
  app.get('/api/debug/plan', (req, res) => {
    try {
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        data: copilotPlan
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve plan data',
        timestamp: new Date().toISOString()
      });
    }
  });
} else {
  app.get('/api/debug/plan', (_req, res) => res.status(404).json({ success: false, error: 'Disabled in production' }));
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Public API: system status (README-aligned)
app.get('/api/status', (req, res) => {
  try {
    res.json({
      status: 'ok',
      uptime: process.uptime(),
      pid: process.pid,
      node: process.version,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Status endpoint failed', { error: error?.message });
    res.status(500).json({ error: 'status_failed' });
  }
});

// Public API: personas (basic list from brand doc)
app.get('/api/personas', (_req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'JRVI', enabled: true },
      { id: 'NKTA', enabled: true },
      { id: 'ENTRG', enabled: true },
      { id: 'RMDLR', enabled: true },
      { id: 'SPRKLS', enabled: true },
      { id: 'RESSRV', enabled: true },
      { id: 'CAMPAIGN_SLANGER', enabled: true }
    ]
  });
});

// Public API: memory stats (placeholder)
app.get('/api/memory/stats', (_req, res) => {
  res.json({
    success: true,
    data: { total: 0, stm: 0, ltm: 0, wisdom: 0 }
  });
});

// Public API: plugin registry (placeholder)
app.get('/api/system/plugins', (_req, res) => {
  res.json({
    success: true,
    data: [
      { id: 'jrvi_core', version: '1.0.0', healthy: true },
      { id: 'dev_tools', version: '1.0.0', healthy: true }
    ]
  });
});

// Public API: chat (echo placeholder)
app.post('/api/chat', (req, res) => {
  const { content, persona } = req.body || {};
  if (!content) return res.status(400).json({ success: false, error: 'content_required' });
  const reply = `Echo from ${persona || 'JRVI'}: ${content}`;
  logger.info('Chat message', { persona: persona || 'JRVI' });
  res.json({ success: true, data: { response: reply } });
});

// Drawing Board API endpoints (gated)
let drawingBoardNodes = [
  {
    id: 'father-main',
    type: 'system',
    name: 'JRVI Main System',
    position: { x: 400, y: 200 },
    authority: 'father',
    personaId: 'jrvi-father',
    status: 'active',
    connections: ['mother-backup', 'child-clone1'],
    metadata: {
      version: '1.0.0',
      created: '2025-01-01T00:00:00Z',
      lastModified: new Date().toISOString(),
      brandAffinity: ['JRVI']
    }
  },
  {
    id: 'mother-backup',
    type: 'system',
    name: 'JRVI Backup Authority',
    position: { x: 200, y: 350 },
    authority: 'mother',
    personaId: 'jrvi-mother',
    status: 'idle',
    connections: ['child-clone1', 'child-clone2'],
    metadata: {
      version: '1.0.0',
      created: '2025-01-01T00:00:00Z',
      lastModified: new Date().toISOString(),
      brandAffinity: ['JRVI']
    }
  },
  {
    id: 'child-clone1',
    type: 'clone',
    name: 'Analytics Module',
    position: { x: 600, y: 350 },
    authority: 'child',
    personaId: 'jrvi-analytics',
    status: 'active',
    connections: [],
    metadata: {
      version: '1.0.0',
      created: '2025-01-02T00:00:00Z',
      lastModified: new Date().toISOString(),
      brandAffinity: ['JRVI', 'NKTA']
    }
  }
];

let drawingBoardConnections = [
  {
    id: 'conn-1',
    from: 'father-main',
    to: 'mother-backup',
    type: 'authority',
    status: 'active'
  },
  {
    id: 'conn-2',
    from: 'father-main',
    to: 'child-clone1',
    type: 'control',
    status: 'active'
  },
  {
    id: 'conn-3',
    from: 'mother-backup',
    to: 'child-clone1',
    type: 'fallback',
    status: 'inactive'
  }
];

let auditLogs = [];
let pendingProposals = [];

// Audit logging function
function logAudit(action, userId, details, metadata = {}) {
  const logEntry = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    action,
    userId,
    details,
    metadata: {
      ip: '127.0.0.1', // In real app, get from request
      userAgent: 'JRVI-DrawingBoard',
      ...metadata
    },
    compliance: {
      checked: true,
      status: 'COMPLIANT',
      flags: []
    }
  };
  
  auditLogs.push(logEntry);
  logger.audit(`${action} by ${userId}: ${details}`, { userId, metadata });
  return logEntry.id;
}

// Get Drawing Board state
const getStateHandler = (req, res) => {
  try {
    const personaId = req.headers['x-jrvi-persona'] || 'jrvi-father';
    
    logAudit(
      'DRAWING_BOARD_VIEW',
      personaId,
      'Retrieved Drawing Board state',
      { nodeCount: drawingBoardNodes.length, connectionCount: drawingBoardConnections.length }
    );

    res.json({
      success: true,
      data: {
        nodes: drawingBoardNodes,
        connections: drawingBoardConnections,
        currentPersona: personaId,
        lastUpdated: new Date().toISOString()
      },
      metadata: {
        auditLogId: logAudit('API_CALL', personaId, 'GET /api/drawing-board/state'),
        nodeCount: drawingBoardNodes.length,
        connectionCount: drawingBoardConnections.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve Drawing Board state'
    });
  }
};

// NOTE: SPA fallback will be registered at the end after all API routes

// Create clone proposal
const proposeCloneHandler = (req, res) => {
  try {
    const personaId = req.headers['x-jrvi-persona'] || 'jrvi-father';
    const { sourceNodeId, targetName, brandAffinity } = req.body;
    
    // Authority check
    if (personaId.includes('child')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Only Father and Mother authorities can create clones.'
      });
    }

    const sourceNode = drawingBoardNodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) {
      return res.status(404).json({
        success: false,
        error: 'Source node not found'
      });
    }

    const proposal = {
      id: `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'CLONE_NODE',
      proposedBy: personaId,
      timestamp: new Date().toISOString(),
      status: 'PENDING',
      details: {
        sourceNodeId,
        targetName: targetName || `${sourceNode.name} Clone`,
        brandAffinity: brandAffinity || sourceNode.metadata.brandAffinity,
        sourceNode: JSON.parse(JSON.stringify(sourceNode))
      }
    };

    pendingProposals.push(proposal);
    
    const auditLogId = logAudit(
      'CLONE_PROPOSAL_CREATED',
      personaId,
      `Clone proposal created for node: ${sourceNode.name}`,
      { proposalId: proposal.id, sourceNodeId }
    );

    res.json({
      success: true,
      data: proposal,
      metadata: {
        auditLogId,
        proposalId: proposal.id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create clone proposal'
    });
  }
};

// Create persona proposal
const proposePersonaHandler = (req, res) => {
  try {
    const personaId = req.headers['x-jrvi-persona'] || 'jrvi-father';
    const { personaName, personaType, permissions, brandAffinity } = req.body;
    
    // Authority check - Only Father can create personas
    if (!personaId.includes('father')) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions. Only Father authority can create personas.'
      });
    }

    const proposal = {
      id: `proposal_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'CREATE_PERSONA',
      proposedBy: personaId,
      timestamp: new Date().toISOString(),
      status: 'PENDING',
      details: {
        personaName: personaName || `New Persona ${Date.now()}`,
        personaType: personaType || 'child',
        permissions: permissions || ['read'],
        brandAffinity: brandAffinity || ['JRVI']
      }
    };

    pendingProposals.push(proposal);
    
    const auditLogId = logAudit(
      'PERSONA_PROPOSAL_CREATED',
      personaId,
      `Persona creation proposal: ${proposal.details.personaName}`,
      { proposalId: proposal.id, personaType: proposal.details.personaType }
    );

    res.json({
      success: true,
      data: proposal,
      metadata: {
        auditLogId,
        proposalId: proposal.id
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to create persona proposal'
    });
  }
};

if (DEBUG_ENABLED) {
  app.get('/api/drawing-board/state', getStateHandler);
  app.post('/api/drawing-board/propose-clone', proposeCloneHandler);
  app.post('/api/drawing-board/propose-persona', proposePersonaHandler);

  // Get pending proposals
  app.get('/api/drawing-board/proposals', (req, res) => {
    try {
      const personaId = req.headers['x-jrvi-persona'] || 'jrvi-father';
      
      const auditLogId = logAudit(
        'PROPOSALS_VIEWED',
        personaId,
        'Viewed pending proposals',
        { proposalCount: pendingProposals.length }
      );

      res.json({
        success: true,
        data: pendingProposals.filter(p => p.status === 'PENDING'),
        metadata: {
          auditLogId,
          totalCount: pendingProposals.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve proposals'
      });
    }
  });

  // Approve proposals
  app.post('/api/drawing-board/approve-proposals', (req, res) => {
    try {
      const personaId = req.headers['x-jrvi-persona'] || 'jrvi-father';
      const { proposalIds } = req.body;
      
      // Authority check
      if (personaId.includes('child')) {
        return res.status(403).json({
          success: false,
          error: 'Insufficient permissions. Only Father and Mother authorities can approve proposals.'
        });
      }

      const approvedProposals = [];
      const errors = [];

      proposalIds.forEach(proposalId => {
        const proposal = pendingProposals.find(p => p.id === proposalId);
        if (!proposal) {
          errors.push(`Proposal not found: ${proposalId}`);
          return;
        }

        // Execute the proposal
        if (proposal.type === 'CLONE_NODE') {
          const newNodeId = `clone_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          const newNode = {
            ...proposal.details.sourceNode,
            id: newNodeId,
            name: proposal.details.targetName,
            position: {
              x: proposal.details.sourceNode.position.x + 150,
              y: proposal.details.sourceNode.position.y + 100
            },
            authority: 'child',
            personaId: `${proposal.details.targetName.toLowerCase().replace(/\s+/g, '-')}-persona`,
            metadata: {
              ...proposal.details.sourceNode.metadata,
              created: new Date().toISOString(),
              lastModified: new Date().toISOString(),
              brandAffinity: proposal.details.brandAffinity,
              clonedFrom: proposal.details.sourceNodeId
            }
          };
          
          drawingBoardNodes.push(newNode);
          proposal.status = 'APPROVED';
          proposal.approvedBy = personaId;
          proposal.approvedAt = new Date().toISOString();
          proposal.executionResult = { newNodeId };
          
          logAudit(
            'NODE_CLONED',
            personaId,
            `Node cloned: ${newNode.name} from ${proposal.details.sourceNode.name}`,
            { newNodeId, sourceNodeId: proposal.details.sourceNodeId }
          );
          
        } else if (proposal.type === 'CREATE_PERSONA') {
          proposal.status = 'APPROVED';
          proposal.approvedBy = personaId;
          proposal.approvedAt = new Date().toISOString();
          
          logAudit(
            'PERSONA_CREATED',
            personaId,
            `Persona created: ${proposal.details.personaName}`,
            { personaType: proposal.details.personaType }
          );
        }

        approvedProposals.push(proposal);
      });

      const auditLogId = logAudit(
        'PROPOSALS_APPROVED',
        personaId,
        `Approved ${approvedProposals.length} proposals`,
        { approvedProposals: approvedProposals.map(p => p.id), errors }
      );

      res.json({
        success: true,
        data: {
          approved: approvedProposals,
          errors,
          newState: {
            nodes: drawingBoardNodes,
            connections: drawingBoardConnections
          }
        },
        metadata: {
          auditLogId,
          approvedCount: approvedProposals.length,
          errorCount: errors.length
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to approve proposals'
      });
    }
  });

  // Get audit logs
  app.get('/api/drawing-board/audit-logs', (req, res) => {
    try {
      const personaId = req.headers['x-jrvi-persona'] || 'jrvi-father';
      const limit = parseInt(req.query.limit) || 50;
      
      const recentLogs = auditLogs
        .slice(-limit)
        .reverse()
        .map(log => ({
          ...log,
          // Redact sensitive information for non-father personas
          details: personaId.includes('father') ? log.details : 'Access restricted',
          metadata: personaId.includes('father') ? log.metadata : { restricted: true }
        }));

      res.json({
        success: true,
        data: recentLogs,
        metadata: {
          totalLogs: auditLogs.length,
          returned: recentLogs.length,
          viewerPersona: personaId
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit logs'
      });
    }
  });
} else {
  app.all('/api/drawing-board/*', (_req, res) => res.status(404).json({ success: false, error: 'Disabled in production' }));
}


// SPA fallback (after all API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, () => {
  logger.info(`🚀 Backend server running on http://localhost:${PORT}`);
  logger.info(`📋 Plan endpoint at /api/debug/plan ${DEBUG_ENABLED ? '(enabled)' : '(disabled)'}`);
  logger.info(`🎨 Drawing Board API ${DEBUG_ENABLED ? 'available' : 'disabled in production'} at /api/drawing-board/`);
});

module.exports = app;