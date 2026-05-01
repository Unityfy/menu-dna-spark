import { Upload, Plug, Check } from "lucide-react";
import { OnboardingData, POS_SYSTEMS } from "./types";

interface Props {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}

const inputClass =
  "w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

const StepDataSource = ({ data, onChange }: Props) => (
  <div className="space-y-5">
    <p className="text-xs text-muted-foreground leading-relaxed">
      Menu DNA reads your sales data in read-only mode — we never modify your POS. Choose how you'd like to share data.
    </p>

    <div className="grid grid-cols-2 gap-3">
      <SourceCard
        icon={<Plug className="h-5 w-5" />}
        title="Connect POS"
        description="Real-time sync, automatic updates"
        selected={data.dataSource === "pos"}
        onClick={() => onChange({ dataSource: "pos" })}
      />
      <SourceCard
        icon={<Upload className="h-5 w-5" />}
        title="Upload CSV"
        description="Manual upload, flexible format"
        selected={data.dataSource === "csv"}
        onClick={() => onChange({ dataSource: "csv" })}
      />
    </div>

    {data.dataSource === "pos" && (
      <div className="space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-muted-foreground">Select your POS system</label>
          <select
            value={data.posSystem}
            onChange={(e) => onChange({ posSystem: e.target.value })}
            className={inputClass}
          >
            <option value="">Choose POS…</option>
            {POS_SYSTEMS.map((pos) => (
              <option key={pos.value} value={pos.value}>{pos.label}</option>
            ))}
          </select>
        </div>
        {data.posSystem && (
          <div className="rounded-md border border-border bg-secondary/50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm text-foreground">
              <Check className="h-4 w-4 text-opportunity" />
              Read-only access confirmed
            </div>
            <p className="text-xs text-muted-foreground">
              We'll request view-only permissions to your menu and sales data. No changes will be made to your POS.
            </p>
          </div>
        )}
      </div>
    )}

    {data.dataSource === "csv" && (
      <div className="space-y-4 pt-2">
        <div className="rounded-md border border-dashed border-border bg-secondary/30 p-6 text-center space-y-3">
          <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
          <div>
            <p className="text-sm text-foreground">Drop your CSV file here</p>
            <p className="text-xs text-muted-foreground mt-1">
              Accepted: .csv, .xlsx — Max 10MB
            </p>
          </div>
          <button className="rounded-md bg-secondary border border-border px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
            Browse Files
          </button>
        </div>
        <p className="text-xs text-muted-foreground/60 italic">
          Need a template?{" "}
          <button
            type="button"
            onClick={downloadCsvTemplate}
            className="underline hover:text-foreground transition-colors"
          >
            Download CSV template
          </button>
        </p>
      </div>
    )}
  </div>
);

const SourceCard = ({
  icon,
  title,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`rounded-md border p-4 text-left transition-all ${
      selected
        ? "border-foreground bg-foreground/5"
        : "border-border bg-secondary hover:border-muted-foreground"
    }`}
  >
    <div className={`mb-2 ${selected ? "text-foreground" : "text-muted-foreground"}`}>{icon}</div>
    <p className={`text-sm font-medium ${selected ? "text-foreground" : "text-secondary-foreground"}`}>{title}</p>
    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
  </button>
);

export default StepDataSource;
