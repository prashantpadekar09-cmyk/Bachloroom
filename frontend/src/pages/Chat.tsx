import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ArrowLeft,
  Camera,
  MessageCircleMore,
  Mic,
  MoreVertical,
  Paperclip,
  Phone,
  SendHorizontal,
  Smile,
  Video,
} from "lucide-react";

const roleLabelMap: Record<string, string> = {
  admin: "Admin",
  owner: "Owner",
  user: "User",
};

export default function Chat() {
  const { userId: otherUserId } = useParams();
  const [searchParams] = useSearchParams();
  const initialMessage = searchParams.get("message") || "";
  const roomId = searchParams.get("roomId") || "";
  const { user, token } = useAuth();
  const navigate = useNavigate();
  
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState(initialMessage);
  const [otherUser, setOtherUser] = useState<any>(null);
  const [adminContact, setAdminContact] = useState<any>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [accessError, setAccessError] = useState("");
  const [searchText, setSearchText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const chatWallpaperStyle = {
    backgroundColor: "#0b141a",
    backgroundImage:
      "radial-gradient(circle at 25px 25px, rgba(255,255,255,0.035) 2px, transparent 0), radial-gradient(circle at 75px 75px, rgba(255,255,255,0.03) 2px, transparent 0)",
    backgroundSize: "100px 100px",
  } as const;

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    
    fetchConversations();
    fetchAdminContact();
    fetchUnreadCount();
  }, [user]);

  useEffect(() => {
    if (otherUserId) {
      fetchMessages();
      const interval = setInterval(() => {
        fetchMessages();
        fetchConversations();
        fetchUnreadCount();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [otherUserId]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchConversations();
      fetchUnreadCount();
    }, 5000);
    return () => clearInterval(interval);
  }, [token]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const allConversations = React.useMemo(() => {
    const merged = [...conversations];

    if (
      adminContact &&
      user?.role !== "admin" &&
      !merged.some((conv) => conv.user.id === adminContact.id)
    ) {
      merged.unshift({
        user: adminContact,
        lastMessage: {
          content: "Start a conversation with admin support",
          createdAt: "",
        },
        unreadCount: 0,
      });
    }

    return merged
      .filter((conv) => {
        const search = searchText.trim().toLowerCase();
        if (!search) return true;
        const name = conv.user.name?.toLowerCase() || "";
        const role = roleLabelMap[conv.user.role]?.toLowerCase() || conv.user.role?.toLowerCase() || "";
        const preview = conv.lastMessage?.content?.toLowerCase() || "";
        return name.includes(search) || role.includes(search) || preview.includes(search);
      })
      .sort((a, b) => {
        const aTime = a.lastMessage?.createdAt ? new Date(a.lastMessage.createdAt).getTime() : 0;
        const bTime = b.lastMessage?.createdAt ? new Date(b.lastMessage.createdAt).getTime() : 0;
        return bTime - aTime;
      });
  }, [adminContact, conversations, searchText, user?.role]);

  const formatPreviewTime = (value?: string) => {
    if (!value) return "";
    return new Date(value).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const formatMessageTime = (value?: string) => {
    if (!value) return "";
    return new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/chat/conversations", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setConversations(data);
        
        if (otherUserId) {
          const conv = data.find((c: any) => c.user.id === otherUserId);
          if (conv) {
            setOtherUser(conv.user);
          } else {
            const userRes = await fetch(`/api/users/${otherUserId}`, {
              headers: { Authorization: `Bearer ${token}` }
            });
            if (userRes.ok) {
              const userData = await userRes.json();
              setOtherUser(userData);
            }
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch conversations", err);
    }
  };

  const fetchAdminContact = async () => {
    try {
      const res = await fetch("/api/chat/admin-contact", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminContact(data.user || null);
      }
    } catch (err) {
      console.error("Failed to fetch admin contact", err);
    }
  };

  const fetchUnreadCount = async () => {
    try {
      const res = await fetch("/api/chat/unread-count", {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error("Failed to fetch unread count", err);
    }
  };

  const fetchMessages = async () => {
    if (!otherUserId) return;
    try {
      const query = roomId ? `?roomId=${encodeURIComponent(roomId)}` : "";
      const res = await fetch(`/api/chat/${otherUserId}${query}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setMessages(data);
        setAccessError("");
        fetchUnreadCount();
      } else {
        const data = await res.json().catch(() => null);
        setMessages([]);
        setAccessError(data?.error || "You do not have access to this chat yet.");
      }
    } catch (err) {
      console.error("Failed to fetch messages", err);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !otherUserId) return;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: otherUserId,
          roomId: roomId || undefined,
          content: newMessage
        })
      });

      if (res.ok) {
        setNewMessage("");
        fetchMessages();
        fetchConversations();
        fetchUnreadCount();
      } else {
        const data = await res.json().catch(() => null);
        setAccessError(data?.error || "Message could not be sent.");
      }
    } catch (err) {
      console.error("Failed to send message", err);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] px-3 py-4 sm:px-4 sm:py-6">
      <div className="mx-auto flex h-[calc(100vh-88px)] max-w-5xl flex-col gap-4 lg:h-[calc(100vh-116px)] lg:flex-row">
        <div
          className={`overflow-hidden rounded-[28px] border border-[#d5d0c5] bg-[#f6efe5] shadow-sm ${
            otherUserId ? "hidden md:flex md:w-[320px] md:flex-col" : "flex w-full flex-1 flex-col"
          }`}
        >
          <div className="border-b border-[#ddd4c6] px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
                <p className="text-sm text-gray-500">Users and owners</p>
              </div>
              {unreadCount > 0 && (
                <span className="rounded-full bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="mt-4 rounded-full bg-white px-3 py-2 shadow-sm ring-1 ring-[#ebe3d6]">
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search or start a new chat"
                className="w-full bg-transparent text-sm text-gray-700 outline-none placeholder:text-gray-400"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-[#fdf8f1] p-2">
            {allConversations.length === 0 ? (
              <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[#ddd4c6] bg-white/70 px-6 py-10 text-center text-sm text-gray-500">
                No conversations found.
              </div>
            ) : (
              <div className="space-y-2">
                {allConversations.map((conv) => (
                  <Link
                    key={conv.user.id}
                    to={`/chat/${conv.user.id}`}
                    className={`block rounded-2xl border px-3 py-3 transition-all ${
                      otherUserId === conv.user.id
                        ? "border-[#b9decf] bg-[#e7f4ec] shadow-sm"
                        : "border-transparent bg-transparent hover:border-[#e5dbcd] hover:bg-white/80"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-semibold ${
                          conv.user.role === "owner"
                            ? "bg-orange-100 text-orange-700"
                            : conv.user.role === "admin"
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-slate-200 text-slate-700"
                        }`}>
                          {conv.user.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="truncate font-medium text-gray-900">{conv.user.name}</div>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                              conv.user.role === "owner"
                                ? "bg-orange-100 text-orange-700"
                                : conv.user.role === "admin"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-slate-200 text-slate-700"
                            }`}>
                              {roleLabelMap[conv.user.role] || "Chat"}
                            </span>
                          </div>
                          <div className="truncate text-sm text-gray-500">
                            {conv.lastMessage?.content || "Tap to start chatting"}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-1 text-right">
                        <span className="text-[11px] text-gray-400">
                          {formatPreviewTime(conv.lastMessage?.createdAt)}
                        </span>
                        {conv.unreadCount > 0 && (
                          <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-xs font-semibold text-white">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className={`min-h-0 overflow-hidden rounded-[28px] border border-[#d5d0c5] bg-white shadow-sm ${
          !otherUserId ? "hidden flex-1 md:flex" : "flex flex-1"
        }`}>
          {otherUserId ? (
            <>
              <div className="flex items-center gap-3 bg-[#202c33] px-4 py-3 text-white">
                <Link
                  to="/chat"
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white/80 transition-colors hover:bg-white/10 md:hidden"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Link>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#6b7c87] font-semibold text-white">
                  {otherUser?.name?.[0]?.toUpperCase() || "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-medium text-white sm:text-lg">
                    {otherUser?.name || "Loading..."}
                  </h2>
                  <p className="text-xs text-white/70 sm:text-sm">
                    {roleLabelMap[otherUser?.role] || (roomId ? "Conversation" : "Online")}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-white/80">
                  <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10">
                    <Video className="h-5 w-5" />
                  </button>
                  <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10">
                    <Phone className="h-5 w-5" />
                  </button>
                  <button type="button" className="inline-flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-white/10">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto px-3 py-4 sm:px-5" style={chatWallpaperStyle}>
                {accessError && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">
                    {accessError}
                  </div>
                )}
                <div className="space-y-3 sm:space-y-4">
                  {messages.map((msg) => {
                    const isMine = msg.senderId === user?.id;
                    return (
                      <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                        <div
                          className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm sm:max-w-[75%] ${
                            isMine
                              ? "rounded-br-md bg-[#005c4b] text-white"
                              : "rounded-bl-md bg-[#202c33] text-white"
                          }`}
                        >
                          <p>{msg.content}</p>
                          <div className={`mt-1 text-right text-[11px] ${isMine ? "text-white/70" : "text-white/55"}`}>
                            {formatMessageTime(msg.createdAt)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={sendMessage} className="bg-[#202c33] p-3">
                <div className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-full bg-[#2a3942] px-3 py-2">
                    <button type="button" className="text-white/70 transition-colors hover:text-white">
                      <Smile className="h-5 w-5" />
                    </button>
                    <input
                      type="text"
                      className="min-h-10 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/55 sm:text-base"
                      placeholder="Message"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      disabled={Boolean(accessError)}
                    />
                    <button type="button" className="text-white/70 transition-colors hover:text-white">
                      <Paperclip className="h-5 w-5" />
                    </button>
                    <button type="button" className="text-white/70 transition-colors hover:text-white">
                      <Camera className="h-5 w-5" />
                    </button>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#00a884] text-white transition-colors hover:bg-[#06b48e] disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!newMessage.trim() || Boolean(accessError)}
                  >
                    {newMessage.trim() ? <SendHorizontal className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-sm text-gray-500 sm:text-base">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <MessageCircleMore className="h-8 w-8" />
              </div>
              <p className="font-medium text-gray-600">Select a chat to start messaging</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
