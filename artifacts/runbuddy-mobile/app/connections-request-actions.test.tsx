import React from 'react';
import {
  act,
  create,
  type ReactTestInstance,
  type ReactTestRenderer,
} from 'react-test-renderer';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ConnectionsScreen from './(tabs)/connections';
import RunnerDetailScreen from './runner/[id]';

const fixtures = vi.hoisted(() => ({
  runnerId: 20,
  profileId: 10,
  connections: [] as Array<Record<string, any>>,
  runner: null as Record<string, any> | null,
}));
const activeRenderers: ReactTestRenderer[] = [];

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
    Alert: { alert: vi.fn() },
    Image: host('Image'),
    Linking: { openURL: vi.fn() },
    Modal: host('Modal'),
    Platform: { OS: 'ios' },
    Pressable: host('Pressable'),
    RefreshControl: host('RefreshControl'),
    ScrollView: host('ScrollView'),
    StyleSheet: { create: (styles: object) => styles },
    Text: host('Text'),
    TextInput: host('TextInput'),
    View: host('View'),
  };
});

vi.mock('@expo/vector-icons', () => ({
  Feather: () => null,
}));

vi.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light' },
  impactAsync: vi.fn(),
}));

vi.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

vi.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: String(fixtures.profileId) }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
}));

vi.mock('@/hooks/useColors', () => ({
  useColors: () => ({
    background: '#fff',
    card: '#fff',
    border: '#ddd',
    foreground: '#111',
    muted: '#eee',
    mutedForeground: '#555',
    primary: '#1769aa',
    primaryForeground: '#fff',
    secondary: '#ddd',
    secondaryForeground: '#111',
    destructive: '#a00',
    destructiveForeground: '#fff',
    input: '#ddd',
  }),
}));

