import { useEffect, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../api/client";

const STORAGE_KEY = "farmstock_chat_thread";
const DEFAULT_THREAD = [
  { role: "assistant", content: "Hi! Ask me about stock levels, reorder timing, spending patterns, or anything about your farm." }
];

function loadThread() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_THREAD;
  } catch {
    return DEFAULT_THREAD;
  }
}

const ChatIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SendIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [thread, setThread] = useState(loadThread);
  const [isPending, startTransition] = useTransition();
  const threadRef = useRef(null);
  const textareaRef = useRef(null);

  // Persist thread
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(thread));
  }, [thread]);

  // Auto-scroll
  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [thread, open]);

  // Focus textarea when popup opens
  useEffect(() => {
    if (open && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!message.trim() || isPending) return;

    const userMsg = { role: "user", content: message.trim() };
    const nextThread = [...thread, userMsg];
    setThread(nextThread);
    setMessage("");

    startTransition(async () => {
      try {
        const res = await api.sendChat({
          message: userMsg.content,
          conversation_history: nextThread,
        });
        setThread((cur) => [...cur, { role: "assistant", content: res.response }]);
      } catch {
        setThread((cur) => [
          ...cur,
          { role: "assistant", content: "Sorry, I couldn't reach the server. Please try again." },
        ]);
      }
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const unread = !open && thread.length > 1 &&
    thread[thread.length - 1].role === "assistant";

  return (
    <>
      {/* ── Popup panel ── */}
      {open && (
        <div className="fchat-panel" role="dialog" aria-label="FarmStock AI chat">
          <div className="fchat-header">
            <div className="fchat-header-info">
              <div className="fchat-avatar">AI</div>
              <div>
                <p className="fchat-title">FarmStock AI</p>
                <p className="fchat-status">
                  {isPending ? "Thinking…" : "Online"}
                </p>
              </div>
            </div>
            <div className="fchat-header-actions">
              {thread.length > 1 && (
                <button
                  type="button"
                  className="fchat-clear-btn"
                  onClick={() => setThread(DEFAULT_THREAD)}
                  title="Clear chat"
                >
                  Clear
                </button>
              )}
              <button
                type="button"
                className="fchat-close-btn"
                onClick={() => setOpen(false)}
                aria-label="Close chat"
              >
                <CloseIcon />
              </button>
            </div>
          </div>

          <div className="fchat-thread" ref={threadRef}>
            {thread.map((entry, i) => (
              <div
                key={i}
                className={entry.role === "assistant" ? "fchat-bubble fchat-bubble-ai" : "fchat-bubble fchat-bubble-user"}
              >
                {entry.role === "assistant" ? (
                  <div className="markdown-body">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {entry.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  entry.content
                )}
              </div>
            ))}
            {isPending && (
              <div className="fchat-bubble fchat-bubble-ai fchat-typing">
                <span /><span /><span />
              </div>
            )}
          </div>

          <form className="fchat-form" onSubmit={handleSubmit}>
            <textarea
              ref={textareaRef}
              className="fchat-textarea"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about stock, orders, spending…"
              rows={2}
              disabled={isPending}
            />
            <button
              type="submit"
              className="fchat-send-btn"
              disabled={isPending || !message.trim()}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </form>
        </div>
      )}

      {/* ── FAB ── */}
      <button
        className={`fchat-fab ${open ? "fchat-fab-open" : ""}`}
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Open AI chat"}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
        {unread && <span className="fchat-badge" />}
      </button>
    </>
  );
}
