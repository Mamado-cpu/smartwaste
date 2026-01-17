import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import MapView from '@/components/ui/map-view';
import { toast } from 'sonner';
import api from '@/lib/api';

interface Collector {
  _id: string;
  locationLat?: number;
  locationLng?: number;
  vehicleNumber?: string;
  lastUpdated?: string;
}

const TrackCollectors = () => {
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCollectors = async () => {
      try {
        const res = await api.get('/admin/collectors');
        setCollectors(res.data || []);
      } catch (err) {
        toast.error('Failed to fetch collectors');
      } finally {
        setLoading(false);
      }
    };

    fetchCollectors();
  }, []);

  if (loading) return <Card className="p-6"><p className="text-center">Loading...</p></Card>;

  const markers = collectors.map((collector) => ({
    id: collector._id,
    position: [
      collector.locationLat || 0, // Default to 0 if undefined
      collector.locationLng || 0, // Default to 0 if undefined
    ],
    title: collector.vehicleNumber || `Collector ${collector._id}`,
    description: `Updated: ${
      collector.lastUpdated ? new Date(collector.lastUpdated).toLocaleTimeString() : 'N/A'
    }`,
  }));

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Track Collectors</h2>
        {collectors.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No active collectors</p>
        ) : (
          <div className="space-y-3">
            {collectors.map((collector) => (
              <div key={collector._id} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{collector.vehicleNumber || `Collector ${collector._id}`}</p>
                    <p className="text-sm text-muted-foreground">
                      Location: {collector.locationLat?.toFixed(4) || 'N/A'}, {collector.locationLng?.toFixed(4) || 'N/A'}
                    </p>
                    {collector.lastUpdated && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Updated: {new Date(collector.lastUpdated).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">Map View</h3>
        <MapView
          center={markers[0] ? markers[0].position : [13.4549, -16.579]}
          zoom={12}
          markers={markers.map((m) => ({
            position: m.position,
            title: m.title,
            description: m.description,
          }))}
        />
      </Card>
    </div>
  );
};

export default TrackCollectors;