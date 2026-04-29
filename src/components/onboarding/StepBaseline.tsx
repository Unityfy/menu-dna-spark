import { useState, useEffect } from "react";
import CircularScore from "@/components/shared/CircularScore";

interface Props {
  onComplete: () => void;
}

const PROGRESS_MESSAGES = [
  "Analyzing your menu…",
  "Calculating profitability…",
  "Detecting patterns…",
  "Generating insights…",
];

const StepBaseline = ({ onComplete }: Props) => {
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

  return (
    <div className="text-center space-y-6 animate-in fade-in duration-500">
      <div>
        <p className="text-xs text-opportunity font-medium uppercase tracking-wider mb-3">Analysis Complete</p>
        <CircularScore score={74} size={140} label="Menu Health Score" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <MetricCard label="Avg Margin" value="62%" />
        <MetricCard label="Menu Items" value="8" />
        <MetricCard label="Stress Score" value="32" />
      </div>

      <div className="space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Top Performers</p>
        <div className="grid grid-cols-3 gap-3">
          {["Butter Chicken", "Paneer Tikka", "Gulab Jamun"].map((name) => (
            <div key={name} className="rounded-md border border-opportunity/20 bg-opportunity/5 p-3">
              <p className="text-sm text-foreground font-medium">{name}</p>
              <p className="text-xs text-opportunity mt-0.5">High profit</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Needs Attention</p>
        <div className="grid grid-cols-3 gap-3">
          {["Garden Salad", "Truffle Risotto", "Mushroom Pasta"].map((name) => (
            <div key={name} className="rounded-md border border-warning/20 bg-warning/5 p-3">
              <p className="text-sm text-foreground font-medium">{name}</p>
              <p className="text-xs text-warning mt-0.5">At risk</p>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={onComplete}
        className="rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Go to Dashboard →
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
