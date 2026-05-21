"use client";

import { useState } from "react";
import { Bot, Send, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useChatAssistant } from "@/hooks/useChatAssistant";
import { cn } from "@/lib/utils";

interface AssistantPanelProps {
  title?: string;
  hint?: string;
  className?: string;
  defaultOpen?: boolean;
}

export function AssistantPanel({
  title = "Shop assistant",
  hint = "Ask about appointments, repair status, or booking a visit.",
  className,
  defaultOpen = true,
}: AssistantPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [input, setInput] = useState("");
  const {
    messages,
    pendingAction,
    loading,
    confirming,
    error,
    sendMessage,
    confirmPending,
    cancelPending,
    clearChat,
  } = useChatAssistant();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const text = input;
    setInput("");
    void sendMessage(text);
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white shadow-sm",
        className
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-slate-900">
          <Bot className="h-5 w-5 text-slate-600" />
          {title}
        </span>
        <span className="text-xs text-slate-500">{open ? "Hide" : "Show"}</span>
      </button>

      {open && (
        <div className="flex min-h-0 flex-1 flex-col border-t border-slate-100 px-4 pb-4">
          <p className="mb-3 text-xs text-slate-500">{hint}</p>

          {messages.length > 0 && (
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={clearChat}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
              >
                <Trash2 className="h-3 w-3" />
                Clear chat
              </button>
            </div>
          )}

          <div className="mb-3 min-h-[12rem] flex-1 space-y-2 overflow-y-auto rounded-lg bg-slate-50 p-3 lg:min-h-0 lg:max-h-none">
            {messages.length === 0 && (
              <p className="text-sm text-slate-500">
                Try: &quot;What are my upcoming appointments?&quot; or
                &quot;Book an oil change next week.&quot;
              </p>
            )}
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm",
                  m.role === "user"
                    ? "ml-8 bg-blue-600 text-white"
                    : "mr-4 bg-white text-slate-800 shadow-sm"
                )}
              >
                {m.content}
              </div>
            ))}
            {loading && (
              <p className="text-sm text-slate-500">Thinking…</p>
            )}
          </div>

          {pendingAction && (
            <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
              <p className="text-sm font-medium text-amber-900">Confirm action</p>
              <p className="mt-1 text-sm text-amber-800">
                {pendingAction.summary}
              </p>
              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => void confirmPending()}
                  disabled={confirming}
                >
                  {confirming ? "Booking…" : "Confirm"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={cancelPending}
                  disabled={confirming}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {error && (
            <p className="mb-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message…"
              disabled={loading || confirming}
              className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50"
            />
            <Button
              type="submit"
              size="sm"
              disabled={loading || confirming || !input.trim()}
              aria-label="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
