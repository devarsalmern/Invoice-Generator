import { Loader2, History, Users, FileText, Receipt, TrendingUp, DollarSign } from "lucide-react";
import {
  useGetDashboardSummary,
  useGetPayrollTrend,
  useGetRecentActivity,
  getGetDashboardSummaryQueryKey,
  getGetPayrollTrendQueryKey,
  getGetRecentActivityQueryKey,
} from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

const fmtAud = (value: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);

export default function Dashboard() {
  const { data: summary, isLoading: isLoadingSummary } = useGetDashboardSummary(undefined, {
    query: { queryKey: getGetDashboardSummaryQueryKey() },
  });

  const { data: payrollTrend, isLoading: isLoadingPayroll } = useGetPayrollTrend(undefined, {
    query: { queryKey: getGetPayrollTrendQueryKey() },
  });

  const { data: activities, isLoading: isLoadingActivity } = useGetRecentActivity(
    { limit: 10 },
    { query: { queryKey: getGetRecentActivityQueryKey({ limit: 10 }) } }
  );

  const statCards = [
    {
      title: "Monthly Payroll",
      value: isLoadingSummary ? null : fmtAud(summary?.monthlyPayroll || 0),
      sub: `${new Date().toLocaleString("en-AU", { month: "long" })} ${new Date().getFullYear()} payslips`,
      icon: <DollarSign className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: "Active Employees",
      value: isLoadingSummary ? null : String(summary?.totalEmployees || 0),
      sub: "Registered in the system",
      icon: <Users className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: "Total Payslips",
      value: isLoadingSummary ? null : String(summary?.totalPayslips || 0),
      sub: "All time",
      icon: <FileText className="h-4 w-4 text-muted-foreground" />,
    },
    {
      title: "Total Invoices",
      value: isLoadingSummary ? null : String(summary?.totalInvoices || 0),
      sub: "All companies",
      icon: <Receipt className="h-4 w-4 text-muted-foreground" />,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your payroll activity.</p>
      </div>

      {/* Stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              {card.value === null ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold">{card.value}</div>
              )}
              <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Payroll trend bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><TrendingUp className="h-4 w-4" />Payroll Trend</CardTitle>
          <CardDescription>Monthly payroll (AUD) over the last 12 months</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingPayroll ? (
            <div className="h-[280px] flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={payrollTrend || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="label"
                    axisLine={false} tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    dy={8}
                    interval={1}
                  />
                  <YAxis
                    axisLine={false} tickLine={false}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                    tickFormatter={(v) => v === 0 ? "$0" : `$${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted))" }}
                    contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))", borderRadius: "8px" }}
                    formatter={(value: number) => [fmtAud(value), "Payroll"]}
                  />
                  <Bar dataKey="totalPayroll" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest actions taken across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingActivity ? (
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : activities && activities.length > 0 ? (
            <div className="space-y-5">
              {activities.map((activity) => {
                const icon =
                  activity.entity === "payslip" ? <FileText className="h-4 w-4 text-blue-500" /> :
                  activity.entity === "invoice" ? <Receipt className="h-4 w-4 text-emerald-500" /> :
                  activity.entity === "employee" ? <Users className="h-4 w-4 text-purple-500" /> :
                  <History className="h-4 w-4 text-muted-foreground" />;

                return (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="mt-0.5 bg-muted p-2 rounded-full flex-shrink-0">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-snug">
                        <span className="font-semibold">{activity.userName || "System"}</span>
                        {" — "}{activity.action}
                        {activity.entityId ? ` #${activity.entityId}` : ""}
                      </p>
                      {activity.description && (
                        <p className="text-sm text-muted-foreground truncate">{activity.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {activity.timestamp ? format(new Date(activity.timestamp), "d MMM yyyy, h:mm a") : ""}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground flex flex-col items-center">
              <History className="h-8 w-8 mb-2 opacity-20" />
              <p>No activity yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
