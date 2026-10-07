import { useAuth } from "@clerk/react";
import {
  getGetCurrentRunnerQueryKey,
  useGetCurrentRunner,
} from "@workspace/api-client-react";

export function useIdentity() {
  const { isLoaded, isSignedIn, userId } = useAuth({
    treatPendingAsSignedOut: false,
  });
  const authResolved = isLoaded && isSignedIn !== null;
  const shouldResolveRunner =
    authResolved && isSignedIn === true && Boolean(userId);
  const currentRunnerQuery = useGetCurrentRunner({
    query: {
      enabled: shouldResolveRunner,
      queryKey: [...getGetCurrentRunnerQueryKey(), userId],
    },
  });

  return {
    myRunnerId: shouldResolveRunner
      ? currentRunnerQuery.data?.runnerId ?? null
      : null,
    isLoading:
      !authResolved ||
      (isSignedIn === true && !userId) ||
      (shouldResolveRunner && currentRunnerQuery.isLoading),
    isError: shouldResolveRunner && currentRunnerQuery.isError,
  };
}
