import { cn } from "@/lib/utils";

export type DishClassification = "high-profit" | "hidden-loss" | "kitchen-disruptor" | "low-impact-filler";

type BadgeVariant = DishClassification | "opportunity" | "warning" | "neutral" | "info";

interface StatusBadgeProps {
  variant: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  "high-profit": "bg-opportunity/15 text-opportunity border-opportunity/30",
  "hidden-loss": "bg-warning/15 text-warning border-warning/30",
  "kitchen-disruptor": "bg-info/15 text-info border-info/30",
  "low-impact-filler": "bg-secondary text-secondary-foreground border-border",
  opportunity: "bg-opportunity/15 text-opportunity border-opportunity/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  info: "bg-info/15 text-info border-info/30",
  neutral: "bg-secondary text-secondary-foreground border-border",
};

const StatusBadge = ({ variant, children, className }: StatusBadgeProps) => (
  <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", variantStyles[variant], className)}>
    {children}
  </span>
);

export const classificationLabel = (c: DishClassification): string => {
  switch (c) {
    case "high-profit": return "High Profit";
    case "hidden-loss": return "Hidden Loss";
    case "kitchen-disruptor": return "Kitchen Disruptor";
    case "low-impact-filler": return "Low-Impact Filler";
    default: return c;
  }
};

export default StatusBadge;
