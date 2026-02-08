import { useState } from "react";
import { useRecommendations, useUpdateRecommendationStatus, type Recommendation } from "@/hooks/useRecommendations";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/shared/EmptyState";
import { useNavigate } from "react-router-dom";

const filterTabs = ["All", "Pending", "Approved", "Ignored"] as const;

const typeLabels: Record<string, string> = {
  price: "Price Optimization",
  remove: "Dish Removal",
  promote: "Promotion",
  reformulate: "Portion / Reformulation",
  bundle: "Bundle / Differentiate",
  availability: "Time-Based Availability",
  channel: "Channel Restriction",
};

const ActionPlan = () => {
  const navigate = useNavigate();
  const { data: recs = [], isLoading } = useRecommendations();
  const updateStatus = useUpdateRecommendationStatus();
  const [activeFilter, setActiveFilter] = useState<(typeof filterTabs)[number]>("All");

  const filtered = activeFilter === "All" ? recs : recs.filter((r) => r.status === activeFilter.toLowerCase());
  const pendingCount = recs.filter((r) => r.status === "pending").length;
  const weekLabel = recs.length > 0 ? new Date(recs[0].week_start).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" }) : "";

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Weekly Action Plan</h1>
          <p className="text-sm text-muted-foreground mt-1">Loading recommendations…</p>
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-6 h-40 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (recs.length === 0) {
    return (
      <EmptyState
        title="No recommendations yet"
        description="Run the intelligence engine to generate your first weekly action plan."
        actionLabel="Go to Dashboard"
        onAction={() => navigate("/dashboard")}
      />
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Weekly Action Plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {pendingCount} pending · Week of {weekLabel}
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
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                    {typeLabels[rec.type] || rec.type}
                  </span>
                </div>
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
                  onClick={() => updateStatus.mutate({ id: rec.id, status: "ignored" })}
                  disabled={updateStatus.isPending}
                  className="rounded-md border border-border bg-secondary px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
                >
                  Ignore
                </button>
                <button
                  onClick={() => updateStatus.mutate({ id: rec.id, status: "approved" })}
                  disabled={updateStatus.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
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
