import { z } from "zod";

export const productLogActionEnum = z.enum([
	"created",
	"updated",
	"price_changed",
	"stock_changed",
	"package_added",
	"package_removed",
	"activated",
	"deactivated",
	"deleted",
]);
export type ProductLogAction = z.infer<typeof productLogActionEnum>;
