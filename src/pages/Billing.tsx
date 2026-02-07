import { cn } from "@/lib/utils";

const plans = [
  {
    name: "Trial",
    price: "Free",
    period: "14 days",
    features: ["1 restaurant", "Basic analytics", "CSV upload only", "Email support"],
    current: false,
  },
  {
    name: "Professional",
    price: "₹2,999",
    period: "/month",
    features: ["1 restaurant", "Full analytics", "POS + CSV", "Weekly action plans", "Priority support"],
    current: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    features: ["Multi-outlet", "Full analytics", "API access", "Dedicated account manager", "Custom integrations"],
    current: false,
  },
];

const invoices = [
  { date: "Feb 1, 2026", amount: "₹2,999", status: "Paid" },
  { date: "Jan 1, 2026", amount: "₹2,999", status: "Paid" },
  { date: "Dec 1, 2025", amount: "₹2,999", status: "Paid" },
];

const BillingPage = () => (
  <div className="space-y-8 max-w-3xl">
    <div>
      <h1 className="text-2xl font-semibold text-foreground">Subscription & Billing</h1>
      <p className="text-sm text-muted-foreground mt-1">Manage your plan and payment history</p>
    </div>

    {/* Current plan */}
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Current Plan</p>
          <p className="text-lg font-semibold text-foreground mt-1">Professional</p>
          <p className="text-xs text-muted-foreground mt-0.5">Active · Renews Mar 1, 2026</p>
        </div>
        <button className="rounded-md bg-secondary border border-border px-4 py-2 text-xs font-medium text-secondary-foreground hover:bg-secondary/80 transition-colors">
          Manage Plan
        </button>
      </div>
    </div>

    {/* Plans */}
    <div>
      <h2 className="text-sm font-medium text-foreground mb-4">Available Plans</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={cn(
              "rounded-lg border p-5 space-y-4",
              plan.current ? "border-foreground/30 bg-card" : "border-border bg-card"
            )}
          >
            <div>
              <p className="text-sm font-medium text-foreground">{plan.name}</p>
              <p className="text-xl font-semibold text-foreground mt-1">
                {plan.price}
                <span className="text-xs text-muted-foreground font-normal">{plan.period}</span>
              </p>
            </div>
            <ul className="space-y-1.5">
              {plan.features.map((f) => (
                <li key={f} className="text-xs text-muted-foreground">• {f}</li>
              ))}
            </ul>
            {plan.current ? (
              <span className="inline-block text-xs text-muted-foreground">Current plan</span>
            ) : (
              <button className="w-full rounded-md bg-primary px-4 py-2 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
                {plan.price === "Custom" ? "Contact Sales" : "Upgrade"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>

    {/* Billing history */}
    <div className="rounded-lg border border-border bg-card p-6">
      <h2 className="text-sm font-medium text-foreground mb-4">Billing History</h2>
      <div className="space-y-3">
        {invoices.map((inv, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
            <span className="text-sm text-foreground">{inv.date}</span>
            <span className="text-sm text-foreground">{inv.amount}</span>
            <span className="text-xs text-opportunity">{inv.status}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default BillingPage;
