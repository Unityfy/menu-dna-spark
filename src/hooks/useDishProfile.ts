import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";
import type { Recommendation } from "@/hooks/useRecommendations";

export interface CompetingDish {
  dishId: string;
  dishName: string;
  overlapScore: number;
}

export interface DemandPattern {
  byOrderType: { "dine-in": number; takeaway: number; delivery: number };
  peakDays: string[];
  peakHours: string[];
}

export interface DishProfile {
  // From menu_items
  id: string;
  name: string;
  category: string;
  selling_price: number;
  food_cost: number;
  prep_time: number;
  station: string;
  complexity: string;
  // From dish_profiles
  margin: number;
  stress_score: number;
  weekly_orders: number;
  weekly_revenue: number;
  weekly_profit: number;
  classification: string;
  demand_trend: string;
  risk_flags: string[];
  competing_dishes: CompetingDish[];
  demand_pattern: DemandPattern;
  peak_hour_concentration: number;
  prep_time_volatility: number;
  demand_spike_frequency: number;
  cannibalization_score: number;
}

const defaultDemandPattern: DemandPattern = {
  byOrderType: { "dine-in": 0, takeaway: 0, delivery: 0 },
  peakDays: [],
  peakHours: [],
};

export function useDishProfile(menuItemId: string | undefined) {
  const { user } = useAuth();

  const profileQuery = useQuery({
    queryKey: ["dish-profile", menuItemId],
    queryFn: async (): Promise<DishProfile | null> => {
      if (!menuItemId) return null;

      const [itemRes, profileRes] = await Promise.all([
        supabase.from("menu_items").select("*").eq("id", menuItemId).maybeSingle(),
        supabase.from("dish_profiles").select("*").eq("menu_item_id", menuItemId).maybeSingle(),
      ]);

      if (itemRes.error) throw itemRes.error;
      if (!itemRes.data) return null;

      const item = itemRes.data;
      const profile = profileRes.data;

      return {
        id: item.id,
        name: item.name,
        category: item.category,
        selling_price: item.selling_price,
        food_cost: item.food_cost,
        prep_time: item.prep_time_minutes,
        station: item.station,
        complexity: item.complexity,
        margin: profile?.true_margin ?? 0,
        stress_score: profile?.stress_score ?? 0,
        weekly_orders: profile?.weekly_orders ?? 0,
        weekly_revenue: profile?.weekly_revenue ?? 0,
        weekly_profit: profile?.weekly_profit ?? 0,
        classification: profile?.classification ?? "low-impact-filler",
        demand_trend: profile?.demand_trend ?? "stable",
        risk_flags: (profile?.risk_flags ?? []) as string[],
        competing_dishes: (profile?.competing_dishes ?? []) as unknown as CompetingDish[],
        demand_pattern: (profile?.demand_pattern as unknown as DemandPattern) ?? defaultDemandPattern,
        peak_hour_concentration: profile?.peak_hour_concentration ?? 0,
        prep_time_volatility: profile?.prep_time_volatility ?? 0,
        demand_spike_frequency: profile?.demand_spike_frequency ?? 0,
        cannibalization_score: profile?.cannibalization_score ?? 0,
      };
    },
    enabled: !!user && !!menuItemId,
  });

  const recsQuery = useQuery({
    queryKey: ["dish-recommendations", menuItemId],
    queryFn: async (): Promise<Recommendation[]> => {
      if (!menuItemId) return [];
      const { data, error } = await supabase
        .from("recommendations")
        .select("*")
        .eq("menu_item_id", menuItemId)
        .eq("status", "pending")
        .order("priority", { ascending: true });
      if (error) throw error;
      return (data || []) as Recommendation[];
    },
    enabled: !!user && !!menuItemId,
  });

  return {
    dish: profileQuery.data ?? null,
    recommendations: recsQuery.data ?? [],
    isLoading: profileQuery.isLoading,
    error: profileQuery.error,
  };
}
