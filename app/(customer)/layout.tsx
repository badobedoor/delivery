import UserSync from "@/components/UserSync";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <UserSync />
      {children}
    </>
  );
}
