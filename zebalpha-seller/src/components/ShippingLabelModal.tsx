"use client";

import React, { useRef } from "react";
import { BarcodeSVG, QRCodeSVG } from "./BarcodeGenerator";
import { Printer, Download, X, Truck, Package, ShieldCheck, CheckCircle2 } from "lucide-react";

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

  const courier = order.courier_name || "Shadowfax";
  const isShadowfax = courier.toLowerCase().includes("shadowfax");
  const defaultAwbPrefix = isShadowfax ? "SF" : "DEL";
  const awb = order.tracking_number || order.shipment_id || `${defaultAwbPrefix}${Math.floor(1000000000 + Math.random() * 9000000000)}FPL`;
  
  const destinationCode = order.routing_hub || order.destination_code || "E31_CCU_Metr";
  const orderNumber = order.order_number || String(order.id).slice(0, 16).replace(/[^0-9A-Z]/gi, "").toUpperCase();
  const subOrderNumber = `${orderNumber}_1`;
  const invoiceNumber = order.invoice_number || `wgvxz${Math.floor(1000 + Math.random() * 9000)}`;
  const isCOD = order.payment_method === "COD";

  const customerName = order.customer_name || "Valued Customer";
  const customerAddress = order.address || order.shipping_address?.address || "136H/11 Beliaghata Road";
  const customerCity = order.shipping_address?.city || order.city || "Kolkata";
  const customerState = order.shipping_address?.state || order.state || "West Bengal";
  const customerPincode = order.shipping_address?.pincode || order.pincode || "700015";
  const customerPhone = order.phone || order.shipping_address?.phone || "9883637054";

  const sellerName = sellerInfo?.business_name || sellerInfo?.store_name || sellerInfo?.full_name || "SHANTI RANI BISWAS (Jaganath Super Market)";
  const sellerAddress = sellerInfo?.pickup_address || sellerInfo?.pickup_location || "GHETUGACHHI, Bastra Niketan, 27 NO ROAD OSOKTALA NEAR KHARKATA BAZAR";
  const sellerCity = sellerInfo?.city || "Chakdaha";
  const sellerState = sellerInfo?.state || "West Bengal";
  const sellerPincode = sellerInfo?.pincode || "741222";
  const returnCode = order.return_code || `${sellerPincode},4565457`;
  const sellerGstin = sellerInfo?.gstin || sellerInfo?.enrolment_no || "192600187449ESM";

  const items: any[] = Array.isArray(order.items) && order.items.length > 0
    ? order.items
    : Array.isArray(order.seller_items) && order.seller_items.length > 0
    ? order.seller_items
    : typeof order.product_details === "string"
    ? JSON.parse(order.product_details || "[]")
    : [];

  const firstItem = items[0] || {
    name: "VARIATOR Astronaut Graphic Oversized T-Shirt",
    sku: "P5krKHQN",
    size: "Free Size",
    quantity: 1,
    price: 420,
    color: "Teal"
  };

  const itemPrice = Number(firstItem.price || firstItem.subtotal) || 420;
  const itemQty = Number(firstItem.quantity) || 1;
  const discountAmount = Number(order.discount_amount) || 22;
  const otherCharges = Number(order.shipping_charge || order.delivery_fee) || 24;
  const grossAmount = itemPrice * itemQty;
  const subTotalAfterDiscount = Math.max(0, grossAmount - discountAmount);
  const totalInvoiceAmount = Number(order.total_amount) || (subTotalAfterDiscount + otherCharges);

  const orderDateFormatted = new Date(order.created_at || Date.now()).toLocaleDateString("en-GB");
  const invoiceDateFormatted = new Date(order.label_generated_at || order.created_at || Date.now()).toLocaleDateString("en-GB");

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 overflow-y-auto print:p-0 print:bg-white print:static print:overflow-visible">
      
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
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-purple-600/20 cursor-pointer active:scale-95"
            >
              <Printer className="h-3.5 w-3.5" />
              Print Label (4x6")
            </button>
            <button
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
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
              <div className="grid grid-cols-[1.2fr_0.8fr_0.5fr_0.8fr_1.7fr] text-[9px] text-black border-t border-black/30 font-medium">
                <div className="p-1 font-mono font-bold border-r border-black truncate">
                  {firstItem.sku || "P5krKHQN"}
                </div>
                <div className="p-1 border-r border-black text-center font-bold">
                  {firstItem.size || "Free Size"}
                </div>
                <div className="p-1 border-r border-black text-center font-bold">
                  {itemQty}
                </div>
                <div className="p-1 border-r border-black text-center">
                  {firstItem.color || "Teal"}
                </div>
                <div className="p-1 font-mono text-[8px] font-bold text-right truncate">
                  {subOrderNumber}
                </div>
              </div>
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
                  <tr>
                    <td className="p-1 font-bold text-black leading-tight">
                      {firstItem.name || firstItem.title || "Premium Apparel Cotton Wear"} - {firstItem.size || "Free Size"}
                    </td>
                    <td className="p-1 text-center font-bold">{itemQty}</td>
                    <td className="p-1 text-right font-mono">Rs.{grossAmount.toFixed(2)}</td>
                    <td className="p-1 text-right font-mono text-emerald-700">Rs.{discountAmount.toFixed(2)}</td>
                    <td className="p-1 text-right font-mono font-bold">Rs.{subTotalAfterDiscount.toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td className="p-1 font-medium text-zinc-700" colSpan={2}>
                      Other Charges (Logistics / Packaging)
                    </td>
                    <td className="p-1 text-right font-mono">Rs.{otherCharges.toFixed(2)}</td>
                    <td className="p-1 text-right font-mono">Rs.0.00</td>
                    <td className="p-1 text-right font-mono font-bold">Rs.{otherCharges.toFixed(2)}</td>
                  </tr>
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
          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black uppercase tracking-wider transition cursor-pointer"
          >
            🖨️ Print Label Now
          </button>
        </div>

      </div>

    </div>
  );
};
