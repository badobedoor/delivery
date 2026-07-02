import type { Metadata } from "next";
import { Cairo } from "next/font/google";
import "./globals.css";
import SplashWrapper from "@/components/SplashWrapper";

const cairo = Cairo({
  variable: "--font-cairo",
  subsets: ["arabic", "latin"],
});

export const metadata: Metadata = {
  title: "حالا دلفري",
  description: "كل احتياجاتك، توصلك... حالاً",
  icons: {
    icon: '/icon.ico',
    apple: '/icon.ico',
  },
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
      <head>
        <meta name="theme-color" content="#FF6000" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="حالا" />
        <link rel="apple-touch-icon" href="/icon.png" />
        <script dangerouslySetInnerHTML={{__html: `
          if (${process.env.NODE_ENV === "production"} && 'serviceWorker' in navigator) {
            window.addEventListener('load', () => {
              navigator.serviceWorker.register('/sw.js')
            })
          }
        `}} />
      </head>
      <body className="min-h-full flex flex-col font-[var(--font-cairo)]">
        <SplashWrapper>{children}</SplashWrapper>
      </body>
    </html>
  );
}
