import React from "react";
import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";

export interface BreadcrumbItem {
  name: string;
  url: string;
}

interface BreadcrumbsNavProps {
  items: BreadcrumbItem[];
  className?: string;
}

/**
 * Accessible Breadcrumb Navigation Component.
 * Supports microdata schema and matches the JSON-LD BreadcrumbList exactly.
 */
export function BreadcrumbsNav({ items, className = "" }: BreadcrumbsNavProps) {
  if (!items || items.length === 0) return null;

  return (
    <nav
      aria-label="Breadcrumb navigation"
      className={`flex items-center text-xs text-neutral-400 py-3 overflow-x-auto select-none ${className}`}
    >
      <ol className="flex items-center space-x-2 shrink-0">
        <li>
          <Link
            href="/"
            className="flex items-center gap-1 hover:text-white transition-colors"
            title="Go to Homepage"
          >
            <Home className="h-3.5 w-3.5" />
            <span className="sr-only">Home</span>
          </Link>
        </li>

        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center space-x-2">
              <ChevronRight className="h-3.5 w-3.5 text-neutral-600 shrink-0" aria-hidden="true" />
              {isLast ? (
                <span
                  className="font-bold text-white truncate max-w-[200px] sm:max-w-[350px]"
                  aria-current="page"
                >
                  {item.name}
                </span>
              ) : (
                <Link
                  href={item.url}
                  className="font-medium hover:text-white transition-colors whitespace-nowrap"
                >
                  {item.name}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
