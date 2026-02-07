import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

const SettingsPage = () => {
  const { user } = useAuth();
  const [restaurantName, setRestaurantName] = useState("Spice Garden");

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
            <p className="text-xs text-muted-foreground">Not connected</p>
          </div>
          <button className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            Connect POS
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">CSV Upload</p>
            <p className="text-xs text-muted-foreground">Upload sales data manually</p>
          </div>
          <button className="rounded-md bg-secondary border border-border px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
            Upload CSV
          </button>
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
