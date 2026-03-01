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

// Fallback mock data when no snapshot exists yet
import { dishes, weeklySnapshots } from "@/data/mockData";

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

  // Use snapshot data if available, otherwise fall back to mock data for exploration
  const pendingRecs = recs.filter((r) => r.status === "pending");

  const healthScore = snapshot?.health_score ?? 74;
  const healthDelta = snapshot?.health_delta ?? 3;
  const totalRevenue = snapshot?.total_revenue ?? 175080;
  const avgMargin = snapshot?.avg_margin ?? 66;
  const totalDishes = snapshot?.total_dishes ?? dishes.length;

  const riskItemCount = snapshot
    ? Object.values(snapshot.risk_summary).reduce((a, b) => a + b, 0)
    : dishes.filter((d) => d.risk_flags.length > 0).length;

  // Build top performers from snapshot or mock
  const topPerformers = snapshot?.top_profit_contributors?.length
    ? snapshot.top_profit_contributors.slice(0, 5).map((d) => ({
        id: d.menu_item_id,
        name: d.name,
        category: d.category,
        score: Math.round(d.true_margin),
        unitsSold: d.weekly_orders,
      }))
    : [...dishes]
        .sort((a, b) => b.margin - a.margin)
        .slice(0, 5)
        .map((d) => ({
          id: d.id,
          name: d.name,
          category: d.category,
          score: Math.round(d.margin),
          unitsSold: d.weekly_orders,
        }));

  // Build stress indicators from snapshot or mock
  const stressItems = snapshot?.highest_stress_contributors?.length
    ? snapshot.highest_stress_contributors
        .filter((d) => d.stress_score > 30)
        .slice(0, 5)
        .map((d) => ({ id: d.menu_item_id, name: d.name, stressScore: Math.round(d.stress_score) }))
    : [...dishes]
        .sort((a, b) => b.stress_score - a.stress_score)
        .slice(0, 5)
        .map((d) => ({ id: d.id, name: d.name, stressScore: d.stress_score }));

  // Category performance from snapshot classification or mock
  const categoryPerformance = snapshot?.classification_breakdown
    ? Object.entries(snapshot.classification_breakdown).map(([name, count]) => ({
        name,
        score: Math.round((count / totalDishes) * 100),
      }))
    : [
        { name: "Mains", score: 74 },
        { name: "Starters", score: 58 },
        { name: "Desserts", score: 82 },
        { name: "Beverages", score: 65 },
      ];

  // Weekly trend data
  const weekTrendData = weeklySnapshots.map((w, i) => ({
    label: `W${i + 1}`,
    score: w.health_score,
  }));

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Last analyzed 3 hours ago · {pendingRecs.length > 0 ? `${pendingRecs.length} pending actions` : "No pending actions"}
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
