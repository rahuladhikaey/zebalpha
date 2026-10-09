"use client";

import React, { useRef } from "react";
import { BarcodeSVG, QRCodeSVG } from "./BarcodeGenerator";
import { Printer, Download, X, Truck, Package, ShieldCheck, CheckCircle2 } from "lucide-react";
import { CancellationAlertCard } from "./CancellationAlertCard";

interface ShippingLabelProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  sellerInfo?: any;
}

export const ShippingLabelModal: React.FC<ShippingLabelProps> = ({
  isOpen,
  onClose,
  order,
  sellerInfo
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  if (!isOpen || !order) return null;

  const hasRealAwb = Boolean(order.tracking_number || order.shipment_id || order.shiprocket_shipment_id);
  const awb = order.tracking_number || order.shipment_id || order.shiprocket_shipment_id || "AWB-PENDING-DISPATCH";
  const courier = order.courier_name || (hasRealAwb ? "Shiprocket Partner" : "Awaiting Dispatch");
  
  const destinationCode = order.routing_hub || order.destination_code || "HUB-PENDING";
  const orderNumber = order.order_number || String(order.id).slice(0, 16).replace(/[^0-9A-Z]/gi, "").toUpperCase();
  const subOrderNumber = `${orderNumber}_1`;
  const invoiceNumber = order.invoice_number || (orderNumber ? `INV-${orderNumber}` : "INV-PENDING");
  const isCOD = order.payment_method === "COD";

  const customerName = order.customer_name || (typeof order.shipping_address === "object" ? order.shipping_address?.name : "") || "Customer";
  
  const rawAddrStr = typeof order.address === "string" 
    ? order.address 
    : (typeof order.shipping_address === "string" ? order.shipping_address : (order.shipping_address?.address || ""));

  let parsedPin = order.pincode || (typeof order.shipping_address === "object" ? order.shipping_address?.pincode : null);
  if (!parsedPin && rawAddrStr) {
    const pinMatch = rawAddrStr.match(/(?:Pin|Pincode|PIN)?\s*[:\-]?\s*(\d{6})\b/i) || rawAddrStr.match(/\b(\d{6})\b/);
    if (pinMatch) parsedPin = pinMatch[1];
  }
  const customerPincode = String(parsedPin || "").replace(/\D/g, "").slice(0, 6);

  let parsedCity = order.city || (typeof order.shipping_address === "object" ? order.shipping_address?.city : null);
  if (!parsedCity && rawAddrStr) {
    const cityMatch = rawAddrStr.match(/(?:Vill|Village|City|Town)\s*[:\-]\s*([^,]+)/i);
    if (cityMatch) parsedCity = cityMatch[1].trim();
  }
  const customerCity = parsedCity || "";

  let parsedState = order.state || (typeof order.shipping_address === "object" ? order.shipping_address?.state : null);
  if (!parsedState && rawAddrStr) {
    const stateMatch = rawAddrStr.match(/(?:P\.O|PO|State)\s*[:\-]\s*([^,]+)/i);
    if (stateMatch) parsedState = stateMatch[1].trim();
  }
  const customerState = parsedState || "";

  const customerAddress = rawAddrStr || "";
  const customerPhone = order.phone || (typeof order.shipping_address === "object" ? order.shipping_address?.phone : "") || "";

  const sellerName = sellerInfo?.business_name || sellerInfo?.store_name || sellerInfo?.full_name || order.seller_name || "Merchant Store";
  const sellerAddress = sellerInfo?.pickup_address || sellerInfo?.pickup_location || sellerInfo?.warehouse_address || sellerInfo?.address || order.seller_address || "";
  const sellerCity = sellerInfo?.city || order.seller_city || "";
  const sellerState = sellerInfo?.state || order.seller_state || "";
  const sellerPincode = sellerInfo?.pincode || order.seller_pincode || "";
  const returnCode = order.return_code || (sellerPincode ? `${sellerPincode},4565457` : "");
  const sellerGstin = sellerInfo?.gstin || sellerInfo?.enrolment_no || sellerInfo?.gst_number || order.seller_gstin || "";

  const itemsList: any[] = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : Array.isArray(order.seller_items) && order.seller_items.length > 0
    ? order.seller_items
    : typeof order.product_details === "string"
    ? JSON.parse(order.product_details || "[]")
    : [
        {
          name: order.product_name || order.title || "Apparel Item",
          sku: order.sku || "PROD-SKU",
          size: order.size || "Standard",
          quantity: order.quantity || 1,
          price: Number(order.item_price || order.product_price || order.price || order.subtotal || 0),
          color: order.color || ""
        }
      ];

  // Calculate real totals across items
  const itemsBreakdown = itemsList.map((item) => {
    const qty = Number(item.quantity) || 1;
    const unitPrice = Number(item.price || item.unit_price || item.sale_price || item.mrp || 0);
    const itemDiscount = Number(item.discount || item.discount_amount || 0);
    const gross = unitPrice * qty;
    const net = Math.max(0, gross - itemDiscount);
    return {
      ...item,
      qty,
      unitPrice,
      itemDiscount,
      gross,
      net,
    };
  });

  const totalGrossAmount = itemsBreakdown.reduce((acc, it) => acc + it.gross, 0);
  const totalItemDiscount = itemsBreakdown.reduce((acc, it) => acc + it.itemDiscount, 0);
  const orderLevelDiscount = Number(order.discount_amount || order.coupon_discount || 0);
  const effectiveDiscount = totalItemDiscount > 0 ? totalItemDiscount : orderLevelDiscount;
  const netProductsTotal = Math.max(0, totalGrossAmount - effectiveDiscount);

  // Real delivery & other fees from order
  const deliveryCharge = Number(order.shipping_charge || order.delivery_charge || order.shipping_fee || order.delivery_fee || 0);
  const packagingFee = Number(order.packaging_fee || order.other_charges || 0);
  const totalOtherCharges = deliveryCharge + packagingFee;

  // Final exact payable sum
  const totalInvoiceAmount = netProductsTotal + totalOtherCharges;

  const orderDateFormatted = new Date(order.created_at || Date.now()).toLocaleDateString("en-GB");
  const invoiceDateFormatted = new Date(order.label_generated_at || order.created_at || Date.now()).toLocaleDateString("en-GB");

  const [downloading, setDownloading] = React.useState(false);

  // 1. Direct 4x6" PDF Download Handler (html2canvas + jsPDF with fallback)
  const handleDownloadLabel = async () => {
    try {
      setDownloading(true);
      if (printRef.current) {
        const html2canvas = (await import("html2canvas")).default;
        const { jsPDF } = await import("jspdf");

        const canvas = await html2canvas(printRef.current, {
          scale: 3,
          useCORS: true,
          logging: false,
          backgroundColor: "#ffffff",
          windowWidth: 420,
        });

        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF({
          orientation: "portrait",
          unit: "in",
          format: [4, 6],
        });

        pdf.addImage(imgData, "PNG", 0, 0, 4, 6, undefined, "FAST");
        pdf.save(`Shipping_Label_${orderNumber}_${awb}.pdf`);
      } else if (order.shipping_label_url || order.label_url) {
        window.open(order.shipping_label_url || order.label_url, "_blank");
      }
    } catch (err) {
      console.warn("PDF Canvas generation notice, using fallback link:", err);
      if (order.shipping_label_url || order.label_url) {
        window.open(order.shipping_label_url || order.label_url, "_blank");
      } else {
        alert("Failed to download PDF. Please try again.");
      }
    } finally {
      setDownloading(false);
    }
  };

  // 2. Reliable Isolated Print Handler (Avoids Blank Page Bug in Modern Chrome/Edge)
  const handlePrint = () => {
    if (!printRef.current) {
      window.print();
      return;
    }

    const existingIframe = document.getElementById("label-print-iframe");
    if (existingIframe) existingIframe.remove();

    const iframe = document.createElement("iframe");
    iframe.id = "label-print-iframe";
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Shipping_Label_${orderNumber}</title>
          <style>
            @page {
              size: 4in 6in;
              margin: 0;
            }
            * {
              box-sizing: border-box;
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
              background: #fff;
              color: #000;
              width: 4in;
              margin: 0 auto;
              padding: 4px;
            }
            .grid { display: grid; }
            .grid-cols-\\[1\\.1fr_0\\.9fr\\] { grid-template-columns: 1.1fr 0.9fr; }
            .grid-cols-\\[1\\.2fr_0\\.8fr_0\\.5fr_0\\.8fr_1\\.7fr\\] { grid-template-columns: 1.2fr 0.8fr 0.5fr 0.8fr 1.7fr; }
            .grid-cols-2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .flex { display: flex; }
            .flex-col { flex-direction: column; }
            .items-center { align-items: center; }
            .items-start { align-items: flex-start; }
            .justify-between { justify-content: space-between; }
            .justify-center { justify-content: center; }
            .shrink-0 { flex-shrink: 0; }
            .border-b-2 { border-bottom: 2px solid #000; }
            .border-b { border-bottom: 1px solid #000; }
            .border-r-2 { border-right: 2px solid #000; }
            .border-r { border-right: 1px solid #000; }
            .border-t-2 { border-top: 2px solid #000; }
            .border-t { border-top: 1px solid #000; }
            .border-2 { border: 2px solid #000; }
            .border { border: 1px solid #000; }
            .border-black { border-color: #000 !important; }
            .bg-black { background-color: #000 !important; color: #fff !important; }
            .bg-white { background-color: #fff !important; color: #000 !important; }
            .bg-zinc-100, .bg-zinc-50 { background-color: #f4f4f5 !important; }
            .text-black { color: #000 !important; }
            .text-white { color: #fff !important; }
            .text-zinc-600, .text-zinc-700, .text-zinc-800 { color: #3f3f46 !important; }
            .font-bold { font-weight: 700; }
            .font-black { font-weight: 900; }
            .font-mono { font-family: monospace; }
            .uppercase { text-transform: uppercase; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .leading-tight { line-height: 1.25; }
            .leading-none { line-height: 1; }
            .p-1 { padding: 4px; }
            .p-1\\.5 { padding: 6px; }
            .p-2 { padding: 8px; }
            .px-2 { padding-left: 8px; padding-right: 8px; }
            .py-1 { padding-top: 4px; padding-bottom: 4px; }
            .w-full { width: 100%; }
            table { border-collapse: collapse; width: 100%; }
          </style>
        </head>
        <body>
          <div style="width: 380px; margin: 0 auto; border: 2px solid #000; background: #fff; color: #000; font-size: 10px;">
            ${printRef.current.innerHTML}
          </div>
          <script>
            setTimeout(() => {
              window.focus();
              window.print();
              setTimeout(() => {
                window.parent.document.getElementById("label-print-iframe")?.remove();
              }, 1500);
            }, 300);
          </script>
        </body>
      </html>
    `);
    doc.close();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      <style>{`
        @media print {
          body {
            visibility: hidden !important;
            background: #ffffff !important;
          }
          #printable-meesho-label {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 380px !important;
            max-width: 380px !important;
            margin: 0 auto !important;
            border: 2px solid #000 !important;
            background: #fff !important;
            color: #000 !important;
          }
          #printable-meesho-label * {
            visibility: visible !important;
          }
        }
      `}</style>
      
      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl print:border-none print:shadow-none print:bg-white print:max-w-none print:w-full print:rounded-none">
        
        {/* Top Action Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 bg-zinc-900/80 print:hidden">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider">
                Official Meesho-Standard 2-in-1 Dispatch Label
              </h3>
              <p className="text-[10px] font-mono font-bold text-zinc-400">
                AWB: {awb} • {courier}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Download Label Button */}
            <button
              onClick={handleDownloadLabel}
              disabled={downloading}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-purple-600/20 cursor-pointer active:scale-95 disabled:opacity-60"
            >
              <Download className={`h-3.5 w-3.5 ${downloading ? "animate-bounce" : ""}`} />
              <span>{downloading ? "Downloading..." : "Download Label (PDF)"}</span>
            </button>

            {/* Direct Print Button */}
            <button
              onClick={handlePrint}
              title="Print Label"
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition border border-zinc-700 cursor-pointer"
            >
              <Printer className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Mandatory Yellow Cancellation Alert Banner (Hidden on Print) */}
        <div className="p-4 print:hidden border-b border-zinc-800/80">
          <CancellationAlertCard
            createdAt={order.created_at || Date.now()}
            orderStatus={order.order_status || order.status || ""}
            shippingStatus={order.shipping_status || ""}
            orderId={order.order_number || String(order.id)}
          />
          {!hasRealAwb && (
            <div className="mt-2.5 p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs font-bold flex items-center gap-2">
              <span className="text-amber-400 text-base">⚠️</span>
              <span>Live Shiprocket AWB is pending. Once the 1-hour cancellation window expires, click <strong>Accept Order</strong> to push directly to Shiprocket and schedule courier pickup.</span>
            </div>
          )}
        </div>

        {/* Printable 4x6" 2-in-1 Combined Shipping Label & Invoice Body */}
        <div className="p-4 sm:p-6 bg-zinc-900/30 print:p-0 flex justify-center">
          
          <div
            ref={printRef}
            id="printable-meesho-label"
            className="w-full max-w-[420px] bg-white text-black border-2 border-black font-sans print:border-2 print:border-black print:w-[380px] print:max-w-[380px] shadow-2xl print:shadow-none select-text text-left leading-tight"
            style={{ fontSize: "10px" }}
          >
            {/* ════════════════════════════════════════════════════════════════════════
                TOP SECTION: LOGISTICS & COURIER ROUTING (SHADOWFAX / MEESHO STANDARD)
            ════════════════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-[1.1fr_0.9fr] border-b-2 border-black">
              
              {/* Left Column: Customer Address & Return Address */}
              <div className="p-2 border-r-2 border-black flex flex-col justify-between space-y-3">
                {/* Customer Address */}
                <div>
                  <span className="font-bold text-[10px] block text-black">Customer Address</span>
                  <p className="font-black text-xs text-black uppercase mt-0.5">{customerName}</p>
                  <p className="text-[10px] font-bold text-black mt-0.5 leading-tight break-words">
                    {customerAddress}
                  </p>
                  <p className="text-[10px] font-bold text-black mt-0.5">
                    {customerCity}, {customerState}, {customerPincode}
                  </p>
                  <p className="text-[9px] font-mono font-bold text-black mt-1">Ph: {customerPhone}</p>
                </div>

                {/* Return Address */}
                <div className="pt-2 border-t border-black/40">
                  <span className="font-bold text-[9px] block text-black">If undelivered, return to:</span>
                  <p className="font-black text-[10px] text-black uppercase mt-0.5">{sellerName}</p>
                  <p className="text-[9px] font-medium text-black mt-0.5 leading-tight break-words">
                    {sellerAddress}
                  </p>
                  <p className="text-[9px] font-bold text-black mt-0.5">
                    {sellerCity}, {sellerState}, {sellerPincode}
                  </p>
                </div>
              </div>

              {/* Right Column: Courier, Destination Hub, QR & Barcode */}
              <div className="flex flex-col justify-between">
                
                {/* Top COD Ribbon */}
                <div className="bg-black text-white px-2 py-1 text-center font-black text-[9px] uppercase tracking-wider">
                  {isCOD ? "COD: Check the payable amount on the app" : "PREPAID: Do Not Collect Cash"}
                </div>

                {/* Courier Branding + Pickup Badge */}
                <div className="px-2 pt-1.5 flex items-center justify-between">
                  <span className="font-black text-sm text-black tracking-tight">{courier}</span>
                  <span className="bg-black text-white px-1.5 py-0.2 text-[8px] font-black uppercase rounded-sm">
                    Pickup
                  </span>
                </div>

                {/* Destination Code & Return Code */}
                <div className="px-2 py-1 flex items-start justify-between gap-1">
                  <div>
                    <span className="text-[8px] font-bold text-zinc-600 block">Destination Code</span>
                    <span className="font-black text-xs text-black leading-none block mt-0.5">
                      {destinationCode}
                    </span>
                    <span className="text-[8px] font-bold text-zinc-600 block mt-1">Return Code</span>
                    <span className="font-mono font-bold text-[9px] text-black leading-none block">
                      {returnCode}
                    </span>
                  </div>

                  {/* High-density Matrix QR Code */}
                  <div className="shrink-0">
                    <QRCodeSVG value={`ORDER:${orderNumber}|AWB:${awb}|PIN:${customerPincode}`} size={56} />
                  </div>
                </div>

                {/* Code-128 Barcode with human-readable AWB */}
                <div className="p-1 border-t border-black bg-white">
                  <span className="font-mono font-black text-center text-[10px] block uppercase tracking-widest text-black mb-0.5">
                    {awb}
                  </span>
                  <BarcodeSVG value={awb} showText={false} height={32} width={180} />
                </div>

              </div>

            </div>

            {/* ════════════════════════════════════════════════════════════════════════
                MIDDLE ROW: PRODUCT DETAILS TABLE
            ════════════════════════════════════════════════════════════════════════ */}
            <div className="border-b-2 border-black bg-white">
              <div className="px-2 py-0.5 font-black text-[9px] uppercase tracking-wider text-black border-b border-black">
                Product Details
              </div>
              <div className="grid grid-cols-[1.2fr_0.8fr_0.5fr_0.8fr_1.7fr] text-[9px] text-black">
                <div className="p-1 font-black border-r border-black">SKU</div>
                <div className="p-1 font-black border-r border-black text-center">Size</div>
                <div className="p-1 font-black border-r border-black text-center">Qty</div>
                <div className="p-1 font-black border-r border-black text-center">Color</div>
                <div className="p-1 font-black text-right">Order No.</div>
              </div>
              {itemsBreakdown.map((item, idx) => (
                <div key={idx} className="grid grid-cols-[1.2fr_0.8fr_0.5fr_0.8fr_1.7fr] text-[9px] text-black border-t border-black/30 font-medium">
                  <div className="p-1 font-mono font-bold border-r border-black truncate">
                    {item.sku || order.sku || "PROD-SKU"}
                  </div>
                  <div className="p-1 border-r border-black text-center font-bold">
                    {item.size || "Standard"}
                  </div>
                  <div className="p-1 border-r border-black text-center font-bold">
                    {item.qty}
                  </div>
                  <div className="p-1 border-r border-black text-center truncate">
                    {item.color || "—"}
                  </div>
                  <div className="p-1 font-mono text-[8px] font-bold text-right truncate">
                    {subOrderNumber}
                  </div>
                </div>
              ))}
            </div>

            {/* ════════════════════════════════════════════════════════════════════════
                BOTTOM SECTION: BILL OF SUPPLY / COMMERCIAL INVOICE
            ════════════════════════════════════════════════════════════════════════ */}
            <div className="bg-white text-black">
              
              {/* Invoice Header Banner */}
              <div className="flex items-center justify-between px-2 py-1 bg-black text-white font-black text-[9px] uppercase tracking-wider">
                <span>BILL OF SUPPLY / COMMERCIAL INVOICE</span>
                <span className="text-[8px] font-normal lowercase italic text-zinc-300">Original For Recipient</span>
              </div>

              {/* Bill To vs Sold By */}
              <div className="grid grid-cols-2 p-1.5 border-b border-black text-[8px] leading-tight">
                {/* Left: Bill To */}
                <div className="pr-1.5 border-r border-black">
                  <span className="font-black text-[8px] uppercase block text-black">BILL TO / SHIP TO</span>
                  <p className="font-bold text-black uppercase mt-0.5">{customerName}</p>
                  <p className="text-zinc-800 leading-tight mt-0.5">{customerAddress}, {customerCity}, {customerPincode}</p>
                  <p className="text-zinc-800 mt-0.5">Place of Supply: {customerState}</p>
                </div>

                {/* Right: Sold By & Metadata */}
                <div className="pl-1.5 space-y-0.5">
                  <p><strong className="text-black">Sold by :</strong> {sellerName}</p>
                  <p className="truncate text-zinc-700">{sellerAddress}, {sellerCity} - {sellerPincode}</p>
                  <p className="font-mono text-black font-bold">Enrolment No. - {sellerGstin}</p>
                  
                  <div className="grid grid-cols-2 gap-1 pt-1 font-mono text-[7.5px] border-t border-black/30 mt-1">
                    <div>
                      <span className="text-zinc-600 block">Order No.</span>
                      <strong className="text-black truncate block">{orderNumber}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-600 block">Invoice No.</span>
                      <strong className="text-black truncate block">{invoiceNumber}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-600 block">Order Date</span>
                      <strong className="text-black block">{orderDateFormatted}</strong>
                    </div>
                    <div>
                      <span className="text-zinc-600 block">Invoice Date</span>
                      <strong className="text-black block">{invoiceDateFormatted}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Itemized Table */}
              <table className="w-full text-[8.5px] text-left border-b border-black">
                <thead className="bg-zinc-100 border-b border-black text-[8px] font-black text-black">
                  <tr>
                    <th className="p-1 w-[45%]">Description</th>
                    <th className="p-1 text-center">Qty</th>
                    <th className="p-1 text-right">Gross Amt</th>
                    <th className="p-1 text-right">Discount</th>
                    <th className="p-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/20">
                  {itemsBreakdown.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-1 font-bold text-black leading-tight">
                        {item.name || item.title || "Apparel Item"} {item.size ? `- ${item.size}` : ""}
                      </td>
                      <td className="p-1 text-center font-bold">{item.qty}</td>
                      <td className="p-1 text-right font-mono">Rs.{item.gross.toFixed(2)}</td>
                      <td className="p-1 text-right font-mono text-emerald-700">
                        {item.itemDiscount > 0 ? `Rs.${item.itemDiscount.toFixed(2)}` : (idx === 0 && orderLevelDiscount > 0 ? `Rs.${orderLevelDiscount.toFixed(2)}` : "Rs.0.00")}
                      </td>
                      <td className="p-1 text-right font-mono font-bold">
                        Rs.{(idx === 0 && orderLevelDiscount > 0 && item.itemDiscount === 0 ? Math.max(0, item.gross - orderLevelDiscount) : item.net).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {totalOtherCharges > 0 && (
                    <tr>
                      <td className="p-1 font-medium text-zinc-700" colSpan={2}>
                        {deliveryCharge > 0 && packagingFee > 0
                          ? `Delivery (Rs.${deliveryCharge}) + Packaging (Rs.${packagingFee})`
                          : deliveryCharge > 0
                          ? "Logistics / Delivery Fee"
                          : "Handling / Packaging Fee"}
                      </td>
                      <td className="p-1 text-right font-mono">Rs.{totalOtherCharges.toFixed(2)}</td>
                      <td className="p-1 text-right font-mono">Rs.0.00</td>
                      <td className="p-1 text-right font-mono font-bold">Rs.{totalOtherCharges.toFixed(2)}</td>
                    </tr>
                  )}
                  <tr className="bg-zinc-50 border-t-2 border-black font-black text-[9.5px]">
                    <td className="p-1 uppercase" colSpan={4}>Total Payable Amount</td>
                    <td className="p-1 text-right font-mono text-black">Rs.{totalInvoiceAmount.toFixed(2)}</td>
                  </tr>
                </tbody>
              </table>

              {/* Statutory Note Footer */}
              <div className="p-1 text-[7px] text-zinc-600 leading-tight">
                This is a computer generated invoice and does not require signature. Other charges are charges that are applicable to your order and include charges for logistics fee (where applicable). Includes discounts for your city and/or for online payments (as applicable).
              </div>

            </div>

          </div>

        </div>

        {/* Modal Bottom Controls (Hidden on Print) */}
        <div className="p-4 bg-zinc-900/60 border-t border-zinc-800 flex items-center justify-between print:hidden">
          <span className="text-[11px] font-bold text-zinc-400 flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            Standard 4x6" Thermal Label Format Ready for TSC/Zebra/Rollo Printers
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadLabel}
              disabled={downloading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-purple-600/20 cursor-pointer active:scale-95 disabled:opacity-60"
            >
              <Download className={`h-4 w-4 ${downloading ? "animate-bounce" : ""}`} />
              <span>{downloading ? "Downloading PDF..." : "Download Label (PDF)"}</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition border border-zinc-700 cursor-pointer"
            >
              🖨️ Print
            </button>
          </div>
        </div>

      </div>

    </div>
  );
};
