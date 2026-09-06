"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import ReportBugModal from "@/components/ReportBugModal";

type Participant = { id: number; name: string };

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  isGroup: boolean;
  participants: Participant[];
  avatarGradient: string;
  conversationId: number;
  otherUserId: number | null; // null for group chats — block is disabled there
};

type MediaMessage = {
  id: number;
  body: string | null;
  attachment_url: string | null;
  attachment_type: "audio" | "image" | "file" | null;
  created_at: string;
  links?: string[];
};

type StarredMessage = {
  id: number;
  body: string | null;
  attachment_url: string | null;
  attachment_type: "audio" | "image" | "file" | null;
  sender: { id: number; name: string };
  created_at: string;
};

type MediaTab = "media" | "links" | "docs";
type PanelSection = "info" | "media" | "starred";

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

function getMutedIds(): number[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("muted_conversations") || "[]");
  } catch {
    return [];
  }
}

function setMutedIds(ids: number[]) {
  localStorage.setItem("muted_conversations", JSON.stringify(ids));
}

function fileNameFromUrl(url: string) {
  try {
    const parts = url.split("/");
    return decodeURIComponent(parts[parts.length - 1]);
  } catch {
    return "File";
  }
}

export default function ContactInfoPanel({
  open,
  onClose,
  title,
  isGroup,
  participants,
  avatarGradient,
  conversationId,
  otherUserId,
}: Props) {
  const { token } = useAuth();
  const router = useRouter();
  const [muted, setMuted] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [blockLoading, setBlockLoading] = useState(false);

  const [section, setSection] = useState<PanelSection>("info");
  const [mediaTab, setMediaTab] = useState<MediaTab>("media");
  const [mediaLoading, setMediaLoading] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaMessage[]>([]);
  const [linkItems, setLinkItems] = useState<MediaMessage[]>([]);
  const [docItems, setDocItems] = useState<MediaMessage[]>([]);

  const [starredLoading, setStarredLoading] = useState(false);
  const [starredItems, setStarredItems] = useState<StarredMessage[]>([]);

  const [clearing, setClearing] = useState(false);
  const [bugModalOpen, setBugModalOpen] = useState(false);

  useEffect(() => {
    setMuted(getMutedIds().includes(conversationId));
  }, [conversationId]);

  useEffect(() => {
    if (!otherUserId || !token) return;
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${otherUserId}/block`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => setBlocked(!!data.blocked))
      .catch(() => {});
  }, [otherUserId, token]);

  useEffect(() => {
    // reset to the info view whenever a different conversation panel opens
    if (open) setSection("info");
  }, [open, conversationId]);

  function toggleMute() {
    const ids = getMutedIds();
    const next = muted ? ids.filter((i) => i !== conversationId) : [...ids, conversationId];
    setMutedIds(next);
    setMuted(!muted);
  }

  async function toggleBlock() {
    if (!otherUserId) return;

    if (!blocked) {
      const confirmed = window.confirm(
        `Block ${title}? They won't be able to message you, and you'll be taken back to your conversations.`
      );
      if (!confirmed) return;
    }

    setBlockLoading(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${otherUserId}/block`, {
        method: blocked ? "DELETE" : "POST",
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        alert("Something went wrong. Please try again.");
        return;
      }

      const data = await res.json();
      setBlocked(!!data.blocked);

      if (data.blocked) {
        router.push("/");
      }
    } finally {
      setBlockLoading(false);
    }
  }

  async function openMedia() {
    setSection("media");
    setMediaLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/conversations/${conversationId}/media`,
        { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setMediaItems(data.media || []);
      setLinkItems(data.links || []);
      setDocItems(data.docs || []);
    } finally {
      setMediaLoading(false);
    }
  }

  async function openStarred() {
    setSection("starred");
    setStarredLoading(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/conversations/${conversationId}/starred`,
        { headers: { Accept: "application/json", Authorization: `Bearer ${token}` } }
      );
      const data = await res.json();
      setStarredItems(Array.isArray(data) ? data : []);
    } finally {
      setStarredLoading(false);
    }
  }

  async function handleClearChat() {
    const confirmed = window.confirm(
      "Clear this chat history? This deletes every message for both participants and can't be undone."
    );
    if (!confirmed) return;

    setClearing(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/conversations/${conversationId}/clear`,
        {
          method: "DELETE",
          headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        window.location.reload();
      } else {
        alert("Couldn't clear the chat. Please try again.");
      }
    } finally {
      setClearing(false);
    }
  }

  if (!open) return null;

  return (
    <aside className="w-80 flex-shrink-0 h-screen border-l border-[#232733] bg-[#171A24] flex flex-col overflow-y-auto">
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#232733]">
        {section !== "info" ? (
          <button
            onClick={() => setSection("info")}
            className="flex items-center gap-1.5 text-sm text-[#8B92A5] hover:text-[#EDEFF5] transition"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m15 18-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {section === "media" ? "Media, links & docs" : "Starred messages"}
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={onClose}
          className="w-8 h-8 rounded-full flex items-center justify-center text-[#8B92A5] hover:bg-[#232733] hover:text-[#EDEFF5] transition"
          title="Close"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {section === "info" && (
        <>
          <div className="flex flex-col items-center pt-6 pb-5 px-5 border-b border-[#232733]">
            <div
              className={`w-20 h-20 rounded-full bg-gradient-to-br ${avatarGradient} text-white flex items-center justify-center text-2xl font-semibold`}
            >
              {initials(title)}
            </div>
            <h2 className="mt-3 text-base font-semibold text-[#EDEFF5]">{title}</h2>
            <p className="text-xs text-[#8B92A5] mt-0.5">
              {isGroup ? `${participants.length} members` : "Direct message"}
            </p>
          </div>

          {isGroup && (
            <div className="px-5 py-4 border-b border-[#232733]">
              <p className="text-xs font-medium text-[#5B6072] uppercase tracking-wide mb-2">
                Members
              </p>
              <div className="space-y-2">
                {participants.map((p) => (
                  <div key={p.id} className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-[#2A3040] text-[#B4B9C9] flex items-center justify-center text-[11px] font-medium flex-shrink-0">
                      {initials(p.name)}
                    </div>
                    <p className="text-sm text-[#DADFEA] truncate">{p.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="px-2 py-2 border-b border-[#232733] space-y-0.5">
            <button
              onClick={openMedia}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#DADFEA] hover:bg-[#232733] transition text-left"
            >
              <span className="w-4 h-4 flex items-center justify-center">🖼️</span>
              Media, links & docs
            </button>
            <button
              onClick={openStarred}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#DADFEA] hover:bg-[#232733] transition text-left"
            >
              <span className="w-4 h-4 flex items-center justify-center">⭐</span>
              Starred messages
            </button>
          </div>

          <div className="flex-1" />

          <div className="px-2 py-3 border-t border-[#232733] space-y-0.5">
            <button
              onClick={toggleMute}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#DADFEA] hover:bg-[#232733] transition text-left"
            >
              <span className="w-4 h-4 flex items-center justify-center">{muted ? "🔕" : "🔔"}</span>
              {muted ? "Unmute notifications" : "Mute notifications"}
            </button>

            <button
              onClick={handleClearChat}
              disabled={clearing}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#DADFEA] hover:bg-[#232733] transition text-left disabled:opacity-50"
            >
              <span className="w-4 h-4 flex items-center justify-center">🗑️</span>
              {clearing ? "Clearing..." : "Clear chat history"}
            </button>

            <button
              onClick={() => setBugModalOpen(true)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-[#DADFEA] hover:bg-[#232733] transition text-left"
            >
              <span className="w-4 h-4 flex items-center justify-center">🐞</span>
              Report a bug
            </button>

            {!isGroup && otherUserId && (
              <button
                onClick={toggleBlock}
                disabled={blockLoading}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-rose-400 hover:bg-[#232733] transition text-left disabled:opacity-50"
              >
                <span className="w-4 h-4 flex items-center justify-center">⛔</span>
                {blockLoading ? "Please wait..." : blocked ? "Unblock user" : "Block user"}
              </button>
            )}
          </div>
        </>
      )}

      {section === "media" && (
        <div className="flex flex-col flex-1">
          <div className="flex border-b border-[#232733]">
            {(["media", "links", "docs"] as MediaTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setMediaTab(tab)}
                className={`flex-1 py-2.5 text-xs font-medium capitalize transition ${
                  mediaTab === tab
                    ? "text-[#EDEFF5] border-b-2 border-indigo-500"
                    : "text-[#5B6072] hover:text-[#8B92A5]"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="px-4 py-4 flex-1">
            {mediaLoading && (
              <p className="text-xs text-[#5B6072] text-center mt-6">Loading...</p>
            )}

            {!mediaLoading && mediaTab === "media" && (
              mediaItems.length === 0 ? (
                <p className="text-xs text-[#5B6072] text-center mt-6">No media shared yet.</p>
              ) : (
                <div className="grid grid-cols-3 gap-1.5">
                  {mediaItems.map((m) =>
                    m.attachment_type === "image" && m.attachment_url ? (
                      <a
                        key={m.id}
                        href={m.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="aspect-square rounded-md overflow-hidden bg-[#232733]"
                      >
                        <img
                          src={m.attachment_url}
                          alt="shared media"
                          className="w-full h-full object-cover"
                        />
                      </a>
                    ) : (
                      <div
                        key={m.id}
                        className="aspect-square rounded-md bg-[#232733] flex items-center justify-center p-1.5"
                      >
                        {m.attachment_url && (
                          <audio controls src={m.attachment_url} className="w-full" />
                        )}
                      </div>
                    )
                  )}
                </div>
              )
            )}

            {!mediaLoading && mediaTab === "links" && (
              linkItems.length === 0 ? (
                <p className="text-xs text-[#5B6072] text-center mt-6">No links shared yet.</p>
              ) : (
                <div className="space-y-2">
                  {linkItems.map((m) =>
                    (m.links || []).map((link, i) => (
                      <a
                        key={`${m.id}-${i}`}
                        href={link}
                        target="_blank"
                        rel="noreferrer"
                        className="block px-3 py-2 rounded-lg bg-[#1D2130] text-xs text-indigo-300 hover:text-indigo-200 truncate"
                      >
                        {link}
                      </a>
                    ))
                  )}
                </div>
              )
            )}

            {!mediaLoading && mediaTab === "docs" && (
              docItems.length === 0 ? (
                <p className="text-xs text-[#5B6072] text-center mt-6">No documents shared yet.</p>
              ) : (
                <div className="space-y-2">
                  {docItems.map((m) => (
                    <a
                      key={m.id}
                      href={m.attachment_url ?? "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-[#1D2130] hover:bg-[#232733] transition"
                    >
                      <span className="text-base">📄</span>
                      <span className="text-xs text-[#DADFEA] truncate">
                        {m.attachment_url ? fileNameFromUrl(m.attachment_url) : "File"}
                      </span>
                    </a>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}

      {section === "starred" && (
        <div className="px-4 py-4 flex-1">
          {starredLoading && (
            <p className="text-xs text-[#5B6072] text-center mt-6">Loading...</p>
          )}

          {!starredLoading && starredItems.length === 0 && (
            <p className="text-xs text-[#5B6072] text-center mt-6">
              Star a message to keep it here.
            </p>
          )}

          {!starredLoading && starredItems.length > 0 && (
            <div className="space-y-2">
              {starredItems.map((m) => (
                <div key={m.id} className="px-3 py-2 rounded-lg bg-[#1D2130]">
                  <p className="text-[11px] text-[#5B6072] mb-0.5">{m.sender.name}</p>
                  {m.attachment_type === "image" && m.attachment_url && (
                    <img
                      src={m.attachment_url}
                      alt="starred attachment"
                      className="rounded-md max-h-40 object-cover mb-1"
                    />
                  )}
                  {m.body && <p className="text-sm text-[#DADFEA]">{m.body}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <ReportBugModal isOpen={bugModalOpen} onClose={() => setBugModalOpen(false)} />
    </aside>
  );
}