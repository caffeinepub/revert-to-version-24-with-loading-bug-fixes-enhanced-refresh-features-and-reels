import { useState } from 'react';
import { useCreateReel } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, X } from 'lucide-react';
import { ExternalBlob } from '../backend';

interface CreateReelDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateReelDialog({ open, onOpenChange }: CreateReelDialogProps) {
  const [caption, setCaption] = useState('');
  const [video, setVideo] = useState<ExternalBlob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const createReel = useCreateReel();

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if video is under 60 seconds (optional client-side validation)
    const videoElement = document.createElement('video');
    videoElement.preload = 'metadata';
    videoElement.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoElement.src);
      if (videoElement.duration > 60) {
        alert('Video must be 60 seconds or less');
        return;
      }
    };
    videoElement.src = URL.createObjectURL(file);

    const bytes = new Uint8Array(await file.arrayBuffer());
    const blob = ExternalBlob.fromBytes(bytes).withUploadProgress((percentage) => {
      setUploadProgress(percentage);
    });
    setVideo(blob);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleRemoveVideo = () => {
    setVideo(null);
    setPreviewUrl(null);
    setUploadProgress(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!video) return;

    const trimmedCaption = caption.trim();
    await createReel.mutateAsync({ 
      videoUrl: video, 
      caption: trimmedCaption || null 
    });
    
    setCaption('');
    setVideo(null);
    setPreviewUrl(null);
    setUploadProgress(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Create New Reel</DialogTitle>
          <DialogDescription>Share a short video (up to 60 seconds) with an optional caption</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {previewUrl ? (
            <div className="relative">
              <video
                src={previewUrl}
                controls
                className="w-full rounded-lg object-cover"
                style={{ maxHeight: '400px' }}
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute right-2 top-2"
                onClick={handleRemoveVideo}
              >
                <X className="h-4 w-4" />
              </Button>
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="absolute bottom-2 left-2 right-2 rounded-full bg-background/80 p-2">
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Label
              htmlFor="reel-video"
              className="flex h-64 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted-foreground/25 bg-muted/50 transition-colors hover:border-muted-foreground/50"
            >
              <Upload className="mb-2 h-10 w-10 text-muted-foreground" />
              <span className="text-sm font-medium">Click to upload video</span>
              <span className="mt-1 text-xs text-muted-foreground">MP4, MOV up to 60 seconds</span>
              <input
                id="reel-video"
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoUpload}
              />
            </Label>
          )}

          <div className="space-y-2">
            <Label htmlFor="caption">Caption (optional)</Label>
            <Textarea
              id="caption"
              placeholder="Write a caption..."
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createReel.isPending || !video}
              className="flex-1"
            >
              {createReel.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Posting...
                </>
              ) : (
                'Post Reel'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
