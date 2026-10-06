import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";
import { useMessages } from "@/hooks/useMessages";
import { useBroadcasts } from "@/hooks/useBroadcasts";

export function NotificationBell() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const { conversations, getConversations } = useMessages();
  const { broadcasts, listBroadcasts } = useBroadcasts();
  const [lastSeen, setLastSeen] = useState(() =>
    user ? localStorage.getItem(`notifications-seen:${user.id}`) : null
  );

  useEffect(() => {
    if (!user || (user.role !== "student" && user.role !== "supervisor")) return;
    getConversations();
    listBroadcasts();
    const timer = window.setInterval(() => {
      getConversations();
      listBroadcasts();
    }, 10000);
    return () => window.clearInterval(timer);
  }, [user, getConversations, listBroadcasts]);

  const unreadMessages = useMemo(
    () => conversations?.reduce((total, conversation) => total + conversation.unread_count, 0) || 0,
    [conversations]
  );
  const unreadAnnouncements = useMemo(() => {
    const seenAt = lastSeen ? new Date(lastSeen).getTime() : 0;
    return broadcasts.filter((broadcast) => new Date(broadcast.created_at).getTime() > seenAt).length;
  }, [broadcasts, lastSeen]);
  const total = unreadMessages + unreadAnnouncements;

  if (!user || (user.role !== "student" && user.role !== "supervisor")) return null;

  const openNotifications = () => {
    const now = new Date().toISOString();
    localStorage.setItem(`notifications-seen:${user.id}`, now);
    setLastSeen(now);
    navigate("/messages");
  };

  return (
    <button
      type="button"
      onClick={openNotifications}
      aria-label={total ? `${total} unread notifications` : "Notifications"}
      className="relative rounded-lg p-1.5 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
    >
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 10-12 0v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 01-6 0v-1m6 0H9" />
      </svg>
      {total > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[9px] font-bold text-white">
          {total > 99 ? "99+" : total}
        </span>
      )}
    </button>
  );
}