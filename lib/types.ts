export type Contact = {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  lastMessage: string;
  time: string;
  unread: number;
  online: boolean;
};

export type Message = {
  id: string;
  text: string;
  time: string;
  fromMe: boolean;
  status: "sent" | "delivered" | "read";
  webhookFailed?: boolean;
};
