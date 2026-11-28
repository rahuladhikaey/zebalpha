"use client";

import React, { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  Camera,
  Eye,
  EyeOff,
  Globe,
  GripHorizontal,
  GripVertical,
  Loader2,
  Pencil,
  Smartphone,
  Trash2,
} from "lucide-react";
import { compressImageStrictMaxKB } from "@shared/services/uploadService";
import type { CategoryWidgetConfig, CardImageTransform } from "@/lib/categoryStorefrontTypes";

export type DeviceMode = "mobile" | "tablet" | "desktop";

export interface StudioPreviewProduct {
  id: string;
  name: string;
  brand: string;
  price: number;
  mrp: number;
  discountPercent: number;
  image_url: string;
  images: string[];
  rating: number;
  category_id: string | null;
  subcategory_id: string | null;
  storeTags: string[];
  isCombo: boolean;
}

export interface StudioPreviewBrand {
  brand_name: string;
  product_count: number;
  max_discount: number;
  min_price: number;
  primary_image: string;
  secondary_image: string;
}

export interface StudioSubcategoryRow {
  id: string;
  name: string;
  slug: string;
  image_url?: string | null;
}

export interface StudioSelection {
  widgetId: string;
  itemKind?: "slide" | "card" | "subcategory" | "brand" | "kit" | "store" | "price" | "discount";
  itemIndex?: number;
  subcategoryId?: string;
}

export const STRICT_MAX_UPLOAD_KB = 150;

/**
 * Reorder helper for drag-and-drop arrays (sections & cards)
 */
export function reorderArray<T>(list: T[], fromIdx: number, toIdx: number): T[] {
  if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= list.length || toIdx >= list.length) {
    return list;
  }
  const next = [...list];
  const [moved] = next.splice(fromIdx, 1);
  next.splice(toIdx, 0, moved);
  return next;
}

/**
 * Shared direct uploader: compresses ANY size image to <= 150 KB WebP and uploads to Cloudinary CDN.
 */
export async function uploadStudioImageFile(
  rawFile: File,
  folder: string = "category-storefront"
): Promise<{ publicUrl: string; summary: string }> {
  const isCompact = /icon|subcat|portrait|badge/i.test(folder);
  const { blob, contentType, ext, originalBytes, finalBytes } = await compressImageStrictMaxKB(
    rawFile,
    STRICT_MAX_UPLOAD_KB,
    isCompact ? 640 : 1400
  );

  if (finalBytes > STRICT_MAX_UPLOAD_KB * 1024) {
    throw new Error(`High-size image blocked (>${STRICT_MAX_UPLOAD_KB} KB).`);
  }

  const baseName = rawFile.name.replace(/\.[^.]+$/, "") || "storefront";
  const file = new File([blob], `${baseName}.${ext}`, { type: contentType });

  const fd = new FormData();
  fd.append("file", file);
  fd.append("folder", folder);

  const res = await fetch("/api/admin/category-storefront/upload", {
    method: "POST",
    body: fd,
  });

  const rawText = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(rawText);
  } catch {
    // Non-JSON response fallback
  }

  if (!res.ok || !json?.success || !json?.publicUrl) {
    throw new Error(json?.message || `Upload failed (HTTP ${res.status})`);
  }

  const origLabel =
    originalBytes >= 1024 * 1024
      ? `${(originalBytes / (1024 * 1024)).toFixed(1)} MB`
      : `${Math.max(1, Math.round(originalBytes / 1024))} KB`;
  const finalKb = Math.max(1, Math.round(finalBytes / 1024));
  const summary =
    originalBytes > finalBytes
      ? `Compressed ${origLabel} → ${finalKb} KB WebP ✓`
      : `Uploaded (${finalKb} KB) ✓`;

  return { publicUrl: String(json.publicUrl), summary };
}

/**
 * Exact mirror of Customer SmartFitImage with Canva Zoom, Fit Mode & Pan X/Y support!
 */
