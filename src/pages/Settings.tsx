import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

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
            <SettingsRow label="POS System" value="Petpooja" />
            <SettingsRow label="POS Status" value="Connected ✓" />
            <SettingsRow label="Last Sync" value="3 hours ago" />
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
