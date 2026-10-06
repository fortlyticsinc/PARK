import { useState, useCallback } from "react";
import { api } from "@/lib/api";

export interface Message {
  id: string;
  pairing_id: string;
  sender_id: string;
  sender_role: string;
  sender_name: string | null;
  content: string;
  read: boolean;
  created_at: string;
}

export interface ConversationSummary {
  pairing_id: string;
  student_name: string | null;
  supervisor_name: string | null;
  last_message: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface PaginatedMessages {
  items: Message[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export function useMessages() {
  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [messages, setMessages] = useState<PaginatedMessages | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const response = await api.get<{ conversations: ConversationSummary[] }>(
      "/v1/messages/conversations"
    );

    if (response.error) {
      setError(response.error.message);
      setConversations(null);
    } else if (response.data) {
      setConversations(response.data.conversations);
    }

    setIsLoading(false);
  }, []);

  const getConversation = useCallback(
    async (pairingId: string, page: number = 1) => {
      setIsLoading(true);
      setError(null);

      const response = await api.get<PaginatedMessages>(
        `/v1/messages/conversations/${pairingId}?page=${page}&limit=50`
      );

      if (response.error) {
        setError(response.error.message);
        setMessages(null);
      } else if (response.data) {
        setMessages(response.data);
      }

      setIsLoading(false);
    },
    []
  );

  const sendMessage = useCallback(
    async (data: { pairing_id: string; content: string }) => {
      setIsLoading(true);
      setError(null);

      const response = await api.post<{ message: Message }>("/v1/messages", data);

      setIsLoading(false);

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      return response.data?.message ?? null;
    },
    []
  );

  const markAsRead = useCallback(async (messageId: string) => {
    await api.patch(`/v1/messages/${messageId}/read`, {});
  }, []);

  const bulkSendSMS = useCallback(
    async (data: { pairing_ids: string[]; message: string }) => {
      setIsLoading(true);
      setError(null);

      const response = await api.post<{
        sent: number;
        failed: number;
        logs: unknown[];
      }>("/v1/messages/sms/bulk-send", data);

      setIsLoading(false);

      if (response.error) {
        setError(response.error.message);
        return null;
      }

      return response.data;
    },
    []
  );

  return {
    conversations,
    messages,
    isLoading,
    error,
    getConversations,
    getConversation,
    sendMessage,
    markAsRead,
    bulkSendSMS,
  };
}
