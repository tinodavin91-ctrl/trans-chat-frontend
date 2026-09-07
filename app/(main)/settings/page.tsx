"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function SettingsPage() {
  const { token } = useAuth();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword !== confirmPassword) {
      setError("New password and confirmation don't match.");
      return;
    }

    setSaving(true);

    try {
      const res = await fetch(
        process.env.NEXT_PUBLIC_API_URL + "/change-password",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
            Authorization: "Bearer " + token,
          },
          body: JSON.stringify({
            current_password: currentPassword,
            password: newPassword,
            password_confirmation: confirmPassword,
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        const firstError =
          data.errors?.current_password?.[0] ||
          data.errors?.password?.[0] ||
          data.message ||
          "Couldn't update password.";

        setError(firstError);
        return;
      }

      setSuccess(true);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 h-screen overflow-y-auto bg-[#080a12]">
      <div className="max-w-lg mx-auto px-6 py-10">
        <div className="flex items-center gap-3 mb-8">
        <Link
  href="/chat"
  className="w-8 h-8 rounded-full flex items-center justify-center text-[#8B92A5] hover:bg-[#171b2b] hover:text-white transition"
  title="Back"
>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-[#EDEFF5]">Settings</h1>
        </div>

        <div className="bg-[#12141C] border border-[#232733] rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-[#EDEFF5] mb-1">Change password</h2>
          <p className="text-xs text-[#8B92A5] mb-5">
            You'll stay signed in here, but other devices will be signed out.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-[#8B92A5] mb-1.5">
                Current password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full bg-[#1D2130] border border-[#232733] rounded-lg px-3 py-2 text-sm text-[#EDEFF5] outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs text-[#8B92A5] mb-1.5">
                New password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-[#1D2130] border border-[#232733] rounded-lg px-3 py-2 text-sm text-[#EDEFF5] outline-none focus:border-indigo-500"
              />
              <p className="text-[11px] text-[#5B6072] mt-1">At least 8 characters.</p>
            </div>

            <div>
              <label className="block text-xs text-[#8B92A5] mb-1.5">
                Confirm new password
              </label>
              <input
                type="password"
                required
                minLength={8}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#1D2130] border border-[#232733] rounded-lg px-3 py-2 text-sm text-[#EDEFF5] outline-none focus:border-indigo-500"
              />
            </div>

            {error && (
              <p className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            {success && (
              <p className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                Password updated successfully.
              </p>
            )}

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 disabled:opacity-50 transition text-white text-sm font-medium rounded-full py-2.5"
            >
              {saving ? "Updating..." : "Update password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}