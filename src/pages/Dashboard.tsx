import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { dishes, recommendations } from "@/data/mockData";
import CircularScore from "@/components/shared/CircularScore";
import StatusBadge, { classificationLabel } from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const healthScore = 74;
  const weeklyRevenue = dishes.reduce((s, d) => s + d.weekly_revenue, 0);
  const weeklyProfit = dishes.reduce((s, d) => s + d.weekly_profit, 0);
  const avgMargin = dishes.reduce((s, d) => s + d.margin, 0) / dishes.length;
  const avgStress = dishes.reduce((s, d) => s + d.stress_score, 0) / dishes.length;
  const highStressCount = dishes.filter((d) => d.stress_score > 60).length;

  const topPerformers = [...dishes].sort((a, b) => b.weekly_profit - a.weekly_profit).slice(0, 3);
  const needsAttention = dishes.filter((d) => d.margin < 50 || d.stress_score > 60);

  if (dishes.length === 0) {
    return (
      <EmptyState
        title="No menu data yet"
        description="Complete onboarding to import your menu and start getting insights."
        actionLabel="Start Onboarding"
        onAction={() => navigate("/onboarding")}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Menu Health Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Weekly performance snapshot · Last updated 2 hours ago
        </p>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-6 flex flex-col items-center">
          <CircularScore score={healthScore} size={100} />
          <span className="text-sm text-muted-foreground mt-3">Menu Health Score</span>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Weekly Revenue</span>
          <p className="text-2xl font-semibold text-foreground mt-2">₹{weeklyRevenue.toLocaleString()}</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Total Profit</span>
          <p className="text-2xl font-semibold text-foreground mt-2">₹{weeklyProfit.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-1">Avg margin {avgMargin.toFixed(1)}%</p>
        </div>

        <div className="rounded-lg border border-border bg-card p-6">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Kitchen Stress</span>
          <p className="text-2xl font-semibold text-foreground mt-2">{avgStress.toFixed(0)}%</p>
          <p className="text-xs text-warning mt-1">{highStressCount} high-stress items</p>
        </div>
      </div>

      {/* Top Performers */}
      <div>
        <h2 className="text-lg font-medium text-foreground mb-4">Top Performers</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {topPerformers.map((dish) => (
            <button
              key={dish.id}
              onClick={() => navigate(`/dish/${dish.id}`)}
              className="rounded-lg border border-border bg-card p-5 text-left hover:border-foreground/20 transition-colors duration-200"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-foreground">{dish.name}</span>
                <StatusBadge variant={dish.classification}>{classificationLabel(dish.classification)}</StatusBadge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-muted-foreground">Margin</span>
                  <p className="text-foreground font-medium">{dish.margin.toFixed(1)}%</p>
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

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <div>
          <h2 className="text-lg font-medium text-foreground mb-4">Items Needing Attention</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {needsAttention.map((dish) => (
              <button
                key={dish.id}
                onClick={() => navigate(`/dish/${dish.id}`)}
                className="rounded-lg border border-border bg-card p-5 text-left hover:border-foreground/20 transition-colors duration-200"
              >
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground">{dish.name}</span>
                  <StatusBadge variant="warning">
                    {dish.margin < 50 ? "Low Margin" : "High Stress"}
                  </StatusBadge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Margin</span>
                    <p className="text-foreground font-medium">{dish.margin.toFixed(1)}%</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Stress</span>
                    <p className="text-foreground font-medium">{dish.stress_score}%</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Pending Actions CTA */}
      {recommendations.filter((r) => r.status === "pending").length > 0 && (
        <div className="rounded-lg border border-border bg-card p-5 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              {recommendations.filter((r) => r.status === "pending").length} pending recommendations
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
