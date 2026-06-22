import { useState, useEffect } from 'react';
import { reportsApi, Report } from '../lib/apiClient';

export function useReports() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const res = await reportsApi.listForPatient();
        setReports(res.reports);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReports();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await reportsApi.listForPatient();
      setReports(res.reports);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { reports, loading, error, refresh };
}
