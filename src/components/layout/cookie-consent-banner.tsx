"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface ConsentState {
  hasStoredPreference: boolean;
  preferences: {
    essential: true;
    analytics: boolean;
    preferences: boolean;
  };
}

async function loadConsentState(): Promise<ConsentState | null> {
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

export function CookieConsentBanner(): JSX.Element | null {
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [preferences, setPreferences] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let active = true;

    void loadConsentState().then((state) => {
      if (!active) {
        return;
      }

      if (!state || state.hasStoredPreference) {
        setVisible(false);
        setHydrated(true);
        return;
      }

      setAnalytics(state.preferences.analytics);
      setPreferences(state.preferences.preferences);
      setVisible(true);
      setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  async function save(mode: "essential_only" | "accept_all" | "custom"): Promise<void> {
    setPending(true);

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

      if (response.ok) {
        setVisible(false);
      }
    } finally {
      setPending(false);
    }
  }

  if (!hydrated || !visible) {
    return null;
  }

  return (
    <div
      className="fixed inset-x-4 bottom-4 z-50 mx-auto w-full max-w-3xl rounded-lg border border-line bg-surface-0 p-4 shadow-lift"
      data-testid="cookie-consent-banner"
    >
      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-text-strong">Cookie preferences</p>
          <p className="text-xs text-text-muted">
            Essential cookies are always on. You can choose whether to allow non-essential cookies.
          </p>
        </div>

        {expanded ? (
          <div className="space-y-2 rounded-md border border-line bg-surface-1 p-3">
            <label className="flex items-start gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(event) => setAnalytics(event.target.checked)}
                disabled={pending}
              />
              <span>
                Analytics cookies
                <span className="block text-xs text-text-muted">Help us measure product usage trends without changing your experience.</span>
              </span>
            </label>

            <label className="flex items-start gap-2 text-sm text-text-muted">
              <input
                type="checkbox"
                checked={preferences}
                onChange={(event) => setPreferences(event.target.checked)}
                disabled={pending}
              />
              <span>
                Preference cookies
                <span className="block text-xs text-text-muted">Remember non-essential UI choices across visits.</span>
              </span>
            </label>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            disabled={pending}
            onClick={() => {
              void save("essential_only");
            }}
          >
            Essential only
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={pending}
            onClick={() => {
              void save("accept_all");
            }}
          >
            Accept all
          </Button>
          <Button
            size="sm"
            variant="tertiary"
            disabled={pending}
            onClick={() => {
              if (!expanded) {
                setExpanded(true);
                return;
              }

              void save("custom");
            }}
          >
            {expanded ? "Save preferences" : "Manage preferences"}
          </Button>
        </div>
      </div>
    </div>
  );
}

