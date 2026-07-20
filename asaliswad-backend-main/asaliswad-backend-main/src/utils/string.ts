export const capitalize = (str: string) =>
	str.charAt(0).toUpperCase() + str.slice(1);

export const capitalizeWords = (str: string): string =>
	str.replace(/\b\w/g, char => char.toUpperCase());