vi.mock('@/hooks/useRunnerIdentity', () => ({
  useRunnerIdentity: () => ({
    signedIn: true,
    runnerId: fixtures.runnerId,
    isPending: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/components/ui', async () => {
  const ReactModule = await import('react');
  const Native = await import('react-native');
  const label = (text: string) =>
    ReactModule.createElement(Native.Text, null, text);

  return {
    ActionButton: ({
      title,
      onPress,
      testID,
      disabled,
    }: {
      title: string;
      onPress: () => void;
      testID?: string;
      disabled?: boolean;
    }) =>
      ReactModule.createElement(
        Native.Pressable,
        { accessibilityRole: 'button', testID, disabled, onPress },
        label(title),
      ),
    BrandHeader: ({ title, subtitle }: { title: string; subtitle?: string }) =>
      ReactModule.createElement(
        Native.View,
        null,
        label(title),
        subtitle ? label(subtitle) : null,
      ),
    EmptyState: ({ title, detail }: { title: string; detail: string }) =>
      ReactModule.createElement(
        Native.View,
        null,
        label(title),
        label(detail),
      ),
    ErrorState: ({ message }: { message: string }) => label(message),
    LoadingState: ({ label: text }: { label: string }) => label(text),
    Page: ({ children }: { children: React.ReactNode }) =>
      ReactModule.createElement(Native.View, null, children),
    Pill: ({ label: text }: { label: string }) => label(text),
    RunnerAvatar: () => null,
    errorMessage: (_error: unknown, fallback: string) => fallback,
    experienceLabel: () => 'Intermediate runner',
    locationLabel: (city?: string, country?: string) =>
      [city, country].filter(Boolean).join(', '),
  };
});

vi.mock('@workspace/api-client-react', async () => {
  const { useQuery } = await import('@tanstack/react-query');
  const key = ['test-connections'];

  return {
    getGetRunnerQueryKey: (id: number) => ['test-runner', id],
    getListConnectionsQueryKey: () => key,
    getListRunnerBlocksQueryKey: () => ['test-blocks'],
    useCreateConnection: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useCreateRunnerBlock: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useCreateRunnerReport: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useDeleteConnection: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useDeleteRunnerBlock: () => ({ mutateAsync: vi.fn(), isPending: false }),
    useGetRunner: () => ({
      data: fixtures.runner,
      isPending: false,
      isError: false,
      refetch: vi.fn(),
    }),
    useListConnections: (_params: unknown, options: { query?: { enabled?: boolean; queryKey?: unknown[] } }) =>
      useQuery({
        queryKey: options.query?.queryKey ?? key,
        queryFn: async () => fixtures.connections.map((connection) => ({ ...connection })),
        enabled: options.query?.enabled ?? true,
      }),
    useListRunnerBlocks: () => ({ data: [], isError: false, refetch: vi.fn() }),
    useUpdateConnection: () => ({
      isPending: false,
      mutateAsync: async ({ id, data }: { id: number; data: { status: 'accepted' | 'declined' } }) => {
        fixtures.connections = fixtures.connections.map((connection) =>
          connection.id === id ? { ...connection, status: data.status } : connection,
        );
        return fixtures.connections.find((connection) => connection.id === id);
      },
    }),
  };
});

function makeConnection(status: string = 'pending') {
  return {
    id: 41,
    fromRunnerId: 10,
    toRunnerId: 20,
    type: 'buddy',
    status,
    message: 'Let’s run together',
    fromRunner: {
      id: 10,
      name: 'Jamie Sender',
      profileType: 'individual',
      city: 'Portland',
      country: 'US',
      experience: 'intermediate',
    },
    toRunner: {
      id: 20,
      name: 'Riley Recipient',
      profileType: 'individual',
      city: 'Seattle',
      country: 'US',
      experience: 'intermediate',
    },
  };
}

function makeRunner(id: number) {
  return {
    id,
    name: id === 10 ? 'Jamie Sender' : 'Riley Recipient',
    profileType: 'individual',
    gender: 'female',
    city: 'Portland',
    country: 'US',
    experience: 'intermediate',
    trackingApps: {},
  };
}

async function renderScreen(screen: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0 } },
  });
  let renderer!: ReactTestRenderer;
  await act(() => {
    renderer = create(
      <QueryClientProvider client={queryClient}>{screen}</QueryClientProvider>,
    );
  });
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });
  activeRenderers.push(renderer);

  const renderSummary = () =>
    renderer.root
      .findAll((node) => typeof node.type === 'string')
      .map((node) => ({
        type: String(node.type),
        text: node.children.filter((child) => typeof child === 'string').join(''),
        testID: node.props.testID,
      }));
  const getByTestId = (testID: string) => {
    try {
      return renderer.root.findByProps({ testID });
    } catch {
      throw new Error(
        `Could not find testID ${testID}. Rendered nodes: ${JSON.stringify(renderSummary())}`,
      );
    }
  };
  const queryByTestId = (testID: string) => {
    try {
      return getByTestId(testID);
    } catch {
      return null;
    }
  };
  const getByText = (text: string) => {
    const match = renderer.root.findAll(
      (node: ReactTestInstance) =>
        String(node.type) === 'Text' && node.children.join('') === text,
    )[0];
    if (!match) {
      throw new Error(
        `Could not find rendered text ${text}. Rendered nodes: ${JSON.stringify(renderSummary())}`,
      );
    }
    return match;
  };

  return { renderer, queryClient, getByTestId, queryByTestId, getByText };
}

function renderConnections() {
  return renderScreen(<ConnectionsScreen />);
}

function renderRunnerProfile() {
  return renderScreen(<RunnerDetailScreen />);
}

beforeEach(() => {
  fixtures.runnerId = 20;
  fixtures.profileId = 10;
  fixtures.connections = [makeConnection()];
  fixtures.runner = makeRunner(10);
});

afterEach(() => {
  for (const renderer of activeRenderers.splice(0)) {
    act(() => renderer.unmount());
  }
});

