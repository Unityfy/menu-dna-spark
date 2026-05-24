import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const STORAGE_KEY = "menu-dna-onboarding-progress";
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
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const [data, setData] = useState<OnboardingData>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...INITIAL_ONBOARDING_DATA, ...parsed.data };
      }
    } catch {}
    return INITIAL_ONBOARDING_DATA;
  });
  const navigate = useNavigate();

  // Save all onboarding data to Supabase
  const saveToSupabase = async (): Promise<boolean> => {
    if (!user) return false;
    setSaving(true);
    try {
      // 1. Create or update restaurant
      const { data: existingRestaurantId } = await supabase.rpc("get_user_restaurant_id", { _user_id: user.id });

      let restaurantId = existingRestaurantId;

      if (!restaurantId) {
        // Create new restaurant
        const { data: newRestaurant, error: restErr } = await supabase
          .from("restaurants")
          .insert({
            name: data.restaurantName,
            cuisine_type: data.cuisine,
            location: data.location,
            outlet_type: data.outletType,
            pos_provider: data.dataSource === "pos" ? data.posSystem : null,
            owner_id: user.id,
          })
          .select("id")
          .single();
        if (restErr) throw restErr;
        restaurantId = newRestaurant.id;
      } else {
        // Update existing restaurant
        await supabase
          .from("restaurants")
          .update({
            name: data.restaurantName,
            cuisine_type: data.cuisine,
            location: data.location,
            outlet_type: data.outletType,
            pos_provider: data.dataSource === "pos" ? data.posSystem : null,
          })
          .eq("id", restaurantId);
      }

      // 2. Insert menu items (skip duplicates by name)
      if (data.menuItems.length > 0) {
        const validItems = data.menuItems.filter(item => !item.isDuplicate && item.name.trim());

        // Get existing items to avoid duplicates
        const { data: existing } = await supabase
          .from("menu_items")
          .select("name")
          .eq("restaurant_id", restaurantId);
        const existingNames = new Set((existing || []).map((e: any) => e.name.toLowerCase()));

        const newItems = validItems
          .filter(item => !existingNames.has(item.name.toLowerCase()))
          .map(item => {
            // Find matching cost and prep data
            const costEntry = data.ingredientCosts.find(c => c.dishId === item.id);
            const prepEntry = data.prepTimes.find(p => p.dishId === item.id);

            return {
              restaurant_id: restaurantId,
              name: item.name,
              category: item.category,
              selling_price: item.sellingPrice,
              food_cost: costEntry?.totalFoodCost || Math.round(item.sellingPrice * 0.35),
              prep_time_minutes: prepEntry?.prepTime || costEntry?.estimatedPrepMinutes || 0,
              station: prepEntry?.station || "Stovetop",
              complexity: prepEntry?.complexity || costEntry?.complexity || "medium",
              is_active: true,
            };
          });

        if (newItems.length > 0) {
          const { error: insertErr } = await supabase.from("menu_items").insert(newItems);
          if (insertErr) throw insertErr;
        }
      }

      // 3. Clear localStorage progress
      localStorage.removeItem(STORAGE_KEY);

      toast.success("Restaurant setup saved successfully!");
      return true;
    } catch (err) {
      console.error("Onboarding save error:", err);
      toast.error("Failed to save — please try again");
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Auto-save progress
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, step }));
    } catch {}
  }, [data, step]);

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
          {step === 6 && (
            <StepBaseline
              data={data}
              saving={saving}
              onComplete={async () => {
                const success = await saveToSupabase();
                if (success) navigate("/dashboard");
              }}
            />
          )}
        </div>

        {/* Auto-save hint */}
        <p className="text-center text-[10px] text-muted-foreground/60">Progress saved automatically</p>

        {/* Navigation */}
        {step < STEPS.length - 1 && (
          <div className={`flex ${step === 0 ? "justify-end" : "justify-between"}`}>
            {step > 0 && (
              <button
                onClick={back}
                className="rounded-md bg-secondary border border-border px-5 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              disabled={!canContinue()}
              className="rounded-md bg-primary px-5 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
