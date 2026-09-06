"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getEcho } from "@/lib/echo";
import { useOnline } from "@/context/OnlineContext";
import { useNotificationSound } from "@/hooks/useNotificationSound";

const ADMIN_EMAIL = "tinodavin91@gmail.com";

type Participant = {
  id: number;
  name: string;
};

type LatestMessage = {
  id: number;
  body: string;
  created_at: string;
};

type Conversation = {
  id: number;
  type: "direct" | "group";
  name: string | null;
  users: Participant[];
  latest_message: LatestMessage | null;
  unread_count?: number;
};

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

// Deliberate gradient set for avatars — cycles by conversation id so each
// contact reads as visually distinct without random/unstable colors.
const AVATAR_GRADIENTS = [
  "from-indigo-500 to-violet-500",
  "from-sky-500 to-indigo-500",
  "from-fuchsia-500 to-violet-500",
  "from-cyan-500 to-sky-600",
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
];

function avatarGradient(id: number) {
  return AVATAR_GRADIENTS[id % AVATAR_GRADIENTS.length];
}

export default function ConversationSidebar() {
  const { user, token, logout } = useAuth();
  const { isOnline } = useOnline();
  const pathname = usePathname();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const playNotificationSound = useNotificationSound();

  useEffect(() => {
    if (!token) return;
    loadConversations(true);

    const interval = setInterval(() => loadConversations(false), 5000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    if (!token || !user) return;

    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const echo = getEcho(token);
    const channel = echo.private(`user.${user.id}`);

    channel.listen(
      ".message.sent",
      (e: {
        message: { sender: { name: string }; body: string; sender_id: number };
        conversation_id: number;
      }) => {
        if (e.message.sender_id === user.id) return;

        // Play the notification sound for any incoming message, regardless
        // of which conversation is currently open or focused.
        playNotificationSound();

        const onThatChat = pathname === `/chat/${e.conversation_id}`;
        if (onThatChat && document.hasFocus()) return;

        loadConversations(false);

        let mutedIds: number[] = [];
        try {
          mutedIds = JSON.parse(localStorage.getItem("muted_conversations") || "[]");
        } catch {
          mutedIds = [];
        }
        if (mutedIds.includes(e.conversation_id)) return;

        if ("Notification" in window && Notification.permission === "granted") {
          const notif = new Notification(e.message.sender.name, {
            body: e.message.body,
            icon: "/favicon.ico",
          });
          notif.onclick = () => {
            window.focus();
            window.location.href = `/chat/${e.conversation_id}`;
          };
        }
      }
    );

    return () => {
      echo.leave(`user.${user.id}`);
    };
  }, [token, user, pathname]);

  // Whenever the user navigates into a chat, that conversation's unread
  // count should drop to 0 immediately in the sidebar (the chat page itself
  // calls /read on open — this just keeps the badge in sync without
  // waiting for the next 5s poll).
  useEffect(() => {
    const match = pathname?.match(/^\/chat\/(\d+)/);
    if (!match) return;

    const openId = Number(match[1]);

    setConversations((prev) =>
      prev.map((c) => (c.id === openId ? { ...c, unread_count: 0 } : c))
    );
  }, [pathname]);

  async function loadConversations(showLoading: boolean) {
    if (showLoading) setLoading(true);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setConversations(Array.isArray(data) ? data : []);
    if (showLoading) setLoading(false);
  }

  function label(conv: Conversation) {
    if (conv.type === "group") return conv.name || "Group chat";
    const other = conv.users.find((u) => u.id !== user?.id);
    return other?.name || "Unknown user";
  }

  function otherParticipant(conv: Conversation) {
    if (conv.type === "group") return null;
    return conv.users.find((u) => u.id !== user?.id) || null;
  }

  return (
    <aside className="w-80 flex-shrink-0 h-screen border-r border-[#232733] bg-[#171A24] flex flex-col">
      <div className="px-5 py-4 flex items-center justify-between border-b border-[#232733]">
        <h1 className="text-lg font-semibold text-[#EDEFF5] tracking-tight">TransChat</h1>
        <button
          onClick={logout}
          className="text-xs text-[#8B92A5] hover:text-[#EDEFF5] transition"
        >
          Logout
        </button>
      </div>

      <div className="px-3 pt-3">
        <Link
          href="/new"
          className="block text-center bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 transition text-white text-sm font-medium rounded-full py-2.5 mb-3 shadow-[0_0_20px_-8px_rgba(99,102,241,0.6)]"
        >
          + New conversation
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-4">
        {loading ? (
          <p className="text-sm text-[#5B6072] px-3 py-4">Loading...</p>
        ) : conversations.length === 0 ? (
          <p className="text-sm text-[#5B6072] px-3 py-4">No conversations yet.</p>
        ) : (
          <div className="space-y-1">
            {conversations.map((conv) => {
              const active = pathname === `/chat/${conv.id}`;
              const unread = conv.unread_count ?? 0;
              const hasUnread = !active && unread > 0;

              return (
                <Link
                  key={conv.id}
                  href={`/chat/${conv.id}`}
                  className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                    active ? "bg-[#232733]" : "hover:bg-[#1D2130]"
                  }`}
                >
                  {active && (
                    <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-gradient-to-b from-indigo-400 to-violet-500" />
                  )}
                  <div className="relative flex-shrink-0">
                    <div
                      className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarGradient(
                        conv.id
                      )} text-white flex items-center justify-center text-sm font-semibold`}
                    >
                      {initials(label(conv))}
                    </div>
                    {isOnline(otherParticipant(conv)?.id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-[#171A24]" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`text-sm truncate ${
                        hasUnread
                          ? "font-semibold text-white"
                          : "font-medium text-[#EDEFF5]"
                      }`}
                    >
                      {label(conv)}
                    </p>
                    <p
                      className={`text-xs truncate ${
                        hasUnread ? "text-[#B4B9C9]" : "text-[#8B92A5]"
                      }`}
                    >
                      {conv.latest_message?.body || "No messages yet"}
                    </p>
                  </div>
                  {hasUnread && (
                    <span className="flex-shrink-0 min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white text-[11px] font-semibold flex items-center justify-center">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {user?.email === ADMIN_EMAIL && (
        <div className="px-3 pb-2">
          <Link
            href="/admin/reports"
            className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
              pathname === "/admin/reports"
                ? "bg-[#232733] text-[#EDEFF5]"
                : "text-[#8B92A5] hover:bg-[#1D2130] hover:text-[#EDEFF5]"
            }`}
          >
            <span className="w-4 h-4 flex items-center justify-center">🛠️</span>
            Admin — Bug Reports
          </Link>
        </div>
      )}

      <div className="px-3 pb-2">
        <Link
          href="/settings"
          className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition ${
            pathname === "/settings"
              ? "bg-[#232733] text-[#EDEFF5]"
              : "text-[#8B92A5] hover:bg-[#1D2130] hover:text-[#EDEFF5]"
          }`}
        >
          <span className="w-4 h-4 flex items-center justify-center">⚙️</span>
          Settings
        </Link>
      </div>

      <div className="px-5 py-3 border-t border-[#232733] text-xs text-[#5B6072]">
        Signed in as <span className="font-medium text-[#B4B9C9]">{user?.name}</span>
      </div>
    </aside>
  );
}