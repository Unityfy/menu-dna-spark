import { useParams, useNavigate } from "react-router-dom";
import { dishes, recommendations } from "@/data/mockData";
import IndicatorBar from "@/components/shared/IndicatorBar";
import StatusBadge, { classificationLabel } from "@/components/shared/StatusBadge";

const DishProfile = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dish = dishes.find((d) => d.id === id);

  if (!dish) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Dish not found.</p>
      </div>
    );
  }

  const relatedRecs = recommendations.filter((r) => r.dish_id === dish.id);

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
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">{dish.name}</h1>
          <StatusBadge variant={dish.classification}>
            {classificationLabel(dish.classification)}
          </StatusBadge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{dish.category} · Last 4 weeks analysis</p>
      </div>

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
        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-medium text-foreground">Profit DNA</h3>
          <IndicatorBar value={dish.margin} color={dish.margin >= 60 ? "opportunity" : dish.margin >= 45 ? "foreground" : "warning"} label="Margin" />
          <p className="text-xs text-muted-foreground">
            {dish.margin >= 60
              ? "Strong profitability. This dish contributes well to overall margins."
              : dish.margin >= 45
                ? "Acceptable margin but below menu average. Consider cost optimization."
                : "Low margin. Review ingredient costs or adjust pricing."}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-4">
          <h3 className="text-sm font-medium text-foreground">Kitchen Stress</h3>
          <IndicatorBar
            value={dish.stress_score}
            color={dish.stress_score <= 30 ? "opportunity" : dish.stress_score <= 60 ? "info" : "warning"}
            label="Stress Score"
          />
          <p className="text-xs text-muted-foreground">
            {dish.stress_score <= 30
              ? "Low kitchen impact. Easy to prepare consistently."
              : dish.stress_score <= 60
                ? "Moderate kitchen stress. Monitor during peak hours."
                : "High stress item. May cause bottlenecks and quality issues under load."}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Demand Pattern</h3>
          <StatusBadge variant={dish.demand_pattern === "growing" ? "opportunity" : dish.demand_pattern === "declining" ? "warning" : "neutral"}>
            {dish.demand_pattern.charAt(0).toUpperCase() + dish.demand_pattern.slice(1)}
          </StatusBadge>
          <p className="text-xs text-muted-foreground">
            {dish.demand_pattern === "stable" && "Consistent order volume week over week."}
            {dish.demand_pattern === "growing" && "Increasing demand trend — consider featuring more prominently."}
            {dish.demand_pattern === "declining" && "Declining orders — evaluate menu placement and value proposition."}
            {dish.demand_pattern === "volatile" && "Unpredictable demand — may be event or season dependent."}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6 space-y-3">
          <h3 className="text-sm font-medium text-foreground">Cannibalization</h3>
          {dish.cannibalization.length > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {dish.cannibalization.map((c) => (
                  <StatusBadge key={c} variant="warning">{c}</StatusBadge>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                This dish may be splitting orders with the items above, reducing individual performance.
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">No cannibalization detected.</p>
          )}
        </div>
      </div>

      {/* Operational metrics */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h3 className="text-sm font-medium text-foreground mb-4">Operational Metrics</h3>
        <div className="grid grid-cols-2 gap-6 text-xs">
          <div>
            <span className="text-muted-foreground">Avg Prep Time</span>
            <p className="text-foreground font-medium text-lg mt-1">{dish.prep_time} min</p>
          </div>
          <div>
            <span className="text-muted-foreground">Revenue per Order</span>
            <p className="text-foreground font-medium text-lg mt-1">₹{dish.selling_price}</p>
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
