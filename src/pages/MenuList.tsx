import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMenuList } from "@/hooks/useMenuList";
import StatusBadge from "@/components/shared/StatusBadge";
import EmptyState from "@/components/shared/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// Fallback mock data
import { dishes as mockDishes, categories as mockCategories } from "@/data/mockData";

const classificationConfig: Record<string, { icon: string; label: string; variant: "warning" | "opportunity" | "info" | "neutral" }> = {
  "high-profit": { icon: "★", label: "Star", variant: "opportunity" },
  "hidden-loss": { icon: "⚠", label: "Risky", variant: "warning" },
  "kitchen-disruptor": { icon: "◆", label: "Disruptor", variant: "info" },
  "low-impact-filler": { icon: "—", label: "Filler", variant: "neutral" },
};

const trendDisplay = (trend: string) => {
  switch (trend) {
    case "rising":
      return { icon: "↑", label: "Rising", className: "text-opportunity" };
    case "declining":
      return { icon: "↓", label: "Declining", className: "text-warning" };
    default:
      return { icon: "→", label: "Stable", className: "text-muted-foreground" };
  }
};

const MenuList = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const navigate = useNavigate();
  const { data, isLoading } = useMenuList();

  // Use real data or fallback to mock
  const dishes = data?.dishes?.length
    ? data.dishes
    : mockDishes.map((d) => ({
        id: d.id,
        name: d.name,
        category: d.category,
        classification: d.classification,
        margin: d.margin,
        stress_score: d.stress_score,
        weekly_orders: d.weekly_orders,
        weekly_revenue: d.weekly_revenue,
        demand_trend: d.demand_trend,
      }));

  const categories = data?.categories?.length
    ? data.categories
    : mockCategories;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-48 rounded bg-secondary animate-pulse" />
        <div className="h-10 w-96 rounded bg-secondary animate-pulse" />
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 rounded-lg bg-card border border-border animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (dishes.length === 0) {
    return (
      <EmptyState
        title="No menu items yet"
        description="Complete onboarding to import your menu and generate Dish DNA profiles."
        actionLabel="Start Onboarding"
        onAction={() => navigate("/onboarding")}
      />
    );
  }

  const filtered = activeCategory === "All" ? dishes : dishes.filter((d) => d.category === activeCategory);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mb-2">
          Dish Intelligence
        </p>
        <h1 className="text-3xl font-bold text-foreground font-[var(--font-display)]">
          Menu · Dish DNA
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Click any dish to view its full DNA profile
        </p>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-md px-4 py-2 text-sm font-medium transition-colors duration-200",
              activeCategory === cat
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="grid grid-cols-[40px_1fr_80px_80px_80px_120px_100px] items-center px-5 py-3 border-b border-border">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">#</span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Dish</span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground text-center">Margin</span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground text-center">Stress</span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground text-center">Sales</span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground text-center">Class</span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground text-right">Trend</span>
        </div>

        {/* Rows */}
        {filtered.map((dish, i) => {
          const badge = classificationConfig[dish.classification] || classificationConfig["low-impact-filler"];
          const trend = trendDisplay(dish.demand_trend);

          return (
            <button
              key={dish.id}
              onClick={() => navigate(`/dish/${dish.id}`)}
              className="grid grid-cols-[40px_1fr_80px_80px_80px_120px_100px] items-center w-full px-5 py-4 border-b border-border/50 last:border-0 text-left hover:bg-secondary/30 transition-colors"
            >
              <span className="text-xs text-muted-foreground font-medium">
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground font-[var(--font-display)]">
                  {dish.name}
                </p>
                <p className="text-xs text-muted-foreground">{dish.category}</p>
              </div>

              <span className="text-sm text-foreground text-center font-medium">
                {dish.margin.toFixed(0)}%
              </span>

              <span className={cn(
                "text-sm text-center font-medium",
                dish.stress_score >= 70 ? "text-warning" : dish.stress_score >= 40 ? "text-info" : "text-foreground"
              )}>
                {dish.stress_score}%
              </span>

              <span className="text-sm text-foreground text-center font-medium">
                {dish.weekly_orders}
              </span>

              <div className="flex justify-center">
                <StatusBadge variant={badge.variant}>
                  {badge.icon} {badge.label}
                </StatusBadge>
              </div>

              <span className={cn("text-sm text-right font-medium", trend.className)}>
                {trend.icon} {trend.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MenuList;
