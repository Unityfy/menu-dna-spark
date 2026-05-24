import { useRef, useState } from "react";
import { Upload, Plug, Check, Loader2, FileText, AlertCircle, ExternalLink } from "lucide-react";
import { OnboardingData, POS_SYSTEMS } from "./types";
import { useSalesIngestion } from "@/hooks/useSalesIngestion";
import { toast } from "sonner";

interface Props {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}

const inputClass =
  "w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

const downloadCsvTemplate = () => {
  const headers = ["dish_name", "dish_id", "quantity_sold", "selling_price", "order_timestamp", "order_type"];
  const sample = [
    ["Margherita Pizza", "PZ001", "2", "12.50", "2026-01-15T19:30:00", "dine_in"],
    ["Caesar Salad", "SL002", "1", "8.00", "2026-01-15T19:32:00", "takeaway"],
  ];
  const csv = [headers.join(","), ...sample.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "menu-dna-sales-template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const StepDataSource = ({ data, onChange }: Props) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { uploadCSV, uploading } = useSalesIngestion();

  const handleFile = (file: File | null | undefined) => {
    if (!file) return;
    const isCsv = /\.(csv|xlsx)$/i.test(file.name);
    if (!isCsv) {
      toast.error("Please upload a .csv or .xlsx file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File exceeds 10MB limit");
      return;
    }
    setSelectedFile(file);
    uploadCSV(file);
  };

  const openPicker = () => fileInputRef.current?.click();

  return (
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
          <div className="space-y-3">
            {/* Connection instructions per POS */}
            <div className="rounded-md border border-border bg-secondary/50 p-4 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                <Plug className="h-4 w-4" />
                How to connect {POS_SYSTEMS.find(p => p.value === data.posSystem)?.label || "your POS"}
              </div>

              {data.posSystem === "petpooja" && (
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><span className="font-medium text-foreground">Step 1:</span> Log into your Petpooja dashboard</p>
                  <p><span className="font-medium text-foreground">Step 2:</span> Go to Settings → Third Party Integration → API Access</p>
                  <p><span className="font-medium text-foreground">Step 3:</span> Copy your API Token and Restaurant ID</p>
                  <p><span className="font-medium text-foreground">Step 4:</span> Paste them below</p>
                </div>
              )}
              {data.posSystem === "posist" && (
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><span className="font-medium text-foreground">Step 1:</span> Log into POSist Back Office</p>
                  <p><span className="font-medium text-foreground">Step 2:</span> Go to Settings → Integrations → API Keys</p>
                  <p><span className="font-medium text-foreground">Step 3:</span> Generate a read-only API key</p>
                  <p><span className="font-medium text-foreground">Step 4:</span> Paste it below</p>
                </div>
              )}
              {!["petpooja", "posist"].includes(data.posSystem) && (
                <div className="text-xs text-muted-foreground space-y-2">
                  <p><span className="font-medium text-foreground">Step 1:</span> Find API settings in your POS admin panel</p>
                  <p><span className="font-medium text-foreground">Step 2:</span> Generate a read-only API key or token</p>
                  <p><span className="font-medium text-foreground">Step 3:</span> Paste it below</p>
                </div>
              )}
            </div>

            {/* API credentials input */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  API Key / Token
                </label>
                <input
                  type="password"
                  placeholder="Paste your API key here…"
                  className={inputClass}
                  onChange={(e) => onChange({ posSystem: data.posSystem })}
                />
              </div>
              {data.posSystem === "petpooja" && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    Restaurant ID
                  </label>
                  <input
                    type="text"
                    placeholder="e.g., 12345"
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            {/* Security notice */}
            <div className="rounded-md border border-opportunity/30 bg-opportunity/5 p-3 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-medium text-opportunity">
                <Check className="h-3.5 w-3.5" />
                Read-only access only
              </div>
              <p className="text-[11px] text-muted-foreground">
                Menu DNA only reads sales and menu data. We never modify orders, prices, or any POS settings.
                Your credentials are encrypted and stored securely.
              </p>
            </div>

            {/* Alternative: skip for now */}
            <p className="text-xs text-muted-foreground/60 italic text-center">
              Don't have your API key handy?{" "}
              <button
                type="button"
                onClick={() => onChange({ dataSource: "csv" })}
                className="underline hover:text-foreground transition-colors"
              >
                Upload a CSV instead
              </button>{" "}
              — you can connect your POS later from Settings.
            </p>
          </div>
        )}
      </div>
    )}

    {data.dataSource === "csv" && (
      <div className="space-y-4 pt-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
        <div
          role="button"
          tabIndex={0}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              openPicker();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFile(e.dataTransfer.files?.[0]);
          }}
          className={`cursor-pointer rounded-md border border-dashed p-6 text-center space-y-3 transition-colors focus:outline-none focus:ring-1 focus:ring-ring ${
            dragOver
              ? "border-foreground bg-foreground/5"
              : "border-border bg-secondary/30 hover:border-muted-foreground hover:bg-secondary/50"
          }`}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 mx-auto text-muted-foreground animate-spin" />
          ) : selectedFile ? (
            <FileText className="h-8 w-8 mx-auto text-foreground" />
          ) : (
            <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
          )}
          <div>
            <p className="text-sm text-foreground">
              {uploading
                ? "Uploading…"
                : selectedFile
                ? selectedFile.name
                : "Drop your CSV file here or click to browse"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Accepted: .csv, .xlsx — Max 10MB
            </p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openPicker();
            }}
            disabled={uploading}
            className="rounded-md bg-secondary border border-border px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-40"
          >
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
};

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
