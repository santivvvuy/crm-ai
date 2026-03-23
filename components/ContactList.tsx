import type { Contact } from "@/lib/types";
import ContactItem from "./ContactItem";

type Props = {
  contacts: Contact[];
  selectedId: string | null;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSelectContact: (c: Contact) => void;
};

export default function ContactList({
  contacts,
  selectedId,
  searchQuery,
  onSearchChange,
  onSelectContact,
}: Props) {
  const filtered = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <aside className="flex w-[420px] min-w-[320px] flex-col border-r border-[#222d35] bg-[#111b21]">
      {/* Header */}
      <header className="flex h-[60px] items-center justify-between bg-[#202c33] px-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6b7c85] text-sm font-medium text-white">
          YO
        </div>
        <div className="flex items-center gap-3">
          <button className="rounded-full p-2 text-[#aebac1] transition-colors hover:bg-[#2a3942]" aria-label="New chat">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M19.005 3.175H4.674C3.642 3.175 3 3.789 3 4.821V21.02l3.544-3.514h12.461c1.033 0 2.064-1.06 2.064-2.093V4.821c-.001-1.032-1.032-1.646-2.064-1.646zm-4.989 9.869H7.041V11.1h6.975v1.944zm3-4H7.041V7.1h9.975v1.944z" />
            </svg>
          </button>
          <button className="rounded-full p-2 text-[#aebac1] transition-colors hover:bg-[#2a3942]" aria-label="Menu">
            <svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor">
              <path d="M12 7a2 2 0 1 0-.001-4.001A2 2 0 0 0 12 7zm0 2a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 9zm0 6a2 2 0 1 0-.001 3.999A2 2 0 0 0 12 15z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-3 rounded-lg bg-[#202c33] px-4 py-1.5">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="#8696a0" className="shrink-0">
            <path d="M15.009 13.805h-.636l-.22-.219a5.184 5.184 0 0 0 1.256-3.386 5.207 5.207 0 1 0-5.207 5.208 5.183 5.183 0 0 0 3.385-1.255l.221.22v.635l4.004 3.999 1.194-1.195-3.997-4.007zm-4.808 0a3.6 3.6 0 1 1 0-7.2 3.6 3.6 0 0 1 0 7.2z" />
          </svg>
          <input
            type="text"
            placeholder="Buscar o iniciar un nuevo chat"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-sm text-[#d1d7db] placeholder-[#8696a0] outline-none"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.map((contact) => (
          <ContactItem
            key={contact.id}
            contact={contact}
            isSelected={contact.id === selectedId}
            onClick={() => onSelectContact(contact)}
          />
        ))}
      </div>
    </aside>
  );
}
