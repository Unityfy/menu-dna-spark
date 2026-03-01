interface CategoryData {
  name: string;
  score: number;
}

interface CategoryPerformanceProps {
  categories: CategoryData[];
}

const CategoryPerformance = ({ categories }: CategoryPerformanceProps) => {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-5">
        Category Performance
      </h3>
      <div className="space-y-0">
        {/* Header */}
        <div className="grid grid-cols-[1fr_120px_48px] items-center pb-3 border-b border-border">
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">Category</span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground text-center">Margin Health</span>
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground text-right">Score</span>
        </div>
        {categories.map((cat) => {
          const barColor =
            cat.score >= 75 ? "bg-opportunity" : cat.score >= 60 ? "bg-info" : "bg-warning";
          return (
            <div
              key={cat.name}
              className="grid grid-cols-[1fr_120px_48px] items-center py-3 border-b border-border/50 last:border-0"
            >
              <span className="text-sm text-foreground font-medium">{cat.name}</span>
              <div className="flex items-center justify-center">
                <div className="h-1.5 w-20 rounded-full bg-secondary overflow-hidden">
                  <div
                    className={`h-full rounded-full ${barColor}`}
                    style={{ width: `${cat.score}%` }}
                  />
                </div>
              </div>
              <span className="text-sm text-foreground text-right font-medium">{cat.score}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryPerformance;
