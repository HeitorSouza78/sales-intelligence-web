import { type ReactNode, useCallback, useEffect, useState } from 'react';
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  type PublicUser,
  registerUser,
} from '../services/api';
import {
  AUTH_SESSION_EXPIRED_EVENT,
  clearAuthTokens,
  getAccessToken,
  getRefreshToken,
} from '../services/authStorage';
import { AuthContext } from './authContext';

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isBootstrapping, setIsBootstrapping] = useState<boolean>(() =>
    Boolean(getAccessToken() || getRefreshToken()),
  );

  useEffect(() => {
    const handleSessionExpired = () => {
      setUser(null);
    };

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(
        AUTH_SESSION_EXPIRED_EVENT,
        handleSessionExpired,
      );
    };
  }, []);

  useEffect(() => {
    if (!getAccessToken() && !getRefreshToken()) {
      return;
    }

    let active = true;
    fetchCurrentUser()
      .then((profile) => {
        if (active) {
          setUser(profile);
        }
      })
      .catch(() => {
        if (active) {
          clearAuthTokens(false);
          setUser(null);
        }
      })
      .finally(() => {
        if (active) {
          setIsBootstrapping(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(
    async (input: { email: string; password: string }) => {
      const response = await loginUser(input);
      setUser(response.user);
      setIsBootstrapping(false);
    },
    [],
  );

  const register = useCallback(
    async (input: { name: string; email: string; password: string }) => {
      const response = await registerUser(input);
      setUser(response.user);
      setIsBootstrapping(false);
    },
    [],
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: user !== null,
        isBootstrapping,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
