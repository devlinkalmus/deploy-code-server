/**
 * Approval Workflow Component
 * Manual approval system for generated code and scaffolds
 * Phase 14 implementation for JRVI
 */

import React, { useState, useEffect } from 'react';
import { logger } from '../../utils/logging';
import type { GeneratedArtifact } from './ScaffoldGenerator';

export interface ApprovalRequest {
  id: string;
  artifact: GeneratedArtifact;
  status: 'pending' | 'approved' | 'rejected' | 'modified';
  submittedAt: Date;
  submittedBy: string;
  reviewedAt?: Date;
  reviewedBy?: string;
  comments?: string;
  modifications?: string;
  traceId: string;
  brand: string;
  persona: string;
}

interface ApprovalWorkflowProps {
  artifacts: GeneratedArtifact[];
  currentBrand: string;
  currentPersona: string;
  currentUser: string;
  onApprove: (artifactId: string, comments?: string) => void;
  onReject: (artifactId: string, reason: string) => void;
  onModify: (artifactId: string, modifications: string) => void;
  onAuditEvent: (event: any) => void;
}

export default function ApprovalWorkflow({
  artifacts,
  currentBrand,
  currentPersona,
  currentUser,
  onApprove,
  onReject,
  onModify,
  onAuditEvent
}: ApprovalWorkflowProps) {
  const [approvalRequests, setApprovalRequests] = useState<ApprovalRequest[]>([]);
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [modifications, setModifications] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'modify'>('approve');

  useEffect(() => {
    // Convert artifacts to approval requests
    const newRequests = artifacts.map(artifact => ({
      id: artifact.id,
      artifact,
      status: 'pending' as const,
      submittedAt: artifact.metadata.generatedAt,
      submittedBy: artifact.metadata.persona,
      traceId: artifact.metadata.traceId,
      brand: artifact.metadata.brand,
      persona: artifact.metadata.persona
    }));

    setApprovalRequests(prev => {
      // Only add new requests
      const existingIds = new Set(prev.map(req => req.id));
      const toAdd = newRequests.filter(req => !existingIds.has(req.id));
      return [...prev, ...toAdd];
    });
  }, [artifacts]);

  const handleAction = (request: ApprovalRequest, action: 'approve' | 'reject' | 'modify') => {
    setSelectedRequest(request);
    setActionType(action);
    setShowApprovalModal(true);
    setReviewComment('');
    setModifications('');
  };

  const executeAction = () => {
    if (!selectedRequest) return;

    const auditEvent = {
      action: `scaffold_${actionType}`,
      traceId: selectedRequest.traceId,
      brand: currentBrand,
      persona: currentPersona,
      reviewedBy: currentUser,
      timestamp: new Date(),
      details: {
        artifactId: selectedRequest.id,
        fileName: selectedRequest.artifact.fileName,
        comments: reviewComment,
        modifications: actionType === 'modify' ? modifications : undefined
      }
    };

    // Update request status
    setApprovalRequests(prev =>
      prev.map(req =>
        req.id === selectedRequest.id
          ? {
              ...req,
              status: actionType === 'modify' ? 'modified' : actionType === 'approve' ? 'approved' : 'rejected',
              reviewedAt: new Date(),
              reviewedBy: currentUser,
              comments: reviewComment,
              modifications: actionType === 'modify' ? modifications : undefined
            }
          : req
      )
    );

    // Log audit event
    logger.audit(`Scaffold ${actionType} action`, 'approval-workflow', auditEvent.details, {
      tags: ['approval', 'scaffold', actionType],
      brandAffinity: [currentBrand],
      requestId: selectedRequest.traceId
    });

    onAuditEvent(auditEvent);

    // Execute callback
    switch (actionType) {
      case 'approve':
        onApprove(selectedRequest.id, reviewComment);
        break;
      case 'reject':
        onReject(selectedRequest.id, reviewComment || 'Rejected during review');
        break;
      case 'modify':
        onModify(selectedRequest.id, modifications);
        break;
    }

    setShowApprovalModal(false);
    setSelectedRequest(null);
  };

  const getStatusColor = (status: ApprovalRequest['status']) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100 border-yellow-200';
      case 'approved': return 'text-green-600 bg-green-100 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-100 border-red-200';
      case 'modified': return 'text-blue-600 bg-blue-100 border-blue-200';
      default: return 'text-gray-600 bg-gray-100 border-gray-200';
    }
  };

  const getStatusIcon = (status: ApprovalRequest['status']) => {
    switch (status) {
      case 'pending': return '⏳';
      case 'approved': return '✅';
      case 'rejected': return '❌';
      case 'modified': return '✏️';
      default: return '❓';
    }
  };

  const filteredRequests = approvalRequests.filter(req => 
    filterStatus === 'all' || req.status === filterStatus
  );

  const stats = {
    total: approvalRequests.length,
    pending: approvalRequests.filter(r => r.status === 'pending').length,
    approved: approvalRequests.filter(r => r.status === 'approved').length,
    rejected: approvalRequests.filter(r => r.status === 'rejected').length,
    modified: approvalRequests.filter(r => r.status === 'modified').length
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            🔍 Approval Workflow
          </h3>
          <div className="flex items-center space-x-2 text-sm text-gray-500">
            <span>Brand: <strong>{currentBrand}</strong></span>
            <span>•</span>
            <span>Reviewer: <strong>{currentUser}</strong></span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4 mb-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-gray-900">{stats.total}</div>
            <div className="text-xs text-gray-500">Total</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-yellow-600">{stats.pending}</div>
            <div className="text-xs text-gray-500">Pending</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">{stats.approved}</div>
            <div className="text-xs text-gray-500">Approved</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-red-600">{stats.rejected}</div>
            <div className="text-xs text-gray-500">Rejected</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">{stats.modified}</div>
            <div className="text-xs text-gray-500">Modified</div>
          </div>
        </div>

        {/* Filter */}
        <div className="flex space-x-2">
          {(['all', 'pending', 'approved', 'rejected'] as const).map(status => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                filterStatus === status
                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Requests List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredRequests.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {filterStatus === 'all' ? 'No approval requests yet' : `No ${filterStatus} requests`}
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredRequests.map(request => (
              <div key={request.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-lg">{getStatusIcon(request.status)}</span>
                      <h4 className="text-sm font-medium text-gray-900 truncate">
                        {request.artifact.fileName}
                      </h4>
                      <span className={`px-2 py-1 rounded text-xs font-medium border ${getStatusColor(request.status)}`}>
                        {request.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-2">
                      <div className="truncate">{request.artifact.preview}</div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Submitted: {request.submittedAt.toLocaleDateString()}</span>
                      <span>By: {request.submittedBy}</span>
                      <span>Trace: {request.traceId.slice(0, 8)}...</span>
                      {request.reviewedAt && (
                        <span>Reviewed: {request.reviewedAt.toLocaleDateString()}</span>
                      )}
                    </div>

                    {request.comments && (
                      <div className="mt-2 p-2 bg-gray-100 rounded text-sm">
                        <strong>Comments:</strong> {request.comments}
                      </div>
                    )}
                  </div>

                  {request.status === 'pending' && (
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleAction(request, 'approve')}
                        className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => handleAction(request, 'modify')}
                        className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                      >
                        ✏️ Modify
                      </button>
                      <button
                        onClick={() => handleAction(request, 'reject')}
                        className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approval Modal */}
      {showApprovalModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {actionType === 'approve' ? '✅ Approve' : actionType === 'reject' ? '❌ Reject' : '✏️ Modify'} Artifact
              </h3>
              
              <div className="bg-gray-50 rounded p-4 mb-4">
                <h4 className="font-medium">{selectedRequest.artifact.fileName}</h4>
                <p className="text-sm text-gray-600 mt-1">{selectedRequest.artifact.preview}</p>
                <div className="mt-2 text-xs text-gray-500">
                  <span>Generated: {selectedRequest.submittedAt.toLocaleString()}</span> • 
                  <span> Trace: {selectedRequest.traceId}</span> • 
                  <span> Brand: {selectedRequest.brand}</span>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {actionType === 'approve' ? 'Approval Comments (optional)' : 
                     actionType === 'reject' ? 'Rejection Reason' : 'Review Comments'}
                  </label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder={
                      actionType === 'approve' ? 'Optional comments about the approval...' :
                      actionType === 'reject' ? 'Please explain why this is being rejected...' :
                      'Comments about required modifications...'
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    required={actionType === 'reject'}
                  />
                </div>

                {actionType === 'modify' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Required Modifications
                    </label>
                    <textarea
                      value={modifications}
                      onChange={(e) => setModifications(e.target.value)}
                      placeholder="Describe the specific changes needed..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows={4}
                      required
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowApprovalModal(false)}
                  className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={executeAction}
                  disabled={
                    (actionType === 'reject' && !reviewComment.trim()) ||
                    (actionType === 'modify' && !modifications.trim())
                  }
                  className={`px-4 py-2 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                    actionType === 'approve' ? 'bg-green-500 hover:bg-green-600 focus:ring-green-500' :
                    actionType === 'reject' ? 'bg-red-500 hover:bg-red-600 focus:ring-red-500' :
                    'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500'
                  }`}
                >
                  {actionType === 'approve' ? 'Approve' : actionType === 'reject' ? 'Reject' : 'Request Modifications'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}