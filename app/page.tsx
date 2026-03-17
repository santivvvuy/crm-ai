"use client";

import { useState } from "react";

const contacts = [
  {
    id: 1,
    name: "Ana García",
    avatar: "AG",
    lastMessage: "Perfecto, nos vemos mañana!",
    time: "10:42",
    unread: 2,
    online: true,
  },
  {
    id: 2,
    name: "Carlos López",
    avatar: "CL",
    lastMessage: "Te envié el documento",
    time: "09:15",
    unread: 0,
    online: false,
  },
  {
    id: 3,
    name: "María Rodríguez",
    avatar: "MR",
    lastMessage: "Gracias por la info 🙏",
    time: "Ayer",
    unread: 0,
    online: true,
  },
  {
    id: 4,
    name: "Pedro Martínez",
    avatar: "PM",
    lastMessage: "Jaja buenísimo 😂",
    time: "Ayer",
    unread: 5,
    online: false,
  },
  {
    id: 5,
    name: "Lucía Fernández",
    avatar: "LF",
    lastMessage: "¿A qué hora es la reunión?",
    time: "Lun",
    unread: 0,
    online: false,
  },
  {
    id: 6,
    name: "Diego Sánchez",
    avatar: "DS",
    lastMessage: "Dale, confirmo asistencia",
    time: "Lun",
    unread: 0,
    online: true,
  },
  {
    id: 7,
    name: "Valentina Torres",
    avatar: "VT",
    lastMessage: "Foto enviada",
    time: "Dom",
    unread: 0,
    online: false,
  },
  {
    id: 8,
    name: "Equipo Desarrollo",
    avatar: "ED",
    lastMessage: "Roberto: Deploy listo ✅",
    time: "Dom",
    unread: 0,
    online: false,
  },
];

type Message = {
  id: number;
  text: string;
  time: string;
  fromMe: boolean;
  status: "sent" | "delivered" | "read";
};

const messagesByContact: Record<number, Message[]> = {
  1: [
    { id: 1, text: "Hola Ana! ¿Cómo estás?", time: "10:30", fromMe: true, status: "read" },
    { id: 2, text: "Hola! Todo bien, gracias 😊", time: "10:32", fromMe: false, status: "read" },
    { id: 3, text: "¿Nos juntamos mañana para revisar el proyecto?", time: "10:35", fromMe: true, status: "read" },
    { id: 4, text: "Sí, dale! ¿A las 10am te parece?", time: "10:38", fromMe: false, status: "read" },
    { id: 5, text: "Perfecto, a las 10am", time: "10:40", fromMe: true, status: "read" },
    { id: 6, text: "Perfecto, nos vemos mañana!", time: "10:42", fromMe: false, status: "read" },
  ],
  2: [
    { id: 1, text: "Carlos, ¿tienes el reporte listo?", time: "08:50", fromMe: true, status: "read" },
    { id: 2, text: "Sí, lo estoy terminando", time: "09:00", fromMe: false, status: "read" },
    { id: 3, text: "Te envié el documento", time: "09:15", fromMe: false, status: "read" },
  ],
  3: [
    { id: 1, text: "María, te comparto los datos del cliente nuevo", time: "14:20", fromMe: true, status: "read" },
    { id: 2, text: "Nombre: Tech Solutions S.A.\nContacto: Juan Pérez\nEmail: juan@techsolutions.com", time: "14:21", fromMe: true, status: "read" },
    { id: 3, text: "Gracias por la info 🙏", time: "14:25", fromMe: false, status: "read" },
  ],
  4: [
    { id: 1, text: "Pedro! ¿Viste el meme que mandé al grupo?", time: "18:00", fromMe: true, status: "read" },
    { id: 2, text: "Jaja buenísimo 😂", time: "18:05", fromMe: false, status: "read" },
  ],
  5: [
    { id: 1, text: "Hola Lucía", time: "11:00", fromMe: false, status: "read" },
    { id: 2, text: "Hola! ¿Qué tal?", time: "11:05", fromMe: true, status: "read" },
    { id: 3, text: "¿A qué hora es la reunión?", time: "11:10", fromMe: false, status: "read" },
  ],
  6: [
    { id: 1, text: "Diego, ¿vienes al evento del viernes?", time: "09:30", fromMe: true, status: "delivered" },
    { id: 2, text: "Dale, confirmo asistencia", time: "10:00", fromMe: false, status: "read" },
  ],
  7: [
    { id: 1, text: "Valentina, ¿cómo va todo?", time: "16:00", fromMe: true, status: "read" },
    { id: 2, text: "Bien! Mira esta foto del evento", time: "16:10", fromMe: false, status: "read" },
    { id: 3, text: "Foto enviada", time: "16:11", fromMe: false, status: "read" },
  ],
  8: [
    { id: 1, text: "¿Alguien puede revisar el PR #42?", time: "15:00", fromMe: true, status: "read" },
    { id: 2, text: "Yo lo reviso ahora", time: "15:10", fromMe: false, status: "read" },
    { id: 3, text: "Roberto: Deploy listo ✅", time: "15:45", fromMe: false, status: "read" },
  ],
};

