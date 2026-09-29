"use client";

import { useEffect, useRef, useState } from "react";

type SystemStatus = "connecting" | "connected" | "unavailable";
type UploadState = "idle" | "uploading" | "success" | "error";

interface ConversationMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  citations?: { filename: string; chunk_index: number }[];
  pending?: boolean;
}

interface QueryResponse {
  answer: string;
  citations: { filename: string; chunk_index: number }[];
}

interface DatabaseHealthResponse {
  status: string;
  database: string;
  connected: boolean;
}

interface UploadResponse {
  id: string;
  filename: string;
  content_type: string;
  status: string;
  chunks: number;
}

interface DocumentSummary {
  id: string;
  filename: string;
  status: string;
  chunks: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function Home() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [queryCount, setQueryCount] = useState(0);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>(
    API_BASE_URL ? "connecting" : "unavailable",
  );
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadedDocuments, setUploadedDocuments] = useState<DocumentSummary[]>([]);
  const [uploadMessage, setUploadMessage] = useState("");
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!API_BASE_URL) return;

    const controller = new AbortController();

    async function checkSystemStatus() {
      try {
        const response = await fetch(`${API_BASE_URL}/health/database`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Backend health check failed");

        const health = (await response.json()) as DatabaseHealthResponse;
        setSystemStatus(
          health.status === "ok" && health.database === "postgresql" && health.connected
            ? "connected"
            : "unavailable",
        );
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setSystemStatus("unavailable");
        }
      }
    }

    void checkSystemStatus();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!API_BASE_URL) return;
    void fetch(`${API_BASE_URL}/documents`)
      .then((response) => (response.ok ? response.json() : []))
      .then((documents: DocumentSummary[]) => setUploadedDocuments(documents))
      .catch(() => setUploadedDocuments([]));
  }, []);

  async function uploadFile(file: File) {
    if (file.type !== "application/pdf") {
      setUploadState("error");
      setUploadMessage("Only PDF files are supported.");
      return;
    }
    if (!API_BASE_URL) {
      setUploadState("error");
      setUploadMessage("The backend URL is not configured.");
      return;
    }

    setUploadState("uploading");
    setUploadMessage("");
    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_BASE_URL}/documents/upload`, {
        method: "POST",
        body: formData,
      });
      const payload = (await response.json().catch(() => null)) as
        | UploadResponse
        | { detail?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && "detail" in payload && payload.detail
            ? payload.detail
            : "The document could not be uploaded.",
        );
      }

      const document = payload as UploadResponse;
      setUploadedDocuments((current) => [
        document,
        ...current.filter((item) => item.filename !== document.filename),
      ]);
      setUploadState("success");
      setUploadMessage("Document uploaded successfully.");
    } catch (error) {
      setUploadState("error");
      setUploadMessage(error instanceof Error ? error.message : "Upload failed.");
    }
  }

  function selectFile(file: File | undefined) {
    if (file) void uploadFile(file);
  }

  async function submitQuestion() {
    const content = question.trim();
    if (!content || !API_BASE_URL || isQuerying) return;
    setIsQuerying(true);
    setQueryCount((count) => count + 1);

    const userId = crypto.randomUUID();
    const assistantId = crypto.randomUUID();
    setMessages((current) => [
      ...current,
      { id: userId, role: "user", content },
      {
        id: assistantId,
        role: "assistant",
        content: "Retrieving relevant knowledge…",
        pending: true,
      },
    ]);
    setQuestion("");

    try {
      const response = await fetch(`${API_BASE_URL}/query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: content }),
      });
      const payload = (await response.json().catch(() => null)) as QueryResponse | { detail?: string } | null;
      if (!response.ok) throw new Error(payload && "detail" in payload ? payload.detail : "The query failed.");
      const result = payload as QueryResponse;
      setMessages((current) => current.map((message) => message.id === assistantId
        ? { ...message, content: result.answer, citations: result.citations, pending: false }
        : message));
    } catch (error) {
      setMessages((current) => current.map((message) => message.id === assistantId
        ? { ...message, content: error instanceof Error ? error.message : "The query failed.", pending: false }
        : message));
    } finally {
      setIsQuerying(false);
    }
  }

  const statusLabel =
    systemStatus === "connecting"
      ? "Connecting"
      : systemStatus === "connected"
        ? "System online"
        : "System unavailable";
  const isConnected = systemStatus === "connected";

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 lg:px-10">
        <header className="flex items-center justify-between border-b border-white/10 pb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">Production RAG</p>
            <h1 className="mt-1 text-lg font-medium">Knowledge Engine</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span className={`h-2 w-2 rounded-full ${isConnected ? "bg-white" : "bg-white/20"}`} />
            {statusLabel}
          </div>
        </header>

        <section className="grid flex-1 gap-6 py-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-xl border border-white/10 p-5">
            <div className="mb-8">
              <p className="text-xs uppercase tracking-[0.15em] text-white/40">Knowledge Base</p>
              <h2 className="mt-2 text-xl font-medium">Documents</h2>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              className="hidden"
              onChange={(event) => {
                selectFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              disabled={uploadState === "uploading"}
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(event) => {
                event.preventDefault();
                setIsDragging(false);
                selectFile(event.dataTransfer.files[0]);
              }}
              className={`group relative w-full overflow-hidden rounded-xl border border-dashed px-4 py-10 text-center transition duration-300 ${
                isDragging
                  ? "border-white/70 bg-white/[0.08]"
                  : "border-white/20 hover:border-white/50 hover:bg-white/[0.04]"
              } disabled:cursor-wait disabled:opacity-60`}
            >
              <span className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-white transition duration-300 group-hover:scale-105 group-hover:border-white/35">
                <span className={`absolute inset-2 rounded-xl border border-white/20 ${uploadState === "uploading" ? "workspace-spin" : "workspace-pulse"}`} />
                {uploadState === "uploading" ? (
                  <svg className="relative h-7 w-7 animate-bounce" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 16V4m0 0L7 9m5-5 5 5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : (
                  <svg className="relative h-7 w-7 transition-transform duration-300 group-hover:-translate-y-1" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 16V4m0 0L7 9m5-5 5 5M5 15v3a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              <span className="mt-4 block text-sm text-white/70">
                {uploadState === "uploading" ? "Uploading document" : "Upload PDF document"}
              </span>
              <span className="mt-1 block text-xs text-white/30">Drop a file here or browse</span>
            </button>

            {uploadMessage && (
              <p className={`mt-3 text-xs ${uploadState === "error" ? "text-red-300" : "text-white/50"}`}>
                {uploadMessage}
              </p>
            )}

            <div className="mt-6 border-t border-white/10 pt-5">
              {uploadedDocuments.length > 0 ? (
                <div className="space-y-4 text-sm">
                  {uploadedDocuments.map((document) => (
                    <div key={document.id}>
                      <p className="truncate text-white/80">{document.filename}</p>
                      <p className="mt-1 text-xs text-white/40">{document.status}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-white/30">No documents indexed yet.</p>
              )}
            </div>
          </aside>

          <div className="flex min-h-[650px] flex-col rounded-xl border border-white/10">
            <div className="border-b border-white/10 p-6">
              <p className="text-xs uppercase tracking-[0.15em] text-white/40">Retrieval</p>
              <h2 className="mt-2 text-2xl font-medium">Ask your knowledge base</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-white/40">
                Search indexed documents and generate grounded answers with source citations.
              </p>
            </div>

            <div className="flex flex-1 flex-col overflow-y-auto p-6">
              {messages.length > 0 ? (
                <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 py-4">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex animate-[workspace-message-in_400ms_ease-out] ${
                        message.role === "user" ? "justify-end" : "justify-start"
                      }`}
                    >
                      <div
                        className={`max-w-[85%] rounded-2xl border px-4 py-3 text-sm leading-6 transition ${
                          message.role === "user"
                            ? "border-white/15 bg-white text-black"
                            : "border-white/10 bg-white/[0.03] text-white/50"
                        }`}
                      >
                        <span className={message.pending ? "animate-pulse" : undefined}>{message.content}</span>
                        {message.citations && message.citations.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2 border-t border-white/10 pt-3">
                            {message.citations.map((citation, citationIndex) => (
                              <span key={`${citation.filename}-${citation.chunk_index}-${citationIndex}`} className="rounded-full border border-white/10 px-2 py-1 text-xs text-white/40">
                                {citation.filename} · chunk {citation.chunk_index}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="m-auto max-w-md text-center">
                <div className="relative mx-auto flex h-24 w-24 items-center justify-center">
                  <span className="workspace-pulse absolute inset-0 rounded-full border border-white/10" />
                  <span className="workspace-spin absolute inset-3 rounded-full border border-dashed border-white/20" />
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-white/[0.04] text-white/80 shadow-[0_0_35px_rgba(255,255,255,0.06)]">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M8.5 10.5h7m-7 3h4M20 11.5a7.5 7.5 0 0 1-11.73 6.21L4 19l1.29-4.27A7.5 7.5 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="m17.5 4.5.4 1.1 1.1.4-1.1.4-.4 1.1-.4-1.1-1.1-.4 1.1-.4.4-1.1Z" fill="currentColor" />
                    </svg>
                  </span>
                </div>
                <h3 className="mt-5 text-base font-medium">Ready for local retrieval</h3>
                <p className="mt-2 text-sm leading-6 text-white/40">
                  Ask a question about your indexed documents. Answers are generated locally with Ollama.
                </p>
                </div>
              )}
            </div>

            <div className="border-t border-white/10 p-4">
              <div className="flex items-end gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-2 transition-colors focus-within:border-white/25">
                <textarea
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submitQuestion();
                    }
                  }}
                  placeholder="Ask something about your documents..."
                  rows={1}
                  className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm text-white outline-none placeholder:text-white/25"
                />
                <button
                  type="button"
                  disabled={!question.trim() || isQuerying}
                  onClick={submitQuestion}
                  className="h-12 rounded-lg bg-white px-5 text-sm font-medium text-black transition hover:bg-white/80 disabled:cursor-not-allowed disabled:bg-white/20 disabled:text-white/40"
                >
                  Ask
                </button>
              </div>
              <p className="mt-2 text-right text-xs text-white/30">Answers are generated locally from your indexed documents.</p>
            </div>
          </div>
        </section>

        <footer className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-white/10 bg-white/10 md:grid-cols-4">
          {[
            ["Documents", String(uploadedDocuments.length)],
            ["Chunks", String(uploadedDocuments.reduce((total, document) => total + document.chunks, 0))],
            ["Queries", String(queryCount)],
            ["Database", systemStatus === "connecting" ? "Connecting" : isConnected ? "Connected" : "Unavailable"],
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
