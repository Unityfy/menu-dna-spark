import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLatestSnapshot, DishSummary } from "@/hooks/useMenuIntelligence";
import { useRecommendations } from "@/hooks/useRecommendations";
import CircularScore from "@/components/shared/CircularScore";
import StatusBadge, { classificationLabel } from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";

const DishCard = ({ dish, onClick }: { dish: DishSummary; onClick: () => void }) => (
  <button
    onClick={onClick}
    className="rounded-lg border border-border bg-card p-5 text-left hover:border-foreground/20 transition-colors duration-200"
  >
    <div className="flex items-center justify-between mb-3">
      <span className="text-sm font-medium text-foreground">{dish.name}</span>
      <StatusBadge variant={dish.classification as any}>
        {classificationLabel(dish.classification as any)}
      </StatusBadge>
    </div>
    <div className="grid grid-cols-2 gap-2 text-xs">
      <div>
        <span className="text-muted-foreground">Margin</span>
        <p className="text-foreground font-medium">{dish.true_margin.toFixed(1)}%</p>
      </div>
      <div>
        <span className="text-muted-foreground">Revenue</span>
        <p className="text-foreground font-medium">₹{dish.weekly_revenue.toLocaleString()}</p>
      </div>
    </div>
  </button>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: snapshot, isLoading } = useLatestSnapshot();
  const { data: recs = [] } = useRecommendations();

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Menu Health Overview</h1>
          <p className="text-sm text-muted-foreground mt-1">Loading intelligence…</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-6 h-32 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <EmptyState
        title="No menu intelligence yet"
        description="Complete onboarding and run the Dish DNA engine to generate your first weekly snapshot."
        actionLabel="Start Onboarding"
        onAction={() => navigate("/onboarding")}
      />
    );
  }
  const pendingRecs = recs.filter((r) => r.status === "pending");
  const highStressCount = (snapshot.highest_stress_contributors || []).filter((d) => d.stress_score > 60).length;
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Menu Health Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Weekly performance snapshot · {snapshot.total_dishes} dishes analysed
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center">
          <CircularScore score={snapshot.health_score} size={100} />
          <span className="text-sm text-muted-foreground mt-3">Menu Health Score</span>
          {snapshot.health_delta !== 0 && (
            <span className={`text-xs font-medium mt-1 ${snapshot.health_delta > 0 ? "text-opportunity" : "text-warning"}`}>
              {snapshot.health_delta > 0 ? "+" : ""}{snapshot.health_delta} vs last week
            </span>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Weekly Revenue</span>
          <p className="text-2xl font-semibold text-foreground mt-2">₹{snapshot.total_revenue.toLocaleString()}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Profit</span>
          <p className="text-2xl font-semibold text-foreground mt-2">₹{snapshot.total_profit.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Avg margin {snapshot.avg_margin.toFixed(1)}%</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Kitchen Stress</span>
          <p className="text-2xl font-semibold text-foreground mt-2">{snapshot.avg_stress.toFixed(0)}%</p>
          {highStressCount > 0 && (
            <p className="text-xs text-warning mt-1">{highStressCount} high-stress items</p>
          )}
        </div>
      </div>

      {/* Top Profit Contributors */}
      {snapshot.top_profit_contributors.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-foreground mb-4">Top Profit Contributors</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {snapshot.top_profit_contributors.slice(0, 3).map((dish) => (
              <DishCard
                key={dish.menu_item_id}
                dish={dish}
                onClick={() => navigate(`/dish/${dish.menu_item_id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Hidden Loss Makers */}
      {snapshot.hidden_loss_makers.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-foreground mb-4">Hidden Loss Makers</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {snapshot.hidden_loss_makers.map((dish) => (
              <DishCard
                key={dish.menu_item_id}
                dish={dish}
                onClick={() => navigate(`/dish/${dish.menu_item_id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Kitchen Stress Contributors */}
      {snapshot.highest_stress_contributors.filter((d) => d.stress_score > 50).length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-foreground mb-4">Highest Kitchen Stress</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {snapshot.highest_stress_contributors.filter((d) => d.stress_score > 50).map((dish) => (
              <button
                key={dish.menu_item_id}
                onClick={() => navigate(`/dish/${dish.menu_item_id}`)}
                className="rounded-lg border border-border bg-card p-5 text-left hover:border-foreground/20 transition-colors duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">{dish.name}</span>
                  <StatusBadge variant="warning">Stress {dish.stress_score}%</StatusBadge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Orders/wk</span>
                    <p className="text-foreground font-medium">{dish.weekly_orders}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Revenue</span>
                    <p className="text-foreground font-medium">₹{dish.weekly_revenue.toLocaleString()}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Low-Impact Fillers */}
      {snapshot.low_impact_items.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-foreground mb-4">Low-Impact Items</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {snapshot.low_impact_items.map((dish) => (
              <DishCard
                key={dish.menu_item_id}
                dish={dish}
                onClick={() => navigate(`/dish/${dish.menu_item_id}`)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Risk Summary */}
      {Object.values(snapshot.risk_summary).some((v) => v > 0) && (
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-medium text-foreground mb-3">Risk Summary</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { key: "profit_risk", label: "Profit Risk" },
              { key: "stress_risk", label: "Stress Risk" },
              { key: "demand_risk", label: "Demand Risk" },
              { key: "cannibalization_risk", label: "Cannibalization" },
            ].map(({ key, label }) => (
              <div key={key} className="text-center">
                <p className="text-xl font-semibold text-foreground">{snapshot.risk_summary[key] || 0}</p>
                <p className="text-xs text-muted-foreground mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Actions CTA */}
      {pendingRecs.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {pendingRecs.length} pending recommendations
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">Review your weekly action plan</p>
          </div>
          <button
            onClick={() => navigate("/action-plan")}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            View Plan
          </button>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
