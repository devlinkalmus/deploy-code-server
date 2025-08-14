/**
 * Swap History Export Component
 * Provides exportable swap history with 90-day retention compliance
 * Part of Phase 12 implementation for JRVI
 */

import React, { useState } from 'react';

interface SwapHistoryExportProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function SwapHistoryExport({ isVisible, onClose }: SwapHistoryExportProps) {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days ago
    endDate: new Date().toISOString().split('T')[0] // today
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'json' | 'csv'>('json');

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        limit: '1000'
      });

      const response = await fetch(`/api/swap/history?${params}`);
      const result = await response.json();

      if (result.success) {
        const data = result.data;
        
        if (exportFormat === 'json') {
          downloadJSON(data, `swap-history-${dateRange.startDate}-to-${dateRange.endDate}.json`);
        } else {
          downloadCSV(data.history, `swap-history-${dateRange.startDate}-to-${dateRange.endDate}.csv`);
        }

        alert(`Successfully exported ${data.history.length} swap records.`);
      } else {
        alert('Failed to export swap history: ' + result.error);
      }
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export swap history: ' + (error as Error).message);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadJSON = (data: any, filename: string) => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadCSV = (history: any[], filename: string) => {
    if (history.length === 0) {
      alert('No data to export');
      return;
    }

    const headers = [
      'ID',
      'Trace ID',
      'Timestamp',
      'Type',
      'Action',
      'Source ID',
      'Source Version',
      'Target Version',
      'Status',
      'Initiator Type',
      'Initiator User',
      'Rationale',
      'Constitutional Check',
      'Retention Policy'
    ];

    const csvData = history.map(event => [
      event.id,
      event.traceId,
      event.timestamp,
      event.type,
      event.action,
      event.source.id,
      event.source.version,
      event.target.version,
      event.status,
      event.initiator.type,
      event.initiator.userId || '',
      `"${event.rationale.replace(/"/g, '""')}"`, // Escape quotes
      event.constitutional_check ? 'PASSED' : 'FAILED',
      event._retention_policy || '90_days_minimum'
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            Export Swap History
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Export Format
            </label>
            <select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv')}
              className="w-full p-2 border border-gray-300 rounded-md text-sm"
            >
              <option value="json">JSON (Full Data)</option>
              <option value="csv">CSV (Spreadsheet Compatible)</option>
            </select>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <h4 className="text-sm font-medium text-blue-900 mb-2">
              📋 Compliance Information
            </h4>
            <ul className="text-xs text-blue-800 space-y-1">
              <li>• Minimum 90-day retention policy enforced</li>
              <li>• All exports include constitutional compliance status</li>
              <li>• Audit trail preserved with trace IDs</li>
              <li>• JRVI Constitution and Core Principles compliance verified</li>
              <li>• AlphaOmega exclusion policy enforced</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <h4 className="text-sm font-medium text-yellow-900 mb-1">
              🔒 Security Notice
            </h4>
            <p className="text-xs text-yellow-800">
              Exported data contains sensitive system information. Handle according to your organization's data security policies.
            </p>
          </div>
        </div>

        <div className="flex justify-end space-x-3 mt-6">
          <button
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isExporting && (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            )}
            <span>{isExporting ? 'Exporting...' : 'Export History'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}