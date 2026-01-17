import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import api from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const AdminStats = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState<number>(14);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await api.get(`/admin/stats?days=${days}`);
        if (!mounted) return;
        setStats(res.data);
      } catch (err) {
        console.error('Failed to load stats', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [days]);

  if (loading) return <Card className="p-6"><p className="text-center">Loading stats...</p></Card>;
  if (!stats) return <Card className="p-6"><p className="text-center">No data</p></Card>;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold mb-2">Collection Statistics</h2>
          <div>
            <select value={days} onChange={(e) => setDays(parseInt(e.target.value || '14', 10))} className="p-2 rounded border">
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 mt-4">
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground">Total bookings</p>
            <p className="text-2xl font-semibold">{stats.totalBookings}</p>
          </div>
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground">Total completed</p>
            <p className="text-2xl font-semibold">{stats.totalCompleted}</p>
          </div>
          <div className="p-4 border rounded-lg">
            <p className="text-sm text-muted-foreground">Completed today</p>
            <p className="text-2xl font-semibold">{stats.completedToday}</p>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">Top Collectors (completed)</h3>
        {stats.collectorsStats && stats.collectorsStats.length > 0 ? (
          <div className="space-y-2">
            {stats.collectorsStats.map((c: any) => (
              <div key={c.collectorId} className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium">{c.name || c.collectorId}</p>
                  <p className="text-sm text-muted-foreground">{c.vehicleNumber || 'Vehicle'}</p>
                </div>
                <div className="font-semibold">{c.count}</div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No completed tasks yet</p>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-3">Completed (last 14 days)</h3>
        {stats.byDay && stats.byDay.length > 0 ? (
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
              <BarChart data={stats.byDay.map((d: any) => ({ date: d._id, count: d.count }))}>
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-muted-foreground">No recent data</p>
        )}
      </Card>
    </div>
  );
};

export default AdminStats;
