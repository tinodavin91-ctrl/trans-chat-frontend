"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getEcho } from "@/lib/echo";
import { useOnline } from "@/context/OnlineContext";
import ContactInfoPanel from "@/components/ContactInfoPanel";

type Sender = {
  id: number;
  name: string;
};

type Reaction = {
  id: number;
  emoji: string;
  user_id: number;
  user_name: string;
};

type StickerItem = {
  id: number;
  name: string | null;
  image_url: string;
};

type StickerPack = {
  id: number;
  name: string;
  stickers: StickerItem[];
};

type Message = {
  id: number;
  body: string | null;
  attachment_url: string | null;
  attachment_type: "audio" | "image" | "file" | null;
  type?: string | null;
  sticker_id?: number | null;
  sticker?: StickerItem | null;
  sender_id: number;
  sender: Sender;
  created_at: string;
  read_at: string | null;
  starred_at: string | null;
  reactions?: Reaction[];
};

type Participant = {
  id: number;
  name: string;
};

type ConversationDetail = {
  id: number;
  type: "direct" | "group";
  name: string | null;
  users: Participant[];
};

const REACTION_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// Virtual pack id used for the user's own uploaded stickers
const MY_STICKERS_ID = -1;

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
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
  const { isOnline } = useOnline();
  const router = useRouter();

  const [conversation, setConversation] =
    useState<ConversationDetail | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [reactionPickerFor, setReactionPickerFor] =
    useState<number | null>(null);

  const [stickerPickerOpen, setStickerPickerOpen] = useState(false);
  const [stickerPacks, setStickerPacks] = useState<StickerPack[]>([]);
  const [stickerPacksLoading, setStickerPacksLoading] = useState(false);
  const [stickersInitialized, setStickersInitialized] = useState(false);
  const [activeStickerPackId, setActiveStickerPackId] = useState<number | null>(null);
  const [sendingSticker, setSendingSticker] = useState(false);

  const [myStickers, setMyStickers] = useState<StickerItem[]>([]);
  const [uploadingSticker, setUploadingSticker] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const stickerFileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const channelRef = useRef<any>(null);
  const stickerPickerRef = useRef<HTMLDivElement>(null);

  const typingTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopTypingTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const longPressTimerRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const [typingUserName, setTypingUserName] =
    useState<string | null>(null);

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

    channelRef.current = channel;

    channel.listen(
      ".message.sent",
      (e: { message: Message }) => {
        setMessages((prev) => [...prev, e.message]);
      }
    );

    channel.listen(
      ".message.read",
      (e: { message_ids: number[] }) => {
        setMessages((prev) =>
          prev.map((m) =>
            e.message_ids.includes(m.id)
              ? {
                  ...m,
                  read_at: new Date().toISOString(),
                }
              : m
          )
        );
      }
    );

    channel.listen(
      ".message.reaction.updated",
      (e: {
        message_id: number;
        reactions: Reaction[];
      }) => {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === e.message_id
              ? {
                  ...m,
                  reactions: e.reactions,
                }
              : m
          )
        );
      }
    );

    channel.listenForWhisper(
      "typing",
      (e: { name: string }) => {
        setTypingUserName(e.name);

        if (stopTypingTimeoutRef.current) {
          clearTimeout(stopTypingTimeoutRef.current);
        }

        stopTypingTimeoutRef.current = setTimeout(() => {
          setTypingUserName(null);
        }, 2500);
      }
    );

    channel.listenForWhisper("stopTyping", () => {
      setTypingUserName(null);

      if (stopTypingTimeoutRef.current) {
        clearTimeout(stopTypingTimeoutRef.current);
      }
    });

    return () => {
      channelRef.current = null;
      echo.leave(`conversation.${id}`);
    };
  }, [token, id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  useEffect(() => {
    if (reactionPickerFor === null) return;

    const close = () => setReactionPickerFor(null);

    window.addEventListener("click", close);

    return () => {
      window.removeEventListener("click", close);
    };
  }, [reactionPickerFor]);

  useEffect(() => {
    if (!stickerPickerOpen) return;

    function handleClick(e: MouseEvent) {
      if (
        stickerPickerRef.current &&
        !stickerPickerRef.current.contains(e.target as Node)
      ) {
        setStickerPickerOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClick);

    return () => {
      window.removeEventListener("mousedown", handleClick);
    };
  }, [stickerPickerOpen]);

  async function loadConversation(showLoading = true) {
    if (showLoading) setLoading(true);

    const res = await fetch(
      process.env.NEXT_PUBLIC_API_URL +
        "/conversations/" +
        id,
      {
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + token,
        },
      }
    );

    if (!res.ok) {
      router.push("/");
      return;
    }

    const data = await res.json();

    setConversation(data);
    setMessages(data.messages || []);
    if (showLoading) setLoading(false);

    fetch(
      process.env.NEXT_PUBLIC_API_URL +
        "/conversations/" +
        id +
        "/read",
      {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: "Bearer " + token,
        },
      }
    );
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();

    if (!body.trim()) return;

    setSending(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    channelRef.current?.whisper("stopTyping", {});

    const res = await fetch(
      process.env.NEXT_PUBLIC_API_URL +
        "/conversations/" +
        id +
        "/messages",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          body,
        }),
      }
    );

    const data = await res.json();

    if (res.ok) {
      setBody("");
      await loadConversation(false);
    }

    setSending(false);
  }

  async function openStickerPicker() {
    setStickerPickerOpen((v) => !v);

    if (stickersInitialized) return;

    setStickerPacksLoading(true);

    try {
      const [packsRes, mineRes] = await Promise.all([
        fetch(process.env.NEXT_PUBLIC_API_URL + "/stickers", {
          headers: {
            Accept: "application/json",
            Authorization: "Bearer " + token,
          },
        }),
        fetch(process.env.NEXT_PUBLIC_API_URL + "/stickers/mine", {
          headers: {
            Accept: "application/json",
            Authorization: "Bearer " + token,
          },
        }),
      ]);

      const packsData = await packsRes.json();
      const mineData = await mineRes.json();

      if (packsRes.ok) {
        setStickerPacks(packsData);
        setActiveStickerPackId(packsData[0]?.id ?? MY_STICKERS_ID);
      } else {
        setActiveStickerPackId(MY_STICKERS_ID);
      }

      if (mineRes.ok) {
        setMyStickers(mineData);
      }

      setStickersInitialized(true);
    } finally {
      setStickerPacksLoading(false);
    }
  }

  async function handleSendSticker(sticker: StickerItem) {
    if (sendingSticker) return;

    setSendingSticker(true);
    setStickerPickerOpen(false);

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL +
          "/conversations/" +
          id +
          "/messages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            sticker_id: sticker.id,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        await loadConversation(false);
      }
    } finally {
      setSendingSticker(false);
    }
  }

  async function handleStickerUpload(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploadingSticker(true);

    const formData = new FormData();
    formData.append("image", file);

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL + "/stickers",
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
        setMyStickers((prev) => [data, ...prev]);
        setActiveStickerPackId(MY_STICKERS_ID);
      } else {
        alert(
          data.message ||
            "Couldn't upload that sticker. Try a smaller image (max 2MB)."
        );
      }
    } finally {
      setUploadingSticker(false);
      e.target.value = "";
    }
  }

  function handleBodyChange(value: string) {
    setBody(value);

    if (!channelRef.current || !user) return;

    channelRef.current.whisper("typing", {
      name: user.name,
    });

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.whisper("stopTyping", {});
    }, 1500);
  }

  async function toggleStar(messageId: number) {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId
          ? {
              ...m,
              starred_at: m.starred_at
                ? null
                : new Date().toISOString(),
            }
          : m
      )
    );

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL +
          "/messages/" +
          messageId +
          "/star",
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            Authorization: "Bearer " + token,
          },
        }
      );

      if (!res.ok) {
        throw new Error("Failed to toggle star");
      }

      const data = await res.json();

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                starred_at: data.starred_at,
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                starred_at: m.starred_at
                  ? null
                  : new Date().toISOString(),
              }
            : m
        )
      );
    }
  }

  async function toggleReaction(
    messageId: number,
    emoji: string
  ) {
    setReactionPickerFor(null);

    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || !user) {
          return m;
        }

        const existing = (m.reactions || []).find(
          (r) => r.user_id === user.id
        );

        let nextReactions: Reaction[];

        if (
          existing &&
          existing.emoji === emoji
        ) {
          nextReactions = (m.reactions || []).filter(
            (r) => r.user_id !== user.id
          );
        } else if (existing) {
          nextReactions = (m.reactions || []).map(
            (r) =>
              r.user_id === user.id
                ? {
                    ...r,
                    emoji,
                  }
                : r
          );
        } else {
          nextReactions = [
            ...(m.reactions || []),
            {
              id: Date.now(),
              emoji,
              user_id: user.id,
              user_name: user.name,
            },
          ];
        }

        return {
          ...m,
          reactions: nextReactions,
        };
      })
    );

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL +
          "/messages/" +
          messageId +
          "/react",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            emoji,
          }),
        }
      );

      if (!res.ok) {
        throw new Error("Failed to react");
      }

      const data = await res.json();

      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId
            ? {
                ...m,
                reactions: data.reactions,
              }
            : m
        )
      );
    } catch {
      loadConversation();
    }
  }

  function startLongPress(messageId: number) {
    longPressTimerRef.current = setTimeout(() => {
      setReactionPickerFor(messageId);
    }, 500);
  }

  function cancelLongPress() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function groupedReactions(
    reactions: Reaction[] = []
  ) {
    const groups: Record<string, Reaction[]> = {};

    reactions.forEach((r) => {
      if (!groups[r.emoji]) {
        groups[r.emoji] = [];
      }

      groups[r.emoji].push(r);
    });

    return groups;
  }

  async function handleFilePicked(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);

    const formData = new FormData();

    formData.append("file", file);

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL +
          "/conversations/" +
          id +
          "/messages",
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
        await loadConversation(false);
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

    if (
      !navigator.mediaDevices ||
      !navigator.mediaDevices.getUserMedia
    ) {
      alert(
        "Voice recording isn't supported in this browser."
      );
      return;
    }

    try {
      const stream =
        await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

      const recorder = new MediaRecorder(stream);

      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(
          audioChunksRef.current,
          {
            type: "audio/webm",
          }
        );

        stream
          .getTracks()
          .forEach((track) => track.stop());

        const formData = new FormData();

        formData.append(
          "file",
          audioBlob,
          "voice-message.webm"
        );

        setUploading(true);

        try {
          const res = await fetch(
            process.env.NEXT_PUBLIC_API_URL +
              "/conversations/" +
              id +
              "/messages",
            {
              method: "POST",
              headers: {
                Accept: "application/json",
                Authorization:
                  "Bearer " + token,
              },
              body: formData,
            }
          );

          const data = await res.json();

          if (res.ok) {
            await loadConversation(false);
          }
        } finally {
          setUploading(false);
        }
      };

      mediaRecorderRef.current = recorder;

      recorder.start();

      setRecording(true);
    } catch (err) {
      console.error(
        "Microphone access denied or unavailable",
        err
      );

      alert(
        "Couldn't access your microphone. Check browser permissions."
      );
    }
  }

  function conversationLabel() {
    if (!conversation) return "";

    if (conversation.type === "group") {
      return conversation.name || "Group chat";
    }

    const other = conversation.users.find(
      (u) => u.id !== user?.id
    );

    return other?.name || "Unknown user";
  }

  function otherParticipantId() {
    if (
      !conversation ||
      conversation.type === "group"
    ) {
      return null;
    }

    return (
      conversation.users.find(
        (u) => u.id !== user?.id
      )?.id ?? null
    );
  }

  if (loading || !conversation) {
    return (
      <div className="flex-1 bg-[#12141C]" />
    );
  }

  const displayPacks: StickerPack[] = [
    { id: MY_STICKERS_ID, name: "My Stickers", stickers: myStickers },
    ...stickerPacks,
  ];

  const activePack = displayPacks.find(
    (p) => p.id === activeStickerPackId
  );

  const isMyStickersActive = activeStickerPackId === MY_STICKERS_ID;

  return (
    <div className="flex h-screen">
      <div className="flex-1 flex flex-col h-screen bg-[#080a12] chat-rgb-wrapper">
        <div className="px-5 py-3.5 border-b border-[#232733] flex items-center justify-between">
          <button
            onClick={() =>
              setInfoOpen((v) => !v)
            }
            className="flex items-center gap-3 min-w-0 group"
          >
            <div className="relative flex-shrink-0">
              <div
                className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarGradient(
                  conversation.id
                )} text-white flex items-center justify-center text-xs font-semibold`}
              >
                {initials(conversationLabel())}
              </div>

              {isOnline(
                otherParticipantId()
              ) && (
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-[#080a12]" />
              )}
            </div>

            <div className="min-w-0">
              <h1 className="text-sm font-semibold text-[#EDEFF5] truncate group-hover:text-white">
                {conversationLabel()}
              </h1>

              {typingUserName && (
                <p className="text-[11px] text-indigo-400 truncate">
                  {typingUserName} is typing...
                </p>
              )}
            </div>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setSearchOpen((v) => !v);

                if (searchOpen) {
                  setSearchQuery("");
                }
              }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                searchOpen
                  ? "bg-[#232733] text-[#EDEFF5]"
                  : "text-[#8B92A5] hover:bg-[#232733] hover:text-[#EDEFF5]"
              }`}
              title="Search in conversation"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle
                  cx="11"
                  cy="11"
                  r="7"
                />

                <path
                  d="m21 21-4.35-4.35"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <button
              onClick={() =>
                setInfoOpen((v) => !v)
              }
              className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                infoOpen
                  ? "bg-[#232733] text-[#EDEFF5]"
                  : "text-[#8B92A5] hover:bg-[#232733] hover:text-[#EDEFF5]"
              }`}
              title="Info"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  cx="5"
                  cy="12"
                  r="1.5"
                  fill="currentColor"
                  stroke="none"
                />

                <circle
                  cx="12"
                  cy="12"
                  r="1.5"
                  fill="currentColor"
                  stroke="none"
                />

                <circle
                  cx="19"
                  cy="12"
                  r="1.5"
                  fill="currentColor"
                  stroke="none"
                />
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
              onChange={(e) =>
                setSearchQuery(e.target.value)
              }
              placeholder="Search in this conversation"
              className="w-full bg-[#1D2130] border border-[#232733] rounded-full px-4 py-1.5 text-sm text-[#EDEFF5] placeholder:text-[#5B6072] outline-none focus:border-indigo-500"
            />
          </div>
        )}

        <div className="chat-rgb-area flex-1 overflow-y-auto px-6 py-4 space-y-2">
          {(() => {
            const visibleMessages =
              searchOpen &&
              searchQuery.trim()
                ? messages.filter((m) =>
                    (m.body || "")
                      .toLowerCase()
                      .includes(
                        searchQuery
                          .trim()
                          .toLowerCase()
                      )
                  )
                : messages;

            if (visibleMessages.length === 0) {
              return (
                <p className="text-[#5B6072] text-sm text-center mt-8">
                  {searchOpen &&
                  searchQuery.trim()
                    ? "No messages match your search."
                    : "No messages yet. Say hi."}
                </p>
              );
            }

            return visibleMessages.map((msg) => {
              const isMine =
                msg.sender_id === user?.id;

              const isStarred =
                !!msg.starred_at;

              const isSticker =
                msg.type === "sticker" && !!msg.sticker;

              const reactionGroups =
                groupedReactions(msg.reactions);

              const hasReactions =
                Object.keys(
                  reactionGroups
                ).length > 0;

              const starButton = (
                <button
                  onClick={() =>
                    toggleStar(msg.id)
                  }
                  className={
                    "flex-shrink-0 transition opacity-0 group-hover:opacity-100 " +
                    (isStarred
                      ? "!opacity-100"
                      : "")
                  }
                  title={
                    isStarred
                      ? "Unstar message"
                      : "Star message"
                  }
                >
                  <svg
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill={
                      isStarred
                        ? "#facc15"
                        : "none"
                    }
                    stroke={
                      isStarred
                        ? "#facc15"
                        : "currentColor"
                    }
                    strokeWidth="1.5"
                    className="text-[#5B6072] hover:text-[#facc15]"
                  >
                    <path
                      d="M12 2.5l2.9 6.4 6.9.7-5.2 4.7 1.5 6.9L12 17.6l-6.1 3.6 1.5-6.9-5.2-4.7 6.9-.7L12 2.5z"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              );

              return (
                <div
                  key={msg.id}
                  className={
                    "flex items-end gap-1.5 group w-full " +
                    (isMine
                      ? "justify-end"
                      : "justify-start")
                  }
                >
                  {isMine && starButton}

                  <div
                    className={
                      "relative flex-shrink-0 max-w-[70%]"
                    }
                  >
                    {isSticker ? (
                      <div
                        onMouseDown={() =>
                          startLongPress(msg.id)
                        }
                        onMouseUp={cancelLongPress}
                        onMouseLeave={cancelLongPress}
                        onTouchStart={() =>
                          startLongPress(msg.id)
                        }
                        onTouchEnd={cancelLongPress}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setReactionPickerFor(msg.id);
                        }}
                        className="select-none"
                      >
                        <img
                          src={msg.sticker!.image_url}
                          alt={msg.sticker!.name || "sticker"}
                          className="w-32 h-32 object-contain"
                          draggable={false}
                        />

                        {isMine && (
                          <div className="flex justify-end -mt-1">
                            <svg
                              width="15"
                              height="15"
                              viewBox="0 0 16 15"
                              fill="none"
                              className={
                                msg.read_at
                                  ? "text-indigo-400"
                                  : "text-[#5B6072]"
                              }
                            >
                              <path
                                d="M1 7.5L5 11.5L6.5 10"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />

                              <path
                                d="M6 7.5L10 11.5L15 4.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                    ) : (
                    <div
                      onMouseDown={() =>
                        startLongPress(msg.id)
                      }
                      onMouseUp={
                        cancelLongPress
                      }
                      onMouseLeave={
                        cancelLongPress
                      }
                      onTouchStart={() =>
                        startLongPress(msg.id)
                      }
                      onTouchEnd={
                        cancelLongPress
                      }
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setReactionPickerFor(
                          msg.id
                        );
                      }}
                      className={
                        "inline-block w-auto max-w-full " +
                        "px-4 py-2 rounded-2xl " +
                        "select-none overflow-hidden " +
                        (isMine
                          ? "bg-gradient-to-br from-indigo-500 to-violet-500 text-white rounded-br-md"
                          : "bg-[#232733] text-[#EDEFF5] rounded-bl-md")
                      }
                    >
                      {msg.attachment_type ===
                        "audio" &&
                        msg.attachment_url && (
                          <audio
                            controls
                            src={
                              msg.attachment_url
                            }
                            className="max-w-full"
                          />
                        )}

                      {msg.attachment_type ===
                        "image" &&
                        msg.attachment_url && (
                          <img
                            src={
                              msg.attachment_url
                            }
                            alt="attachment"
                            className="rounded-lg max-w-full max-h-64 object-cover"
                          />
                        )}

                      {msg.attachment_type ===
                        "file" &&
                        msg.attachment_url && (
                          <a
                            href={
                              msg.attachment_url
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="underline block text-inherit opacity-90 hover:opacity-100"
                          >
                            Download file
                          </a>
                        )}

                      {msg.body && (
                        <p
                          className={
                            "text-sm leading-relaxed " +
                            "whitespace-pre-wrap " +
                            "break-words text-left " +
                            (msg.attachment_url
                              ? "mt-1"
                              : "")
                          }
                        >
                          {msg.body}
                        </p>
                      )}

                      {isMine && (
                        <div className="flex justify-end mt-1">
                          <svg
                            width="15"
                            height="15"
                            viewBox="0 0 16 15"
                            fill="none"
                            className={
                              msg.read_at
                                ? "text-white/90"
                                : "text-white/60"
                            }
                          >
                            <path
                              d="M1 7.5L5 11.5L6.5 10"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />

                            <path
                              d="M6 7.5L10 11.5L15 4.5"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </div>
                      )}
                    </div>
                    )}

                    {hasReactions && (
                      <div
                        className={
                          "absolute -bottom-3 flex gap-1 " +
                          (isMine
                            ? "right-2"
                            : "left-2")
                        }
                      >
                        {Object.entries(
                          reactionGroups
                        ).map(
                          ([
                            emoji,
                            group,
                          ]) => {
                            const mine =
                              user &&
                              group.some(
                                (r) =>
                                  r.user_id ===
                                  user.id
                              );

                            return (
                              <button
                                key={emoji}
                                onClick={(e) => {
                                  e.stopPropagation();

                                  toggleReaction(
                                    msg.id,
                                    emoji
                                  );
                                }}
                                className={
                                  "flex items-center gap-0.5 px-1.5 py-0.5 " +
                                  "rounded-full text-[11px] border shadow-sm " +
                                  (mine
                                    ? "bg-indigo-500/20 border-indigo-400"
                                    : "bg-[#171A24] border-[#232733]")
                                }
                                title={group
                                  .map(
                                    (r) =>
                                      r.user_name
                                  )
                                  .join(", ")}
                              >
                                <span>
                                  {emoji}
                                </span>

                                {group.length >
                                  1 && (
                                  <span className="text-[#B4B9C9]">
                                    {
                                      group.length
                                    }
                                  </span>
                                )}
                              </button>
                            );
                          }
                        )}
                      </div>
                    )}

                    {reactionPickerFor ===
                      msg.id && (
                      <div
                        onClick={(e) =>
                          e.stopPropagation()
                        }
                        className={
                          "absolute -top-11 z-20 flex items-center gap-1 " +
                          "px-2 py-1.5 rounded-full " +
                          "bg-[#1D2130] border border-[#232733] shadow-lg " +
                          (isMine
                            ? "right-0"
                            : "left-0")
                        }
                      >
                        {REACTION_EMOJIS.map(
                          (emoji) => (
                            <button
                              key={emoji}
                              onClick={() =>
                                toggleReaction(
                                  msg.id,
                                  emoji
                                )
                              }
                              className="text-lg hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {!isMine && starButton}
                </div>
              );
            });
          })()}

          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={handleSend}
          className="px-4 py-3 border-t border-[#151827] bg-[#050711] relative"
        >
          {uploading && (
            <p className="text-xs text-[#5B6072] mb-2 px-2">
              Uploading...
            </p>
          )}

          <input
            ref={stickerFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleStickerUpload}
          />

          {stickerPickerOpen && (
            <div
              ref={stickerPickerRef}
              className="absolute bottom-full left-4 mb-2 w-80 max-h-96 bg-[#12141C] border border-[#232733] rounded-2xl shadow-2xl flex flex-col overflow-hidden z-30"
            >
              <div className="flex gap-1 px-2 pt-2 border-b border-[#232733] overflow-x-auto">
                {displayPacks.map((pack) => (
                  <button
                    key={pack.id}
                    type="button"
                    onClick={() =>
                      setActiveStickerPackId(pack.id)
                    }
                    className={
                      "px-3 py-1.5 rounded-t-lg text-xs whitespace-nowrap transition " +
                      (activeStickerPackId === pack.id
                        ? "bg-[#232733] text-[#EDEFF5]"
                        : "text-[#8B92A5] hover:text-[#EDEFF5]")
                    }
                  >
                    {pack.name}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-3">
                {stickerPacksLoading ? (
                  <p className="text-xs text-[#5B6072] text-center py-6">
                    Loading stickers...
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {isMyStickersActive && (
                      <button
                        type="button"
                        disabled={uploadingSticker}
                        onClick={() =>
                          stickerFileInputRef.current?.click()
                        }
                        className="aspect-square rounded-lg border border-dashed border-[#3A3F52] hover:border-indigo-400 hover:bg-[#171b2b] transition flex items-center justify-center text-[#8B92A5] hover:text-white disabled:opacity-50"
                        title="Add a sticker"
                      >
                        {uploadingSticker ? (
                          <span className="text-[10px]">...</span>
                        ) : (
                          <span className="text-2xl leading-none">+</span>
                        )}
                      </button>
                    )}

                    {(!activePack || activePack.stickers.length === 0) &&
                    !isMyStickersActive ? (
                      <p className="col-span-4 text-xs text-[#5B6072] text-center py-6">
                        No stickers in this pack yet.
                      </p>
                    ) : (
                      activePack?.stickers.map((sticker) => (
                        <button
                          key={sticker.id}
                          type="button"
                          disabled={sendingSticker}
                          onClick={() =>
                            handleSendSticker(sticker)
                          }
                          className="aspect-square rounded-lg hover:bg-[#232733] p-1.5 transition disabled:opacity-50"
                          title={sticker.name || ""}
                        >
                          <img
                            src={sticker.image_url}
                            alt={sticker.name || "sticker"}
                            className="w-full h-full object-contain"
                            draggable={false}
                          />
                        </button>
                      ))
                    )}

                    {isMyStickersActive &&
                      activePack?.stickers.length === 0 && (
                        <p className="col-span-3 text-xs text-[#5B6072] flex items-center py-1">
                          Tap + to add your first sticker.
                        </p>
                      )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="rgb-composer flex items-center gap-2 rounded-full px-2 py-1.5">
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFilePicked}
            />

            <button
              type="button"
              onClick={() =>
                fileInputRef.current &&
                fileInputRef.current.click()
              }
              className="w-8 h-8 rounded-full flex items-center justify-center text-[#8B92A5] hover:bg-[#171b2b] hover:text-white transition flex-shrink-0"
              title="Attach"
            >
              <span className="text-lg leading-none">
                +
              </span>
            </button>

            <button
              type="button"
              onClick={openStickerPicker}
              className={
                "w-8 h-8 rounded-full flex items-center justify-center transition flex-shrink-0 " +
                (stickerPickerOpen
                  ? "bg-[#171b2b] text-white"
                  : "text-[#8B92A5] hover:bg-[#171b2b] hover:text-white")
              }
              title="Stickers"
            >
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path
                  d="M15 3H8a5 5 0 0 0-5 5v8a5 5 0 0 0 5 5h6l6-6V8a5 5 0 0 0-5-5z"
                  strokeLinejoin="round"
                />
                <path
                  d="M15 21v-4a2 2 0 0 1 2-2h4"
                  strokeLinejoin="round"
                />
                <circle cx="9" cy="10" r="1" fill="currentColor" stroke="none" />
                <circle cx="14" cy="10" r="1" fill="currentColor" stroke="none" />
                <path
                  d="M8.5 14.5c.8.9 1.9 1.5 3.2 1.5s2.4-.6 3.2-1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <input
              type="text"
              value={body}
              onChange={(e) =>
                handleBodyChange(
                  e.target.value
                )
              }
              placeholder="Type a message"
              className="flex-1 bg-transparent px-2 py-1.5 text-sm text-[#EDEFF5] placeholder:text-[#555b70] outline-none"
            />

            <button
              type="button"
              onClick={toggleRecording}
              className={
                recording
                  ? "w-8 h-8 rounded-full flex items-center justify-center bg-rose-500 text-white flex-shrink-0"
                  : "w-8 h-8 rounded-full flex items-center justify-center text-[#8B92A5] hover:bg-[#171b2b] hover:text-white transition flex-shrink-0"
              }
              title={
                recording
                  ? "Tap to stop"
                  : "Tap to record"
              }
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
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
              disabled={
                sending || !body.trim()
              }
              className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 disabled:opacity-30 text-white flex items-center justify-center flex-shrink-0 transition hover:scale-105"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M5 12h14M13 5l7 7-7 7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </form>
      </div>

      <ContactInfoPanel
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        title={conversationLabel()}
        isGroup={
          conversation.type === "group"
        }
        participants={conversation.users}
        avatarGradient={avatarGradient(
          conversation.id
        )}
        conversationId={conversation.id}
        otherUserId={
          conversation.type !== "group"
            ? conversation.users.find(
                (u) => u.id !== user?.id
              )?.id ?? null
            : null
        }
      />
    </div>
  );
}