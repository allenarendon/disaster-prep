import type { Metadata, Viewport } from "next";
import { ServiceWorkerRegistration } from "@/features/offline/components/ServiceWorkerRegistration";
import "./globals.css";

export const metadata: Metadata = {
  title: "PH Disaster Preparedness Guide",
  description:
    "Location-specific disaster guidance and evacuation center status for the Philippines",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#1d4ed8",
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
      <body>
        <ServiceWorkerRegistration />
        {children}
      </body>
    </html>
  );
}
