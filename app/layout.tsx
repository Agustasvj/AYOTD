import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A Year or Two Delicacies | Food, made memorable",
  description: "Order delicious meals from A Year or Two Delicacies.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" }
    ],
    apple: "/apple-icon.png"
  }
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
