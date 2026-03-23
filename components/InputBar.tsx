type InputBarProps = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  disabled?: boolean;
};

export default function InputBar({ value, onChange, onSend, disabled }: InputBarProps) {
  return (
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
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          className="w-full bg-transparent text-sm text-[#d1d7db] placeholder-[#8696a0] outline-none disabled:opacity-50"
        />
      </div>
      {value.trim() ? (
        <button
          onClick={onSend}
          disabled={disabled}
          className="shrink-0 rounded-full p-2 text-[#8696a0] transition-colors hover:bg-[#2a3942] disabled:opacity-50"
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
  );
}
