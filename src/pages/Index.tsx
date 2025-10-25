import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import Dashboard from "./Dashboard";
import Auth from "./Auth";
import { Loader2 } from "lucide-react";
import { shouldBypassAuth, getDevUserId, getDevUserEmail, getGuestUserId, getGuestUserEmail, isGuestUser } from "@/lib/devMode";

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if we should bypass auth in development or guest mode
    if (shouldBypassAuth()) {
      const isGuest = isGuestUser();
      console.log(`🚀 ${isGuest ? 'Guest mode' : 'Development mode'}: Bypassing authentication`);
      
      // Create a mock session for development or guest mode
      const mockSession: Session = {
        access_token: isGuest ? 'guest-token' : 'dev-token',
        refresh_token: isGuest ? 'guest-refresh-token' : 'dev-refresh-token',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        token_type: 'bearer',
        user: {
          id: isGuest ? getGuestUserId() : getDevUserId(),
          email: isGuest ? getGuestUserEmail() : getDevUserEmail(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          aud: 'authenticated',
          role: 'authenticated',
          email_confirmed_at: new Date().toISOString(),
          last_sign_in_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          identities: [],
          factors: [],
        }
      };
      
      setSession(mockSession);
      setLoading(false);
      return;
    }

    // Check for guest session in localStorage (from manual guest login)
    const guestSession = localStorage.getItem('supabase.auth.token');
    if (guestSession) {
      try {
        const parsedSession = JSON.parse(guestSession);
        if (parsedSession.user && parsedSession.user.id === 'guest-user-demo') {
          console.log('🚀 Found guest session in localStorage');
          setSession(parsedSession);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.warn('Failed to parse guest session from localStorage:', error);
        localStorage.removeItem('supabase.auth.token');
      }
    }

    // Normal authentication flow for production
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return session ? <Dashboard /> : <Auth />;
};

export default Index;
