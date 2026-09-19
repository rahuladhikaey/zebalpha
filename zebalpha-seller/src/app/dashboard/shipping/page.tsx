"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function ShippingPageRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/dashboard/addresses");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-zinc-400 text-sm">
      Redirecting to Pickup Hubs...
    </div>
  );
}
