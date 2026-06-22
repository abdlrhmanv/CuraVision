import { useState, useEffect } from 'react';
import { reservationsApi, Reservation } from '../lib/apiClient';

export function useReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchReservations = async () => {
      try {
        const res = await reservationsApi.list();
        setReservations(res.reservations);
      } catch (err: any) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchReservations();
  }, []);

  const refresh = async () => {
    setLoading(true);
    try {
      const res = await reservationsApi.list();
      setReservations(res.reservations);
    } catch (err: any) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: Reservation["status"]) => {
    try {
      await reservationsApi.updateStatus(id, status);
      await refresh();
    } catch (err: any) {
      throw err;
    }
  };

  return { reservations, loading, error, refresh, updateStatus };
}
