export const getCategoryIcon = (name: string): { type: 'image' | 'emoji', value: string } => {
	const lower = (name || "").toLowerCase();
	if (lower.includes("polo") || lower.includes("shirt") || lower.includes("collared")) return { type: 'emoji', value: '👕' };
	if (lower.includes("tee") || lower.includes("t-shirt") || lower.includes("oversized")) return { type: 'emoji', value: '🛹' };
	if (lower.includes("hoodie") || lower.includes("sweatshirt") || lower.includes("fleece") || lower.includes("crewneck")) return { type: 'emoji', value: '🧥' };
	if (lower.includes("cargo") || lower.includes("pant") || lower.includes("bottom") || lower.includes("jogger") || lower.includes("denim") || lower.includes("trouser")) return { type: 'emoji', value: '👖' };
	if (lower.includes("drop") || lower.includes("exclusive") || lower.includes("limited") || lower.includes("season")) return { type: 'emoji', value: '⚡' };
	if (lower.includes("capsule") || lower.includes("collection") || lower.includes("animated")) return { type: 'emoji', value: '🎨' };
	if (lower.includes("cap") || lower.includes("beanie") || lower.includes("headwear") || lower.includes("hat")) return { type: 'emoji', value: '🧢' };
	if (lower.includes("short")) return { type: 'emoji', value: '🩳' };
	if (lower.includes("luxury") || lower.includes("jacket") || lower.includes("knit")) return { type: 'emoji', value: '✨' };
	return { type: 'emoji', value: '👔' };
};
