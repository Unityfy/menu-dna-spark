import { useSnapshotHistory } from "@/hooks/useMenuIntelligence";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/shared/EmptyState";

const classificationLabels: Record<string, string> = {
  "high-profit": "High-profit",
  "hidden-loss": "Hidden loss",
  "kitchen-disruptor": "Kitchen disruptor",
  "low-impact-filler": "Low-impact",
};

const HistoryPage = () => {
  const { data: snapshots, isLoading } = useSnapshotHistory();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Historical Comparison</h1>
          <p className="text-sm text-muted-foreground mt-1">Loading snapshots…</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-5 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!snapshots || snapshots.length === 0) {
    return (
      <EmptyState
        title="No historical data yet"
        description="Weekly snapshots will appear here after intelligence is computed."
      />
    );
  }

  const maxRevenue = Math.max(...snapshots.map((s) => s.total_revenue));
  const maxProfit = Math.max(...snapshots.map((s) => s.total_profit));

  // Before vs After comparison (most recent vs previous)
  const current = snapshots[0];
  const previous = snapshots.length >= 2 ? snapshots[1] : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Historical Comparison</h1>
        <p className="text-sm text-muted-foreground mt-1">Weekly performance snapshots</p>
      </div>

      {/* Before vs After Comparison */}
      {previous && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-sm font-medium text-foreground mb-4">Before vs After</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-xs text-muted-foreground mb-3">{previous.week_label}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-3">{current.week_label}</p>
            </div>
          </div>
          <div className="space-y-4">
            {[
              { label: "Health Score", prev: previous.health_score, curr: current.health_score, suffix: "", higher: true },
              { label: "Revenue", prev: previous.total_revenue, curr: current.total_revenue, prefix: "₹", higher: true },
              { label: "Profit", prev: previous.total_profit, curr: current.total_profit, prefix: "₹", higher: true },
              { label: "Avg Margin", prev: previous.avg_margin, curr: current.avg_margin, suffix: "%", higher: true },
              { label: "Avg Stress", prev: previous.avg_stress, curr: current.avg_stress, suffix: "%", higher: false },
            ].map(({ label, prev, curr, prefix, suffix, higher }) => {
              const delta = curr - prev;
              const improved = higher ? delta > 0 : delta < 0;
              return (
                <div key={label} className="grid grid-cols-3 items-center gap-4 text-xs">
                  <span className="text-muted-foreground">{label}</span>
                  <div className="flex items-center justify-between">
                    <span className="text-foreground font-medium">
                      {prefix}{typeof prev === "number" && prev > 999 ? prev.toLocaleString() : Number(prev).toFixed(1)}{suffix}
                    </span>
                    <span className="text-muted-foreground mx-2">→</span>
                    <span className="text-foreground font-medium">
                      {prefix}{typeof curr === "number" && curr > 999 ? curr.toLocaleString() : Number(curr).toFixed(1)}{suffix}
                    </span>
                  </div>
                  <span className={cn(
                    "text-right font-medium",
                    delta === 0 ? "text-muted-foreground" : improved ? "text-opportunity" : "text-warning"
                  )}>
                    {delta > 0 ? "+" : ""}{typeof delta === "number" && Math.abs(delta) > 999 ? delta.toLocaleString() : Number(delta).toFixed(1)}{suffix}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Classification breakdown changes */}
          {current.classification_breakdown && previous.classification_breakdown && (
            <div className="mt-6 pt-4 border-t border-border">
              <h3 className="text-xs font-medium text-foreground mb-3">Classification Changes</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {Object.entries(current.classification_breakdown).map(([key, val]) => {
                  const prevVal = (previous.classification_breakdown as Record<string, number>)[key] ?? 0;
                  const delta = (val as number) - prevVal;
                  return (
                    <div key={key} className="text-center">
                      <p className="text-xs text-muted-foreground">{classificationLabels[key] || key}</p>
                      <p className="text-sm font-medium text-foreground mt-1">
                        {prevVal} → {val as number}
                      </p>
                      {delta !== 0 && (
                        <p className={cn("text-xs font-medium", delta > 0 ? "text-opportunity" : "text-warning")}>
                          {delta > 0 ? "+" : ""}{delta}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Weekly snapshots grid */}
      <div>
        <h2 className="text-sm font-medium text-foreground mb-4">Weekly Snapshots</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {snapshots.map((snap) => (
            <div key={snap.id} className="rounded-lg border border-border bg-card p-5">
              <p className="text-xs text-muted-foreground">{snap.week_label}</p>
              <div className="flex items-end gap-2 mt-2">
                <span className="text-2xl font-semibold text-foreground">{snap.health_score}</span>
                <span className={cn(
                  "text-xs font-medium mb-1",
                  snap.health_delta > 0 ? "text-opportunity" : snap.health_delta < 0 ? "text-warning" : "text-muted-foreground"
                )}>
                  {snap.health_delta > 0 ? "+" : ""}{snap.health_delta}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                ₹{snap.total_revenue.toLocaleString()} rev · ₹{snap.total_profit.toLocaleString()} profit
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Revenue trend */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Revenue Trend</h3>
        <div className="space-y-3">
          {snapshots.map((snap) => (
            <div key={snap.id} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 shrink-0">{snap.week_label.split("–")[0].trim()}</span>
              <div className="flex-1 h-2 bg-secondary rounded-full">
                <div
                  className="h-full bg-foreground rounded-full transition-all duration-500"
                  style={{ width: `${(snap.total_revenue / maxRevenue) * 100}%` }}
                />
              </div>
              <span className="text-xs text-foreground font-medium w-20 text-right">₹{(snap.total_revenue / 1000).toFixed(0)}k</span>
            </div>
          ))}
        </div>
      </div>

      {/* Profit trend */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Profit Trend</h3>
        <div className="space-y-3">
          {snapshots.map((snap) => (
            <div key={snap.id} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 shrink-0">{snap.week_label.split("–")[0].trim()}</span>
              <div className="flex-1 h-2 bg-secondary rounded-full">
                <div
                  className="h-full bg-opportunity rounded-full transition-all duration-500"
                  style={{ width: `${(snap.total_profit / maxProfit) * 100}%` }}
                />
              </div>
              <span className="text-xs text-foreground font-medium w-20 text-right">₹{(snap.total_profit / 1000).toFixed(0)}k</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HistoryPage;
