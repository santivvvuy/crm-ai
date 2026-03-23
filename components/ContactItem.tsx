import type { Contact } from "@/lib/types";

type Props = {
  contact: Contact;
  isSelected: boolean;
  onClick: () => void;
};

export default function ContactItem({ contact, isSelected, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[#202c33] ${
        isSelected ? "bg-[#2a3942]" : ""
      }`}
    >
      <div className="relative shrink-0">
        <div className="flex h-[49px] w-[49px] items-center justify-center rounded-full bg-[#6b7c85] text-base font-medium text-white">
          {contact.avatar}
        </div>
        {contact.online && (
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-[#111b21] bg-[#00a884]" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col border-b border-[#222d35] pb-3">
        <div className="flex items-center justify-between">
          <span className="truncate text-[17px] text-[#e9edef]">{contact.name}</span>
          <span className={`text-xs ${contact.unread > 0 ? "text-[#00a884]" : "text-[#8696a0]"}`}>
            {contact.time}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="truncate text-sm text-[#8696a0]">{contact.lastMessage}</span>
          {contact.unread > 0 && (
            <span className="ml-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[#00a884] px-1.5 text-xs font-medium text-[#111b21]">
              {contact.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
