import { useAuth } from '@clerk/expo';
import {
  getGetCurrentRunnerQueryKey,
  useGetCurrentRunner,
} from '@workspace/api-client-react';

export function useRunnerIdentity() {
  const { isLoaded, isSignedIn } = useAuth();
  const query = useGetCurrentRunner({
    query: {
      queryKey: getGetCurrentRunnerQueryKey(),
      enabled: Boolean(isLoaded && isSignedIn),
    },
  });

  return {
    ...query,
    authLoaded: Boolean(isLoaded),
    signedIn: Boolean(isSignedIn),
    runnerId: query.data?.runnerId ?? null,
  };
}