import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSalesIngestion } from "@/hooks/useSalesIngestion";
import { Upload, FileText, CheckCircle, AlertCircle, X } from "lucide-react";
import { toast } from "sonner";
import PosSyncSection from "@/components/settings/PosSyncSection";
import CsvUploadSection from "@/components/settings/CsvUploadSection";

const ToggleRow = ({ label, defaultOn }: { label: string; defaultOn: boolean }) => {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <button
        onClick={() => setOn(!on)}
        className={`relative w-10 h-5 rounded-full transition-colors duration-200 ${on ? "bg-foreground" : "bg-secondary"}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-background transition-transform duration-200 ${on ? "translate-x-5" : ""}`}
        />
      </button>
    </div>
  );
};

const SettingsRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className="text-sm font-medium text-foreground">{value}</span>
  </div>
);

const SectionTitle = ({ children }: { children: React.ReactNode }) => (
  <h2 className="text-base font-semibold text-foreground font-[var(--font-display)] pb-3 border-b border-border mb-1">
    {children}
  </h2>
);

const POS_PLATFORMS = [
  { value: "petpooja", label: "Petpooja" },
  { value: "posist", label: "POSist" },
  { value: "torqus", label: "Torqus" },
  { value: "lightspeed", label: "Lightspeed" },
  { value: "square", label: "Square" },
  { value: "toast", label: "Toast POS" },
  { value: "other", label: "Other" },
];

interface UploadedFile {
  file: File;
  platform: string;
  status: "pending" | "uploading" | "success" | "error";
  message?: string;
}

const PIPELINE_STEPS: { key: string; label: string }[] = [
  { key: "uploading", label: "Uploading sales data" },
  { key: "computing-dna", label: "Computing Dish DNA" },
  { key: "computing-intelligence", label: "Building Menu Intelligence" },
  { key: "computing-recommendations", label: "Generating Recommendations" },
];

