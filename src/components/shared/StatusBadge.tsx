import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  variant: "star" | "puzzle" | "plow_horse" | "dog" | "warning" | "opportunity" | "info" | "neutral";
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<StatusBadgeProps["variant"], string> = {
  star: "bg-opportunity/15 text-opportunity border-opportunity/30",
  puzzle: "bg-info/15 text-info border-info/30",
  plow_horse: "bg-foreground/10 text-foreground border-foreground/20",
  dog: "bg-warning/15 text-warning border-warning/30",
  warning: "bg-warning/15 text-warning border-warning/30",
  opportunity: "bg-opportunity/15 text-opportunity border-opportunity/30",
  info: "bg-info/15 text-info border-info/30",
  neutral: "bg-secondary text-secondary-foreground border-border",
};

const StatusBadge = ({ variant, children, className }: StatusBadgeProps) => (
  <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", variantStyles[variant], className)}>
    {children}
  </span>
);

export const classificationLabel = (c: string) => {
  const map: Record<string, string> = {
    star: "Star",
    puzzle: "Puzzle",
    plow_horse: "Plow Horse",
    dog: "Dog",
  };
  return map[c] ?? c;
};

export default StatusBadge;
