"use client";

import React, { useState, useRef } from "react";
import axios from "axios";

type Message = { id: number; role: "user" | "agent"; text: string };

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [interrupt, setInterrupt] = useState<any | null>(null);
  const [lastUserText, setLastUserText] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const AGENT_URL =
    process.env.NEXT_PUBLIC_AGENT_URL ?? "http://localhost:4000/email-agent";

  async function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed) return;
    const userMsg: Message = { id: Date.now(), role: "user", text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setText("");
    setLoading(true);

    try {
      // Try POST JSON first
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

      const response = await res.json();

      // If the agent returned an interrupt, save it and show pending message
      if (response?.status === "requires_action") {
        console.log("Interrupt response:", response.status, response.args);
        setInterrupt(response.args);
        setLastUserText(userMsg.text);
        const preview = renderInterruptPreview(response.args);

        const pending: Message = {
          id: Date.now() + 1,
          role: "agent",
          text: preview,
        };
        setMessages((m) => [...m, pending]);
      } else {
        const textReply =
          response?.output?.text ||
          response?.messages?.at(-1)?.content ||
          JSON.stringify(response);
        const agentMsg: Message = {
          id: Date.now() + 1,
          role: "agent",
          text: textReply,
        };
        setMessages((m) => [...m, agentMsg]);
      }
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
  function renderInterruptPreview(interruptObj: any) {
    // Try common shapes: tool input, draft content, messages, or fallback to pretty JSON
    try {
      if (!interruptObj) return "[Pending human approval]";

      // Common fields: tool, tool_input, input, content, draft
      const toolName =
        interruptObj.tool ||
        interruptObj.toolName ||
        interruptObj.tool_call?.name;
      const input =
        interruptObj.input ||
        interruptObj.tool_input ||
        interruptObj.tool_call?.input ||
        interruptObj.payload;
      const draft =
        interruptObj.draft ||
        interruptObj.body ||
        (input && (typeof input === "string" ? input : JSON.stringify(input)));
      const subject =
        interruptObj.subject ||
        interruptObj.title ||
        (interruptObj.input?.subject ?? undefined);

      let parts: string[] = [];
      if (toolName) parts.push(`Tool: ${toolName}`);
      if (subject) parts.push(`Subject: ${subject}`);
      if (draft)
        parts.push(
          `Body:\n${
            typeof draft === "string" ? draft : JSON.stringify(draft, null, 2)
          }`
        );

      if (parts.length > 0) return parts.join("\n\n");

      // Try messages array
      if (interruptObj.messages)
        return JSON.stringify(interruptObj.messages, null, 2);
      return JSON.stringify(interruptObj, null, 2);
    } catch (e) {
      return "[Pending human approval]";
    }
  }

  async function sendDecision(decision: "approve" | "reject") {
    if (!lastUserText) return;
    setLoading(true);
    try {
      const res = await fetch(`${AGENT_URL}/resume`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: lastUserText, decision }),
      });
      const json = await res.json();
      const textReply =
        json?.output?.text ||
        json?.messages?.at(-1)?.content ||
        JSON.stringify(json);
      const agentMsg: Message = {
        id: Date.now() + 3,
        role: "agent",
        text: textReply,
      };
      setMessages((m) => [...m, agentMsg]);
      setInterrupt(null);
      setLastUserText(null);
    } catch (err: any) {
      const errMsg: Message = {
        id: Date.now() + 4,
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
            {interrupt ? (
              <div className="mt-3">
                <div className="mb-2 rounded border bg-gray-50 p-3 text-sm whitespace-pre-wrap text-black dark:bg-neutral-800 dark:text-white">
                  {renderInterruptPreview(interrupt)}
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded bg-green-600 px-4 py-2 text-white"
                    onClick={() => sendDecision("approve")}
                    disabled={loading}
                  >
                    Approve
                  </button>
                  <button
                    className="rounded bg-red-600 px-4 py-2 text-white"
                    onClick={() => sendDecision("reject")}
                    disabled={loading}
                  >
                    Reject
                  </button>
                </div>
              </div>
            ) : (
              messages.map(
                (m) => (
                  console.log(m.text),
                  (
                    <div
                      key={m.id}
                      className={`max-w-[85%] ${
                        m.role === "user"
                          ? "ml-auto bg-blue-600 text-white"
                          : "mr-auto bg-gray-200 text-black"
                      } rounded-md px-4 py-2`}
                    >
                      <div className="text-sm whitespace-pre-wrap">
                        {m.text}
                      </div>
                    </div>
                  )
                )
              )
            )}
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