const DataUploadSection = () => {
  const { uploadCSV, uploading, pipelineStep, pipelineError, resetPipeline } = useSalesIngestion();
  const [selectedPlatform, setSelectedPlatform] = useState("");
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isPipelineRunning = !["idle", "done", "error"].includes(pipelineStep);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!selectedPlatform) {
      toast.error("Please select a POS platform first");
      return;
    }

    const allowedTypes = [
      "text/csv",
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    const allowedExtensions = [".csv", ".pdf", ".xls", ".xlsx"];

    const newFiles: UploadedFile[] = [];

    Array.from(files).forEach((file) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase();
      if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(ext)) {
        toast.error(`${file.name}: Unsupported format. Use CSV, PDF, XLS, or XLSX.`);
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name}: File exceeds 10MB limit.`);
        return;
      }
      newFiles.push({ file, platform: selectedPlatform, status: "pending" });
    });

    setUploadedFiles((prev) => [...prev, ...newFiles]);
  };

  const handleUpload = async (index: number) => {
    const entry = uploadedFiles[index];
    if (!entry || entry.status === "uploading") return;

    setUploadedFiles((prev) =>
      prev.map((f, i) => (i === index ? { ...f, status: "uploading" as const } : f))
    );

    const ext = entry.file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      try {
        await uploadCSV(entry.file);
        setUploadedFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: "success" as const, message: "Imported & analyzed" } : f
          )
        );
      } catch {
        setUploadedFiles((prev) =>
          prev.map((f, i) =>
            i === index ? { ...f, status: "error" as const, message: "Import failed" } : f
          )
        );
      }
    } else {
      setTimeout(() => {
        setUploadedFiles((prev) =>
          prev.map((f, i) =>
            i === index
              ? { ...f, status: "success" as const, message: "File received — processing queued" }
              : f
          )
        );
        toast.success(`${entry.file.name} received from ${entry.platform}`);
      }, 1200);
    }
  };

  const handleUploadAll = async () => {
    for (let i = 0; i < uploadedFiles.length; i++) {
      if (uploadedFiles[i].status === "pending") {
        await handleUpload(i);
      }
    }
  };

  const removeFile = (index: number) => {
    setUploadedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const pendingCount = uploadedFiles.filter((f) => f.status === "pending").length;

  return (
    <div className="space-y-4">
      {/* Pipeline Progress */}
      {(isPipelineRunning || pipelineStep === "done" || pipelineStep === "error") && (
        <div className="rounded-md border border-border bg-secondary/50 p-4 space-y-3">
          <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground font-medium">
            Analysis Pipeline
          </p>
          <div className="space-y-2">
            {PIPELINE_STEPS.map((step, i) => {
              const stepIndex = PIPELINE_STEPS.findIndex((s) => s.key === pipelineStep);
              const thisIndex = i;
              const isActive = step.key === pipelineStep;
              const isDone = pipelineStep === "done" || thisIndex < stepIndex;
              const isError = pipelineStep === "error" && thisIndex === stepIndex;

              return (
                <div key={step.key} className="flex items-center gap-3">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${
                    isDone ? "bg-opportunity" : isActive ? "bg-foreground animate-pulse" : isError ? "bg-warning" : "bg-secondary"
                  }`} />
                  <span className={`text-sm ${
                    isDone ? "text-opportunity" : isActive ? "text-foreground" : isError ? "text-warning" : "text-muted-foreground/50"
                  }`}>
                    {step.label}
                    {isDone && " ✓"}
                    {isActive && "…"}
                    {isError && " ✗"}
                  </span>
                </div>
              );
            })}
          </div>
          {pipelineStep === "done" && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-opportunity font-medium">✓ All analysis complete — dashboard updated</p>
              <button onClick={resetPipeline} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Dismiss
              </button>
            </div>
          )}
          {pipelineStep === "error" && pipelineError && (
            <div className="flex items-center justify-between pt-1">
              <p className="text-xs text-warning">{pipelineError}</p>
              <button onClick={resetPipeline} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* Platform selector */}
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-muted-foreground">POS Platform / Source</label>
        <select
          value={selectedPlatform}
          onChange={(e) => setSelectedPlatform(e.target.value)}
          disabled={isPipelineRunning}
          className="w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors disabled:opacity-50"
        >
          <option value="">Select platform…</option>
          {POS_PLATFORMS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      </div>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!isPipelineRunning) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (!isPipelineRunning) handleFiles(e.dataTransfer.files);
        }}
        onClick={() => !isPipelineRunning && fileInputRef.current?.click()}
        className={`rounded-md border-2 border-dashed p-6 text-center transition-all ${
          isPipelineRunning ? "opacity-50 cursor-not-allowed" :
          dragOver
            ? "border-foreground/40 bg-foreground/5 cursor-pointer"
            : "border-border bg-secondary/30 hover:border-muted-foreground/40 cursor-pointer"
        }`}
      >
        <Upload className="h-7 w-7 mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-foreground">
          Drop files here or <span className="underline">browse</span>
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          CSV, PDF, XLS, XLSX — Max 10MB per file
        </p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv,.pdf,.xls,.xlsx"
          multiple
          onChange={(e) => {
            handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* File list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          {uploadedFiles.map((entry, idx) => {
            const ext = entry.file.name.split(".").pop()?.toUpperCase();
            return (
              <div
                key={idx}
                className="flex items-center gap-3 rounded-md border border-border bg-secondary/50 px-3 py-2.5"
              >
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{entry.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {ext} · {formatSize(entry.file.size)} · {POS_PLATFORMS.find((p) => p.value === entry.platform)?.label}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {entry.status === "pending" && (
                    <span className="text-xs text-muted-foreground">Ready</span>
                  )}
                  {entry.status === "uploading" && (
                    <span className="text-xs text-muted-foreground animate-pulse">Uploading…</span>
                  )}
                  {entry.status === "success" && (
                    <CheckCircle className="h-4 w-4 text-opportunity" />
                  )}
                  {entry.status === "error" && (
                    <AlertCircle className="h-4 w-4 text-warning" />
                  )}
                  {(entry.status === "pending" || entry.status === "error") && (
                    <button onClick={() => removeFile(idx)} className="text-muted-foreground hover:text-foreground transition-colors">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {pendingCount > 0 && !isPipelineRunning && (
            <button
              onClick={handleUploadAll}
              disabled={uploading}
              className="w-full rounded-md border border-foreground/20 bg-foreground/5 px-4 py-2.5 text-sm font-medium text-foreground hover:bg-foreground/10 transition-colors disabled:opacity-50"
            >
              {uploading ? "Uploading…" : `Upload & Analyze ${pendingCount} file${pendingCount > 1 ? "s" : ""}`}
            </button>
          )}
        </div>
      )}

      <p className="text-xs text-muted-foreground/60 italic">
        Supported exports: Petpooja daily sales CSV, POSist transaction report, Square item sales, or any CSV with dish_name, selling_price, and date columns.
      </p>
    </div>
  );
};

const SettingsPage = () => {
  const { user } = useAuth();

  return (
    <div className="max-w-4xl">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column */}
        <div className="space-y-8">
          {/* Restaurant */}
          <div>
            <SectionTitle>Restaurant</SectionTitle>
            <SettingsRow label="Name" value="Spice Route" />
            <SettingsRow label="Plan" value="Pro Monthly" />
          </div>

          {/* POS Sync */}
          <div>
            <SectionTitle>POS Sync</SectionTitle>
            <PosSyncSection />
          </div>


          {/* Account */}
          <div>
            <SectionTitle>Account</SectionTitle>
            <SettingsRow label="Owner" value="Arjun Mehta" />
            <SettingsRow label="Email" value={user?.email || "arjun@spiceroute.in"} />
            <SettingsRow label="Role" value="Owner" />
            <div className="flex gap-3 mt-4">
              <button className="rounded-md border border-border bg-secondary px-5 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
                Change
              </button>
              <button className="rounded-md border border-border bg-secondary px-5 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
                Manage
              </button>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Data Upload */}
          <div>
            <SectionTitle>Data Upload</SectionTitle>
            <DataUploadSection />
          </div>

          {/* Notifications */}
          <div>
            <SectionTitle>Notifications</SectionTitle>
            <ToggleRow label="Email — Weekly Action Plan" defaultOn={true} />
            <ToggleRow label="WhatsApp — Risk Alerts" defaultOn={true} />
          </div>

          {/* Display */}
          <div>
            <SectionTitle>Display</SectionTitle>
            <ToggleRow label="Dark Mode" defaultOn={true} />
          </div>

          {/* Subscription */}
          <div>
            <SectionTitle>Subscription</SectionTitle>
            <SettingsRow label="Current Plan" value="Pro Monthly" />
            <SettingsRow label="Renewal" value="Apr 1, 2026" />
            <SettingsRow label="Price" value="₹2,999/mo" />
            <div className="flex gap-3 mt-4">
              <button className="rounded-md border border-opportunity/40 bg-opportunity/10 px-5 py-2 text-sm font-medium text-opportunity hover:bg-opportunity/20 transition-colors">
                Manage Plan
              </button>
              <button className="rounded-md border border-border bg-secondary px-5 py-2 text-sm font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
                Billing History
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
