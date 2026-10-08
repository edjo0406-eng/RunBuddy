import React from 'react';
import { act, create, type ReactTestRenderer } from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import InboxScreen from '../app/(tabs)/inbox';

const fixtures = vi.hoisted(() => ({
  platform: 'android' as string,
  auth: {
    token: 'token-a' as string,
    getToken: vi.fn(),
  },
  identity: {
    signedIn: true,
    userId: 'account-a' as string | null,
    runnerId: 10 as number | null,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  },
  streamFetch: vi.fn(),
  streamConnections: [] as Array<{ url: string; init: any; push: (value: string) => void }>,
  inboxPayload: [] as any,
  unreadPayload: { count: 0 } as any,
  fetchInbox: vi.fn(),
  fetchUnread: vi.fn(),
  inboxOptions: undefined as any,
  unreadOptions: undefined as any,
}));

const activeApps: Array<{
  renderer: ReactTestRenderer;
  queryClient: QueryClient;
}> = [];
const originalDomain = process.env.EXPO_PUBLIC_DOMAIN;

vi.mock('@clerk/expo', () => ({
  useAuth: () => fixtures.auth,
}));

vi.mock('expo/fetch', () => ({
  fetch: fixtures.streamFetch,
}));

vi.mock('expo-router', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/useRunnerIdentity', () => ({
  useRunnerIdentity: () => fixtures.identity,
}));

vi.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    background: '#fff',
    card: '#fff',
    border: '#ddd',
    foreground: '#111',
    mutedForeground: '#555',
    primary: '#1769aa',
    primaryForeground: '#fff',
  }),
}));

vi.mock('@workspace/api-client-react', async () => {
  const { useQuery } = await import('@tanstack/react-query');
  const inboxKey = ['/api/messages/inbox'];
  const unreadKey = ['/api/messages/unread-count'];

  return {
    getGetInboxQueryKey: () => inboxKey,
    getGetUnreadCountQueryKey: () => unreadKey,
    getStreamInboxEventsUrl: () => '/api/messages/events',
    useGetInbox: (options: { query?: Record<string, any> } = {}) => {
      fixtures.inboxOptions = options.query;
      return useQuery({
        ...options.query,
        queryKey: options.query?.queryKey ?? inboxKey,
        queryFn: () => fixtures.fetchInbox(options.query?.queryKey),
      });
    },
    useGetUnreadCount: (options: { query?: Record<string, any> } = {}) => {
      fixtures.unreadOptions = options.query;
      return useQuery({
        ...options.query,
        queryKey: options.query?.queryKey ?? unreadKey,
        queryFn: () => fixtures.fetchUnread(options.query?.queryKey),
      });
    },
  };
});

vi.mock('react-native', async () => {
  const ReactModule = await import('react');
  const host = (name: string) => {
    const Component = ({ children, ...props }: Record<string, any>) =>
      ReactModule.createElement(name, props, children);
    Component.displayName = name;
    return Component;
  };

  return {
    Platform: {
      get OS() {
        return fixtures.platform;
      },
    },
    StyleSheet: { create: (styles: object) => styles },
    Pressable: host('Pressable'),
    RefreshControl: host('RefreshControl'),
    ScrollView: host('ScrollView'),
    Text: host('Text'),
    View: host('View'),
  };
});

vi.mock('@expo/vector-icons', () => ({
  Feather: () => null,
}));

vi.mock('@/components/ui', async () => {
  const ReactModule = await import('react');
  const Native = await import('react-native');
  const text = (value: string) =>
    ReactModule.createElement(Native.Text, null, value);

  return {
    ActionButton: () => null,
    BrandHeader: ({ title, subtitle }: { title: string; subtitle: string }) =>
      ReactModule.createElement(Native.Text, null, title, ' ', subtitle),
    EmptyState: ({ title, detail }: { title: string; detail: string }) =>
      ReactModule.createElement(Native.View, null, text(title), text(detail)),
    ErrorState: ({ message }: { message: string }) => text(message),
    LoadingState: ({ label }: { label: string }) => text(label),
    Page: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(Native.View, null, children),
    RunnerAvatar: () => null,
    messageTime: () => 'Just now',
  };
});

function makeConversation(content: string, unreadCount: number) {
  return [
    {
      otherId: 42,
      otherRunner: {
        id: 42,
        name: 'Avery Runner',
        profileType: 'individual',
        avatarUrl: null,
        gender: 'unknown',
      },
      latestMessage: {
        id: 100,
        content,
        createdAt: '2026-10-08T12:00:00.000Z',
      },
      unreadCount,
    },
  ];
}

function createStreamReader() {
  type ReadResult = { done: boolean; value?: Uint8Array };
  const encoder = new TextEncoder();
  const queued: ReadResult[] = [];
  let waiting: ((result: ReadResult) => void) | undefined;

  const reader = {
    read: vi.fn(() => {
      const next = queued.shift();
      if (next) return Promise.resolve(next);
      return new Promise<ReadResult>((resolve) => {
        waiting = resolve;
      });
    }),
    cancel: vi.fn(async () => {
      const resolve = waiting;
      waiting = undefined;
      resolve?.({ done: true });
    }),
    releaseLock: vi.fn(),
  };

  return {
    reader,
    push(value: string) {
      const result = { done: false, value: encoder.encode(value) };
      const resolve = waiting;
      waiting = undefined;
      if (resolve) resolve(result);
      else queued.push(result);
    },
  };
}

function textValues(renderer: ReactTestRenderer) {
  return renderer.root
    .findAll((node) => String(node.type) === 'Text')
    .map((node) =>
      node.children
        .filter((child): child is string => typeof child === 'string')
        .join(''),
    );
}

async function settle() {
  await new Promise((resolve) => setTimeout(resolve, 25));
}

