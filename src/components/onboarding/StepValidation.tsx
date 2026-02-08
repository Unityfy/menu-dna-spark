import { CheckCircle, AlertCircle, Circle } from "lucide-react";
import { OnboardingData, MOCK_MENU_ITEMS } from "./types";

interface Props {
  data: OnboardingData;
  onFix: (step: number) => void;
}

interface ValidationItem {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  fixStep?: number;
}

const StepValidation = ({ data, onFix }: Props) => {
  const items = data.menuItems.length > 0 ? data.menuItems : MOCK_MENU_ITEMS.filter((i) => !i.isDuplicate);
  const duplicates = (data.menuItems.length > 0 ? data.menuItems : MOCK_MENU_ITEMS).filter((i) => i.isDuplicate);

  const checks: ValidationItem[] = [
    {
      label: "Restaurant profile",
      status: data.restaurantName ? "pass" : "fail",
      detail: data.restaurantName ? `${data.restaurantName} — ${data.outletType} outlet` : "Restaurant name is required",
      fixStep: 0,
    },
    {
      label: "Data source",
      status: data.dataSource ? "pass" : "fail",
      detail: data.dataSource === "pos" ? `POS: ${data.posSystem || "not selected"}` : data.dataSource === "csv" ? "CSV upload" : "No data source selected",
      fixStep: 1,
    },
    {
      label: "Menu items",
      status: items.length > 0 ? (duplicates.length > 0 ? "warn" : "pass") : "fail",
      detail: `${items.length} items imported${duplicates.length > 0 ? `, ${duplicates.length} unresolved duplicate(s)` : ""}`,
      fixStep: 2,
    },
    {
      label: "Ingredient costs",
      status: data.ingredientCosts.filter((c) => c.ingredients.some((i) => i.name)).length === items.length
        ? "pass"
        : data.ingredientCosts.length > 0
        ? "warn"
        : "fail",
      detail: `${data.ingredientCosts.filter((c) => c.ingredients.some((i) => i.name)).length}/${items.length} dishes costed`,
      fixStep: 3,
    },
    {
      label: "Prep times",
      status: data.prepTimes.length === items.length
        ? "pass"
        : data.prepTimes.length > 0
        ? "warn"
        : "fail",
      detail: `${data.prepTimes.length}/${items.length} dishes timed`,
      fixStep: 4,
    },
  ];

  const allPassed = checks.every((c) => c.status === "pass");
  const hasFailures = checks.some((c) => c.status === "fail");

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted-foreground leading-relaxed">
        We've validated your inputs. Fix any issues before generating your baseline report.
      </p>

      <div className="space-y-2">
        {checks.map((check) => (
          <div
            key={check.label}
            className={`rounded-md border px-4 py-3 flex items-start gap-3 ${
              check.status === "pass"
                ? "border-opportunity/20 bg-opportunity/5"
                : check.status === "warn"
                ? "border-warning/20 bg-warning/5"
                : "border-destructive/20 bg-destructive/5"
            }`}
          >
            <div className="mt-0.5">
              {check.status === "pass" && <CheckCircle className="h-4 w-4 text-opportunity" />}
              {check.status === "warn" && <AlertCircle className="h-4 w-4 text-warning" />}
              {check.status === "fail" && <Circle className="h-4 w-4 text-destructive" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground">{check.label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{check.detail}</p>
            </div>
            {check.status !== "pass" && check.fixStep !== undefined && (
              <button
                onClick={() => onFix(check.fixStep!)}
                className="shrink-0 rounded px-2.5 py-1 text-xs border border-border bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
              >
                Fix
              </button>
            )}
          </div>
        ))}
      </div>

      {allPassed && (
        <div className="rounded-md border border-opportunity/30 bg-opportunity/5 p-4 text-center">
          <CheckCircle className="h-6 w-6 text-opportunity mx-auto mb-2" />
          <p className="text-sm text-foreground font-medium">All checks passed</p>
          <p className="text-xs text-muted-foreground mt-1">Ready to generate your baseline report.</p>
        </div>
      )}

      {hasFailures && (
        <p className="text-xs text-warning text-center">
          Resolve required items before continuing.
        </p>
      )}
    </div>
  );
};

export default StepValidation;
