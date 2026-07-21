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
  senderOfficeName: string;
  receiverOfficeName: string;
  createdAt: string;
  unreadCount: number;
};

type Office = {
  id: string;
  officeName: string;
};

type Message = {
  id: string;
  trackingNumber: string;
  message: string;
  createdAt: string;
  senderUser: { name: string | null };
  senderOffice: { officeName: string } | null;
  receiverOffice: { officeName: string } | null;
  parent: { message: string; senderOffice: { officeName: string } | null } | null;
};

export function FloatingCommunicationWidget() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [inbox, setInbox] = useState<Conversation[]>([]);
  const [offices, setOffices] = useState<Office[]>([]);
  const [loading, setLoading] = useState(false);
  
  // View state: 'inbox' | 'thread'
  const [view, setView] = useState<'inbox' | 'thread'>('inbox');
  const [activeTrackingNumber, setActiveTrackingNumber] = useState<string | null>(null);
  
  // Thread state
  const [threadMessages, setThreadMessages] = useState<Message[]>([]);
  const [loadingThread, setLoadingThread] = useState(false);
  
  // Compose state
  const [newMessage, setNewMessage] = useState("");
  const [selectedOfficeId, setSelectedOfficeId] = useState("");
  const [sending, setSending] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");

  const totalUnread = inbox.reduce((sum, conv) => sum + conv.unreadCount, 0);

  useEffect(() => {
    fetchInbox();
    fetchOffices();
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

  async function fetchOffices() {
    try {
      const res = await fetch("/api/communication/offices");
      if (res.ok) {
        const data = await res.json();
        setOffices(data.offices || []);
      }
    } catch (error) {
      console.error("Failed to fetch offices", error);
    }
  }

  async function openThread(trackingNumber: string) {
    setActiveTrackingNumber(trackingNumber);
    setView('thread');
    setLoadingThread(true);
    setNewMessage("");
    setSelectedOfficeId("");
    
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
    if (!newMessage.trim() || !selectedOfficeId || !activeTrackingNumber) return;

    setSending(true);
    try {
      const res = await fetch("/api/communication", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trackingNumber: activeTrackingNumber,
          message: newMessage.trim(),
          type: "Comment",
          receiverOfficeId: selectedOfficeId,
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
              <form onSubmit={handleSearchSubmit} className="flex gap-2">
                <Input 
                  label="Search"
                  placeholder="Search Tracking Number or Name..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1"
                />
                <Button type="submit" variant="secondary"><Search size={18} /></Button>
              </form>

              <div className="flex-1 overflow-y-auto rounded-xl border border-(--border) bg-slate-50/50 p-2 dark:bg-white/5">
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
                        className="flex flex-col gap-2 rounded-lg border border-(--border) bg-white p-3 text-left shadow-sm transition-colors hover:border-blue-500/30 hover:bg-blue-50/50 dark:bg-white/5 dark:hover:bg-white/10"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs font-bold text-blue-600">{conv.trackingNumber}</p>
                            <p className="text-sm font-semibold">{conv.customerName}</p>
                          </div>
                          <div className="flex flex-col items-end text-xs text-soft">
                            <span className="whitespace-nowrap">{new Date(conv.createdAt).toLocaleDateString()}</span>
                            {conv.unreadCount > 0 && (
                              <span className="mt-1 rounded-full bg-rose-500 px-2 py-0.5 font-bold text-white">
                                {conv.unreadCount} New
                              </span>
                            )}
                          </div>
                        </div>
                        <p className="line-clamp-1 text-sm text-soft">
                          <span className="font-medium text-slate-700 dark:text-slate-300">{conv.senderOfficeName}:</span> {conv.message}
                        </p>
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
                      <div key={msg.id} className="flex flex-col rounded-lg bg-white p-3 shadow-sm border border-(--border) dark:bg-white/5">
                        <div className="flex items-center justify-between text-xs text-soft mb-1">
                          <span className="font-semibold text-slate-700 dark:text-slate-300">
                            {msg.senderOffice?.officeName || "System"} ({msg.senderUser?.name})
                          </span>
                          <span>{new Date(msg.createdAt).toLocaleString()}</span>
                        </div>
                        {msg.parent && (
                          <div className="mb-2 rounded bg-slate-100 p-2 text-xs text-soft border-l-2 border-slate-300 dark:bg-white/5 dark:border-slate-700">
                            Replying to {msg.parent.senderOffice?.officeName}: "{msg.parent.message}"
                          </div>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                        <div className="mt-2 text-right text-[10px] text-soft">
                          To: {msg.receiverOffice?.officeName || "Unknown"}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-(--border) bg-white p-3 dark:bg-white/5">
                <form onSubmit={sendMessage} className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <select
                      className="w-1/3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
                      value={selectedOfficeId}
                      onChange={(e) => setSelectedOfficeId(e.target.value)}
                      required
                    >
                      <option value="" disabled>Send to Office...</option>
                      {offices.map((o) => (
                        <option key={o.id} value={o.id}>{o.officeName}</option>
                      ))}
                    </select>
                    <Textarea 
                      label="Message"
                      placeholder="Type your message..." 
                      className="flex-1 min-h-[40px] py-2"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      required
                    />
                  </div>
                  <div className="flex justify-end">
                    <Button type="submit" disabled={sending || !newMessage.trim() || !selectedOfficeId}>
                      <Send size={16} className="mr-2" /> Send Message
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
