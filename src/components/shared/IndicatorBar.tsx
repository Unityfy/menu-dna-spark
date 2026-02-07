import { cn } from "@/lib/utils";

interface IndicatorBarProps {
  value: number;
  max?: number;
  color?: "foreground" | "warning" | "opportunity" | "info";
  label?: string;
  showValue?: boolean;
}

const IndicatorBar = ({ value, max = 100, color = "foreground", label, showValue = true }: IndicatorBarProps) => {
  const percentage = Math.min((value / max) * 100, 100);
  const colorMap = {
    foreground: "bg-foreground",
    warning: "bg-warning",
    opportunity: "bg-opportunity",
    info: "bg-info",
  };

  return (
    <div className="space-y-1.5">
      {(label || showValue) && (
        <div className="flex items-center justify-between">
          {label && <span className="text-xs text-muted-foreground">{label}</span>}
          {showValue && <span className="text-xs font-medium text-foreground">{value}%</span>}
        </div>
      )}
      <div className="h-1.5 w-full rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all duration-500 ease-out", colorMap[color])}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

export default IndicatorBar;
