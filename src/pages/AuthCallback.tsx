import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const AuthCallback = () => {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the code from URL query params (PKCE flow)
        const params = new URLSearchParams(window.location.search);
        const code = params.get('code');

        // Also check for hash-based tokens (implicit flow fallback)
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (code) {
          // PKCE flow: exchange the code for a session
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error('Code exchange failed:', exchangeError);
            setError(exchangeError.message);
            // Redirect to auth page after a delay so user can try manual login
            setTimeout(() => navigate('/auth'), 3000);
            return;
          }
        } else if (accessToken && refreshToken) {
          // Implicit flow: set the session directly
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) {
            console.error('Session set failed:', sessionError);
            setError(sessionError.message);
            setTimeout(() => navigate('/auth'), 3000);
            return;
          }
        } else {
          // No auth params found — check if there's already a session
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) {
            setError('No authentication code found. Please try logging in manually.');
            setTimeout(() => navigate('/auth'), 3000);
            return;
          }
        }

        // Success — redirect to dashboard
        navigate('/dashboard');
      } catch (err: any) {
        console.error('Auth callback error:', err);
        setError(err.message || 'Authentication failed');
        setTimeout(() => navigate('/auth'), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle">
      <div className="text-center space-y-4">
        {error ? (
          <>
            <div className="text-destructive text-lg font-medium">
              Authentication failed: {error}
            </div>
            <p className="text-muted-foreground">
              Redirecting to login page...
            </p>
          </>
        ) : (
          <>
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground text-lg">
              Confirming your account...
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;
