"use client";

import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ComposedChart, Line,
} from "recharts";

export const fmt = (v: string | number) =>
  `LKR ${parseFloat(String(v)).toLocaleString("en-LK", { minimumFractionDigits: 2 })}`;

export const PIE_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#3b82f6", "#ec4899"];

// ─── KPI Gradient Card ────────────────────────────────────────────────────────
export function KpiCard({
  label, value, sub, icon: Icon, gradient, glow,
}: {
  label: string; value: string; sub: string;
  icon: React.ElementType; gradient: string; glow: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradient} p-5 text-white shadow-lg ${glow}`}>
      <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-white/10" />
      <div className="absolute -right-2 -bottom-6 w-20 h-20 rounded-full bg-white/10" />
      <div className="relative z-10 flex flex-col gap-3">
        <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
          <Icon size={20} />
        </div>
        <div>
          <p className="text-white/70 text-xs font-medium">{label}</p>
          <p className="text-xl font-extrabold leading-tight mt-0.5">{value}</p>
          <p className="text-white/60 text-xs mt-0.5">{sub}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────
export function Section({ title, sub, icon: Icon, iconColor = "text-indigo-500", children }: {
  title: string; sub?: string; icon?: React.ElementType; iconColor?: string; children: React.ReactNode;
}) {
  return (
    <div className="card p-6 rounded-2xl shadow-sm h-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-surface-800 text-lg">{title}</h2>
          {sub && <p className="text-xs text-surface-400 mt-0.5">{sub}</p>}
        </div>
        {Icon && <Icon size={18} className={iconColor} />}
      </div>
      {children}
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────
export function Empty({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-surface-300">
      <Icon size={30} className="mb-2 opacity-40" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ─── Revenue Area Chart ───────────────────────────────────────────────────────
export function RevenueAreaChart({ data }: { data: { day: string; revenue: number; orders: number }[] }) {
  if (!data.length) return <Empty icon={(() => null) as any} label="No data yet" />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
               tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={52} />
        <Tooltip
          formatter={((v: number, n: string) => [n === "revenue" ? fmt(v) : v, n === "revenue" ? "Revenue" : "Orders"]) as any}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Area type="linear" dataKey="revenue" stroke="#6366f1" strokeWidth={2.5}
              fill="url(#revGrad)" dot={{ r: 3, fill: "#6366f1", strokeWidth: 0 }}
              activeDot={{ r: 5, fill: "#6366f1" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Horizontal Bar Chart ─────────────────────────────────────────────────────
export function HorizBarChart({ data, dataKey, labelKey, color1 = "#6366f1", color2 = "#a78bfa" }: {
  data: any[]; dataKey: string; labelKey: string; color1?: string; color2?: string;
}) {
  if (!data.length) return <Empty icon={(() => null) as any} label="No data yet" />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 12, bottom: 0, left: 4 }}>
        <defs>
          <linearGradient id="barGrad2" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor={color1} />
            <stop offset="100%" stopColor={color2} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
               tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
        <YAxis type="category" dataKey={labelKey} tick={{ fontSize: 10, fill: "#64748b" }}
               axisLine={false} tickLine={false} width={80} />
        <Tooltip formatter={((v: number) => [fmt(v), "Revenue"]) as any}
                 contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
        <Bar dataKey={dataKey} fill="url(#barGrad2)" radius={[0, 6, 6, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// ─── Donut Pie + Legend ───────────────────────────────────────────────────────
export function DonutChart({ data, colors = PIE_COLORS }: {
  data: { name: string; value: number; sub?: string }[]; colors?: string[];
}) {
  if (!data.length) return <Empty icon={(() => null) as any} label="No data yet" />;
  return (
    <>
      <ResponsiveContainer width="100%" height={150}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name"
               cx="50%" cy="50%" outerRadius={65} innerRadius={38}
               paddingAngle={3} strokeWidth={0}>
            {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip formatter={((v: number) => [fmt(v), "Revenue"]) as any}
                   contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="space-y-1.5 mt-2">
        {data.map((d, i) => (
          <div key={d.name} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
              <span className="text-surface-600 font-medium text-xs">{d.name}</span>
            </div>
            <span className="font-semibold text-surface-800 text-xs">{d.sub ?? fmt(d.value)}</span>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── Hourly Radar Chart ───────────────────────────────────────────────────────
export function HourlyRadar({ data }: { data: { hour: string; orders: number }[] }) {
  if (!data.length) return <Empty icon={(() => null) as any} label="No data yet" />;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <RadarChart data={data}>
        <PolarGrid stroke="#e2e8f0" />
        <PolarAngleAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94a3b8" }} />
        <Radar name="Orders" dataKey="orders" stroke="#10b981" fill="#10b981" fillOpacity={0.25} strokeWidth={2} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
      </RadarChart>
    </ResponsiveContainer>
  );
}

// ─── Cash Flow Chart ─────────────────────────────────────────────────────────
export function CashFlowChart({
  data,
}: {
  data: { date: string; totalIn: number; totalOut: number; net: number }[];
}) {
  if (!data.length) return <Empty icon={(() => null) as any} label="No cashflow data yet" />;
  const shortDate = (v: string) => v.slice(5); // MM-DD
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="cfInGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
            <stop offset="100%" stopColor="#34d399" stopOpacity={0.7} />
          </linearGradient>
          <linearGradient id="cfOutGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ef4444" stopOpacity={0.85} />
            <stop offset="100%" stopColor="#f87171" stopOpacity={0.7} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#94a3b8" }}
               axisLine={false} tickLine={false} tickFormatter={shortDate} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false}
               tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} width={46} />
        <Tooltip
          formatter={((v: number, name: string) => [
            fmt(v),
            name === "totalIn" ? "Inflow" : name === "totalOut" ? "Outflow" : "Net",
          ]) as any}
          contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }}
        />
        <Bar dataKey="totalIn"  name="Inflow"  fill="url(#cfInGrad)"  radius={[4, 4, 0, 0]} barSize={20} />
        <Bar dataKey="totalOut" name="Outflow" fill="url(#cfOutGrad)" radius={[4, 4, 0, 0]} barSize={20} />
        <Line dataKey="net" name="Net" stroke="#6366f1" strokeWidth={2.5}
              dot={false} type="linear" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

// ─── Simple bar (vertical) ────────────────────────────────────────────────────
export function VertBarChart({ data, xKey, yKey, color }: {
  data: any[]; xKey: string; yKey: string; color: string;
}) {
  if (!data.length) return <Empty icon={(() => null) as any} label="No data yet" />;
  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
        <XAxis dataKey={xKey} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={36} />
        <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e2e8f0", fontSize: 12 }} />
        <Bar dataKey={yKey} fill={color} radius={[4, 4, 0, 0]} barSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
