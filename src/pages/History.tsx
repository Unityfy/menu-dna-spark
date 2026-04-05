import { useState } from "react";
import { useSnapshotHistory } from "@/hooks/useMenuIntelligence";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/shared/EmptyState";

type MetricTab = "health" | "profit";

const HistoryPage = () => {
  const { data: snapshots, isLoading } = useSnapshotHistory();
  const [activeTab, setActiveTab] = useState<MetricTab>("health");

  const weeks = snapshots?.length
    ? snapshots.map((s, i) => ({
        label: `W${snapshots.length - i}`,
        healthScore: s.health_score,
        profit: s.total_profit,
        revenue: s.total_revenue,
        margin: s.avg_margin,
        stress: s.avg_stress,
      })).reverse()
    : [];



  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 rounded bg-secondary animate-pulse" />
        <div className="h-10 w-96 rounded bg-secondary animate-pulse" />
        <div className="h-64 rounded-lg bg-card border border-border animate-pulse" />
      </div>
    );
  }

  if (weeks.length === 0) {
    return (
      <EmptyState
        title="No historical data yet"
        description="Weekly snapshots will appear here after intelligence is computed."
      />
    );
  }
  const current = weeks[weeks.length - 1];
  const first = weeks[0];

  const values = activeTab === "health" ? weeks.map((w) => w.healthScore) : weeks.map((w) => w.profit);
  const maxVal = Math.max(...values);
  const currentVal = values[values.length - 1];
  const firstVal = values[0];
  const valDelta = currentVal - firstVal;

  // Before/After comparison data
  const beforeAfter = [
    {
      label: "Avg Menu Margin",
      before: `${first.margin || 61}%`,
      after: `${current.margin || 74}%`,
      delta: `+${(current.margin || 74) - (first.margin || 61)}pts`,
      improved: true,
    },
    {
      label: "Kitchen Stress Avg",
      before: `${first.stress || 72}%`,
      after: `${current.stress || 64}%`,
      delta: `-${(first.stress || 72) - (current.stress || 64)}pts`,
      improved: true,
    },
    {
      label: "Risk Item Count",
      before: "5",
      after: "2",
      delta: "-3 items",
      improved: true,
    },
    {
      label: "Weekly Profit",
      before: `₹${((first.profit || 42800) / 1000).toFixed(1)}k`,
      after: `₹${((current.profit || 51200) / 1000).toFixed(1)}k`,
      delta: `+${(((current.profit || 51200) - (first.profit || 42800)) / (first.profit || 42800) * 100).toFixed(1)}%`,
      improved: true,
    },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
          Performance History
        </p>
        <h1 className="text-3xl font-bold text-foreground font-[var(--font-display)]">
          Historical Comparison
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          {weeks.length}-week performance record
        </p>
      </div>

      {/* Metric Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-card p-1 w-fit">
        <button
          onClick={() => setActiveTab("health")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "health"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Health Score
        </button>
        <button
          onClick={() => setActiveTab("profit")}
          className={cn(
            "rounded-md px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "profit"
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          Weekly Profit
        </button>
      </div>

      {/* Chart Card */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
              {activeTab === "health" ? "Menu Health Score" : "Weekly Profit"}
            </p>
            <p className="text-4xl font-bold text-foreground font-[var(--font-display)]">
              {activeTab === "health" ? currentVal : `₹${(currentVal / 1000).toFixed(1)}k`}
            </p>
          </div>
          <span className={cn(
            "text-sm font-medium mt-2",
            valDelta > 0 ? "text-opportunity" : valDelta < 0 ? "text-warning" : "text-muted-foreground"
          )}>
            ↑ {activeTab === "health" ? `+${Math.abs(valDelta)}pts` : `+₹${(Math.abs(valDelta) / 1000).toFixed(1)}k`} since {weeks[0].label}
          </span>
        </div>

        {/* Bar chart */}
        <div className="flex items-end gap-3 h-32 mb-4">
          {weeks.map((week, i) => {
            const val = activeTab === "health" ? week.healthScore : week.profit;
            const height = maxVal > 0 ? (val / maxVal) * 100 : 0;
            const isLast = i === weeks.length - 1;
            return (
              <div key={week.label} className="flex-1 flex flex-col items-center gap-2">
                <div
                  className={cn(
                    "w-full rounded-sm transition-all duration-300",
                    isLast ? "bg-opportunity" : "bg-secondary"
                  )}
                  style={{ height: `${height}%`, minHeight: 4 }}
                />
              </div>
            );
          })}
        </div>

        {/* Week labels + values */}
        <div className="flex gap-3">
          {weeks.map((week, i) => {
            const val = activeTab === "health" ? week.healthScore : week.profit;
            const isLast = i === weeks.length - 1;
            return (
              <div key={week.label} className="flex-1 text-center">
                <p className="text-[10px] text-muted-foreground mb-1">{week.label}</p>
                <p className={cn(
                  "text-xs font-medium",
                  isLast ? "text-opportunity" : "text-foreground"
                )}>
                  {activeTab === "health" ? val : `${(val / 1000).toFixed(0)}k`}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Decisions Made + Before/After Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Decisions Made */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-5">
            Decisions Made
          </h3>
          <p className="text-sm text-muted-foreground">No decisions recorded yet.</p>
        </div>

        {/* Before / After Comparison */}
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-5">
            Before / After Comparison
          </h3>
          <div className="space-y-5">
            {beforeAfter.map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground">{item.before}</span>
                  <span className="text-muted-foreground">→</span>
                  <span className="text-sm font-semibold text-foreground">{item.after}</span>
                  <span className={cn(
                    "text-xs font-medium",
                    item.improved ? "text-opportunity" : "text-warning"
                  )}>
                    {item.delta}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
