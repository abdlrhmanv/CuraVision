'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../../../../components/ui/Card';
import { Badge } from '../../../../components/ui/Badge';
import { adminApi } from '../../../../lib/apiClient';
import { useRequireAuth } from '../../../../lib/authContext';
import { Database, Brain, HardDrive, RefreshCw } from 'lucide-react';
import { Button } from '../../../../components/ui/Button';

type CheckStatus = string;

function statusVariant(status: CheckStatus): 'success' | 'destructive' | 'warning' | 'secondary' {
  if (status === 'up') return 'success';
  if (status === 'down') return 'destructive';
  if (status === 'disabled') return 'warning';
  return 'secondary';
}

function statusLabel(status: CheckStatus): string {
  if (status === 'up') return 'Connected';
  if (status === 'down') return 'Down';
  if (status === 'disabled') return 'Not configured';
  return 'Unknown';
}

export default function AdminSystemPage() {
  useRequireAuth('ADMIN');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [health, setHealth] = useState<{
    status: 'healthy' | 'degraded';
    checks: { database: string; ai_service: string; s3: string };
    timestamp: string;
  } | null>(null);

  const loadHealth = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminApi.getSystemHealth();
      setHealth(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHealth();
  }, []);

  const services = [
    { key: 'database', label: 'Database', icon: Database, status: health?.checks.database },
    { key: 'ai_service', label: 'AI Service', icon: Brain, status: health?.checks.ai_service },
    { key: 's3', label: 'S3 / Object Storage', icon: HardDrive, status: health?.checks.s3 },
  ] as const;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">System Configuration</h1>
        <Button variant="outline" onClick={loadHealth} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Connection Status</CardTitle>
        </CardHeader>
        <CardContent>
          {loading && !health ? (
            <div className="text-gray-500">Loading system health...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {services.map(({ key, label, icon: Icon, status }) => (
                <div key={key} className="border rounded-lg p-5 bg-white">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Icon className="h-5 w-5 text-gray-600" />
                      <span className="font-medium">{label}</span>
                    </div>
                    <Badge variant={statusVariant(status || 'unknown')}>
                      {statusLabel(status || 'unknown')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    {key === 'database' && 'PostgreSQL primary datastore'}
                    {key === 'ai_service' && 'FastAPI inference and analysis service'}
                    {key === 's3' && 'MinIO / S3 bucket for DICOM and derived assets'}
                  </p>
                </div>
              ))}
            </div>
          )}

          {health && (
            <p className="text-xs text-gray-400 mt-6">
              Last checked: {new Date(health.timestamp).toLocaleString()} — Overall: {health.status}
            </p>
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
