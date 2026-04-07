"use client";

import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/empty-state";
import { InlineToast, InlineToastLabel } from "@/components/ui/inline-toast";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type AppRole = "HOMEOWNER" | "AGENT" | "ADMIN";
type ThreadStatus = "LOCKED" | "OPEN";

type ThreadSummary = {
  id: string;
  instructionId: string;
  status: ThreadStatus;
  instructionStatus: string;
  property: {
    addressLine1: string;
    city: string;
    postcode: string;
  };
  counterpart: {
    id: string;
    role: "HOMEOWNER" | "AGENT";
    name: string;
  };
  lastMessage: {
    id: string;
    senderId: string;
    body: string;
    createdAt: string;
  } | null;
  createdAt: string;
};

type ThreadDetail = {
  id: string;
  instructionId: string;
  status: ThreadStatus;
  messages: Array<{
    id: string;
    senderId: string;
    body: string;
    createdAt: string;
  }>;
};

type ApiFeedback = {
  kind: "error" | "success";
  title: string;
  message: string;
};

const londonDateTimeFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London"
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function normalizeThreadStatus(status: unknown): ThreadStatus {
  return status === "OPEN" ? "OPEN" : "LOCKED";
}

function formatInstructionStatus(value: string): string {
  if (value === "SHORTLIST") return "Shortlist";
  if (value === "AWARDED") return "Awarded";
  if (value === "CLOSED") return "Closed";
  if (value === "LIVE") return "Live";
  if (value === "DRAFT") return "Draft";

  return value;
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!isRecord(payload)) {
    return fallback;
  }

  if (isRecord(payload.error) && typeof payload.error.message === "string") {
    return payload.error.message;
  }

  if (typeof payload.message === "string") {
    return payload.message;
  }

  return fallback;
}

function parseThreadList(payload: unknown): {
  actorId: string | null;
  threads: ThreadSummary[];
} {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    return { actorId: null, threads: [] };
  }

  const actorId =
    isRecord(payload.data.actor) && typeof payload.data.actor.id === "string"
      ? payload.data.actor.id
      : null;

  const rawThreads = payload.data.threads;

  if (!Array.isArray(rawThreads)) {
    return { actorId, threads: [] };
  }

  const threads: ThreadSummary[] = [];

  for (const item of rawThreads) {
    if (!isRecord(item)) {
      continue;
    }

    if (
      typeof item.id !== "string" ||
      typeof item.instructionId !== "string" ||
      !isRecord(item.property) ||
      !isRecord(item.counterpart)
    ) {
      continue;
    }

    const thread: ThreadSummary = {
      id: item.id,
      instructionId: item.instructionId,
      status: normalizeThreadStatus(item.status),
      instructionStatus:
        typeof item.instructionStatus === "string"
          ? item.instructionStatus
          : "DRAFT",
      property: {
        addressLine1:
          typeof item.property.addressLine1 === "string"
            ? item.property.addressLine1
            : "",
        city: typeof item.property.city === "string" ? item.property.city : "",
        postcode:
          typeof item.property.postcode === "string" ? item.property.postcode : ""
      },
      counterpart: {
        id:
          typeof item.counterpart.id === "string" ? item.counterpart.id : "unknown",
        role:
          item.counterpart.role === "HOMEOWNER" ? "HOMEOWNER" : "AGENT",
        name:
          typeof item.counterpart.name === "string" && item.counterpart.name.trim()
            ? item.counterpart.name
            : "Unknown"
      },
      lastMessage: null,
      createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
    };

    if (isRecord(item.lastMessage)) {
      const body =
        typeof item.lastMessage.body === "string" ? item.lastMessage.body : "";
      const senderId =
        typeof item.lastMessage.senderId === "string"
          ? item.lastMessage.senderId
          : "";

      if (typeof item.lastMessage.id === "string") {
        thread.lastMessage = {
          id: item.lastMessage.id,
          senderId,
          body,
          createdAt:
            typeof item.lastMessage.createdAt === "string"
              ? item.lastMessage.createdAt
              : new Date().toISOString()
        };
      }
    }

    threads.push(thread);
  }

  return { actorId, threads };
}

