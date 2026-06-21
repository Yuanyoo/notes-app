"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { CategorySidebar } from "@/components/notes/CategorySidebar";
import { useAuth } from "@/components/auth/AuthProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#faf1e3] flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-4 border-[#957139] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-[#faf1e3] flex overflow-hidden h-screen">
      <CategorySidebar />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