export function StudioSmartFitImage({
  src,
  alt,
  roundedClass = "",
  className = "",
  transform,
}: {
  src: string;
  alt: string;
  roundedClass?: string;
  className?: string;
  transform?: CardImageTransform;
}) {
  const fit = transform?.img_fit === "cover" ? "cover" : "contain";
  const zoom = Number(transform?.img_zoom || 100);
  const posX = typeof transform?.img_pos_x === "number" ? transform.img_pos_x : 50;
  const posY = typeof transform?.img_pos_y === "number" ? transform.img_pos_y : 50;

  return (
    <div className={`relative w-full h-full overflow-hidden ${roundedClass} ${className}`}>
      {fit === "contain" && (
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none absolute inset-0 w-full h-full object-cover opacity-45 scale-110 blur-xl"
        />
      )}
      <img
        src={src}
        alt={alt}
        className={`relative z-10 w-full h-full ${fit === "cover" ? "object-cover" : "object-contain"} transition-transform duration-150`}
        style={{
          objectPosition: `${posX}% ${posY}%`,
          transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
          transformOrigin: `${posX}% ${posY}%`,
        }}
      />
    </div>
  );
}

/**
 * Canva-style Direct Pointer Drag Handle to resize Banner / Card height smoothly in real time!
 */
