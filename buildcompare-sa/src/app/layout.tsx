import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "BuildCompare SA | Smart Price Comparison for Contractors",
  description: "South Africa's premier construction materials price comparison platform. Compare prices from Builders, Leroy Merlin, and local yards. Save time and money on every project.",
  keywords: "construction, building materials, price comparison, South Africa, contractors, Builders Warehouse, Leroy Merlin, cement, bricks, construction supplies",
  authors: [{ name: "BuildCompare SA" }],
  openGraph: {
    title: "BuildCompare SA | Smart Price Comparison for Contractors",
    description: "Compare building material prices across South Africa's top suppliers",
    type: "website",
    locale: "en_ZA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${outfit.variable} antialiased`}
        style={{ fontFamily: "var(--font-inter), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
