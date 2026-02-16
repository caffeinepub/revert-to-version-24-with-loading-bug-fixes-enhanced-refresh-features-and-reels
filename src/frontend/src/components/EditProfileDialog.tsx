import { useState, useEffect } from 'react';
import { useGetCallerUserProfile, useUpdateProfile } from '../hooks/useQueries';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, Globe, Lock } from 'lucide-react';
import { ExternalBlob } from '../backend';

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EditProfileDialog({ open, onOpenChange }: EditProfileDialogProps) {
  const { data: userProfile } = useGetCallerUserProfile();
  const updateProfile = useUpdateProfile();

  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [displayPic, setDisplayPic] = useState<ExternalBlob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (userProfile) {
      setUsername(userProfile.name);
      setBio(userProfile.bio);
      setIsPublic(userProfile.isPublic);
      setPreviewUrl(
        userProfile.displayPic?.getDirectURL() || '/assets/generated/default-avatar.dim_200x200.png'
      );
    }
  }, [userProfile]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const blob = ExternalBlob.fromBytes(bytes);
    setDisplayPic(blob);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !userProfile) return;

    await updateProfile.mutateAsync({
      userId: userProfile.userId,
      username: username.trim(),
      bio: bio.trim(),
      displayPic: displayPic,
      isPublic,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Profile</DialogTitle>
          <DialogDescription>Update your profile information and privacy settings</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={previewUrl} alt="Profile" />
              <AvatarFallback>{username.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <Label htmlFor="edit-picture" className="cursor-pointer">
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm hover:bg-accent">
                <Upload className="h-4 w-4" />
                Change Photo
              </div>
              <Input
                id="edit-picture"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-userId">User ID</Label>
            <Input
              id="edit-userId"
              value={userProfile?.userId || ''}
              disabled
              className="bg-muted cursor-not-allowed"
            />
            <p className="text-xs text-muted-foreground">User ID cannot be changed after creation</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-username">Username</Label>
            <Input
              id="edit-username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-bio">Bio</Label>
            <Textarea
              id="edit-bio"
              placeholder="Tell us about yourself..."
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="flex items-center gap-3">
              {isPublic ? <Globe className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
              <div>
                <Label htmlFor="edit-privacy" className="cursor-pointer font-medium">
                  {isPublic ? 'Public Profile' : 'Private Profile'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isPublic ? 'Everyone can see your profile' : 'Only friends can see your profile'}
                </p>
              </div>
            </div>
            <Switch id="edit-privacy" checked={isPublic} onCheckedChange={setIsPublic} />
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
              className="flex-1"
              disabled={updateProfile.isPending || !username.trim()}
            >
              {updateProfile.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
