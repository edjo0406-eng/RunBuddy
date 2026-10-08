import { useAuth } from '@clerk/expo';
import {
  getGetCurrentRunnerQueryKey,
  useGetCurrentRunner,
} from '@workspace/api-client-react';

export function useRunnerIdentity() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const query = useGetCurrentRunner({
    query: {
      queryKey: [...getGetCurrentRunnerQueryKey(), userId ?? null],
      enabled: Boolean(isLoaded && isSignedIn && userId),
    },
  });

  return {
    ...query,
    authLoaded: Boolean(isLoaded),
    signedIn: Boolean(isSignedIn),
    userId: userId ?? null,
    runnerId: query.data?.runnerId ?? null,
  };
}