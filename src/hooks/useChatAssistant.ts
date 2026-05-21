"use client";

import { useCallback, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import type { ChatApiResponse, ChatMessageInput } from "@/lib/openai/types";

export interface ChatUiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export function useChatAssistant() {
  const { firebaseUser } = useAuth();
  const [messages, setMessages] = useState<ChatUiMessage[]>([]);
  const [pendingAction, setPendingAction] = useState<
    ChatApiResponse["pendingAction"] | null
  >(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");

  const getToken = useCallback(async () => {
    if (!firebaseUser) throw new Error("Please sign in to use the assistant.");
    return firebaseUser.getIdToken();
  }, [firebaseUser]);

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setError("");
      const userMsg: ChatUiMessage = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      setMessages((prev) => [...prev, userMsg]);
      setLoading(true);
      setPendingAction(null);

      try {
        const token = await getToken();
        const history: ChatMessageInput[] = [...messages, userMsg].map((m) => ({
          role: m.role,
          content: m.content,
        }));

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ messages: history }),
        });

        const data = (await res.json()) as ChatApiResponse & { error?: string };
        if (!res.ok) {
          throw new Error(data.error ?? "Request failed.");
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: data.message,
          },
        ]);
        if (data.pendingAction) {
          setPendingAction(data.pendingAction);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    },
    [loading, messages, getToken]
  );

  const confirmPending = useCallback(async () => {
    if (!pendingAction || confirming) return;

    setConfirming(true);
    setError("");

    try {
      const token = await getToken();
      const res = await fetch("/api/chat/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ pendingActionId: pendingAction.id }),
      });

      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.error ?? "Confirmation failed.");
      }

      setPendingAction(null);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.message ?? "Done.",
        },
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed.");
    } finally {
      setConfirming(false);
    }
  }, [pendingAction, confirming, getToken]);

  const cancelPending = useCallback(() => {
    setPendingAction(null);
  }, []);

  const clearChat = useCallback(() => {
    setMessages([]);
    setPendingAction(null);
    setError("");
  }, []);

  return {
    messages,
    pendingAction,
    loading,
    confirming,
    error,
    sendMessage,
    confirmPending,
    cancelPending,
    clearChat,
  };
}
