import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';

interface Booking {
  _id?: string;
  id?: string;
  userId: any;
  collectorId: any;
  locationAddress: string;
  locationLat: number;
  locationLng: number;
  serviceType?: 'sewage' | 'garbage';
  serviceDetails?: any;
  notes?: string;
  status: string;
  requestedAt: string;
}

const MyBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const fetch = async () => {
    try {
      const res = await api.get('/bookings/resident');
      setBookings(res.data || []);
    } catch (err) {
      console.error('Failed to load bookings', err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetch();

    const onRefresh = () => fetch();
    const onTaskUpdated = (e: any) => {
      const d = e?.detail;
      if (!d) return;
      if (d.type === 'booking') fetch();
    };

    window.addEventListener('booking:created', onRefresh);
    window.addEventListener('booking:updated', onRefresh);
    window.addEventListener('task:updated', onTaskUpdated);

    return () => {
      window.removeEventListener('booking:created', onRefresh);
      window.removeEventListener('booking:updated', onRefresh);
      window.removeEventListener('task:updated', onTaskUpdated);
    };
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500/10 text-green-600';
      case 'in_progress': return 'bg-blue-500/10 text-blue-600';
      case 'assigned': return 'bg-yellow-500/10 text-yellow-600';
      default: return 'bg-gray-500/10 text-gray-600';
    }
  };

  if (loading) {
    return <Card className="p-6"><p className="text-center">Loading...</p></Card>;
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">My Bookings</h2>
      
      {bookings.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No bookings yet</p>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => (
            <div key={booking.id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-medium">{booking.locationAddress}</p>
                 
                </div>
                <Badge className={getStatusColor(booking.status)}>
                  {booking.status.replace('_', ' ')}
                </Badge>
              </div>
              <div className="mb-2">
                <p className="text-sm"><strong>Service:</strong> {booking.serviceType === 'sewage' ? 'Sewage Disposal' : 'Garbage Collection'}</p>
                {booking.serviceDetails && booking.serviceType === 'garbage' && (
                  <p className="text-sm text-muted-foreground">Bags: {booking.serviceDetails.bags}</p>
                )}
                {booking.serviceDetails && booking.serviceType === 'sewage' && (
                  <p className="text-sm text-muted-foreground">Estimated Volume: {booking.serviceDetails.tankVolume || 'N/A'}</p>
                )}
              </div>
              {booking.notes && (
                <p className="text-sm text-muted-foreground mt-2">{booking.notes}</p>
                
              )}
               <p className="text-sm text-muted-foreground">
                    {new Date(booking.requestedAt).toLocaleDateString()}
                  </p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
};

export default MyBookings;
