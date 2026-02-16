import { useState, useEffect } from 'react';
import { useGetAllReels } from '../hooks/useQueries';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, RefreshCw, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ReelCard from '../components/ReelCard';
import CreateReelDialog from '../components/CreateReelDialog';
import type { Principal } from '@icp-sdk/core/principal';

interface ReelsPageProps {
  onViewProfile: (userId: Principal) => void;
}

export default function ReelsPage({ onViewProfile }: ReelsPageProps) {
  const { data: reels, isLoading, isFetching, error } = useGetAllReels();
  const [showCreateReel, setShowCreateReel] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const interval = setInterval(() => {
      queryClient.invalidateQueries({ queryKey: ['allReels'] });
    }, 30000);

    return () => clearInterval(interval);
  }, [queryClient]);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['allReels'] });
  };

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-2xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/assets/generated/reels-icon-transparent.dim_64x64.png"
            alt="Reels"
            className="h-10 w-10"
          />
          <h2 className="text-2xl font-bold">Reels</h2>
        </div>
        <div className="flex gap-2">
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            size="icon"
            disabled={isFetching}
            title="Refresh reels"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <Button onClick={() => setShowCreateReel(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Create Reel
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Backend Feature Unavailable</AlertTitle>
          <AlertDescription>
            The reels feed feature is currently unavailable. The backend needs to be updated with the required methods.
          </AlertDescription>
        </Alert>
      )}

      {reels && reels.length > 0 ? (
        <div className="space-y-6">
          {reels.map((reel) => (
            <ReelCard key={reel.id} reel={reel} showDelete={false} onViewProfile={onViewProfile} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <img
            src="/assets/generated/video-upload-icon-transparent.dim_32x32.png"
            alt="No reels"
            className="mb-4 h-16 w-16 opacity-50"
          />
          <h3 className="mb-2 text-lg font-semibold">No reels yet</h3>
          <p className="mb-4 text-muted-foreground">
            {error ? 'Reels feature is currently unavailable.' : 'Be the first to share a reel!'}
          </p>
          {!error && (
            <Button onClick={() => setShowCreateReel(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Create Reel
            </Button>
          )}
        </div>
      )}

      <CreateReelDialog open={showCreateReel} onOpenChange={setShowCreateReel} />
    </div>
  );
}

