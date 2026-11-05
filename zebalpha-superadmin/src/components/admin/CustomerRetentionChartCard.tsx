"use client";

import { useState, useMemo } from "react";

export interface RetentionSegment {
  id: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
  description: string;
  isUnavailable?: boolean;
}

export interface RetentionCardData {
  totalCustomers: number;
  registeredCount: number;
  guestCount: number;
  activeCount: number;
  inactiveCount: number;
  repeatPurchaseRate: number;
  retentionRate7D: number;
  retentionRate30D: number;
  retentionRate90D: number;
  dateFilterApplied?: string;
  segments: RetentionSegment[];
}

interface CustomerRetentionChartCardProps {
  data?: RetentionCardData | null;
  loading?: boolean;
  onDateFilterChange?: (filter: "today" | "last7days" | "last30days" | "last90days" | "all" | "custom", start?: string, end?: string) => void;
  activeDateFilter?: string;
}

export default function CustomerRetentionChartCard({
  data,
  loading = false,
  onDateFilterChange,
  activeDateFilter = "all",
}: CustomerRetentionChartCardProps) {
  const [hoveredSlice, setHoveredSlice] = useState<RetentionSegment | null>(null);
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomRange, setShowCustomRange] = useState(false);

  const segments = useMemo(() => data?.segments || [], [data?.segments]);
  const totalCount = useMemo(() => {
    return segments.reduce((sum, s) => sum + (s.isUnavailable ? 0 : s.count), 0);
  }, [segments]);

  // Compute SVG Donut Slices Trigonometrically
  const slices = useMemo(() => {
    if (!segments || segments.length === 0 || totalCount === 0) return [];

    let currentAngle = -Math.PI / 2; // Start from top 12 o'clock
    const cx = 160;
    const cy = 160;
    const outerR = 135;
    const innerR = 75;

    return segments
      .filter((s) => !s.isUnavailable && s.count > 0)
      .map((seg) => {
        const sliceAngle = (seg.count / totalCount) * 2 * Math.PI;
        const startAngle = currentAngle;
        const endAngle = currentAngle + sliceAngle;
        currentAngle = endAngle;

        // Outer arc points
        const x1 = cx + outerR * Math.cos(startAngle);
        const y1 = cy + outerR * Math.sin(startAngle);
        const x2 = cx + outerR * Math.cos(endAngle);
        const y2 = cy + outerR * Math.sin(endAngle);

        // Inner arc points
        const x3 = cx + innerR * Math.cos(endAngle);
        const y3 = cy + innerR * Math.sin(endAngle);
        const x4 = cx + innerR * Math.cos(startAngle);
        const y4 = cy + innerR * Math.sin(startAngle);

        const largeArc = sliceAngle > Math.PI ? 1 : 0;

        // Path: Outer Arc -> Line to Inner -> Inner Arc -> Close
        const pathData = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4} Z`;

        // Mid point for percentage label placement
        const midAngle = startAngle + sliceAngle / 2;
        const labelR = (outerR + innerR) / 2;
        const labelX = cx + labelR * Math.cos(midAngle);
        const labelY = cy + labelR * Math.sin(midAngle);

        return {
          ...seg,
          pathData,
          labelX,
          labelY,
          sliceAngle,
          percentage: Number(((seg.count / totalCount) * 100).toFixed(1)),
        };
      });
  }, [segments, totalCount]);

  const handleFilterClick = (filter: "today" | "last7days" | "last30days" | "last90days" | "all" | "custom") => {
    if (filter === "custom") {
      setShowCustomRange(!showCustomRange);
    } else {
      setShowCustomRange(false);
      onDateFilterChange?.(filter);
    }
  };

  const handleApplyCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      onDateFilterChange?.("custom", customStart, customEnd);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#0c1322] via-[#090d16] to-[#04070e] border border-sky-950/70 p-6 sm:p-8 shadow-2xl text-white">
      {/* Ambient background glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-sky-500/5 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header & Date Range Filter Toolbar */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-sky-400 bg-sky-500/10 px-2.5 py-0.5 rounded-full border border-sky-500/20">
              Customer Analytics
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              Flipkart / Meesho Architecture
            </span>
          </div>
          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
            Customer Retention Rate & Cohort Distribution
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real database segmentation tracking acquisition, repeat purchases, and inactivity
          </p>
        </div>

        {/* Date Filter Buttons */}
        <div className="flex flex-wrap items-center gap-1.5 bg-black/60 p-1 rounded-2xl border border-slate-800 self-start lg:self-center">
          {[
            { id: "all", label: "All Time" },
            { id: "today", label: "Today" },
            { id: "last7days", label: "7 Days" },
            { id: "last30days", label: "30 Days" },
            { id: "last90days", label: "90 Days" },
            { id: "custom", label: "Custom" },
          ].map((btn) => (
            <button
              key={btn.id}
              onClick={() => handleFilterClick(btn.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeDateFilter === btn.id
                  ? "bg-white text-black font-black shadow-md shadow-white/10"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom Date Picker Drawer */}
      {showCustomRange && (
        <form onSubmit={handleApplyCustom} className="mt-4 p-4 rounded-2xl bg-black/80 border border-slate-800 flex flex-wrap items-center gap-4 text-xs font-bold">
          <div>
            <label className="text-slate-400 block mb-1">Start Date:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white outline-none focus:border-white"
            />
          </div>
          <div>
            <label className="text-slate-400 block mb-1">End Date:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-white outline-none focus:border-white"
            />
          </div>
          <button
            type="submit"
            className="mt-5 px-4 py-2 rounded-xl bg-sky-400 text-black font-black uppercase tracking-wider hover:bg-sky-300 transition-colors cursor-pointer"
          >
            Apply Range
          </button>
        </form>
      )}

      {/* Main Grid: Left Chart + Right Legend */}
      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center mt-6">
        {/* LEFT COLUMN: Large Donut / Pie Chart (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col items-center justify-center">
          <div className="relative w-72 h-72 sm:w-80 sm:h-80 flex items-center justify-center">
            {loading ? (
              <div className="w-64 h-64 rounded-full border-4 border-slate-800 border-t-sky-400 animate-spin"></div>
            ) : totalCount === 0 ? (
              <div className="text-center p-6">
                <p className="text-sm font-bold text-slate-400">No customer records in selected range.</p>
              </div>
            ) : (
              <>
                <svg
                  viewBox="0 0 320 320"
                  className="w-full h-full transform transition-all duration-300 drop-shadow-xl"
                >
                  <g>
                    {slices.map((slice) => {
                      const isHovered = hoveredSlice?.id === slice.id;
                      return (
                        <g key={slice.id} className="cursor-pointer transition-all duration-200">
                          <path
                            d={slice.pathData}
                            fill={slice.color}
                            stroke="#0B132B"
                            strokeWidth="3"
                            className={`transition-all duration-200 ${
                              isHovered ? "opacity-100 brightness-125 filter drop-shadow(0 0 8px " + slice.color + ")" : "opacity-90 hover:opacity-100"
                            }`}
                            onMouseEnter={() => setHoveredSlice(slice)}
                            onMouseLeave={() => setHoveredSlice(null)}
                          />
                          {/* Slices with >= 8% show on-chart percentage label */}
                          {slice.percentage >= 8 && (
                            <text
                              x={slice.labelX}
                              y={slice.labelY}
                              fill="#000000"
                              fontSize="11"
                              fontWeight="900"
                              textAnchor="middle"
                              dominantBaseline="central"
                              className="pointer-events-none select-none font-mono"
                            >
                              {slice.percentage}%
                            </text>
                          )}
                        </g>
                      );
                    })}
                  </g>
                </svg>

                {/* Central Donut Hole Info (Dynamic on hover) */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
                  {hoveredSlice ? (
                    <div className="animate-in fade-in duration-150">
                      <span className="text-[10px] font-black uppercase tracking-wider block" style={{ color: hoveredSlice.color }}>
                        {hoveredSlice.name}
                      </span>
                      <p className="text-2xl sm:text-3xl font-black text-white mt-0.5">
                        {hoveredSlice.count}
                      </p>
                      <span className="text-xs font-mono font-bold text-slate-300">
                        {hoveredSlice.percentage}% of cohort
                      </span>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">
                        REPEAT RATE
                      </span>
                      <p className="text-3xl sm:text-4xl font-black text-white mt-0.5">
                        {data?.repeatPurchaseRate ?? 0}%
                      </p>
                      <span className="text-[11px] font-bold text-slate-400">
                        {data?.totalCustomers ?? 0} total customers
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Legend & Statistics (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/60 text-[10px] font-black uppercase text-slate-400 tracking-wider">
            <span>Customer Segment</span>
            <div className="flex items-center gap-6">
              <span>Customer Count</span>
              <span className="w-14 text-right">Share</span>
            </div>
          </div>

          {segments.map((seg) => {
            const isHovered = hoveredSlice?.id === seg.id;
            return (
              <div
                key={seg.id}
                onMouseEnter={() => setHoveredSlice(seg)}
                onMouseLeave={() => setHoveredSlice(null)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  isHovered
                    ? "bg-slate-800/80 border-slate-600 shadow-lg"
                    : "bg-slate-900/40 border-slate-800/80 hover:bg-slate-850"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                      style={{ backgroundColor: seg.color }}
                    ></span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{seg.name}</span>
                        {seg.isUnavailable && (
                          <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                            Unavailable
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block">{seg.description}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <span className="text-sm font-black font-mono text-white">
                      {seg.count}
                    </span>
                    <span
                      className="w-14 text-right text-xs font-black font-mono px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${seg.color}20`,
                        color: seg.color,
                        border: `1px solid ${seg.color}40`,
                      }}
                    >
                      {seg.percentage}%
                    </span>
                  </div>
                </div>

                {/* Micro Progress Bar */}
                <div className="h-1.5 w-full bg-slate-950 rounded-full mt-2.5 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${seg.percentage}%`, backgroundColor: seg.color }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Retention Metrics Summary Row */}
      <div className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-3 pt-6 mt-6 border-t border-slate-800/80">
        <div className="p-3 bg-black/40 rounded-xl border border-slate-800/60 text-center">
          <span className="text-[9px] font-black uppercase text-slate-400">Total Registered</span>
          <p className="text-lg font-black text-white mt-0.5">{data?.registeredCount ?? 0}</p>
        </div>
        <div className="p-3 bg-black/40 rounded-xl border border-slate-800/60 text-center">
          <span className="text-[9px] font-black uppercase text-slate-400">Guest Shoppers</span>
          <p className="text-lg font-black text-white mt-0.5">{data?.guestCount ?? 0}</p>
        </div>
        <div className="p-3 bg-black/40 rounded-xl border border-slate-800/60 text-center">
          <span className="text-[9px] font-black uppercase text-slate-400">Active vs Inactive</span>
          <p className="text-lg font-black text-emerald-400 mt-0.5">
            {data?.activeCount ?? 0} <span className="text-xs text-rose-400 font-bold">/ {data?.inactiveCount ?? 0}</span>
          </p>
        </div>
        <div className="p-3 bg-black/40 rounded-xl border border-slate-800/60 text-center">
          <span className="text-[9px] font-black uppercase text-slate-400">30-Day Cohort Retention</span>
          <p className="text-lg font-black text-sky-400 mt-0.5">{data?.retentionRate30D ?? 0}%</p>
        </div>
      </div>
    </div>
  );
}

