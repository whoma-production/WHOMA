"use client";

import {
  ChatCircle,
  CheckCircle,
  Clock,
  EnvelopeSimple
} from "@phosphor-icons/react";
import Link from "next/link";
import { type CSSProperties, type FormEvent, useState } from "react";
import { z } from "zod";

const contactFormSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(320),
  role: z.string().trim().max(80).optional(),
  category: z.enum([
    "ACCOUNT_ACCESS",
    "ONBOARDING",
    "VERIFICATION",
    "SELLER_ACCESS",
    "PARTNERSHIP",
    "COMPLAINT",
    "GENERAL"
  ]),
  message: z.string().trim().min(12).max(4000)
});

type ContactFormState = z.infer<typeof contactFormSchema>;

interface ContactPageShellProps {
  logoSubtitle: string;
  supportEmail: string;
}

const fieldClassName =
  "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-zinc-800 bg-white placeholder:text-zinc-300 focus:outline-none focus:border-[#2d6a5a]/50 focus:ring-2 focus:ring-[#2d6a5a]/10 transition-all duration-200";

const categoryOptions: ReadonlyArray<{ label: string; value: ContactFormState["category"] }> =
  [
    { label: "General enquiry", value: "GENERAL" },
    { label: "Account access", value: "ACCOUNT_ACCESS" },
    { label: "Agent onboarding", value: "ONBOARDING" },
    { label: "Verification", value: "VERIFICATION" },
    { label: "Seller access", value: "SELLER_ACCESS" },
    { label: "Partnership", value: "PARTNERSHIP" },
    { label: "Complaint", value: "COMPLAINT" }
  ];

function getFieldAnimationStyle(index: number): CSSProperties {
  return { "--index": index } as CSSProperties;
}

