"use client";

import { useEffect, useState } from "react";

export function useClientReady(): boolean {
  const [clientReady, setClientReady] = useState(false);

  useEffect(() => {
    setClientReady(true);
  }, []);

  return clientReady;
}
