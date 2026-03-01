import CircularScore from "@/components/shared/CircularScore";

interface WeekData {
  label: string;
  score: number;
}

interface MenuHealthTrendProps {
  currentScore: number;
  weeks: WeekData[];
}

const MenuHealthTrend = ({ currentScore, weeks }: MenuHealthTrendProps) => {
  const maxScore = Math.max(...weeks.map((w) => w.score), 100);

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-6">
        Menu Health Trend
      </h3>
      <div className="flex items-center gap-8">
        <div className="flex flex-col items-center gap-1">
          <CircularScore score={currentScore} size={100} />
          <span className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground mt-1">
            Score
          </span>
        </div>

        <div className="flex-1">
          <p className="text-sm text-foreground mb-3">
            {weeks.length}-week progression
          </p>
          <div className="flex items-end gap-1.5 h-16">
            {weeks.map((week, i) => {
              const height = (week.score / maxScore) * 100;
              const isLast = i === weeks.length - 1;
              return (
                <div key={week.label} className="flex flex-col items-center gap-1 flex-1">
                  <div
                    className={`w-full rounded-sm transition-all duration-300 ${
                      isLast ? "bg-opportunity" : "bg-secondary"
                    }`}
                    style={{ height: `${height}%`, minHeight: 4 }}
                  />
                  <span className="text-[9px] text-muted-foreground">{week.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MenuHealthTrend;
