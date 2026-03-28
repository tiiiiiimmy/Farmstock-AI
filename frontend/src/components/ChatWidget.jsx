import { useEffect, useRef, useState, useTransition } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "../api/client";

const STORAGE_KEY = "farmstock_chat_thread";
const DEFAULT_THREAD = [
  { role: "assistant", content: "Ask about stock levels, reorder timing, or spending patterns." }
];

function loadThread() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : DEFAULT_THREAD;
  } catch {
    return DEFAULT_THREAD;
  }
}

export default function ChatWidget() {
  const [message, setMessage] = useState("");
  const [thread, setThread] = useState(loadThread);
  const [isPending, startTransition] = useTransition();
  const threadRef = useRef(null);

  // Persist thread to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(thread));
  }, [thread]);

  // Auto-scroll to latest message
  useEffect(() => {
    if (!threadRef.current) return;
    threadRef.current.scrollTop = threadRef.current.scrollHeight;
  }, [thread]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!message.trim()) {
      return;
    }

    const nextMessage = { role: "user", content: message.trim() };
    const nextThread = [...thread, nextMessage];
    setThread(nextThread);
    setMessage("");

    startTransition(async () => {
      const response = await api.sendChat({
        message: nextMessage.content,
        conversation_history: nextThread
      });

      setThread((current) => [
        ...current,
        { role: "assistant", content: response.response }
      ]);
    });
  }

  return (
    <section className="panel chat-panel">
      <div className="panel-header">
        <h3>Ask FarmStock AI</h3>
        {thread.length > 1 && (
          <button
            type="button"
            className="secondary-button"
            style={{ fontSize: "0.78rem", padding: "0.35rem 0.75rem" }}
            onClick={() => setThread(DEFAULT_THREAD)}
          >
            Clear
          </button>
        )}
      </div>

      <div ref={threadRef} className="chat-thread">
        {thread.map((entry, index) => (
          <div
            key={`${entry.role}-${index}`}
            className={entry.role === "assistant" ? "bubble bubble-ai" : "bubble bubble-user"}
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
      </div>

      <form className="chat-form" onSubmit={handleSubmit}>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="How much did I spend on feed this summer?"
          rows={3}
        />
        <button type="submit" disabled={isPending}>
          {isPending ? "Thinking..." : "Send"}
        </button>
      </form>
    </section>
  );
}
