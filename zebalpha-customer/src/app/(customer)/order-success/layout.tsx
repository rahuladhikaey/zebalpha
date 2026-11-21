import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order Confirmed | ZebAlpha",
  robots: { index: false, follow: false },
};

export default function OrderSuccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
