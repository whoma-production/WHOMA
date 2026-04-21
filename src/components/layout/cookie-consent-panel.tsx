"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { InlineToast, InlineToastLabel } from "@/components/ui/inline-toast";

interface ConsentState {
  hasStoredPreference: boolean;
  preferences: {
    essential: true;
    analytics: boolean;
    preferences: boolean;
    decidedAtIso: string;
  };
}

async function fetchConsentState(): Promise<ConsentState | null> {
  try {
    const response = await fetch("/api/consent", { method: "GET", cache: "no-store" });
    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as {
      ok?: boolean;
      data?: ConsentState;
    };

    if (!payload.ok || !payload.data) {
      return null;
    }

    return payload.data;
  } catch {
    return null;
  }
}

const decidedDateFormatter = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/London"
});

export function CookieConsentPanel(): JSX.Element {
  const [loading, setLoading] = useState(true);
  const [hasStoredPreference, setHasStoredPreference] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [decidedAtIso, setDecidedAtIso] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<"success" | "error">("success");

  useEffect(() => {
    let active = true;

    void fetchConsentState().then((state) => {
      if (!active) {
        return;
      }

      if (state) {
        setHasStoredPreference(state.hasStoredPreference);
        setAnalytics(state.preferences.analytics);
        setPreferences(state.preferences.preferences);
        setDecidedAtIso(state.preferences.decidedAtIso);
      }

      setLoading(false);
    });

    return () => {
      active = false;
    };
  }, []);

  async function save(mode: "essential_only" | "accept_all" | "custom"): Promise<void> {
    setPending(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/consent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          mode === "custom"
            ? { mode, analytics, preferences }
            : { mode }
        )
      });

      if (!response.ok) {
        throw new Error("Could not save cookie preferences.");
      }

      const payload = (await response.json()) as {
        ok?: boolean;
        data?: {
          preferences?: {
            analytics: boolean;
            preferences: boolean;
            decidedAtIso: string;
          };
        };
      };

      if (!payload.ok) {
        throw new Error("Could not save cookie preferences.");
      }

      setHasStoredPreference(true);
      setAnalytics(payload.data?.preferences?.analytics ?? false);
      setPreferences(payload.data?.preferences?.preferences ?? false);
      setDecidedAtIso(payload.data?.preferences?.decidedAtIso ?? new Date().toISOString());
      setStatusKind("success");
      setStatusMessage("Cookie preferences saved.");
    } catch (error) {
      setStatusKind("error");
      setStatusMessage(error instanceof Error ? error.message : "Could not save cookie preferences.");
    } finally {
      setPending(false);
    }
  }

  async function reset(): Promise<void> {
    setPending(true);
    setStatusMessage(null);

    try {
      const response = await fetch("/api/consent", { method: "DELETE" });
      if (!response.ok) {
        throw new Error("Could not reset cookie preferences.");
      }

      setHasStoredPreference(false);
      setAnalytics(false);
      setPreferences(false);
      setDecidedAtIso(null);
      setStatusKind("success");
      setStatusMessage("Cookie preferences reset. Banner will show again.");
    } catch (error) {
      setStatusKind("error");
      setStatusMessage(error instanceof Error ? error.message : "Could not reset cookie preferences.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card id="manage-consent" className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-text-strong">Manage cookie preferences</h2>
        <p className="text-sm text-text-muted">
          Essential cookies are always enabled. Non-essential categories stay off until you choose otherwise.
        </p>
        {hasStoredPreference && decidedAtIso ? (
          <p className="text-xs text-text-muted">
            Last updated: {decidedDateFormatter.format(new Date(decidedAtIso))}
          </p>
        ) : null}
      </div>

      {statusMessage ? (
        <InlineToast className={statusKind === "error" ? "border-state-danger/20 bg-state-danger/5" : "border-state-success/20 bg-state-success/5"}>
          <InlineToastLabel>{statusKind === "error" ? "Error" : "Saved"}</InlineToastLabel>
          <p className="text-sm text-text-muted">{statusMessage}</p>
        </InlineToast>
      ) : null}

      <div className="space-y-2 rounded-md border border-line bg-surface-1 p-3">
        <label className="flex items-start gap-2 text-sm text-text-muted">
          <input type="checkbox" checked readOnly disabled />
          <span>
            Essential cookies
            <span className="block text-xs text-text-muted">Required for sign-in, security, and core platform behavior.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={analytics}
            onChange={(event) => setAnalytics(event.target.checked)}
            disabled={loading || pending}
          />
          <span>
            Analytics cookies
            <span className="block text-xs text-text-muted">Help us understand aggregate usage patterns.</span>
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm text-text-muted">
          <input
            type="checkbox"
            checked={preferences}
            onChange={(event) => setPreferences(event.target.checked)}
            disabled={loading || pending}
          />
          <span>
            Preference cookies
            <span className="block text-xs text-text-muted">Remember non-essential UI preferences between visits.</span>
          </span>
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          disabled={loading || pending}
          onClick={() => {
            void save("custom");
          }}
        >
          Save preferences
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={loading || pending}
          onClick={() => {
            void save("essential_only");
          }}
        >
          Essential only
        </Button>
        <Button
          size="sm"
          variant="tertiary"
          disabled={loading || pending}
          onClick={() => {
            void save("accept_all");
          }}
        >
          Accept all
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={loading || pending}
          onClick={() => {
            void reset();
          }}
        >
          Reset
        </Button>
      </div>
    </Card>
  );
}

