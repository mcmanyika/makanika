"use client";

import { useState, useMemo } from "react";
import { AdminHeader } from "@/components/layout/AdminHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageLoader } from "@/components/ui/PageLoader";
import { AssistantPanel } from "@/components/chat/AssistantPanel";
import { MessageComposer } from "@/components/messages/MessageComposer";
import { useAuth } from "@/contexts/AuthContext";
import { useShopData } from "@/contexts/ShopDataContext";
import { sendMessage } from "@/lib/firebase/mutations";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

export default function MessagesPage() {
  const { user } = useAuth();
  const { messages, customers, getCustomer, loading } = useShopData();
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null
  );

  const threads = useMemo(() => {
    const byCustomer = new Map<string, (typeof messages)[0]>();
    for (const m of messages) {
      if (!byCustomer.has(m.customerId)) {
        byCustomer.set(m.customerId, m);
      }
    }
    return Array.from(byCustomer.values());
  }, [messages]);

  const activeCustomerId =
    selectedCustomerId ?? threads[0]?.customerId ?? customers[0]?.id ?? null;

  const threadMessages = activeCustomerId
    ? messages.filter((m) => m.customerId === activeCustomerId)
    : [];

  const activeCustomer = activeCustomerId
    ? getCustomer(activeCustomerId)
    : undefined;

  const handleSend = async (body: string) => {
    if (!user?.shopId || !activeCustomerId) {
      throw new Error("Select a customer conversation first.");
    }
    await sendMessage({
      shopId: user.shopId,
      customerId: activeCustomerId,
      senderId: user.id,
      senderRole: user.role,
      senderName: user.displayName,
      body,
    });
  };

  if (loading) return <PageLoader />;

  return (
    <div>
      <AdminHeader title="Messages" subtitle="Customer communication" />
      <div className="space-y-4 p-4 sm:p-6">
        <AssistantPanel
          title="Scheduling assistant"
          hint="Help customers book visits or check repair order status while you message."
          defaultOpen={false}
        />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Conversations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {threads.length === 0 && customers.length === 0 ? (
              <p className="text-sm text-slate-500">No conversations yet</p>
            ) : (
              <>
                {threads.map((m) => {
                  const c = getCustomer(m.customerId);
                  const name = c
                    ? `${c.firstName} ${c.lastName}`
                    : m.senderName;
                  return (
                    <button
                      key={m.customerId}
                      type="button"
                      onClick={() => setSelectedCustomerId(m.customerId)}
                      className={cn(
                        "w-full rounded-lg border p-3 text-left transition-colors",
                        activeCustomerId === m.customerId
                          ? "border-blue-200 bg-blue-50"
                          : "border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      <p className="font-medium text-slate-900">{name}</p>
                      <p className="truncate text-sm text-slate-500">
                        {m.body}
                      </p>
                    </button>
                  );
                })}
                {threads.length === 0 &&
                  customers.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCustomerId(c.id)}
                      className={cn(
                        "w-full rounded-lg border p-3 text-left",
                        activeCustomerId === c.id
                          ? "border-blue-200 bg-blue-50"
                          : "border-slate-100 hover:bg-slate-50"
                      )}
                    >
                      <p className="font-medium text-slate-900">
                        {c.firstName} {c.lastName}
                      </p>
                      <p className="text-sm text-slate-500">Start conversation</p>
                    </button>
                  ))}
              </>
            )}
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>
              {activeCustomer
                ? `${activeCustomer.firstName} ${activeCustomer.lastName}`
                : "Select a conversation"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {threadMessages.length === 0 ? (
              <p className="text-sm text-slate-500">
                {activeCustomerId
                  ? "No messages in this thread yet."
                  : "Select a customer to view messages."}
              </p>
            ) : (
              threadMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.senderRole === "customer"
                      ? "justify-start"
                      : "justify-end"
                  }`}
                >
                  <div
                    className={`max-w-md rounded-xl px-4 py-3 ${
                      msg.senderRole === "customer"
                        ? "bg-slate-100 text-slate-900"
                        : "bg-blue-600 text-white"
                    }`}
                  >
                    <p className="text-xs font-medium opacity-80">
                      {msg.senderName} ·{" "}
                      {formatDateTime(msg.createdAt as Date)}
                    </p>
                    <p className="mt-1 text-sm">{msg.body}</p>
                  </div>
                </div>
              ))
            )}
            <MessageComposer
              onSend={handleSend}
              disabled={!activeCustomerId}
            />
          </CardContent>
        </Card>
      </div>
      </div>
    </div>
  );
}
