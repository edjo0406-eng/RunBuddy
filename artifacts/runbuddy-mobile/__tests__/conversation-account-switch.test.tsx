import React from 'react';
import {
  act,
  create,
  type ReactTestRenderer,
} from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthSessionBridge } from '../hooks/AuthSessionBridge';
import ConversationScreen from '../app/conversation/[otherId]';

const fixtures = vi.hoisted(() => ({
  auth: {
    isLoaded: true as boolean,
    isSignedIn: true as boolean,
    userId: 'account-a' as string | null,
    getToken: vi.fn(async () => 'test-token'),
  },
  fetchCurrentRunner: vi.fn(),
  fetchConversation: vi.fn(),
}));

const activeRenderers: ReactTestRenderer[] = [];

vi.mock('@clerk/expo', () => ({
  useAuth: () => fixtures.auth,
}));

vi.mock('react-native', async () => {
  const ReactModule = await import('react');
  const host = (name: string) => {
    const Component = ({ children, ...props }: Record<string, any>) =>
      ReactModule.createElement(name, props, children);
    Component.displayName = name;
    return Component;
  };

  return {
    ActivityIndicator: host('ActivityIndicator'),
    FlatList: ({
      data,
      renderItem,
      ListEmptyComponent,
      ...props
    }: Record<string, any>) =>
      ReactModule.createElement(
        'FlatList',
        props,
        data.length
          ? data.map((item: { id: number }, index: number) =>
              ReactModule.createElement(
                ReactModule.Fragment,
                { key: String(item.id) },
                renderItem({ item, index }),
              ),
            )
          : ListEmptyComponent,
      ),
    Pressable: host('Pressable'),
    StyleSheet: { create: (styles: object) => styles },
    Text: host('Text'),
    TextInput: host('TextInput'),
    View: host('View'),
  };
});

vi.mock('react-native-keyboard-controller', async () => {
  const ReactModule = await import('react');
  return {
    KeyboardAvoidingView: ({ children, ...props }: Record<string, any>) =>
      ReactModule.createElement('KeyboardAvoidingView', props, children),
  };
});

vi.mock('@expo/vector-icons', () => ({
  Feather: () => null,
}));

vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ otherId: '15' }),
  useRouter: () => ({ back: vi.fn(), push: vi.fn(), replace: vi.fn() }),
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
    destructive: '#a00',
    input: '#ddd',
  }),
}));

vi.mock('@/components/ui', async () => {
  const ReactModule = await import('react');
  const Native = await import('react-native');
  const text = (value: string) =>
    ReactModule.createElement(Native.Text, null, value);

  return {
    ActionButton: () => null,
    EmptyState: ({ title, detail }: { title: string; detail: string }) =>
      ReactModule.createElement(
        Native.View,
        null,
        text(title),
        text(detail),
      ),
    ErrorState: ({ message }: { message: string }) => text(message),
    Page: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(Native.View, null, children),
    RunnerAvatar: () => null,
    errorMessage: (_error: unknown, fallback: string) => fallback,
  };
});

vi.mock('@workspace/api-client-react', async () => {
  const { useMutation, useQuery } = await import('@tanstack/react-query');

  return {
    getGetCurrentRunnerQueryKey: () => ['/api/runners/me'],
    getGetConversationQueryKey: (params: { otherId: number }) => [
      '/api/messages/conversation',
      params,
    ],
    getGetRunnerQueryKey: (runnerId: number) => ['/api/runners', runnerId],
    setAuthTokenGetter: vi.fn(),
    useGetCurrentRunner: (options: { query?: Record<string, any> } = {}) =>
      useQuery({
        queryKey: options.query?.queryKey ?? [],
        enabled: options.query?.enabled,
        queryFn: ({ queryKey }: { queryKey: unknown[] }) =>
          fixtures.fetchCurrentRunner(queryKey.at(-1)),
      }),
    useGetConversation: (
      _params: { otherId: number },
      options: { query?: Record<string, any> } = {},
    ) =>
      useQuery({
        queryKey: options.query?.queryKey ?? [],
        enabled: options.query?.enabled,
        queryFn: ({ queryKey }: { queryKey: unknown[] }) =>
          fixtures.fetchConversation(queryKey.at(-1)),
      }),
    useGetRunner: (
      _runnerId: number,
      options: { query?: Record<string, any> } = {},
    ) =>
      useQuery({
        queryKey: options.query?.queryKey ?? [],
        enabled: options.query?.enabled,
        queryFn: async () => ({
          id: 15,
          name: 'Runner Fifteen',
          profileType: 'individual',
          gender: 'female',
        }),
      }),
    useSendMessage: () =>
      useMutation({ mutationFn: async () => ({ id: 1 }) }),
  };
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function message(id: number, content: string, fromRunnerId: number) {
  return {
    id,
    content,
    fromRunnerId,
    toRunnerId: 15,
    isRead: false,
    createdAt: `2026-10-08T12:00:0${id % 10}.000Z`,
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

beforeEach(() => {
  fixtures.auth.isLoaded = true;
  fixtures.auth.isSignedIn = true;
  fixtures.auth.userId = 'account-a';
  fixtures.fetchCurrentRunner.mockReset();
  fixtures.fetchConversation.mockReset();
});

afterEach(() => {
  for (const renderer of activeRenderers.splice(0)) {
    act(() => renderer.unmount());
  }
});

describe('mobile conversation account switches', () => {
  it('hides account A messages while account B loads and after B receives its conversation', async () => {
    const secondAccountRunner = deferred<{ runnerId: number }>();
    const secondAccountConversation = deferred<
      ReturnType<typeof message>[]
    >();
    const firstMessage = message(101, 'Private message for account A', 10);
    const secondMessage = message(202, 'Conversation for account B', 20);

    fixtures.fetchCurrentRunner.mockImplementation((userId: string) =>
      userId === 'account-a'
        ? Promise.resolve({ runnerId: 10 })
        : secondAccountRunner.promise,
    );
    fixtures.fetchConversation.mockImplementation((userId: string) =>
      userId === 'account-a'
        ? Promise.resolve([firstMessage])
        : secondAccountConversation.promise,
    );

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, staleTime: 0 } },
    });
    let renderer!: ReactTestRenderer;
    const renderApp = () => (
      <QueryClientProvider client={queryClient}>
        <AuthSessionBridge />
        <ConversationScreen />
      </QueryClientProvider>
    );

    await act(() => {
      renderer = create(renderApp());
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });
    activeRenderers.push(renderer);

    expect(textValues(renderer)).toContain(firstMessage.content);

    await act(async () => {
      fixtures.auth.userId = 'account-b';
      renderer.update(renderApp());
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(textValues(renderer)).not.toContain(firstMessage.content);
    expect(fixtures.fetchCurrentRunner).toHaveBeenCalledWith('account-b');

    await act(async () => {
      secondAccountRunner.resolve({ runnerId: 20 });
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(textValues(renderer)).not.toContain(firstMessage.content);
    expect(fixtures.fetchConversation).toHaveBeenCalledWith('account-b');

    await act(async () => {
      secondAccountConversation.resolve([secondMessage]);
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

    expect(textValues(renderer)).toContain(secondMessage.content);
    expect(textValues(renderer)).not.toContain(firstMessage.content);
  });
});
