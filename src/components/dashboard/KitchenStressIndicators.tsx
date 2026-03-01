import { useNavigate } from "react-router-dom";

interface StressItem {
  id: string;
  name: string;
  stressScore: number;
}

interface KitchenStressIndicatorsProps {
  items: StressItem[];
}

const KitchenStressIndicators = ({ items }: KitchenStressIndicatorsProps) => {
  const navigate = useNavigate();

  const criticalCount = items.filter((i) => i.stressScore >= 80).length;
  const highCount = items.filter((i) => i.stressScore >= 60 && i.stressScore < 80).length;
  const moderateCount = items.filter((i) => i.stressScore >= 40 && i.stressScore < 60).length;

  const summaryParts: string[] = [];
  if (criticalCount > 0) summaryParts.push(`${criticalCount} critical`);
  if (highCount > 0) summaryParts.push(`${highCount} high`);
  if (moderateCount > 0) summaryParts.push(`${moderateCount} moderate`);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-5">
        Kitchen Stress Indicators
      </h3>
      <div className="space-y-4">
        {items.map((item) => {
          const barColor =
            item.stressScore >= 80
              ? "bg-warning"
              : item.stressScore >= 60
              ? "bg-warning/70"
              : item.stressScore >= 40
              ? "bg-info"
              : "bg-opportunity";
          return (
            <button
              key={item.id}
              onClick={() => navigate(`/dish/${item.id}`)}
              className="w-full text-left hover:opacity-80 transition-opacity"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-foreground">{item.name}</span>
                <span className="text-sm font-medium text-foreground">{item.stressScore}%</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                  style={{ width: `${item.stressScore}%` }}
                />
              </div>
            </button>
          );
        })}
      </div>
      {summaryParts.length > 0 && (
        <p className="text-xs text-warning mt-5">{summaryParts.join(" · ")}</p>
      )}
    </div>
  );
};

export default KitchenStressIndicators;
