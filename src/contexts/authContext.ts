import { createContext } from 'react';
import type { PublicUser } from '../services/api';

export interface AuthContextValue {
  user: PublicUser | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  login: (input: { email: string; password: string }) => Promise<void>;
  register: (input: {
    name: string;
    email: string;
    password: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
