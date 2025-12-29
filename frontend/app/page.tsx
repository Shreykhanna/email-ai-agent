"use client";

import React, { useState, useRef } from "react";

type Message = { id: number; role: "user" | "agent"; text: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const AGENT_URL =
    process.env.NEXT_PUBLIC_AGENT_URL ??
    "http://localhost:4000/summarise-email";

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Message = { id: Date.now(), role: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setText("");
    setLoading(true);
    console.log("AGENT_URL, ", AGENT_URL);
    try {
      // Try POST JSON first, fallback to GET query if not allowed
      let res = await fetch(AGENT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMsg.text }),
      });

      if (!res.ok) {
        res = await fetch(
          `${AGENT_URL}?message=${encodeURIComponent(userMsg.text)}`
        );
      }

      const reply = await res.text();
      const agentMsg: Message = {
        id: Date.now() + 1,
        role: "agent",
        text: reply,
      };
      setMessages((m) => [...m, agentMsg]);
    } catch (err: any) {
      const errMsg: Message = {
        id: Date.now() + 2,
        role: "agent",
        text: `Error: ${err?.message ?? String(err)}`,
      };
      setMessages((m) => [...m, errMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") sendMessage();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black p-6">
      <main className="w-full max-w-2xl rounded-md bg-white p-6 shadow-md dark:bg-neutral-900">
        <h1 className="text-2xl font-semibold mb-4 text-black dark:text-white">
          Email Agent — Chat
        </h1>

        <div className="mb-4 h-[60vh] overflow-auto rounded border border-gray-200 p-4 bg-gray-50 dark:bg-neutral-800">
          {messages.length === 0 && (
            <p className="text-sm text-gray-500">
              No messages yet. Send a message to start.
            </p>
          )}
          <div className="flex flex-col gap-3">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`max-w-[85%] ${
                  m.role === "user"
                    ? "ml-auto bg-blue-600 text-white"
                    : "mr-auto bg-gray-200 text-black"
                } rounded-md px-4 py-2`}
              >
                <div className="text-sm whitespace-pre-wrap">{m.text}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <input
            ref={inputRef}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-black dark:bg-neutral-800 dark:text-white"
            placeholder="Type a message for the agent..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKey}
            disabled={loading}
          />
          <button
            className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-60"
            onClick={sendMessage}
            disabled={loading}
          >
            {loading ? "Sending..." : "Send"}
          </button>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Agent endpoint: <span className="font-mono">{AGENT_URL}</span>
        </p>
      </main>
    </div>
  );
}
