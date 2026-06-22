import { useState, useEffect } from 'react';
import { scansApi, Scan, DoctorScan } from '../lib/apiClient';

export function useScans(patientId?: string) {
  const [scans, setScans] = useState<(Scan | DoctorScan)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchScans = async () => {
      try {
        if (patientId) {
          const res = await scansApi.listForPatient(patientId);
          setScans(res.scans);
        } else {
          // If no patientId is provided, we assume doctor context
          const res = await scansApi.listForDoctor();
          setScans(res.scans);
        }
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchScans();
  }, [patientId]);

  const refresh = async () => {
    setLoading(true);
    try {
      if (patientId) {
        const res = await scansApi.listForPatient(patientId);
        setScans(res.scans);
      } else {
        const res = await scansApi.listForDoctor();
        setScans(res.scans);
      }
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return { scans, loading, error, refresh };
}
