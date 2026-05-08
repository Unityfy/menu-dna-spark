/**
 * Ingredient Knowledge Base
 * Maps common dish names (and fuzzy variants) to their typical ingredients
 * with estimated Indian market costs per portion.
 *
 * unitCost = cost per base unit (₹/kg for solids, ₹/L for liquids, ₹/pc for pieces)
 * portionQty = typical portion quantity used per single serving
 * unit = g | kg | ml | L | pc
 */

export interface AutoIngredient {
  name: string;
  unitCost: number;   // ₹ per kg/L/pc
  portionQty: number; // amount used per serving
  unit: string;       // g | kg | ml | L | pc
}

export interface DishIngredientTemplate {
  keywords: string[];           // fuzzy match keywords (lowercase)
  ingredients: AutoIngredient[];
  estimatedCost?: number;       // pre-calculated estimated cost (auto-computed if missing)
}

// ─── Helper to compute estimated cost from ingredients ───
function computeEstimatedCost(ingredients: AutoIngredient[]): number {
  return ingredients.reduce((sum, i) => {
    const factor = i.unit === "kg" || i.unit === "L" ? 1 : i.unit === "pc" ? 1 : 1 / 1000;
    return sum + i.unitCost * i.portionQty * factor;
  }, 0);
}

// ─── DISH TEMPLATES ───
const RAW_TEMPLATES: Omit<DishIngredientTemplate, "estimatedCost">[] = [
  // ═══ BURGERS ═══
  {
    keywords: ["burger", "hamburger", "cheeseburger", "veg burger", "chicken burger", "aloo tikki burger"],
    ingredients: [
      { name: "Burger bun", unitCost: 15, portionQty: 1, unit: "pc" },
      { name: "Chicken patty", unitCost: 350, portionQty: 150, unit: "g" },
      { name: "Lettuce", unitCost: 120, portionQty: 30, unit: "g" },
      { name: "Tomato", unitCost: 40, portionQty: 40, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 30, unit: "g" },
      { name: "Cheese slice", unitCost: 12, portionQty: 1, unit: "pc" },
      { name: "Mayonnaise", unitCost: 280, portionQty: 20, unit: "g" },
      { name: "Ketchup", unitCost: 150, portionQty: 15, unit: "g" },
    ],
  },
  // ═══ NORTH INDIAN MAINS ═══
  {
    keywords: ["butter chicken", "murgh makhani"],
    ingredients: [
      { name: "Chicken breast", unitCost: 320, portionQty: 200, unit: "g" },
      { name: "Butter", unitCost: 500, portionQty: 30, unit: "g" },
      { name: "Cream", unitCost: 400, portionQty: 50, unit: "ml" },
      { name: "Tomato", unitCost: 40, portionQty: 150, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 80, unit: "g" },
      { name: "Garlic", unitCost: 200, portionQty: 10, unit: "g" },
      { name: "Ginger", unitCost: 180, portionQty: 10, unit: "g" },
      { name: "Garam masala", unitCost: 600, portionQty: 5, unit: "g" },
      { name: "Kashmiri chili powder", unitCost: 500, portionQty: 5, unit: "g" },
      { name: "Oil", unitCost: 180, portionQty: 20, unit: "ml" },
    ],
  },
  {
    keywords: ["paneer tikka"],
    ingredients: [
      { name: "Paneer", unitCost: 380, portionQty: 200, unit: "g" },
      { name: "Yogurt", unitCost: 80, portionQty: 50, unit: "g" },
      { name: "Capsicum", unitCost: 80, portionQty: 50, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 50, unit: "g" },
      { name: "Lemon", unitCost: 5, portionQty: 1, unit: "pc" },
      { name: "Garam masala", unitCost: 600, portionQty: 3, unit: "g" },
      { name: "Kashmiri chili powder", unitCost: 500, portionQty: 3, unit: "g" },
      { name: "Oil", unitCost: 180, portionQty: 15, unit: "ml" },
    ],
  },
  {
    keywords: ["dal makhani", "dal makhni", "maa ki dal"],
    ingredients: [
      { name: "Urad dal (black lentils)", unitCost: 160, portionQty: 80, unit: "g" },
      { name: "Rajma (kidney beans)", unitCost: 140, portionQty: 20, unit: "g" },
      { name: "Butter", unitCost: 500, portionQty: 25, unit: "g" },
      { name: "Cream", unitCost: 400, portionQty: 30, unit: "ml" },
      { name: "Tomato", unitCost: 40, portionQty: 80, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 60, unit: "g" },
      { name: "Garlic", unitCost: 200, portionQty: 10, unit: "g" },
      { name: "Ginger", unitCost: 180, portionQty: 8, unit: "g" },
      { name: "Garam masala", unitCost: 600, portionQty: 3, unit: "g" },
      { name: "Oil", unitCost: 180, portionQty: 10, unit: "ml" },
    ],
  },
  {
    keywords: ["chicken biryani", "biryani"],
    ingredients: [
      { name: "Chicken", unitCost: 280, portionQty: 200, unit: "g" },
      { name: "Basmati rice", unitCost: 180, portionQty: 150, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 100, unit: "g" },
      { name: "Yogurt", unitCost: 80, portionQty: 50, unit: "g" },
      { name: "Saffron", unitCost: 350000, portionQty: 0.1, unit: "g" },
      { name: "Ghee", unitCost: 600, portionQty: 20, unit: "g" },
      { name: "Garam masala", unitCost: 600, portionQty: 5, unit: "g" },
      { name: "Mint leaves", unitCost: 200, portionQty: 5, unit: "g" },
      { name: "Oil", unitCost: 180, portionQty: 20, unit: "ml" },
    ],
  },
  {
    keywords: ["tandoori chicken", "chicken tandoori"],
    ingredients: [
      { name: "Chicken", unitCost: 280, portionQty: 300, unit: "g" },
      { name: "Yogurt", unitCost: 80, portionQty: 80, unit: "g" },
      { name: "Lemon", unitCost: 5, portionQty: 1, unit: "pc" },
      { name: "Kashmiri chili powder", unitCost: 500, portionQty: 5, unit: "g" },
      { name: "Garam masala", unitCost: 600, portionQty: 3, unit: "g" },
      { name: "Garlic", unitCost: 200, portionQty: 10, unit: "g" },
      { name: "Ginger", unitCost: 180, portionQty: 10, unit: "g" },
      { name: "Oil", unitCost: 180, portionQty: 15, unit: "ml" },
    ],
  },
  {
    keywords: ["naan", "butter naan", "garlic naan"],
    ingredients: [
      { name: "All-purpose flour", unitCost: 50, portionQty: 100, unit: "g" },
      { name: "Yogurt", unitCost: 80, portionQty: 20, unit: "g" },
      { name: "Butter", unitCost: 500, portionQty: 10, unit: "g" },
      { name: "Garlic", unitCost: 200, portionQty: 5, unit: "g" },
      { name: "Sugar", unitCost: 45, portionQty: 5, unit: "g" },
      { name: "Yeast", unitCost: 400, portionQty: 2, unit: "g" },
    ],
  },
  {
    keywords: ["palak paneer", "saag paneer"],
    ingredients: [
      { name: "Paneer", unitCost: 380, portionQty: 150, unit: "g" },
      { name: "Spinach", unitCost: 60, portionQty: 200, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 60, unit: "g" },
      { name: "Tomato", unitCost: 40, portionQty: 60, unit: "g" },
      { name: "Garlic", unitCost: 200, portionQty: 8, unit: "g" },
      { name: "Ginger", unitCost: 180, portionQty: 8, unit: "g" },
      { name: "Cream", unitCost: 400, portionQty: 20, unit: "ml" },
      { name: "Cumin", unitCost: 400, portionQty: 3, unit: "g" },
      { name: "Oil", unitCost: 180, portionQty: 15, unit: "ml" },
    ],
  },
  {
    keywords: ["chole", "chana masala", "chickpea curry", "chole bhature"],
    ingredients: [
      { name: "Chickpeas", unitCost: 120, portionQty: 120, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 80, unit: "g" },
      { name: "Tomato", unitCost: 40, portionQty: 100, unit: "g" },
      { name: "Ginger", unitCost: 180, portionQty: 8, unit: "g" },
      { name: "Garlic", unitCost: 200, portionQty: 8, unit: "g" },
      { name: "Chole masala", unitCost: 500, portionQty: 5, unit: "g" },
      { name: "Oil", unitCost: 180, portionQty: 20, unit: "ml" },
      { name: "Coriander", unitCost: 200, portionQty: 5, unit: "g" },
    ],
  },
  {
    keywords: ["rajma", "rajma chawal", "kidney bean curry"],
    ingredients: [
      { name: "Rajma (kidney beans)", unitCost: 140, portionQty: 100, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 80, unit: "g" },
      { name: "Tomato", unitCost: 40, portionQty: 100, unit: "g" },
      { name: "Garlic", unitCost: 200, portionQty: 8, unit: "g" },
      { name: "Ginger", unitCost: 180, portionQty: 8, unit: "g" },
      { name: "Garam masala", unitCost: 600, portionQty: 3, unit: "g" },
      { name: "Oil", unitCost: 180, portionQty: 15, unit: "ml" },
      { name: "Basmati rice", unitCost: 180, portionQty: 120, unit: "g" },
    ],
  },
  {
    keywords: ["chicken curry", "chicken masala", "chicken gravy"],
    ingredients: [
      { name: "Chicken", unitCost: 280, portionQty: 200, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 100, unit: "g" },
      { name: "Tomato", unitCost: 40, portionQty: 100, unit: "g" },
      { name: "Garlic", unitCost: 200, portionQty: 10, unit: "g" },
      { name: "Ginger", unitCost: 180, portionQty: 10, unit: "g" },
      { name: "Turmeric", unitCost: 300, portionQty: 3, unit: "g" },
      { name: "Garam masala", unitCost: 600, portionQty: 5, unit: "g" },
      { name: "Oil", unitCost: 180, portionQty: 20, unit: "ml" },
    ],
  },
  {
    keywords: ["mutton curry", "mutton masala", "lamb curry", "gosht"],
    ingredients: [
      { name: "Lamb/Mutton", unitCost: 700, portionQty: 200, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 100, unit: "g" },
      { name: "Tomato", unitCost: 40, portionQty: 100, unit: "g" },
      { name: "Yogurt", unitCost: 80, portionQty: 50, unit: "g" },
      { name: "Garlic", unitCost: 200, portionQty: 10, unit: "g" },
      { name: "Ginger", unitCost: 180, portionQty: 10, unit: "g" },
      { name: "Garam masala", unitCost: 600, portionQty: 5, unit: "g" },
      { name: "Oil", unitCost: 180, portionQty: 20, unit: "ml" },
    ],
  },
  {
    keywords: ["paneer butter masala", "paneer makhani"],
    ingredients: [
      { name: "Paneer", unitCost: 380, portionQty: 200, unit: "g" },
      { name: "Butter", unitCost: 500, portionQty: 25, unit: "g" },
      { name: "Cream", unitCost: 400, portionQty: 40, unit: "ml" },
      { name: "Tomato", unitCost: 40, portionQty: 120, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 60, unit: "g" },
      { name: "Cashew paste", unitCost: 900, portionQty: 15, unit: "g" },
      { name: "Garam masala", unitCost: 600, portionQty: 4, unit: "g" },
      { name: "Oil", unitCost: 180, portionQty: 15, unit: "ml" },
    ],
  },
  // ═══ SOUTH INDIAN ═══
  {
    keywords: ["dosa", "masala dosa", "plain dosa", "paper dosa"],
    ingredients: [
      { name: "Rice", unitCost: 60, portionQty: 80, unit: "g" },
      { name: "Urad dal", unitCost: 160, portionQty: 30, unit: "g" },
      { name: "Potato", unitCost: 30, portionQty: 100, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 40, unit: "g" },
      { name: "Mustard seeds", unitCost: 200, portionQty: 2, unit: "g" },
      { name: "Curry leaves", unitCost: 300, portionQty: 2, unit: "g" },
      { name: "Oil", unitCost: 180, portionQty: 15, unit: "ml" },
    ],
  },
  {
    keywords: ["idli", "idly"],
    ingredients: [
      { name: "Rice", unitCost: 60, portionQty: 80, unit: "g" },
      { name: "Urad dal", unitCost: 160, portionQty: 30, unit: "g" },
      { name: "Salt", unitCost: 20, portionQty: 3, unit: "g" },
    ],
  },
  {
    keywords: ["vada", "medu vada"],
    ingredients: [
      { name: "Urad dal", unitCost: 160, portionQty: 60, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 20, unit: "g" },
      { name: "Green chili", unitCost: 100, portionQty: 5, unit: "g" },
      { name: "Curry leaves", unitCost: 300, portionQty: 2, unit: "g" },
      { name: "Oil (for frying)", unitCost: 180, portionQty: 50, unit: "ml" },
    ],
  },
  // ═══ CHINESE / INDO-CHINESE ═══
  {
    keywords: ["fried rice", "veg fried rice", "chicken fried rice", "egg fried rice"],
    ingredients: [
      { name: "Basmati rice", unitCost: 180, portionQty: 150, unit: "g" },
      { name: "Egg", unitCost: 8, portionQty: 2, unit: "pc" },
      { name: "Capsicum", unitCost: 80, portionQty: 30, unit: "g" },
      { name: "Carrot", unitCost: 40, portionQty: 30, unit: "g" },
      { name: "Spring onion", unitCost: 100, portionQty: 20, unit: "g" },
      { name: "Soy sauce", unitCost: 200, portionQty: 10, unit: "ml" },
      { name: "Oil", unitCost: 180, portionQty: 20, unit: "ml" },
    ],
  },
  {
    keywords: ["manchurian", "gobi manchurian", "veg manchurian", "chicken manchurian"],
    ingredients: [
      { name: "Cauliflower", unitCost: 40, portionQty: 200, unit: "g" },
      { name: "Cornflour", unitCost: 100, portionQty: 30, unit: "g" },
      { name: "All-purpose flour", unitCost: 50, portionQty: 20, unit: "g" },
      { name: "Garlic", unitCost: 200, portionQty: 10, unit: "g" },
      { name: "Ginger", unitCost: 180, portionQty: 8, unit: "g" },
      { name: "Soy sauce", unitCost: 200, portionQty: 10, unit: "ml" },
      { name: "Chili sauce", unitCost: 180, portionQty: 10, unit: "ml" },
      { name: "Spring onion", unitCost: 100, portionQty: 15, unit: "g" },
      { name: "Oil (for frying)", unitCost: 180, portionQty: 80, unit: "ml" },
    ],
  },
  {
    keywords: ["chowmein", "noodles", "hakka noodles", "veg noodles", "chicken noodles"],
    ingredients: [
      { name: "Noodles", unitCost: 120, portionQty: 150, unit: "g" },
      { name: "Cabbage", unitCost: 30, portionQty: 50, unit: "g" },
      { name: "Carrot", unitCost: 40, portionQty: 30, unit: "g" },
      { name: "Capsicum", unitCost: 80, portionQty: 30, unit: "g" },
      { name: "Spring onion", unitCost: 100, portionQty: 20, unit: "g" },
      { name: "Soy sauce", unitCost: 200, portionQty: 10, unit: "ml" },
      { name: "Vinegar", unitCost: 80, portionQty: 5, unit: "ml" },
      { name: "Oil", unitCost: 180, portionQty: 20, unit: "ml" },
    ],
  },
  {
    keywords: ["spring roll", "veg spring roll"],
    ingredients: [
      { name: "Spring roll wrapper", unitCost: 10, portionQty: 4, unit: "pc" },
      { name: "Cabbage", unitCost: 30, portionQty: 60, unit: "g" },
      { name: "Carrot", unitCost: 40, portionQty: 40, unit: "g" },
      { name: "Noodles", unitCost: 120, portionQty: 40, unit: "g" },
      { name: "Oil (for frying)", unitCost: 180, portionQty: 60, unit: "ml" },
    ],
  },
  // ═══ ITALIAN ═══
  {
    keywords: ["pasta", "penne", "spaghetti", "alfredo", "arrabiata", "aglio olio"],
    ingredients: [
      { name: "Pasta", unitCost: 200, portionQty: 120, unit: "g" },
      { name: "Olive oil", unitCost: 800, portionQty: 20, unit: "ml" },
      { name: "Garlic", unitCost: 200, portionQty: 10, unit: "g" },
      { name: "Tomato", unitCost: 40, portionQty: 100, unit: "g" },
      { name: "Parmesan cheese", unitCost: 2000, portionQty: 15, unit: "g" },
      { name: "Cream", unitCost: 400, portionQty: 40, unit: "ml" },
      { name: "Basil", unitCost: 400, portionQty: 5, unit: "g" },
      { name: "Salt", unitCost: 20, portionQty: 3, unit: "g" },
    ],
  },
  {
    keywords: ["mushroom pasta", "mushroom alfredo", "mushroom penne"],
    ingredients: [
      { name: "Pasta", unitCost: 200, portionQty: 120, unit: "g" },
      { name: "Mushroom", unitCost: 250, portionQty: 80, unit: "g" },
      { name: "Olive oil", unitCost: 800, portionQty: 20, unit: "ml" },
      { name: "Garlic", unitCost: 200, portionQty: 10, unit: "g" },
      { name: "Cream", unitCost: 400, portionQty: 50, unit: "ml" },
      { name: "Parmesan cheese", unitCost: 2000, portionQty: 15, unit: "g" },
      { name: "Butter", unitCost: 500, portionQty: 10, unit: "g" },
      { name: "Salt", unitCost: 20, portionQty: 3, unit: "g" },
    ],
  },
  {
    keywords: ["pizza", "margherita", "pepperoni pizza", "veg pizza", "farmhouse pizza"],
    ingredients: [
      { name: "Pizza dough (flour)", unitCost: 50, portionQty: 200, unit: "g" },
      { name: "Mozzarella", unitCost: 600, portionQty: 100, unit: "g" },
      { name: "Tomato sauce", unitCost: 120, portionQty: 60, unit: "g" },
      { name: "Olive oil", unitCost: 800, portionQty: 10, unit: "ml" },
      { name: "Capsicum", unitCost: 80, portionQty: 30, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 30, unit: "g" },
      { name: "Mushroom", unitCost: 250, portionQty: 30, unit: "g" },
      { name: "Basil", unitCost: 400, portionQty: 3, unit: "g" },
    ],
  },
  {
    keywords: ["risotto", "truffle risotto", "mushroom risotto"],
    ingredients: [
      { name: "Arborio rice", unitCost: 350, portionQty: 100, unit: "g" },
      { name: "Mushroom", unitCost: 250, portionQty: 80, unit: "g" },
      { name: "Parmesan cheese", unitCost: 2000, portionQty: 20, unit: "g" },
      { name: "Butter", unitCost: 500, portionQty: 20, unit: "g" },
      { name: "White wine", unitCost: 500, portionQty: 30, unit: "ml" },
      { name: "Onion", unitCost: 30, portionQty: 40, unit: "g" },
      { name: "Olive oil", unitCost: 800, portionQty: 15, unit: "ml" },
      { name: "Truffle oil", unitCost: 5000, portionQty: 3, unit: "ml" },
    ],
  },
  // ═══ STARTERS / SNACKS ═══
  {
    keywords: ["french fries", "fries", "crispy fries"],
    ingredients: [
      { name: "Potato", unitCost: 30, portionQty: 250, unit: "g" },
      { name: "Oil (for frying)", unitCost: 180, portionQty: 100, unit: "ml" },
      { name: "Salt", unitCost: 20, portionQty: 3, unit: "g" },
      { name: "Ketchup", unitCost: 150, portionQty: 20, unit: "g" },
    ],
  },
  {
    keywords: ["samosa", "samosa chaat"],
    ingredients: [
      { name: "All-purpose flour", unitCost: 50, portionQty: 60, unit: "g" },
      { name: "Potato", unitCost: 30, portionQty: 100, unit: "g" },
      { name: "Green peas", unitCost: 100, portionQty: 30, unit: "g" },
      { name: "Cumin", unitCost: 400, portionQty: 3, unit: "g" },
      { name: "Garam masala", unitCost: 600, portionQty: 2, unit: "g" },
      { name: "Oil (for frying)", unitCost: 180, portionQty: 60, unit: "ml" },
    ],
  },
  {
    keywords: ["garden salad", "green salad", "caesar salad", "salad"],
    ingredients: [
      { name: "Lettuce", unitCost: 120, portionQty: 80, unit: "g" },
      { name: "Tomato", unitCost: 40, portionQty: 50, unit: "g" },
      { name: "Cucumber", unitCost: 30, portionQty: 50, unit: "g" },
      { name: "Carrot", unitCost: 40, portionQty: 30, unit: "g" },
      { name: "Olive oil", unitCost: 800, portionQty: 10, unit: "ml" },
      { name: "Lemon", unitCost: 5, portionQty: 1, unit: "pc" },
      { name: "Salt", unitCost: 20, portionQty: 2, unit: "g" },
    ],
  },
  {
    keywords: ["chicken wings", "wings", "buffalo wings"],
    ingredients: [
      { name: "Chicken wings", unitCost: 300, portionQty: 250, unit: "g" },
      { name: "All-purpose flour", unitCost: 50, portionQty: 30, unit: "g" },
      { name: "Chili sauce", unitCost: 180, portionQty: 20, unit: "ml" },
      { name: "Garlic", unitCost: 200, portionQty: 8, unit: "g" },
      { name: "Butter", unitCost: 500, portionQty: 15, unit: "g" },
      { name: "Oil (for frying)", unitCost: 180, portionQty: 80, unit: "ml" },
    ],
  },
  {
    keywords: ["fish and chips", "fish fry", "fried fish"],
    ingredients: [
      { name: "Fish fillet", unitCost: 500, portionQty: 200, unit: "g" },
      { name: "All-purpose flour", unitCost: 50, portionQty: 50, unit: "g" },
      { name: "Egg", unitCost: 8, portionQty: 1, unit: "pc" },
      { name: "Potato", unitCost: 30, portionQty: 200, unit: "g" },
      { name: "Oil (for frying)", unitCost: 180, portionQty: 100, unit: "ml" },
      { name: "Lemon", unitCost: 5, portionQty: 1, unit: "pc" },
    ],
  },
  // ═══ DESSERTS ═══
  {
    keywords: ["gulab jamun"],
    ingredients: [
      { name: "Khoya (mawa)", unitCost: 400, portionQty: 80, unit: "g" },
      { name: "All-purpose flour", unitCost: 50, portionQty: 15, unit: "g" },
      { name: "Sugar", unitCost: 45, portionQty: 100, unit: "g" },
      { name: "Cardamom", unitCost: 2500, portionQty: 1, unit: "g" },
      { name: "Ghee / Oil (for frying)", unitCost: 600, portionQty: 30, unit: "ml" },
    ],
  },
  {
    keywords: ["rasmalai", "ras malai"],
    ingredients: [
      { name: "Milk", unitCost: 60, portionQty: 500, unit: "ml" },
      { name: "Sugar", unitCost: 45, portionQty: 80, unit: "g" },
      { name: "Cardamom", unitCost: 2500, portionQty: 1, unit: "g" },
      { name: "Saffron", unitCost: 350000, portionQty: 0.05, unit: "g" },
      { name: "Pistachios", unitCost: 1500, portionQty: 5, unit: "g" },
      { name: "Lemon", unitCost: 5, portionQty: 1, unit: "pc" },
    ],
  },
  {
    keywords: ["brownie", "chocolate brownie"],
    ingredients: [
      { name: "Dark chocolate", unitCost: 800, portionQty: 60, unit: "g" },
      { name: "Butter", unitCost: 500, portionQty: 50, unit: "g" },
      { name: "Sugar", unitCost: 45, portionQty: 60, unit: "g" },
      { name: "Egg", unitCost: 8, portionQty: 2, unit: "pc" },
      { name: "All-purpose flour", unitCost: 50, portionQty: 40, unit: "g" },
      { name: "Cocoa powder", unitCost: 600, portionQty: 15, unit: "g" },
    ],
  },
  {
    keywords: ["ice cream", "sundae", "ice cream sundae"],
    ingredients: [
      { name: "Ice cream", unitCost: 300, portionQty: 120, unit: "g" },
      { name: "Chocolate sauce", unitCost: 400, portionQty: 20, unit: "ml" },
      { name: "Whipped cream", unitCost: 500, portionQty: 20, unit: "g" },
      { name: "Nuts (mixed)", unitCost: 800, portionQty: 10, unit: "g" },
      { name: "Cherry", unitCost: 15, portionQty: 1, unit: "pc" },
    ],
  },
  // ═══ BEVERAGES ═══
  {
    keywords: ["masala chai", "chai", "tea", "masala tea"],
    ingredients: [
      { name: "Tea leaves", unitCost: 400, portionQty: 5, unit: "g" },
      { name: "Milk", unitCost: 60, portionQty: 120, unit: "ml" },
      { name: "Sugar", unitCost: 45, portionQty: 15, unit: "g" },
      { name: "Ginger", unitCost: 180, portionQty: 3, unit: "g" },
      { name: "Cardamom", unitCost: 2500, portionQty: 0.5, unit: "g" },
    ],
  },
  {
    keywords: ["coffee", "cappuccino", "latte", "espresso"],
    ingredients: [
      { name: "Coffee beans / powder", unitCost: 800, portionQty: 10, unit: "g" },
      { name: "Milk", unitCost: 60, portionQty: 150, unit: "ml" },
      { name: "Sugar", unitCost: 45, portionQty: 10, unit: "g" },
    ],
  },
  {
    keywords: ["lassi", "sweet lassi", "mango lassi", "salt lassi"],
    ingredients: [
      { name: "Yogurt", unitCost: 80, portionQty: 200, unit: "g" },
      { name: "Sugar", unitCost: 45, portionQty: 30, unit: "g" },
      { name: "Cardamom", unitCost: 2500, portionQty: 0.5, unit: "g" },
      { name: "Ice", unitCost: 5, portionQty: 3, unit: "pc" },
    ],
  },
  {
    keywords: ["fresh juice", "orange juice", "watermelon juice", "pineapple juice", "juice"],
    ingredients: [
      { name: "Fresh fruit", unitCost: 80, portionQty: 250, unit: "g" },
      { name: "Sugar", unitCost: 45, portionQty: 15, unit: "g" },
      { name: "Ice", unitCost: 5, portionQty: 3, unit: "pc" },
      { name: "Lemon", unitCost: 5, portionQty: 1, unit: "pc" },
    ],
  },
  {
    keywords: ["cold coffee", "iced coffee", "frappe"],
    ingredients: [
      { name: "Coffee beans / powder", unitCost: 800, portionQty: 10, unit: "g" },
      { name: "Milk", unitCost: 60, portionQty: 200, unit: "ml" },
      { name: "Sugar", unitCost: 45, portionQty: 20, unit: "g" },
      { name: "Ice cream", unitCost: 300, portionQty: 30, unit: "g" },
      { name: "Ice", unitCost: 5, portionQty: 4, unit: "pc" },
    ],
  },
  {
    keywords: ["mojito", "virgin mojito", "mint mojito"],
    ingredients: [
      { name: "Mint leaves", unitCost: 200, portionQty: 10, unit: "g" },
      { name: "Lemon", unitCost: 5, portionQty: 2, unit: "pc" },
      { name: "Sugar", unitCost: 45, portionQty: 20, unit: "g" },
      { name: "Soda / Sprite", unitCost: 15, portionQty: 1, unit: "pc" },
      { name: "Ice", unitCost: 5, portionQty: 4, unit: "pc" },
    ],
  },
  // ═══ WRAPS / ROLLS ═══
  {
    keywords: ["wrap", "chicken wrap", "paneer wrap", "kathi roll", "roll", "frankie"],
    ingredients: [
      { name: "Tortilla / Roti", unitCost: 8, portionQty: 1, unit: "pc" },
      { name: "Chicken / Paneer filling", unitCost: 320, portionQty: 100, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 30, unit: "g" },
      { name: "Capsicum", unitCost: 80, portionQty: 20, unit: "g" },
      { name: "Mayonnaise", unitCost: 280, portionQty: 15, unit: "g" },
      { name: "Lettuce", unitCost: 120, portionQty: 20, unit: "g" },
      { name: "Chili sauce", unitCost: 180, portionQty: 10, unit: "ml" },
    ],
  },
  // ═══ SANDWICH ═══
  {
    keywords: ["sandwich", "club sandwich", "grilled sandwich", "veg sandwich", "chicken sandwich"],
    ingredients: [
      { name: "Bread slices", unitCost: 5, portionQty: 3, unit: "pc" },
      { name: "Chicken / Paneer", unitCost: 320, portionQty: 80, unit: "g" },
      { name: "Lettuce", unitCost: 120, portionQty: 20, unit: "g" },
      { name: "Tomato", unitCost: 40, portionQty: 40, unit: "g" },
      { name: "Cheese slice", unitCost: 12, portionQty: 1, unit: "pc" },
      { name: "Mayonnaise", unitCost: 280, portionQty: 15, unit: "g" },
      { name: "Butter", unitCost: 500, portionQty: 10, unit: "g" },
    ],
  },
  // ═══ THALI / COMBOS ═══
  {
    keywords: ["thali", "thali combo", "veg thali", "non-veg thali", "special thali"],
    ingredients: [
      { name: "Basmati rice", unitCost: 180, portionQty: 150, unit: "g" },
      { name: "Dal", unitCost: 120, portionQty: 60, unit: "g" },
      { name: "Roti / Chapati flour", unitCost: 40, portionQty: 80, unit: "g" },
      { name: "Sabzi vegetables", unitCost: 60, portionQty: 100, unit: "g" },
      { name: "Curd / Raita", unitCost: 80, portionQty: 50, unit: "g" },
      { name: "Pickle", unitCost: 200, portionQty: 10, unit: "g" },
      { name: "Papad", unitCost: 5, portionQty: 1, unit: "pc" },
      { name: "Sweet (dessert)", unitCost: 300, portionQty: 30, unit: "g" },
      { name: "Oil / Ghee", unitCost: 200, portionQty: 25, unit: "ml" },
    ],
  },
  // ═══ MOMOS ═══
  {
    keywords: ["momos", "steamed momos", "fried momos", "chicken momos", "veg momos", "paneer momos"],
    ingredients: [
      { name: "All-purpose flour", unitCost: 50, portionQty: 80, unit: "g" },
      { name: "Chicken mince / Veggies", unitCost: 300, portionQty: 100, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 30, unit: "g" },
      { name: "Garlic", unitCost: 200, portionQty: 5, unit: "g" },
      { name: "Ginger", unitCost: 180, portionQty: 5, unit: "g" },
      { name: "Soy sauce", unitCost: 200, portionQty: 5, unit: "ml" },
      { name: "Oil", unitCost: 180, portionQty: 10, unit: "ml" },
    ],
  },
  // ═══ KEBABS ═══
  {
    keywords: ["seekh kebab", "kebab", "malai kebab", "shammi kebab"],
    ingredients: [
      { name: "Minced meat / Paneer", unitCost: 400, portionQty: 200, unit: "g" },
      { name: "Onion", unitCost: 30, portionQty: 40, unit: "g" },
      { name: "Ginger", unitCost: 180, portionQty: 8, unit: "g" },
      { name: "Garlic", unitCost: 200, portionQty: 8, unit: "g" },
      { name: "Green chili", unitCost: 100, portionQty: 5, unit: "g" },
      { name: "Garam masala", unitCost: 600, portionQty: 3, unit: "g" },
      { name: "Egg", unitCost: 8, portionQty: 1, unit: "pc" },
      { name: "Oil", unitCost: 180, portionQty: 15, unit: "ml" },
    ],
  },
];

