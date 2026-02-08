import { useState } from "react";
import { Package, Layers, AlertTriangle, X } from "lucide-react";
import { OnboardingData, MenuItemEntry, MOCK_MENU_ITEMS } from "./types";

interface Props {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}

const StepMenuImport = ({ data, onChange }: Props) => {
  const [filter, setFilter] = useState("All");
  const items = data.menuItems.length > 0 ? data.menuItems : MOCK_MENU_ITEMS;
  const categories = ["All", ...data.categories];

  const filtered = filter === "All" ? items : items.filter((i) => i.category === filter);
  const duplicates = items.filter((i) => i.isDuplicate);
  const combos = items.filter((i) => i.isCombo);

  const handleMergeDuplicate = (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    onChange({ menuItems: updated });
  };

  const handleRemove = (id: string) => {
    const updated = items.filter((i) => i.id !== id);
    onChange({ menuItems: updated });
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground leading-relaxed">
        We've imported your menu items. Review categories, resolve duplicates, and confirm variants and combos.
      </p>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard icon={<Package className="h-4 w-4" />} label="Items" value={items.filter((i) => !i.isDuplicate).length} />
        <StatCard icon={<Layers className="h-4 w-4" />} label="Combos" value={combos.length} />
        <StatCard
          icon={<AlertTriangle className="h-4 w-4 text-warning" />}
          label="Duplicates"
          value={duplicates.length}
          warning={duplicates.length > 0}
        />
      </div>

      {/* Duplicate banner */}
      {duplicates.length > 0 && (
        <div className="rounded-md border border-warning/30 bg-warning/5 p-3 flex items-start gap-2">
          <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
          <div>
            <p className="text-xs text-foreground font-medium">{duplicates.length} potential duplicate(s) detected</p>
            <p className="text-xs text-muted-foreground mt-0.5">Review and merge to ensure accurate analysis.</p>
          </div>
        </div>
      )}

      {/* Category filters */}
      <div className="flex gap-2 flex-wrap">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              filter === cat
                ? "bg-foreground text-background"
                : "bg-secondary border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat}
            <span className="ml-1 opacity-60">
              {cat === "All" ? items.length : items.filter((i) => i.category === cat).length}
            </span>
          </button>
        ))}
      </div>

      {/* Item list */}
      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {filtered.map((item) => (
          <div
            key={item.id}
            className={`flex items-center justify-between rounded-md border px-3 py-2.5 transition-colors ${
              item.isDuplicate
                ? "border-warning/30 bg-warning/5"
                : "border-border bg-secondary/50"
            }`}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="min-w-0">
                <p className="text-sm text-foreground truncate">{item.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">{item.category}</span>
                  {item.isCombo && (
                    <span className="text-xs bg-info/10 text-info px-1.5 py-0.5 rounded">Combo</span>
                  )}
                  {item.variant && (
                    <span className="text-xs text-muted-foreground/60">Variant: {item.variant}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">₹{item.sellingPrice}</span>
              {item.isDuplicate ? (
                <button
                  onClick={() => handleMergeDuplicate(item.id)}
                  className="rounded px-2 py-1 text-xs bg-warning/10 text-warning hover:bg-warning/20 transition-colors"
                >
                  Merge
                </button>
              ) : (
                <button
                  onClick={() => handleRemove(item.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const StatCard = ({
  icon,
  label,
  value,
  warning,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  warning?: boolean;
}) => (
  <div className="rounded-md border border-border bg-secondary/50 p-3 text-center">
    <div className={`flex justify-center mb-1 ${warning ? "text-warning" : "text-muted-foreground"}`}>{icon}</div>
    <p className="text-lg font-semibold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default StepMenuImport;
