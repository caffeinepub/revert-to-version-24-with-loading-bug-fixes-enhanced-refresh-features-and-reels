import { useState } from 'react';
import { useDeleteAccount } from '../hooks/useQueries';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, AlertTriangle } from 'lucide-react';

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const deleteAccount = useDeleteAccount();
  const [confirmText, setConfirmText] = useState('');

  const handleDelete = async () => {
    if (confirmText !== 'DELETE') return;
    
    try {
      await deleteAccount.mutateAsync();
      // Only close dialog on success (mutation's onSuccess will handle logout)
      onOpenChange(false);
      setConfirmText('');
    } catch (error) {
      // Error is already handled by the mutation's onError
      // Keep dialog open so user can try again
      console.error('Delete account error:', error);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    // Only allow closing if not currently deleting
    if (!newOpen && !deleteAccount.isPending) {
      setConfirmText('');
      onOpenChange(newOpen);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle>Delete Account</AlertDialogTitle>
              <AlertDialogDescription>This action cannot be undone</AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm text-foreground">
              Deleting your account will permanently remove:
            </p>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              <li>• Your profile and settings</li>
              <li>• All your posts and reels</li>
              <li>• All your messages and chats</li>
              <li>• All your likes and comments</li>
              <li>• All friend connections and requests</li>
              <li>• All notifications</li>
            </ul>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-delete">
              Type <span className="font-bold">DELETE</span> to confirm
            </Label>
            <Input
              id="confirm-delete"
              placeholder="DELETE"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              disabled={deleteAccount.isPending}
              autoComplete="off"
            />
          </div>

          <p className="text-xs text-muted-foreground">
            After deletion, you can create a new account using the same Internet Identity.
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteAccount.isPending}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={confirmText !== 'DELETE' || deleteAccount.isPending}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {deleteAccount.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              'Delete Account'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
