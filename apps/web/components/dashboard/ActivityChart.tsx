'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

interface ActivityChartProps {
  data?: {
    users: Array<{ date: string; count: number }>;
    events: Array<{ date: string; count: number }>;
    payments?: Array<{ date: string; amount: number }>;
  };
  loading?: boolean;
}

export function ActivityChart({ data, loading }: ActivityChartProps) {
  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading chart...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    );
  }

  // Merge data by date
  const chartData = data.users.map((item, i) => {
    const date = new Date(item.date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    return {
      date,
      users: item.count,
      events: data.events[i]?.count || 0,
      payments:
        data.payments?.find((p) => new Date(p.date).getTime() === new Date(item.date).getTime())
          ?.amount || 0,
    };
  });

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
        <XAxis dataKey="date" className="text-xs" tick={{ fill: 'currentColor' }} />
        <YAxis className="text-xs" tick={{ fill: 'currentColor' }} />
        <Tooltip
          contentStyle={{
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            border: 'none',
            borderRadius: '4px',
            color: 'white',
          }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="users"
          stroke="#3b82f6"
          strokeWidth={2}
          name="Users"
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="events"
          stroke="#10b981"
          strokeWidth={2}
          name="Events"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
