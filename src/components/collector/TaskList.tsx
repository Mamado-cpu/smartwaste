import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import api from '@/lib/api';
import TaskDetails from './TaskDetails';
import MapView from '@/components/ui/map-view';

interface Task {
  id: string;
  type: 'booking' | 'report';
  source?: string | null; // 'sewage' | 'garbage' | null for reports
  locationAddress: string;
  status: string;
  details: string;
}

const TaskList = ({ collectorId }: { collectorId: string | null }) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [collectorProfile, setCollectorProfile] = useState<any | null>(null);
  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [collectorsOnMap, setCollectorsOnMap] = useState<any[]>([]);

  useEffect(() => {
    fetchTasks();
    fetchCollectorProfile();
  }, [collectorId]);

  const fetchCollectorProfile = async () => {
    try {
      const res = await api.get('/locations/collector/me');
      setCollectorProfile(res.data || null);
    } catch (err) {
      console.warn('Failed to load collector profile for TaskList', err);
    }
  };


  

  useEffect(() => {
    console.log('TaskList collectorId changed:', collectorId);
  }, [collectorId]);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bkRes, repRes] = await Promise.all([
        api.get('/bookings/collector'),
        api.get('/reports/collector')
      ]);

      console.log('bookings response', bkRes);
      console.log('reports response', repRes);
      const bookings = bkRes.data || [];
      const reports = repRes.data || [];

      const allTasks: Task[] = [
        // include bookings of all statuses so collectors can still see completed tasks
        ...bookings.map((b: any) => ({
          id: b._id || b.id,
          type: 'booking' as const,
          locationAddress: b.locationAddress,
          status: b.status,
          // include source (serviceType) so collector knows whether it's sewage or garbage
          source: b.serviceType || 'garbage',
          details: b.notes || (b.serviceType === 'sewage' ? 'Sewage disposal service' : 'Garbage collection'),
          user: b.userId || b.user,
          locationLat: b.locationLat,
          locationLng: b.locationLng,
          raw: b
        })),
        // include reports of all statuses so cleared reports remain visible
        ...reports.map((r: any) => ({
          id: r._id || r.id,
          type: 'report' as const,
          locationAddress: r.locationAddress,
          status: r.status,
          details: r.description,
          user: r.userId || r.user,
          locationLat: r.locationLat || r.locationLat,
          locationLng: r.locationLng || r.locationLng,
          raw: r
        }))
      ];

      setTasks(allTasks);
      // also fetch other collectors locations to show on the map
      try {
        const cRes = await api.get('/locations/collectors');
        const cData = cRes.data || {};
        const arr = Object.entries(cData).map(([id, v]: any) => ({
          collectorId: id,
          latitude: v.latitude || v.locationLat || v.locationLat,
          longitude: v.longitude || v.locationLng || v.locationLng,
          vehicleNumber: v.vehicleNumber || v.collectorInfo?.vehicleNumber,
          lastUpdated: v.timestamp || v.lastUpdated
        }));
        setCollectorsOnMap(arr.filter(a => a.latitude && a.longitude));
      } catch (e) {
        setCollectorsOnMap([]);
      }
    } catch (err: any) {
      console.error('Failed to load tasks', err);
      const msg = err?.response?.data?.message || err.message || 'Failed to load tasks';
      setError(msg);
      toast.error(msg);
    }
    setLoading(false);
  };

  const updateTaskStatus = (task: Task, newStatus: string) => {
    (async () => {
      try {
        if (task.type === 'booking') {
          const id = task.id;
          await api.put(`/bookings/${id}/status`, { status: newStatus });
        } else {
          const id = task.id;
          await api.put(`/reports/${id}/status`, { status: newStatus });
        }
        toast.success('Status updated successfully');
        // Refresh local list and notify other parts of the app
        fetchTasks();
        const detail = { id: task.id, type: task.type, status: newStatus };
        window.dispatchEvent(new CustomEvent('task:updated', { detail }));
        if (task.type === 'booking') window.dispatchEvent(new CustomEvent('booking:updated', { detail }));
        if (task.type === 'report') window.dispatchEvent(new CustomEvent('report:updated', { detail }));
      } catch (err: any) {
        console.error('Failed to update task status', err);
        toast.error(err.response?.data?.message || 'Failed to update status');
      }
    })();
  };

  if (loading) {
    return <Card className="p-6"><p>Loading tasks...</p></Card>;
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-bold mb-6">My Tasks</h2>
     
      {tasks.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">No tasks assigned</p>
      ) : (
        <div className="space-y-4">
          {tasks.map((task) => (
            <div key={String(task.id)} className="border rounded-lg p-4 cursor-pointer" onClick={() => { setSelectedTask(task); setDetailsOpen(true); }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <Badge variant="outline" className="mb-2">
                    {task.type === 'booking' ? (task.source === 'sewage' ? '🚰 Sewage Booking' : '🗑️ Garbage Booking') : '🚨 Report'}
                  </Badge>
                  <p className="font-medium">{task.details}</p>
                </div>
                <Badge>{(task.status || 'pending').replace('_', ' ')}</Badge>
              </div>
              
              <div className="flex gap-2 mt-3">
                {task.status === 'assigned' && (
                  <Button 
                    size="sm" 
                    onClick={(e) => { e.stopPropagation(); updateTaskStatus(task, 'in_progress'); }}
                  >
                    Start Task
                  </Button>
                )}
                {task.status === 'in_progress' && (
                  <Button 
                    size="sm" 
                    onClick={(e) => { e.stopPropagation(); updateTaskStatus(task, task.type === 'booking' ? 'completed' : 'cleared'); }}
                  >
                    Mark Complete
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      <TaskDetails task={selectedTask} open={detailsOpen} onClose={() => setDetailsOpen(false)} />
      {/* Map showing collectors and task locations
      {/* <Card className="p-6 mt-6">
        <h3 className="text-lg font-semibold mb-3">Map: Tasks & Collectors</h3>
        {
          (() => {
            const taskMarkers = tasks
              .filter((t: any) => t.locationLat && t.locationLng)
              .map((t: any) => ({
                id: `t-${t.id}`,
                position: [t.locationLat, t.locationLng] as [number, number],
                title: t.type === 'booking' ? `Booking: ${t.source || ''}` : 'Report',
                description: `${t.details}\nStatus: ${t.status}`,
                type: 'pin'
              }));

            const collectorMarkers = collectorsOnMap.map((c: any) => ({
              id: `c-${c.collectorId}`,
              position: [c.latitude, c.longitude] as [number, number],
              title: c.vehicleNumber || `Collector ${c.collectorId}`,
              description: `Updated: ${c.lastUpdated ? new Date(c.lastUpdated).toLocaleTimeString() : 'N/A'}`,
              type: 'truck'
            }));

            const markers = [...taskMarkers, ...collectorMarkers];

            return markers.length > 0 ? (
              <MapView center={markers[0].position} zoom={13} markers={markers} />
            ) : (
              <p className="text-muted-foreground">No map data available</p>
            );
          })()
        }
      </Card> */}
    </Card>
  );
};

export default TaskList;
