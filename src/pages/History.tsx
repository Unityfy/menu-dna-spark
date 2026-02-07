import { weeklySnapshots } from "@/data/mockData";
import { cn } from "@/lib/utils";

const HistoryPage = () => {
  const maxRevenue = Math.max(...weeklySnapshots.map((s) => s.total_revenue));
  const maxProfit = Math.max(...weeklySnapshots.map((s) => s.total_profit));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Historical Comparison</h1>
        <p className="text-sm text-muted-foreground mt-1">Weekly performance snapshots</p>
      </div>

      {/* Weekly snapshots grid */}
      <div>
        <h2 className="text-sm font-medium text-foreground mb-4">Weekly Snapshots</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {weeklySnapshots.map((snap) => (
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
          {weeklySnapshots.map((snap) => (
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
          {weeklySnapshots.map((snap) => (
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
