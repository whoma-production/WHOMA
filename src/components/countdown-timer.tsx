"use client";

import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";

function formatRemaining(targetMs: number, now: number): string {
  const diffMs = targetMs - now;

  if (diffMs <= 0) {
    return "Bid window ended";
  }

  const totalMinutes = Math.floor(diffMs / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h remaining`;
  }

  return `${hours}h ${minutes}m remaining`;
}

interface CountdownTimerProps {
  endAtIso: string;
}

export function CountdownTimer({ endAtIso }: CountdownTimerProps): JSX.Element {
  const targetMs = new Date(endAtIso).getTime();
  const [label, setLabel] = useState(() => formatRemaining(targetMs, Date.now()));

  useEffect(() => {
    setLabel(formatRemaining(targetMs, Date.now()));

    const interval = window.setInterval(() => {
      setLabel(formatRemaining(targetMs, Date.now()));
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [targetMs]);

  const variant = label === "Bid window ended" ? "warning" : "accent";
  return <Badge variant={variant}>{label}</Badge>;
}
