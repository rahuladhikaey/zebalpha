"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { Product } from "@/types/products";
import { Category } from "@/types/categories";
import {
  exportDashboardExcel,
  exportRevenueReportExcel,
  exportPaymentsExcel,
  exportDeliveryExcel,
  exportCustomDataExcel,
} from "@/utils/excelExport";

type Order = {
  id: number;
  customer_name: string;
  phone: string;
  address: string;
  product_details: string;
  order_status: string;
  payment_status: string;
  payment_method: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  shipment_id?: string;
  shiprocket_order_id?: string;
  total_amount: number;
  created_at: string;
};

type DashboardOverviewProps = {
  orders: Order[];
  products: Product[];
  customers: any[];
  categories: Category[];
  loading: boolean;
  onRefresh: () => Promise<void>;
};

type DateFilterType =
  | "today"
  | "yesterday"
  | "last7days"
  | "last30days"
  | "thisMonth"
  | "lastMonth"
  | "thisYear"
  | "custom";

export default function DashboardOverview({
  orders,
  products,
  customers,
  categories,
  loading,
  onRefresh,
}: DashboardOverviewProps) {
  // Date Filtering States
  const [dateFilter, setDateFilter] = useState<DateFilterType>("last30days");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Export States
  const [exportingReport, setExportingReport] = useState<string | null>(null);

  const handleReportExport = async (type: string, exportFn: () => void) => {
    setExportingReport(type);
    await new Promise((resolve) => setTimeout(resolve, 800)); // smooth user feedback spinner
    try {
      exportFn();
    } catch (e) {
      console.error("Export error:", e);
    }
    setExportingReport(null);
  };

  // 🔮 INTERACTIVE REPORTS STATES
  const [activeReportId, setActiveReportId] = useState<string | null>(null);
  const [reportStartDate, setReportStartDate] = useState("");
  const [reportEndDate, setReportEndDate] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportStatus, setReportStatus] = useState("All");
  const [reportCategory, setReportCategory] = useState("All");
  const [generatingExcel, setGeneratingExcel] = useState(false);

  // Chart States
  const [trendType, setTrendType] = useState<"revenue" | "orders">("revenue");
  const [hoveredPoint, setHoveredPoint] = useState<{
    label: string;
    value: string | number;
    x: number;
    y: number;
  } | null>(null);

  // Auto Refresh States
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30); // in seconds
  const [secondsToRefresh, setSecondsToRefresh] = useState(30);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto Refresh Countdown timer
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);

    if (autoRefreshEnabled && !loading) {
      setSecondsToRefresh(refreshInterval);
      timerRef.current = setInterval(() => {
        setSecondsToRefresh((prev) => {
          if (prev <= 1) {
            onRefresh();
            return refreshInterval;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefreshEnabled, refreshInterval, loading, onRefresh]);

  // Date Parsing Helpers
  const parseDate = (dateStr: string) => new Date(dateStr);

  const getStartOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const filterDateRange = useMemo(() => {
    const now = new Date();
    const startOfToday = getStartOfToday();

    let start = new Date(0); // Epoch
    let end = new Date(); // Now

    switch (dateFilter) {
      case "today":
        start = startOfToday;
        break;
      case "yesterday":
        start = new Date(startOfToday);
        start.setDate(start.getDate() - 1);
        end = new Date(startOfToday);
        break;
      case "last7days":
        start = new Date(now);
        start.setDate(start.getDate() - 7);
        break;
      case "last30days":
        start = new Date(now);
        start.setDate(start.getDate() - 30);
        break;
      case "thisMonth":
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case "lastMonth":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        break;
      case "thisYear":
        start = new Date(now.getFullYear(), 0, 1);
        break;
      case "custom":
        if (customStartDate) start = new Date(customStartDate);
        if (customEndDate) {
          end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
        }
        break;
    }
    return { start, end };
  }, [dateFilter, customStartDate, customEndDate]);

  // Filtered Orders & Customers
  const filteredOrders = useMemo(() => {
    const { start, end } = filterDateRange;
    return orders.filter((order) => {
      const orderDate = parseDate(order.created_at);
      return orderDate >= start && orderDate <= end;
    });
  }, [orders, filterDateRange]);

  const filteredCustomers = useMemo(() => {
    const { start, end } = filterDateRange;
    return customers.filter((customer) => {
      if (!customer.saved_at) return false;
      const regDate = parseDate(customer.saved_at);
      return regDate >= start && regDate <= end;
    });
  }, [customers, filterDateRange]);

  // Format currency helper for reporting
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(val);
  };



  // Initialize report modal start and end dates based on dashboard dateFilter
  useEffect(() => {
    if (activeReportId) {
      const { start, end } = filterDateRange;
      const formatToInputDate = (d: Date) => {
        if (!d || isNaN(d.getTime())) return "";
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const defaultStart = new Date(startOfToday);
      defaultStart.setDate(defaultStart.getDate() - 30);

      setReportStartDate(formatToInputDate(start.getTime() === 0 ? defaultStart : start));
      setReportEndDate(formatToInputDate(end));
      setReportSearch("");
      setReportStatus("All");
      setReportCategory("All");
    }
  }, [activeReportId, filterDateRange]);

  // Resolve filter-matched preview data for report viewer
  const reportData = useMemo(() => {
    if (!activeReportId) return { headers: [], rows: [], totalRecords: 0, totalAmount: null };

    const startDate = reportStartDate ? new Date(reportStartDate) : new Date(0);
    const endDate = reportEndDate ? new Date(reportEndDate) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const matchesDate = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= startDate && d <= endDate;
    };

    const matchesSearch = (text: string) => {
      if (!reportSearch) return true;
      return String(text).toLowerCase().includes(reportSearch.toLowerCase());
    };

    if (activeReportId === "dashboard") {
      const filtered = orders.filter((o) => matchesDate(o.created_at));
      const valid = filtered.filter((o) => o.order_status !== "CANCELLED" && o.order_status !== "RETURNED");
      const rev = valid.reduce((sum, o) => sum + o.total_amount, 0);
      const profit = rev * 0.35;
      const aov = valid.length > 0 ? rev / valid.length : 0;
      const lowStk = products.filter((p) => p.stock !== undefined && p.stock <= (p.low_stock_limit || 5)).length;

      const headers = ["Metric Category", "Indicator / Statistic", "Value"];
      const rows = [
        ["Financials", "Total Sales Revenue", formatCurrency(rev)],
        ["Financials", "Estimated Profit (35%)", formatCurrency(profit)],
        ["Financials", "Average Order Value (AOV)", formatCurrency(aov)],
        ["Orders", "Total Orders Placed", filtered.length],
        ["Orders", "Delivered Orders", filtered.filter(o => o.order_status === "DELIVERED").length],
        ["Orders", "Shipped Orders", filtered.filter(o => o.order_status === "SHIPPED").length],
        ["Orders", "Processing Orders", filtered.filter(o => o.order_status === "PROCESSING").length],
        ["Orders", "Pending Orders", filtered.filter(o => o.order_status === "PENDING").length],
        ["Orders", "Cancelled Orders", filtered.filter(o => o.order_status === "CANCELLED").length],
        ["Customers", "Total Customers", customers.length],
        ["Products", "Cataloged Products", products.length],
        ["Products", "Low Stock items", lowStk],
      ];

      const filteredRows = rows.filter(row => 
        matchesSearch(String(row[0])) || matchesSearch(String(row[1])) || matchesSearch(String(row[2]))
      );

      return {
        headers,
        rows: filteredRows,
        totalRecords: filteredRows.length,
        totalAmount: rev
      };
    }

    if (activeReportId === "revenue") {
      const filtered = orders.filter((o) => 
        matchesDate(o.created_at) && 
        o.order_status !== "CANCELLED" && 
        o.order_status !== "RETURNED"
      );

      const dayGroups: Record<string, Order[]> = {};
      filtered.forEach((o) => {
        const dateKey = new Date(o.created_at).toLocaleDateString("en-IN");
        if (!dayGroups[dateKey]) dayGroups[dateKey] = [];
        dayGroups[dateKey].push(o);
      });

      const headers = [
        "Reporting Date",
        "Number of Orders",
        "Gross Revenue",
        "Estimated Refund Amount",
        "Net Revenue",
        "Average Order Value (AOV)",
      ];

      const rows = Object.entries(dayGroups).map(([dateStr, dayOrders]) => {
        const grossRev = dayOrders.reduce((sum, o) => sum + o.total_amount, 0);
        const refund = 0;
        const netRev = grossRev - refund;
        const aov = dayOrders.length > 0 ? netRev / dayOrders.length : 0;
        return [dateStr, dayOrders.length, grossRev, refund, netRev, aov];
      })
      .filter(row => matchesSearch(String(row[0])))
      .sort((a, b) => new Date(String(a[0]).split("/").reverse().join("-")).getTime() - new Date(String(b[0]).split("/").reverse().join("-")).getTime());

      const totalRev = rows.reduce((sum, r) => sum + Number(r[4]), 0);

      return {
        headers,
        rows,
        totalRecords: rows.length,
        totalAmount: totalRev
      };
    }

    if (activeReportId === "payments") {
      const filtered = orders.filter((o) => {
        const matchesD = matchesDate(o.created_at);
        const matchesS = reportStatus === "All" || o.payment_status === reportStatus;
        const matchesC = reportCategory === "All" || 
          (reportCategory === "COD" && o.payment_method === "COD") ||
          (reportCategory === "Online" && o.payment_method !== "COD");
        const matchesT = matchesSearch(o.customer_name) || matchesSearch(String(o.id)) || matchesSearch(o.razorpay_order_id || "");
        return matchesD && matchesS && matchesC && matchesT;
      });

      const headers = [
        "Order ID",
        "Payment Transaction Date",
        "Customer Name",
        "Payment Mode / Gateway",
        "Payment Gateway Order ID",
        "Payment Gateway Transaction ID",
        "Transaction Amount",
        "Payment Settlement Status",
      ];

      const rows = filtered.map((o) => [
        `#${o.id}`,
        new Date(o.created_at).toLocaleString("en-IN"),
        o.customer_name || "N/A",
        o.payment_method || "COD",
        o.razorpay_order_id || "N/A",
        o.razorpay_payment_id || "N/A",
        o.total_amount,
        o.payment_status || "PENDING",
      ]);

      const totalAmt = rows.reduce((sum, r) => sum + Number(r[6]), 0);

      return {
        headers,
        rows,
        totalRecords: rows.length,
        totalAmount: totalAmt
      };
    }

    if (activeReportId === "delivery") {
      const filtered = orders.filter((o) => {
        const matchesD = matchesDate(o.created_at);
        const matchesS = reportStatus === "All" || o.order_status === reportStatus;
        const matchesT = matchesSearch(o.customer_name) || matchesSearch(o.phone) || matchesSearch(o.shipment_id || "");
        return matchesD && matchesS && matchesT;
      });

      const headers = [
        "Order ID",
        "Order Dispatch Date",
        "Customer Name",
        "Contact Phone",
        "Delivery Address",
        "Shipment Logistics ID",
        "Courier Order ID",
        "Delivery Status",
        "Amount to Collect",
        "Payment Method",
      ];

      const rows = filtered.map((o) => [
        `#${o.id}`,
        new Date(o.created_at).toLocaleString("en-IN"),
        o.customer_name || "N/A",
        o.phone || "N/A",
        o.address || "N/A",
        o.shipment_id || "N/A",
        o.shiprocket_order_id || "N/A",
        o.order_status || "PENDING",
        o.payment_status === "COMPLETE" ? 0 : o.total_amount,
        o.payment_method || "COD",
      ]);

      const totalAmt = rows.reduce((sum, r) => sum + Number(r[8]), 0);

      return {
        headers,
        rows,
        totalRecords: rows.length,
        totalAmount: totalAmt
      };
    }

    return { headers: [], rows: [], totalRecords: 0, totalAmount: null };
  }, [activeReportId, reportStartDate, reportEndDate, reportSearch, reportStatus, reportCategory, orders, products, customers, categories]);

  // Generate Excel Spreadsheet
  const handleGenerateXLSX = async () => {
    if (!activeReportId) return;
    setGeneratingExcel(true);
    await new Promise((resolve) => setTimeout(resolve, 800));

    try {
      const reportName = [
        { id: "dashboard", label: "Dashboard Summary" },
        { id: "revenue", label: "Revenue Report" },
        { id: "payments", label: "Payments Ledger" },
        { id: "delivery", label: "Delivery Manifests" },
      ].find(r => r.id === activeReportId)?.label || "Report";

      const filename = `AsaliSwad_${activeReportId}_Filtered`;
      const dateRangeStr = `${reportStartDate} to ${reportEndDate}`;
      const statsInfo = [`Date Filter Applied: ${dateRangeStr}`];
      if (reportSearch) statsInfo.push(`Search Applied: "${reportSearch}"`);
      if (reportStatus !== "All") statsInfo.push(`Status Filter: ${reportStatus}`);
      if (reportCategory !== "All") statsInfo.push(`Category/Filter Value: ${reportCategory}`);

      let finalRows = [...reportData.rows];
      if (activeReportId === "revenue") {
        const totalOrders = finalRows.reduce((sum, r) => sum + Number(r[1]), 0);
        const totalGross = finalRows.reduce((sum, r) => sum + Number(r[2]), 0);
        const totalNet = finalRows.reduce((sum, r) => sum + Number(r[4]), 0);
        const avgAOV = totalOrders > 0 ? totalNet / totalOrders : 0;
        finalRows.push([], ["TOTALS SUMMARY", totalOrders, totalGross, 0, totalNet, avgAOV]);
      } else if (activeReportId === "payments") {
        const totalAmt = finalRows.reduce((sum, r) => sum + Number(r[6]), 0);
        finalRows.push([], ["TOTALS", "", "", "", "", "", totalAmt, ""]);
      } else if (activeReportId === "delivery") {
        const totalAmt = finalRows.reduce((sum, r) => sum + Number(r[8]), 0);
        finalRows.push([], ["TOTAL COD OUTSTANDING", "", "", "", "", "", "", "", totalAmt, ""]);
      }

      exportCustomDataExcel(
        reportName,
        reportData.headers,
        finalRows,
        filename,
        statsInfo
      );
    } catch (e) {
      console.error("Generate Excel Error:", e);
    }
    setGeneratingExcel(false);
  };

  // 1. REVENUE METRICS
  const revenueStats = useMemo(() => {
    // We only count revenue from orders that are NOT Cancelled and NOT Returned
    const validOrders = filteredOrders.filter(
      (o) => o.order_status !== "CANCELLED" && o.order_status !== "RETURNED"
    );

    const totalRevenue = validOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const totalProfit = totalRevenue * 0.35; // 35% estimated gross profit margin
    const aov = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;

    // Daily/Yesterday/Weekly/Monthly calculations for compared period
    const startOfToday = getStartOfToday();
    const todayOrders = validOrders.filter(
      (o) => parseDate(o.created_at) >= startOfToday
    );
    const todayRevenue = todayOrders.reduce((sum, o) => sum + o.total_amount, 0);

    const yesterdayStart = new Date(startOfToday);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    const yesterdayOrders = validOrders.filter((o) => {
      const d = parseDate(o.created_at);
      return d >= yesterdayStart && d < startOfToday;
    });
    const yesterdayRevenue = yesterdayOrders.reduce((sum, o) => sum + o.total_amount, 0);

    const now = new Date();
    const thisWeekStart = new Date(now);
    thisWeekStart.setDate(thisWeekStart.getDate() - now.getDay());
    thisWeekStart.setHours(0, 0, 0, 0);
    const thisWeekOrders = validOrders.filter(
      (o) => parseDate(o.created_at) >= thisWeekStart
    );
    const thisWeekRevenue = thisWeekOrders.reduce((sum, o) => sum + o.total_amount, 0);

    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthOrders = validOrders.filter(
      (o) => parseDate(o.created_at) >= thisMonthStart
    );
    const thisMonthRevenue = thisMonthOrders.reduce((sum, o) => sum + o.total_amount, 0);

    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    const lastMonthOrders = validOrders.filter((o) => {
      const d = parseDate(o.created_at);
      return d >= lastMonthStart && d <= lastMonthEnd;
    });
    const lastMonthRevenue = lastMonthOrders.reduce((sum, o) => sum + o.total_amount, 0);

    return {
      totalRevenue,
      todayRevenue,
      yesterdayRevenue,
      thisWeekRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      totalProfit,
      aov,
    };
  }, [filteredOrders]);

  // 2. ORDER METRICS
  const orderStats = useMemo(() => {
    const startOfToday = getStartOfToday();
    const totalOrders = filteredOrders.length;
    const todayOrders = filteredOrders.filter(
      (o) => parseDate(o.created_at) >= startOfToday
    ).length;

    const pending = filteredOrders.filter((o) => o.order_status === "PENDING").length;
    const processing = filteredOrders.filter((o) => o.order_status === "PROCESSING").length;
    const shipped = filteredOrders.filter((o) => o.order_status === "SHIPPED").length;
    const delivered = filteredOrders.filter((o) => o.order_status === "DELIVERED").length;
    const cancelled = filteredOrders.filter((o) => o.order_status === "CANCELLED").length;
    const returned = filteredOrders.filter((o) => o.order_status === "RETURNED").length;
    const preOrder = filteredOrders.filter((o) => o.order_status === "PRE_ORDER").length;

    return {
      totalOrders,
      todayOrders,
      pending,
      processing,
      shipped,
      delivered,
      cancelled,
      returned,
      preOrder,
    };
  }, [filteredOrders]);

  // 3. CUSTOMER METRICS
  const customerStats = useMemo(() => {
    const totalCustomers = customers.length;
    const startOfToday = getStartOfToday();

    const newToday = customers.filter(
      (c) => c.saved_at && parseDate(c.saved_at) >= startOfToday
    ).length;

    const now = new Date();
    const sevenDaysAgo = new Date(now);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newThisWeek = customers.filter(
      (c) => c.saved_at && parseDate(c.saved_at) >= sevenDaysAgo
    ).length;

    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const newThisMonth = customers.filter(
      (c) => c.saved_at && parseDate(c.saved_at) >= startOfMonth
    ).length;

    // Active customers: Unique emails that placed an order in filtered range
    const orderEmails = new Set(filteredOrders.map((o) => o.customer_name).filter(Boolean));
    const activeCustomers = orderEmails.size;

    // Returning customers: Emails that appear in more than 1 order in all orders
    const emailCounts: Record<string, number> = {};
    orders.forEach((o) => {
      if (o.customer_name) {
        emailCounts[o.customer_name] = (emailCounts[o.customer_name] || 0) + 1;
      }
    });
    const returningCustomers = Object.values(emailCounts).filter((c) => c > 1).length;

    return {
      totalCustomers,
      newToday,
      newThisWeek,
      newThisMonth,
      activeCustomers,
      returningCustomers,
    };
  }, [customers, orders, filteredOrders]);

  // 4. PRODUCT METRICS
  const productStats = useMemo(() => {
    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.status !== "inactive").length;
    const outOfStock = products.filter((p) => p.stock === 0).length;
    const lowStock = products.filter(
      (p) => p.stock !== undefined && p.stock <= (p.low_stock_limit || 5)
    ).length;

    // Best Selling Products calculation
    const salesMap: Record<string, { qty: number; revenue: number; name: string }> = {};

    filteredOrders.forEach((order) => {
      if (order.order_status === "CANCELLED" || order.order_status === "RETURNED") return;
      try {
        const items = JSON.parse(order.product_details);
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const name = item.name || item.product_name || "Unknown Product";
            const qty = Number(item.quantity) || 1;
            const price = Number(item.price) || 0;
            if (!salesMap[name]) {
              salesMap[name] = { qty: 0, revenue: 0, name };
            }
            salesMap[name].qty += qty;
            salesMap[name].revenue += price * qty;
          });
        }
      } catch (e) {}
    });

    const bestSelling = Object.values(salesMap)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);

    // Recently added products
    const recentlyAdded = [...products]
      .sort((a, b) => b.id - a.id)
      .slice(0, 5);

    return {
      totalProducts,
      activeProducts,
      outOfStock,
      lowStock,
      bestSelling,
      recentlyAdded,
    };
  }, [products, filteredOrders]);

  // 5. DELIVERY STATUS
  const deliveryStats = useMemo(() => {
    const readyToShip = orderStats.processing + orderStats.pending;
    const outForDelivery = orderStats.shipped;
    const startOfToday = getStartOfToday();
    const deliveredToday = filteredOrders.filter(
      (o) => o.order_status === "DELIVERED" && parseDate(o.created_at) >= startOfToday
    ).length;

    return {
      readyToShip,
      outForDelivery,
      deliveredToday,
    };
  }, [orderStats, filteredOrders]);

  // 6. TREND CHART DATA
  const trendChartData = useMemo(() => {
    const now = new Date();
    const dataPoints: { label: string; revenue: number; orders: number }[] = [];
    let formatLabel = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" });

    if (dateFilter === "today" || dateFilter === "yesterday") {
      const baseDate = dateFilter === "today" ? getStartOfToday() : new Date(getStartOfToday().setDate(getStartOfToday().getDate() - 1));
      for (let i = 0; i < 24; i += 3) {
        const timePoint = new Date(baseDate);
        timePoint.setHours(i);
        const timePointEnd = new Date(timePoint);
        timePointEnd.setHours(i + 3);

        const periodOrders = filteredOrders.filter((o) => {
          const d = parseDate(o.created_at);
          return d >= timePoint && d < timePointEnd;
        });

        const rev = periodOrders
          .filter((o) => o.order_status !== "CANCELLED" && o.order_status !== "RETURNED")
          .reduce((sum, o) => sum + o.total_amount, 0);

        dataPoints.push({
          label: `${i}:00`,
          revenue: rev,
          orders: periodOrders.length,
        });
      }
    } else if (dateFilter === "last7days") {
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        d.setHours(0, 0, 0, 0);
        const nextDay = new Date(d);
        nextDay.setDate(d.getDate() + 1);

        const dayOrders = filteredOrders.filter((o) => {
          const od = parseDate(o.created_at);
          return od >= d && od < nextDay;
        });

        const rev = dayOrders
          .filter((o) => o.order_status !== "CANCELLED" && o.order_status !== "RETURNED")
          .reduce((sum, o) => sum + o.total_amount, 0);

        dataPoints.push({
          label: formatLabel(d),
          revenue: rev,
          orders: dayOrders.length,
        });
      }
    } else if (dateFilter === "thisMonth" || dateFilter === "last30days") {
      const days = dateFilter === "thisMonth" ? now.getDate() : 30;
      const chunks = Math.ceil(days / 6);

      for (let i = chunks - 1; i >= 0; i--) {
        const dEnd = new Date(now);
        dEnd.setDate(dEnd.getDate() - i * 5);
        dEnd.setHours(23, 59, 59, 999);

        const dStart = new Date(dEnd);
        dStart.setDate(dStart.getDate() - 4);
        dStart.setHours(0, 0, 0, 0);

        const chunkOrders = filteredOrders.filter((o) => {
          const od = parseDate(o.created_at);
          return od >= dStart && od <= dEnd;
        });

        const rev = chunkOrders
          .filter((o) => o.order_status !== "CANCELLED" && o.order_status !== "RETURNED")
          .reduce((sum, o) => sum + o.total_amount, 0);

        dataPoints.push({
          label: `${formatLabel(dStart)} - ${dEnd.getDate()}`,
          revenue: rev,
          orders: chunkOrders.length,
        });
      }
    } else if (dateFilter === "thisYear") {
      const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      for (let i = 0; i <= now.getMonth(); i++) {
        const monthOrders = filteredOrders.filter((o) => {
          const od = parseDate(o.created_at);
          return od.getFullYear() === now.getFullYear() && od.getMonth() === i;
        });

        const rev = monthOrders
          .filter((o) => o.order_status !== "CANCELLED" && o.order_status !== "RETURNED")
          .reduce((sum, o) => sum + o.total_amount, 0);

        dataPoints.push({
          label: months[i],
          revenue: rev,
          orders: monthOrders.length,
        });
      }
    } else {
      const totalTime = filterDateRange.end.getTime() - filterDateRange.start.getTime();
      const interval = totalTime / 6;

      for (let i = 0; i < 6; i++) {
        const tStart = new Date(filterDateRange.start.getTime() + i * interval);
        const tEnd = new Date(filterDateRange.start.getTime() + (i + 1) * interval);

        const intOrders = filteredOrders.filter((o) => {
          const od = parseDate(o.created_at);
          return od >= tStart && od < tEnd;
        });

        const rev = intOrders
          .filter((o) => o.order_status !== "CANCELLED" && o.order_status !== "RETURNED")
          .reduce((sum, o) => sum + o.total_amount, 0);

        dataPoints.push({
          label: formatLabel(tStart),
          revenue: rev,
          orders: intOrders.length,
        });
      }
    }

    return dataPoints;
  }, [filteredOrders, dateFilter, filterDateRange]);

  // 7. DONUT CHART: PAYMENT METHOD DISTRIBUTION
  const paymentDistribution = useMemo(() => {
    const paymentMap: Record<string, number> = {};
    filteredOrders.forEach((o) => {
      if (o.order_status === "CANCELLED") return;
      const method = o.payment_method || "COD";
      paymentMap[method] = (paymentMap[method] || 0) + 1;
    });

    const total = Object.values(paymentMap).reduce((a, b) => a + b, 0);
    return Object.entries(paymentMap).map(([key, count]) => ({
      name: key === "COD" ? "Cash on Delivery" : key === "ONLINE" || key === "RAZORPAY" ? "Razorpay" : key,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    }));
  }, [filteredOrders]);

  // 8. PIE CHART: ORDER STATUS DISTRIBUTION
  const orderStatusDistribution = useMemo(() => {
    const stats = [
      { name: "Delivered", count: orderStats.delivered, color: "#10b981" },
      { name: "Pending", count: orderStats.pending, color: "#f59e0b" },
      { name: "Processing", count: orderStats.processing, color: "#3b82f6" },
      { name: "Shipped", count: orderStats.shipped, color: "#8b5cf6" },
      { name: "Cancelled", count: orderStats.cancelled, color: "#f43f5e" },
    ].filter((s) => s.count > 0);

    const total = stats.reduce((a, b) => a + b.count, 0);
    return stats.map((s) => ({
      ...s,
      percentage: total > 0 ? Math.round((s.count / total) * 100) : 0,
    }));
  }, [orderStats]);

  // SVG Drawing Helpers for Trend Line Chart
  const svgLineProps = useMemo(() => {
    const width = 600;
    const height = 250;
    const paddingLeft = 50;
    const paddingRight = 20;
    const paddingTop = 30;
    const paddingBottom = 40;

    const chartWidth = width - paddingLeft - paddingRight;
    const chartHeight = height - paddingTop - paddingBottom;

    if (trendChartData.length === 0) {
      return {
        width,
        height,
        paddingLeft,
        paddingBottom,
        chartHeight,
        chartWidth,
        path: "",
        areaPath: "",
        points: [],
        gridLines: [],
      };
    }

    const maxVal = Math.max(
      ...trendChartData.map((d) => (trendType === "revenue" ? d.revenue : d.orders)),
      10 // Fallback minimum ceiling
    );

    const points = trendChartData.map((d, index) => {
      const val = trendType === "revenue" ? d.revenue : d.orders;
      const x = paddingLeft + (index / (trendChartData.length - 1 || 1)) * chartWidth;
      const y = height - paddingBottom - (val / maxVal) * chartHeight;
      return { x, y, label: d.label, value: val };
    });

    // Generate Path
    let path = "";
    if (points.length > 0) {
      path = `M ${points[0].x} ${points[0].y}`;
      for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
      }
    }

    // Generate Area Closed Path
    let areaPath = "";
    if (points.length > 0) {
      areaPath = `${path} L ${points[points.length - 1].x} ${height - paddingBottom} L ${points[0].x} ${height - paddingBottom} Z`;
    }

    // Grid lines (horizontal)
    const gridLines = [];
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const val = (maxVal / ticks) * i;
      const y = height - paddingBottom - (val / maxVal) * chartHeight;
      gridLines.push({
        y,
        value: trendType === "revenue" ? `₹${Math.round(val)}` : Math.round(val),
      });
    }

    return {
      width,
      height,
      paddingLeft,
      paddingBottom,
      chartHeight,
      chartWidth,
      path,
      areaPath,
      points,
      gridLines,
    };
  }, [trendChartData, trendType]);

  // Category Sales (Bar representation)
  const categorySales = useMemo(() => {
    const catMap: Record<number, number> = {};

    filteredOrders.forEach((order) => {
      if (order.order_status === "CANCELLED" || order.order_status === "RETURNED") return;
      try {
        const items = JSON.parse(order.product_details);
        if (Array.isArray(items)) {
          items.forEach((item: any) => {
            const name = item.name || item.product_name;
            const productMatch = products.find((p) => p.name === name);
            if (productMatch) {
              const catId = productMatch.category_id;
              catMap[catId] = (catMap[catId] || 0) + (Number(item.price) || 0) * (Number(item.quantity) || 1);
            }
          });
        }
      } catch (e) {}
    });

    const maxSales = Math.max(...Object.values(catMap), 1);

    return categories.map((cat) => {
      const sales = catMap[cat.id] || 0;
      return {
        id: cat.id,
        name: cat.name,
        sales,
        percentage: Math.round((sales / maxSales) * 100),
      };
    }).sort((a, b) => b.sales - a.sales);
  }, [filteredOrders, products, categories]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 text-slate-900">
      {/* Header Controls Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 sm:p-12 premium-shadow text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-600/30 to-indigo-900/20"></div>
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl"></div>
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl"></div>

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div>
            <h2 className="text-2xl sm:text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-100 to-emerald-300">
              Interactive Analytics
            </h2>
            <p className="mt-2 text-sm text-slate-300 font-medium">
              Real-time sales performance, inventory alerts, and customer insights.
            </p>
          </div>

          {/* Quick Date Filters */}
          <div className="flex flex-wrap items-center gap-3">
            {(
              [
                { label: "Today", value: "today" },
                { label: "Yesterday", value: "yesterday" },
                { label: "7 Days", value: "last7days" },
                { label: "30 Days", value: "last30days" },
                { label: "This Month", value: "thisMonth" },
                { label: "Last Month", value: "lastMonth" },
                { label: "This Year", value: "thisYear" },
                { label: "Custom", value: "custom" },
              ] as { label: string; value: DateFilterType }[]
            ).map((f) => (
              <button
                key={f.value}
                onClick={() => setDateFilter(f.value)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                  dateFilter === f.value
                    ? "bg-emerald-600 border-emerald-500 text-white shadow-lg shadow-emerald-600/20"
                    : "bg-slate-800/80 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {dateFilter === "custom" && (
          <div className="relative z-10 mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md p-4 bg-slate-800/40 rounded-2xl border border-slate-700/40">
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase text-slate-400 mb-1">
                End Date
              </label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-bold text-white outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        )}

        {/* Auto Refresh Config */}
        <div className="relative z-10 mt-6 border-t border-slate-800 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-black uppercase tracking-widest text-emerald-400">
              Live Monitor
            </span>
            <button
              type="button"
              onClick={() => setAutoRefreshEnabled(!autoRefreshEnabled)}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 border ${
                autoRefreshEnabled
                  ? "bg-emerald-600/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-600/20"
                  : "bg-rose-600/10 border-rose-500/20 text-rose-400 hover:bg-rose-600/20"
              }`}
            >
              {autoRefreshEnabled ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Running (Pause ⏸️)
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                  Paused (Resume ▶️)
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold text-slate-400">
            {autoRefreshEnabled ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin text-emerald-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Auto refreshing in <span className="text-white font-mono">{secondsToRefresh}s</span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-slate-500">
                <span className="h-2 w-2 rounded-full bg-slate-600"></span>
                Auto refresh paused
              </span>
            )}

            <select
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              disabled={!autoRefreshEnabled}
              className="bg-slate-800 border border-slate-700 rounded-xl px-2 py-1 text-[11px] font-bold text-white outline-none focus:border-emerald-500 disabled:opacity-40"
            >
              <option value={15}>15s</option>
              <option value={30}>30s</option>
              <option value={60}>60s</option>
            </select>
          </div>
        </div>
      </div>

      {/* 💰 REVENUE STATS CARDS */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
            Financial Dashboard
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            {
              label: "Total Revenue",
              value: `₹${Math.round(revenueStats.totalRevenue).toLocaleString()}`,
              color: "emerald",
              desc: "Delivered + Shipped + Active",
            },
            {
              label: "Today's Revenue",
              value: `₹${Math.round(revenueStats.todayRevenue).toLocaleString()}`,
              color: "sky",
              desc: "Sales registered today",
            },
            {
              label: "Yesterday's Revenue",
              value: `₹${Math.round(revenueStats.yesterdayRevenue).toLocaleString()}`,
              color: "amber",
              desc: "Sales registered yesterday",
            },
            {
              label: "Estimated Profit",
              value: `₹${Math.round(revenueStats.totalProfit).toLocaleString()}`,
              color: "indigo",
              desc: "Est. 35% gross profit margin",
            },
            {
              label: "Average Order Value (AOV)",
              value: `₹${Math.round(revenueStats.aov).toLocaleString()}`,
              color: "violet",
              desc: "Avg ticket size in range",
            },
            {
              label: "This Month Revenue",
              value: `₹${Math.round(revenueStats.thisMonthRevenue).toLocaleString()}`,
              color: "rose",
              desc: "Current calendar month",
            },
            {
              label: "Last Month Revenue",
              value: `₹${Math.round(revenueStats.lastMonthRevenue).toLocaleString()}`,
              color: "teal",
              desc: "Previous calendar month",
            },
            {
              label: "This Week Revenue",
              value: `₹${Math.round(revenueStats.thisWeekRevenue).toLocaleString()}`,
              color: "orange",
              desc: "Current week (Sun-Sat)",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-[2rem] p-6 border border-slate-100 premium-shadow hover:-translate-y-1 transition-all duration-300 relative overflow-hidden"
            >
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                {card.label}
              </span>
              <p className="mt-3 text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                {card.value}
              </p>
              <p className="mt-2 text-[10px] font-bold text-slate-400">{card.desc}</p>
              <div
                className={`absolute -bottom-6 -right-6 h-20 w-20 rounded-full bg-${card.color}-500/5 blur-xl`}
              ></div>
            </div>
          ))}
        </div>
      </div>

      {/* 🛒 ORDERS & DELIVERY STATUS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders Card */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 premium-shadow lg:col-span-2">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Order Quantities
            </h4>
            <span className="text-[11px] font-black bg-slate-900 text-white px-3 py-1 rounded-full">
              {orderStats.totalOrders} Total Orders
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: "Today's Orders", count: orderStats.todayOrders, color: "bg-emerald-500" },
              { label: "Pending", count: orderStats.pending, color: "bg-amber-500" },
              { label: "Processing", count: orderStats.processing, color: "bg-blue-500" },
              { label: "Shipped", count: orderStats.shipped, color: "bg-indigo-500" },
              { label: "Delivered", count: orderStats.delivered, color: "bg-emerald-600" },
              { label: "Cancelled", count: orderStats.cancelled, color: "bg-rose-500" },
              { label: "Returned", count: orderStats.returned, color: "bg-red-500" },
              { label: "Pre-Orders", count: orderStats.preOrder, color: "bg-purple-500" },
            ].map((stat) => (
              <div key={stat.label} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${stat.color}`}></span>
                  <span className="text-[10px] font-black uppercase text-slate-400 truncate">
                    {stat.label}
                  </span>
                </div>
                <p className="mt-3 text-2xl font-black text-slate-900">{stat.count}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Delivery Activity */}
        <div className="bg-slate-900 text-white rounded-[2rem] p-6 premium-shadow relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/40 to-transparent"></div>
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <div className="flex items-center gap-2 text-emerald-400 mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="text-[9px] font-black uppercase tracking-widest">
                  Live Dispatch Logistics
                </span>
              </div>
              <h4 className="text-xl font-black tracking-tight text-white mb-2">
                Logistics Monitor
              </h4>
              <p className="text-xs text-slate-400 font-medium mb-6">
                Active shipments ready for pickup or currently en route.
              </p>
            </div>

            <div className="space-y-4">
              {[
                {
                  label: "Ready to Ship",
                  value: deliveryStats.readyToShip,
                  icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
                  color: "emerald",
                },
                {
                  label: "Out for Delivery",
                  value: deliveryStats.outForDelivery,
                  icon: "M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z M13 9h4l3 5v3h-1a2 2 0 01-3 0H9a2 2 0 01-3 0H5v-4H3v-2h2V9a2 2 0 012-2h6",
                  color: "indigo",
                },
                {
                  label: "Delivered Today",
                  value: deliveryStats.deliveredToday,
                  icon: "M5 13l4 4L19 7",
                  color: "teal",
                },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 backdrop-blur-md"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl bg-${item.color}-500/20 text-${item.color}-400 flex items-center justify-center`}
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d={item.icon}
                        />
                      </svg>
                    </div>
                    <span className="text-xs font-black uppercase tracking-wider text-slate-300">
                      {item.label}
                    </span>
                  </div>
                  <span className="text-xl font-black text-white">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 👥 CUSTOMERS & 📦 PRODUCTS OVERVIEW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer KPIs */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 premium-shadow">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-4 border-b border-slate-100 mb-6">
            Customer Demographics
          </h4>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100/50">
              <span className="text-[10px] font-black uppercase text-slate-400">
                Total Registered
              </span>
              <p className="mt-3 text-3xl font-black text-emerald-950">
                {customerStats.totalCustomers}
              </p>
            </div>
            <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100/50">
              <span className="text-[10px] font-black uppercase text-slate-400">
                Returning Rate
              </span>
              <p className="mt-3 text-3xl font-black text-indigo-950">
                {customerStats.totalCustomers > 0
                  ? `${Math.round(
                      (customerStats.returningCustomers / customerStats.totalCustomers) * 100
                    )}%`
                  : "0%"}
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {[
              { label: "New Customers Today", count: customerStats.newToday, color: "text-emerald-600 bg-emerald-50" },
              { label: "New Customers This Week", count: customerStats.newThisWeek, color: "text-indigo-600 bg-indigo-50" },
              { label: "New Customers This Month", count: customerStats.newThisMonth, color: "text-rose-600 bg-rose-50" },
              { label: "Active Customers (Purchased)", count: customerStats.activeCustomers, color: "text-teal-600 bg-teal-50" },
            ].map((stat) => (
              <div key={stat.label} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                <span className="text-xs font-bold text-slate-500">{stat.label}</span>
                <span className={`px-2.5 py-1 rounded-full text-xs font-black ${stat.color}`}>
                  {stat.count}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Product Inventory KPIs */}
        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 premium-shadow">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-4 border-b border-slate-100 mb-6">
            Inventory Health
          </h4>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-black uppercase text-slate-400">Total Catalog</span>
              <p className="mt-3 text-3xl font-black text-slate-900">
                {productStats.totalProducts}
              </p>
            </div>
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
              <span className="text-[10px] font-black uppercase text-rose-500">Out of Stock</span>
              <p className="mt-3 text-3xl font-black text-rose-950">{productStats.outOfStock}</p>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-xs font-bold text-slate-500">Active Products Listed</span>
              <span className="px-2.5 py-1 rounded-full text-xs font-black text-emerald-600 bg-emerald-50">
                {productStats.activeProducts}
              </span>
            </div>
            <div className="flex justify-between items-center py-2 border-b border-slate-50">
              <span className="text-xs font-bold text-slate-500">Low Stock Alert (≤ limit)</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-black ${
                productStats.lowStock > 0 ? "text-amber-600 bg-amber-50 animate-pulse" : "text-slate-600 bg-slate-50"
              }`}>
                {productStats.lowStock}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 📈 INTERACTIVE TREND CHARTS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart for Revenue/Orders Trend */}
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 premium-shadow lg:col-span-2 relative">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
            <div>
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                Sales Growth Over Time
              </h4>
              <p className="text-xs text-slate-400 font-bold mt-1">
                Visualizing cumulative performance values.
              </p>
            </div>

            <div className="inline-flex rounded-xl bg-slate-100 p-1">
              <button
                onClick={() => setTrendType("revenue")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  trendType === "revenue" ? "bg-white text-emerald-600 shadow" : "text-slate-500"
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setTrendType("orders")}
                className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  trendType === "orders" ? "bg-white text-indigo-600 shadow" : "text-slate-500"
                }`}
              >
                Orders
              </button>
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="relative pt-4">
            {trendChartData.length > 0 ? (
              <svg
                viewBox={`0 0 ${svgLineProps.width} ${svgLineProps.height}`}
                className="w-full h-auto overflow-visible select-none"
              >
                <defs>
                  <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={trendType === "revenue" ? "#10b981" : "#6366f1"} stopOpacity="0.25" />
                    <stop offset="100%" stopColor={trendType === "revenue" ? "#10b981" : "#6366f1"} stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Grid lines */}
                {svgLineProps.gridLines.map((line, i) => (
                  <g key={i}>
                    <line
                      x1={svgLineProps.paddingLeft}
                      y1={line.y}
                      x2={svgLineProps.width - 20}
                      y2={line.y}
                      stroke="#f1f5f9"
                      strokeWidth={1}
                    />
                    <text
                      x={svgLineProps.paddingLeft - 10}
                      y={line.y + 4}
                      textAnchor="end"
                      className="text-[9px] font-black fill-slate-400 font-mono"
                    >
                      {line.value}
                    </text>
                  </g>
                ))}

                {/* Shaded Area under the curve */}
                {svgLineProps.areaPath && (
                  <path d={svgLineProps.areaPath} fill="url(#chartGrad)" className="transition-all duration-500" />
                )}

                {/* Actual Trend Line */}
                {svgLineProps.path && (
                  <path
                    d={svgLineProps.path}
                    fill="none"
                    stroke={trendType === "revenue" ? "#10b981" : "#6366f1"}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="transition-all duration-500"
                  />
                )}

                {/* Interaction circle points */}
                {svgLineProps.points.map((pt, i) => (
                  <circle
                    key={i}
                    cx={pt.x}
                    cy={pt.y}
                    r={hoveredPoint?.label === pt.label ? 6 : 4}
                    fill={trendType === "revenue" ? "#10b981" : "#6366f1"}
                    stroke="#ffffff"
                    strokeWidth={2}
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        label: pt.label,
                        value: trendType === "revenue" ? `₹${Math.round(pt.value)}` : pt.value,
                        x: pt.x,
                        y: pt.y,
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                ))}

                {/* X-axis text labels */}
                {svgLineProps.points.map((pt, i) => {
                  if (svgLineProps.points.length > 8 && i % 2 !== 0) return null;
                  return (
                    <text
                      key={i}
                      x={pt.x}
                      y={svgLineProps.height - 15}
                      textAnchor="middle"
                      className="text-[9px] font-black fill-slate-400"
                    >
                      {pt.label}
                    </text>
                  );
                })}
              </svg>
            ) : (
              <div className="h-[200px] flex items-center justify-center text-xs font-bold text-slate-400">
                Not enough data to calculate trends.
              </div>
            )}

            {/* Custom Tooltip overlay */}
            {hoveredPoint && (
              <div
                className="absolute z-20 bg-slate-900 text-white rounded-lg p-2.5 shadow-xl text-[10px] pointer-events-none font-bold border border-slate-800"
                style={{
                  left: `${(hoveredPoint.x / svgLineProps.width) * 100}%`,
                  top: `${(hoveredPoint.y / svgLineProps.height) * 100 - 15}%`,
                  transform: "translate(-50%, -100%)",
                }}
              >
                <p className="text-slate-400 uppercase tracking-widest text-[8px]">
                  {hoveredPoint.label}
                </p>
                <p className="text-emerald-400 font-mono mt-0.5">{hoveredPoint.value}</p>
              </div>
            )}
          </div>
        </div>

        {/* Donut Chart: Payment Methods & Order Status */}
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 premium-shadow flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-4 border-b border-slate-100 mb-6">
              Distribution Channels
            </h4>

            {/* Payment Method pie representation */}
            <div className="space-y-6">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">
                  Payment Gateway Mix
                </span>

                {paymentDistribution.length > 0 ? (
                  <div className="flex items-center gap-6">
                    {/* SVG Donut */}
                    <div className="relative h-24 w-24 shrink-0">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <circle cx="18" cy="18" r="15.915" fill="none" stroke="#f1f5f9" strokeWidth="4.2" />
                        {(() => {
                          let accumulatedPercent = 0;
                          const colors = ["#10b981", "#6366f1", "#f59e0b", "#ec4899"];
                          return paymentDistribution.map((item, idx) => {
                            const strokeDash = `${item.percentage} ${100 - item.percentage}`;
                            const strokeOffset = 100 - accumulatedPercent;
                            accumulatedPercent += item.percentage;
                            return (
                              <circle
                                key={idx}
                                cx="18"
                                cy="18"
                                r="15.915"
                                fill="none"
                                stroke={colors[idx % colors.length]}
                                strokeWidth="4.2"
                                strokeDasharray={strokeDash}
                                strokeDashoffset={strokeOffset}
                                className="transition-all duration-500"
                              />
                            );
                          });
                        })()}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[9px] font-black text-slate-400 uppercase">Paid</span>
                        <span className="text-sm font-black text-slate-900">
                          {paymentDistribution.reduce((a, b) => a + b.count, 0)}
                        </span>
                      </div>
                    </div>

                    {/* Legend details */}
                    <div className="flex-1 space-y-2">
                      {paymentDistribution.map((item, idx) => {
                        const colors = ["bg-emerald-500", "bg-indigo-500", "bg-amber-500", "bg-rose-500"];
                        return (
                          <div key={item.name} className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className={`h-2.5 w-2.5 rounded-full shrink-0 ${colors[idx % colors.length]}`}></span>
                              <span className="font-bold text-slate-600 truncate">{item.name}</span>
                            </div>
                            <span className="font-mono font-black text-slate-900 shrink-0">
                              {item.percentage}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-bold">No orders processed yet.</p>
                )}
              </div>

              {/* Order Status Distribution */}
              <div className="border-t border-slate-50 pt-4">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">
                  Status Metrics
                </span>
                <div className="flex flex-wrap gap-2">
                  {orderStatusDistribution.map((status) => (
                    <div
                      key={status.name}
                      className="px-3 py-1.5 rounded-xl border border-slate-100 flex items-center gap-2"
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: status.color }}></span>
                      <span className="text-[11px] font-bold text-slate-600">
                        {status.name} ({status.percentage}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 📊 PRODUCT SALES & CATEGORY SALES TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Best Selling Products */}
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 premium-shadow">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-4 border-b border-slate-100 mb-6">
            Top Spices Sold
          </h4>

          {productStats.bestSelling.length > 0 ? (
            <div className="space-y-4">
              {productStats.bestSelling.map((item, idx) => (
                <div key={item.name} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800 truncate max-w-[70%]">
                      {idx + 1}. {item.name}
                    </span>
                    <span className="font-mono text-slate-950 font-bold">
                      {item.qty} units (₹{Math.round(item.revenue).toLocaleString()})
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.round(
                          (item.qty / Math.max(...productStats.bestSelling.map((o) => o.qty))) * 100
                        )}%`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-xs font-bold text-slate-400">
              No product sales tracked in this date range.
            </div>
          )}
        </div>

        {/* Category Sales Distribution */}
        <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 premium-shadow">
          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider pb-4 border-b border-slate-100 mb-6">
            Sales by Category
          </h4>

          {categorySales.length > 0 ? (
            <div className="space-y-4">
              {categorySales.map((item) => (
                <div key={item.id} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-800">{item.name}</span>
                    <span className="font-mono text-slate-950 font-bold">
                      ₹{Math.round(item.sales).toLocaleString()}
                    </span>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.percentage}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-xs font-bold text-slate-400">
              No category sales tracked in this date range.
            </div>
          )}
        </div>
      </div>

      {/* 📥 BUSINESS INTELLIGENCE & EXPORT CENTER */}
      <div className="bg-slate-900 text-white rounded-[2.5rem] p-8 md:p-12 border border-slate-800 premium-shadow relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-950/40 to-transparent"></div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-emerald-400 mb-4">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-[10px] font-black uppercase tracking-widest">Reports Console</span>
          </div>
          <h4 className="text-2xl font-black tracking-tight text-white mb-2">Business Intelligence Export Center</h4>
          <p className="text-sm text-slate-400 font-medium mb-8 max-w-2xl">
            Generate and download formatted Excel spreadsheet reports for auditing, taxes, and inventory reconciliation. Date filters apply to all exported reports.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
            {[
              { id: "dashboard", label: "Dashboard Summary", desc: "Overview KPIs" },
              { id: "revenue", label: "Revenue Report", desc: "Sales trends by day" },
              { id: "payments", label: "Payments Ledger", desc: "Gateway transaction logs" },
              { id: "delivery", label: "Delivery Manifests", desc: "Active dispatch shipping logs" },
              { id: "coupons", label: "Coupons Ledger", desc: "Promo codes template" },
              { id: "reviews", label: "Customer Reviews", desc: "Feedback templates" },
              { id: "vendors", label: "Vendor Partners", desc: "Settlements templates" },
            ].map((report) => (
              <button
                key={report.id}
                onClick={() => setActiveReportId(report.id)}
                className="flex flex-col items-start text-left p-5 bg-white/5 rounded-2xl border border-white/5 hover:bg-white/10 hover:border-white/10 hover:-translate-y-0.5 transition-all duration-200 active:scale-95 group w-full cursor-pointer"
              >
                <div className="flex items-center justify-between w-full mb-3">
                  <div className="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    XLSX
                  </span>
                </div>
                <span className="text-sm font-black text-white">{report.label}</span>
                <span className="text-[10px] text-slate-400 font-medium mt-1">{report.desc}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 🔮 INTERACTIVE REPORT GENERATOR MODAL */}
      {activeReportId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-[2rem] w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Reports Console</span>
                <h3 className="text-xl font-black text-white mt-1">
                  {
                    [
                      { id: "dashboard", label: "Dashboard Summary" },
                      { id: "revenue", label: "Revenue Report" },
                      { id: "payments", label: "Payments Ledger" },
                      { id: "delivery", label: "Delivery Manifests" },
                      { id: "coupons", label: "Coupons Ledger" },
                      { id: "reviews", label: "Customer Reviews" },
                      { id: "vendors", label: "Vendor Partners" },
                    ].find(r => r.id === activeReportId)?.label || "Report Details"
                  }
                </h3>
              </div>
              <button 
                onClick={() => setActiveReportId(null)}
                className="h-10 w-10 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors active:scale-95 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filters Row */}
            <div className="p-6 bg-slate-950/40 border-b border-slate-800 flex flex-wrap items-end gap-6">
              
              {/* Date Range Start & End */}
              <div className="flex flex-col gap-1.5 min-w-[280px]">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Date Range</span>
                <div className="flex gap-2 items-center">
                  <input 
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-colors w-[130px] sm:w-[140px]"
                  />
                  <span className="text-slate-600 text-xs font-bold">to</span>
                  <input 
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-colors w-[130px] sm:w-[140px]"
                  />
                </div>
              </div>

              {/* Search Bar */}
              <div className="flex flex-col gap-1.5 flex-grow min-w-[220px]">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Search Records</span>
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input 
                    type="text"
                    value={reportSearch}
                    onChange={(e) => setReportSearch(e.target.value)}
                    placeholder="Search by ID, name, details..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
              </div>

              {/* Status Filter (if applicable) */}
              <div className={`flex flex-col gap-1.5 w-[160px] ${["payments", "delivery"].includes(activeReportId) ? "" : "opacity-40 pointer-events-none"}`}>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Status Filter</span>
                <select
                  value={reportStatus}
                  onChange={(e) => setReportStatus(e.target.value)}
                  disabled={!["payments", "delivery"].includes(activeReportId)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  <option value="All">All Statuses</option>
                  {activeReportId === "payments" && (
                    <>
                      <option value="COMPLETE">COMPLETE</option>
                      <option value="PENDING">PENDING</option>
                      <option value="FAILED">FAILED</option>
                    </>
                  )}
                  {activeReportId === "delivery" && (
                    <>
                      <option value="PENDING">PENDING</option>
                      <option value="PROCESSING">PROCESSING</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                      <option value="RETURNED">RETURNED</option>
                    </>
                  )}
                </select>
              </div>

              {/* Category Filter (if applicable) */}
              <div className={`flex flex-col gap-1.5 w-[160px] ${["payments"].includes(activeReportId) ? "" : "opacity-40 pointer-events-none"}`}>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Category Filter</span>
                <select
                  value={reportCategory}
                  onChange={(e) => setReportCategory(e.target.value)}
                  disabled={!["payments"].includes(activeReportId)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                >
                  {activeReportId === "payments" ? (
                    <>
                      <option value="All">All Gateway Modes</option>
                      <option value="Online">Online / Card (Razorpay)</option>
                      <option value="COD">Cash on Delivery (COD)</option>
                    </>
                  ) : (
                    <option value="All">All Categories</option>
                  )}
                </select>
              </div>

            </div>

            {/* KPI Cards Row */}
            <div className="px-6 py-4 bg-slate-950/20 border-b border-slate-800 flex gap-6 items-center">
              
              <div className="bg-slate-800/50 border border-slate-800/80 rounded-2xl px-5 py-3 flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total Records</span>
                <span className="text-xl font-black text-white mt-0.5">{reportData.totalRecords}</span>
              </div>

              {reportData.totalAmount !== null && (
                <div className="bg-slate-800/50 border border-slate-800/80 rounded-2xl px-5 py-3 flex flex-col">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">
                    {activeReportId === "delivery" ? "Total COD Amount" : "Total Amount Sum"}
                  </span>
                  <span className="text-xl font-black text-emerald-400 mt-0.5">
                    {formatCurrency(reportData.totalAmount)}
                  </span>
                </div>
              )}

            </div>

            {/* Live Table Preview */}
            <div className="p-6 flex-1 overflow-y-auto min-h-0 bg-slate-900/60 no-scrollbar">
              <div className="border border-slate-800 rounded-2xl overflow-hidden bg-slate-950/20">
                <div className="overflow-x-auto no-scrollbar max-h-[350px]">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950 border-b border-slate-800">
                        {reportData.headers.map((h, i) => (
                          <th key={i} className="px-4 py-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/50">
                      {reportData.rows.length > 0 ? (
                        reportData.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-white/5 transition-colors duration-150">
                            {row.map((val: any, cIdx: number) => {
                              const isAmountColumn = 
                                (activeReportId === "revenue" && (cIdx === 2 || cIdx === 4 || cIdx === 5)) ||
                                (activeReportId === "payments" && cIdx === 6) ||
                                (activeReportId === "delivery" && cIdx === 8);
                              
                              const displayVal = isAmountColumn && typeof val === "number" 
                                ? formatCurrency(val) 
                                : String(val);

                              const cellStyle = isAmountColumn 
                                ? "text-emerald-400 font-extrabold" 
                                : val === "Active" || val === "Approved" || val === "COMPLETE" || val === "DELIVERED"
                                ? "text-emerald-500 font-extrabold"
                                : val === "Expired" || val === "Suspended" || val === "FAILED" || val === "CANCELLED"
                                ? "text-rose-500 font-extrabold"
                                : "text-slate-300";

                              return (
                                <td key={cIdx} className="px-4 py-2.5 text-xs font-semibold whitespace-nowrap">
                                  <span className={cellStyle}>{displayVal}</span>
                                </td>
                              );
                            })}
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={reportData.headers.length || 1} className="text-center py-12 text-xs font-bold text-slate-500">
                            No records found matching filters.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-5 border-t border-slate-800 flex items-center justify-between bg-slate-950/20">
              <button 
                onClick={() => setActiveReportId(null)}
                className="px-5 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white text-xs font-black uppercase tracking-wider transition-colors active:scale-95 cursor-pointer"
              >
                Close
              </button>

              <button 
                onClick={handleGenerateXLSX}
                disabled={generatingExcel || reportData.rows.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 disabled:opacity-50 text-xs font-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
              >
                {generatingExcel ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>Generate XLSX</span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
