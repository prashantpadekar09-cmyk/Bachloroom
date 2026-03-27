import { useEffect, useRef, useState, type FormEvent } from "react";
import { CheckCircle2, CircleAlert, Loader2, SendHorizontal } from "lucide-react";
import { AdminPageHero, AdminSurface } from "../components/admin/AdminTheme";

type QuerySummary = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  status: "resolved" | "not_resolved";
  createdAt: string;
  updatedAt: string;
  lastMessage: string;
  lastMessageAt: string;
};

type QueryMessage = {
  id: string;
  queryId: string;
  senderId: string;
  senderRole: string;
  senderName: string;
  text: string;
  createdAt: string;
};

type QueryDetail = QuerySummary & {
  messages: QueryMessage[];
};

const roleLabelMap: Record<string, string> = {
  owner: "Owner",
  user: "User",
};

export default function AdminMessages() {
  const [queries, setQueries] = useState<QuerySummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<QueryDetail | null>(null);
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const previousQueryIdsRef = useRef<string[]>([]);

  const readJson = async (res: Response) => {
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      const text = await res.text();
      throw new Error(
        text.includes("<!doctype")
          ? "Support API is not responding. Please restart the server."
          : "Unexpected response from server."
      );
    }
    return res.json();
  };

  const formatPreviewTime = (value?: string) => {
    if (!value) return "";
    return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  useEffect(() => {
    fetchQueries();
  }, []);

  useEffect(() => {
    if (selectedId) {
      fetchQuery(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    const interval = setInterval(() => {
      void (async () => {
        const nextQueries = await fetchQueries(false, selectedId);
        if (selectedId && nextQueries.some((query) => query.id === selectedId)) {
          await fetchQuery(selectedId);
        }
      })();
    }, 5000);

    return () => clearInterval(interval);
  }, [selectedId]);

  const fetchQueries = async (showLoader = true, currentSelectedId = selectedId) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError("");
      const token = localStorage.getItem("token");
      const res = await fetch("/api/support/admin/queries", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch queries");
      }
      const nextQueries = data.queries || [];
      setQueries(nextQueries);
      const previousQueryIds = previousQueryIdsRef.current;
      const hasBrandNewQuery = nextQueries.some((query: QuerySummary) => !previousQueryIds.includes(query.id));
      previousQueryIdsRef.current = nextQueries.map((query: QuerySummary) => query.id);

      if (nextQueries.length === 0) {
        setSelectedId(null);
        setSelectedQuery(null);
        setReplyText("");
        setStatusMessage("");
      } else if (hasBrandNewQuery && nextQueries[0]?.id !== currentSelectedId) {
        setSelectedQuery(null);
        setReplyText("");
        setStatusMessage("");
        setSelectedId(nextQueries[0].id);
      } else if (!currentSelectedId || !nextQueries.some((query: QuerySummary) => query.id === currentSelectedId)) {
        setSelectedQuery(null);
        setReplyText("");
        setSelectedId(nextQueries[0].id);
      }

      return nextQueries as QuerySummary[];
    } catch (err: any) {
      setError(err.message || "Failed to fetch queries");
      return [] as QuerySummary[];
    } finally {
      if (showLoader) {
        setLoading(false);
      }
    }
  };

  const fetchQuery = async (queryId: string) => {
    try {
      setError("");
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/support/queries/${queryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJson(res);
      if (!res.ok) {
        if (res.status === 404) {
          setSelectedQuery(null);
          setSelectedId(null);
          setReplyText("");
          setStatusMessage("");
          await fetchQueries(false, null);
          return;
        }
        throw new Error(data.error || "Failed to fetch query");
      }
      setSelectedQuery(data.query);
    } catch (err: any) {
      setError(err.message || "Failed to fetch query");
    }
  };

  const handleReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedId || !replyText.trim()) return;

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/support/queries/${selectedId}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: replyText }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        if (res.status === 404) {
          setSelectedQuery(null);
          setSelectedId(null);
          setReplyText("");
          setStatusMessage("");
          await fetchQueries(false, null);
          return;
        }
        throw new Error(data.error || "Failed to send reply");
      }
      setReplyText("");
      await fetchQueries();
      await fetchQuery(selectedId);
    } catch (err: any) {
      setError(err.message || "Failed to send reply");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusUpdate = async (status: "resolved" | "not_resolved") => {
    if (!selectedId) return;
    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");
      const res = await fetch(`/api/support/admin/queries/${selectedId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to update status");
      }

      setStatusMessage(data.message || (status === "resolved" ? "Query marked as resolved" : "Query marked as not resolved"));
      await fetchQueries(false, selectedId);
      await fetchQuery(selectedId);
    } catch (err: any) {
      setError(err.message || "Failed to update status");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center gap-3 rounded-[2rem] bg-gradient-to-br from-slate-50 via-white to-blue-50 text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin" />
        Loading queries...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <AdminPageHero
        eyebrow="Support Inbox"
        title="Admin Query Chat"
        description="Reply quickly, manage resolution status, and keep support conversations organized."
        badge={`${queries.length} open threads`}
      />

      <AdminSurface className="overflow-hidden">
        <div className="flex min-h-[70vh] flex-col lg:flex-row">
          <aside className="border-b border-gray-100 bg-slate-50 lg:w-[320px] lg:border-b-0 lg:border-r">
            <div className="border-b border-gray-100 px-4 py-4">
              <h2 className="text-lg font-bold text-gray-900">Queries</h2>
              <p className="mt-1 text-sm text-gray-500">Owners and users</p>
            </div>

            <div className="max-h-[28vh] overflow-y-auto p-3 lg:max-h-[70vh]">
              {queries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-gray-200 bg-white px-4 py-6 text-center text-sm text-gray-500">
                  No queries found.
                </div>
              ) : (
                <div className="space-y-2">
                  {queries.map((query) => (
                    <button
                      key={query.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(query.id);
                        setStatusMessage("");
                      }}
                      className={`w-full rounded-2xl border px-3 py-3 text-left transition-all ${
                        selectedId === query.id
                          ? "border-blue-200 bg-blue-50 shadow-sm"
                          : "border-transparent bg-white hover:border-gray-200 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-semibold text-gray-900">{query.userName}</p>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              query.userRole === "owner"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-slate-200 text-slate-700"
                            }`}>
                              {roleLabelMap[query.userRole] || "User"}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-sm text-gray-500">{query.lastMessage || "No messages yet"}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] text-gray-400">{formatPreviewTime(query.lastMessageAt)}</p>
                          <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                            query.status === "resolved"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-rose-100 text-rose-700"
                          }`}>
                            {query.status === "resolved" ? "Resolved" : "Open"}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            {selectedQuery ? (
              <>
                <div className="border-b border-gray-100 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-xl font-bold text-gray-900">{selectedQuery.userName}</h2>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          selectedQuery.userRole === "owner"
                            ? "bg-orange-100 text-orange-700"
                            : "bg-slate-200 text-slate-700"
                        }`}>
                          {roleLabelMap[selectedQuery.userRole] || "User"}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{selectedQuery.userEmail}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex items-center rounded-full px-3 py-1.5 text-sm font-semibold ${
                        selectedQuery.status === "resolved" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                      }`}>
                        {selectedQuery.status === "resolved" ? <CheckCircle2 className="mr-2 h-4 w-4" /> : <CircleAlert className="mr-2 h-4 w-4" />}
                        {selectedQuery.status === "resolved" ? "Resolved" : "Not Resolved"}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate("resolved")}
                        disabled={submitting || selectedQuery.status === "resolved"}
                        className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-emerald-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Mark as Resolved
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStatusUpdate("not_resolved")}
                        disabled={submitting || selectedQuery.status === "not_resolved"}
                        className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-rose-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Mark as Not Resolved
                      </button>
                    </div>
                  </div>
                </div>

                <div className="max-h-[55vh] flex-1 space-y-3 overflow-y-auto bg-slate-50 p-4 sm:p-5">
                  {statusMessage && (
                    <div className="flex justify-center">
                      <div className="rounded-full border border-emerald-100 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-700 shadow-sm">
                        {statusMessage}
                      </div>
                    </div>
                  )}

                  {selectedQuery.status === "resolved" && (
                    <div className="flex justify-center">
                      <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-500 shadow-sm">
                        Query Closed
                      </div>
                    </div>
                  )}

                  {selectedQuery.messages.map((message) => {
                    const isAdmin = message.senderRole === "admin";
                    return (
                      <div key={message.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                          isAdmin ? "border border-emerald-200 bg-emerald-100 text-emerald-950" : "border border-gray-200 bg-gray-100 text-gray-900"
                        }`}>
                          <p>{message.text}</p>
                          <p className={`mt-2 text-[11px] ${isAdmin ? "text-emerald-700" : "text-gray-500"}`}>
                            {new Date(message.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <form onSubmit={handleReply} className="border-t border-gray-100 p-4">
                  <div className="flex gap-3">
                    <input
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder={selectedQuery.status === "resolved" ? "Query Closed" : "Type your reply..."}
                      disabled={submitting || selectedQuery.status === "resolved"}
                      className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-3 outline-none transition-colors focus:border-blue-400 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                    />
                    <button
                      type="submit"
                      disabled={submitting || !replyText.trim() || selectedQuery.status === "resolved"}
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white transition-all duration-200 hover:bg-blue-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <SendHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex min-h-[60vh] items-center justify-center px-6 text-center text-gray-500">
                {queries.length === 0 ? "No queries found." : "Select a query from the left column."}
              </div>
            )}
          </div>
        </div>
      </AdminSurface>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}
