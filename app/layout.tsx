import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "A Year or Two Delicacies | Food, made memorable",
  description: "Order delicious meals from A Year or Two Delicacies.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
