import { useState, useEffect } from 'react';
import { scansApi, Scan, ScanAnalysis } from '../lib/apiClient';

export function useScanAnalysisStatus(scanId: string) {
  const [scan, setScan] = useState<Scan | null>(null);
  const [analysis, setAnalysis] = useState<ScanAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const scanData = await scansApi.get(scanId);
        setScan(scanData);

        if (scanData.status === 'ANALYSIS_COMPLETE') {
          const analysisData = await scansApi.analysis(scanId);
          setAnalysis(analysisData);
          setLoading(false);
          if (intervalId) clearInterval(intervalId);
        } else if (scanData.status === 'FAILED') {
          setError(new Error('Analysis failed'));
          setLoading(false);
          if (intervalId) clearInterval(intervalId);
        } else {
          // Keep polling if status is ANALYSIS_PENDING or ANALYSIS_RUNNING
          setLoading(true);
        }
      } catch (err: any) {
        setError(err);
        setLoading(false);
        if (intervalId) clearInterval(intervalId);
      }
    };

    fetchStatus(); // Initial fetch
    intervalId = setInterval(fetchStatus, 3000); // Poll every 3 seconds

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [scanId]);

  return { scan, analysis, loading, error };
}
