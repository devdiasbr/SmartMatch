import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { createClient, type SupabaseClient, type Session, type User } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from '/utils/supabase/info';

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

    // Validate user actually exists on the server (not just cached JWT).
    // getSession() only reads local storage; getUser() hits the auth server
    // and catches "user from sub claim does not exist" before any API call.
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Validate the user still exists in auth.users
        const { data: { user }, error } = await supabase.auth.getUser(session.access_token);
        if (error || !user) {
          console.warn('[Auth] Session JWT references a deleted user — signing out. Error:', error?.message);
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setLoading(false);
          return;
        }
        setSession(session);
        setUser(user);
      } else {
        setSession(null);
        setUser(null);
      }
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
   * Always fetches a fresh session from Supabase (which auto-refreshes if expired).
   * Use this before any admin API call to avoid 401 due to stale token.
   */
  const getToken = useCallback(async (): Promise<string | null> => {
    const supabase = getSupabase();
    const { data, error } = await supabase.auth.getSession();
    if (error || !data.session) return null;

    // Validate user still exists — if deleted, sign out immediately
    const { error: userErr } = await supabase.auth.getUser(data.session.access_token);
    if (userErr) {
      console.warn('[Auth] getToken: user no longer exists — signing out. Error:', userErr.message);
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      return null;
    }

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