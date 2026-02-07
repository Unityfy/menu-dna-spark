export interface Dish {
  id: string;
  name: string;
  category: string;
  selling_price: number;
  food_cost: number;
  margin: number;
  stress_score: number;
  weekly_orders: number;
  weekly_revenue: number;
  weekly_profit: number;
  prep_time: number;
  classification: "star" | "puzzle" | "plow_horse" | "dog";
  demand_pattern: "stable" | "growing" | "declining" | "volatile";
  cannibalization: string[];
}

export interface Recommendation {
  id: string;
  dish_id: string;
  dish_name: string;
  type: "price" | "remove" | "promote" | "reformulate" | "bundle";
  title: string;
  reasoning: string;
  expected_revenue_impact: number;
  expected_profit_impact: number;
  expected_stress_impact: number;
  status: "pending" | "approved" | "ignored";
}

export interface WeeklySnapshot {
  id: string;
  week_label: string;
  health_score: number;
  health_delta: number;
  total_revenue: number;
  total_profit: number;
}

export const categories = ["All", "Starters", "Mains", "Desserts", "Beverages", "Sides"];

export const dishes: Dish[] = [
  {
    id: "d1",
    name: "Butter Chicken",
    category: "Mains",
    selling_price: 380,
    food_cost: 120,
    margin: 68.4,
    stress_score: 32,
    weekly_orders: 145,
    weekly_revenue: 55100,
    weekly_profit: 37668,
    prep_time: 25,
    classification: "star",
    demand_pattern: "stable",
    cannibalization: [],
  },
  {
    id: "d2",
    name: "Paneer Tikka",
    category: "Starters",
    selling_price: 280,
    food_cost: 95,
    margin: 66.1,
    stress_score: 45,
    weekly_orders: 98,
    weekly_revenue: 27440,
    weekly_profit: 18130,
    prep_time: 20,
    classification: "star",
    demand_pattern: "growing",
    cannibalization: [],
  },
  {
    id: "d3",
    name: "Dal Makhani",
    category: "Mains",
    selling_price: 260,
    food_cost: 60,
    margin: 76.9,
    stress_score: 18,
    weekly_orders: 120,
    weekly_revenue: 31200,
    weekly_profit: 24000,
    prep_time: 35,
    classification: "plow_horse",
    demand_pattern: "stable",
    cannibalization: [],
  },
  {
    id: "d4",
    name: "Truffle Risotto",
    category: "Mains",
    selling_price: 520,
    food_cost: 280,
    margin: 46.2,
    stress_score: 72,
    weekly_orders: 22,
    weekly_revenue: 11440,
    weekly_profit: 5280,
    prep_time: 40,
    classification: "puzzle",
    demand_pattern: "volatile",
    cannibalization: ["Mushroom Pasta"],
  },
  {
    id: "d5",
    name: "Garden Salad",
    category: "Starters",
    selling_price: 180,
    food_cost: 110,
    margin: 38.9,
    stress_score: 8,
    weekly_orders: 35,
    weekly_revenue: 6300,
    weekly_profit: 2450,
    prep_time: 8,
    classification: "dog",
    demand_pattern: "declining",
    cannibalization: [],
  },
  {
    id: "d6",
    name: "Gulab Jamun",
    category: "Desserts",
    selling_price: 150,
    food_cost: 35,
    margin: 76.7,
    stress_score: 12,
    weekly_orders: 88,
    weekly_revenue: 13200,
    weekly_profit: 10120,
    prep_time: 10,
    classification: "star",
    demand_pattern: "stable",
    cannibalization: [],
  },
  {
    id: "d7",
    name: "Mushroom Pasta",
    category: "Mains",
    selling_price: 340,
    food_cost: 150,
    margin: 55.9,
    stress_score: 55,
    weekly_orders: 40,
    weekly_revenue: 13600,
    weekly_profit: 7600,
    prep_time: 30,
    classification: "puzzle",
    demand_pattern: "declining",
    cannibalization: ["Truffle Risotto"],
  },
  {
    id: "d8",
    name: "Masala Chai",
    category: "Beverages",
    selling_price: 80,
    food_cost: 15,
    margin: 81.3,
    stress_score: 5,
    weekly_orders: 210,
    weekly_revenue: 16800,
    weekly_profit: 13650,
    prep_time: 5,
    classification: "plow_horse",
    demand_pattern: "stable",
    cannibalization: [],
  },
];

export const recommendations: Recommendation[] = [
  {
    id: "r1",
    dish_id: "d4",
    dish_name: "Truffle Risotto",
    type: "price",
    title: "Increase price by ₹40",
    reasoning: "Truffle Risotto has a 46% margin — below the menu average of 62%. With only 22 weekly orders, a ₹40 price increase to ₹560 is unlikely to reduce demand significantly, but would raise margin to 50% and add ~₹880/week profit.",
    expected_revenue_impact: 880,
    expected_profit_impact: 880,
    expected_stress_impact: 0,
    status: "pending",
  },
  {
    id: "r2",
    dish_id: "d5",
    dish_name: "Garden Salad",
    type: "remove",
    title: "Consider removing from menu",
    reasoning: "Garden Salad has a declining demand trend with only 35 orders/week, a below-average 39% margin, and contributes just 1.4% of total revenue. Removing it would simplify kitchen operations without meaningful revenue loss.",
    expected_revenue_impact: -6300,
    expected_profit_impact: -2450,
    expected_stress_impact: -8,
    status: "pending",
  },
  {
    id: "r3",
    dish_id: "d2",
    dish_name: "Paneer Tikka",
    type: "promote",
    title: "Feature as weekly special",
    reasoning: "Paneer Tikka shows a growing demand pattern with strong 66% margins. Featuring it prominently could increase weekly orders by 15–20%, adding ~₹4,000 in weekly revenue with minimal kitchen stress increase.",
    expected_revenue_impact: 4000,
    expected_profit_impact: 2640,
    expected_stress_impact: 5,
    status: "pending",
  },
  {
    id: "r4",
    dish_id: "d7",
    dish_name: "Mushroom Pasta",
    type: "reformulate",
    title: "Reduce portion size or substitute ingredients",
    reasoning: "Mushroom Pasta has a 56% margin and declining demand. It also cannibalizes Truffle Risotto orders. Reformulating with cheaper mushroom varieties could improve margin to 65% while maintaining perceived quality.",
    expected_revenue_impact: 0,
    expected_profit_impact: 1500,
    expected_stress_impact: -10,
    status: "pending",
  },
];

export const weeklySnapshots: WeeklySnapshot[] = [
  { id: "w1", week_label: "Jan 27 – Feb 2", health_score: 72, health_delta: 0, total_revenue: 175080, total_profit: 119298 },
  { id: "w2", week_label: "Feb 3 – Feb 9", health_score: 74, health_delta: 2, total_revenue: 178200, total_profit: 121500 },
  { id: "w3", week_label: "Feb 10 – Feb 16", health_score: 71, health_delta: -3, total_revenue: 170500, total_profit: 116200 },
  { id: "w4", week_label: "Feb 17 – Feb 23", health_score: 76, health_delta: 5, total_revenue: 182300, total_profit: 125100 },
  { id: "w5", week_label: "Feb 24 – Mar 2", health_score: 74, health_delta: -2, total_revenue: 176400, total_profit: 120800 },
];

export const mockUser = {
  email: "chef@example.com",
  display_name: "Rajesh Kumar",
  restaurant_name: "Spice Garden",
  plan: "Professional",
  onboarding_complete: true,
};