function parseThreadDetail(payload: unknown): {
  actorId: string | null;
  thread: ThreadDetail | null;
} {
  if (!isRecord(payload) || !isRecord(payload.data)) {
    return { actorId: null, thread: null };
  }

  const actorId =
    isRecord(payload.data.actor) && typeof payload.data.actor.id === "string"
      ? payload.data.actor.id
      : null;
  const rawThread = payload.data.thread;

  if (!isRecord(rawThread) || typeof rawThread.id !== "string") {
    return { actorId, thread: null };
  }

  const messages = Array.isArray(rawThread.messages)
    ? rawThread.messages
        .map((message): ThreadDetail["messages"][number] | null => {
          if (!isRecord(message) || typeof message.id !== "string") {
            return null;
          }

          return {
            id: message.id,
            senderId:
              typeof message.senderId === "string" ? message.senderId : "",
            body: typeof message.body === "string" ? message.body : "",
            createdAt:
              typeof message.createdAt === "string"
                ? message.createdAt
                : new Date().toISOString()
          };
        })
        .filter((message): message is ThreadDetail["messages"][number] => message !== null)
    : [];

  return {
    actorId,
    thread: {
      id: rawThread.id,
      instructionId:
        typeof rawThread.instructionId === "string"
          ? rawThread.instructionId
          : "",
      status: normalizeThreadStatus(rawThread.status),
      messages
    }
  };
}

function parseCreatedMessage(payload: unknown): ThreadDetail["messages"][number] | null {
  if (!isRecord(payload) || !isRecord(payload.data) || !isRecord(payload.data.message)) {
    return null;
  }

  const message = payload.data.message;

  if (typeof message.id !== "string") {
    return null;
  }

  return {
    id: message.id,
    senderId: typeof message.senderId === "string" ? message.senderId : "",
    body: typeof message.body === "string" ? message.body : "",
    createdAt:
      typeof message.createdAt === "string"
        ? message.createdAt
        : new Date().toISOString()
  };
}

function threadStatusVariant(status: ThreadStatus): "success" | "warning" {
  return status === "OPEN" ? "success" : "warning";
}

function instructionPathForRole(role: AppRole, instructionId: string): string {
  if (role === "HOMEOWNER") {
    return `/homeowner/instructions/${instructionId}/compare`;
  }

  return `/agent/marketplace/${instructionId}`;
}

interface MessagesClientProps {
  role: AppRole;
  initialThreadId: string | null;
  initialInstructionId: string | null;
}

