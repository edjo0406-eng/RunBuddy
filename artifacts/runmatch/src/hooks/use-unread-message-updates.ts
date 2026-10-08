import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getGetUnreadCountQueryKey } from "@workspace/api-client-react";

export function useUnreadMessageUpdates(
  userId: string | null | undefined,
  enabled: boolean,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !userId || typeof EventSource === "undefined") return;

    const eventSource = new EventSource("/api/messages/events");
    const handleUnreadCountUpdate = () => {
      void queryClient.invalidateQueries({
        queryKey: [...getGetUnreadCountQueryKey(), userId],
        exact: true,
      });
    };

    eventSource.addEventListener("unread-count", handleUnreadCountUpdate);

    return () => {
      eventSource.removeEventListener("unread-count", handleUnreadCountUpdate);
      eventSource.close();
    };
  }, [enabled, queryClient, userId]);
}
