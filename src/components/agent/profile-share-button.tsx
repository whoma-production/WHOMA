"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

interface ProfileShareButtonProps {
  profileSlug: string;
}

export function ProfileShareButton({
  profileSlug
}: ProfileShareButtonProps): JSX.Element {
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [busy, setBusy] = useState(false);

  async function handleShare(): Promise<void> {
    if (busy) {
      return;
    }

    setBusy(true);
    setStatusMessage("");

    try {
      const profileUrl = `${window.location.origin}/agents/${profileSlug}`;
      await navigator.clipboard.writeText(profileUrl);
      await fetch("/api/agent/profile/share", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          profileSlug,
          channel: "copy_link"
        })
      });

      setStatusMessage("Profile link copied and share activity recorded.");
    } catch {
      setStatusMessage(
        "We could not copy that link right now. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="tertiary" onClick={handleShare} disabled={busy}>
        {busy ? "Copying..." : "Copy public profile link"}
      </Button>
      {statusMessage ? (
        <p className="text-xs text-text-muted">{statusMessage}</p>
      ) : null}
    </div>
  );
}
