"use client";

import { useEffect, useState } from "react";

export type CurrentUser = {
  id:   string;
  name: string;
  role: string;
  type: string;
};

type State = {
  user:          CurrentUser | null;
  loading:       boolean;
  authenticated: boolean;
};

export function useCurrentUser(): State {
  const [state, setState] = useState<State>({
    user:          null,
    loading:       true,
    authenticated: false,
  });

  useEffect(() => {
    fetch("/api/auth/me", { credentials: "include" })
      .then((r) => r.json())
      .then((data) => {
        setState({
          user:          data.authenticated ? (data.user as CurrentUser) : null,
          loading:       false,
          authenticated: !!data.authenticated,
        });
      })
      .catch(() => {
        setState({ user: null, loading: false, authenticated: false });
      });
  }, []);

  return state;
}
