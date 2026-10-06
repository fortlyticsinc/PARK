import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useMessages, Message } from "@/hooks/useMessages";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";

interface ChatInterfaceProps {
  pairingId: string;
  otherPartyName: string;
  onBack?: () => void;
}

export function ChatInterface({ pairingId, otherPartyName, onBack }: ChatInterfaceProps) {
  const { user } = useAuthStore();
  const { messages, getConversation, sendMessage, markAsRead, isLoading } = useMessages();
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    getConversation(pairingId);
    const refresh = window.setInterval(() => getConversation(pairingId), 3000);
    return () => window.clearInterval(refresh);
  }, [pairingId]);

  useEffect(() => {
    messages?.items
      .filter((message) => message.sender_id !== user?.id && !message.read)
      .forEach((message) => markAsRead(message.id));
  }, [messages?.items, user?.id, markAsRead]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages?.items]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const sent = await sendMessage({
      pairing_id: pairingId,
      content: newMessage.trim(),
    });
    if (sent) {
      setNewMessage("");
      inputRef.current?.focus();
      getConversation(pairingId);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-stone-800 px-4 py-3">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
        )}
        <div>
          <h3 className="font-serif text-base text-stone-100">{otherPartyName}</h3>
          <p className="text-xs text-stone-500">Tap to view profile</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {isLoading && !messages && (
          <div className="flex justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-700 border-t-sage-600" />
          </div>
        )}

        {messages?.items.map((msg: Message) => {
          const isMe = msg.sender_id === user?.id;
          return (
            <div
              key={msg.id}
              className={cn("flex", isMe ? "justify-end" : "justify-start")}
            >
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-2.5",
                  isMe
                    ? "bg-sage-700/40 text-sage-100 rounded-br-md"
                    : "bg-stone-800 text-stone-300 rounded-bl-md"
                )}
              >
                <p className="text-sm leading-relaxed">{msg.content}</p>
                <div className="mt-1 flex items-center justify-end gap-1">
                  <span className="text-[10px] text-stone-500">
                    {new Date(msg.created_at).toLocaleTimeString("en-NG", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {isMe && (
                    <span className="text-[10px]">
                      {msg.read ? "✓✓" : "✓"}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t border-stone-800 px-4 py-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            rows={1}
            className={cn(
              "min-h-[44px] max-h-32 flex-1 resize-none rounded-xl border bg-stone-900 px-3.5 py-2.5 text-sm text-stone-100",
              "placeholder:text-stone-600 focus:border-sage-500/50 focus:outline-none",
              "border-stone-800 hover:border-stone-700 transition-colors"
            )}
          />
          <Button
            onClick={handleSend}
            disabled={!newMessage.trim() || isLoading}
            size="sm"
            className="h-[44px] w-[44px] shrink-0 rounded-xl p-0"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </Button>
        </div>
      </div>
    </div>
  );
}
