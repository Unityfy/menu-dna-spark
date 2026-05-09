import { useMemo, useRef, useState } from "react";
import { Plus, Trash2, Upload, ChevronLeft, ChevronRight, SkipForward, Download, Sparkles, Loader2 } from "lucide-react";
import { OnboardingData, MOCK_MENU_ITEMS } from "./types";
import type { IngredientCostEntry } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}

const inputClass =
  "w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

const COMMON_INGREDIENTS = [
  "Chicken breast", "Paneer", "Basmati rice", "Onion", "Tomato", "Garlic", "Ginger",
  "Butter", "Cream", "Yogurt", "Mozzarella", "Olive oil", "All-purpose flour",
  "Mushroom", "Spinach", "Potato", "Lamb", "Prawns", "Egg", "Sugar", "Salt",
  "Garam masala", "Cumin", "Turmeric", "Coriander", "Lemon", "Coconut milk",
];

const UNITS = ["g", "kg", "ml", "L", "pc"];

const CSV_TEMPLATE = "Dish Name,Ingredient,Unit Cost,Portion Qty,Unit\nButter Chicken,Chicken breast,320,200,g\nButter Chicken,Cream,180,50,ml\n";

const StepIngredientCosts = ({ data, onChange }: Props) => {
  const items = data.menuItems.length > 0 ? data.menuItems : MOCK_MENU_ITEMS.filter((i) => !i.isDuplicate);
  const [activeIdx, setActiveIdx] = useState(0);
  const [mode, setMode] = useState<"manual" | "csv">("manual");
  const [focusedRow, setFocusedRow] = useState<number | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [aiLoading, setAiLoading] = useState<string | null>(null);

  const unitToBaseFactor = (unit: string) =>
    unit === "kg" || unit === "L" ? 1 : unit === "pc" ? 1 : 1 / 1000;

  const autoDetectWithAI = async (dishId: string) => {
    const dish = items.find((i) => i.id === dishId);
    if (!dish) return;
    setAiLoading(dishId);
    try {
      const { data: aiData, error } = await supabase.functions.invoke("analyze-dish", {
        body: { dish_name: dish.name, category: dish.category },
      });
      if (error) throw error;
      if (!aiData || aiData.error) throw new Error(aiData?.error || "AI analysis failed");

      const ingredients = (aiData.ingredients || []).map((ing: any) => ({
        name: String(ing.name || ""),
        unitCost: Number(ing.unit_cost_inr) || 0,
        portionQty: Number(ing.quantity) || 0,
        unit: ["g", "kg", "ml", "L", "pc"].includes(ing.unit) ? ing.unit : "g",
      }));

      const total = ingredients.reduce(
        (s: number, i: any) => s + i.unitCost * i.portionQty * unitToBaseFactor(i.unit),
        0,
      );

      const entry: IngredientCostEntry = {
        dishId,
        dishName: dish.name,
        ingredients: ingredients.length ? ingredients : [{ name: "", unitCost: 0, portionQty: 0, unit: "g" }],
        totalFoodCost: Math.round(total * 100) / 100,
        cuisine: aiData.cuisine,
        prepStyle: aiData.prep_style,
        complexity: aiData.complexity,
        complexityScore: Number(aiData.complexity_score) || undefined,
        estimatedPrepMinutes: Number(aiData.estimated_prep_minutes) || undefined,
        aiNotes: aiData.notes,
        aiGenerated: true,
      };

      const costs = data.ingredientCosts.filter((c) => c.dishId !== dishId);
      const updates: Partial<OnboardingData> = { ingredientCosts: [...costs, entry] };

      // Pre-fill prep time entry from AI data
      if (entry.estimatedPrepMinutes || entry.complexity) {
        const otherPrep = data.prepTimes.filter((p) => p.dishId !== dishId);
        updates.prepTimes = [
          ...otherPrep,
          {
            dishId,
            dishName: dish.name,
            prepTime: entry.estimatedPrepMinutes || 10,
            station: data.prepTimes.find((p) => p.dishId === dishId)?.station || "Stovetop",
            complexity: entry.complexity || "medium",
          },
        ];
      }

      onChange(updates);
      toast.success(`AI detected ${ingredients.length} ingredients for ${dish.name}`);

    } catch (e: any) {
      console.error("AI detect error:", e);
      toast.error(e.message || "Could not auto-detect ingredients");
    } finally {
      setAiLoading(null);
    }
  };

  const autoDetectAll = async () => {
    for (const item of items) {
      // Skip if already filled
      const existing = data.ingredientCosts.find((c) => c.dishId === item.id);
      if (existing && existing.ingredients.some((i) => i.name)) continue;
      await autoDetectWithAI(item.id);
    }
  };


  const activeDishId = items[activeIdx]?.id || "";

  // Aggregate ingredients reused across dishes for suggestions
  const reusedIngredients = useMemo(() => {
    const map = new Map<string, { unitCost: number; unit: string }>();
    data.ingredientCosts.forEach((c) =>
      c.ingredients.forEach((i) => {
        if (i.name && !map.has(i.name.toLowerCase())) {
          map.set(i.name.toLowerCase(), { unitCost: i.unitCost, unit: i.unit });
        }
      }),
    );
    return map;
  }, [data.ingredientCosts]);

  const suggestions = useMemo(() => {
    const reused = Array.from(reusedIngredients.keys()).map((k) =>
      data.ingredientCosts.flatMap((c) => c.ingredients).find((i) => i.name.toLowerCase() === k)?.name || k,
    );
    const all = Array.from(new Set([...reused, ...COMMON_INGREDIENTS]));
    return all;
  }, [reusedIngredients, data.ingredientCosts]);

  const getCostEntry = (dishId: string): IngredientCostEntry =>
    data.ingredientCosts.find((c) => c.dishId === dishId) || {
      dishId,
      dishName: items.find((i) => i.id === dishId)?.name || "",
      ingredients: [{ name: "", unitCost: 0, portionQty: 0, unit: "g" }],
      totalFoodCost: 0,
    };

  const updateCostEntry = (entry: IngredientCostEntry) => {
    const total = entry.ingredients.reduce((s, i) => {
      const factor = i.unit === "kg" || i.unit === "L" ? 1 : i.unit === "pc" ? 1 : 1 / 1000;
      return s + i.unitCost * i.portionQty * factor;
    }, 0);
    const updated = { ...entry, totalFoodCost: Math.round(total * 100) / 100 };
    const costs = data.ingredientCosts.filter((c) => c.dishId !== entry.dishId);
    onChange({ ingredientCosts: [...costs, updated] });
  };

  const activeEntry = getCostEntry(activeDishId);
  const completedCount = data.ingredientCosts.filter((c) => c.ingredients.some((i) => i.name)).length;

  const goNext = () => setActiveIdx((i) => Math.min(items.length - 1, i + 1));
  const goPrev = () => setActiveIdx((i) => Math.max(0, i - 1));
  const skipDish = () => {
    const costs = data.ingredientCosts.filter((c) => c.dishId !== activeDishId);
    onChange({ ingredientCosts: costs });
    goNext();
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "ingredient-costs-template.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = async (file: File) => {
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2) return;
    const grouped = new Map<string, IngredientCostEntry>();
    lines.slice(1).forEach((line) => {
      const [dishName, ingredient, unitCost, portionQty, unit] = line.split(",").map((s) => s?.trim());
      if (!dishName || !ingredient) return;
      const dish = items.find((i) => i.name.toLowerCase() === dishName.toLowerCase());
      if (!dish) return;
      const existing = grouped.get(dish.id) || { dishId: dish.id, dishName: dish.name, ingredients: [], totalFoodCost: 0 };
      existing.ingredients.push({
        name: ingredient,
        unitCost: Number(unitCost) || 0,
        portionQty: Number(portionQty) || 0,
        unit: unit || "g",
      });
      grouped.set(dish.id, existing);
    });
    const merged = [...data.ingredientCosts.filter((c) => !grouped.has(c.dishId)), ...Array.from(grouped.values())];
    merged.forEach((entry) => {
      entry.totalFoodCost = entry.ingredients.reduce((s, i) => {
        const factor = i.unit === "kg" || i.unit === "L" ? 1 : i.unit === "pc" ? 1 : 1 / 1000;
        return s + i.unitCost * i.portionQty * factor;
      }, 0);
    });
    onChange({ ingredientCosts: merged });
    setMode("manual");
  };

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Accurate food costs reveal true dish profitability. Reused ingredients auto-suggest prices.
      </p>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setMode("manual")}
          className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
            mode === "manual" ? "bg-foreground text-background" : "bg-secondary border border-border text-muted-foreground"
          }`}
        >
          Guided Wizard
        </button>
        <button
          onClick={() => setMode("csv")}
          className={`rounded-md px-3 py-1.5 text-xs transition-colors ${
            mode === "csv" ? "bg-foreground text-background" : "bg-secondary border border-border text-muted-foreground"
          }`}
        >
          <Upload className="h-3 w-3 inline mr-1" />
          Bulk CSV
        </button>
      </div>

      {mode === "csv" ? (
        <div className="rounded-md border border-dashed border-border bg-secondary/30 p-6 text-center space-y-3">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
          <p className="text-sm text-foreground">Upload ingredient cost spreadsheet</p>
          <p className="text-xs text-muted-foreground">Columns: Dish Name, Ingredient, Unit Cost, Portion Qty, Unit</p>
          <input
            ref={fileRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleCsvUpload(e.target.files[0])}
          />
          <div className="flex gap-2 justify-center">
            <button
              onClick={downloadTemplate}
              className="rounded-md bg-secondary border border-border px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors flex items-center gap-1.5"
            >
              <Download className="h-3 w-3" /> Template
            </button>
            <button
              onClick={() => fileRef.current?.click()}
              className="rounded-md bg-foreground text-background px-4 py-2 text-xs font-medium hover:opacity-90 transition-opacity"
            >
              Browse Files
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="h-1 flex-1 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-foreground rounded-full transition-all duration-300"
                style={{ width: `${(completedCount / items.length) * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">{completedCount}/{items.length}</span>
            <button
              onClick={autoDetectAll}
              disabled={!!aiLoading}
              className="flex items-center gap-1 rounded-md bg-foreground/10 border border-border px-2 py-1 text-[11px] text-foreground hover:bg-foreground/20 transition-colors disabled:opacity-40"
              title="Auto-detect ingredients & costs for all dishes"
            >
              {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              AI all
            </button>
          </div>

          {/* Active dish card */}
          <div className="rounded-md border border-border bg-secondary/30 p-4 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  Dish {activeIdx + 1} of {items.length}
                </p>
                <h3 className="text-sm font-semibold text-foreground">{items[activeIdx]?.name}</h3>
                {(activeEntry.cuisine || activeEntry.prepStyle || activeEntry.complexity) && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {[activeEntry.cuisine, activeEntry.prepStyle, activeEntry.complexity && `${activeEntry.complexity} complexity${activeEntry.complexityScore ? ` · ${activeEntry.complexityScore}/10` : ""}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] text-muted-foreground">{items[activeIdx]?.category}</span>
                <button
                  onClick={() => autoDetectWithAI(activeDishId)}
                  disabled={aiLoading === activeDishId}
                  className="flex items-center gap-1 rounded-md bg-foreground text-background px-2 py-1 text-[11px] hover:opacity-90 transition-opacity disabled:opacity-40"
                  title="Auto-detect ingredients with AI"
                >
                  {aiLoading === activeDishId ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                  {aiLoading === activeDishId ? "Analyzing…" : "AI detect"}
                </button>
              </div>
            </div>

            {/* Ingredient rows */}
            <div className="space-y-2">
              {activeEntry.ingredients.map((ing, idx) => {
                const matches = ing.name
                  ? suggestions.filter((s) => s.toLowerCase().includes(ing.name.toLowerCase()) && s.toLowerCase() !== ing.name.toLowerCase()).slice(0, 5)
                  : [];
                return (
                  <div key={idx} className="space-y-1">
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-5 space-y-1 relative">
                        {idx === 0 && <label className="text-[10px] text-muted-foreground">Ingredient</label>}
                        <input
                          value={ing.name}
                          onFocus={() => setFocusedRow(idx)}
                          onBlur={() => setTimeout(() => setFocusedRow(null), 150)}
                          onChange={(e) => {
                            const updated = { ...activeEntry, ingredients: [...activeEntry.ingredients] };
                            updated.ingredients[idx] = { ...ing, name: e.target.value };
                            // Auto-fill from reused
                            const reused = reusedIngredients.get(e.target.value.toLowerCase());
                            if (reused && !ing.unitCost) {
                              updated.ingredients[idx].unitCost = reused.unitCost;
                              updated.ingredients[idx].unit = reused.unit;
                            }
                            updateCostEntry(updated);
                          }}
                          placeholder="Type or pick…"
                          className={inputClass}
                        />
                        {focusedRow === idx && matches.length > 0 && (
                          <div className="absolute z-10 left-0 right-0 mt-1 rounded-md border border-border bg-popover shadow-lg max-h-40 overflow-y-auto">
                            {matches.map((m) => (
                              <button
                                key={m}
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  const updated = { ...activeEntry, ingredients: [...activeEntry.ingredients] };
                                  const reused = reusedIngredients.get(m.toLowerCase());
                                  updated.ingredients[idx] = {
                                    ...ing,
                                    name: m,
                                    unitCost: reused?.unitCost || ing.unitCost,
                                    unit: reused?.unit || ing.unit,
                                  };
                                  updateCostEntry(updated);
                                  setFocusedRow(null);
                                }}
                                className="w-full text-left px-3 py-1.5 text-xs text-foreground hover:bg-secondary transition-colors flex justify-between"
                              >
                                <span>{m}</span>
                                {reusedIngredients.has(m.toLowerCase()) && (
                                  <span className="text-[9px] text-opportunity">reused</span>
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="col-span-3 space-y-1">
                        {idx === 0 && <label className="text-[10px] text-muted-foreground">₹ / unit</label>}
                        <input
                          type="number"
                          value={ing.unitCost || ""}
                          onChange={(e) => {
                            const updated = { ...activeEntry, ingredients: [...activeEntry.ingredients] };
                            updated.ingredients[idx] = { ...ing, unitCost: Number(e.target.value) };
                            updateCostEntry(updated);
                          }}
                          placeholder="0"
                          className={inputClass}
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        {idx === 0 && <label className="text-[10px] text-muted-foreground">Portion</label>}
                        <input
                          type="number"
                          value={ing.portionQty || ""}
                          onChange={(e) => {
                            const updated = { ...activeEntry, ingredients: [...activeEntry.ingredients] };
                            updated.ingredients[idx] = { ...ing, portionQty: Number(e.target.value) };
                            updateCostEntry(updated);
                          }}
                          placeholder="0"
                          className={inputClass}
                        />
                      </div>
                      <div className="col-span-1 space-y-1">
                        {idx === 0 && <label className="text-[10px] text-muted-foreground">Unit</label>}
                        <select
                          value={ing.unit}
                          onChange={(e) => {
                            const updated = { ...activeEntry, ingredients: [...activeEntry.ingredients] };
                            updated.ingredients[idx] = { ...ing, unit: e.target.value };
                            updateCostEntry(updated);
                          }}
                          className={inputClass}
                        >
                          {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </div>
                      <div className="col-span-1 flex justify-end">
                        {activeEntry.ingredients.length > 1 && (
                          <button
                            onClick={() => {
                              const updated = { ...activeEntry, ingredients: activeEntry.ingredients.filter((_, i) => i !== idx) };
                              updateCostEntry(updated);
                            }}
                            className="text-muted-foreground hover:text-foreground p-1.5 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={() => {
                  const updated = { ...activeEntry, ingredients: [...activeEntry.ingredients, { name: "", unitCost: 0, portionQty: 0, unit: "g" }] };
                  updateCostEntry(updated);
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <Plus className="h-3.5 w-3.5" /> Add ingredient
              </button>
            </div>

            {activeEntry.totalFoodCost > 0 && (
              <div className="rounded-md border border-border bg-background/50 p-2.5 flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Estimated food cost</span>
                <span className="text-sm font-medium text-foreground">₹{activeEntry.totalFoodCost}</span>
              </div>
            )}
          </div>

          {/* Wizard navigation */}
          <div className="flex items-center justify-between gap-2">
            <button
              onClick={goPrev}
              disabled={activeIdx === 0}
              className="flex items-center gap-1 rounded-md bg-secondary border border-border px-3 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-40"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> Prev
            </button>
            <button
              onClick={skipDish}
              className="flex items-center gap-1 rounded-md text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-2"
            >
              <SkipForward className="h-3.5 w-3.5" /> Skip — add later
            </button>
            <button
              onClick={goNext}
              disabled={activeIdx === items.length - 1}
              className="flex items-center gap-1 rounded-md bg-foreground text-background px-3 py-2 text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40"
            >
              Next <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default StepIngredientCosts;