export function ContactPageShell({
  logoSubtitle,
  supportEmail
}: ContactPageShellProps): JSX.Element {
  const [form, setForm] = useState<ContactFormState>({
    name: "",
    email: "",
    role: "",
    category: "GENERAL",
    message: ""
  });
  const [isSending, setIsSending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function setField<K extends keyof ContactFormState>(
    field: K,
    value: ContactFormState[K]
  ): void {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setErrorMessage(null);

    const parsed = contactFormSchema.safeParse(form);
    if (!parsed.success) {
      setErrorMessage(
        "Please provide your name, a valid email, category, and a clear message."
      );
      return;
    }

    setIsSending(true);

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...parsed.data,
          pagePath: window.location.pathname,
          source: "/contact"
        })
      });

      if (!response.ok) {
        throw new Error("Contact request failed");
      }

      setSubmittedEmail(parsed.data.email);
      setIsSuccess(true);
    } catch {
      setErrorMessage(
        "We could not submit your enquiry right now. Please retry or email support directly."
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-white md:flex">
      <aside className="bg-zinc-950 md:flex md:w-[42%] md:flex-col md:min-h-[100dvh]">
        <div className="flex h-20 items-center px-5 md:hidden">
          <Link href="/" className="inline-flex items-center gap-3 text-zinc-100">
            <span aria-hidden="true" className="text-xl leading-none text-[#2d6a5a]">
              ∞
            </span>
            <span className="text-sm font-semibold tracking-[0.12em]">WHOMA</span>
          </Link>
        </div>

        <div className="hidden md:flex md:flex-1 md:flex-col md:px-12 md:py-12 lg:px-16">
          <div className="pt-2">
            <Link href="/" className="inline-flex items-center gap-3 text-zinc-100">
              <span
                aria-hidden="true"
                className="text-xl leading-none text-[#2d6a5a]"
              >
                ∞
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold tracking-[0.12em]">WHOMA</span>
                <span className="mt-0.5 text-xs text-zinc-400">{logoSubtitle}</span>
              </span>
            </Link>
          </div>

          <div className="flex flex-1 items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">Contact</p>
              <h1 className="mt-4 max-w-[22ch] text-3xl font-semibold leading-snug tracking-tight text-white">
                We read every message.
              </h1>
              <div className="my-7 h-px w-8 bg-zinc-700" />
              <div className="space-y-5">
                <div className="flex items-center gap-3 text-zinc-300">
                  <EnvelopeSimple size={16} className="text-zinc-500" />
                  <span className="text-sm">{supportEmail}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-300">
                  <Clock size={16} className="text-zinc-500" />
                  <span className="text-sm">Mon-Fri, 9am-6pm GMT</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-300">
                  <ChatCircle size={16} className="text-zinc-500" />
                  <span className="text-sm">Live chat available on every page</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-zinc-600">whoma.co.uk</p>
        </div>
      </aside>

      <section className="w-full bg-white md:w-[58%]">
        <div className="mx-auto w-full max-w-md px-5 py-10 md:px-14 md:py-16">
          {isSuccess ? (
            <div className="flex min-h-[60dvh] flex-col items-center justify-center text-center">
              <CheckCircle size={40} className="text-[#2d6a5a]" />
              <p className="mt-5 text-xl font-semibold text-zinc-900">Message sent.</p>
              <p className="mt-2 text-sm text-zinc-400">
                We&apos;ll reply to {submittedEmail} within 1 business day.
              </p>
              <Link
                href="/"
                className="mt-8 text-sm text-zinc-400 transition-colors hover:text-zinc-600"
              >
                Back to home &rarr;
              </Link>
            </div>
          ) : (
            <>
              <p className="mb-8 text-xs uppercase tracking-[0.2em] text-zinc-400">
                Get in touch
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div
                    className="flex flex-col gap-1.5 [animation:whoma-contact-field-in_380ms_cubic-bezier(0.16,1,0.3,1)_both] [animation-delay:calc(var(--index)*55ms)]"
                    style={getFieldAnimationStyle(0)}
                  >
                    <label
                      htmlFor="contact-name"
                      className="text-xs font-medium uppercase tracking-wide text-zinc-500"
                    >
                      Name
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      required
                      value={form.name}
                      onChange={(event) => setField("name", event.target.value)}
                      placeholder="Your full name"
                      className={fieldClassName}
                    />
                  </div>
                  <div
                    className="flex flex-col gap-1.5 [animation:whoma-contact-field-in_380ms_cubic-bezier(0.16,1,0.3,1)_both] [animation-delay:calc(var(--index)*55ms)]"
                    style={getFieldAnimationStyle(1)}
                  >
                    <label
                      htmlFor="contact-email"
                      className="text-xs font-medium uppercase tracking-wide text-zinc-500"
                    >
                      Email
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      value={form.email}
                      onChange={(event) => setField("email", event.target.value)}
                      placeholder="you@example.com"
                      className={fieldClassName}
                    />
                  </div>
                </div>

                <div
                  className="flex flex-col gap-1.5 [animation:whoma-contact-field-in_380ms_cubic-bezier(0.16,1,0.3,1)_both] [animation-delay:calc(var(--index)*55ms)]"
                  style={getFieldAnimationStyle(2)}
                >
                  <label
                    htmlFor="contact-role"
                    className="text-xs font-medium uppercase tracking-wide text-zinc-500"
                  >
                    Role (optional)
                  </label>
                  <input
                    id="contact-role"
                    name="role"
                    value={form.role ?? ""}
                    onChange={(event) => setField("role", event.target.value)}
                    placeholder="Independent estate agent, partner, homeowner..."
                    className={fieldClassName}
                  />
                </div>

                <div
                  className="flex flex-col gap-1.5 [animation:whoma-contact-field-in_380ms_cubic-bezier(0.16,1,0.3,1)_both] [animation-delay:calc(var(--index)*55ms)]"
                  style={getFieldAnimationStyle(3)}
                >
                  <label
                    htmlFor="contact-category"
                    className="text-xs font-medium uppercase tracking-wide text-zinc-500"
                  >
                    Category
                  </label>
                  <select
                    id="contact-category"
                    name="category"
                    required
                    value={form.category}
                    onChange={(event) =>
                      setField("category", event.target.value as ContactFormState["category"])
                    }
                    className={fieldClassName}
                  >
                    {categoryOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div
                  className="flex flex-col gap-1.5 [animation:whoma-contact-field-in_380ms_cubic-bezier(0.16,1,0.3,1)_both] [animation-delay:calc(var(--index)*55ms)]"
                  style={getFieldAnimationStyle(4)}
                >
                  <label
                    htmlFor="contact-message"
                    className="text-xs font-medium uppercase tracking-wide text-zinc-500"
                  >
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    required
                    rows={5}
                    value={form.message}
                    onChange={(event) => setField("message", event.target.value)}
                    placeholder="Tell us what you need help with and include any profile slug or reference if available."
                    className={`${fieldClassName} resize-none`}
                  />
                </div>

                <div>
                  {errorMessage ? (
                    <p className="mb-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {errorMessage}
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={isSending}
                    className="mt-2 w-full rounded-xl bg-[#2d6a5a] py-3 text-sm font-medium text-white transition-all duration-200 [transition-timing-function:cubic-bezier(0.16,1,0.3,1)] hover:bg-[#235649] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSending ? "Sending..." : "Send enquiry"}
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