function CheckIcon({ double, read }: { double: boolean; read: boolean }) {
  const color = read ? "#53bdeb" : "#8696a0";
  if (!double) {
    return (
      <svg viewBox="0 0 16 11" width="16" height="11" fill="none" className="ml-1 inline-block shrink-0">
        <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.48.48 0 0 0-.372.152.478.478 0 0 0-.12.358c.006.14.063.273.16.373l2.35 2.45a.5.5 0 0 0 .353.163.472.472 0 0 0 .373-.164l6.53-8.069a.45.45 0 0 0 .088-.351.467.467 0 0 0-.14-.276z" fill={color} />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 16 11" width="16" height="11" fill="none" className="ml-1 inline-block shrink-0">
      <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.48.48 0 0 0-.372.152.478.478 0 0 0-.12.358c.006.14.063.273.16.373l2.35 2.45a.5.5 0 0 0 .353.163.472.472 0 0 0 .373-.164l6.53-8.069a.45.45 0 0 0 .088-.351.467.467 0 0 0-.14-.276z" fill={color} />
      <path d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-1.2-1.25-.353.437 1.2 1.25a.5.5 0 0 0 .353.163.472.472 0 0 0 .373-.164l6.53-8.069a.45.45 0 0 0 .088-.351.467.467 0 0 0-.116-.278z" fill={color} />
    </svg>
  );
}

export default function Home() {
  const [selectedContact, setSelectedContact] = useState(contacts[0]);
  const [messages, setMessages] = useState(messagesByContact);
  const [inputValue, setInputValue] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const currentMessages = messages[selectedContact.id] || [];

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function handleSend() {
    const text = inputValue.trim();
    if (!text) return;

    const newMsg: Message = {
      id: Date.now(),
      text,
      time: new Date().toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" }),
      fromMe: true,
      status: "sent",
    };

    setMessages((prev) => ({
      ...prev,
      [selectedContact.id]: [...(prev[selectedContact.id] || []), newMsg],
    }));
    setInputValue("");
  }

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#111b21]">
      <div className="flex h-full w-full max-w-[1600px] overflow-hidden shadow-2xl xl:h-[96vh] xl:rounded-sm">
        {/* Sidebar */}
        <aside className="flex w-[420px] min-w-[320px] flex-col border-r border-[#222d35] bg-[#111b21]">
          {/* Sidebar Header */}
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
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-[#d1d7db] placeholder-[#8696a0] outline-none"
              />
            </div>
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto">
            {filteredContacts.map((contact) => (
              <button
                key={contact.id}
                onClick={() => setSelectedContact(contact)}
                className={`flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-[#202c33] ${
                  selectedContact.id === contact.id ? "bg-[#2a3942]" : ""
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
            ))}
          </div>
        </aside>

        {/* Chat Area */}
        <main className="flex flex-1 flex-col bg-[#0b141a]">
          {/* Chat Header */}
          <header className="flex h-[60px] items-center gap-3 bg-[#202c33] px-4">
            <div className="relative">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#6b7c85] text-sm font-medium text-white">
                {selectedContact.avatar}
              </div>
              {selectedContact.online && (
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#202c33] bg-[#00a884]" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-base font-normal text-[#e9edef]">{selectedContact.name}</h2>
              <p className="text-xs text-[#8696a0]">
                {selectedContact.online ? "en línea" : "últ. vez hoy a las " + selectedContact.time}
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

          {/* Messages */}
          <div
            className="flex flex-1 flex-col gap-1 overflow-y-auto px-[7%] py-4"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23111b21' fill-opacity='0.6'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundColor: "#0b141a",
            }}
          >
            {currentMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.fromMe ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`relative max-w-[65%] rounded-lg px-[9px] pb-2 pt-1.5 shadow-sm ${
                    msg.fromMe
                      ? "bg-[#005c4b] text-[#e9edef]"
                      : "bg-[#202c33] text-[#e9edef]"
                  }`}
                >
                  <span className="whitespace-pre-wrap text-sm leading-[19px]">{msg.text}</span>
                  <span className="float-right mt-1 ml-3 flex items-center gap-0.5 text-[11px] text-[#ffffff99]">
                    {msg.time}
                    {msg.fromMe && (
                      <CheckIcon
                        double={msg.status !== "sent"}
                        read={msg.status === "read"}
                      />
                    )}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Input Area */}
          <div className="flex items-center gap-2 bg-[#202c33] px-4 py-3">
            <button className="shrink-0 rounded-full p-2 text-[#8696a0] transition-colors hover:bg-[#2a3942]" aria-label="Emoji">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                <path d="M9.153 11.603c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zm5.603 0c.795 0 1.439-.879 1.439-1.962s-.644-1.962-1.439-1.962-1.439.879-1.439 1.962.644 1.962 1.439 1.962zM12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 18c-4.411 0-8-3.589-8-8s3.589-8 8-8 8 3.589 8 8-3.589 8-8 8zm-1.108-4.561a4.56 4.56 0 0 1-2.665-1.376.498.498 0 0 0-.706.023.5.5 0 0 0 .023.707 5.527 5.527 0 0 0 3.235 1.676c.3.037.599.056.897.056a5.54 5.54 0 0 0 3.351-1.129.5.5 0 1 0-.603-.798 4.528 4.528 0 0 1-3.532.841z" />
              </svg>
            </button>
            <button className="shrink-0 rounded-full p-2 text-[#8696a0] transition-colors hover:bg-[#2a3942]" aria-label="Attach">
              <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                <path d="M1.816 15.556v.002c0 1.502.584 2.912 1.646 3.972s2.472 1.647 3.974 1.647a5.58 5.58 0 0 0 3.972-1.645l9.547-9.548c.769-.768 1.147-1.767 1.058-2.817-.079-.968-.548-1.927-1.319-2.698-1.594-1.592-4.068-1.711-5.517-.262l-7.916 7.915c-.881.881-.792 2.25.214 3.261.501.501 1.128.801 1.765.849.104.008.207.012.311.012.639 0 1.26-.249 1.725-.714l5.612-5.612a.499.499 0 1 0-.706-.707l-5.613 5.613c-.6.6-1.586.523-2.196-.087-.609-.609-.686-1.598-.084-2.199l7.916-7.916c1.042-1.043 2.907-.936 4.104.259.587.587.952 1.326 1.014 2.057.063.748-.233 1.452-.834 2.054L7.436 19.87a4.583 4.583 0 0 1-3.262 1.351 4.582 4.582 0 0 1-3.262-1.351 4.581 4.581 0 0 1-1.352-3.261 4.581 4.581 0 0 1 1.352-3.262l8.207-8.207a.5.5 0 0 0-.707-.707l-8.207 8.207A5.573 5.573 0 0 0 1.816 15.556z" />
              </svg>
            </button>
            <div className="flex flex-1 items-center rounded-lg bg-[#2a3942] px-4 py-2.5">
              <input
                type="text"
                placeholder="Escribe un mensaje"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                className="w-full bg-transparent text-sm text-[#d1d7db] placeholder-[#8696a0] outline-none"
              />
            </div>
            {inputValue.trim() ? (
              <button
                onClick={handleSend}
                className="shrink-0 rounded-full p-2 text-[#8696a0] transition-colors hover:bg-[#2a3942]"
                aria-label="Send"
              >
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                  <path d="M1.101 21.757 23.8 12.028 1.101 2.3l.011 7.912 13.623 1.816-13.623 1.817-.011 7.912z" />
                </svg>
              </button>
            ) : (
              <button className="shrink-0 rounded-full p-2 text-[#8696a0] transition-colors hover:bg-[#2a3942]" aria-label="Voice">
                <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor">
                  <path d="M11.999 14.942c2.001 0 3.531-1.53 3.531-3.531V4.35c0-2.001-1.53-3.531-3.531-3.531S8.469 2.35 8.469 4.35v7.061c0 2.001 1.53 3.531 3.53 3.531zm6.238-3.53c0 3.531-2.942 6.002-6.237 6.002s-6.237-2.471-6.237-6.002H4.761c0 3.884 3.071 7.06 6.737 7.53v3.236h1.003v-3.236c3.666-.47 6.737-3.646 6.737-7.53h-1.001z" />
                </svg>
              </button>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
