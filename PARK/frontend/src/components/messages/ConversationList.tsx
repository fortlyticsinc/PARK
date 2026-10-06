import { useEffect } from "react";
import { Card } from "@/components/ui/Card";
import { useMessages, ConversationSummary } from "@/hooks/useMessages";
import { cn } from "@/lib/utils";

interface ConversationListProps {
  onSelect: (pairingId: string, name: string) => void;
}

export function ConversationList({ onSelect }: ConversationListProps) {
  const { conversations, isLoading, getConversations } = useMessages();

  useEffect(() => {
    getConversations();
  }, []);

  return (
    <div className="space-y-2">
      {isLoading && !conversations && (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-stone-900/50" />
          ))}
        </div>
      )}

      {conversations?.map((conv: ConversationSummary) => (
        <Card
          key={conv.pairing_id}
          isInteractive
          onClick={() => onSelect(conv.pairing_id, conv.student_name || conv.supervisor_name || "Unknown")}
          className="relative"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-stone-800">
              <span className="text-sm font-medium text-stone-400">
                {(conv.student_name || "?")[0].toUpperCase()}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <p className="truncate text-sm font-medium text-stone-200">
                  {conv.student_name || conv.supervisor_name || "Unknown"}
                </p>
                <span className="text-xs text-stone-600">
                  {conv.last_message_at ? new Date(conv.last_message_at).toLocaleDateString("en-NG", {
                    day: "numeric", month: "short",
                  }) : "New"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="truncate text-xs text-stone-500">{conv.last_message || "Start a conversation"}</p>
                {conv.unread_count > 0 && (
                  <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-sage-600 px-1.5 text-[10px] font-bold text-white">
                    {conv.unread_count}
                  </span>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}

      {conversations?.length === 0 && (
        <div className="py-12 text-center">
          <p className="text-sm text-stone-500">No conversations yet</p>
          <p className="text-xs text-stone-600 mt-1">
            Messages will appear here when you start chatting
          </p>
        </div>
      )}
    </div>
  );
}
