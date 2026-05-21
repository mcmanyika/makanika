export interface ChatMessageInput {
  role: "user" | "assistant";
  content: string;
}

export interface PendingActionResponse {
  id: string;
  summary: string;
  action: "book_appointment" | "reschedule_appointment";
}

export interface ChatApiResponse {
  message: string;
  pendingAction?: PendingActionResponse;
}
