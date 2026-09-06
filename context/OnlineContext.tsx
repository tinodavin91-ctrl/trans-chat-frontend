"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getEcho } from "@/lib/echo";

type OnlineMember = { id: number; name: string };

type OnlineContextValue = {
  onlineIds: Set<number>;
  isOnline: (userId: number | null | undefined) => boolean;
};

const OnlineContext = createContext<OnlineContextValue>({
  onlineIds: new Set(),
  isOnline: () => false,
});

export function OnlineProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [onlineIds, setOnlineIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!token || !user) return;

    const echo = getEcho(token);
    const channel = echo.join("presence.online");

    channel
      .here((members: OnlineMember[]) => {
        setOnlineIds(new Set(members.map((m) => m.id)));
      })
      .joining((member: OnlineMember) => {
        setOnlineIds((prev) => new Set(prev).add(member.id));
      })
      .leaving((member: OnlineMember) => {
        setOnlineIds((prev) => {
          const next = new Set(prev);
          next.delete(member.id);
          return next;
        });
      });

    return () => {
      echo.leave("presence.online");
    };
  }, [token, user]);

  function isOnline(userId: number | null | undefined) {
    if (!userId) return false;
    return onlineIds.has(userId);
  }

  return (
    <OnlineContext.Provider value={{ onlineIds, isOnline }}>
      {children}
    </OnlineContext.Provider>
  );
}

export function useOnline() {
  return useContext(OnlineContext);
}