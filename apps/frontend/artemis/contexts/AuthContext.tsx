'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  companyId?: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is authenticated on mount
  useEffect(() => {
    checkAuth();
  }, []);

  // Save access token to localStorage when it changes
  useEffect(() => {
    if (accessToken) {
      localStorage.setItem('accessToken', accessToken);
    } else {
      localStorage.removeItem('accessToken');
    }
  }, [accessToken]);

  // Set up token refresh interval
  useEffect(() => {
    if (!accessToken) return;

    // Refresh token every 10 minutes (access token expires in 15)
    const interval = setInterval(() => {
      refreshToken();
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [accessToken]);

  async function checkAuth() {
    try {
      // Load access token from localStorage
      const storedToken = localStorage.getItem('accessToken');
      if (storedToken) {
        setAccessToken(storedToken);
      }

      const response = await fetch('http://localhost:3001/api/auth/me', {
        credentials: 'include',
        headers: storedToken ? {
          'Authorization': `Bearer ${storedToken}`,
        } : {},
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Try to refresh token
        const refreshed = await refreshToken();
        if (!refreshed) {
          setUser(null);
          setAccessToken(null);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
      setUser(null);
      setAccessToken(null);
    } finally {
      setIsLoading(false);
    }
  }

  async function login(email: string, password: string) {
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Login failed');
    }

    const data = await response.json();
    setUser(data.user);
    setAccessToken(data.accessToken);

    // Claim any anonymous sessions
    const tempSessionId = sessionStorage.getItem('temp_session_id');
    if (tempSessionId) {
      try {
        await fetch('http://localhost:3001/api/chat/claim-sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${data.accessToken}`,
          },
          credentials: 'include',
          body: JSON.stringify({ tempSessionId }),
        });
        sessionStorage.removeItem('temp_session_id');
      } catch (error) {
        console.error('Failed to claim sessions:', error);
      }
    }
  }

  async function logout() {
    try {
      await fetch('http://localhost:3001/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (error) {
      console.error('Logout failed:', error);
    } finally {
      setUser(null);
      setAccessToken(null);
    }
  }

  async function refreshToken(): Promise<boolean> {
    try {
      const response = await fetch('http://localhost:3001/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      setAccessToken(data.accessToken);

      // Recheck user data
      const meResponse = await fetch('http://localhost:3001/api/auth/me', {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${data.accessToken}`,
        },
      });

      if (meResponse.ok) {
        const meData = await meResponse.json();
        setUser(meData.user);
      }

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
