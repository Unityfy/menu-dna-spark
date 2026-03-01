import { useNavigate } from "react-router-dom";

interface PerformerData {
  id: string;
  name: string;
  category: string;
  score: number;
  unitsSold: number;
}

interface TopPerformersProps {
  performers: PerformerData[];
}

const TopPerformers = ({ performers }: TopPerformersProps) => {
  const navigate = useNavigate();

  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <h3 className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium mb-5">
        Top Performers
      </h3>
      <div className="space-y-0">
        {performers.map((p, i) => (
          <button
            key={p.id}
            onClick={() => navigate(`/dish/${p.id}`)}
            className="flex items-center gap-4 w-full py-3.5 border-b border-border/50 last:border-0 text-left hover:bg-secondary/30 -mx-2 px-2 rounded transition-colors"
          >
            <span className="text-xs text-muted-foreground w-6 font-medium">
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.category}</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-foreground">{p.score}%</p>
              <p className="text-xs text-muted-foreground">{p.unitsSold} sold</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default TopPerformers;
