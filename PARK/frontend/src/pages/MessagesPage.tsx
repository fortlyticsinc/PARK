/**
 * PARK — Messages Page (Module 4)
 * WhatsApp-style two-tab layout:
 *   - "Chats": 1:1 DM threads (ConversationList -> ChatInterface),
 *     unchanged from the already-tested messaging code.
 *   - "Announcements": supervisor broadcast feed. Supervisors get a
 *     composer at the top; students get a read-only feed. This is
 *     intentionally ONE-WAY (supervisor -> all paired students), not
 *     a two-way group chat — see the broadcast_service.py comment for
 *     why that scope was chosen for launch.
 */
import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { ConversationList } from "@/components/messages/ConversationList";
import { ChatInterface } from "@/components/messages/ChatInterface";
import { useBroadcasts } from "@/hooks/useBroadcasts";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

type Tab = "chats" | "announcements";

export function MessagesPage() {
  const { user } = useAuthStore();
  const location = useLocation();
  const messageState = location.state as { pairingId?: string; name?: string } | null;
  const [tab, setTab] = useState<Tab>("chats");
  const [activeChat, setActiveChat] = useState<{ pairingId: string; name: string } | null>(
    messageState?.pairingId
      ? { pairingId: messageState.pairingId, name: messageState.name || "Pairing" }
      : null
  );

  return (
    <div className="min-h-screen bg-stone-950">
      <div className="sticky top-0 z-10 border-b border-stone-800 bg-stone-950/95 backdrop-blur-md">
        <div className="px-4 py-4 sm:px-6">
          <h1 className="font-serif text-xl text-stone-100 sm:text-2xl">Messages</h1>
        </div>
        {/* Tab switcher — WhatsApp-style: Chats vs Announcements */}
        <div className="flex border-b border-stone-800 px-4 sm:px-6">
          <button
            onClick={() => { setTab("chats"); setActiveChat(null); }}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab === "chats" ? "border-sage-600 text-sage-500" : "border-transparent text-stone-500 hover:text-stone-300"
            )}
          >
            Chats
          </button>
          <button
            onClick={() => setTab("announcements")}
            className={cn(
              "border-b-2 px-4 py-2 text-sm font-medium transition-colors",
              tab === "announcements" ? "border-sage-600 text-sage-500" : "border-transparent text-stone-500 hover:text-stone-300"
            )}
          >
            Announcements
          </button>
        </div>
      </div>

      <div className="px-4 py-4 sm:px-6">
        {tab === "chats" && (
          activeChat ? (
            <ChatInterface
              pairingId={activeChat.pairingId}
              otherPartyName={activeChat.name}
              onBack={() => setActiveChat(null)}
            />
          ) : (
            <ConversationList onSelect={(pairingId, name) => setActiveChat({ pairingId, name })} />
          )
        )}

        {tab === "announcements" && <AnnouncementsFeed />}
      </div>
    </div>
  );
}

function AnnouncementsFeed() {
  const { user } = useAuthStore();
  const { broadcasts, isLoading, error, listBroadcasts, sendBroadcast } = useBroadcasts();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  useEffect(() => {
    listBroadcasts();
  }, [listBroadcasts]);

  const handleSend = async () => {
    if (!draft.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      await sendBroadcast(draft.trim());
      setDraft("");
      listBroadcasts();
    } catch (e: any) {
      setSendError(e.message || "Failed to post announcement");
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      {user?.role === "supervisor" && (
        <Card className="space-y-2">
          <p className="text-sm font-medium text-sage-500">Post to all your students</p>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="e.g. Reminder: Chapter 3 deadline is Friday."
            rows={3}
            className="w-full resize-none rounded-lg border border-stone-800 bg-stone-950 p-3 text-sm text-stone-200 placeholder:text-stone-600 focus:border-sage-600 focus:outline-none"
          />
          {sendError && <p className="text-xs text-red-400">{sendError}</p>}
          <Button size="sm" onClick={handleSend} isLoading={sending} disabled={!draft.trim()}>
            Post Announcement
          </Button>
        </Card>
      )}

      {isLoading && <div className="py-8 text-center text-sm text-stone-500">Loading...</div>}
      {error && <div className="py-8 text-center text-sm text-red-300">{error}</div>}

      {!isLoading && broadcasts.length === 0 && (
        <div className="py-12 text-center text-sm text-stone-500">
          {user?.role === "supervisor" ? "You haven't posted any announcements yet." : "No announcements yet."}
        </div>
      )}

      <div className="space-y-3">
        {broadcasts.map((b) => (
          <Card key={b.id}>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-sage-500">{b.supervisor_name}</span>
              <span className="text-xs text-stone-600">{new Date(b.created_at).toLocaleString()}</span>
            </div>
            <p className="text-sm text-stone-200">{b.content}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
