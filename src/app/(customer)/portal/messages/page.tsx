"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { PageLoader } from "@/components/ui/PageLoader";
import { AssistantPanel } from "@/components/chat/AssistantPanel";
import { MessageComposer } from "@/components/messages/MessageComposer";
import { useAuth } from "@/contexts/AuthContext";
import { useCustomerData } from "@/contexts/CustomerDataContext";
import { sendMessage } from "@/lib/firebase/mutations";
import { formatDateTime } from "@/lib/utils";

export default function CustomerMessagesPage() {
  const { user } = useAuth();
  const { messages, loading } = useCustomerData();

  if (loading) return <PageLoader />;

  const handleSend = async (body: string) => {
    if (!user?.shopId || !user.customerId) {
      throw new Error("Missing profile data. Sign out and sign in again.");
    }
    await sendMessage({
      shopId: user.shopId,
      customerId: user.customerId,
      senderId: user.id,
      senderRole: "customer",
      senderName: user.displayName,
      body,
    });
  };

  return (
    <div>
      <header className="border-b border-slate-200 bg-white px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold text-slate-900">Messages</h1>
        <p className="text-slate-500">Chat with your service advisor</p>
      </header>
      <div className="space-y-4 p-4 sm:p-6">
        <AssistantPanel
          title="Assistant"
          hint="Ask about repair status, appointments, or booking a visit."
          defaultOpen={false}
        />
      <Card>
        <CardHeader>
          <CardTitle>Conversation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {messages.length === 0 ? (
            <p className="text-sm text-slate-500">
              No messages yet. Send a message to start the conversation.
            </p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${
                  msg.senderRole === "customer"
                    ? "justify-end"
                    : "justify-start"
                }`}
              >
                <div
                  className={`max-w-md rounded-xl px-4 py-3 ${
                    msg.senderRole === "customer"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  <p className="text-xs opacity-80">
                    {msg.senderName} · {formatDateTime(msg.createdAt as Date)}
                  </p>
                  <p className="mt-1 text-sm">{msg.body}</p>
                </div>
              </div>
            ))
          )}
          <MessageComposer onSend={handleSend} />
        </CardContent>
      </Card>
      </div>
    </div>
  );
}
