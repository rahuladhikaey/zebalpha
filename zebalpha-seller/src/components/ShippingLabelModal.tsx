"use client";

import React, { useRef } from "react";
import { BarcodeSVG, QRCodeSVG } from "./BarcodeGenerator";
import { Printer, Download, X, Truck, Package, ShieldCheck, AlertCircle } from "lucide-react";

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

  const awb = order.tracking_number || order.shipment_id || `DEL-${Math.floor(100000000 + Math.random() * 900000000)}`;
  const courier = order.courier_name || "Delhivery Surface";
  const routingHub = order.routing_hub || "CCU/EAST-HUB-01";
  const orderNumber = order.order_number || String(order.id).slice(0, 8).toUpperCase();
  const isCOD = order.payment_method === "COD";
  const totalAmount = order.total_amount || order.seller_total || 0;

  const customerName = order.customer_name || "Valued Customer";
  const customerAddress = order.address || order.shipping_address?.address || "Delivery Address Line";
  const customerCity = order.shipping_address?.city || order.city || "Kolkata";
  const customerState = order.shipping_address?.state || order.state || "West Bengal";
  const customerPincode = order.shipping_address?.pincode || order.pincode || "700001";
  const customerPhone = order.phone || order.shipping_address?.phone || "9876543210";

  const sellerName = sellerInfo?.store_name || "Zebalpha Verified Merchant";
  const sellerAddress = sellerInfo?.pickup_address || "Industrial Area, Warehouse Complex";
  const sellerCity = sellerInfo?.city || "Surat";
  const sellerState = sellerInfo?.state || "Gujarat";
  const sellerPincode = sellerInfo?.pincode || "395002";

  const items = Array.isArray(order.items)
    ? order.items
    : Array.isArray(order.seller_items)
    ? order.seller_items
    : typeof order.product_details === "string"
    ? JSON.parse(order.product_details || "[]")
    : [];

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto print:p-0 print:bg-white">
      {/* Container */}
      <div className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl print:border-none print:shadow-none print:bg-white print:max-w-none print:w-full">
        
        {/* Modal Top Bar (Hidden on Print) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/60 print:hidden">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
              <Truck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Official Shipping Label</h3>
              <p className="text-[11px] font-bold text-zinc-400">AWB: {awb} • {courier}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-black uppercase tracking-wider transition shadow-lg shadow-purple-600/20 cursor-pointer"
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

        {/* Printable Thermal Label Area */}
        <div className="p-6 bg-zinc-900/30 print:p-0 flex justify-center">
          <div
            ref={printRef}
            className="w-full max-w-[420px] bg-white text-black p-4 border-2 border-black rounded-lg shadow-xl font-sans print:shadow-none print:border-2 print:border-black print:rounded-none print:w-[380px] print:max-w-[380px]"
            style={{ minHeight: "560px" }}
          >
            {/* Header: Carrier & Zebalpha Branding */}
            <div className="flex items-center justify-between border-b-2 border-black pb-2 mb-2">
              <div>
                <span className="text-[9px] font-black uppercase tracking-widest text-zinc-600 block">Standard Air Express</span>
                <h1 className="text-lg font-black tracking-tight text-black uppercase">ZEBALPHA LOGISTICS</h1>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 bg-black text-white text-[11px] font-black uppercase tracking-wider rounded">
                  {courier}
                </span>
                <span className="text-[10px] font-mono font-bold block mt-0.5 text-zinc-800">{routingHub}</span>
              </div>
            </div>

            {/* AWB Code-128 Barcode */}
            <div className="border-b-2 border-black pb-3 pt-1 text-center bg-zinc-50/50">
              <span className="text-[9px] font-bold tracking-widest text-zinc-600 uppercase block mb-1">
                AWB Tracking Barcode (Scan at Pickup)
              </span>
              <BarcodeSVG value={awb} height={50} showText={true} />
            </div>

            {/* Routing & Payment Grid */}
            <div className="grid grid-cols-2 border-b-2 border-black divide-x-2 divide-black text-xs">
              <div className="p-2">
                <span className="text-[9px] font-bold text-zinc-600 block uppercase">Destination Pincode</span>
                <span className="text-2xl font-black text-black tracking-wider block">{customerPincode}</span>
                <span className="text-[10px] font-bold text-zinc-700">{customerCity}, {customerState}</span>
              </div>

              <div className="p-2 flex flex-col justify-center items-center text-center">
                <span className="text-[9px] font-bold text-zinc-600 uppercase">Payment Method</span>
                {isCOD ? (
                  <div className="mt-1 px-2 py-1 border-2 border-black bg-black text-white font-black text-sm uppercase rounded tracking-wider">
                    COD: ₹{totalAmount}
                  </div>
                ) : (
                  <div className="mt-1 px-3 py-1 border-2 border-black bg-zinc-100 font-black text-xs text-black uppercase rounded tracking-wider">
                    PREPAID ✓
                  </div>
                )}
              </div>
            </div>

            {/* Address Blocks */}
            <div className="grid grid-cols-1 border-b-2 border-black text-[11px] divide-y-2 divide-black">
              {/* Delivery To Address */}
              <div className="p-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px] font-black uppercase text-zinc-700 bg-zinc-200 px-1.5 py-0.5 rounded">
                    SHIP TO (CUSTOMER)
                  </span>
                  <span className="font-mono text-[10px] font-bold">Ph: {customerPhone}</span>
                </div>
                <p className="font-black text-xs text-black">{customerName}</p>
                <p className="text-zinc-800 text-[10px] leading-tight mt-0.5 font-medium">{customerAddress}</p>
                <p className="text-zinc-800 text-[10px] font-bold mt-0.5">{customerCity}, {customerState} - {customerPincode}</p>
              </div>

              {/* Return / Ship From Address */}
              <div className="p-2 bg-zinc-50/50">
                <span className="text-[9px] font-black uppercase text-zinc-600 block mb-0.5">
                  RETURN IF UNDELIVERED (SELLER)
                </span>
                <p className="font-bold text-[10px] text-black">{sellerName}</p>
                <p className="text-zinc-600 text-[9px] leading-tight">{sellerAddress}, {sellerCity}, {sellerState} - {sellerPincode}</p>
              </div>
            </div>

            {/* SKU & Items Details */}
            <div className="p-2 border-b-2 border-black">
              <div className="flex items-center justify-between text-[10px] font-bold border-b border-zinc-300 pb-1 mb-1">
                <span>ITEM DETAILS</span>
                <span>QTY</span>
              </div>
              <div className="space-y-1 text-[10px]">
                {items.length > 0 ? (
                  items.slice(0, 3).map((it: any, idx: number) => (
                    <div key={idx} className="flex justify-between items-center text-black">
                      <span className="truncate max-w-[240px] font-bold">
                        {it.name || it.title || "Fashion Apparel"} {it.size ? `(${it.size})` : ""}
                      </span>
                      <span className="font-mono font-black">{it.quantity || 1}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex justify-between items-center text-black font-bold">
                    <span>E-Commerce Apparel Package</span>
                    <span>1</span>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Footer with QR & Disclaimers */}
            <div className="pt-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <QRCodeSVG value={`https://zebalpha.com/track?awb=${awb}`} size={44} />
                <div className="text-[8px] text-zinc-600 leading-tight">
                  <p className="font-bold text-black">Order #{orderNumber}</p>
                  <p>Wt: 0.50 KG | Vol: 15x15x10</p>
                  <p>Handover to {courier} Rider</p>
                </div>
              </div>

              <div className="text-right">
                <span className="font-mono text-[8px] font-black block text-zinc-400">ZEBALPHA-MANIFEST-V2</span>
                <span className="text-[9px] font-black text-black">GST INVOICE ATTACHED</span>
              </div>
            </div>

          </div>
        </div>

        {/* Print Stylesheet Tag */}
        <style jsx global>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:border-none,
            .print\\:border-none * {
              visibility: visible;
            }
            @page {
              size: 4in 6in;
              margin: 0;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

export default ShippingLabelModal;
