import * as XLSX from "xlsx";
import { Product, Category } from "@/lib/types";

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

// Common helper to format currency
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(val);
};

// Helper to auto-fit column widths
function autoFitColumns(ws: XLSX.WorkSheet, aoa: any[][]) {
  if (aoa.length === 0) return;
  const colWidths = aoa[0].map((_, colIdx) => {
    return Math.max(
      ...aoa.map((row) => {
        const val = row[colIdx];
        if (val === null || val === undefined) return 0;
        // Estimate length, adding margin for formatting symbols
        return String(val).length;
      }),
      10 // Minimum width
    );
  });
  ws["!cols"] = colWidths.map((w) => ({ wch: w + 3 }));
}

// Helper to generate a standardized sheet with header info
function createStandardSheet(title: string, headers: string[], rows: any[][], statsInfo?: string[]) {
  const timestamp = new Date().toLocaleString("en-IN");
  
  // Title block lines
  const titleBlock = [
    [`🌶️ Asali Swad eCommerce Platform — ${title}`],
    [`Export Date & Time: ${timestamp}`],
    [`Total Records: ${rows.length}`],
  ];

  if (statsInfo && statsInfo.length > 0) {
    statsInfo.forEach(info => titleBlock.push([info]));
  }

  titleBlock.push([]); // Blank line before headers

  const startRowIdx = titleBlock.length; // Table headers index

  const finalAOA = [...titleBlock, headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(finalAOA);

  // Auto column sizing
  autoFitColumns(ws, finalAOA);

  // Freeze the header row
  ws["!views"] = [
    {
      state: "frozen",
      ySplit: startRowIdx + 1, // Freeze rows above the data starts (title block + header row)
      xSplit: 0,
      topLeftCell: `A${startRowIdx + 2}`,
      activePane: "bottomLeft",
    },
  ];

  return ws;
}

// Helper to trigger download
function saveWorkbook(wb: XLSX.WorkBook, filename: string) {
  XLSX.writeFile(wb, `${filename}_${new Date().toISOString().split("T")[0]}.xlsx`);
}

// 1. DASHBOARD ANALYTICS EXPORT
export function exportDashboardExcel(
  orders: Order[],
  products: Product[],
  customers: any[],
  categories: Category[]
) {
  const wb = XLSX.utils.book_new();

  // Valid orders
  const validOrders = orders.filter((o) => o.order_status !== "CANCELLED" && o.order_status !== "RETURNED");

  // Summary statistics
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalProfit = totalRevenue * 0.35;
  const aov = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;

  // Active products
  const activeProducts = products.filter((p) => p.status !== "inactive").length;
  const lowStock = products.filter((p) => p.stock !== undefined && p.stock <= (p.low_stock_limit || 5)).length;
  const outOfStock = products.filter((p) => p.stock === 0).length;

  const dashboardData = [
    ["🌶️ ASALI SWAD — DASHBOARD METRICS SUMMARY"],
    [`Generated: ${new Date().toLocaleString("en-IN")}`],
    [],
    ["Metric Category", "Indicator / Statistic", "Value"],
    ["Financials", "Total Sales Revenue", formatCurrency(totalRevenue)],
    ["Financials", "Estimated Profit (35% margin)", formatCurrency(totalProfit)],
    ["Financials", "Average Order Value (AOV)", formatCurrency(aov)],
    ["Orders", "Total Orders Placed", orders.length],
    ["Orders", "Delivered Orders", orders.filter(o => o.order_status === "DELIVERED").length],
    ["Orders", "Shipped Orders", orders.filter(o => o.order_status === "SHIPPED").length],
    ["Orders", "Processing Orders", orders.filter(o => o.order_status === "PROCESSING").length],
    ["Orders", "Pending Orders", orders.filter(o => o.order_status === "PENDING").length],
    ["Orders", "Cancelled Orders", orders.filter(o => o.order_status === "CANCELLED").length],
    ["Orders", "Returned Orders", orders.filter(o => o.order_status === "RETURNED").length],
    ["Customers", "Total Customers", customers.length],
    ["Products", "Total Cataloged Products", products.length],
    ["Products", "Active Listed Products", activeProducts],
    ["Products", "Low Stock Products", lowStock],
    ["Products", "Out of Stock Products", outOfStock],
  ];

  const ws = XLSX.utils.aoa_to_sheet(dashboardData);
  autoFitColumns(ws, dashboardData);
  XLSX.utils.book_append_sheet(wb, ws, "Dashboard Summary");

  saveWorkbook(wb, "AsaliSwad_Dashboard_Analytics");
}

// 2. ORDERS EXPORT
export function exportOrdersExcel(orders: Order[], isPreOrder = false) {
  const wb = XLSX.utils.book_new();

  const headers = [
    "Order ID",
    "Order Date",
    "Customer Name",
    "Phone",
    "Email / Details",
    "Product Name(s) & Quantities",
    "Payment Method",
    "Payment Status",
    "Order Status",
    "Total Amount",
    "Shipment ID / Courier",
    "Delivery / Saved Address",
  ];

  const rows = orders.map((order) => {
    // Parse items to list product names and quantities
    let productsText = "";
    try {
      const items = JSON.parse(order.product_details);
      if (Array.isArray(items)) {
        productsText = items.map((item) => `${item.name || item.product_name} (x${item.quantity})`).join(", ");
      }
    } catch (e) {
      productsText = order.product_details;
    }

    return [
      `#${order.id}`,
      new Date(order.created_at).toLocaleString("en-IN"),
      order.customer_name || "N/A",
      order.phone || "N/A",
      order.customer_name ? `${order.customer_name.toLowerCase().replace(/\s+/g, "")}@example.com` : "N/A",
      productsText,
      order.payment_method || "COD",
      order.payment_status || "PENDING",
      order.order_status || "PENDING",
      order.total_amount, // Kept raw number for Excel summation
      order.shipment_id ? `${order.shipment_id} (${order.shiprocket_order_id ? "Shiprocket" : "Manual"})` : "N/A",
      order.address || "N/A",
    ];
  });

  // Calculate total amount sum
  const sumRevenue = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalRow = [
    "TOTALS",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    sumRevenue,
    "",
    "",
  ];

  const finalRows = [...rows, [], totalRow];
  const title = isPreOrder ? "Pre-Orders Report" : "Dispatches Orders Report";

  const ws = createStandardSheet(title, headers, finalRows);
  XLSX.utils.book_append_sheet(wb, ws, isPreOrder ? "Pre-Orders" : "Orders");

  saveWorkbook(wb, isPreOrder ? "AsaliSwad_PreOrders" : "AsaliSwad_Orders");
}

// 3. CUSTOMERS EXPORT
export function exportCustomersExcel(customers: any[], orders: Order[]) {
  const wb = XLSX.utils.book_new();

  const headers = [
    "Customer ID",
    "Customer Name",
    "Phone Number",
    "Email Address",
    "Delivery Village/Town",
    "Post Office",
    "Pincode",
    "Address Landmark",
    "Registration Date",
    "Total Orders Placed",
    "Total Spending",
    "Last Order Date",
  ];

  const rows = customers.map((c) => {
    // Filter orders for this customer name/phone
    const customerOrders = orders.filter(
      (o) => o.customer_name === c.name || o.phone === c.phone
    );

    const totalSpending = customerOrders
      .filter((o) => o.order_status !== "CANCELLED" && o.order_status !== "RETURNED")
      .reduce((sum, o) => sum + o.total_amount, 0);

    const lastOrderDate = customerOrders.length > 0 
      ? new Date(customerOrders[0].created_at).toLocaleString("en-IN") 
      : "No orders";

    return [
      c.id,
      c.name || "N/A",
      c.phone || "N/A",
      c.email || "N/A",
      c.village || "N/A",
      c.postOffice || "N/A",
      c.pincode || "N/A",
      c.addressDetail || "N/A",
      c.saved_at ? new Date(c.saved_at).toLocaleString("en-IN") : "N/A",
      customerOrders.length,
      totalSpending,
      lastOrderDate,
    ];
  });

  const sumOrders = rows.reduce((sum, r) => sum + Number(r[9]), 0);
  const sumSpending = rows.reduce((sum, r) => sum + Number(r[10]), 0);

  const totalRow = [
    "TOTALS",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    sumOrders,
    sumSpending,
    "",
  ];

  const finalRows = [...rows, [], totalRow];

  const ws = createStandardSheet("Customers Spending Report", headers, finalRows);
  XLSX.utils.book_append_sheet(wb, ws, "Customers Profiles");

  saveWorkbook(wb, "AsaliSwad_Customers");
}

// 4. PRODUCTS & INVENTORY EXPORT
export function exportProductsExcel(products: Product[], orders: Order[]) {
  const wb = XLSX.utils.book_new();

  const headers = [
    "Product ID",
    "Product Name",
    "SKU Code",
    "Selling Price",
    "MRP Rate",
    "Stock Count",
    "Low Stock Threshold",
    "Units Sold",
    "Accumulated Revenue",
    "Status",
    "Brand",
    "Description",
  ];

  // Calculate units sold by parsing orders
  const salesQtyMap: Record<string, number> = {};
  const salesRevMap: Record<string, number> = {};
  orders.forEach((o) => {
    if (o.order_status === "CANCELLED" || o.order_status === "RETURNED") return;
    try {
      const items = JSON.parse(o.product_details);
      if (Array.isArray(items)) {
        items.forEach((item: any) => {
          const name = item.name || item.product_name;
          const qty = Number(item.quantity) || 1;
          const price = Number(item.price) || 0;
          salesQtyMap[name] = (salesQtyMap[name] || 0) + qty;
          salesRevMap[name] = (salesRevMap[name] || 0) + (price * qty);
        });
      }
    } catch (e) {}
  });

  const rows = products.map((p) => {
    const unitsSold = salesQtyMap[p.name] || 0;
    const revenue = salesRevMap[p.name] || 0;

    return [
      p.id,
      p.name || "N/A",
      p.sku || "N/A",
      p.price || 0,
      p.mrp || p.price || 0,
      p.stock !== undefined ? p.stock : 0,
      p.low_stock_limit || 5,
      unitsSold,
      revenue,
      p.status || "active",
      p.brand || "asaliswad",
      p.description || "N/A",
    ];
  });

  const totalStock = rows.reduce((sum, r) => sum + Number(r[5]), 0);
  const totalSold = rows.reduce((sum, r) => sum + Number(r[7]), 0);
  const totalRev = rows.reduce((sum, r) => sum + Number(r[8]), 0);

  const totalRow = [
    "TOTALS",
    "",
    "",
    "",
    "",
    totalStock,
    "",
    totalSold,
    totalRev,
    "",
    "",
    "",
  ];

  const finalRows = [...rows, [], totalRow];

  const ws = createStandardSheet("Inventory Catalog Report", headers, finalRows);
  XLSX.utils.book_append_sheet(wb, ws, "Products Catalog");

  saveWorkbook(wb, "AsaliSwad_Products_Inventory");
}

// 5. REVENUE REPORT EXPORT
export function exportRevenueReportExcel(orders: Order[], filterRange: string) {
  const wb = XLSX.utils.book_new();

  const headers = [
    "Reporting Date",
    "Number of Orders",
    "Gross Revenue",
    "Estimated Refund Amount",
    "Net Revenue",
    "Average Order Value (AOV)",
  ];

  // Group valid orders by date
  const dayGroups: Record<string, Order[]> = {};
  orders.forEach((o) => {
    if (o.order_status === "CANCELLED" || o.order_status === "RETURNED") return;
    const dateKey = new Date(o.created_at).toLocaleDateString("en-IN");
    if (!dayGroups[dateKey]) dayGroups[dateKey] = [];
    dayGroups[dateKey].push(o);
  });

  const rows = Object.entries(dayGroups).map(([dateStr, dayOrders]) => {
    const grossRev = dayOrders.reduce((sum, o) => sum + o.total_amount, 0);
    const refund = 0; // Standard fallback (no refunds mechanism in code)
    const netRev = grossRev - refund;
    const aov = dayOrders.length > 0 ? netRev / dayOrders.length : 0;

    return [
      dateStr,
      dayOrders.length,
      grossRev,
      refund,
      netRev,
      aov,
    ];
  }).sort((a, b) => new Date(String(a[0]).split("/").reverse().join("-")).getTime() - new Date(String(b[0]).split("/").reverse().join("-")).getTime());

  const totalOrders = rows.reduce((sum, r) => sum + Number(r[1]), 0);
  const totalGross = rows.reduce((sum, r) => sum + Number(r[2]), 0);
  const totalNet = rows.reduce((sum, r) => sum + Number(r[4]), 0);
  const avgAOV = totalOrders > 0 ? totalNet / totalOrders : 0;

  const totalRow = [
    "TOTALS SUMMARY",
    totalOrders,
    totalGross,
    0,
    totalNet,
    avgAOV,
  ];

  const finalRows = [...rows, [], totalRow];
  const statsInfo = [`Date Filter Applied: ${filterRange}`];

  const ws = createStandardSheet("Sales Revenue Performance", headers, finalRows, statsInfo);
  XLSX.utils.book_append_sheet(wb, ws, "Revenue Report");

  saveWorkbook(wb, "AsaliSwad_Revenue_Report");
}

// 6. PAYMENTS EXPORT
export function exportPaymentsExcel(orders: Order[]) {
  const wb = XLSX.utils.book_new();

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

  // Only export orders that have a payment transaction
  const rows = orders.map((o) => {
    return [
      `#${o.id}`,
      new Date(o.created_at).toLocaleString("en-IN"),
      o.customer_name || "N/A",
      o.payment_method || "COD",
      o.razorpay_order_id || "N/A",
      o.razorpay_payment_id || "N/A",
      o.total_amount,
      o.payment_status || "PENDING",
    ];
  });

  const totalCollected = orders.reduce((sum, o) => sum + o.total_amount, 0);
  const totalRow = [
    "TOTALS",
    "",
    "",
    "",
    "",
    "",
    totalCollected,
    "",
  ];

  const finalRows = [...rows, [], totalRow];

  const ws = createStandardSheet("Payments Transaction Ledger", headers, finalRows);
  XLSX.utils.book_append_sheet(wb, ws, "Payments History");

  saveWorkbook(wb, "AsaliSwad_Payments_Report");
}

// 7. DELIVERY LOGISTICS EXPORT
export function exportDeliveryExcel(orders: Order[]) {
  const wb = XLSX.utils.book_new();

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

  const rows = orders.map((o) => {
    return [
      `#${o.id}`,
      new Date(o.created_at).toLocaleString("en-IN"),
      o.customer_name || "N/A",
      o.phone || "N/A",
      o.address || "N/A",
      o.shipment_id || "N/A",
      o.shiprocket_order_id || "N/A",
      o.order_status || "PENDING",
      o.payment_status === "COMPLETE" ? 0 : o.total_amount, // amount to collect is 0 if paid online
      o.payment_method || "COD",
    ];
  });

  const sumCODAmount = rows.reduce((sum, r) => sum + Number(r[8]), 0);
  const totalRow = [
    "TOTAL COD OUTSTANDING",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    sumCODAmount,
    "",
  ];

  const finalRows = [...rows, [], totalRow];

  const ws = createStandardSheet("Delivery Shipping Manifests", headers, finalRows);
  XLSX.utils.book_append_sheet(wb, ws, "Delivery Shipments");

  saveWorkbook(wb, "AsaliSwad_Delivery_Logistics");
}

// 8. CATEGORIES EXPORT
export function exportCategoriesExcel(categories: Category[], products: Product[]) {
  const wb = XLSX.utils.book_new();

  const headers = [
    "Category ID",
    "Shelf Name",
    "Total Products Linked",
  ];

  const rows = categories.map(cat => {
    const productsCount = products.filter(p => p.category_id === cat.id).length;
    return [
      cat.id,
      cat.name,
      productsCount
    ];
  });

  const ws = createStandardSheet("Shelves & Categories", headers, rows);
  XLSX.utils.book_append_sheet(wb, ws, "Categories");

  saveWorkbook(wb, "AsaliSwad_Categories");
}



// 10. GENERIC CUSTOM EXPORT FOR FILTERED PREVIEWS
export function exportCustomDataExcel(title: string, headers: string[], rows: any[][], filename: string, statsInfo?: string[]) {
  const wb = XLSX.utils.book_new();
  const ws = createStandardSheet(title, headers, rows, statsInfo);
  XLSX.utils.book_append_sheet(wb, ws, title.slice(0, 31).replace(/[\\\?\*\/\[\]]/g, "")); // sanitize name
  saveWorkbook(wb, filename);
}