async function renderInbox(platform: string) {
  fixtures.platform = platform;
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 0, gcTime: Infinity },
    },
  });
  const renderApp = () => (
    <QueryClientProvider client={queryClient}>
      <InboxScreen />
    </QueryClientProvider>
  );
  let renderer!: ReactTestRenderer;
  await act(async () => {
    renderer = create(renderApp());
    await settle();
  });
  await act(async () => {
    await settle();
  });
  activeApps.push({ renderer, queryClient });
  return { renderer, queryClient, renderApp };
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_DOMAIN = 'api.runbuddy.test';
  fixtures.platform = 'android';
  fixtures.auth.token = 'token-a';
  fixtures.auth.getToken.mockReset();
  fixtures.auth.getToken.mockImplementation(async () => fixtures.auth.token);
  Object.assign(fixtures.identity, {
    signedIn: true,
    userId: 'account-a',
    runnerId: 10,
    isPending: false,
    isError: false,
  });
  fixtures.identity.refetch.mockReset();
  fixtures.streamFetch.mockReset();
  fixtures.streamConnections.length = 0;
  fixtures.inboxPayload = makeConversation('Avery: the old plan', 0);
  fixtures.unreadPayload = { count: 0 };
  fixtures.fetchInbox.mockReset();
  fixtures.fetchInbox.mockImplementation(async () => fixtures.inboxPayload);
  fixtures.fetchUnread.mockReset();
  fixtures.fetchUnread.mockImplementation(async () => fixtures.unreadPayload);
  fixtures.inboxOptions = undefined;
  fixtures.unreadOptions = undefined;
  fixtures.streamFetch.mockImplementation(async (url: string, init: any) => {
    const stream = createStreamReader();
    fixtures.streamConnections.push({
      url,
      init,
      push: stream.push,
    });
    return {
      ok: true,
      status: 200,
      body: { getReader: () => stream.reader },
    };
  });
});

afterEach(async () => {
  for (const app of activeApps.splice(0)) {
    await act(async () => {
      app.renderer.unmount();
    });
    app.queryClient.clear();
  }
  if (originalDomain === undefined) {
    delete process.env.EXPO_PUBLIC_DOMAIN;
  } else {
    process.env.EXPO_PUBLIC_DOMAIN = originalDomain;
  }
});

describe('Expo Inbox live message updates', () => {
  it.each(['android', 'ios'])(
    'refreshes the conversation and unread total on %s when a message arrives',
    async (platform) => {
      const { renderer } = await renderInbox(platform);
      expect(textValues(renderer)).toContain('Avery: the old plan');
      expect(fixtures.streamConnections).toHaveLength(1);
      expect(fixtures.streamConnections[0].url).toBe(
        'https://api.runbuddy.test/api/messages/events',
      );
      expect(fixtures.streamConnections[0].init.headers).toEqual({
        Accept: 'text/event-stream',
        Authorization: 'Bearer token-a',
      });
      expect(fixtures.inboxOptions.refetchInterval).toBe(15_000);
      expect(fixtures.unreadOptions.refetchInterval).toBe(15_000);
      expect(fixtures.inboxOptions.queryKey).toEqual([
        '/api/messages/inbox',
        'account-a',
      ]);
      expect(fixtures.unreadOptions.queryKey).toEqual([
        '/api/messages/unread-count',
        'account-a',
      ]);

      fixtures.inboxPayload = makeConversation('Avery: new route details', 2);
      fixtures.unreadPayload = { count: 2 };
      await act(async () => {
        fixtures.streamConnections[0].push(
          'event: unread-count\ndata: {}\n\n',
        );
        await settle();
      });

      expect(textValues(renderer)).toContain('Avery: new route details');
      expect(textValues(renderer).some((value) => value.includes('2 unread messages'))).toBe(true);
      expect(fixtures.fetchInbox).toHaveBeenCalledTimes(2);
      expect(fixtures.fetchUnread).toHaveBeenCalledTimes(2);
    },
  );

  it('closes the previous account stream and ignores its late events after switching accounts', async () => {
    const { renderer, renderApp } = await renderInbox('android');
    const firstConnection = fixtures.streamConnections[0];
    expect(textValues(renderer)).toContain('Avery: the old plan');

    fixtures.auth.token = 'token-b';
    fixtures.identity.userId = 'account-b';
    fixtures.identity.runnerId = 20;
    fixtures.inboxPayload = makeConversation('B account conversation', 0);
    fixtures.unreadPayload = { count: 0 };
    await act(async () => {
      renderer.update(renderApp());
      await settle();
    });
    await act(async () => {
      await settle();
    });

    expect(firstConnection.init.signal.aborted).toBe(true);
    expect(fixtures.streamConnections).toHaveLength(2);
    expect(fixtures.streamConnections[1].init.headers.Authorization).toBe(
      'Bearer token-b',
    );
    expect(textValues(renderer)).toContain('B account conversation');
    expect(textValues(renderer)).not.toContain('Avery: the old plan');

    const callsAfterSwitch = fixtures.fetchInbox.mock.calls.length;
    await act(async () => {
      firstConnection.push('event: unread-count\ndata: {}\n\n');
      await settle();
    });
    expect(fixtures.fetchInbox).toHaveBeenCalledTimes(callsAfterSwitch);

    fixtures.inboxPayload = makeConversation('B account new message', 1);
    fixtures.unreadPayload = { count: 1 };
    await act(async () => {
      fixtures.streamConnections[1].push(
        'event: unread-count\ndata: {}\n\n',
      );
      await settle();
    });
    expect(textValues(renderer)).toContain('B account new message');
    expect(textValues(renderer).some((value) => value.includes('1 unread message'))).toBe(true);
  });
});
