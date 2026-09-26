"use client";

import { useEffect, useState } from "react";

type SystemStatus = "checking" | "online" | "offline";

interface DatabaseHealthResponse {
  status: string;
  database: string;
  connected: boolean;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Main dashboard page for interacting with the RAG system.
export default function Home() {
  // Store the user's current question.
  const [question, setQuestion] = useState("");
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(
    API_BASE_URL ? "checking" : "offline",
  );

  useEffect(() => {
    if (!API_BASE_URL) {
      return;
    }

    const controller = new AbortController();

    async function checkSystemStatus() {
      try {
        const response = await fetch(`${API_BASE_URL}/health/database`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Backend health check failed");
        }

        const health = (await response.json()) as DatabaseHealthResponse;
        const isOnline =
          health.status === "ok" &&
          health.database === "postgresql" &&
          health.connected;
        setSystemStatus(isOnline ? "online" : "offline");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSystemStatus("offline");
        }
      }
    }

    void checkSystemStatus();

    return () => controller.abort();
  }, []);

  const isOnline = systemStatus === "online";
  const statusLabel =
    systemStatus === "checking"
      ? "Checking system"
      : isOnline
        ? "System online"
        : "System offline";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 lg:px-10">
        {/* Top navigation */}
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              Production RAG
            </p>

            <h1 className="mt-1 text-lg font-medium">
              Knowledge Engine
            </h1>
          </div>

          {/* Backend status */}
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span
              className={`h-2 w-2 rounded-full ${isOnline ? "bg-white" : "bg-white/20"}`}
            />
            {statusLabel}
          </div>
        </header>

        {/* Main dashboard content */}
        <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[280px_1fr]">
          {/* Knowledge base panel */}
          <aside className="rounded-xl border border-white/10 p-5">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.15em] text-white/40">
                Knowledge Base
              </p>

              <h2 className="mt-2 text-xl font-medium">
                Documents
              </h2>
            </div>

            {/* Upload area */}
            <button className="w-full rounded-lg border border-dashed border-white/20 px-4 py-8 text-center transition hover:border-white/50">
              <span className="block text-2xl">+</span>
              <span className="mt-2 block text-sm text-white/60">
                Upload document
              </span>
            </button>

            {/* Empty document state */}
            <div className="mt-6 border-t border-white/10 pt-5">
              <p className="text-sm text-white/30">
                No documents indexed yet.
              </p>
            </div>
          </aside>

          {/* RAG query workspace */}
          <div className="flex min-h-[650px] flex-col rounded-xl border border-white/10">
            {/* Workspace heading */}
            <div className="border-b border-white/10 p-6">
              <p className="text-xs uppercase tracking-[0.15em] text-white/40">
                Retrieval
              </p>

              <h2 className="mt-2 text-2xl font-medium">
                Ask your knowledge base
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-6 text-white/40">
                Search indexed documents and generate grounded answers with
                source citations.
              </p>
            </div>

            {/* Empty conversation */}
            <div className="flex flex-1 items-center justify-center p-8">
              <div className="max-w-md text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10">
                  <span className="text-lg">⌕</span>
                </div>

                <h3 className="mt-5 text-base font-medium">
                  Ready for a question
                </h3>

                <p className="mt-2 text-sm leading-6 text-white/40">
                  Upload documents, then ask a question. Relevant chunks and
                  citations will appear here.
                </p>
              </div>
            </div>

            {/* Query input */}
            <div className="border-t border-white/10 p-4">
              <div className="flex items-end gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2">
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  placeholder="Ask something about your documents..."
                  rows={1}
                  className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-white/25"
                />

                <button
                  type="button"
                  className="h-12 rounded-lg bg-white px-5 text-sm font-medium text-black transition hover:bg-white/80"
                >
                  Ask
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* System metrics */}
        <footer className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-4">
          {[
            ["Documents", "0"],
            ["Chunks", "0"],
            ["Queries", "0"],
            [
              "Database",
              systemStatus === "checking"
                ? "Checking"
                : isOnline
                  ? "Connected"
                  : "Unavailable",
            ],
          ].map(([label, value]) => (
            <div key={label} className="bg-black p-5">
              <p className="text-xs text-white/40">{label}</p>
              <p className="mt-2 text-lg font-medium">{value}</p>
            </div>
          ))}
        </footer>
      </div>
    </main>
  );
}
