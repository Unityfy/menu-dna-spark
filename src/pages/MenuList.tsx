import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { dishes, categories } from "@/data/mockData";
import StatusBadge, { classificationLabel } from "@/components/shared/StatusBadge";
import { cn } from "@/lib/utils";

const MenuList = () => {
  const [activeCategory, setActiveCategory] = useState("All");
  const navigate = useNavigate();

  const filtered = activeCategory === "All" ? dishes : dishes.filter((d) => d.category === activeCategory);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Menu DNA</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {dishes.length} items across {categories.length - 1} categories
        </p>
      </div>

      {/* Category filters */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-200",
              activeCategory === cat
                ? "bg-foreground text-background"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Dish list */}
      <div className="space-y-3">
        {filtered.map((dish) => (
          <button
            key={dish.id}
            onClick={() => navigate(`/dish/${dish.id}`)}
            className="w-full rounded-lg border border-border bg-card p-5 text-left hover:border-foreground/20 transition-colors duration-200"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-foreground">{dish.name}</span>
                <span className="text-xs text-muted-foreground">{dish.category}</span>
              </div>
              <StatusBadge variant={dish.classification}>
                {classificationLabel(dish.classification)}
              </StatusBadge>
            </div>
            <div className="grid grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-muted-foreground">Margin</span>
                <p className="text-foreground font-medium">{dish.margin.toFixed(1)}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Stress</span>
                <p className="text-foreground font-medium">{dish.stress_score}%</p>
              </div>
              <div>
                <span className="text-muted-foreground">Orders/wk</span>
                <p className="text-foreground font-medium">{dish.weekly_orders}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Revenue/wk</span>
                <p className="text-foreground font-medium">₹{dish.weekly_revenue.toLocaleString()}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default MenuList;
