import { useParams, useNavigate } from "react-router-dom";
import { useDishProfile } from "@/hooks/useDishProfile";
import IndicatorBar from "@/components/shared/IndicatorBar";
import StatusBadge, { classificationLabel } from "@/components/shared/StatusBadge";
import { AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const riskLabel = (flag: string) => {
  switch (flag) {
    case "profit_risk": return "Profit Risk";
    case "stress_risk": return "Stress Risk";
    case "demand_risk": return "Demand Risk";
    case "cannibalization_risk": return "Cannibalization Risk";
    default: return flag;
  }
};

const DishProfileSkeleton = () => (
  <div className="space-y-8 max-w-4xl">
    <div>
      <Skeleton className="h-4 w-16 mb-4" />
      <Skeleton className="h-8 w-64 mb-2" />
      <Skeleton className="h-4 w-48" />
    </div>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-48 rounded-lg" />)}
    </div>
  </div>
);

const DishProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dish, recommendations: relatedRecs, isLoading } = useDishProfile(id);

  if (isLoading) return <DishProfileSkeleton />;

  if (!dish) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Dish not found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors mb-4 inline-block"
        >
          ← Back
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-semibold text-foreground">{dish.name}</h1>
          <StatusBadge variant={dish.classification as any}>
            {classificationLabel(dish.classification as any)}
          </StatusBadge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{dish.category} · Last 4 weeks analysis</p>
      </div>

      {/* Risk flags */}
      {dish.risk_flags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {dish.risk_flags.map((flag) => (
            <span key={flag} className="inline-flex items-center gap-1.5 rounded-md bg-warning/10 border border-warning/20 px-2.5 py-1 text-[11px] font-medium text-warning">
              <AlertTriangle className="h-3 w-3" />
              {riskLabel(flag)}
            </span>
          ))}
        </div>
      )}

      {/* Summary metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Margin", value: `${dish.margin.toFixed(1)}%` },
          { label: "Weekly Revenue", value: `₹${dish.weekly_revenue.toLocaleString()}` },
          { label: "Weekly Profit", value: `₹${dish.weekly_profit.toLocaleString()}` },
          { label: "Weekly Orders", value: dish.weekly_orders.toString() },
        ].map((m) => (
          <div key={m.label} className="rounded-lg border border-border bg-card p-5">
            <span className="text-xs text-muted-foreground uppercase tracking-wider">{m.label}</span>
            <p className="text-xl font-semibold text-foreground mt-2">{m.value}</p>
          </div>
        ))}
      </div>

      {/* 2×2 Analysis grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Profit DNA */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-medium text-foreground">Profit DNA</h3>
          <IndicatorBar value={dish.margin} color={dish.margin >= 60 ? "opportunity" : dish.margin >= 45 ? "foreground" : "warning"} label="True Margin" />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Profit contribution: ₹{dish.weekly_profit.toLocaleString()}/week</p>
            <p>
              {dish.margin >= 60
                ? "Strong profitability. This dish contributes well to overall margins."
                : dish.margin >= 45
                  ? "Acceptable margin but below menu average. Consider cost optimization."
                  : "Low margin. Review ingredient costs or adjust pricing."}
            </p>
          </div>
        </div>

        {/* Kitchen Stress */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-medium text-foreground">Kitchen Stress</h3>
          <IndicatorBar
            value={dish.stress_score}
            color={dish.stress_score <= 30 ? "opportunity" : dish.stress_score <= 60 ? "info" : "warning"}
            label="Stress Score"
          />
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Peak hour concentration: {dish.peak_hour_concentration}% of orders during peak</p>
            <p>Station: {dish.station} · Complexity: {dish.complexity}</p>
            <p>
              {dish.stress_score <= 30
                ? "Low kitchen impact. Easy to prepare consistently."
                : dish.stress_score <= 60
                  ? "Moderate kitchen stress. Monitor during peak hours."
                  : "High stress item. May cause bottlenecks and quality issues under load."}
            </p>
          </div>
        </div>

        {/* Demand Pattern */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Demand Pattern</h3>
          <div className="flex items-center gap-2">
            <StatusBadge variant={dish.demand_trend === "rising" ? "opportunity" : dish.demand_trend === "declining" ? "warning" : "neutral"}>
              {dish.demand_trend.charAt(0).toUpperCase() + dish.demand_trend.slice(1)}
            </StatusBadge>
            {dish.prep_time_volatility > 20 && (
              <StatusBadge variant="warning">High Volatility ({dish.prep_time_volatility}%)</StatusBadge>
            )}
          </div>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>Demand spikes: {dish.demand_spike_frequency} in last 4 weeks</p>
            {dish.demand_pattern.peakDays.length > 0 && (
              <p>Peak days: {dish.demand_pattern.peakDays.join(", ")}</p>
            )}
            {dish.demand_pattern.peakHours.length > 0 && (
              <p>Peak hours: {dish.demand_pattern.peakHours.join(", ")}</p>
            )}
            <div className="flex gap-4 mt-2">
              <span>Dine-in {dish.demand_pattern.byOrderType["dine-in"]}%</span>
              <span>Takeaway {dish.demand_pattern.byOrderType.takeaway}%</span>
              <span>Delivery {dish.demand_pattern.byOrderType.delivery}%</span>
            </div>
          </div>
        </div>

        {/* Cannibalization */}
        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Cannibalization</h3>
          {dish.competing_dishes.length > 0 ? (
            <>
              <IndicatorBar value={dish.cannibalization_score} color="warning" label="Overlap Score" />
              <div className="space-y-2">
                {dish.competing_dishes.map((c) => (
                  <div key={c.dishId} className="flex items-center justify-between text-xs">
                    <StatusBadge variant="warning">{c.dishName}</StatusBadge>
                    <span className="text-muted-foreground">{c.overlapScore}% overlap</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                This dish may be splitting orders with the items above, reducing individual performance.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No cannibalization detected. This dish occupies a unique niche.</p>
          )}
        </div>
      </div>

      {/* Operational metrics */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Operational Metrics</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 text-xs">
          <div>
            <span className="text-muted-foreground">Avg Prep Time</span>
            <p className="text-foreground font-medium text-lg mt-1">{dish.prep_time} min</p>
          </div>
          <div>
            <span className="text-muted-foreground">Revenue per Order</span>
            <p className="text-foreground font-medium text-lg mt-1">₹{dish.selling_price}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Food Cost</span>
            <p className="text-foreground font-medium text-lg mt-1">₹{dish.food_cost}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Prep Volatility</span>
            <p className="text-foreground font-medium text-lg mt-1">{dish.prep_time_volatility}%</p>
          </div>
        </div>
      </div>

      {/* Related recommendations */}
      {relatedRecs.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h3 className="text-sm font-medium text-foreground mb-3">Active Recommendations</h3>
          {relatedRecs.map((rec) => (
            <div key={rec.id} className="rounded-md bg-secondary p-4 border-l-[3px] border-neutral mb-2 last:mb-0">
              <p className="text-xs text-foreground font-medium">{rec.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{rec.reasoning.slice(0, 120)}…</p>
            </div>
          ))}
          <button
            onClick={() => navigate("/action-plan")}
            className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            View full action plan →
          </button>
        </div>
      )}
    </div>
  );
};

export default DishProfile;
