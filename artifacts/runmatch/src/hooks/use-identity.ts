import { useState, useEffect } from "react";

const STORAGE_KEY = "runbuddy_my_runner_id";

export function useIdentity() {
  const [myRunnerId, setMyRunnerIdState] = useState<number | null>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });

  const setMyRunnerId = (id: number | null) => {
    if (id === null) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, String(id));
    }
    setMyRunnerIdState(id);
  };

  return { myRunnerId, setMyRunnerId };
}
