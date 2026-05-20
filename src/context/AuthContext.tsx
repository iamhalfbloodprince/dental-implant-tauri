import * as api from "@/api/commands";
import type { AuthStatus } from "@/types/domain";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type AuthCtx = {
  status: AuthStatus | null;
  loading: boolean;
  refresh: () => Promise<void>;
  login: (password: string) => Promise<void>;
  logout: () => Promise<void>;
  setup: (password: string) => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const s = await api.authStatus();
    setStatus(s);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  const login = useCallback(
    async (password: string) => {
      await api.authLogin(password);
      await refresh();
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await api.authLogout();
    await refresh();
  }, [refresh]);

  const setup = useCallback(
    async (password: string) => {
      await api.authSetup(password);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({ status, loading, refresh, login, logout, setup }),
    [status, loading, refresh, login, logout, setup],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useAuth outside provider");
  return v;
}
