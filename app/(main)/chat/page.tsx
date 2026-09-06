"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getEcho } from "@/lib/echo";
import ContactInfoPanel from "@/components/ContactInfoPanel";

type Sender = { id: number; name: string };

type Message = {
  id: number;
  body: string | null;
  attachment_url: string | null;
  attachment_type: "audio" | "image" | "file" | null;
  sender_id: number;
  sender: Sender;
  created_at: string;
};

type Participant = { id: number; name: string };

type ConversationDetail = {
  id: number;
  type: "direct" | "group";
  name: string | null;
  users: Participant[];
};

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

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

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const { user, token } = useAuth();
  const router = useRouter();

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!token || !id) return;
    loadConversation();
    setInfoOpen(false);
    setSearchOpen(false);
    setSearchQuery("");
  }, [token, id]);

  useEffect(() => {
    if (!token || !id) return;

    const echo = getEcho(token);
    const channel = echo.private(`conversation.${id}`);

    channel.listen(".message.sent", (e: { message: Message }) => {
      setMessages((prev) => [...prev, e.message]);
    });

    return () => {
      echo.leave(`conversation.${id}`);
    };
  }, [token, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversation() {
    setLoading(true);
    const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/conversations/" + id, {
      headers: { Accept: "application/json", Authorization: "Bearer " + token },
    });

    if (!res.ok) {
      router.push("/");
      return;
    }

    const data = await res.json();
    setConversation(data);
    setMessages(data.messages || []);
    setLoading(false);
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;

    setSending(true);

    const res = await fetch(process.env.NEXT_PUBLIC_API_URL + "/conversations/" + id + "/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: "Bearer " + token,
      },
      body: JSON.stringify({ body }),
    });

    const data = await res.json();

    if (res.ok) {
      setMessages((prev) => [...prev, data]);
      setBody("");
    }

    setSending(false);
  }

  async function handleFilePicked(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL + "/conversations/" + id + "/messages",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: "Bearer " + token,
          },
          body: formData,
        }
      );

      const data = await res.json();

      if (res.ok) {
        setMessages((prev) => [...prev, data]);
      }
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  }

  async function toggleRecording() {
    if (recording) {
      mediaRecorderRef.current?.stop();
      setRecording(false);
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert("Voice recording isn't supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());

        const formData = new FormData();
        formData.append("file", audioBlob, "voice-message.webm");

        setUploading(true);
        try {
          const res = await fetch(
            process.env.NEXT_PUBLIC_API_URL + "/conversations/" + id + "/messages",
            {
              method: "POST",
              headers: {
                Accept: "application/json",
                Authorization: "Bearer " + token,
              },
              body: formData,
            }
          );

          const data = await res.json();
          if (res.ok) {
            setMessages((prev) => [...prev, data]);
          }
        } finally {
          setUploading(false);
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch (err) {
      console.error("Microphone access denied or unavailable", err);
      alert("Couldn't access your microphone. Check browser permissions.");
    }
  }

  function conversationLabel() {
    if (!conversation) return "";
    if (conversation.type === "group") return conversation.name || "Group chat";
    const other = conversation.users.find((u) => u.id !== user?.id);
    return other?.name || "Unknown user";
  }

  if (loading || !conversation) {
    return <div className="flex-1 bg-[#12141C]" />;
  }

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col h-screen bg-[#12141C]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#232733] flex items-center justify-between">
          <button
            onClick={() => setInfoOpen((v) => !v)}
            className="flex items-center gap-3 min-w-0 group"
          >
            <div
              className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(
                conversation.id
              )} text-white flex items-center justify-center text-xs font-semibold flex-shrink-0`}
            >
              {initials(conversationLabel())}
            </div>
            <h1 className="text-sm font-semibold text-[#EDEFF5] truncate group-hover:text-white">
              {conversationLabel()}
            </h1>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setSearchOpen((v) => !v);
                if (searchOpen) setSearchQuery("");
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                searchOpen
                  ? "bg-[#232733] text-[#EDEFF5]"
                  : "text-[#8B92A5] hover:bg-[#232733] hover:text-[#EDEFF5]"
              }`}
              title="Search in conversation"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m21 21-4.35-4.35" strokeLinecap="round" />
              </svg>
            </button>
            <button
              onClick={() => setInfoOpen((v) => !v)}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                infoOpen
                  ? "bg-[#232733] text-[#EDEFF5]"
                  : "text-[#8B92A5] hover:bg-[#232733] hover:text-[#EDEFF5]"
              }`}
              title="Info"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                <circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none" />
              </svg>
            </button>
          </div>
        </div>

        {searchOpen && (
          <div className="px-5 py-2.5 border-b border-[#232733]">
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in this conversation"
              className="w-full bg-[#1D2130] border border-[#232733] rounded-full px-4 py-1.5 text-sm text-[#EDEFF5] placeholder:text-[#5B6072] outline-none focus:border-indigo-500"
            />
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {(() => {
            const visibleMessages =
              searchOpen && searchQuery.trim()
                ? messages.filter((m) =>
                    (m.body || "").toLowerCase().includes(searchQuery.trim().toLowerCase())
                  )
                : messages;

            if (visibleMessages.length === 0) {
              return (
                <p className="text-[#5B6072] text-sm text-center mt-8">
                  {searchOpen && searchQuery.trim()
                    ? "No messages match your search."
                    : "No messages yet. Say hi."}
                </p>
              );
            }

            return visibleMessages.map((msg) => {
              const isMine = msg.sender_id === user?.id;

              return (
                <div key={msg.id} className={"flex " + (isMine ? "justify-end" : "justify-start")}>
                  <div
                    className={
                      "max-w-[70%] px-4 py-2 text-sm leading-relaxed rounded-2xl " +
                      (isMine
                        ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white rounded-br-md"
                        : "bg-[#232733] text-[#EDEFF5] rounded-bl-md")
                    }
                  >
                    {msg.attachment_type === "audio" && msg.attachment_url && (
                      <audio controls src={msg.attachment_url} className="max-w-full" />
                    )}

                    {msg.attachment_type === "image" && msg.attachment_url && (
                      <img
                        src={msg.attachment_url}
                        alt="attachment"
                        className="rounded-lg max-w-full max-h-64 object-cover"
                      />
                    )}

                    {msg.attachment_type === "file" && msg.attachment_url && (
                      <a
                        href={msg.attachment_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline block text-inherit opacity-90 hover:opacity-100"
                      >
                        Download file
                      </a>
                    )}

                    {msg.body && <p className={msg.attachment_url ? "mt-1" : ""}>{msg.body}</p>}
                  </div>
                </div>
              );
            });
          })()}
          <div ref={bottomRef} />
        </div>

        {/* Composer */}
        <form onSubmit={handleSend} className="px-4 py-3 border-t border-[#232733]">
          {uploading && <p className="text-xs text-[#5B6072] mb-2 px-2">Uploading...</p>}
          <div className="flex items-center gap-2 bg-[#1D2130] border border-[#232733] rounded-full px-2 py-1.5">
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePicked} />

            <button
              type="button"
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8B92A5] hover:bg-[#232733] hover:text-[#EDEFF5] transition flex-shrink-0"
              title="Attach"
            >
              <span className="text-lg leading-none">+</span>
            </button>

            <input
              type="text"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Type a message"
              className="flex-1 bg-transparent px-2 py-1.5 text-sm text-[#EDEFF5] placeholder:text-[#5B6072] outline-none"
            />

            <button
              type="button"
              onClick={toggleRecording}
              className={
                recording
                  ? "w-8 h-8 rounded-full flex items-center justify-center bg-rose-500 text-white flex-shrink-0"
                  : "w-8 h-8 rounded-full flex items-center justify-center text-[#8B92A5] hover:bg-[#232733] hover:text-[#EDEFF5] transition flex-shrink-0"
              }
              title={recording ? "Tap to stop" : "Tap to record"}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3z" />
                <path
                  d="M19 11a7 7 0 0 1-14 0M12 19v3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <button
              type="submit"
              disabled={sending || !body.trim()}
              className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 disabled:opacity-30 text-white flex items-center justify-center flex-shrink-0 transition"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        </form>
      </div>

      <ContactInfoPanel
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={conversationLabel()}
        isGroup={conversation.type === "group"}
        participants={conversation.users}
        avatarGradient={avatarGradient(conversation.id)}
        conversationId={conversation.id}
        otherUserId={
          conversation.type === "direct"
            ? conversation.users.find((u) => u.id !== user?.id)?.id ?? null
            : null
        }
      />
    </div>
  );
}