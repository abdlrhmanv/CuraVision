import { useState, useEffect } from 'react';
import { scansApi, Scan, ScanAnalysis, API_BASE_URL } from '../lib/apiClient';

export function useScanAnalysisStatus(scanId: string) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [analysis, setAnalysis] = useState<ScanAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let es: EventSource | null = null;
    let isActive = true;

    const fetchInitial = async () => {
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
        } else {
          // If still running, connect to SSE
          const token = localStorage.getItem('token') || '';
          es = new EventSource(`${API_BASE_URL}/api/scans/${scanId}/status-stream?token=${token}`);
          
          es.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            setScan((prev) => prev ? { ...prev, status: data.status } : null);
            
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

          es.onerror = () => {
            if (isActive && es?.readyState === EventSource.CLOSED) {
              // reconnect logic if desired or just let it be
            }
          };
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
      if (es) {
        es.close();
      }
    };
  }, [scanId]);

  return { scan, analysis, loading, error };
}
