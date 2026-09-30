import { useEffect, useState } from "react";
import { useAuth } from "@clerk/react";
import {
  getGetCurrentRunnerQueryKey,
  useGetCurrentRunner,
} from "@workspace/api-client-react";

const STORAGE_KEY = "runbuddy_my_runner_id";
const CLEARED_VALUE = "__cleared__";

interface IdentityState {
  userId: string | null;
  runnerId: number | null;
  ready: boolean;
  explicitlyCleared: boolean;
}

export function useIdentity() {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [identity, setIdentity] = useState<IdentityState>({
    userId: null,
    runnerId: null,
    ready: false,
    explicitlyCleared: false,
  });
  const storageKey = userId ? `${STORAGE_KEY}:${userId}` : null;
  const belongsToCurrentUser = identity.userId === userId;
  const myRunnerId = belongsToCurrentUser ? identity.runnerId : null;

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId || !storageKey) {
      setIdentity({
        userId: null,
        runnerId: null,
        ready: true,
        explicitlyCleared: false,
      });
      return;
    }

    const stored = localStorage.getItem(storageKey);
    if (stored === CLEARED_VALUE) {
      setIdentity({
        userId,
        runnerId: null,
        ready: true,
        explicitlyCleared: true,
      });
      return;
    }

    const runnerId = stored ? Number(stored) : null;
    setIdentity({
      userId,
      runnerId:
        runnerId !== null && Number.isSafeInteger(runnerId) && runnerId > 0
          ? runnerId
          : null,
      ready: true,
      explicitlyCleared: false,
    });
  }, [isLoaded, isSignedIn, storageKey, userId]);

  const shouldResolveRunner =
    isLoaded &&
    isSignedIn === true &&
    Boolean(userId) &&
    identity.userId === userId &&
    identity.ready &&
    identity.runnerId === null &&
    !identity.explicitlyCleared;

  const { data: currentRunner } = useGetCurrentRunner({
    query: {
      enabled: shouldResolveRunner,
      queryKey: [...getGetCurrentRunnerQueryKey(), userId],
    },
  });

  useEffect(() => {
    const runnerId = currentRunner?.runnerId;
    if (
      runnerId === null ||
      runnerId === undefined ||
      !userId ||
      !storageKey ||
      identity.userId !== userId ||
      identity.runnerId !== null ||
      identity.explicitlyCleared
    ) {
      return;
    }

    localStorage.setItem(storageKey, String(runnerId));
    setIdentity({
      userId,
      runnerId,
      ready: true,
      explicitlyCleared: false,
    });
  }, [currentRunner, identity, storageKey, userId]);

  const setMyRunnerId = (id: number | null) => {
    if (!isLoaded || !isSignedIn || !userId || !storageKey) return;

    if (id === null) {
      localStorage.setItem(storageKey, CLEARED_VALUE);
    } else {
      localStorage.setItem(storageKey, String(id));
    }
    setIdentity({
      userId,
      runnerId: id,
      ready: true,
      explicitlyCleared: id === null,
    });
  };

  return { myRunnerId, setMyRunnerId };
}
