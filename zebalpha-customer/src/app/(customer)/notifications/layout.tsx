import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Notifications | ZebAlpha",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
