import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface MenuListItem {
  id: string;
  name: string;
  category: string;
  classification: string;
  margin: number;
  stress_score: number;
  weekly_orders: number;
  weekly_revenue: number;
}

export function useMenuList() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["menu-list"],
    queryFn: async (): Promise<{ dishes: MenuListItem[]; categories: string[] }> => {
      const [itemsRes, profilesRes] = await Promise.all([
        supabase.from("menu_items").select("id, name, category").eq("is_active", true),
        supabase.from("dish_profiles").select("menu_item_id, classification, true_margin, stress_score, weekly_orders, weekly_revenue"),
      ]);

      if (itemsRes.error) throw itemsRes.error;
      if (profilesRes.error) throw profilesRes.error;

      const profileMap = new Map(
        (profilesRes.data || []).map((p) => [p.menu_item_id, p])
      );

      const dishes: MenuListItem[] = (itemsRes.data || []).map((item) => {
        const profile = profileMap.get(item.id);
        return {
          id: item.id,
          name: item.name,
          category: item.category,
          classification: profile?.classification ?? "low-impact-filler",
          margin: profile?.true_margin ?? 0,
          stress_score: profile?.stress_score ?? 0,
          weekly_orders: profile?.weekly_orders ?? 0,
          weekly_revenue: profile?.weekly_revenue ?? 0,
        };
      });

      const cats = [...new Set(dishes.map((d) => d.category))].sort();

      return { dishes, categories: ["All", ...cats] };
    },
    enabled: !!user,
  });
}
