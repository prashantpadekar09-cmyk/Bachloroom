import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MessageCircleMore, SendHorizontal } from "lucide-react";
import { useAuth } from "../context/AuthContext";

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

type SupportPanelProps = {
  embedded?: boolean;
};

export default function SupportPanel({ embedded }: SupportPanelProps) {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [queries, setQueries] = useState<QuerySummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedQuery, setSelectedQuery] = useState<QueryDetail | null>(null);
  const [newQueryText, setNewQueryText] = useState("");
  const [replyText, setReplyText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

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

  const selectedStatusLabel = useMemo(() => {
    if (!selectedQuery) return "";
    return selectedQuery.status === "resolved" ? "Resolved" : "Not Resolved";
  }, [selectedQuery]);

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role === "admin") {
      navigate("/admin/messages");
      return;
    }
    fetchQueries();
  }, [user]);

  useEffect(() => {
    if (selectedId) {
      fetchQuery(selectedId);
    }
  }, [selectedId]);

  useEffect(() => {
    if (!token || !user || user.role === "admin") return;

    const interval = setInterval(() => {
      void (async () => {
        const nextQueries = await fetchQueries(false, selectedId);
        if (selectedId && nextQueries.some((query) => query.id === selectedId)) {
          await fetchQuery(selectedId);
        }
      })();
    }, 2000);

    return () => clearInterval(interval);
  }, [token, user, selectedId]);

  const fetchQueries = async (showLoader = true, currentSelectedId = selectedId) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError("");
      const res = await fetch("/api/support/queries/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to fetch queries");
      }
      const nextQueries = data.queries || [];
      setQueries(nextQueries);

      if (nextQueries.length === 0) {
        setSelectedId(null);
        setSelectedQuery(null);
        setReplyText("");
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
      const res = await fetch(`/api/support/queries/${queryId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await readJson(res);
      if (!res.ok) {
        if (res.status === 404) {
          setSelectedId(null);
          setSelectedQuery(null);
          setReplyText("");
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

  const handleCreateQuery = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!newQueryText.trim()) return;

    try {
      setSending(true);
      const res = await fetch("/api/support/queries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ text: newQueryText }),
      });
      const data = await readJson(res);
      if (!res.ok) {
        throw new Error(data.error || "Failed to create query");
      }
      setNewQueryText("");
      await fetchQueries();
      setSelectedId(data.id);
      await fetchQuery(data.id);
    } catch (err: any) {
      setError(err.message || "Failed to create query");
    } finally {
      setSending(false);
    }
  };

  const handleSendReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedId) return;

    try {
      setSending(true);
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
          setSelectedId(null);
          setSelectedQuery(null);
          setReplyText("");
          await fetchQueries(false);
          return;
        }
        throw new Error(data.error || "Failed to send message");
      }
      setReplyText("");
      await fetchQueries();
      await fetchQuery(selectedId);
    } catch (err: any) {
      setError(err.message || "Failed to send message");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-gray-500">Loading support chat...</div>;
  }

  return (
    <div className={embedded ? "" : "min-h-[calc(100vh-64px)] bg-transparent px-4 py-6"}>
      <div className={`mx-auto ${embedded ? "max-w-none" : "max-w-4xl"}`}>
        <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm">
          {selectedQuery ? (
            <>
              <div className="border-b border-gray-100 px-5 py-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">Admin Support</h2>
                    <p className="text-sm text-gray-500">
                      Status: <span className={selectedQuery.status === "resolved" ? "text-emerald-600" : "text-rose-600"}>{selectedStatusLabel}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {!embedded && (
                      <Link to="/dashboard?tab=messages" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
                        Back to dashboard
                      </Link>
                    )}
                  </div>
                </div>
              </div>

              <div className="max-h-[55vh] space-y-3 overflow-y-auto bg-gray-50 p-4 sm:p-5">
                {selectedQuery.messages.map((message) => {
                  const isMine = message.senderId === user?.id;
                  return (
                    <div key={message.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm shadow-sm ${
                        isMine ? "bg-blue-600 text-white" : "border border-gray-200 bg-white text-gray-900"
                      }`}>
                        <p>{message.text}</p>
                        <p className={`mt-2 text-[11px] ${isMine ? "text-blue-100" : "text-gray-400"}`}>
                          {new Date(message.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handleSendReply} className="border-t border-gray-100 p-4">
                <div className="mb-3">
                  <textarea
                    value={newQueryText}
                    onChange={(e) => setNewQueryText(e.target.value)}
                    placeholder="Write a new query..."
                    className="min-h-24 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-blue-400"
                  />
                  <button
                    type="button"
                    onClick={handleCreateQuery}
                    disabled={sending || !newQueryText.trim()}
                    className="mt-3 inline-flex items-center rounded-xl bg-gray-900 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-black disabled:opacity-50"
                  >
                    <SendHorizontal className="mr-2 h-4 w-4" />
                    Submit Query
                  </button>
                </div>
                <div className="flex gap-3">
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Reply to admin..."
                    className="w-full rounded-full border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-blue-400"
                  />
                  <button
                    type="submit"
                    disabled={sending || !replyText.trim()}
                    className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-blue-600 text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    <SendHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-6 text-center text-gray-500">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <MessageCircleMore className="h-8 w-8" />
              </div>
              <div className="w-full max-w-xl">
                <p className="mb-4">Create your first query to start chatting with admin.</p>
                <form onSubmit={handleCreateQuery} className="space-y-3 text-left">
                  <textarea
                    value={newQueryText}
                    onChange={(e) => setNewQueryText(e.target.value)}
                    placeholder="Write your query..."
                    className="min-h-24 w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-blue-400"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newQueryText.trim()}
                    className="inline-flex items-center rounded-xl bg-blue-600 px-4 py-2.5 font-semibold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
                  >
                    <SendHorizontal className="mr-2 h-4 w-4" />
                    Send Query
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className={`mx-auto mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 ${
          embedded ? "max-w-none" : "max-w-6xl"
        }`}>
          {error}
        </div>
      )}
    </div>
  );
}
