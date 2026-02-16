import { useInternetIdentity } from './hooks/useInternetIdentity';
import { useGetCallerUserProfile } from './hooks/useQueries';
import { ThemeProvider } from 'next-themes';
import { Toaster } from '@/components/ui/sonner';
import LoginPage from './pages/LoginPage';
import ProfileSetupModal from './components/ProfileSetupModal';
import MainLayout from './components/MainLayout';
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

export default function App() {
  const { identity, isInitializing } = useInternetIdentity();
  const queryClient = useQueryClient();
  const { 
    data: userProfile, 
    isLoading: profileLoading, 
    isFetched,
    error: profileError,
    refetch: refetchProfile
  } = useGetCallerUserProfile();

  const isAuthenticated = !!identity;

  // Re-fetch profile when coming back online or after reconnection
  useEffect(() => {
    if (isAuthenticated && !isInitializing) {
      const handleOnline = () => {
        refetchProfile();
      };

      window.addEventListener('online', handleOnline);
      return () => window.removeEventListener('online', handleOnline);
    }
  }, [isAuthenticated, isInitializing, refetchProfile]);

  // Show profile setup modal when:
  // 1. User is authenticated
  // 2. Profile query has completed (isFetched)
  // 3. Profile is null (doesn't exist)
  // 4. Not currently loading
  const showProfileSetup = isAuthenticated && isFetched && userProfile === null && !profileLoading;

  // Show loading screen only during initial authentication check
  if (isInitializing) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading Fabegram...</p>
          </div>
        </div>
      </ThemeProvider>
    );
  }

  // Not authenticated - show login page
  if (!isAuthenticated) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <LoginPage />
        <Toaster />
      </ThemeProvider>
    );
  }

  // Authenticated but profile is loading for the first time
  if (profileLoading && !isFetched) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <div className="flex h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
          <div className="flex flex-col items-center gap-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            <p className="text-muted-foreground">Loading your profile...</p>
          </div>
        </div>
        <Toaster />
      </ThemeProvider>
    );
  }

  // Profile error - show setup modal as fallback
  if (profileError && isFetched) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ProfileSetupModal />
        <Toaster />
      </ThemeProvider>
    );
  }

  // Show profile setup modal if needed
  if (showProfileSetup) {
    return (
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <ProfileSetupModal />
        <Toaster />
      </ThemeProvider>
    );
  }

  // Main app - profile exists
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <MainLayout />
      <Toaster />
    </ThemeProvider>
  );
}
