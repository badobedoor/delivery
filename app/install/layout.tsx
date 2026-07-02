import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "ثبت تطبيق حالا دلفري | اطلب أسرع",
  description:
    "حمل تطبيق حالا دلفري الآن واستمتع بتجربة طلب أسرع، تتبع الطلب لحظة بلحظة، وحفظ المطاعم المفضلة.",
  openGraph: {
    title: "ثبت تطبيق حالا دلفري",
    description: "اطلب أسرع وافتح التطبيق بضغطة واحدة.",
    type: "website",
    locale: "ar_AR",
    siteName: "حالا دلفري",
    images: [
      {
        url: "/images/landing/hero-home.webp",
        width: 1200,
        height: 630,
        alt: "حالا دلفري — طلب أسرع",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "ثبت تطبيق حالا دلفري",
    description: "اطلب أسرع وافتح التطبيق بضغطة واحدة.",
    images: ["/images/landing/hero-home.webp"],
  },
  alternates: {
    canonical: "/install",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function InstallLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
