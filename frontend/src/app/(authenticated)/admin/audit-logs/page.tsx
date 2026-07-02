'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/Card';
import { Button } from '../../../../components/ui/Button';
import { adminApi, AuditLog } from '../../../../lib/apiClient';
import { useRequireAuth } from '../../../../lib/authContext';
import { Download, Filter } from 'lucide-react';

const LOGS_PER_PAGE = 50;

export default function AdminAuditLogsPage() {
  useRequireAuth('ADMIN');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState({
    user_id: '',
    action: '',
    entity_type: '',
    from: '',
    to: '',
  });
  const [appliedFilters, setAppliedFilters] = useState(draftFilters);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalLogs, setTotalLogs] = useState(0);
  const totalPages = Math.max(1, Math.ceil(totalLogs / LOGS_PER_PAGE));

  const fetchAuditLogs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminApi.getAuditLogs({
        user_id: appliedFilters.user_id || undefined,
        action: appliedFilters.action || undefined,
        entity_type: appliedFilters.entity_type || undefined,
        from: appliedFilters.from || undefined,
        to: appliedFilters.to || undefined,
        limit: LOGS_PER_PAGE,
        offset: (currentPage - 1) * LOGS_PER_PAGE,
      });
      setAuditLogs(response.logs);
      setTotalLogs(response.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [appliedFilters, currentPage]);

  useEffect(() => {
    fetchAuditLogs();
  }, [fetchAuditLogs]);

  const handleDraftChange = (key: string, value: string) => {
    setDraftFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    setAppliedFilters({ ...draftFilters });
  };

  const exportLogs = () => {
    const csvContent = [
      ['Timestamp', 'User ID', 'Action', 'Entity Type', 'Entity ID', 'Metadata'].join(','),
      ...auditLogs.map((log) => [
        log.timestamp,
        log.user_id,
        log.action,
        log.entity_type,
        log.entity_id,
        JSON.stringify(log.metadata || {}),
      ].join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('UPLOAD')) return 'bg-green-100 text-green-800';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'bg-blue-100 text-blue-800';
    if (action.includes('DELETE') || action.includes('DISABLE')) return 'bg-red-100 text-red-800';
    if (action.includes('VIEW') || action.includes('LOGIN')) return 'bg-gray-100 text-gray-800';
    return 'bg-purple-100 text-purple-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
        <Button onClick={exportLogs} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Logs
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={draftFilters.user_id}
                onChange={(e) => handleDraftChange('user_id', e.target.value)}
                placeholder="Filter by user ID"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={draftFilters.action}
                onChange={(e) => handleDraftChange('action', e.target.value)}
              >
                <option value="">All Actions</option>
                <option value="LOGIN_SUCCESS">Login Success</option>
                <option value="SCAN_UPLOAD">Upload Scan</option>
                <option value="VIEW_SCAN">View Scan</option>
                <option value="VIEW_ANALYSIS">View Analysis</option>
                <option value="EDIT_REPORT">Edit Report</option>
                <option value="APPROVE_REPORT">Approve Report</option>
                <option value="ADMIN_UPDATE_USER">Admin Update User</option>
                <option value="ADMIN_CREATE_USER">Admin Create User</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
              <select
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={draftFilters.entity_type}
                onChange={(e) => handleDraftChange('entity_type', e.target.value)}
              >
                <option value="">All Types</option>
                <option value="USER">User</option>
                <option value="SCAN">Scan</option>
                <option value="REPORT">Report</option>
                <option value="CHAT">Chat</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date From</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={draftFilters.from}
                onChange={(e) => handleDraftChange('from', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date To</label>
              <input
                type="date"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                value={draftFilters.to}
                onChange={(e) => handleDraftChange('to', e.target.value)}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={applyFilters} className="w-full">Apply</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            Audit Logs ({auditLogs.length} shown, {totalLogs} total — {LOGS_PER_PAGE} per page)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 font-medium text-gray-500">Timestamp</th>
                    <th className="px-4 py-3 font-medium text-gray-500">User ID</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Action</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Entity Type</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Entity ID</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Metadata</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium">{log.user_id}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getActionBadgeColor(log.action)}`}>
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">{log.entity_type}</td>
                      <td className="px-4 py-3 font-mono text-xs">{log.entity_id}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                        {log.metadata ? JSON.stringify(log.metadata) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-gray-500">Page {currentPage} of {totalPages}</div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
}
