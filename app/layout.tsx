import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import UserSync from "@/components/UserSync";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "Delivery App",
  description: "Delivery application",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ar"
      dir="rtl"
      className={`${cairo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-[var(--font-cairo)]">
        <UserSync />
        {children}
      </body>
    </html>
  );
}
