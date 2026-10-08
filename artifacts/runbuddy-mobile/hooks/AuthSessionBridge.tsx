import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@clerk/expo';
import { setAuthTokenGetter } from '@workspace/api-client-react';

export function AuthSessionBridge() {
  const { getToken, isLoaded, userId } = useAuth();
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    setAuthTokenGetter(() => getToken());
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;

    const currentUserId = userId ?? null;
    if (
      previousUserId.current !== undefined &&
      previousUserId.current !== currentUserId
    ) {
      queryClient.clear();
    }
    previousUserId.current = currentUserId;
  }, [isLoaded, queryClient, userId]);

  return null;
}
