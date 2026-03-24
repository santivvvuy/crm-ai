export type Label = {
  id: string;
  name: string;
  color: string;
};

export type ConversationStatus = "open" | "pending" | "resolved";

export type Contact = {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
  aiEnabled: boolean;
  labels: Label[];
  conversationStatus: ConversationStatus;
};

export type Message = {
  id: string;
  text: string;
  time: string;
  fromMe: boolean;
  status: "sent" | "delivered" | "read";
};

export type QuickReply = {
  id: string;
  title: string;
  body: string;
};

export type ContactNote = {
  id: string;
  contact_id: string;
  body: string;
  created_at: string;
};

export type Toast = {
  id: string;
  contactName: string;
  text: string;
  contactId: string;
};
