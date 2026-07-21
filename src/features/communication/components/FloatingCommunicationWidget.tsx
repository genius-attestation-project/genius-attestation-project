"use client";

import { MessageCircle, Search, ArrowLeft, Send, SearchX } from "lucide-react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/Button";
import { FormDrawer } from "@/components/ui/FormDrawer";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";

type Conversation = {
  id: string;
  trackingNumber: string;
  customerName: string;
  message: string;
  createdAt: string;
  unreadCount: number;
};

type Message = {
  id: string;
  trackingNumber: string;
  message: string;
  createdAt: string;
  senderUser: { name: string | null; role?: { name: string | null } } | null;
  parent: { message: string; senderUser: { name: string | null } | null } | null;
};

export function FloatingCommunicationWidget() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [inbox, setInbox] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(false);
  
  // View state: 'inbox' | 'thread'
  const [view, setView] = useState<'inbox' | 'thread'>('inbox');
  const [activeTrackingNumber, setActiveTrackingNumber] = useState<string | null>(null);
  
  // Thread state
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  
  // Compose state
  const [newMessage, setNewMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  const totalUnread = inbox.reduce((sum, conv) => sum + conv.unreadCount, 0);

  useEffect(() => {
    fetchInbox();
    // Refresh inbox periodically every minute
    const interval = setInterval(fetchInbox, 60000);
    return () => clearInterval(interval);
  }, []);

  async function fetchInbox() {
    try {
      const res = await fetch("/api/communication/inbox");
      if (res.ok) {
        const data = await res.json();
        setInbox(data.conversations || []);
      }
    } catch (error) {
      console.error("Failed to fetch inbox", error);
    }
  }

  async function openThread(trackingNumber: string) {
    setActiveTrackingNumber(trackingNumber);
    setView('thread');
    setLoadingThread(true);
    setNewMessage("");
    
    try {
      // Mark as read
      await fetch(`/api/communication/document/${encodeURIComponent(trackingNumber)}`, { method: "PUT" });
      
      // Fetch thread
      const res = await fetch(`/api/communication/document/${encodeURIComponent(trackingNumber)}`);
      if (res.ok) {
        const data = await res.json();
        setThreadMessages(data.messages || []);
      }
      
      // Refresh inbox to clear badge
      fetchInbox();
    } catch (error) {
      console.error("Failed to fetch thread", error);
    } finally {
      setLoadingThread(false);
    }
  }

  async function sendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || !activeTrackingNumber) return;

    setSending(true);
    try {
      const res = await fetch("/api/communication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: activeTrackingNumber,
          message: newMessage.trim(),
          type: "Comment",
        }),
      });

      if (res.ok) {
        setNewMessage("");
        openThread(activeTrackingNumber); // Refresh thread
      }
    } catch (error) {
      console.error("Failed to send message", error);
    } finally {
      setSending(false);
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      openThread(searchQuery.trim().toUpperCase());
    }
  }

  const filteredInbox = inbox.filter(conv => 
    conv.trackingNumber.toLowerCase().includes(searchQuery.toLowerCase()) || 
    conv.customerName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg shadow-blue-500/30 transition-transform hover:scale-105 active:scale-95 sm:h-auto sm:w-auto sm:rounded-2xl sm:px-5 sm:py-3"
      >
        <MessageCircle size={24} className="sm:mr-2 sm:h-5 sm:w-5" />
        <span className="hidden font-semibold sm:inline">Comments</span>
        {totalUnread > 0 && (
          <span className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-rose-500 text-xs font-bold text-white sm:-right-3 sm:-top-3">
            {totalUnread > 99 ? '99+' : totalUnread}
          </span>
        )}
      </button>

      <FormDrawer
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title={view === 'inbox' ? "Office Communications" : `Document ${activeTrackingNumber}`}
        description={view === 'inbox' ? "Recent messages and office collaboration" : "Communication thread for this registration"}
      >
        <div className="flex h-[calc(100vh-180px)] flex-col gap-4">
          {view === 'inbox' ? (
            <>
              <form onSubmit={handleSearchSubmit} className="relative mb-4 flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search Tracking Number or Name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-10 w-full rounded-full border border-slate-200 bg-slate-50 pl-9 pr-4 text-sm outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>
              </form>

              <div className="flex-1 overflow-y-auto rounded-2xl border border-slate-100 bg-slate-50/30 p-2 dark:border-slate-800 dark:bg-slate-900/30">
                {filteredInbox.length === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center text-soft">
                    <SearchX size={32} className="mb-3 opacity-20" />
                    <p className="text-sm">No recent conversations found.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredInbox.map((conv) => (
                      <button
                        key={conv.id}
                        onClick={() => openThread(conv.trackingNumber)}
                        className="group flex w-full items-start gap-3 rounded-xl border border-transparent bg-transparent p-3 text-left transition-all hover:bg-white hover:shadow-sm dark:hover:bg-slate-800"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-linear-to-tr from-blue-500 to-indigo-600 text-sm font-bold text-white shadow-inner">
                          {conv.customerName.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-center justify-between gap-2">
                            <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{conv.customerName}</p>
                            <span className="shrink-0 text-[10px] font-medium text-slate-400">
                              {new Date(conv.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-xs font-semibold tracking-wide text-blue-600 dark:text-blue-400">#{conv.trackingNumber}</p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {conv.message}
                          </p>
                        </div>
                        {conv.unreadCount > 0 && (
                          <div className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white shadow-sm">
                            {conv.unreadCount}
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex h-full flex-col overflow-hidden rounded-xl border border-(--border) bg-slate-50/50 dark:bg-white/5">
              <div className="flex items-center gap-3 border-b border-(--border) bg-white p-3 dark:bg-white/5">
                <Button variant="ghost" size="sm" onClick={() => setView('inbox')} className="-ml-2">
                  <ArrowLeft size={16} className="mr-1" /> Back
                </Button>
                <div className="flex-1 text-right">
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => {
                      setIsOpen(false);
                      router.push(`/dashboard/search-report?trackingNumber=${activeTrackingNumber}`);
                    }}
                  >
                    View Document Details
                  </Button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {loadingThread ? (
                  <p className="text-center text-sm text-soft mt-10">Loading thread...</p>
                ) : threadMessages.length === 0 ? (
                  <p className="text-center text-sm text-soft mt-10">No messages found. Start a conversation below.</p>
                ) : (
                  <div className="flex flex-col gap-4">
                    {threadMessages.map((msg) => (
                      <div key={msg.id} className="group flex gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-linear-to-br from-slate-200 to-slate-300 text-xs font-bold text-slate-700 shadow-sm dark:from-slate-700 dark:to-slate-800 dark:text-slate-200">
                          {msg.senderUser?.name?.charAt(0).toUpperCase() || "U"}
                        </div>
                        <div className="flex min-w-0 flex-1 flex-col gap-1">
                          <div className="flex items-baseline gap-2">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                              {msg.senderUser?.name || "System"} <span className="font-medium text-slate-500">{msg.senderUser?.role?.name ? `(${msg.senderUser.role.name})` : ""}</span>
                            </span>
                            <span className="text-[10px] text-slate-400">{new Date(msg.createdAt).toLocaleString()}</span>
                          </div>
                          <div className="relative inline-block max-w-[90%] self-start rounded-2xl rounded-tl-sm bg-white p-3 shadow-sm border border-slate-100 dark:border-slate-800 dark:bg-slate-900">
                            {msg.parent && (
                              <div className="mb-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-500 border-l-2 border-slate-300 dark:bg-white/5 dark:border-slate-700">
                                Replying to {msg.parent.senderUser?.name || "System"}: "{msg.parent.message}"
                              </div>
                            )}
                            <p className="whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-200">{msg.message}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950">
                <form onSubmit={sendMessage} className="relative flex flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 dark:border-slate-800 dark:bg-slate-900">
                  <div className="flex items-end gap-2">
                    <textarea 
                      placeholder="Type your message..." 
                      className="max-h-32 min-h-[40px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      required
                      rows={1}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          if (newMessage.trim()) sendMessage(e);
                        }
                      }}
                    />
                    <Button 
                      type="submit" 
                      size="icon" 
                      className="mb-1 h-8 w-8 shrink-0 rounded-full"
                      disabled={sending || !newMessage.trim()}
                    >
                      <Send size={14} className={sending ? "opacity-50" : "mr-0.5"} />
                    </Button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </FormDrawer>
    </>
  );
}
