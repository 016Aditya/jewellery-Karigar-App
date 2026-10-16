import { useEffect, useState } from "react";

const HEALTH_URL = "http://localhost:8090/api/health";
const POLL_INTERVAL_MS = 5000;
const REQUEST_TIMEOUT_MS = 3000;

// Polls the backend's health endpoint on a short interval so the sidebar can show a
// near-real-time online/offline indicator. Polling (not a websocket) since that's the
// simplest reliable way to detect "is the Spring Boot process even up" without adding
// new infra — a dead/timed-out request is treated as offline.
export default function useBackendStatus() {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
      try {
        const res = await fetch(HEALTH_URL, { signal: controller.signal });
        if (!cancelled) setOnline(res.ok);
      } catch {
        if (!cancelled) setOnline(false);
      } finally {
        clearTimeout(timeout);
      }
    };

    check();
    const interval = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  return online;
}
