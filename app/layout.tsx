import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A Year or Two Delicacies | Food, made memorable",
  description: "Order delicious meals from A Year or Two Delicacies.",
  icons: {
    icon: [{ url: "/logo.jpg", type: "image/jpeg" }],
    shortcut: "/logo.jpg",
    apple: "/logo.jpg"
  },
  openGraph: {
    title: "A Year or Two Delicacies | Food, made memorable",
    description: "Order delicious meals from A Year or Two Delicacies.",
    images: [{ url: "/logo.jpg" }]
  }
};

export const viewport: Viewport = {
  themeColor: "#000000"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
