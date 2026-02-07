import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CircularScore from "@/components/shared/CircularScore";

const steps = [
  "Restaurant Profile",
  "Data Source",
  "Menu Import",
  "Ingredient Costs",
  "Prep Time",
  "Baseline Reveal",
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const next = () => {
    if (step < steps.length - 1) setStep(step + 1);
  };
  const back = () => {
    if (step > 0) setStep(step - 1);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-8">
        {/* Step indicator */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Step {step + 1} of {steps.length}
          </p>
          <h1 className="text-xl font-semibold text-foreground mt-2">{steps[step]}</h1>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-secondary rounded-full">
          <div
            className="h-full bg-foreground rounded-full transition-all duration-300"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Step content */}
        <div className="rounded-lg border border-border bg-card p-8 space-y-6">
          {step === 0 && <StepRestaurant />}
          {step === 1 && <StepDataSource />}
          {step === 2 && <StepMenuImport />}
          {step === 3 && <StepIngredientCosts />}
          {step === 4 && <StepPrepTime />}
          {step === 5 && <StepBaseline onComplete={() => navigate("/dashboard")} />}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={back}
            disabled={step === 0}
            className="rounded-md bg-secondary border border-border px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-30"
          >
            Back
          </button>
          {step < steps.length - 1 && (
            <button
              onClick={next}
              className="rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const Field = ({ label, helper, children }: { label: string; helper?: string; children: React.ReactNode }) => (
  <div className="space-y-1.5">
    <label className="text-xs text-muted-foreground">{label}</label>
    {children}
    {helper && <p className="text-xs text-muted-foreground/70 italic">{helper}</p>}
  </div>
);

const inputClass = "w-full rounded-md border border-border bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring";

const StepRestaurant = () => (
  <div className="space-y-4">
    <p className="text-xs text-muted-foreground">Why this matters: We tailor analysis to your restaurant type.</p>
    <Field label="Restaurant Name">
      <input placeholder="e.g., Spice Garden" className={inputClass} />
    </Field>
    <Field label="Outlet Type">
      <select className={inputClass}>
        <option>Single outlet</option>
        <option>Multi-outlet</option>
      </select>
    </Field>
    <Field label="Cuisine (optional)">
      <input placeholder="e.g., North Indian" className={inputClass} />
    </Field>
    <Field label="Location (optional)">
      <input placeholder="e.g., Mumbai" className={inputClass} />
    </Field>
  </div>
);

const StepDataSource = () => (
  <div className="space-y-4">
    <p className="text-xs text-muted-foreground">Why this matters: Connecting your POS gives real-time insights.</p>
    <Field label="POS System">
      <select className={inputClass}>
        <option>Select your POS…</option>
        <option>Petpooja</option>
        <option>POSist</option>
        <option>Torqus</option>
        <option>Other</option>
      </select>
    </Field>
    <div className="text-center py-4 border-t border-border mt-4">
      <p className="text-xs text-muted-foreground">Or upload a CSV file with your sales data</p>
      <button className="mt-2 rounded-md bg-secondary border border-border px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
        Upload CSV
      </button>
    </div>
  </div>
);

const StepMenuImport = () => (
  <div className="space-y-4">
    <p className="text-xs text-muted-foreground">Why this matters: Accurate categories power smart recommendations.</p>
    <div className="rounded-md border border-border p-4 space-y-2">
      {["Starters", "Mains", "Desserts", "Beverages"].map((cat) => (
        <div key={cat} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
          <span className="text-sm text-foreground">{cat}</span>
          <span className="text-xs text-muted-foreground">4 items</span>
        </div>
      ))}
    </div>
    <button className="text-xs text-muted-foreground hover:text-foreground transition-colors">
      + Merge duplicate dishes
    </button>
  </div>
);

const StepIngredientCosts = () => (
  <div className="space-y-4">
    <p className="text-xs text-muted-foreground">Why this matters: Knowing food costs reveals true dish profitability.</p>
    <Field label="Dish">
      <select className={inputClass}>
        <option>Butter Chicken</option>
        <option>Paneer Tikka</option>
        <option>Dal Makhani</option>
      </select>
    </Field>
    <Field label="Key Ingredient">
      <input placeholder="e.g., Chicken breast" className={inputClass} />
    </Field>
    <div className="grid grid-cols-2 gap-3">
      <Field label="Unit Cost (₹)">
        <input type="number" placeholder="120" className={inputClass} />
      </Field>
      <Field label="Portion Qty (g)">
        <input type="number" placeholder="250" className={inputClass} />
      </Field>
    </div>
  </div>
);

const StepPrepTime = () => (
  <div className="space-y-4">
    <p className="text-xs text-muted-foreground">Why this matters: Prep time data helps us identify kitchen stress points.</p>
    <Field label="Dish">
      <select className={inputClass}>
        <option>Butter Chicken</option>
        <option>Paneer Tikka</option>
      </select>
    </Field>
    <Field label="Prep Time (minutes)">
      <input type="range" min={5} max={60} defaultValue={25} className="w-full" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>5 min</span>
        <span>60 min</span>
      </div>
    </Field>
    <Field label="Station">
      <select className={inputClass}>
        <option>Grill</option>
        <option>Tandoor</option>
        <option>Stovetop</option>
        <option>Cold / Assembly</option>
      </select>
    </Field>
    <Field label="Complexity">
      <div className="flex gap-3">
        {["Low", "Medium", "High"].map((c) => (
          <label key={c} className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer">
            <input type="radio" name="complexity" className="accent-foreground" />
            {c}
          </label>
        ))}
      </div>
    </Field>
  </div>
);

const StepBaseline = ({ onComplete }: { onComplete: () => void }) => {
  const [analyzing, setAnalyzing] = useState(true);

  useState(() => {
    const timer = setTimeout(() => setAnalyzing(false), 2500);
    return () => clearTimeout(timer);
  });

  if (analyzing) {
    return (
      <div className="text-center py-8 space-y-4">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted-foreground border-t-foreground mx-auto" />
        <p className="text-sm text-foreground">Analyzing your menu…</p>
        <p className="text-xs text-muted-foreground">Building your baseline health score</p>
      </div>
    );
  }

  return (
    <div className="text-center space-y-6">
      <CircularScore score={74} size={120} label="Baseline Health Score" />
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-muted-foreground">Top Performer</p>
          <p className="text-sm text-foreground font-medium mt-1">Butter Chicken</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Top Performer</p>
          <p className="text-sm text-foreground font-medium mt-1">Paneer Tikka</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Top Performer</p>
          <p className="text-sm text-foreground font-medium mt-1">Gulab Jamun</p>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div>
          <p className="text-xs text-warning">At Risk</p>
          <p className="text-sm text-foreground font-medium mt-1">Garden Salad</p>
        </div>
        <div>
          <p className="text-xs text-warning">At Risk</p>
          <p className="text-sm text-foreground font-medium mt-1">Truffle Risotto</p>
        </div>
        <div>
          <p className="text-xs text-warning">At Risk</p>
          <p className="text-sm text-foreground font-medium mt-1">Mushroom Pasta</p>
        </div>
      </div>
      <button
        onClick={onComplete}
        className="rounded-md bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
      >
        Go to Dashboard →
      </button>
    </div>
  );
};

export default Onboarding;
