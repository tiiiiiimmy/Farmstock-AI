import { useState, useTransition } from "react";
import { api, DEFAULT_FARM_ID } from "../api/client";

export default function ChatWidget() {
  const [message, setMessage] = useState("");
  const [thread, setThread] = useState([
    {
      role: "assistant",
      content: "Ask about stock levels, reorder timing, or spending patterns."
    }
  ]);
  const [isPending, startTransition] = useTransition();

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
        farm_id: DEFAULT_FARM_ID,
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
    <section className="panel">
      <div className="panel-header">
        <h3>Ask FarmStock AI</h3>
      </div>

      <div className="chat-thread">
        {thread.map((entry, index) => (
          <div
            key={`${entry.role}-${index}`}
            className={entry.role === "assistant" ? "bubble bubble-ai" : "bubble bubble-user"}
          >
            {entry.content}
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
