import { useState } from "react";
import { useNavigate } from "react-router-dom";
import StepRestaurant from "@/components/onboarding/StepRestaurant";
import StepDataSource from "@/components/onboarding/StepDataSource";
import StepMenuImport from "@/components/onboarding/StepMenuImport";
import StepIngredientCosts from "@/components/onboarding/StepIngredientCosts";
import StepPrepTime from "@/components/onboarding/StepPrepTime";
import StepValidation from "@/components/onboarding/StepValidation";
import StepBaseline from "@/components/onboarding/StepBaseline";
import { OnboardingData, INITIAL_ONBOARDING_DATA } from "@/components/onboarding/types";

const STEPS = [
  { key: "restaurant", title: "Restaurant Profile", subtitle: "Tell us about your restaurant" },
  { key: "datasource", title: "Data Source", subtitle: "Connect your sales data" },
  { key: "menu", title: "Menu Import", subtitle: "Review and normalize your menu" },
  { key: "costs", title: "Ingredient Costs", subtitle: "Enter food costs per dish" },
  { key: "prep", title: "Prep Time", subtitle: "Set prep time and stations" },
  { key: "validate", title: "Validate & Normalize", subtitle: "Review all inputs" },
  { key: "baseline", title: "Baseline Report", subtitle: "Your menu health snapshot" },
];

const Onboarding = () => {
  const [step, setStep] = useState(0);
  const [data, setData] = useState<OnboardingData>(INITIAL_ONBOARDING_DATA);
  const navigate = useNavigate();

  const update = (updates: Partial<OnboardingData>) => setData((prev) => ({ ...prev, ...updates }));
  const next = () => step < STEPS.length - 1 && setStep(step + 1);
  const back = () => step > 0 && setStep(step - 1);
  const goTo = (s: number) => setStep(s);

  const canContinue = () => {
    switch (step) {
      case 0: return !!data.restaurantName;
      case 1: return !!data.dataSource;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-lg space-y-6">
        {/* Step indicator */}
        <div className="text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">
            Step {step + 1} of {STEPS.length}
          </p>
          <h1 className="text-xl font-semibold text-foreground mt-1">{STEPS[step].title}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{STEPS[step].subtitle}</p>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => i < step && goTo(i)}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === step ? "w-6 bg-foreground" : i < step ? "w-1.5 bg-foreground/50 cursor-pointer" : "w-1.5 bg-secondary"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="rounded-lg border border-border bg-card p-6 sm:p-8">
          {step === 0 && <StepRestaurant data={data} onChange={update} />}
          {step === 1 && <StepDataSource data={data} onChange={update} />}
          {step === 2 && <StepMenuImport data={data} onChange={update} />}
          {step === 3 && <StepIngredientCosts data={data} onChange={update} />}
          {step === 4 && <StepPrepTime data={data} onChange={update} />}
          {step === 5 && <StepValidation data={data} onFix={goTo} />}
          {step === 6 && <StepBaseline onComplete={() => navigate("/dashboard")} />}
        </div>

        {/* Navigation */}
        {step < STEPS.length - 1 && (
          <div className="flex justify-between">
            <button
              onClick={back}
              disabled={step === 0}
              className="rounded-md bg-secondary border border-border px-5 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors disabled:opacity-30"
            >
              Back
            </button>
            <button
              onClick={next}
              disabled={!canContinue()}
              className="rounded-md bg-primary px-5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
