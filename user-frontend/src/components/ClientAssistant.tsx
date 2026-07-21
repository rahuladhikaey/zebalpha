"use client";

import dynamicImport from "next/dynamic";

const FloatingAssistant = dynamicImport(() => import("./FloatingAssistant"), {
  ssr: false,
});

export default function ClientAssistant() {
  return <FloatingAssistant />;
}