describe('mobile connection request actions', () => {
  it('shows accept and decline on Connections only to the pending request recipient', async () => {
    const { getByTestId } = await renderConnections();

    expect(getByTestId('accept-request-41')).toBeTruthy();
    expect(getByTestId('decline-request-41')).toBeTruthy();
  });

  it('shows the sender a waiting state without response actions on Connections', async () => {
    fixtures.runnerId = 10;
    const { getByText, queryByTestId } = await renderConnections();

    expect(getByText('Waiting for a reply')).toBeTruthy();
    expect(queryByTestId('accept-request-41')).toBeNull();
    expect(queryByTestId('decline-request-41')).toBeNull();
  });

  it.each([
    { actorId: 10, status: 'accepted' },
    { actorId: 20, status: 'accepted' },
    { actorId: 10, status: 'declined' },
    { actorId: 20, status: 'declined' },
  ])(
    'does not show response actions on Connections for runner $actorId after a request is $status',
    async ({ actorId, status }) => {
      fixtures.runnerId = actorId;
      fixtures.connections = [makeConnection(status)];
      const { queryByTestId } = await renderConnections();

      expect(queryByTestId('accept-request-41')).toBeNull();
      expect(queryByTestId('decline-request-41')).toBeNull();
      expect(queryByTestId('message-buddy-41') !== null).toBe(status === 'accepted');
    },
  );

  it('refreshes Connections after a successful accept', async () => {
    const { renderer, getByTestId, queryByTestId } = await renderConnections();

    await act(async () => {
      getByTestId('accept-request-41').props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(renderer.root.findByProps({ testID: 'message-buddy-41' })).toBeTruthy();
    expect(queryByTestId('accept-request-41')).toBeNull();
    expect(queryByTestId('decline-request-41')).toBeNull();
  });

  it('shows accept and decline on a runner profile only to the pending request recipient', async () => {
    fixtures.runnerId = 20;
    fixtures.profileId = 10;
    fixtures.runner = makeRunner(10);
    const { getByTestId } = await renderRunnerProfile();

    expect(getByTestId('accept-request-41')).toBeTruthy();
    expect(getByTestId('decline-request-41')).toBeTruthy();
  });

  it('shows the sender a waiting state without response actions on a runner profile', async () => {
    fixtures.runnerId = 10;
    fixtures.profileId = 20;
    fixtures.runner = makeRunner(20);
    const { getByTestId, queryByTestId } = await renderRunnerProfile();

    expect(getByTestId('waiting-for-reply-41')).toBeTruthy();
    expect(queryByTestId('accept-request-41')).toBeNull();
    expect(queryByTestId('decline-request-41')).toBeNull();
  });

  it.each([
    { actorId: 10, profileId: 20, status: 'accepted' },
    { actorId: 20, profileId: 10, status: 'accepted' },
    { actorId: 10, profileId: 20, status: 'declined' },
    { actorId: 20, profileId: 10, status: 'declined' },
  ])(
    'does not show response actions on runner $profileId’s profile for runner $actorId after a request is $status',
    async ({ actorId, profileId, status }) => {
      fixtures.connections = [makeConnection(status)];
      fixtures.runnerId = actorId;
      fixtures.profileId = profileId;
      fixtures.runner = makeRunner(profileId);
      const { queryByTestId, getByText } = await renderRunnerProfile();

      expect(queryByTestId('accept-request-41')).toBeNull();
      expect(queryByTestId('decline-request-41')).toBeNull();
      if (status === 'declined') {
        expect(getByText('This request was declined')).toBeTruthy();
      } else {
        expect(getByText('Message this runner')).toBeTruthy();
      }
    },
  );

  it('refreshes a runner profile after a successful accept', async () => {
    fixtures.runnerId = 20;
    fixtures.profileId = 10;
    fixtures.runner = makeRunner(10);
    const { renderer, getByTestId, queryByTestId } = await renderRunnerProfile();

    await act(async () => {
      getByTestId('accept-request-41').props.onPress();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    expect(
      renderer.root.findAll(
        (node: ReactTestInstance) =>
          String(node.type) === 'Text' &&
          node.children.join('') === 'Message this runner',
      ),
    ).not.toHaveLength(0);
    expect(queryByTestId('accept-request-41')).toBeNull();
    expect(queryByTestId('decline-request-41')).toBeNull();
  });
});
