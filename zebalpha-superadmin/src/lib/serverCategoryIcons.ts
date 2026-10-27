/**
 * Server-safe re-export of category icon utilities from shared constants.
 * Free of "use client" and React DOM bindings for Route Handlers.
 */
export {
  type CategoryIconKey,
  type CategoryIconMeta,
  CATEGORY_ICON_REGISTRY,
  resolveCategoryIcon,
  getLocalizedCategoryName,
} from "../../../shared/constants/categoryIcons";