export function MessagesClient({
  role,
  initialThreadId,
  initialInstructionId
}: MessagesClientProps): JSX.Element {
  const [actorId, setActorId] = useState<string | null>(null);
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    initialThreadId
  );
  const [activeThread, setActiveThread] = useState<ThreadDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [sendPending, setSendPending] = useState(false);
  const [feedback, setFeedback] = useState<ApiFeedback | null>(null);

  const selectedThreadSummary = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? null,
    [selectedThreadId, threads]
  );

  const openThreadsCount = useMemo(
    () => threads.filter((thread) => thread.status === "OPEN").length,
    [threads]
  );

  useEffect(() => {
    async function loadThreads(): Promise<void> {
      setThreadsLoading(true);
      setThreadsError(null);

      const query = initialInstructionId
        ? `?instructionId=${encodeURIComponent(initialInstructionId)}`
        : "";

      try {
        const response = await fetch(`/api/messages/threads${query}`, {
          method: "GET",
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        });

        const payload = (await response.json()) as unknown;

        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload, "Could not load message threads.")
          );
        }

        const parsed = parseThreadList(payload);
        setActorId(parsed.actorId);
        setThreads(parsed.threads);

        setSelectedThreadId((current) => {
          if (current && parsed.threads.some((thread) => thread.id === current)) {
            return current;
          }

          if (
            initialThreadId &&
            parsed.threads.some((thread) => thread.id === initialThreadId)
          ) {
            return initialThreadId;
          }

          const firstOpen = parsed.threads.find((thread) => thread.status === "OPEN");
          return firstOpen?.id ?? parsed.threads[0]?.id ?? null;
        });
      } catch (error) {
        setThreads([]);
        setSelectedThreadId(null);
        setThreadsError(
          error instanceof Error ? error.message : "Could not load message threads."
        );
      } finally {
        setThreadsLoading(false);
      }
    }

    void loadThreads();
  }, [initialInstructionId, initialThreadId]);

  useEffect(() => {
    async function loadThread(threadId: string): Promise<void> {
      setDetailLoading(true);
      setDetailError(null);

      try {
        const response = await fetch(`/api/messages/${threadId}`, {
          method: "GET",
          headers: {
            Accept: "application/json"
          },
          cache: "no-store"
        });

        const payload = (await response.json()) as unknown;

        if (!response.ok) {
          throw new Error(
            getErrorMessage(payload, "Could not load this conversation.")
          );
        }

        const parsed = parseThreadDetail(payload);
        setActorId((current) => parsed.actorId ?? current);
        setActiveThread(parsed.thread);
      } catch (error) {
        setActiveThread(null);
        setDetailError(
          error instanceof Error ? error.message : "Could not load this conversation."
        );
      } finally {
        setDetailLoading(false);
      }
    }

    if (!selectedThreadId) {
      setActiveThread(null);
      setDetailError(null);
      return;
    }

    void loadThread(selectedThreadId);
  }, [selectedThreadId]);

  async function handleSendMessage(): Promise<void> {
    if (!selectedThreadSummary || selectedThreadSummary.status !== "OPEN") {
      return;
    }

    const body = draftMessage.trim();

    if (!body) {
      return;
    }

    setSendPending(true);
    setFeedback(null);

    try {
      const response = await fetch(`/api/messages/${selectedThreadSummary.id}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Idempotency-Key":
            globalThis.crypto?.randomUUID?.() ?? `msg-${Date.now()}`
        },
        body: JSON.stringify({ body })
      });

      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        throw new Error(getErrorMessage(payload, "Could not send message."));
      }

      const createdMessage = parseCreatedMessage(payload);
      if (!createdMessage) {
        throw new Error("Message sent but response payload was incomplete.");
      }

      setActiveThread((current) => {
        if (!current || current.id !== selectedThreadSummary.id) {
          return current;
        }

        return {
          ...current,
          messages: [...current.messages, createdMessage],
          status: "OPEN"
        };
      });

      setThreads((current) =>
        current.map((thread) =>
          thread.id === selectedThreadSummary.id
            ? {
                ...thread,
                status: "OPEN",
                lastMessage: {
                  id: createdMessage.id,
                  senderId: createdMessage.senderId,
                  body: createdMessage.body,
                  createdAt: createdMessage.createdAt
                }
              }
            : thread
        )
      );

      setDraftMessage("");
      setFeedback({
        kind: "success",
        title: "Message sent",
        message: "Your message has been delivered."
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        title: "Message failed",
        message: error instanceof Error ? error.message : "Could not send message."
      });
    } finally {
      setSendPending(false);
    }
  }

  const showEmptyState = !threadsLoading && threads.length === 0;
  const threadDetailStatus = activeThread?.status ?? selectedThreadSummary?.status ?? "LOCKED";

  return (
    <div className="space-y-6">
      {feedback ? (
        <InlineToast
          className={
            feedback.kind === "error"
              ? "border-state-danger/20 bg-state-danger/5"
              : "border-state-success/20 bg-state-success/5"
          }
        >
          <InlineToastLabel>
            {feedback.kind === "error" ? "Error" : "Success"}
          </InlineToastLabel>
          <div className="space-y-1">
            <p className="font-medium text-text-strong">{feedback.title}</p>
            <p className="text-sm text-text-muted">{feedback.message}</p>
          </div>
        </InlineToast>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <Card className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-text-strong">Threads</h2>
            <p className="text-sm text-text-muted">
              {openThreadsCount} open · {threads.length - openThreadsCount} locked
            </p>
          </div>

          {threadsLoading ? (
            <div className="space-y-2">
              <div className="h-20 rounded-md border border-line bg-surface-1" />
              <div className="h-20 rounded-md border border-line bg-surface-1" />
              <div className="h-20 rounded-md border border-line bg-surface-1" />
            </div>
          ) : threadsError ? (
            <p className="rounded-md border border-state-danger/20 bg-state-danger/5 p-3 text-sm text-state-danger">
              {threadsError}
            </p>
          ) : showEmptyState ? (
            <p className="rounded-md border border-line bg-surface-1 p-3 text-sm text-text-muted">
              No message threads yet. Threads appear once proposals are submitted.
            </p>
          ) : (
            <div className="space-y-3">
              {threads.map((thread) => {
                const selected = thread.id === selectedThreadId;
                const preview = thread.lastMessage
                  ? thread.lastMessage.body
                  : thread.status === "LOCKED"
                    ? "Messages unlock after shortlist or award."
                    : "No messages yet.";

                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => {
                      setSelectedThreadId(thread.id);
                      setFeedback(null);
                    }}
                    className={cn(
                      "w-full rounded-md border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-accent",
                      selected
                        ? "border-brand-accent bg-surface-1"
                        : "border-line bg-surface-0 hover:bg-surface-1"
                    )}
                    data-testid={`thread-${thread.id}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-text-strong">{thread.counterpart.name}</p>
                      <Badge variant={threadStatusVariant(thread.status)}>
                        {thread.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-text-muted">
                      {thread.property.city} {thread.property.postcode} · {formatInstructionStatus(thread.instructionStatus)}
                    </p>
                    <p className="mt-2 line-clamp-2 text-sm text-text-muted">{preview}</p>
                  </button>
                );
              })}
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          {selectedThreadSummary ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-text-strong">
                    {selectedThreadSummary.counterpart.name}
                  </h2>
                  <p className="text-sm text-text-muted">
                    {selectedThreadSummary.property.addressLine1}, {selectedThreadSummary.property.city} {selectedThreadSummary.property.postcode}
                  </p>
                </div>
                <Badge variant={threadStatusVariant(threadDetailStatus)}>
                  {threadDetailStatus}
                </Badge>
              </div>

              <div className="rounded-md border border-line bg-surface-1 p-4">
                {detailLoading ? (
                  <div className="space-y-2">
                    <div className="h-12 w-3/4 rounded-md bg-surface-0" />
                    <div className="ml-auto h-12 w-2/3 rounded-md bg-brand-accent/10" />
                    <div className="h-12 w-1/2 rounded-md bg-surface-0" />
                  </div>
                ) : detailError ? (
                  <p className="text-sm text-state-danger">{detailError}</p>
                ) : activeThread && activeThread.messages.length > 0 ? (
                  <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                    {activeThread.messages.map((message) => {
                      const mine = actorId !== null && message.senderId === actorId;

                      return (
                        <div
                          key={message.id}
                          className={cn(
                            "max-w-[80%] rounded-md p-3",
                            mine
                              ? "ml-auto bg-brand-accent/10"
                              : "bg-surface-0 shadow-soft"
                          )}
                        >
                          <p className="text-sm text-text-base">{message.body}</p>
                          <p className="mt-2 text-xs text-text-muted">
                            {londonDateTimeFormatter.format(new Date(message.createdAt))}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-text-muted">
                    No messages yet for this thread.
                  </p>
                )}
              </div>

              <div className="space-y-3">
                {threadDetailStatus === "LOCKED" ? (
                  <p className="rounded-md border border-state-warning/20 bg-state-warning/5 p-3 text-sm text-state-warning">
                    Messaging opens once the homeowner shortlists or chooses
                    this offer.
                  </p>
                ) : null}

                <Textarea
                  value={draftMessage}
                  onChange={(event) => {
                    setDraftMessage(event.target.value);
                  }}
                  placeholder={
                    threadDetailStatus === "OPEN"
                      ? "Write a message..."
                      : "Messaging opens once this thread is unlocked."
                  }
                  disabled={threadDetailStatus !== "OPEN" || sendPending}
                  maxLength={2000}
                />

                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    onClick={() => {
                      void handleSendMessage();
                    }}
                    disabled={
                      threadDetailStatus !== "OPEN" ||
                      sendPending ||
                      draftMessage.trim().length === 0
                    }
                    data-testid="send-message-button"
                  >
                    {sendPending ? "Sending..." : "Send message"}
                  </Button>
                  <a
                    href={instructionPathForRole(role, selectedThreadSummary.instructionId)}
                    className={cn(buttonVariants({ variant: "secondary" }))}
                  >
                    View instruction
                  </a>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="Pick a thread"
              description="Choose a thread on the left to read and send messages."
              ctaLabel={role === "HOMEOWNER" ? "Review instructions" : "Browse open instructions"}
              onCta={() => {
                window.location.href =
                  role === "HOMEOWNER"
                    ? "/homeowner/instructions"
                    : "/agent/marketplace";
              }}
            />
          )}
        </Card>
      </div>
    </div>
  );
}
