import { useState } from "react";
import { OnboardingData, MOCK_MENU_ITEMS, STATIONS } from "./types";
import type { PrepTimeEntry } from "./types";

interface Props {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}

const inputClass =
  "w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

const StepPrepTime = ({ data, onChange }: Props) => {
  const items = data.menuItems.length > 0 ? data.menuItems : MOCK_MENU_ITEMS.filter((i) => !i.isDuplicate);
  const [activeDish, setActiveDish] = useState(items[0]?.id || "");

  const getEntry = (dishId: string): PrepTimeEntry => {
    return (
      data.prepTimes.find((p) => p.dishId === dishId) || {
        dishId,
        dishName: items.find((i) => i.id === dishId)?.name || "",
        prepTime: 15,
        station: "Stovetop",
        complexity: "medium" as const,
      }
    );
  };

  const updateEntry = (entry: PrepTimeEntry) => {
    const times = data.prepTimes.filter((p) => p.dishId !== entry.dishId);
    onChange({ prepTimes: [...times, entry] });
  };

  const activeEntry = getEntry(activeDish);
  const completedCount = data.prepTimes.length;

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Prep time and station data helps identify kitchen stress points and bottlenecks in your workflow.
      </p>

      {/* Progress */}
      <div className="flex items-center gap-2">
        <div className="h-1 flex-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground rounded-full transition-all duration-300"
            style={{ width: `${(completedCount / items.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground">{completedCount}/{items.length}</span>
      </div>

      {/* Dish selector */}
      <div className="flex gap-2 flex-wrap">
        {items.map((item) => {
          const hasData = data.prepTimes.some((p) => p.dishId === item.id);
          return (
            <button
              key={item.id}
              onClick={() => setActiveDish(item.id)}
              className={`rounded-md px-2.5 py-1.5 text-xs border transition-colors ${
                activeDish === item.id
                  ? "border-foreground bg-foreground/10 text-foreground"
                  : hasData
                  ? "border-opportunity/30 bg-opportunity/5 text-opportunity"
                  : "border-border bg-secondary text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              {item.name}
            </button>
          );
        })}
      </div>

      {/* Prep time slider */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="text-xs font-medium text-muted-foreground">Prep Time</label>
          <span className="text-sm font-semibold text-foreground">{activeEntry.prepTime} min</span>
        </div>
        <input
          type="range"
          min={2}
          max={60}
          value={activeEntry.prepTime}
          onChange={(e) => updateEntry({ ...activeEntry, prepTime: Number(e.target.value) })}
          className="w-full accent-foreground"
        />
        <div className="flex justify-between text-xs text-muted-foreground/60">
          <span>2 min</span>
          <span>60 min</span>
        </div>
      </div>

      {/* Station */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Station</label>
        <select
          value={activeEntry.station}
          onChange={(e) => updateEntry({ ...activeEntry, station: e.target.value })}
          className={inputClass}
        >
          {STATIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Complexity */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">Complexity</label>
        <div className="flex gap-3">
          {(["low", "medium", "high"] as const).map((c) => (
            <button
              key={c}
              onClick={() => updateEntry({ ...activeEntry, complexity: c })}
              className={`flex-1 rounded-md border px-3 py-2 text-xs capitalize transition-colors ${
                activeEntry.complexity === c
                  ? "border-foreground bg-foreground/10 text-foreground"
                  : "border-border bg-secondary text-muted-foreground hover:border-muted-foreground"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {/* Save this dish */}
      <button
        onClick={() => updateEntry(activeEntry)}
        className="w-full rounded-md bg-secondary border border-border px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
      >
        Save & Next Dish
      </button>
    </div>
  );
};

export default StepPrepTime;
