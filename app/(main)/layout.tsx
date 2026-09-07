"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { OnlineProvider } from "@/context/OnlineContext";
import ConversationSidebar from "@/components/ConversationSidebar";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) router.push("/login");
  }, [loading, user]);

  if (loading || !user) return null;

  // On mobile, show only the sidebar when on the base /chat route,
  // and only the content panel on any deeper route (a specific
  // conversation, settings, admin, etc). Desktop (md+) always shows both.
  const isBaseChatRoute = pathname === "/chat";

  return (
    <OnlineProvider>
      <div className="flex w-full">
        <div className={isBaseChatRoute ? "flex w-full md:w-auto" : "hidden md:flex"}>
          <ConversationSidebar />
        </div>
        <div
          className={
            (isBaseChatRoute ? "hidden md:flex" : "flex w-full") +
            " flex-1 flex-col h-screen"
          }
        >
          {children}
        </div>
      </div>
    </OnlineProvider>
  );
}