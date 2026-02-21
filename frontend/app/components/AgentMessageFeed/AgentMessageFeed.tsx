"use client";

import { useState } from "react";
import { fetchAccount } from "@/app/util/fetchAccount";
import { useSession } from "next-auth/react";

type AgentMessageFeedProps = {
  title?: string;
  subtitle?: string;
  messages: string[];
  loading?: boolean;
  error?: string | null;
};

export const AgentMessageFeed = ({
  title = "Agent Messages",
  subtitle = "Your assistant summaries and updates appear here.",
  messages,
  loading,
  error,
}: AgentMessageFeedProps) => {
  const [userMessage, setUserMessage] = useState("");
  const [observation, setObservation] = useState<any>([]);
  const { data: session } = useSession();

  const handleUserMessage = async (userMessage: string) => {
    const account = await fetchAccount(session?.user.id);
    const response = await fetch("/api/user-message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        accessToken: account?.accessToken,
        expiresAt: account?.expiresAt,
        refreshToken: account?.refreshToken,
        scope: account?.scope,
        tokenType: account?.tokenType,
        message: userMessage,
      }),
    });
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const observation = await response.json();
    console.log("Observation", observation);
    setObservation([observation.data]);
  };
  return (
    <section className="h-full w-full rounded-[2rem] border border-white/40 bg-gradient-to-b from-white/95 via-white/90 to-slate-50/95 shadow-[0_30px_80px_rgba(18,20,45,0.18)] px-6 py-6 flex flex-col">
      <header className="flex items-start justify-between gap-6 border-b border-slate-200/60 pb-5">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate-500">
            Email Assistant
          </p>
          <h2 className="text-2xl font-semibold text-slate-900">{title}</h2>
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
            Live
          </span>
          <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-xs text-slate-600">
            Secure inbox view
          </span>
        </div>
      </header>

      <div className="mt-6 flex-1 overflow-y-auto pr-2">
        {loading && (
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-5 text-sm text-slate-600">
            Fetching the latest message summary…
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 p-6 text-sm text-slate-500">
            No summaries yet. Connect an account and request an update to see
            the latest messages.
          </div>
        )}

        <div className="mt-4 grid gap-4">
          {observation.map((message: string, id: number) => (
            <article
              key={id}
              className="rounded-2xl border border-slate-200/70 bg-white/90 p-5 shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-500">
                  Summary
                </p>
                {/* {message.timestamp && (
                  <span className="text-xs text-slate-400">
                    {message.timestamp}
                  </span>
                )} */}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                {message}
              </p>
              {/* {message.meta && (
                <p className="mt-4 text-xs text-slate-400">{message.meta}</p>
              )} */}
            </article>
          ))}
        </div>
      </div>

      <div className="mt-6 border-t border-slate-200/60 pt-4">
        <div className="relative rounded-2xl bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-500 p-[1.5px]">
          <div className="pointer-events-none absolute inset-0 rounded-2xl shadow-[0_0_24px_rgba(56,189,248,0.35)] animate-pulse" />
          <div className="relative flex items-center gap-3 rounded-2xl bg-white/95 px-4 py-3">
            <input
              value={userMessage}
              onChange={(event) => setUserMessage(event.target.value)}
              placeholder="Write a message to your assistant..."
              className="w-full bg-transparent text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none"
              type="text"
            />
            <button
              type="button"
              onClick={() => handleUserMessage(userMessage)}
              className="rounded-full bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-800"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
