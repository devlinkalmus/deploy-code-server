/**
 * Enhanced Audit System for Phase 14
 * 90-day retention, traceId tracking, persona context, and brand compliance
 */

import React, { useState, useEffect } from 'react';
import { logger, LogLevel, LogEntry } from '../../utils/logging';

export interface Phase14AuditEntry extends LogEntry {
  traceId: string;
  persona: string;
  rationale?: string;
  brandContext: string;
  retentionExpiry: Date;
  complianceFlags: string[];
  approvalStatus?: 'pending' | 'approved' | 'rejected';
  snapshot?: {
    type: 'code' | 'file' | 'config';
    content: string;
    checksum: string;
  };
}

interface AuditSystemProps {
  currentBrand: string;
  currentPersona: string;
  onExport?: (format: 'json' | 'csv') => void;
}

export default function EnhancedAuditSystem({
  currentBrand,
  currentPersona,
  onExport
}: AuditSystemProps) {
  const [auditEntries, setAuditEntries] = useState<Phase14AuditEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<Phase14AuditEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [levelFilter, setLevelFilter] = useState<LogLevel | 'all'>('all');
  const [brandFilter, setBrandFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showSnapshots, setShowSnapshots] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<Phase14AuditEntry | null>(null);
  const [retentionStats, setRetentionStats] = useState({
    total: 0,
    expiringSoon: 0,
    expired: 0
  });

  useEffect(() => {
    loadAuditEntries();
    const interval = setInterval(loadAuditEntries, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    applyFilters();
  }, [auditEntries, searchQuery, levelFilter, brandFilter, dateRange]);

  const loadAuditEntries = () => {
    // Get entries from logger with Phase 14 enhancements
    const logEntries = logger.query({ 
      level: LogLevel.AUDIT,
      limit: 1000 
    });

    // Convert to Phase 14 format and add missing properties
    const phase14Entries: Phase14AuditEntry[] = logEntries.map(entry => {
      const traceId = entry.requestId || generateTraceId();
      const retentionExpiry = new Date(entry.timestamp);
      retentionExpiry.setDate(retentionExpiry.getDate() + 90); // 90-day retention

      return {
        ...entry,
        traceId,
        persona: entry.context?.persona || currentPersona,
        rationale: entry.context?.rationale,
        brandContext: entry.brandAffinity?.[0] || currentBrand,
        retentionExpiry,
        complianceFlags: determineComplianceFlags(entry),
        approvalStatus: entry.context?.approvalStatus,
        snapshot: entry.context?.snapshot
      };
    });

    setAuditEntries(phase14Entries);
    updateRetentionStats(phase14Entries);
  };

  const generateTraceId = () => {
    return `trace_${Date.now().toString(36)}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const determineComplianceFlags = (entry: LogEntry): string[] => {
    const flags: string[] = [];
    
    if (entry.tags?.includes('scaffold')) flags.push('SCAFFOLD_GENERATION');
    if (entry.tags?.includes('approval')) flags.push('MANUAL_APPROVAL');
    if (entry.context?.brand) flags.push('BRAND_CONTEXT');
    if (entry.context?.rationale) flags.push('RATIONALE_PROVIDED');
    if (entry.level === LogLevel.SECURITY) flags.push('SECURITY_RELEVANT');
    
    return flags;
  };

  const updateRetentionStats = (entries: Phase14AuditEntry[]) => {
    const now = new Date();
    const soonThreshold = new Date();
    soonThreshold.setDate(soonThreshold.getDate() + 7); // Expiring within 7 days

    const stats = {
      total: entries.length,
      expiringSoon: entries.filter(e => e.retentionExpiry <= soonThreshold && e.retentionExpiry > now).length,
      expired: entries.filter(e => e.retentionExpiry <= now).length
    };

    setRetentionStats(stats);
  };

  const applyFilters = () => {
    let filtered = [...auditEntries];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(entry =>
        entry.message.toLowerCase().includes(query) ||
        entry.traceId.toLowerCase().includes(query) ||
        entry.persona.toLowerCase().includes(query) ||
        entry.brandContext.toLowerCase().includes(query) ||
        (entry.rationale && entry.rationale.toLowerCase().includes(query))
      );
    }

    // Level filter
    if (levelFilter !== 'all') {
      filtered = filtered.filter(entry => entry.level === levelFilter);
    }

    // Brand filter
    if (brandFilter !== 'all') {
      filtered = filtered.filter(entry => entry.brandContext === brandFilter);
    }

    // Date range filter
    if (dateRange.start) {
      const start = new Date(dateRange.start);
      filtered = filtered.filter(entry => entry.timestamp >= start);
    }
    if (dateRange.end) {
      const end = new Date(dateRange.end);
      end.setHours(23, 59, 59, 999);
      filtered = filtered.filter(entry => entry.timestamp <= end);
    }

    // Sort by timestamp (newest first)
    filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    setFilteredEntries(filtered);
  };

  const handleExport = (format: 'json' | 'csv') => {
    const exportData = filteredEntries.map(entry => ({
      id: entry.id,
      timestamp: entry.timestamp.toISOString(),
      traceId: entry.traceId,
      persona: entry.persona,
      brandContext: entry.brandContext,
      level: entry.level,
      message: entry.message,
      rationale: entry.rationale || '',
      complianceFlags: entry.complianceFlags.join(', '),
      approvalStatus: entry.approvalStatus || '',
      retentionExpiry: entry.retentionExpiry.toISOString(),
      snapshotType: entry.snapshot?.type || '',
      context: JSON.stringify(entry.context || {})
    }));

    let content: string;
    let filename: string;

    if (format === 'json') {
      content = JSON.stringify(exportData, null, 2);
      filename = `jrvi-audit-${currentBrand}-${new Date().toISOString().split('T')[0]}.json`;
    } else {
      const headers = Object.keys(exportData[0] || {});
      const csvRows = [
        headers.join(','),
        ...exportData.map(row =>
          headers.map(header => {
            const value = (row as any)[header] || '';
            return `"${String(value).replace(/"/g, '""')}"`;
          }).join(',')
        )
      ];
      content = csvRows.join('\n');
      filename = `jrvi-audit-${currentBrand}-${new Date().toISOString().split('T')[0]}.csv`;
    }

    // Create download
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);

    // Log the export
    const exportEntry: Partial<Phase14AuditEntry> = {
      id: generateTraceId(),
      timestamp: new Date(),
      traceId: generateTraceId(),
      persona: currentPersona,
      brandContext: currentBrand,
      level: LogLevel.AUDIT,
      message: `Audit log exported in ${format.toUpperCase()} format`,
      rationale: 'Compliance reporting and audit trail export',
      complianceFlags: ['AUDIT_EXPORT', 'COMPLIANCE_REPORTING'],
      retentionExpiry: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      context: {
        exportFormat: format,
        entriesCount: exportData.length,
        filters: { searchQuery, levelFilter, brandFilter, dateRange }
      }
    };

    logger.audit(exportEntry.message!, 'audit-system', exportEntry.context, {
      tags: ['audit', 'export', 'compliance'],
      brandAffinity: [currentBrand],
      requestId: exportEntry.traceId
    });

    onExport?.(format);
  };

  const cleanupExpiredEntries = () => {
    const now = new Date();
    const remaining = auditEntries.filter(entry => entry.retentionExpiry > now);
    const removed = auditEntries.length - remaining.length;
    
    setAuditEntries(remaining);
    
    logger.audit(`Cleaned up ${removed} expired audit entries`, 'audit-system', {
      removedCount: removed,
      remainingCount: remaining.length,
      brand: currentBrand
    });
  };

  const getStatusColor = (entry: Phase14AuditEntry) => {
    if (entry.retentionExpiry <= new Date()) return 'text-red-600 bg-red-50';
    if (entry.level === LogLevel.SECURITY) return 'text-purple-600 bg-purple-50';
    if (entry.approvalStatus === 'pending') return 'text-yellow-600 bg-yellow-50';
    if (entry.approvalStatus === 'approved') return 'text-green-600 bg-green-50';
    if (entry.approvalStatus === 'rejected') return 'text-red-600 bg-red-50';
    return 'text-blue-600 bg-blue-50';
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleString([], { 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
  };

  const uniqueBrands = Array.from(new Set(auditEntries.map(e => e.brandContext)));

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            📋 Enhanced Audit System (Phase 14)
          </h3>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleExport('json')}
              className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
            >
              Export JSON
            </button>
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1 bg-green-500 text-white rounded text-sm hover:bg-green-600"
            >
              Export CSV
            </button>
            <button
              onClick={cleanupExpiredEntries}
              className="px-3 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Cleanup Expired
            </button>
          </div>
        </div>

        {/* Retention Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center p-3 bg-blue-50 rounded">
            <div className="text-lg font-semibold text-blue-600">{retentionStats.total}</div>
            <div className="text-xs text-blue-500">Total Entries</div>
          </div>
          <div className="text-center p-3 bg-yellow-50 rounded">
            <div className="text-lg font-semibold text-yellow-600">{retentionStats.expiringSoon}</div>
            <div className="text-xs text-yellow-500">Expiring Soon</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded">
            <div className="text-lg font-semibold text-red-600">{retentionStats.expired}</div>
            <div className="text-xs text-red-500">Expired</div>
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search logs..."
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as LogLevel | 'all')}
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Levels</option>
            {Object.values(LogLevel).map(level => (
              <option key={level} value={level}>{level.toUpperCase()}</option>
            ))}
          </select>

          <select
            value={brandFilter}
            onChange={(e) => setBrandFilter(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="all">All Brands</option>
            {uniqueBrands.map(brand => (
              <option key={brand} value={brand}>{brand}</option>
            ))}
          </select>

          <div className="flex space-x-2">
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
              className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
              className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Entries List */}
      <div className="max-h-96 overflow-y-auto">
        {filteredEntries.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No audit entries match your criteria
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredEntries.map(entry => (
              <div
                key={entry.id}
                className={`p-4 hover:bg-gray-50 cursor-pointer ${getStatusColor(entry)}`}
                onClick={() => setSelectedEntry(entry)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="text-xs font-mono bg-gray-200 px-2 py-1 rounded">
                        {entry.traceId.slice(0, 12)}...
                      </span>
                      <span className="text-xs font-medium text-gray-600">
                        {entry.level.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">
                        {entry.persona}
                      </span>
                      <span className="text-xs text-gray-500">
                        {entry.brandContext}
                      </span>
                    </div>
                    
                    <div className="text-sm font-medium text-gray-900 mb-1">
                      {entry.message}
                    </div>
                    
                    {entry.rationale && (
                      <div className="text-xs text-gray-600 mb-1">
                        <strong>Rationale:</strong> {entry.rationale}
                      </div>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>{formatTimestamp(entry.timestamp)}</span>
                      <span>Expires: {formatTimestamp(entry.retentionExpiry)}</span>
                      {entry.complianceFlags.length > 0 && (
                        <span>Flags: {entry.complianceFlags.join(', ')}</span>
                      )}
                    </div>
                  </div>

                  {entry.snapshot && (
                    <div className="ml-4">
                      <span className="text-xs bg-purple-100 text-purple-600 px-2 py-1 rounded">
                        📸 Snapshot
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Entry Detail Modal */}
      {selectedEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Audit Entry Details</h3>
                <button
                  onClick={() => setSelectedEntry(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><strong>Trace ID:</strong> {selectedEntry.traceId}</div>
                  <div><strong>Timestamp:</strong> {formatTimestamp(selectedEntry.timestamp)}</div>
                  <div><strong>Persona:</strong> {selectedEntry.persona}</div>
                  <div><strong>Brand:</strong> {selectedEntry.brandContext}</div>
                  <div><strong>Level:</strong> {selectedEntry.level}</div>
                  <div><strong>Retention Expiry:</strong> {formatTimestamp(selectedEntry.retentionExpiry)}</div>
                </div>
                
                <div>
                  <strong>Message:</strong>
                  <div className="mt-1 p-3 bg-gray-50 rounded">{selectedEntry.message}</div>
                </div>
                
                {selectedEntry.rationale && (
                  <div>
                    <strong>Rationale:</strong>
                    <div className="mt-1 p-3 bg-gray-50 rounded">{selectedEntry.rationale}</div>
                  </div>
                )}
                
                {selectedEntry.complianceFlags.length > 0 && (
                  <div>
                    <strong>Compliance Flags:</strong>
                    <div className="mt-1 flex flex-wrap gap-2">
                      {selectedEntry.complianceFlags.map(flag => (
                        <span key={flag} className="px-2 py-1 bg-blue-100 text-blue-600 rounded text-xs">
                          {flag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                {selectedEntry.context && (
                  <div>
                    <strong>Context:</strong>
                    <pre className="mt-1 p-3 bg-gray-50 rounded text-xs overflow-x-auto">
                      {JSON.stringify(selectedEntry.context, null, 2)}
                    </pre>
                  </div>
                )}
                
                {selectedEntry.snapshot && (
                  <div>
                    <strong>Code Snapshot ({selectedEntry.snapshot.type}):</strong>
                    <div className="mt-1 p-3 bg-gray-900 text-green-400 rounded text-xs overflow-x-auto font-mono">
                      <div className="mb-2 text-gray-400">
                        Checksum: {selectedEntry.snapshot.checksum}
                      </div>
                      <pre>{selectedEntry.snapshot.content}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}