"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { OnlineProvider } from "@/context/OnlineContext";
import ConversationSidebar from "@/components/ConversationSidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (!user) router.push("/login");
  }, [loading, user]);

  if (loading || !user) return null;

  return (
    <OnlineProvider>
      <div className="flex w-full">
        <ConversationSidebar />
        <div className="flex-1 flex flex-col h-screen">{children}</div>
      </div>
    </OnlineProvider>
  );
}