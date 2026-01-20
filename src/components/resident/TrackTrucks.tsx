
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
  const pollRef = useRef<number | null>(null);
  const esRef = useRef<EventSource | null>(null);
  const residentLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const notifiedRef = useRef<Record<string, number>>({});


  // match collector data structure

    const mergeCollectors = (incoming: any[]) => {
    setCollectors(prev => {
      const map = new Map(prev.map(c => [c.collectorId, c]));
      incoming.forEach(c => {
        const prevCollector = map.get(c.collectorId);
        map.set(c.collectorId, {
          ...prevCollector,
          ...c,
   
           vehicleNumber:
          c.vehicleNumber ?? prevCollector?.vehicleNumber,

           vehicleType:
          c.vehicleType ?? prevCollector?.vehicleType,

        });
      });
      return Array.from(map.values());
    });
  };


  const fetchLocations = async () => {
    try {
      const res = await api.get('/locations/collectors');
      const data = res.data || {};

     const mapped = Object.entries(data)
        .map(([_, v]: any) => normalizeCollector(v))
        .filter(c => c.currentLat && c.currentLng);

      mergeCollectors(mapped);
    } catch {
      setCollectors([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const token = localStorage.getItem('auth_token');

    // Try to obtain resident's current location for proximity checks
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        residentLocationRef.current = { 
          lat: pos.coords.latitude, 
          lng: pos.coords.longitude };
      }, () => {}, { enableHighAccuracy: true, maximumAge: 600000, timeout: 10000 });
    }

    // Prefer socket.io for lower latency, fallback to SSE/polling
    try {
      const base = (api.defaults.baseURL || '').replace(/\/api$/, '');
      const socket = (window as any).__resident_socket || clientIo(base, { query: { role: 'resident' }, auth: { token } });
      (window as any).__resident_socket = socket;

      socket.on('collector:update', (payload: any) => {
        if (!mounted) return;
        try {

          const arr = Array.isArray(payload) ? payload : [payload];
          const mapped = arr.map((v: any) => normalizeCollector(v));

          mergeCollectors(mapped);

          // proximity notifications
          if (notifyEnabled && residentLocationRef.current) {
            mapped.forEach((c: any) => {
              try {
                const dist = distanceMeters(
                  residentLocationRef.current!.lat, 
                  residentLocationRef.current!.lng, 
                  c.currentLat, 
                  c.currentLng);
                if (dist <= 500) {
                  const last = notifiedRef.current[c.collectorId] || 0;
                  const now = Date.now();
                  if (now - last > (5 * 60 * 1000)) {
                    notifiedRef.current[c.collectorId] = now;
                    toast(`Collector nearby: ${c.vehicleNumber || 'Truck'} (${Math.round(dist)} m)`);
                    if (window.Notification && Notification.permission === 'granted') {
                      try { new Notification('Collector nearby', { body: `${c.vehicleNumber || 'Truck'} is ${Math.round(dist)} m away` }); } catch (e) {}
                    }
                  }
                }
              } catch (e) {}
            });
          }
          setLoading(false);
        } catch (e) {}
      });

      socket.on('connect_error', () => {
        // fallback to SSE/polling if socket fails

        try { 
          if ((window as any).__resident_socket) { (window as any).__resident_socket = null; } } catch (e) {}
        const streamUrl = `${api.defaults.baseURL}/locations/stream${token ? `?token=${token}` : ''}`;
        const es = new EventSource(streamUrl);
        esRef.current = es;
        es.onmessage = (evt) => {
          if (!mounted) return;
          try {
            const data = JSON.parse(evt.data || '{}');
            const arr = Object.entries(data || {}).map(([collectorId, v]: any) => normalizeCollector({
              collectorId,
              ...v,
             })
            );
            mergeCollectors(arr.filter(c => c.currentLat && c.currentLng));
            // proximity notifications

            if (notifyEnabled && residentLocationRef.current) {
              arr.forEach((c: any) => {
                try {
                  const dist = distanceMeters(residentLocationRef.current!.lat, residentLocationRef.current!.lng, c.currentLat, c.currentLng);
                  if (dist <= 500) {
                    const last = notifiedRef.current[c.collectorId] || 0;
                    const now = Date.now();
                    if (now - last > (5 * 60 * 1000)) {
                      notifiedRef.current[c.collectorId] = now;
                      toast(`Collector nearby: ${c.vehicleNumber || 'Truck'} (${Math.round(dist)} m)`);
                      if (window.Notification && Notification.permission === 'granted') {
                        try { new Notification('Collector nearby', { body: `${c.vehicleNumber || 'Truck'} is ${Math.round(dist)} m away` }); } catch (e) {}
                      } else if (window.Notification && Notification.permission !== 'denied') {
                        Notification.requestPermission().then(p => { if (p === 'granted') { try { new Notification('Collector nearby', { body: `${c.vehicleNumber || 'Truck'} is ${Math.round(dist)} m away` }); } catch (e) {} } });
                      }
                    }
                  }
                } catch (e) {}
              });
            }
            setLoading(false);
          } catch (err) {}
        };
        es.onerror = () => {
          if (esRef.current) { esRef.current.close(); esRef.current = null; }
          fetchLocations();
          pollRef.current = window.setInterval(fetchLocations, POLL_MS) as unknown as number;
        };
      });
    } catch (err) {
      // fallback to SSE/polling
      fetchLocations();
      pollRef.current = window.setInterval(fetchLocations, POLL_MS) as unknown as number;
    }

    return () => {
      mounted = false;
      if (pollRef.current) window.clearInterval(pollRef.current);
      if (esRef.current) {
        try { esRef.current.close(); } catch (e) {}
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

  const markers = collectors.map(c => ({ 
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
            <Button size="sm" className="ml-2" onClick={async () => {
              if (!navigator.geolocation) return toast.error('Geolocation not supported');
              navigator.geolocation.getCurrentPosition(async (pos) => {
                const lat = pos.coords.latitude; const lng = pos.coords.longitude;
                try {
                  const res = await api.get(`/locations/nearby?lat=${lat}&lng=${lng}&radiusMeters=1000`);
                  const data = res.data || [];
                  if (data.length === 0) return toast.info('No collectors nearby');
                  // center map to first and show markers via setCollectors

                  mergeCollectors(data.map(c => normalizeCollector(c)));
                  
                  toast.success(`${data.length} nearby collector(s) found`);
                } catch (e) { console.error(e); toast.error('Failed to fetch nearby collectors'); }
              }, () => toast.error('Failed to get location'), { enableHighAccuracy: true });
            }}>Find Nearby</Button>
          </div>
        </div>

        {collectors.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No active trucks</p>
        ) : (
          <div className="space-y-3">
            {collectors.map((collector) => (
              <div key={collector.collectorId} className="border rounded-lg p-4 hover:bg-accent/50 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{collector.vehicleNumber || 'Truck'}</p>

                      <p className="text-sm text-muted-foreground">
                      {collector.vehicleType }
                    </p>
                    
                    <p className="text-sm text-muted-foreground">
                      Location: {collector.currentLat?.toFixed(4)}, {collector.currentLng?.toFixed(4)}
                    </p>
                    {collector.lastLocationUpdate && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Updated: {new Date(collector.lastLocationUpdate).toLocaleTimeString()}
                      </p>
                    )}
                  </div>
                  <Badge className={collector.isAvailable ? 'bg-green-500/10 text-green-600' : 'bg-yellow-500/10 text-yellow-600'}>
                    {collector.isAvailable ? 'Available' : 'Not Available'}
                  </Badge>
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
          markers={markers}
        />
      </Card>
    </div>
  );
};

export default TrackTrucks;

