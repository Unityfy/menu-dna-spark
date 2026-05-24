import { useState, useEffect } from "react";
import CircularScore from "@/components/shared/CircularScore";
import type { OnboardingData } from "./types";

interface Props {
  data: OnboardingData;
  saving: boolean;
  onComplete: () => void;
}

const PROGRESS_MESSAGES = [
  "Analyzing your menu…",
  "Calculating profitability…",
  "Detecting patterns…",
  "Generating insights…",
];

const StepBaseline = ({ data, saving, onComplete }: Props) => {
  const [phase, setPhase] = useState<"analyzing" | "done">("analyzing");
  const [msgIndex, setMsgIndex] = useState(0);

  useEffect(() => {
    if (phase !== "analyzing") return;

    const msgTimer = setInterval(() => {
      setMsgIndex((prev) => {
        if (prev >= PROGRESS_MESSAGES.length - 1) {
          clearInterval(msgTimer);
          setTimeout(() => setPhase("done"), 800);
          return prev;
        }
        return prev + 1;
      });
    }, 900);

    return () => clearInterval(msgTimer);
  }, [phase]);

  if (phase === "analyzing") {
    return (
      <div className="text-center py-12 space-y-6">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground mx-auto" />
        <div className="space-y-3">
          <p className="text-sm text-foreground font-medium transition-opacity duration-300">
            {PROGRESS_MESSAGES[msgIndex]}
          </p>
          <div className="h-1 w-48 mx-auto bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-500"
              style={{ width: `${((msgIndex + 1) / PROGRESS_MESSAGES.length) * 100}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground/60 uppercase tracking-wider">
            This usually takes a few seconds
          </p>
        </div>
      </div>
    );
  }

  // Compute summary from onboarding data
  const validItems = data.menuItems.filter(item => !item.isDuplicate && item.name.trim());
  const itemCount = validItems.length;

  // Calculate average margin from cost data
  const itemsWithCosts = validItems.map(item => {
    const costEntry = data.ingredientCosts.find(c => c.dishId === item.id);
    const cost = costEntry?.totalFoodCost || Math.round(item.sellingPrice * 0.35);
    const margin = item.sellingPrice > 0 ? ((item.sellingPrice - cost) / item.sellingPrice) * 100 : 0;
    return { ...item, cost, margin };
  });

  const avgMargin = itemsWithCosts.length > 0
    ? Math.round(itemsWithCosts.reduce((s, i) => s + i.margin, 0) / itemsWithCosts.length)
    : 0;

  // Top performers (highest margin items)
  const sortedByMargin = [...itemsWithCosts].sort((a, b) => b.margin - a.margin);
  const topPerformers = sortedByMargin.slice(0, 3).map(i => i.name);

  // Needs attention (lowest margin items)
  const needsAttention = sortedByMargin.slice(-3).reverse().map(i => i.name);

  // Estimated health score (simplified: margin weight + balance)
  const healthScore = Math.min(100, Math.round(avgMargin * 0.8 + Math.min(itemCount, 20) * 1.5));

  return (
    <div className="text-center space-y-6 animate-in fade-in duration-500">
      <div>
        <p className="text-xs text-opportunity font-medium uppercase tracking-wider mb-3">Analysis Complete</p>
        <CircularScore score={healthScore} size={140} label="Menu Health Score" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Avg Margin" value={`${avgMargin}%`} />
        <MetricCard label="Menu Items" value={String(itemCount)} />
        <MetricCard label="Categories" value={String(new Set(validItems.map(i => i.category)).size)} />
      </div>

      {topPerformers.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Top Performers</p>
          <div className="grid grid-cols-3 gap-3">
            {topPerformers.map((name) => (
              <div key={name} className="rounded-md border border-opportunity/20 bg-opportunity/5 p-3">
                <p className="text-sm text-foreground font-medium truncate">{name}</p>
                <p className="text-xs text-opportunity mt-0.5">High profit</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {needsAttention.length > 0 && needsAttention[0] !== topPerformers[0] && (
        <div className="space-y-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Needs Attention</p>
          <div className="grid grid-cols-3 gap-3">
            {needsAttention.map((name) => (
              <div key={name} className="rounded-md border border-warning/20 bg-warning/5 p-3">
                <p className="text-sm text-foreground font-medium truncate">{name}</p>
                <p className="text-xs text-warning mt-0.5">Review costs</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onComplete}
        disabled={saving}
        className="rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save & Go to Dashboard →"}
      </button>
    </div>
  );
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-md border border-border bg-secondary/50 p-3">
    <p className="text-lg font-semibold text-foreground">{value}</p>
    <p className="text-xs text-muted-foreground">{label}</p>
  </div>
);

export default StepBaseline;
