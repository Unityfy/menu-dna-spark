export interface OnboardingData {
  // Step 1: Restaurant
  restaurantName: string;
  outletType: "single" | "multi";
  cuisine: string;
  location: string;

  // Step 2: Data Source
  dataSource: "pos" | "csv" | "";
  posSystem: string;

  // Step 3: Menu Import
  menuItems: MenuItemEntry[];
  categories: string[];

  // Step 4: Ingredient Costs
  ingredientCosts: IngredientCostEntry[];

  // Step 5: Prep Time
  prepTimes: PrepTimeEntry[];
}

export interface MenuItemEntry {
  id: string;
  name: string;
  category: string;
  sellingPrice: number;
  variant?: string;
  isCombo: boolean;
  isDuplicate: boolean;
}

export interface IngredientCostEntry {
  dishId: string;
  dishName: string;
  ingredients: {
    name: string;
    unitCost: number;
    portionQty: number;
    unit: string;
  }[];
  totalFoodCost: number;
}

export interface PrepTimeEntry {
  dishId: string;
  dishName: string;
  prepTime: number;
  station: string;
  complexity: "low" | "medium" | "high";
}

export const INITIAL_ONBOARDING_DATA: OnboardingData = {
  restaurantName: "",
  outletType: "single",
  cuisine: "",
  location: "",
  dataSource: "",
  posSystem: "",
  menuItems: [],
  categories: ["Starters", "Mains", "Desserts", "Beverages"],
  ingredientCosts: [],
  prepTimes: [],
};

export const MOCK_MENU_ITEMS: MenuItemEntry[] = [
  { id: "m1", name: "Butter Chicken", category: "Mains", sellingPrice: 380, isCombo: false, isDuplicate: false },
  { id: "m2", name: "Paneer Tikka", category: "Starters", sellingPrice: 280, isCombo: false, isDuplicate: false },
  { id: "m3", name: "Dal Makhani", category: "Mains", sellingPrice: 260, isCombo: false, isDuplicate: false },
  { id: "m4", name: "Truffle Risotto", category: "Mains", sellingPrice: 520, isCombo: false, isDuplicate: false },
  { id: "m5", name: "Garden Salad", category: "Starters", sellingPrice: 180, isCombo: false, isDuplicate: false },
  { id: "m6", name: "Gulab Jamun", category: "Desserts", sellingPrice: 150, isCombo: false, isDuplicate: false },
  { id: "m7", name: "Mushroom Pasta", category: "Mains", sellingPrice: 340, isCombo: false, isDuplicate: false },
  { id: "m8", name: "Masala Chai", category: "Beverages", sellingPrice: 80, isCombo: false, isDuplicate: false },
  { id: "m9", name: "Butter Chicken (duplicate)", category: "Mains", sellingPrice: 380, isCombo: false, isDuplicate: true },
  { id: "m10", name: "Thali Combo", category: "Mains", sellingPrice: 450, isCombo: true, isDuplicate: false },
];

export const POS_SYSTEMS = [
  { value: "petpooja", label: "Petpooja" },
  { value: "posist", label: "POSist" },
  { value: "torqus", label: "Torqus" },
  { value: "lightspeed", label: "Lightspeed" },
  { value: "square", label: "Square" },
  { value: "other", label: "Other" },
];

export const STATIONS = ["Grill", "Tandoor", "Stovetop", "Cold / Assembly", "Oven", "Fryer", "Beverage"];
