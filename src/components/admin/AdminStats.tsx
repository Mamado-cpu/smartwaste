import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import api from '@/lib/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

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

  // prefer combined daily data if available
  const byDay = stats.byDayCombined || stats.byDay || stats.byDayBookings || [];
  const bookingsTotal = stats.totalBookings || 0;
  const reportsTotal = stats.totalReports || 0;
  const pieData = [
    { name: 'Bookings', value: bookingsTotal },
    { name: 'Reports', value: reportsTotal }
  ];
  const COLORS = ['#4f46e5', '#ef4444'];

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
        {byDay && byDay.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer>
                <BarChart data={byDay.map((d: any) => ({ date: d.date || d._id || d.id, bookings: d.bookings || d.count || 0, reports: d.reports || 0 }))}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="bookings" fill="#4f46e5" name="Bookings" />
                  <Bar dataKey="reports" fill="#ef4444" name="Reports" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="p-4 border rounded-lg">
              <h4 className="font-semibold mb-2">Overview</h4>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70} label>
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#4f46e5]"></span>
                  <div>
                    <div className="text-sm">Bookings</div>
                    <div className="font-semibold">{bookingsTotal}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#ef4444]"></span>
                  <div>
                    <div className="text-sm">Reports</div>
                    <div className="font-semibold">{reportsTotal}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-muted-foreground">No recent data</p>
        )}
      </Card>
    </div>
  );
};

export default AdminStats;
