"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import UserSync from "@/components/UserSync";
import BottomNav from "@/components/customer/BottomNav";
import InstallPrompt from "@/components/customer/InstallPrompt";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.replace("/login");
      else setChecking(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) router.replace("/login");
    });

    return () => subscription.unsubscribe();
  }, []);

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="w-8 h-8 border-4 border-[#FF6000] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <>
      <UserSync />
      {children}
      <BottomNav />
      <InstallPrompt />
    </>
  );
}
