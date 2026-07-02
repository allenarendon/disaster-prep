import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/features/offline/components/ServiceWorkerRegistration";
import { Footer } from "@/features/shared/components/Footer";
import "./globals.css";

export const metadata: Metadata = {
  title: "PH Disaster Preparedness Guide",
  description:
    "Location-specific disaster guidance and evacuation center status for the Philippines",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0038A8",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        <ServiceWorkerRegistration />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