// Build final templates with estimated costs
export const DISH_TEMPLATES: DishIngredientTemplate[] = RAW_TEMPLATES.map((t) => ({
  ...t,
  estimatedCost: Math.round(computeEstimatedCost(t.ingredients) * 100) / 100,
}));

/**
 * Fuzzy match a dish name against the template database.
 * Returns the best matching template or null.
 */
export function findDishTemplate(dishName: string): DishIngredientTemplate | null {
  const lower = dishName.toLowerCase().trim();

  // 1. Exact keyword match
  for (const tpl of DISH_TEMPLATES) {
    if (tpl.keywords.some((k) => k === lower)) return tpl;
  }

  // 2. Keyword contained in dish name
  // Score by keyword length (longer match = better)
  let bestMatch: DishIngredientTemplate | null = null;
  let bestScore = 0;

  for (const tpl of DISH_TEMPLATES) {
    for (const keyword of tpl.keywords) {
      if (lower.includes(keyword) || keyword.includes(lower)) {
        const score = keyword.length;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = tpl;
        }
      }
    }
  }

  if (bestMatch) return bestMatch;

  // 3. Word overlap scoring
  const words = lower.split(/\s+/).filter((w) => w.length > 2);
  for (const tpl of DISH_TEMPLATES) {
    for (const keyword of tpl.keywords) {
      const kwWords = keyword.split(/\s+/);
      const overlap = words.filter((w) => kwWords.some((kw) => kw.includes(w) || w.includes(kw))).length;
      if (overlap > bestScore) {
        bestScore = overlap;
        bestMatch = tpl;
      }
    }
  }

  return bestScore > 0 ? bestMatch : null;
}
