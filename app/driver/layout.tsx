import type { Metadata } from "next";
import DriverShell from "@/components/driver/DriverShell";

export const metadata: Metadata = {
  manifest: "/manifest-driver.json",
};

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return <DriverShell>{children}</DriverShell>;
}
