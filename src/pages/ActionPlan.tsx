import { useState } from "react";
import { recommendations as initialRecs, type Recommendation } from "@/data/mockData";
import { cn } from "@/lib/utils";

const filterTabs = ["All", "Pending", "Approved", "Ignored"] as const;

const ActionPlan = () => {
  const [recs, setRecs] = useState<Recommendation[]>(initialRecs);
  const [activeFilter, setActiveFilter] = useState<(typeof filterTabs)[number]>("All");

  const filtered = activeFilter === "All" ? recs : recs.filter((r) => r.status === activeFilter.toLowerCase());
  const pendingCount = recs.filter((r) => r.status === "pending").length;

  const updateStatus = (id: string, status: "approved" | "ignored") => {
    setRecs((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Weekly Action Plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pendingCount} pending · Generated Feb 3, 2026
        </p>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {filterTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveFilter(tab)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors duration-200",
              activeFilter === tab
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Recommendation cards */}
      <div className="space-y-4">
        {filtered.map((rec) => (
          <div key={rec.id} className="rounded-lg border border-border bg-card p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-medium text-foreground">{rec.title}</h3>
                <p className="text-xs text-muted-foreground mt-0.5">{rec.dish_name}</p>
              </div>
              {rec.status !== "pending" && (
                <span className={cn(
                  "text-xs font-medium px-2 py-0.5 rounded",
                  rec.status === "approved" ? "bg-opportunity/15 text-opportunity" : "bg-secondary text-muted-foreground"
                )}>
                  {rec.status === "approved" ? "Approved" : "Ignored"}
                </span>
              )}
            </div>

            {/* Reasoning */}
            <div className="rounded-md bg-secondary p-4 border-l-[3px] border-neutral">
              <p className="text-xs text-secondary-foreground leading-relaxed">{rec.reasoning}</p>
            </div>

            {/* Impact grid */}
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-muted-foreground">Revenue</p>
                <p className={cn("text-sm font-medium", rec.expected_revenue_impact >= 0 ? "text-opportunity" : "text-warning")}>
                  {rec.expected_revenue_impact >= 0 ? "+" : ""}₹{rec.expected_revenue_impact.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Profit</p>
                <p className={cn("text-sm font-medium", rec.expected_profit_impact >= 0 ? "text-opportunity" : "text-warning")}>
                  {rec.expected_profit_impact >= 0 ? "+" : ""}₹{rec.expected_profit_impact.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Stress</p>
                <p className={cn("text-sm font-medium", rec.expected_stress_impact <= 0 ? "text-opportunity" : "text-warning")}>
                  {rec.expected_stress_impact >= 0 ? "+" : ""}{rec.expected_stress_impact}%
                </p>
              </div>
            </div>

            {/* Actions */}
            {rec.status === "pending" && (
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => updateStatus(rec.id, "ignored")}
                  className="rounded-md border border-border bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
                >
                  Ignore
                </button>
                <button
                  onClick={() => updateStatus(rec.id, "approved")}
                  className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActionPlan;
