import { useInternetIdentity } from '../hooks/useInternetIdentity';
import { Button } from '@/components/ui/button';
import { LogIn, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, loginStatus } = useInternetIdentity();

  const isLoggingIn = loginStatus === 'logging-in';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-background to-accent/20 p-4">
      <div className="w-full max-w-md space-y-8 text-center">
        <div className="space-y-4">
          <div className="mx-auto flex h-32 w-32 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500 via-purple-500 to-orange-500 p-1 shadow-2xl">
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-background">
              <img
                src="/assets/Pi7-Image-Cropper (1)-1.png"
                alt="Fabegram Logo"
                className="h-24 w-24 rounded-2xl object-cover p-2"
              />
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight text-foreground">
            Fabegram
          </h1>
          <p className="text-lg text-muted-foreground">
            Share moments, connect with friends, chat instantly
          </p>
        </div>

        <div className="space-y-4 rounded-2xl border bg-card p-8 shadow-xl">
          <div className="space-y-2">
            <h2 className="text-2xl font-semibold">Welcome!</h2>
            <p className="text-sm text-muted-foreground">
              Sign in to start sharing and chatting
            </p>
          </div>

          <Button
            onClick={login}
            disabled={isLoggingIn}
            size="lg"
            className="w-full text-lg"
          >
            {isLoggingIn ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-5 w-5" />
                Sign in with Internet Identity
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          By signing in, you agree to our terms and privacy policy
        </p>
      </div>
    </div>
  );
}
