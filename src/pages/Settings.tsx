import { useState, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useSalesIngestion } from "@/hooks/useSalesIngestion";
import { Upload, CheckCircle, AlertTriangle, Loader2 } from "lucide-react";

const SettingsPage = () => {
  const { user } = useAuth();
  const [restaurantName, setRestaurantName] = useState("Spice Garden");
  const { uploadCSV, uploading, result } = useSalesIngestion();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      return;
    }
    uploadCSV(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your restaurant and account</p>
      </div>

      {/* Restaurant Profile */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-medium text-foreground">Restaurant Profile</h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Restaurant Name</label>
            <input
              value={restaurantName}
              onChange={(e) => setRestaurantName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">POS System</label>
            <p className="text-sm text-foreground mt-1">Not connected</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Last Sync</label>
            <p className="text-sm text-foreground mt-1">—</p>
          </div>
          <button className="rounded-md bg-secondary border border-border px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
            Sync Now
          </button>
        </div>
      </div>

      {/* Data Sources */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-medium text-foreground">Data Sources</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">POS Connection</p>
            <p className="text-xs text-muted-foreground">Read-only sync from your POS system</p>
          </div>
          <button className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Connect POS
          </button>
        </div>
        <div className="border-t border-border pt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-foreground">CSV Upload</p>
              <p className="text-xs text-muted-foreground">
                Upload sales data as CSV (columns: dish_name, quantity_sold, selling_price, order_timestamp, order_type)
              </p>
            </div>
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-md bg-secondary border border-border px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-40 flex items-center gap-2"
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? "Uploading…" : "Upload CSV"}
              </button>
            </div>
          </div>
          {result && (
            <div className={`rounded-md border p-3 text-xs space-y-1 ${result.skipped > 0 ? "border-warning/30 bg-warning/5" : "border-opportunity/30 bg-opportunity/5"}`}>
              <div className="flex items-center gap-1.5">
                {result.skipped > 0 ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                ) : (
                  <CheckCircle className="h-3.5 w-3.5 text-opportunity" />
                )}
                <span className="text-foreground font-medium">
                  {result.imported} of {result.total} records imported
                </span>
              </div>
              {result.errors.length > 0 && (
                <ul className="text-muted-foreground pl-5 list-disc">
                  {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                </ul>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-medium text-foreground">Notifications</h2>
        {[
          { label: "Email — Weekly Action Plan", defaultOn: true },
          { label: "Email — Critical Alerts", defaultOn: true },
          { label: "WhatsApp — Weekly Plan", defaultOn: false },
          { label: "WhatsApp — Critical Alerts", defaultOn: false },
        ].map((n) => (
          <ToggleRow key={n.label} label={n.label} defaultOn={n.defaultOn} />
        ))}
      </div>

      {/* Account */}
      <div className="rounded-lg border border-border bg-card p-6 space-y-4">
        <h2 className="text-sm font-medium text-foreground">Account</h2>
        <p className="text-xs text-muted-foreground">Signed in as {user?.email}</p>
        <div className="flex gap-3">
          <button className="rounded-md bg-secondary border border-border px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
            Change Password
          </button>
          <button className="rounded-md bg-secondary border border-border px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
};

const ToggleRow = ({ label, defaultOn }: { label: string; defaultOn: boolean }) => {
  const [on, setOn] = useState(defaultOn);
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-foreground">{label}</span>
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

export default SettingsPage;
