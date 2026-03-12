import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '../../../utils/supabase/info';

// Singleton Supabase client
let _client: SupabaseClient | null = null;
function getSupabase() {
  if (!_client) {
    _client = createClient(
      `https://${projectId}.supabase.co`,
      publicAnonKey,
    );
  }
  return _client;
}

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  token: string | null;
  isAdmin: boolean;
  loading: boolean;
  /** Always returns a fresh (auto-refreshed) access token — use for API calls */
  getToken: () => Promise<string | null>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabase();

    // getSession() reads the locally stored session and auto-refreshes the
    // access token via the refresh token if it has expired.
    // We intentionally do NOT call getUser() here — that validates against
    // Supabase's active-session store and can return "Auth session missing!"
    // even for valid cached sessions, causing spurious sign-outs.
    // Server-side adminAuth now validates JWTs cryptographically, so a
    // deleted-user JWT will be rejected there instead.
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes (token refresh, sign-in, sign-out)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      },
    );

    return () => subscription.unsubscribe();
  }, []);

  /**
   * Returns a fresh (auto-refreshed) access token for admin API calls.
   * getSession() handles silent token refresh via the refresh token — no
   * extra getUser() network call needed. Server-side adminAuth validates JWTs
   * cryptographically, so expired / invalid tokens are rejected there.
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;
    return data.session.access_token;
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`Erro ao fazer login: ${error.message}`);
    setSession(data.session);
    setUser(data.user);
  }, []);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        token: session?.access_token ?? null,
        isAdmin: !!user,
        loading,
        getToken,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}