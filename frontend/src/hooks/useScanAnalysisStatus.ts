import { useState, useEffect, useCallback } from 'react';
import { scansApi, Scan, ScanAnalysis, API_BASE_URL } from '../lib/apiClient';

const TERMINAL_STATUSES = ['ANALYSIS_COMPLETE', 'FAILED', 'UPLOADED'];

export function useScanAnalysisStatus(scanId: string) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [analysis, setAnalysis] = useState<ScanAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let es: EventSource | null = null;
    let isActive = true;

    const fetchInitial = async () => {
      setLoading(true);
      setError(null);
      try {
        const scanData = await scansApi.get(scanId);
        if (!isActive) return;
        setScan(scanData);

        if (scanData.status === 'ANALYSIS_COMPLETE') {
          const analysisData = await scansApi.analysis(scanId);
          if (!isActive) return;
          setAnalysis(analysisData);
          setLoading(false);
        } else if (scanData.status === 'FAILED') {
          setError(new Error('Analysis failed'));
          setLoading(false);
        } else if (scanData.status === 'UPLOADED') {
          setLoading(false);
        } else {
          const token = localStorage.getItem('token') || '';
          es = new EventSource(`${API_BASE_URL}/api/scans/${scanId}/status-stream?token=${token}`);

          es.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            setScan((prev) => (prev ? { ...prev, status: data.status } : null));

            if (data.status === 'ANALYSIS_COMPLETE') {
              const analysisData = await scansApi.analysis(scanId);
              if (isActive) {
                setAnalysis(analysisData);
                setLoading(false);
              }
              es?.close();
            } else if (data.status === 'FAILED') {
              setError(new Error('Analysis failed'));
              setLoading(false);
              es?.close();
            }
          };

          setLoading(false);
        }
      } catch (err) {
        if (!isActive) return;
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    };

    fetchInitial();

    return () => {
      isActive = false;
      es?.close();
    };
  }, [scanId, tick]);

  return { scan, analysis, loading, error, refetch, isTerminal: scan ? TERMINAL_STATUSES.includes(scan.status) : false };
}
