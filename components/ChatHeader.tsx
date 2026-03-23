import type { Contact } from "@/lib/types";

export default function ChatHeader({ contact }: { contact: Contact }) {
  return (
    <header className="flex h-[60px] items-center gap-3 bg-[#202c33] px-4">
      <div className="relative">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6b7c85] text-sm font-medium text-white">
          {contact.avatar}
        </div>
        {contact.online && (
          <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#202c33] bg-[#00a884]" />
        )}
      </div>
      <div className="flex-1">
        <h2 className="text-base font-normal text-[#e9edef]">{contact.name}</h2>
        <p className="text-xs text-[#8696a0]">
          {contact.online ? "en línea" : `últ. vez hoy a las ${contact.time}`}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button className="rounded-full p-2 text-[#aebac1] transition-colors hover:bg-[#2a3942]" aria-label="Search">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.183 5.183 0 0 0 3.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" />
          </svg>
        </button>
        <button className="rounded-full p-2 text-[#aebac1] transition-colors hover:bg-[#2a3942]" aria-label="Menu">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
            <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z" />
          </svg>
        </button>
      </div>
    </header>
  );
}
