import UserSync from "@/components/UserSync";
import BottomNav from "@/components/customer/BottomNav";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <UserSync />
      {children}
      <BottomNav />
    </>
  );
}