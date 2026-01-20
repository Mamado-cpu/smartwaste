import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { io as clientIo, Socket } from 'socket.io-client';
import { Truck } from 'lucide-react';
import api from '@/lib/api';
import MapView from '@/components/ui/map-view';

interface Collector {
  collectorId: string;
  vehicleNumber?: string;
  vehicleType?: string;
  currentLat?: number;
  currentLng?: number;
  lastLocationUpdate?: string;
  isAvailable?: boolean;
}

const LiveTracking = () => {
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [loading, setLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);

  /**
   * 🔹 INITIAL FETCH (RUNS ONCE)
   */
  const fetchInitialCollectors = async () => {
    try {
      const token = localStorage.getItem('auth_token');

      const res = await api.get('/locations/admin/collectors', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = res.data || [];

      const mapped: Collector[] = data.map((c: any) => ({
        collectorId: c.collectorId || c._id || c.id,
        vehicleNumber: c.vehicleNumber,
        vehicleType: c.vehicleType,
        currentLat:
          c.lastKnownLocation?.latitude ||
          c.realtimeLocation?.latitude,
        currentLng:
          c.lastKnownLocation?.longitude ||
          c.realtimeLocation?.longitude,
        lastLocationUpdate:
          c.lastKnownLocation?.timestamp ||
          c.realtimeLocation?.timestamp,
        isAvailable: (c.lastKnownLocation?.latitude || c.realtimeLocation?.latitude) &&
               (c.lastKnownLocation?.longitude || c.realtimeLocation?.longitude)
               ? c.isAvailable ?? true
               : false
      }));

      setCollectors(mapped);
    } catch (e) {
      console.error('Failed to fetch collectors');
    } finally {
      setLoading(false);
    }
  };

  /**
   * 🔹 SOCKET SETUP
   */
  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem('auth_token');

    fetchInitialCollectors(); // ✅ fetch ONCE

    const baseURL = (api.defaults.baseURL || '').replace(/\/api$/, '');

    const socket =
      (window as any).__admin_socket ||
      clientIo(baseURL, {
        auth: { token },
        query: { role: 'admin' },
        transports: ['websocket'],
      });

    (window as any).__admin_socket = socket;
    socketRef.current = socket;

    socket.on('collector:update', (payload: any) => {
      if (!mounted || !payload) return;

      const updates = Array.isArray(payload) ? payload : [payload];

      setCollectors((prev) => {
        const map = new Map<string, Collector>(
          prev.map((c) => [c.collectorId, c])
        );

        updates.forEach((u: any) => {
          if (!u.collectorId) return;

          const prev = map.get(u.collectorId);

          map.set(u.collectorId, {
            collectorId: u.collectorId,
            vehicleNumber: u.vehicleNumber  ?? prev?.vehicleNumber ?? 'Truck',
            vehicleType: u.vehicleType ?? prev?.vehicleType ?? 'Collector',
            currentLat: u.latitude,
            currentLng: u.longitude,
            lastLocationUpdate: u.timestamp,
            isAvailable:u.latitude && u.longitude ? u.isOnline ?? true : false
          });
        });

        return Array.from(map.values());
      });
    });

    socket.on('connect_error', (err) => {
      console.warn('Socket failed, staying with initial data', err.message);
    });

    return () => {
      mounted = false;
      socket.off('collector:update');
    };
  }, []);

  if (loading) {
    return (
      <Card className="p-6">
        <p className="text-center">Loading collectors...</p>
      </Card>
    );
  }

  /**
   * 🔹 MAP MARKERS (ONLY VALID GPS)
   */

  // Small offset to avoid overlapping markers
const jitter = () => (Math.random() - 0.5) * 0.0001;

  const markers = collectors
    .filter((c) => c.currentLat !== undefined && c.currentLng !== undefined)
    .map((c) => ({
      id: c.collectorId,
      position: [
        c.currentLat! + jitter(), 
        c.currentLng! + jitter()] as [number, number],
      title: c.vehicleNumber || 'Truck',
      description: c.lastLocationUpdate
        ? `Updated: ${new Date(c.lastLocationUpdate).toLocaleTimeString()}`
        : 'No recent update',
    }));

console.log('[ADMIN TRACKING] collectors with GPS:', collectors.filter(c => c.currentLat && c.currentLng));


  return (
    
    <div className="space-y-4">
      {/* LIST */}
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Live Truck Tracking</h2>

        {collectors.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            No collectors found
          </p>
        ) : (
          <div className="space-y-3">
            {collectors.map((collector) => (
              <div
                key={collector.collectorId}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50"
              >
                <div className="flex items-center gap-3">
                  <Truck className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">
                      {collector.vehicleNumber || 'Truck'}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {collector.vehicleType || 'Collector'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {collector.currentLat && collector.currentLng
                        ? `Location: ${collector.currentLat.toFixed(
                            4
                          )}, ${collector.currentLng.toFixed(4)}`
                        : 'No GPS yet'}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-3 py-1 rounded-full text-xs ${
                    collector.isAvailable
                      ? 'bg-green-500/10 text-green-600'
                      : 'bg-yellow-500/10 text-yellow-600'
                  }`}
                >
                  {collector.isAvailable ? 'Available' : 'Not Available'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* MAP */}
      

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">Map View</h3>
        
        <MapView
          center={markers[0]?.position || [13.4549, -16.579]}
          zoom={11}
          markers={markers}
        />
      </Card>
    </div>
  );
};

export default LiveTracking;
