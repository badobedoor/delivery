import type { Metadata } from "next";
import EntityShell from "@/components/entity/EntityShell";

export const metadata: Metadata = {
  title: "بوابة المنشآت | حالا",
};

export default function EntityLayout({ children }: { children: React.ReactNode }) {
  return <EntityShell>{children}</EntityShell>;
}
