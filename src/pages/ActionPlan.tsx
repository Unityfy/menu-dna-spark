import { useRecommendations, useUpdateRecommendationStatus, type Recommendation } from "@/hooks/useRecommendations";
import { cn } from "@/lib/utils";
import EmptyState from "@/components/shared/EmptyState";
import StatusBadge from "@/components/shared/StatusBadge";
import { useNavigate } from "react-router-dom";


const typeLabels: Record<string, string> = {
  price: "Price Adjustment",
  remove: "Menu Removal",
  promote: "Feature Opportunity",
  reformulate: "Portion Adjustment",
  bundle: "Bundle / Differentiate",
  availability: "Time-Based Availability",
  channel: "Channel Restriction",
};

const classificationBadge = (type: string) => {
  if (["price", "reformulate", "channel", "availability"].includes(type)) {
    return { variant: "warning" as const, icon: "◆", label: "Disruptor" };
  }
  if (["promote", "bundle"].includes(type)) {
    return { variant: "opportunity" as const, icon: "★", label: "Star" };
  }
  return { variant: "neutral" as const, icon: "—", label: "Review" };
};

const ActionPlan = () => {
  const navigate = useNavigate();
  const { data: recs = [], isLoading } = useRecommendations();
  const updateStatus = useUpdateRecommendationStatus();

  const displayRecs: Recommendation[] = recs;

  const pendingRecs = displayRecs.filter((r) => r.status === "pending");
  const approvedRecs = displayRecs.filter((r) => r.status === "approved");

  const totalProfitImpact = pendingRecs.reduce((sum, r) => sum + r.expected_profit_impact, 0);
  const totalRevenue = displayRecs.reduce((sum, r) => sum + Math.abs(r.expected_revenue_impact), 0);
  const profitImpactPct = totalRevenue > 0 ? ((totalProfitImpact / totalRevenue) * 100).toFixed(1) : "0";

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 rounded bg-secondary animate-pulse" />
        <div className="h-6 w-96 rounded bg-secondary animate-pulse" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-6 h-24 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (displayRecs.length === 0) {
    return (
      <EmptyState
        title="No recommendations yet"
        description="Run the intelligence engine to generate your first weekly action plan."
        actionLabel="Go to Dashboard"
        onAction={() => navigate("/dashboard")}
      />
    );
  }

  const formatImpact = (value: number, prefix: string = "₹") => {
    if (value === 0) return "No change";
    const sign = value > 0 ? "+" : "";
    if (prefix === "₹") {
      return `${sign}${prefix}${Math.abs(value).toLocaleString()}/wk`;
    }
    return `${sign}${value}%`;
  };

  const latestWeekStart = displayRecs[0]?.week_start;
  const weekLabel = latestWeekStart
    ? new Date(latestWeekStart).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : "";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
          {weekLabel ? `Week of ${weekLabel}` : "This week"} · {displayRecs.length} Recommendations
        </p>
        <h1 className="text-3xl font-bold text-foreground font-[var(--font-display)]">
          Weekly Action Plan
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Review, approve, or ignore each recommendation below
        </p>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-5">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
            Pending
          </span>
          <p className="text-3xl font-semibold text-foreground mt-2 font-[var(--font-display)]">
            {pendingRecs.length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
            Approved
          </span>
          <p className="text-3xl font-semibold text-foreground mt-2 font-[var(--font-display)]">
            {approvedRecs.length}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
            Est. Profit Impact
          </span>
          <p className="text-3xl font-semibold text-opportunity mt-2 font-[var(--font-display)]">
            +{profitImpactPct}%
          </p>
        </div>
      </div>

      {/* Recommendation Cards */}
      <div className="space-y-4">
        {displayRecs.map((rec) => {
          const badge = classificationBadge(rec.type);
          const isPending = rec.status === "pending";

          return (
            <div
              key={rec.id}
              className={cn(
                "rounded-lg border border-border bg-card p-6 space-y-4",
                !isPending && "opacity-60"
              )}
            >
              {/* Dish name + badge */}
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-foreground font-[var(--font-display)]">
                    {rec.dish_name}
                  </h3>
                  <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
                    {typeLabels[rec.type] || rec.type}
                  </span>
                </div>
                <StatusBadge variant={badge.variant}>
                  {badge.icon} {badge.label}
                </StatusBadge>
              </div>

              {/* Reasoning */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {rec.reasoning}
              </p>

              {/* Inline impact metrics */}
              <div className="flex items-center gap-6 text-sm">
                <span className="text-muted-foreground">
                  Revenue:{" "}
                  <span className={rec.expected_revenue_impact >= 0 ? "text-opportunity font-medium" : "text-warning font-medium"}>
                    {formatImpact(rec.expected_revenue_impact)}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Profit:{" "}
                  <span className={rec.expected_profit_impact >= 0 ? "text-opportunity font-medium" : "text-warning font-medium"}>
                    {formatImpact(rec.expected_profit_impact)}
                  </span>
                </span>
                <span className="text-muted-foreground">
                  Kitchen:{" "}
                  <span className={rec.expected_stress_impact <= 0 ? "text-foreground font-medium" : "text-warning font-medium"}>
                    {rec.expected_stress_impact === 0
                      ? "No change"
                      : `${rec.expected_stress_impact > 0 ? "+" : ""}${rec.expected_stress_impact}% load`}
                  </span>
                </span>
              </div>

              {/* Actions */}
              {isPending && (
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => updateStatus.mutate({ id: rec.id, status: "approved" })}
                    disabled={updateStatus.isPending}
                    className="rounded-md border border-opportunity/40 bg-opportunity/10 px-5 py-2 text-sm font-medium text-opportunity hover:bg-opportunity/20 transition-colors disabled:opacity-50"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => updateStatus.mutate({ id: rec.id, status: "ignored" })}
                    disabled={updateStatus.isPending}
                    className="rounded-md border border-border bg-secondary px-5 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-50"
                  >
                    Ignore
                  </button>
                </div>
              )}

              {/* Status indicator for acted-on recs — green for approved, gray for ignored */}
              {!isPending && (
                <span className={cn(
                  "inline-flex items-center text-xs font-medium px-2.5 py-1 rounded",
                  rec.status === "approved"
                    ? "bg-opportunity/15 text-opportunity border border-opportunity/30"
                    : "bg-secondary text-muted-foreground border border-border"
                )}>
                  {rec.status === "approved" ? "✓ Approved" : "Ignored"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ActionPlan;
