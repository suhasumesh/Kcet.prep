'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

type Point = { date: string; title: string; score: number; total: number; accuracy: number };

export default function ScoreTrend({ trend }: { trend: Point[] }) {
  const data = trend.map((t, i) => ({
    ...t,
    n: i + 1,
    pct: t.total ? Math.round((t.score / t.total) * 100) : 0,
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3182f6" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#3182f6" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#eceef2" vertical={false} />
          <XAxis
            dataKey="n"
            tick={{ fontSize: 11, fill: '#8290a8' }}
            tickLine={false}
            axisLine={{ stroke: '#eceef2' }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={{ fontSize: 11, fill: '#8290a8' }}
            tickLine={false}
            axisLine={false}
            unit="%"
          />
          <Tooltip
            cursor={{ stroke: '#aeb7c8', strokeDasharray: '3 3' }}
            contentStyle={{
              borderRadius: 10,
              border: '1px solid #d4d9e2',
              fontSize: 12,
              boxShadow: '0 4px 12px rgba(16,24,40,.08)',
            }}
            formatter={(v: number) => [`${v}%`, 'Score']}
            labelFormatter={(_l, p) => {
              const d = p?.[0]?.payload as Point & { score: number; total: number };
              return d ? `${d.title} — ${d.score}/${d.total} on ${d.date}` : '';
            }}
          />
          <Area
            type="monotone"
            dataKey="pct"
            stroke="#1b62db"
            strokeWidth={2}
            fill="url(#trendFill)"
            dot={{ r: 3, fill: '#1b62db', strokeWidth: 0 }}
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