export function ResizeHeightHandle({
  currentHeight,
  minHeight = 120,
  maxHeight = 440,
  label = "Height",
  onChange,
}: {
  currentHeight: number;
  minHeight?: number;
  maxHeight?: number;
  label?: string;
  onChange: (nextPx: number) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [livePx, setLivePx] = useState(currentHeight);
  const startYRef = useRef(0);
  const startHRef = useRef(currentHeight);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    e.preventDefault();
    startYRef.current = e.clientY;
    startHRef.current = currentHeight;
    setLivePx(currentHeight);
    setDragging(true);
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    e.stopPropagation();
    const delta = e.clientY - startYRef.current;
    const clamped = Math.max(minHeight, Math.min(maxHeight, Math.round(startHRef.current + delta)));
    setLivePx(clamped);
    onChange(clamped);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    e.stopPropagation();
    setDragging(false);
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={(e) => e.stopPropagation()}
      title="Drag up/down to resize card height (Canva style)"
      className={`group/rh relative mx-auto mt-1.5 flex items-center justify-center select-none touch-none cursor-ns-resize py-1 transition ${
        dragging ? "opacity-100" : "opacity-60 hover:opacity-100"
      }`}
    >
      <div
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-[10px] font-black shadow-sm border transition ${
          dragging
            ? "bg-amber-400 text-black border-amber-500 scale-105"
            : "bg-zinc-900/90 text-amber-300 border-zinc-700 hover:bg-amber-400 hover:text-black hover:border-amber-500"
        }`}
      >
        <GripHorizontal className="h-3 w-3" />
        <span>{dragging ? `${label}: ${livePx}px` : `Drag to Resize (${currentHeight}px)`}</span>
      </div>
    </div>
  );
}

/**
 * Direct click-to-edit inline text right on the live visual canvas.
 */
export function InlineEditableText({
  value,
  onChange,
  placeholder = "Click to type...",
  className = "",
  style,
  inputClassName = "",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  className?: string;
  style?: React.CSSProperties;
  inputClassName?: string;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <input
        type="text"
        autoFocus
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={() => setEditing(false)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            setEditing(false);
          }
        }}
        onClick={(e) => e.stopPropagation()}
        placeholder={placeholder}
        className={`rounded-lg bg-amber-50 text-zinc-950 border-2 border-amber-400 px-2 py-0.5 outline-none shadow-sm min-w-[90px] ${inputClassName}`}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      title="Click to edit text directly"
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setEditing(true);
        }
      }}
      style={style}
      className={`group/txt inline-flex items-center gap-1 cursor-text rounded-md px-0.5 -mx-0.5 hover:ring-2 hover:ring-amber-400/80 hover:bg-amber-400/15 transition ${className}`}
    >
      <span>{value || placeholder}</span>
      <Pencil className="h-3 w-3 opacity-0 group-hover/txt:opacity-80 shrink-0 text-amber-500" />
    </span>
  );
}

/**
 * Clean non-overlapping 1-click photo upload + exact size guide overlay placed strictly inside image frames.
 */
export function DirectUploadOverlay({
  sizeHint,
  folder = "category-storefront",
  onUploaded,
  onError,
  onDelete,
  alwaysVisible = false,
  compact = false,
}: {
  sizeHint: string;
  folder?: string;
  onUploaded: (url: string, summary: string) => void;
  onError?: (msg: string) => void;
  onDelete?: () => void;
  alwaysVisible?: boolean;
  compact?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const { publicUrl, summary } = await uploadStudioImageFile(file, folder);
      onUploaded(publicUrl, summary);
    } catch (err: any) {
      onError?.(err?.message || "Image upload failed");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleChange}
        onClick={(e) => e.stopPropagation()}
        className="hidden"
      />

      {/* Exact Recommended Size Badge (Top-Left, only on hover/selected so titles stay 100% clean) */}
      <span
        className={`pointer-events-none absolute top-1.5 left-1.5 z-20 rounded-md bg-black/80 text-amber-300 font-black tracking-tight backdrop-blur-sm border border-amber-400/30 transition-opacity ${
          compact ? "px-1.5 py-0.5 text-[8px]" : "px-2 py-0.5 text-[9.5px]"
        } ${alwaysVisible ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
      >
        {sizeHint}
      </span>

      {/* Top-Right Upload & Optional Delete Action Buttons */}
      <div
        className={`absolute top-1.5 right-1.5 z-30 flex items-center gap-1 transition-opacity ${
          alwaysVisible || busy ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <button
          type="button"
          disabled={busy}
          onClick={(e) => {
            e.stopPropagation();
            fileRef.current?.click();
          }}
          className={`inline-flex items-center gap-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-black shadow-lg cursor-pointer disabled:opacity-60 ${
            compact ? "px-1.5 py-1 text-[9px]" : "px-2 py-1 text-[10px]"
          }`}
          title={`Upload photo (${sizeHint} • Auto <= 150 KB WebP)`}
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Camera className="h-3 w-3" />}
          <span>{busy ? "..." : compact ? "Pic" : "Photo"}</span>
        </button>

        {onDelete && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-lg bg-red-600/95 hover:bg-red-500 text-white p-1 shadow-lg cursor-pointer"
            title="Remove card"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>
    </>
  );
}

/**
 * Wraps each section with Canva-style Drag-and-Drop Reordering (⋮⋮ grip + amber drop line) + floating toolbar.
 */
export function SectionFrameWrapper({
  widget,
  index,
  total,
  isSelected,
  isDropTarget,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onSelect,
  onMove,
  onToggleEnabled,
  onToggleWeb,
  onToggleApp,
  onDelete,
  children,
}: {
  widget: CategoryWidgetConfig;
  index: number;
  total: number;
  isSelected: boolean;
  isDropTarget?: boolean;
  onDragStart?: (index: number) => void;
  onDragOver?: (index: number) => void;
  onDragLeave?: () => void;
  onDrop?: (toIndex: number) => void;
  onSelect: () => void;
  onMove: (delta: number) => void;
  onToggleEnabled: () => void;
  onToggleWeb: () => void;
  onToggleApp: () => void;
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const handleDragOver = (e: React.DragEvent) => {
    // Only intercept section drags (card drags use card-level dataTransfer)
    if (e.dataTransfer.types.includes("application/x-studio-section")) {
      e.preventDefault();
      onDragOver?.(index);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (e.dataTransfer.types.includes("application/x-studio-section")) {
      e.preventDefault();
      onDrop?.(index);
    }
  };

  if (!widget.enabled) {
    return (
      <div
        onClick={onSelect}
        onDragOver={handleDragOver}
        onDragLeave={onDragLeave}
        onDrop={handleDrop}
        className={`mx-3 my-2 rounded-xl border border-dashed px-3 py-2 flex items-center justify-between gap-2 cursor-pointer transition ${
          isDropTarget
            ? "border-amber-400 border-t-4 bg-amber-100/70"
            : isSelected
              ? "border-amber-400 bg-amber-50/70"
              : "border-zinc-300 bg-zinc-100/80 hover:border-zinc-400"
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <EyeOff className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
          <span className="text-xs font-bold text-zinc-600 truncate">Hidden: {widget.title}</span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleEnabled();
            }}
            className="rounded-lg bg-zinc-900 text-white px-2.5 py-1 text-[10px] font-black cursor-pointer hover:bg-zinc-700"
          >
            Show Section
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="rounded-lg bg-red-100 text-red-600 p-1 cursor-pointer hover:bg-red-200"
            title="Delete Section"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onSelect}
      onDragOver={handleDragOver}
      onDragLeave={onDragLeave}
      onDrop={handleDrop}
      className={`group/sec relative transition-all cursor-pointer ${
        isDropTarget ? "border-t-4 border-amber-400 bg-amber-100/20" : ""
      } ${
        isSelected
          ? "ring-2 ring-amber-400 ring-offset-0 bg-amber-50/10"
          : "hover:ring-2 hover:ring-amber-400/50"
      }`}
    >
      {/* Floating Section Drag Handle + Action Toolbar */}
      <div
        draggable
        onDragStart={(e) => {
          e.stopPropagation();
          e.dataTransfer.setData("application/x-studio-section", String(index));
          e.dataTransfer.effectAllowed = "move";
          onDragStart?.(index);
        }}
        className={`absolute top-1.5 right-2 z-40 flex items-center gap-1 rounded-xl bg-zinc-950/95 text-white px-2 py-1 shadow-xl border border-zinc-700/80 transition-opacity ${
          isSelected ? "opacity-100" : "opacity-0 group-hover/sec:opacity-100"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <span
          className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider text-amber-300 pr-1.5 border-r border-zinc-700 cursor-grab active:cursor-grabbing"
          title="Drag section up or down to reorder!"
        >
          <GripVertical className="h-3 w-3 text-amber-400" />
          #{index + 1} {widget.widget_type.replace(/_/g, " ")}
        </span>

        <button
          type="button"
          onClick={onToggleWeb}
          title={widget.web_enabled ? "Visible on Desktop Web" : "Hidden on Desktop Web"}
          className={`p-1 rounded-md cursor-pointer ${widget.web_enabled ? "text-emerald-400 hover:bg-white/10" : "text-zinc-500 hover:bg-white/10"}`}
        >
          <Globe className="h-3 w-3" />
        </button>

        <button
          type="button"
          onClick={onToggleApp}
          title={widget.app_enabled ? "Visible on Android App" : "Hidden on Android App"}
          className={`p-1 rounded-md cursor-pointer ${widget.app_enabled ? "text-emerald-400 hover:bg-white/10" : "text-zinc-500 hover:bg-white/10"}`}
        >
          <Smartphone className="h-3 w-3" />
        </button>

        <button
          type="button"
          onClick={onToggleEnabled}
          title="Hide section"
          className="p-1 rounded-md text-zinc-200 hover:bg-white/10 cursor-pointer"
        >
          <Eye className="h-3 w-3" />
        </button>

        <button
          type="button"
          disabled={index === 0}
          onClick={() => onMove(-1)}
          title="Move section up"
          className="p-1 rounded-md text-zinc-200 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
        >
          <ArrowUp className="h-3 w-3" />
        </button>

        <button
          type="button"
          disabled={index === total - 1}
          onClick={() => onMove(1)}
          title="Move section down"
          className="p-1 rounded-md text-zinc-200 hover:bg-white/10 disabled:opacity-30 cursor-pointer"
        >
          <ArrowDown className="h-3 w-3" />
        </button>

        <button
          type="button"
          onClick={onDelete}
          title="Delete section"
          className="p-1 rounded-md text-red-400 hover:bg-red-500/20 cursor-pointer"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {children}
    </div>
  );
}
