import { useEffect, useRef } from 'react';
import { useAuth } from '@clerk/expo';
import { fetch as expoFetch } from 'expo/fetch';
import { useQueryClient } from '@tanstack/react-query';
import {
  getGetInboxQueryKey,
  getGetUnreadCountQueryKey,
  getStreamInboxEventsUrl,
} from '@workspace/api-client-react';

type InboxMessageUpdatesOptions = {
  enabled: boolean;
  runnerId: number | null;
  userId: string | null;
};

const INITIAL_RECONNECT_DELAY_MS = 1_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

function isInboxUpdateEvent(block: string) {
  return block.split(/\r?\n/).some((line) => {
    if (!line.startsWith('event:')) return false;
    return line.slice('event:'.length).trim() === 'unread-count';
  });
}

export function useInboxMessageUpdates({
  enabled,
  runnerId,
  userId,
}: InboxMessageUpdatesOptions) {
  const queryClient = useQueryClient();
  const { getToken } = useAuth();
  const getTokenRef = useRef(getToken);

  useEffect(() => {
    getTokenRef.current = getToken;
  }, [getToken]);

  useEffect(() => {
    if (!enabled || !userId || !runnerId) return;

    const domain = process.env.EXPO_PUBLIC_DOMAIN?.trim();
    if (!domain) {
      if (__DEV__) {
        console.warn(
          'Live inbox updates are unavailable because EXPO_PUBLIC_DOMAIN is unset; periodic refresh remains enabled.',
        );
      }
      return;
    }

    let active = true;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let activeController: AbortController | undefined;
    let activeReader: ReadableStreamDefaultReader<Uint8Array> | undefined;
    let reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;

    const refreshInbox = () => {
      if (!active) return;
      void queryClient.invalidateQueries({
        queryKey: [...getGetInboxQueryKey(), userId],
      });
      void queryClient.invalidateQueries({
        queryKey: [...getGetUnreadCountQueryKey(), userId],
      });
    };

    const scheduleReconnect = () => {
      if (!active || reconnectTimer) return;
      const delay = reconnectDelayMs;
      reconnectDelayMs = Math.min(reconnectDelayMs * 2, MAX_RECONNECT_DELAY_MS);
      reconnectTimer = setTimeout(() => {
        reconnectTimer = undefined;
        void connect();
      }, delay);
    };

    const connect = async () => {
      const controller = new AbortController();
      activeController = controller;
      const connectedAt = Date.now();

      try {
        const token = await getTokenRef.current();
        if (!active || controller.signal.aborted) return;
        if (!token) throw new Error('A signed-in session token is unavailable.');

        const response = await expoFetch(
          `https://${domain}${getStreamInboxEventsUrl()}`,
          {
            headers: {
              Accept: 'text/event-stream',
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          },
        );
        if (!response.ok) throw new Error('Inbox event stream request failed.');

        const reader = response.body?.getReader();
        if (!reader) throw new Error('Inbox event stream has no readable body.');
        activeReader = reader;

        const decoder = new TextDecoder();
        let buffer = '';
        while (active && !controller.signal.aborted) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const eventBlocks = buffer.split(/\r?\n\r?\n/);
          buffer = eventBlocks.pop() ?? '';
          for (const block of eventBlocks) {
            if (isInboxUpdateEvent(block)) refreshInbox();
          }

          if (Date.now() - connectedAt >= 25_000) {
            reconnectDelayMs = INITIAL_RECONNECT_DELAY_MS;
          }
        }

        if (active && !controller.signal.aborted) scheduleReconnect();
      } catch {
        if (active && !controller.signal.aborted) scheduleReconnect();
      } finally {
        if (activeReader) {
          activeReader.releaseLock();
          activeReader = undefined;
        }
        if (activeController === controller) activeController = undefined;
      }
    };

    void connect();

    return () => {
      active = false;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      activeController?.abort();
      if (activeReader) void activeReader.cancel().catch(() => undefined);
    };
  }, [enabled, queryClient, runnerId, userId]);
}
