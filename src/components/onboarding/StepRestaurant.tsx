import { OnboardingData } from "./types";

interface Props {
  data: OnboardingData;
  onChange: (updates: Partial<OnboardingData>) => void;
}

const inputClass =
  "w-full rounded-md border border-border bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring transition-colors";

const StepRestaurant = ({ data, onChange }: Props) => (
  <div className="space-y-5">
    <p className="text-xs text-muted-foreground leading-relaxed">
      We tailor every analysis to your restaurant type, size, and cuisine so recommendations feel relevant from day one.
    </p>

    <Field label="Restaurant Name" required>
      <input
        value={data.restaurantName}
        onChange={(e) => onChange({ restaurantName: e.target.value })}
        placeholder="e.g., Spice Garden"
        className={inputClass}
      />
    </Field>

    <Field label="Outlet Type" required>
      <div className="flex gap-3">
        {(["single", "multi"] as const).map((type) => (
          <button
            key={type}
            onClick={() => onChange({ outletType: type })}
            className={`flex-1 rounded-md border px-4 py-2.5 text-sm transition-colors ${
              data.outletType === type
                ? "border-foreground bg-foreground/10 text-foreground"
                : "border-border bg-secondary text-muted-foreground hover:border-muted-foreground"
            }`}
          >
            {type === "single" ? "Single Outlet" : "Multi-Outlet"}
          </button>
        ))}
      </div>
    </Field>

    <Field label="Cuisine" helper="Helps us benchmark against similar restaurants">
      <input
        value={data.cuisine}
        onChange={(e) => onChange({ cuisine: e.target.value })}
        placeholder="e.g., North Indian, Italian, Pan-Asian"
        className={inputClass}
      />
    </Field>

    <Field label="Location">
      <input
        value={data.location}
        onChange={(e) => onChange({ location: e.target.value })}
        placeholder="e.g., Mumbai, Bengaluru"
        className={inputClass}
      />
    </Field>
  </div>
);

const Field = ({
  label,
  helper,
  required,
  children,
}: {
  label: string;
  helper?: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground">
      {label}
      {required && <span className="text-warning ml-0.5">*</span>}
    </label>
    {children}
    {helper && <p className="text-xs text-muted-foreground/60 italic">{helper}</p>}
  </div>
);

export default StepRestaurant;
