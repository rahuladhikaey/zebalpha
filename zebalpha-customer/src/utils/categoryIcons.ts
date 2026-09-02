export const getCategoryIcon = (name: string): { type: 'image' | 'emoji', value: string } => {
  const lower = name.toLowerCase();
  if (lower.includes("sweet") || lower.includes("sugar")) return { type: 'image', value: '/category-icons/sweet.png' };
  if (lower.includes("healthy")) return { type: 'image', value: '/category-icons/healthy.png' };
  if (lower.includes("veg")) return { type: 'image', value: '/category-icons/veg.png' };
  if (lower.includes("spicy") || lower.includes("masala") || lower.includes("spice")) return { type: 'image', value: '/category-icons/spicy.png' };
  
  if (lower.includes("bori")) return { type: 'emoji', value: '🧆' };
  if (lower.includes("dall") || lower.includes("dal")) return { type: 'emoji', value: '🥣' };
  if (lower.includes("oil")) return { type: 'emoji', value: '🧴' };
  if (lower.includes("rice")) return { type: 'emoji', value: '🌾' };
  if (lower.includes("cloth") || lower.includes("wear")) return { type: 'emoji', value: '👕' };
  if (lower.includes("elect")) return { type: 'emoji', value: '🔌' };
  return { type: 'emoji', value: '📦' };
};
