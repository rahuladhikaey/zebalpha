export const getCategoryIcon = (name: string): { type: 'image' | 'emoji', value: string } => {
  const lower = (name || "").toLowerCase();
  if (lower.includes("polo") || lower.includes("collared")) return { type: 'emoji', value: '👕' };
  if (lower.includes("tee") || lower.includes("t-shirt") || lower.includes("oversized")) return { type: 'emoji', value: '🛹' };
  if (lower.includes("hoodie") || lower.includes("sweatshirt") || lower.includes("fleece")) return { type: 'emoji', value: '🧥' };
  if (lower.includes("shirt")) return { type: 'emoji', value: '👔' };
  if (lower.includes("cargo") || lower.includes("pant") || lower.includes("bottom") || lower.includes("trouser") || lower.includes("denim")) return { type: 'emoji', value: '👖' };
  if (lower.includes("drop") || lower.includes("exclusive") || lower.includes("limited")) return { type: 'emoji', value: '⚡' };
  if (lower.includes("cap") || lower.includes("beanie") || lower.includes("headwear") || lower.includes("accessor")) return { type: 'emoji', value: '🧢' };
  return { type: 'emoji', value: '📦' };
};

