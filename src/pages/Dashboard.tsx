import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLatestSnapshot } from "@/hooks/useMenuIntelligence";
import { useRecommendations } from "@/hooks/useRecommendations";
import EmptyState from "@/components/shared/EmptyState";
import KpiCard from "@/components/dashboard/KpiCard";
import MenuHealthTrend from "@/components/dashboard/MenuHealthTrend";
import CategoryPerformance from "@/components/dashboard/CategoryPerformance";
import TopPerformers from "@/components/dashboard/TopPerformers";
import KitchenStressIndicators from "@/components/dashboard/KitchenStressIndicators";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: snapshot, isLoading } = useLatestSnapshot();
  const { data: recs = [] } = useRecommendations();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-64 rounded bg-secondary animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="rounded-lg border border-border bg-card p-6 h-28 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!snapshot) {
    return (
      <EmptyState
        title="No data yet"
        description="Complete onboarding and upload sales data to generate your dashboard."
        actionLabel="Start Onboarding"
        onAction={() => navigate("/onboarding")}
      />
    );
  }

  const pendingRecs = recs.filter((r) => r.status === "pending");

  const healthScore = snapshot.health_score;
  const healthDelta = snapshot.health_delta;
  const totalRevenue = snapshot.total_revenue;
  const avgMargin = snapshot.avg_margin;
  const totalDishes = snapshot.total_dishes;

  const riskItemCount = Object.values(snapshot.risk_summary as Record<string, number>).reduce((a, b) => a + b, 0);

  // Compute relative time since last analysis
  const computedAt = snapshot.computed_at ? new Date(snapshot.computed_at) : null;
  const getRelativeTime = (date: Date | null): string => {
    if (!date) return "Not yet analyzed";
    const diffMs = Date.now() - date.getTime();
    const mins = Math.floor(diffMs / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };
  const lastAnalyzedLabel = `Last analyzed ${getRelativeTime(computedAt)}`;

  const topPerformers = (snapshot.top_profit_contributors as any[])?.slice(0, 5).map((d: any) => ({
    id: d.menu_item_id,
    name: d.name,
    category: d.category,
    score: Math.round(d.true_margin),
    unitsSold: d.weekly_orders,
  })) || [];

  const stressItems = (snapshot.highest_stress_contributors as any[])
    ?.filter((d: any) => d.stress_score > 30)
    .slice(0, 5)
    .map((d: any) => ({ id: d.menu_item_id, name: d.name, stressScore: Math.round(d.stress_score) })) || [];

  const categoryPerformance = snapshot.classification_breakdown
    ? Object.entries(snapshot.classification_breakdown as Record<string, number>).map(([name, count]) => ({
        name,
        score: Math.round((count / totalDishes) * 100),
      }))
    : [];

  const weekTrendData: { label: string; score: number }[] = [];

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {lastAnalyzedLabel} · {pendingRecs.length > 0 ? `${pendingRecs.length} pending actions` : "No pending actions"}
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Health Score"
          value={String(healthScore)}
          subtitle={healthDelta !== 0 ? `↑ ${Math.abs(healthDelta)} pts from last week` : undefined}
          subtitleColor={healthDelta > 0 ? "opportunity" : "warning"}
        />
        <KpiCard
          label="Weekly Revenue"
          value={`₹${(totalRevenue / 1000).toFixed(1)}k`}
        />
        <KpiCard
          label="Avg Margin"
          value={`${avgMargin.toFixed(0)}%`}
          subtitle="Target: 70%+"
        />
        <KpiCard
          label="Risk Items"
          value={String(riskItemCount)}
          subtitle={riskItemCount > 0 ? "Require attention" : "All clear"}
          subtitleColor={riskItemCount > 0 ? "warning" : "opportunity"}
        />
      </div>

      {/* Menu Health Trend + Category Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MenuHealthTrend currentScore={healthScore} weeks={weekTrendData} />
        <CategoryPerformance categories={categoryPerformance} />
      </div>

      {/* Top Performers + Kitchen Stress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <TopPerformers performers={topPerformers} />
        <KitchenStressIndicators items={stressItems} />
      </div>

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
