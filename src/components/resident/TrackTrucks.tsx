import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import api from '@/lib/api';
import { io as clientIo } from 'socket.io-client';
import MapView from '@/components/ui/map-view';

const POLL_MS = 5000;


const jitter = () => (Math.random() - 0.5) * 0.0001;

const normalizeCollector = (v: any) => ({
  collectorId: v.collectorId || v._id,
  currentLat: v.latitude,
  currentLng: v.longitude,
  lastLocationUpdate: v.timestamp,
  vehicleNumber:
    v.vehicleNumber ??
    v.collectorInfo?.vehicleNumber ?? undefined,
  vehicleType:
    v.vehicleType ??
    v.collectorInfo?.vehicleType ??
    undefined,
  isAvailable:
    v.latitude && v.longitude
      ? v.isOnline ?? v.collectorInfo?.isAvailable ?? true
      : false,
});

const TrackTrucks = () => {
  const [collectors, setCollectors] = useState<any[]>([]);
  const [notifyEnabled, setNotifyEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number, lng: number } | null>(null);
  const pollRef = useRef<number | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const residentLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const notifiedRef = useRef<Record<string, number>>({});


  // match collector data structure

    const mergeCollectors = (incoming: any[]) => {
    setCollectors((prev) => {
      const map = new Map(prev.map((c) => [c.collectorId, c])); // Use collectorId as the unique key

      incoming
        .filter((c) => c.currentLat && c.currentLng) // Only include trucks with valid locations
        .forEach((c) => {
          map.set(c.collectorId, {
            ...map.get(c.collectorId), // Merge with existing data if present
            ...c, // Overwrite with new data
            vehicleNumber: c.vehicleNumber ?? map.get(c.collectorId)?.vehicleNumber,
            vehicleType: c.vehicleType ?? map.get(c.collectorId)?.vehicleType,
          });
        });

      return Array.from(map.values()); // Return unique collectors
    });
  };


  const fetchLocations = async () => {
    try {
      const res = await api.get(`/locations/collectors?timestamp=${Date.now()}`); // Add cache-busting parameter
      const data = res.data || {};

      const mapped = Object.entries(data)
        .map(([_, v]: any) => normalizeCollector(v))
        .filter((c) => c.currentLat && c.currentLng); // Only include trucks with valid locations

      if (mapped.length === 0) {
        setCollectors([]); // Clear state if no valid trucks are found
      } else {
        mergeCollectors(mapped);
      }
    } catch {
      setCollectors([]); // Clear state on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem('auth_token');

    // Fetch truck details immediately on component mount
    fetchLocations();

    

    // Try to obtain resident's current location for proximity checks
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          residentLocationRef.current = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 600000, timeout: 10000 }
      );
    }

    // Prefer socket.io for lower latency, fallback to SSE/polling
    try {
      const base = (api.defaults.baseURL || '').replace(/\/api$/, '');
      const socket =
        (window as any).__resident_socket ||
        clientIo(base, { query: { role: 'resident' }, auth: { token } });
      (window as any).__resident_socket = socket;

      socket.on('collector:update', (payload: any) => {
        if (!mounted) return;
        try {
          const arr = Array.isArray(payload) ? payload : [payload];
          const mapped = arr.map((v: any) => normalizeCollector(v));

          mergeCollectors(mapped); // Update state immediately with new data

          setLoading(false);
        } catch (e) {
          console.error('Error processing collector:update event:', e);
        }
      });

      socket.on('collector:start', (collector) => {
        if (!mounted) return;
        try {
          console.log(`collector:start event received for collectorId: ${collector.collectorId}`); // Debugging log

          setCollectors((prev) => {
            const updatedCollectors = [...prev, collector]; // Add the new collector

            console.log('Updated collectors state after start:', updatedCollectors); // Debugging log

            return updatedCollectors; // Ensure a new array reference to trigger re-render
          });
        } catch (e) {
          console.error('Error processing collector:start event:', e);
        }
      });

      socket.on('collector:stop', (collectorId: string) => {
        if (!mounted) return;
        try {
          console.log(`collector:stop event received for collectorId: ${collectorId}`); // Debugging log

          setCollectors((prev) => {
            const updatedCollectors = prev.filter((c) => c.collectorId !== collectorId); // Remove the collector

            console.log('Updated collectors state after stop:', updatedCollectors); // Debugging log

            if (updatedCollectors.length === 0) {
              toast.info('No trucks found'); // Notify resident if no trucks are available
            }

            return updatedCollectors; // Ensure a new array reference to trigger re-render
          });
        } catch (e) {
          console.error('Error processing collector:stop event:', e);
        }
      });

      socket.on('connect_error', (err) => {
        console.error('Socket connection error:', err); // Debugging log
        toast.error('Connection lost. Please check your network.');
      });
    } catch (err) {
      // fallback to SSE/polling
      fetchLocations();
      pollRef.current = window.setInterval(fetchLocations, POLL_MS) as unknown as number;
    }

        // --- AUTO REMOVE STALE COLLECTORS ---
    const interval = setInterval(() => {
      setCollectors((prev) =>
        prev.filter(c => c.lastLocationUpdate && (Date.now() - new Date(c.lastLocationUpdate).getTime() <= 60_000))
      );
    }, 5000);

    return () => {
      mounted = false;
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (esRef.current) {
        try {
          esRef.current.close();
        } catch (e) {}
      }
    };
  }, []);



  // Haversine formula (meters)
  const distanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const toRad = (x: number) => x * Math.PI / 180;
    const R = 6371000; // meters
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  if (loading) return <Card className="p-6"><p className="text-center">Loading...</p></Card>;

  // Use only active collectors for cards & markers
  const activeCollectors = collectors.filter(c => c.currentLat && c.currentLng);

  const markers = activeCollectors.map(c => ({ 
    id: c.collectorId, 
    position: [
      c.currentLat! + jitter(), 
      c.currentLng! + jitter()
    ] as [number, number], 
    title: c.vehicleNumber, 
    description:

     `
       ${c.vehicleType}
    Lat: ${c.currentLat.toFixed(4)}
    Lng: ${c.currentLng.toFixed(4)}
     Updated: ${c.lastLocationUpdate ? new Date(c.lastLocationUpdate).toLocaleTimeString() : 'N/A'}` }));

     console.log('[ADMIN TRACKING] collectors with GPS:', collectors.filter(c => c.currentLat && c.currentLng));


  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold mb-4">Track Collection Trucks</h2>
          <div>
            <Button size="sm" variant={notifyEnabled ? 'destructive' : 'ghost'} onClick={() => setNotifyEnabled(s => !s)}>
              {notifyEnabled ? 'Disable Nearby Alerts' : 'Enable Nearby Alerts'}
            </Button>
            <Button size="sm" className="ml-2" onClick={() => {
              if (!navigator.geolocation) return toast.error('Geolocation not supported');
              navigator.geolocation.getCurrentPosition((pos) => {

              setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });

                
              }, () => {
                toast.error('Unable to fetch your location');
              }, { enableHighAccuracy: true, maximumAge: 600000, timeout: 10000 });
            }}>
              Toggle My Location
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {activeCollectors.length === 0 && !loading && (
            <p className="text-center text-muted-foreground py-4 col-span-2">
              No collectors found. Ensure your location is enabled and try again.
            </p>
          )}
          {activeCollectors.map(collector => (
            <div key={collector.collectorId} className="p-4 border rounded-md shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{collector.vehicleNumber || 'Truck'}</h3>
                <Badge variant={collector.isAvailable ? 'default' : 'destructive'}>{collector.isAvailable ? 'Available' : 'Not Available'}</Badge>
              </div>
              <div className="text-sm text-muted-foreground">
                <div>Lat: {collector.currentLat.toFixed(4)}</div>
                <div>Lng: {collector.currentLng.toFixed(4)}</div>
                <div>Last Updated: {collector.lastLocationUpdate ? new Date(collector.lastLocationUpdate).toLocaleString() : 'N/A'}</div>
              </div>
              <Button size="sm" variant="outline" className="w-full" onClick={() => {
                if (!userLocation) {
                  toast.error('Please enable your location first');
                  return;
                }
                window.open(
                  `https://www.google.com/maps/dir/?api=1&destination=${collector.currentLat},${collector.currentLng}&origin=${userLocation.lat},${userLocation.lng}&travelmode=driving`,
                  '_blank'
                );
              }}>
                Navigate to Collector
              </Button>
            </div>
          ))}
        </div>
      </Card>
      <Card className="p-6">
        <h3 className="text-xl font-bold mb-4">Map View</h3>
        <div className="h-96">
          <MapView
            markers={[
              ...markers,
              userLocation && {
                id: 'resident',
                position: [userLocation.lat, userLocation.lng],
                title: 'Your Location',
                description: 'This is your current location',
              },
            ].filter(Boolean)}
            center={userLocation ? [userLocation.lat, userLocation.lng] : activeCollectors[0] ? [activeCollectors[0].currentLat, activeCollectors[0].currentLng] : [13.4531, -16.5780]}
            zoom={12}
          />
        </div>
      </Card>
    </div>
  );
};

export default TrackTrucks;

