

# Core Screens Refinement Plan

## Current State

| Screen | Data Source | Status |
|---|---|---|
| Dashboard | Live (Supabase snapshots + recommendations) | Ready |
| Dish DNA Profile | Mock data (`mockData.ts`) | Needs migration |
| Weekly Action Plan | Live (Supabase recommendations) | Ready |
| Menu List | Mock data (`mockData.ts`) | Needs migration |
| History | Live (Supabase snapshots) | Needs "before vs after" |

The Dashboard and Action Plan screens are already connected to Supabase. The main work is migrating the **Dish Profile** and **Menu List** screens to live data, and adding a **before vs after comparison** to the History screen.

---

## Changes

### 1. Create a Dish Profile data hook

A new hook `useDishProfile` in `src/hooks/useDishProfile.ts` will:
- Accept a `menu_item_id` parameter
- Fetch the matching row from `dish_profiles` (joined conceptually with `menu_items` for name, category, selling price, food cost, prep time, station, complexity)
- Fetch related recommendations from the `recommendations` table filtered by `menu_item_id`
- Return loading, error, and data states

Since there are no foreign keys between `dish_profiles` and `menu_items`, the hook will make two parallel queries:
- `menu_items` filtered by `id`
- `dish_profiles` filtered by `menu_item_id`

### 2. Refactor Dish DNA Profile View (`src/pages/DishProfile.tsx`)

Replace all mock data imports with the new `useDishProfile` hook:
- Map database fields to the existing UI (e.g., `true_margin` instead of `margin`, `risk_flags` JSONB array, `competing_dishes` JSONB array, `demand_pattern` JSONB)
- Add proper loading skeleton state
- Add empty state when dish is not found
- Wire "Active Recommendations" section to live `recommendations` data
- Keep the exact same visual layout and 2x2 analysis grid

### 3. Create a Menu List data hook

A new hook `useMenuList` in `src/hooks/useMenuList.ts` will:
- Fetch all active `menu_items` with their corresponding `dish_profiles`
- Query `menu_items` where `is_active = true`, then query `dish_profiles` and merge by `menu_item_id`
- Extract distinct categories for the filter bar
- Return combined dish list with classification, margin, stress, orders, and revenue

### 4. Refactor Menu List (`src/pages/MenuList.tsx`)

Replace mock data with the new hook:
- Dynamic category list derived from actual menu items
- Loading skeleton state
- Empty state directing users to onboarding
- Same card layout with margin, stress, orders, and revenue columns

### 5. Add Before vs After Comparison to History (`src/pages/History.tsx`)

Add a new section below the existing trends:
- When 2+ snapshots exist, show a comparison card between the most recent and previous week
- Display side-by-side metrics: health score, revenue, profit, avg margin, avg stress
- Show delta with color-coded direction indicators (green for improvement, amber for decline)
- Show classification breakdown changes (e.g., "High-profit items: 4 -> 5")

### 6. Minor Dashboard fix

The Dashboard currently calls `useRecommendations()` conditionally (after the early return for `!snapshot`). This violates React's rules of hooks. Move the hook call above the conditional returns.

---

## Technical Details

### Data mapping for Dish Profile

```text
Database fields          -->  UI fields
─────────────────────────────────────────
menu_items.name          -->  dish name
menu_items.category      -->  category
menu_items.selling_price -->  selling price
menu_items.food_cost     -->  food cost
menu_items.prep_time_minutes --> prep time
menu_items.station       -->  station
menu_items.complexity    -->  complexity
dish_profiles.true_margin    -->  margin
dish_profiles.stress_score   -->  stress score
dish_profiles.weekly_orders  -->  weekly orders
dish_profiles.weekly_revenue -->  weekly revenue
dish_profiles.weekly_profit  -->  weekly profit
dish_profiles.classification -->  classification badge
dish_profiles.demand_trend   -->  demand trend
dish_profiles.risk_flags     -->  risk flag pills
dish_profiles.competing_dishes --> cannibalization section
dish_profiles.demand_pattern   --> demand pattern section
dish_profiles.peak_hour_concentration --> peak hour stat
dish_profiles.prep_time_volatility    --> volatility stat
dish_profiles.demand_spike_frequency  --> spike count
dish_profiles.cannibalization_score   --> overlap score bar
```

### Files created
- `src/hooks/useDishProfile.ts` -- single dish + menu item + recommendations
- `src/hooks/useMenuList.ts` -- all active dishes with profiles

### Files modified
- `src/pages/DishProfile.tsx` -- swap mock data for live hook
- `src/pages/MenuList.tsx` -- swap mock data for live hook
- `src/pages/History.tsx` -- add before vs after comparison section
- `src/pages/Dashboard.tsx` -- fix hooks ordering (move useRecommendations above conditionals)

### No database changes needed
All required tables and columns already exist.

