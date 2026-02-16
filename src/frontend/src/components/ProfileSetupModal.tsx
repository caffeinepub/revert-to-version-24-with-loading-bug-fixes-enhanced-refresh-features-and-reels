import { useState } from 'react';
import { useUpdateProfile } from '../hooks/useQueries';
import { useActor } from '../hooks/useActor';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Loader2, Upload, Globe, Lock, CheckCircle2, XCircle } from 'lucide-react';
import { ExternalBlob } from '../backend';

export default function ProfileSetupModal() {
  const [username, setUsername] = useState('');
  const [userId, setUserId] = useState('');
  const [bio, setBio] = useState('');
  const [displayPic, setDisplayPic] = useState<ExternalBlob | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('/assets/generated/default-avatar.dim_200x200.png');
  const [isPublic, setIsPublic] = useState(true);
  const [isCheckingUserId, setIsCheckingUserId] = useState(false);
  const [userIdAvailable, setUserIdAvailable] = useState<boolean | null>(null);

  const updateProfile = useUpdateProfile();
  const { actor } = useActor();

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const bytes = new Uint8Array(await file.arrayBuffer());
    const blob = ExternalBlob.fromBytes(bytes);
    setDisplayPic(blob);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const checkUserIdAvailability = async (userIdToCheck: string) => {
    if (!userIdToCheck.trim() || !actor) {
      setUserIdAvailable(null);
      return;
    }

    setIsCheckingUserId(true);
    try {
      // Check if userId is available by trying to get profile by userId
      const existingProfile = await (actor as any).getUserProfileByUserId(userIdToCheck);
      setUserIdAvailable(existingProfile === null);
    } catch (error) {
      console.error('Error checking userId availability:', error);
      // If error, assume available (user can try to create)
      setUserIdAvailable(true);
    } finally {
      setIsCheckingUserId(false);
    }
  };

  const handleUserIdChange = (value: string) => {
    // Only allow alphanumeric characters and underscores
    const sanitized = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUserId(sanitized);
    setUserIdAvailable(null);
  };

  const handleUserIdBlur = () => {
    if (userId.trim()) {
      checkUserIdAvailability(userId);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !userId.trim() || userIdAvailable !== true) return;

    await updateProfile.mutateAsync({
      userId: userId.trim(),
      username: username.trim(),
      bio: bio.trim(),
      displayPic,
      isPublic,
    });
  };

  const isFormValid = username.trim() && userId.trim() && userIdAvailable === true;

  return (
    <Dialog open={true}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Let's set up your profile to get started on Fabegram
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarImage src={previewUrl} alt="Profile" />
              <AvatarFallback>{username.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <Label htmlFor="picture" className="cursor-pointer">
              <div className="flex items-center gap-2 rounded-lg border border-input bg-background px-4 py-2 text-sm hover:bg-accent">
                <Upload className="h-4 w-4" />
                Upload Photo
              </div>
              <Input
                id="picture"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageUpload}
              />
            </Label>
          </div>

          <div className="space-y-2">
            <Label htmlFor="username">Username *</Label>
            <Input
              id="username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="userId">User ID *</Label>
            <div className="relative">
              <Input
                id="userId"
                placeholder="e.g., john_doe123"
                value={userId}
                onChange={(e) => handleUserIdChange(e.target.value)}
                onBlur={handleUserIdBlur}
                required
                className={
                  userId.trim() && userIdAvailable !== null
                    ? userIdAvailable
                      ? 'border-green-500 pr-10'
                      : 'border-red-500 pr-10'
                    : ''
                }
              />
              {isCheckingUserId && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isCheckingUserId && userId.trim() && userIdAvailable !== null && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {userIdAvailable ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {userId.trim() && userIdAvailable === false
                ? 'This user ID is already taken. Please choose another.'
                : userId.trim() && userIdAvailable === true
                  ? 'This user ID is available!'
                  : 'Choose a unique ID (letters, numbers, and underscores only)'}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
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
                <Label htmlFor="privacy" className="cursor-pointer font-medium">
                  {isPublic ? 'Public Profile' : 'Private Profile'}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {isPublic ? 'Everyone can see your profile' : 'Only friends can see your profile'}
                </p>
              </div>
            </div>
            <Switch id="privacy" checked={isPublic} onCheckedChange={setIsPublic} />
          </div>

          <Button type="submit" className="w-full" disabled={updateProfile.isPending || !isFormValid}>
            {updateProfile.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Profile...
              </>
            ) : (
              'Create Profile'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
