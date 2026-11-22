"use client";

import React, { useState, useEffect } from "react";
import { AlertTriangle, Clock, CheckCircle2, Lock } from "lucide-react";

interface CancellationAlertCardProps {
  createdAt: string | number;
  orderStatus: string;
  shippingStatus?: string;
  orderId: string;
}

export const CancellationAlertCard: React.FC<CancellationAlertCardProps> = ({
  createdAt,
  orderStatus,
  shippingStatus,
  orderId
}) => {
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    const createdTimestamp = new Date(createdAt).getTime();
    const expiryTimestamp = createdTimestamp + 60 * 60 * 1000; // Exactly 60 Minutes

    const updateTimer = () => {
      const now = Date.now();
      const diff = expiryTimestamp - now;

      if (diff <= 0) {
        setTimeLeftMs(0);
        setIsExpired(true);
      } else {
        setTimeLeftMs(diff);
        setIsExpired(false);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [createdAt]);

  const isPickedUp = 
    shippingStatus?.toLowerCase() === "picked_up" ||
    shippingStatus?.toLowerCase() === "in_transit" ||
    orderStatus?.toLowerCase() === "picked_up" ||
    orderStatus?.toLowerCase() === "in_transit" ||
    orderStatus?.toLowerCase() === "shipped";

  const isCancelled = orderStatus?.toLowerCase() === "cancelled";

  if (isCancelled) {
    return (
      <div className="p-4 rounded-2xl bg-[#FFF4F2] border border-[#F03A46]/35 text-[#7F1D1D] space-y-1">
        <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-[#DC2626]">
          <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
          <span>ORDER CANCELLED BY CUSTOMER</span>
        </div>
        <p className="text-[11px] text-[#7F1D1D] font-medium leading-relaxed">
          This order was cancelled within the cancellation window. Do not dispatch this package.
        </p>
      </div>
    );
  }

  // 1. If Courier Has Picked Up
  if (isPickedUp) {
    return (
      <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-300 text-emerald-900 space-y-1">
        <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-emerald-700">
          <Lock className="w-4 h-4 text-emerald-700" />
          <span>COURIER PICKED UP</span>
        </div>
        <p className="text-[11px] text-emerald-800 font-medium leading-relaxed">
          Customer cancellation is no longer available. Order has been handed over to logistics partner.
        </p>
      </div>
    );
  }

  // Format MM:SS or HH:MM:SS
  const formatCountdown = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  // 2. Active 60-Minute Window (PROMINENT GOLD ALERT CARD)
  if (!isExpired) {
    return (
      <div className="p-4 rounded-2xl bg-[#FFF8DB] border-2 border-[#DFBE6F] text-[#4A3F2B] space-y-2.5 shadow-sm animate-in fade-in">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-[#9A6503]">
            <AlertTriangle className="w-4.5 h-4.5 text-[#F03A46] animate-pulse" />
            <span>CUSTOMER CANCELLATION WINDOW ACTIVE</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-[#DFBE6F] text-[#9A6503] font-mono font-black text-xs shadow-sm">
            <Clock className="w-3.5 h-3.5 text-[#F03A46]" />
            <span>{formatCountdown(timeLeftMs)} remaining</span>
          </div>
        </div>

        <p className="text-[11px] text-[#5C4E35] font-medium leading-relaxed">
          Customer can cancel this order until the 60-minute window expires.{" "}
          <strong className="text-[#14120F]">Do not hand over the parcel to courier before the window ends.</strong>
        </p>

        <div className="pt-1.5 border-t border-[#EAD296] flex items-center justify-between text-[10px] text-[#7A6847] font-mono font-bold">
          <span>Order ID: {orderId}</span>
          <span>Window: 60 Minutes</span>
        </div>
      </div>
    );
  }

  // 3. After 60 Minutes (Closed)
  return (
    <div className="p-4 rounded-2xl bg-[#FFF9EB] border border-[#EAD296] text-[#5C4E35] space-y-1">
      <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider text-[#14120F]">
        <CheckCircle2 className="w-4 h-4 text-[#047857]" />
        <span>CANCELLATION WINDOW CLOSED</span>
      </div>
      <p className="text-[11px] text-[#5C4E35] font-medium leading-relaxed">
        The customer cancellation window has expired. You can proceed with shipment processing, subject to logistics status.
      </p>
    </div>
  );
};
