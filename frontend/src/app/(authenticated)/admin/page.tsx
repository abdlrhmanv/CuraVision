'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../components/ui/Card';
import { Badge } from '../../../components/ui/Badge';
import { adminApi, AuditLog } from '../../../lib/apiClient';
import { useRequireAuth } from '../../../lib/authContext';
import { Activity, Users, FileText, AlertTriangle } from 'lucide-react';

interface DashboardStats {
  totalUsers: number;
  totalScans: number;
  totalReports: number;
  systemHealth: 'healthy' | 'warning' | 'error';
}

export default function AdminDashboard() {
  const { user } = useRequireAuth('ADMIN');
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalScans: 0,
    totalReports: 0,
    systemHealth: 'healthy'
  });
  const [recentLogs, setRecentLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // Fetch recent audit logs
        const logsResponse = await adminApi.getAuditLogs({ limit: 10 });
        setRecentLogs(logsResponse.logs);

        // Fetch user stats
        const usersResponse = await adminApi.listUsers();
        setStats(prev => ({ ...prev, totalUsers: usersResponse.total }));

        // Note: In a real implementation, you'd have endpoints for scan and report counts
        // For now, we'll use placeholder values
        setStats(prev => ({
          ...prev,
          totalScans: 1247, // Placeholder
          totalReports: 892, // Placeholder
        }));

      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getActionBadgeColor = (action: string) => {
    if (action.includes('CREATE') || action.includes('UPLOAD')) return 'success';
    if (action.includes('UPDATE') || action.includes('EDIT')) return 'default';
    if (action.includes('DELETE') || action.includes('DISABLE')) return 'destructive';
    if (action.includes('VIEW') || action.includes('LOGIN')) return 'secondary';
    return 'outline';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-1/2"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              Total Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-green-600 mt-1">Active users</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              Total Scans
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalScans}</div>
            <p className="text-xs text-green-600 mt-1">Processed scans</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              Total Reports
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{stats.totalReports}</div>
            <p className="text-xs text-green-600 mt-1">Generated reports</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 uppercase tracking-wider">
              System Health
            </CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${
              stats.systemHealth === 'healthy' ? 'text-green-600' :
              stats.systemHealth === 'warning' ? 'text-yellow-600' : 'text-red-600'
            }`}>
              {stats.systemHealth === 'healthy' ? 'Healthy' :
               stats.systemHealth === 'warning' ? 'Warning' : 'Error'}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {stats.systemHealth === 'healthy' ? 'All systems operational' :
               stats.systemHealth === 'warning' ? 'Minor issues detected' : 'Critical issues'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2" />
            Recent Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 font-medium text-gray-500">Timestamp</th>
                  <th className="px-4 py-3 font-medium text-gray-500">User ID</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Action</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Entity Type</th>
                  <th className="px-4 py-3 font-medium text-gray-500">Entity ID</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                      No audit logs available
                    </td>
                  </tr>
                ) : (
                  recentLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 font-medium">{log.user_id}</td>
                      <td className="px-4 py-3">
                        <Badge variant={getActionBadgeColor(log.action)}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">{log.entity_type}</td>
                      <td className="px-4 py-3 font-mono text-xs">{log.entity_id}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
