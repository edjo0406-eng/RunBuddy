import { useEffect, useRef } from "react";

export function useNotifications(
  unreadCount: number | undefined,
  enabled: boolean
) {
  const prevCountRef = useRef<number | undefined>(undefined);
  const permissionRequestedRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (!("Notification" in window)) return;
    if (permissionRequestedRef.current) return;
    if (Notification.permission === "default") {
      permissionRequestedRef.current = true;
      Notification.requestPermission();
    }
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    if (unreadCount === undefined) return;

    if (prevCountRef.current === undefined) {
      prevCountRef.current = unreadCount;
      return;
    }

    const prev = prevCountRef.current;
    prevCountRef.current = unreadCount;

    if (unreadCount <= prev) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    const newCount = unreadCount - prev;
    const n = new Notification("RunDate — New message", {
      body:
        newCount === 1
          ? "You have a new message waiting."
          : `You have ${newCount} new messages waiting.`,
      icon: "/favicon.svg",
      tag: "rundate-new-message",
      renotify: true,
    });

    n.onclick = () => {
      window.focus();
      n.close();
      window.location.href = "/inbox";
    };
  }, [unreadCount, enabled]);
}
