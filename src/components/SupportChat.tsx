"use client";

import { useChat } from "@ai-sdk/react";
import { ArrowUp, ChatCircle, X } from "@phosphor-icons/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent
} from "react";

import { createClient } from "@/lib/supabase/client";

type EscalationState = "idle" | "email_needed" | "confirmed";
type EscalationTrigger = "user_request" | "auto" | "escalation";

interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

function isEmailCandidate(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function getMessageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: "text"; text: string } => part.type === "text")
    .map((part) => part.text)
    .join("\n")
    .trim();
}

function getTranscriptMessages(messages: UIMessage[]): TranscriptMessage[] {
  return messages
    .filter((message): message is UIMessage & { role: "user" | "assistant" } =>
      message.role === "user" || message.role === "assistant"
    )
    .map((message) => ({
      role: message.role,
      content: getMessageText(message)
    }))
    .filter((message) => message.content.length > 0);
}

function createConversationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function SupportChat(): JSX.Element {
  const conversationIdRef = useRef<string>(createConversationId());
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [input, setInput] = useState<string>("");
  const [escalationState, setEscalationState] = useState<EscalationState>("idle");
  const [escalatedEmail, setEscalatedEmail] = useState<string | null>(null);
  const [resolvedUserEmail, setResolvedUserEmail] = useState<string | null>(null);
  const [hasResolvedUserEmail, setHasResolvedUserEmail] = useState<boolean>(false);
  const [emailCaptureValue, setEmailCaptureValue] = useState<string>("");
  const [isEscalating, setIsEscalating] = useState<boolean>(false);
  const [escalationError, setEscalationError] = useState<string | null>(null);
  const [emailFieldError, setEmailFieldError] = useState<string | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: () => ({
        conversationId: conversationIdRef.current,
        ...(resolvedUserEmail ? { userEmail: resolvedUserEmail } : {})
      })
    })
  });

  const isLoading = status === "submitted" || status === "streaming";
  const visibleMessages = useMemo(
    () =>
      messages
        .filter(
          (message): message is UIMessage & { role: "user" | "assistant" } =>
            message.role === "user" || message.role === "assistant"
        )
        .map((message) => ({
          ...message,
          content: getMessageText(message)
        }))
        .filter((message) => message.content.length > 0),
    [messages]
  );

  const waitingForAssistant = useMemo(() => {
    if (!isLoading) {
      return false;
    }

    const lastVisibleMessage = visibleMessages.at(-1);
    return lastVisibleMessage?.role === "user";
  }, [isLoading, visibleMessages]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const container = messagesContainerRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = container.scrollHeight;
  }, [isOpen, visibleMessages, waitingForAssistant, escalationState]);

  const resolveUserEmail = useCallback(async (): Promise<string | null> => {
    if (hasResolvedUserEmail) {
      return resolvedUserEmail;
    }

    try {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      const userEmail = data.user?.email?.trim() ?? null;
      setResolvedUserEmail(userEmail);
      setHasResolvedUserEmail(true);
      return userEmail;
    } catch {
      setResolvedUserEmail(null);
      setHasResolvedUserEmail(true);
      return null;
    }
  }, [hasResolvedUserEmail, resolvedUserEmail]);

  useEffect(() => {
    if (!isOpen || hasResolvedUserEmail) {
      return;
    }

    void resolveUserEmail();
  }, [hasResolvedUserEmail, isOpen, resolveUserEmail]);

  async function postEscalation(
    userEmail: string | null,
    triggeredBy: EscalationTrigger
  ): Promise<void> {
    const response = await fetch("/api/chat/escalate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: getTranscriptMessages(messages),
        userEmail,
        triggeredBy,
        conversationId: conversationIdRef.current
      })
    });

    if (!response.ok) {
      throw new Error("Escalation request failed.");
    }
  }

  async function handleTalkToPersonClick(): Promise<void> {
    if (isEscalating || escalationState === "confirmed") {
      return;
    }

    setEscalationError(null);
    setEmailFieldError(null);
    setIsEscalating(true);

    const userEmail = await resolveUserEmail();

    try {
      await postEscalation(userEmail, "user_request");

      if (userEmail) {
        setEscalatedEmail(userEmail);
        setEscalationState("confirmed");
        return;
      }

      setEscalationState("email_needed");
    } catch {
      setEscalationError("We could not send this to our support team right now. Please try again.");
    } finally {
      setIsEscalating(false);
    }
  }

  async function handleEmailCaptureConfirm(): Promise<void> {
    const trimmedEmail = emailCaptureValue.trim().toLowerCase();

    setEmailFieldError(null);
    setEscalationError(null);
    setIsEscalating(true);

    try {
      if (trimmedEmail.length > 0) {
        if (!isEmailCandidate(trimmedEmail)) {
          setEmailFieldError("Enter a valid email address.");
          return;
        }
        setResolvedUserEmail(trimmedEmail);
        setHasResolvedUserEmail(true);
        setEscalatedEmail(trimmedEmail);
      } else {
        setEscalatedEmail(null);
      }

      setEscalationState("confirmed");
    } catch {
      setEscalationError("We could not confirm your email right now. Please try again.");
    } finally {
      setIsEscalating(false);
    }
  }

  function resizeInput(): void {
    const textarea = inputRef.current;
    if (!textarea) {
      return;
    }

    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
  }

  async function handleSubmit(event?: FormEvent): Promise<void> {
    event?.preventDefault();

    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading || escalationState !== "idle") {
      return;
    }

    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
    await sendMessage({ text: trimmedInput });
  }

  function handleTextareaKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSubmit();
    }
  }

  return (
    <>
      {isOpen ? (
        <section className="support-chat-panel-enter fixed bottom-24 right-6 z-50 flex h-[520px] w-[380px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_20px_60px_-15px_rgba(0,0,0,0.18)] max-sm:inset-x-4 max-sm:bottom-20 max-sm:h-[70dvh] max-sm:w-auto">
          <header className="flex h-14 shrink-0 items-center justify-between bg-[#2d6a5a] px-4">
            <p className="text-sm font-medium text-white">WHOMA Support</p>
            <button
              type="button"
              onClick={() => {
                void handleTalkToPersonClick();
              }}
              disabled={isEscalating || escalationState === "confirmed"}
              className="inline-flex items-center gap-1 text-xs text-white/70 transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{isEscalating ? "Sending..." : "Talk to a person →"}</span>
              <span className="relative inline-flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-300/80" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-300" />
              </span>
            </button>
          </header>

          <div ref={messagesContainerRef} className="flex flex-1 flex-col gap-3 overflow-y-auto p-4">
            {visibleMessages.length === 0 ? (
              <div className="mt-4 flex flex-1 flex-col items-center justify-center gap-3 text-center">
                <ChatCircle size={36} className="text-zinc-200" />
                <p className="text-sm text-zinc-400">Ask us anything about WHOMA</p>
              </div>
            ) : (
              visibleMessages.map((message) => (
                <article
                  key={message.id}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-zinc-100 px-4 py-2.5 text-sm text-zinc-800"
                      : "mr-auto max-w-[85%] rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-4 py-2.5 text-sm text-zinc-700"
                  }
                >
                  {message.content}
                </article>
              ))
            )}

            {waitingForAssistant ? (
              <div className="mr-auto flex w-[85%] flex-col gap-2 rounded-2xl rounded-bl-sm border border-slate-100 bg-white px-4 py-3">
                <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-100" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-100" />
              </div>
            ) : null}
          </div>

          {escalationState === "idle" ? (
            <form className="flex items-end gap-2 border-t border-slate-100 p-3" onSubmit={(event) => void handleSubmit(event)}>
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                placeholder="Ask a question..."
                onChange={(event) => {
                  setInput(event.target.value);
                  resizeInput();
                }}
                onKeyDown={handleTextareaKeyDown}
                className="max-h-[120px] flex-1 resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-[#2d6a5a]/40 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isLoading || input.trim().length === 0}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#2d6a5a] text-white transition-transform active:scale-[0.95] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp size={18} weight="bold" />
              </button>
            </form>
          ) : (
            <div className="border-t border-slate-100 p-4 text-center text-sm text-zinc-500">
              {escalationState === "email_needed" ? (
                <div className="space-y-3">
                  <p>Your conversation has been sent to our support team.</p>
                  <div className="mx-auto flex max-w-[280px] flex-col gap-2">
                    <input
                      type="email"
                      value={emailCaptureValue}
                      placeholder="Your email (optional)"
                      onChange={(event) => {
                        setEmailCaptureValue(event.target.value);
                        if (emailFieldError) {
                          setEmailFieldError(null);
                        }
                      }}
                      className="h-10 rounded-xl border border-slate-200 px-3 text-sm text-zinc-700 placeholder:text-zinc-400 focus:border-[#2d6a5a]/40 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        void handleEmailCaptureConfirm();
                      }}
                      disabled={isEscalating}
                      className="h-10 rounded-xl bg-[#2d6a5a] px-3 text-sm font-medium text-white transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      {isEscalating ? "Confirming..." : "Confirm"}
                    </button>
                  </div>
                  {emailFieldError ? <p className="text-xs text-red-500">{emailFieldError}</p> : null}
                </div>
              ) : (
                <>
                  {escalatedEmail ? (
                    <p>
                      Your conversation has been sent to our support team. We&apos;ll reply to{" "}
                      <span className="font-medium text-zinc-700">{escalatedEmail}</span> within 1 business day.
                    </p>
                  ) : (
                    <p>
                      Your conversation has been sent to our support team. We&apos;ll reply
                      within 1 business day.
                    </p>
                  )}
                </>
              )}
              {escalationError ? <p className="mt-2 text-xs text-red-500">{escalationError}</p> : null}
            </div>
          )}
        </section>
      ) : null}

      <button
        type="button"
        onClick={() => {
          setIsOpen((currentOpen) => !currentOpen);
        }}
        className={`fixed bottom-6 right-6 z-50 flex h-[52px] w-[52px] items-center justify-center rounded-full bg-[#2d6a5a] text-white shadow-lg transition-transform active:scale-[0.96] ${
          !isOpen
            ? "relative after:absolute after:inset-0 after:animate-ping after:rounded-full after:border-2 after:border-[#2d6a5a]/40 after:content-['']"
            : ""
        }`}
        aria-label={isOpen ? "Close support chat" : "Open support chat"}
      >
        {isOpen ? <X size={24} weight="bold" /> : <ChatCircle size={24} weight="fill" />}
      </button>
    </>
  );
}
