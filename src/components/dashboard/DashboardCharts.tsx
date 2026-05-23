"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import {
  buildMonthlyRevenue,
  buildRepairOrderStatusBreakdown,
  buildWeeklyAppointments,
} from "@/lib/dashboardChartData";
import { formatCurrency } from "@/lib/utils";
import { Appointment, Invoice, Payment, RepairOrder } from "@/types";

interface DashboardChartsProps {
  payments: Payment[];
  invoices: Invoice[];
  repairOrders: RepairOrder[];
  appointments: Appointment[];
}

function formatTooltipValue(
  value: unknown,
  formatter?: (v: number) => string
): string {
  const n = typeof value === "number" ? value : Number(value);
  if (Number.isNaN(n)) return String(value ?? "");
  return formatter ? formatter(n) : String(n);
}

export function DashboardCharts({
  payments,
  invoices,
  repairOrders,
  appointments,
}: DashboardChartsProps) {
  const revenueData = buildMonthlyRevenue(payments, invoices);
  const statusData = buildRepairOrderStatusBreakdown(repairOrders);
  const appointmentData = buildWeeklyAppointments(appointments);

  const hasRevenue = revenueData.some((d) => d.revenue > 0);
  const hasStatus = statusData.length > 0;
  const hasAppointments = appointmentData.some((d) => d.count > 0);

  return (
    <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Revenue (last 6 months)</CardTitle>
          <p className="text-sm text-slate-500">
            Stripe payments and paid invoices
          </p>
        </CardHeader>
        <CardContent>
          {!hasRevenue ? (
            <p className="flex h-64 items-center justify-center text-sm text-slate-500">
              No payment data yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#475569" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#475569" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                  }
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
                        {label && (
                          <p className="font-medium text-slate-900">{label}</p>
                        )}
                        <p className="text-slate-600">
                          {formatTooltipValue(payload[0].value, formatCurrency)}
                        </p>
                      </div>
                    );
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#334155"
                  strokeWidth={2}
                  fill="url(#revenueGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repair orders by status</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasStatus ? (
            <p className="flex h-64 items-center justify-center text-sm text-slate-500">
              No repair orders yet
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={statusData}
                  dataKey="count"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                >
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const item = payload[0].payload as {
                      label: string;
                      count: number;
                    };
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
                        <p className="font-medium text-slate-900">{item.label}</p>
                        <p className="text-slate-600">{item.count} orders</p>
                      </div>
                    );
                  }}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, paddingTop: 12 }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2 xl:col-span-3">
        <CardHeader>
          <CardTitle className="text-base">Appointments (last 7 days)</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasAppointments ? (
            <p className="flex h-56 items-center justify-center text-sm text-slate-500">
              No appointments in the last week
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={224}>
              <BarChart data={appointmentData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null;
                    const n = Number(payload[0].value);
                    return (
                      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-md">
                        {label && (
                          <p className="font-medium text-slate-900">{label}</p>
                        )}
                        <p className="text-slate-600">
                          {n} appointment{n === 1 ? "" : "s"}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="count" fill="#64748b" radius={[6, 6, 0, 0]} maxBarSize={48} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

