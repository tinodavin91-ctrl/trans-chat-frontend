"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

type UserOption = { id: number; name: string; email: string };

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();
}

export default function NewConversationPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<UserOption[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    loadUsers();
  }, [authLoading, user]);

  async function loadUsers() {
    setLoading(true);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    setUsers(Array.isArray(data) ? data.filter((u: UserOption) => u.id !== user?.id) : []);
    setLoading(false);
  }

  function toggleUser(id: number) {
    if (!isGroup) {
      setSelectedIds([id]);
      return;
    }
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleStart() {
    setError(null);
    if (selectedIds.length === 0) {
      setError("Select at least one person.");
      return;
    }
    if (isGroup && !groupName.trim()) {
      setError("Give your group a name.");
      return;
    }

    setSubmitting(true);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/conversations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        type: isGroup ? "group" : "direct",
        name: isGroup ? groupName : null,
        user_ids: selectedIds,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      const firstError = data.errors ? Object.values(data.errors)[0] : null;
      setError((firstError as string[])?.[0] || data.message || "Could not start conversation.");
      setSubmitting(false);
      return;
    }

    router.push(`/chat/${data.id}`);
  }

  if (authLoading || !user) return null;

  return (
    <main className="min-h-screen w-full bg-[#0F1117] flex flex-col">
      <div className="w-full border-b border-[#232733] bg-[#171A24]">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <Link href="/chat" className="text-sm text-indigo-400 hover:text-indigo-300 transition font-medium">
            Cancel
          </Link>
          <h1 className="text-base font-semibold text-[#EDEFF5]">New Message</h1>
          <div className="w-14" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto w-full flex-1 flex flex-col px-6 py-6">
        <div className="flex rounded-full bg-[#1D2130] p-1 mb-5 max-w-xs border border-[#232733]">
          <button
            onClick={() => {
              setIsGroup(false);
              setSelectedIds([]);
            }}
            className={`flex-1 rounded-full py-1.5 text-sm font-semibold transition ${
              !isGroup
                ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_0_16px_-6px_rgba(99,102,241,0.7)]"
                : "text-[#8B92A5] hover:text-[#EDEFF5]"
            }`}
          >
            Direct
          </button>
          <button
            onClick={() => {
              setIsGroup(true);
              setSelectedIds([]);
            }}
            className={`flex-1 rounded-full py-1.5 text-sm font-semibold transition ${
              isGroup
                ? "bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-[0_0_16px_-6px_rgba(99,102,241,0.7)]"
                : "text-[#8B92A5] hover:text-[#EDEFF5]"
            }`}
          >
            Group
          </button>
        </div>

        {isGroup && (
          <input
            type="text"
            placeholder="Group name"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full max-w-md rounded-xl border border-[#2C3142] bg-[#1D2130] px-4 py-2.5 text-sm text-[#EDEFF5] placeholder-[#5B6072] mb-4 outline-none focus:border-indigo-400 transition"
          />
        )}

        {error && (
          <p className="bg-red-500/10 border border-red-500/30 text-red-300 text-sm rounded-xl px-3 py-2 mb-4 max-w-md">
            {error}
          </p>
        )}

        <p className="text-xs font-semibold text-[#5B6072] uppercase tracking-wide mb-2">
          {isGroup ? "Add people" : "To:"}
        </p>

        <div className="flex-1 space-y-2 max-w-md">
          {loading ? (
            <p className="text-sm text-[#5B6072] py-4">Loading...</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-[#5B6072] py-4">No other users found.</p>
          ) : (
            users.map((u) => {
              const selected = selectedIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  onClick={() => toggleUser(u.id)}
                  className={`w-full flex items-center gap-3 rounded-xl px-4 py-3 transition text-left border-2 ${
                    selected
                      ? "border-indigo-400 bg-indigo-500/10"
                      : "border-transparent bg-[#171A24] hover:bg-[#1D2130]"
                  }`}
                >
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
                    {initials(u.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-[#EDEFF5] truncate">{u.name}</p>
                    <p className="text-xs text-[#8B92A5] truncate">{u.email}</p>
                  </div>
                  {selected && (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 text-white flex items-center justify-center text-xs flex-shrink-0">
                      ✓
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        <button
          onClick={handleStart}
          disabled={submitting}
          className="w-full max-w-md bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 disabled:opacity-50 text-white font-semibold rounded-full py-3 text-sm transition mt-6 shadow-[0_0_20px_-8px_rgba(99,102,241,0.6)]"
        >
          {submitting ? "Starting..." : "Start Conversation"}
        </button>
      </div>
    </main>
  );
}