import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { logger } from "./logger";

export const UNREAD_COUNT_EVENT_CHANNEL = "runbuddy_unread_count_updates";

type InboxEventListenerClient = {
  on(
    event: "notification",
    listener: (message: { channel?: string; payload?: string | null }) => void,
  ): unknown;
  on(event: "error", listener: (error: Error) => void): unknown;
  query(statement: string): Promise<unknown>;
  release(error?: Error | boolean): void;
};

export type InboxMessageEventPool = {
  connect(): Promise<InboxEventListenerClient>;
  query(statement: string, values?: string[]): Promise<unknown>;
};

type UnreadCountListener = () => void;
type UnreadCountEventPayload = {
  runnerId: number;
  sourceId: string;
};

export function createInboxMessageEventBus(
  eventPool: InboxMessageEventPool,
  eventLogger: Pick<typeof logger, "warn">,
  instanceId: string = randomUUID(),
  retryDelayMs = 5_000,
) {
  const listenersByRunnerId = new Map<number, Set<UnreadCountListener>>();

  let listenerClient: InboxEventListenerClient | null = null;
  let listenerStartup: Promise<void> | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  function notifyLocalListeners(runnerId: number): void {
    for (const listener of listenersByRunnerId.get(runnerId) ?? []) {
      try {
        listener();
      } catch (error) {
        eventLogger.warn({ err: error }, "Could not deliver an inbox update to a local client");
      }
    }
  }

  function receiveDatabaseNotification(message: {
    channel?: string;
    payload?: string | null;
  }): void {
    if (
      message.channel !== UNREAD_COUNT_EVENT_CHANNEL ||
      typeof message.payload !== "string"
    ) {
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(message.payload);
    } catch (error) {
      eventLogger.warn({ err: error }, "Ignoring malformed inbox update notification");
      return;
    }

    if (!payload || typeof payload !== "object") return;
    const event = payload as Partial<UnreadCountEventPayload>;
    if (
      !Number.isSafeInteger(event.runnerId) ||
      typeof event.runnerId !== "number" ||
      event.runnerId <= 0 ||
      typeof event.sourceId !== "string" ||
      event.sourceId === instanceId
    ) {
      return;
    }

    notifyLocalListeners(event.runnerId);
  }

  async function ensureDatabaseListener(): Promise<void> {
    if (listenerClient) return;
    if (listenerStartup) return listenerStartup;

    const startup = (async () => {
      const client = await eventPool.connect();
      let isReleased = false;
      const release = (destroy: boolean) => {
        if (isReleased) return;
        isReleased = true;
        if (listenerClient === client) listenerClient = null;
        client.release(destroy);
      };

      listenerClient = client;
      client.on("notification", receiveDatabaseNotification);
      client.on("error", (error) => {
        if (listenerClient !== client) return;
        release(true);
        eventLogger.warn({ err: error }, "Lost the PostgreSQL inbox event listener");
        scheduleReconnect();
      });

      try {
        await client.query(`LISTEN ${UNREAD_COUNT_EVENT_CHANNEL}`);
        if (reconnectTimer) {
          clearTimeout(reconnectTimer);
          reconnectTimer = null;
        }
      } catch (error) {
        release(true);
        throw error;
      }
    })();

    listenerStartup = startup;
    try {
      await startup;
    } finally {
      if (listenerStartup === startup) listenerStartup = null;
    }
  }

  function scheduleReconnect(): void {
    if (reconnectTimer || listenersByRunnerId.size === 0) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      void ensureDatabaseListener().catch((error: unknown) => {
        eventLogger.warn({ err: error }, "Could not reconnect to PostgreSQL inbox events");
        scheduleReconnect();
      });
    }, retryDelayMs);
  }

  async function subscribeToUnreadCountUpdates(
    runnerId: number,
    listener: UnreadCountListener,
  ): Promise<() => void> {
    let listeners = listenersByRunnerId.get(runnerId);
    if (!listeners) {
      listeners = new Set();
      listenersByRunnerId.set(runnerId, listeners);
    }
    listeners.add(listener);

    try {
      await ensureDatabaseListener();
    } catch (error) {
      eventLogger.warn({ err: error }, "Could not start the PostgreSQL inbox event listener");
      scheduleReconnect();
    }

    let isSubscribed = true;
    return () => {
      if (!isSubscribed) return;
      isSubscribed = false;
      listeners?.delete(listener);
      if (listeners?.size === 0) {
        listenersByRunnerId.delete(runnerId);
      }
      if (listenersByRunnerId.size === 0 && reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
      }
    };
  }

  async function publishUnreadCountUpdate(runnerId: number): Promise<void> {
    notifyLocalListeners(runnerId);

    const payload = JSON.stringify({ runnerId, sourceId: instanceId });
    const reportPublishFailure = (error: unknown) => {
      eventLogger.warn(
        { err: error },
        "Could not publish an unread-count event to other API processes",
      );
    };

    try {
      void eventPool
        .query("SELECT pg_notify($1, $2)", [
          UNREAD_COUNT_EVENT_CHANNEL,
          payload,
        ])
        .catch(reportPublishFailure);
    } catch (error) {
      reportPublishFailure(error);
    }
  }

  return {
    publishUnreadCountUpdate,
    subscribeToUnreadCountUpdates,
  };
}

const inboxMessageEventBus = createInboxMessageEventBus(pool, logger);

export const publishUnreadCountUpdate =
  inboxMessageEventBus.publishUnreadCountUpdate;
export const subscribeToUnreadCountUpdates =
  inboxMessageEventBus.subscribeToUnreadCountUpdates;
