"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

type BugReport = {
  id: number;
  title: string;
  description: string;
  page_url: string | null;
  status: "pending" | "resolved";
  admin_note: string | null;
  created_at: string;
  user: { id: number; name: string; email: string };
};

const ADMIN_EMAIL = "tinodavin91@gmail.com";

export default function AdminReportsPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.email !== ADMIN_EMAIL) {
      router.push("/");
      return;
    }
    fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user]);

  async function fetchReports() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bug-reports`, {
        headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to load reports");
      const data = await res.json();
      setReports(data);
      const drafts: Record<number, string> = {};
      data.forEach((r: BugReport) => {
        drafts[r.id] = r.admin_note ?? "";
      });
      setNoteDrafts(drafts);
    } catch (err) {
      setError("Couldn't load bug reports. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function updateReport(id: number, changes: Partial<Pick<BugReport, "status" | "admin_note">>) {
    setUpdatingId(id);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/bug-reports/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(changes),
      });
      if (!res.ok) throw new Error("Update failed");
      const updated = await res.json();
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, ...updated } : r)));
    } catch (err) {
      alert("Couldn't update this report. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  function toggleStatus(report: BugReport) {
    const nextStatus = report.status === "pending" ? "resolved" : "pending";
    updateReport(report.id, { status: nextStatus });
  }

  function saveNote(report: BugReport) {
    updateReport(report.id, { admin_note: noteDrafts[report.id] ?? "" });
  }

  if (authLoading || (!user && !authLoading)) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0F1117] text-[#8B92A5]">
        Loading...
      </div>
    );
  }

  const pendingCount = reports.filter((r) => r.status === "pending").length;

  return (
    <div className="min-h-screen bg-[#0F1117] text-[#EDEFF5] px-6 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold">Bug Reports</h1>
            <p className="text-sm text-[#8B92A5] mt-1">
              {pendingCount} pending · {reports.length} total
            </p>
          </div>
          <button
            onClick={fetchReports}
            className="px-3 py-1.5 text-sm rounded-lg bg-[#1D2130] text-[#DADFEA] hover:bg-[#232733] transition"
          >
            Refresh
          </button>
        </div>

        {loading && <p className="text-sm text-[#5B6072]">Loading reports...</p>}
        {error && <p className="text-sm text-rose-400">{error}</p>}

        {!loading && !error && reports.length === 0 && (
          <p className="text-sm text-[#5B6072]">No bug reports yet.</p>
        )}

        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-xl border border-[#232733] bg-[#171A24] p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        report.status === "pending"
                          ? "bg-amber-500/15 text-amber-400"
                          : "bg-emerald-500/15 text-emerald-400"
                      }`}
                    >
                      {report.status}
                    </span>
                    <h2 className="text-sm font-medium text-[#EDEFF5] truncate">
                      {report.title}
                    </h2>
                  </div>
                  <p className="text-sm text-[#B4B9C9] whitespace-pre-wrap mb-2">
                    {report.description}
                  </p>
                  <div className="text-xs text-[#5B6072] space-y-0.5">
                    <p>
                      {report.user?.name} ({report.user?.email})
                    </p>
                    {report.page_url && <p>Page: {report.page_url}</p>}
                    <p>{new Date(report.created_at).toLocaleString()}</p>
                  </div>
                </div>

                <button
                  onClick={() => toggleStatus(report)}
                  disabled={updatingId === report.id}
                  className={`shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition disabled:opacity-50 ${
                    report.status === "pending"
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-[#232733] text-[#DADFEA] hover:bg-[#2A3040]"
                  }`}
                >
                  {updatingId === report.id
                    ? "..."
                    : report.status === "pending"
                    ? "Mark resolved"
                    : "Reopen"}
                </button>
              </div>

              <div className="mt-3 flex items-center gap-2">
                <input
                  type="text"
                  value={noteDrafts[report.id] ?? ""}
                  onChange={(e) =>
                    setNoteDrafts((prev) => ({ ...prev, [report.id]: e.target.value }))
                  }
                  placeholder="Add an admin note..."
                  className="flex-1 rounded-lg border border-[#232733] bg-transparent px-3 py-1.5 text-xs text-[#DADFEA] focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
                <button
                  onClick={() => saveNote(report)}
                  disabled={updatingId === report.id}
                  className="px-3 py-1.5 text-xs rounded-lg bg-[#232733] text-[#DADFEA] hover:bg-[#2A3040] transition disabled:opacity-50"
                >
                  Save note
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}