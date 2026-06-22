import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useReservations } from '../../hooks/useReservations';

export function BookingCalendar() {
  const { reservations, loading, updateStatus } = useReservations();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  if (loading) {
    return <div className="animate-pulse h-96 bg-gray-100 rounded-xl"></div>;
  }

  // Very simple rendering of today's reservations
  const todayReservations = reservations.filter(r => {
    const rDate = new Date(r.start_time);
    return rDate.toDateString() === selectedDate.toDateString();
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Appointments</CardTitle>
        <div className="flex items-center justify-between mt-2">
          <Button variant="ghost" size="sm" onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() - 1);
            setSelectedDate(d);
          }}>
            &larr; Prev
          </Button>
          <span className="font-medium text-sm">{selectedDate.toDateString()}</span>
          <Button variant="ghost" size="sm" onClick={() => {
            const d = new Date(selectedDate);
            d.setDate(d.getDate() + 1);
            setSelectedDate(d);
          }}>
            Next &rarr;
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {todayReservations.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-10 border rounded-lg border-dashed">
            No appointments scheduled for this date.
          </div>
        ) : (
          <div className="space-y-3">
            {todayReservations.map(res => (
              <div key={res.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-gray-50">
                <div>
                  <div className="font-medium text-sm">
                    {new Date(res.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(res.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Patient ID: {res.patient_id.substring(0, 8)}...</div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant={res.status === 'CONFIRMED' ? 'success' : res.status === 'PENDING' ? 'warning' : 'default'}>
                    {res.status}
                  </Badge>
                  {res.status === 'PENDING' && (
                    <Button size="sm" variant="outline" onClick={() => updateStatus(res.id, 'CONFIRMED')} className="text-xs h-7 px-2">
                      Confirm
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
