import type { MenuItem, Category } from "./types";

export const demoCategories: Category[] = [
  { id: "cat-1", name: "Special Combos", description: "Value-packed meal bundles for campus foodies", sort_order: 1, is_active: true },
  { id: "cat-2", name: "Main Meals", description: "Authentic hearty dishes prepared fresh daily", sort_order: 2, is_active: true },
  { id: "cat-3", name: "Student Favourites", description: "Delicious, filling & budget-friendly classics", sort_order: 3, is_active: true },
  { id: "cat-4", name: "Fast Bites & Sides", description: "Quick, tasty snacks and savoury pastry bites", sort_order: 4, is_active: true },
  { id: "cat-5", name: "Chilled Drinks", description: "Fresh seasonal juices and iced refreshments", sort_order: 5, is_active: true }
];

export const demoMenu: MenuItem[] = [
  {
    id: "meal-1",
    name: "Swahili Chicken Biryani",
    description: "Tender chicken slow-cooked in rich Swahili aromatics, served with layered saffron basmati rice and fresh kachumbari.",
    price: 320,
    category: "Special Combos",
    category_id: "cat-1",
    image_url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80",
    is_available: true
  },
  {
    id: "meal-2",
    name: "Coastal Chicken Pilau",
    description: "Fragrant spiced rice infused with whole cumin, cardamom and garlic, paired with juicy chicken drumstick and kachumbari.",
    price: 250,
    category: "Main Meals",
    category_id: "cat-2",
    image_url: "https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&q=80",
    is_available: true
  },
  {
    id: "meal-3",
    name: "Slow-Braised Beef Stew & Fluffy Rice",
    description: "Succulent cubes of beef simmered in a rich tomato, coriander and onion gravy, served with aromatic steamed rice.",
    price: 280,
    category: "Main Meals",
    category_id: "cat-2",
    image_url: "https://images.unsplash.com/photo-1547928576-a4a33237cbc3?w=800&q=80",
    is_available: true
  },
  {
    id: "meal-4",
    name: "Fresh Tilapia Wet Fry with Ugali & Greens",
    description: "Whole fresh Lake Victoria tilapia pan-fried and simmered in a spicy tomato relish with steaming hot ugali and sukuma wiki.",
    price: 380,
    category: "Main Meals",
    category_id: "cat-2",
    image_url: "https://images.unsplash.com/photo-1534939561126-855b8675edd7?w=800&q=80",
    is_available: true
  },
  {
    id: "meal-5",
    name: "Double Chapati with Rich Yellow Beans (Madondo)",
    description: "Two flaky, layered layered chapatis served with coconut-infused yellow beans in thick onion-tomato sauce.",
    price: 150,
    category: "Student Favourites",
    category_id: "cat-3",
    image_url: "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=800&q=80",
    is_available: true
  },
  {
    id: "meal-6",
    name: "Spiced Green Grams (Dengu) & White Rice",
    description: "Tender whole green grams tempered with ginger, garlic, and fresh dhania, served with fluffy white rice.",
    price: 180,
    category: "Student Favourites",
    category_id: "cat-3",
    image_url: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=800&q=80",
    is_available: true
  },
  {
    id: "meal-7",
    name: "AYOTD Sizzling Chips Masala",
    description: "Fresh hand-cut golden fries tossed in our signature garlic-chilli masala sauce, sprinkled with fresh spring onions.",
    price: 180,
    category: "Fast Bites & Sides",
    category_id: "cat-4",
    image_url: "https://images.unsplash.com/photo-1576107232684-1279f3908594?w=800&q=80",
    is_available: true
  },
  {
    id: "meal-8",
    name: "Crispy Beef Samosas (Pair)",
    description: "Crispy, hand-rolled golden pastry pockets filled with seasoned minced beef, green chillies, and aromatic spices.",
    price: 100,
    category: "Fast Bites & Sides",
    category_id: "cat-4",
    image_url: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80",
    is_available: true
  },
  {
    id: "meal-9",
    name: "Fresh Tropical Passion & Mango Blend",
    description: "Pure, freshly pressed Kenyan passion fruit and sweet mango juice over ice. 100% natural with no artificial sweeteners.",
    price: 120,
    category: "Chilled Drinks",
    category_id: "cat-5",
    image_url: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=800&q=80",
    is_available: true
  },
  {
    id: "meal-10",
    name: "Chilled Hibiscus (Zobo) Iced Tea",
    description: "Brewed roselle hibiscus flowers infused with fresh ginger, mint, and a touch of local honey.",
    price: 100,
    category: "Chilled Drinks",
    category_id: "cat-5",
    image_url: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&q=80",
    is_available: true
  }
];

const deletedDemoMealIds = new Set<string>();
const deletedDemoCatIds = new Set<string>();

export function deleteDemoMeal(id: string) {
  deletedDemoMealIds.add(id);
}

export function deleteDemoCategory(id: string) {
  deletedDemoCatIds.add(id);
}

export function getDemoMenu(): MenuItem[] {
  return demoMenu.filter((m) => !deletedDemoMealIds.has(m.id));
}

export function getDemoCategories(): Category[] {
  return demoCategories.filter((c) => !deletedDemoCatIds.has(c.id));
}
