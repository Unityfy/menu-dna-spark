import { useState } from "react";
import { ChevronLeft, ChevronRight, SkipForward } from "lucide-react";
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
  const [activeIdx, setActiveIdx] = useState(0);
  const activeDish = items[activeIdx];

  const getEntry = (dishId: string): PrepTimeEntry =>
    data.prepTimes.find((p) => p.dishId === dishId) || {
      dishId,
      dishName: items.find((i) => i.id === dishId)?.name || "",
      prepTime: 15,
      station: "Stovetop",
      complexity: "medium" as const,
    };

  const updateEntry = (entry: PrepTimeEntry) => {
    const times = data.prepTimes.filter((p) => p.dishId !== entry.dishId);
    onChange({ prepTimes: [...times, entry] });
  };

  const skipDish = () => {
    onChange({ prepTimes: data.prepTimes.filter((p) => p.dishId !== activeDish?.id) });
    setActiveIdx((i) => Math.min(items.length - 1, i + 1));
  };

  const activeEntry = activeDish ? getEntry(activeDish.id) : null;
  const completedCount = data.prepTimes.length;
  const progressPct = Math.round((completedCount / items.length) * 100);

  if (!activeEntry || !activeDish) {
    return <p className="text-sm text-muted-foreground">No dishes to configure.</p>;
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Prep time and station data helps identify kitchen stress points and bottlenecks.
      </p>

      {/* Progress */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Dish {activeIdx + 1} of {items.length}
          </span>
          <span className="text-[10px] text-muted-foreground">{progressPct}% complete</span>
        </div>
        <div className="h-1 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Active dish card */}
      <div className="rounded-md border border-border bg-secondary/30 p-5 space-y-5">
        <div>
          <h3 className="text-base font-semibold text-foreground">{activeDish.name}</h3>
          <p className="text-[10px] text-muted-foreground">{activeDish.category}</p>
        </div>

        {/* Prep time slider */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-xs font-medium text-muted-foreground">Average prep time</label>
            <span className="text-sm font-semibold text-foreground">{activeEntry.prepTime} min</span>
          </div>
          <input
            type="range"
            min={5}
            max={60}
            value={activeEntry.prepTime}
            onChange={(e) => updateEntry({ ...activeEntry, prepTime: Number(e.target.value) })}
            className="w-full accent-foreground"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/60">
            <span>5 min</span>
            <span>60 min</span>
          </div>
        </div>

        {/* Station */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Kitchen station</label>
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

        {/* Complexity radio */}
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Prep complexity</label>
          <div className="flex gap-3">
            {(["low", "medium", "high"] as const).map((c) => (
              <label
                key={c}
                className={`flex-1 cursor-pointer rounded-md border px-3 py-2 text-xs capitalize text-center transition-colors ${
                  activeEntry.complexity === c
                    ? "border-foreground bg-foreground/10 text-foreground"
                    : "border-border bg-secondary text-muted-foreground hover:border-muted-foreground"
                }`}
              >
                <input
                  type="radio"
                  name="complexity"
                  value={c}
                  checked={activeEntry.complexity === c}
                  onChange={() => updateEntry({ ...activeEntry, complexity: c })}
                  className="sr-only"
                />
                {c}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Wizard navigation */}
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => setActiveIdx((i) => Math.max(0, i - 1))}
          disabled={activeIdx === 0}
          className="flex items-center gap-1 rounded-md bg-secondary border border-border px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Previous
        </button>
        <button
          onClick={skipDish}
          className="flex items-center gap-1 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
        >
          <SkipForward className="h-3.5 w-3.5" /> Skip
        </button>
        <button
          onClick={() => {
            updateEntry(activeEntry);
            setActiveIdx((i) => Math.min(items.length - 1, i + 1));
          }}
          disabled={activeIdx === items.length - 1}
          className="flex items-center gap-1 rounded-md bg-foreground text-background px-3 py-2 text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
        >
          Next <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default StepPrepTime;
