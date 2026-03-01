interface KpiCardProps {
  label: string;
  value: string;
  subtitle?: string;
  subtitleColor?: "default" | "opportunity" | "warning";
}

const KpiCard = ({ label, value, subtitle, subtitleColor = "default" }: KpiCardProps) => {
  const colorMap = {
    default: "text-muted-foreground",
    opportunity: "text-opportunity",
    warning: "text-warning",
  };

  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
        {label}
      </span>
      <p className="text-3xl font-semibold text-foreground mt-3 font-[var(--font-display)]">
        {value}
      </p>
      {subtitle && (
        <p className={`text-xs mt-2 ${colorMap[subtitleColor]}`}>{subtitle}</p>
      )}
    </div>
  );
};

export default KpiCard;
