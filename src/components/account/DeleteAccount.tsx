import { useEffect, useState } from 'react';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Alert, AlertDescription } from '../ui/alert';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { accountDeletionBlock, deleteMyAccount, type DeletionBlock } from '../../lib/auth';

/**
 * Closing an account, and the one thing that stops it.
 *
 * Everything hangs off the profile by cascade, so a landlord deleting
 * themselves mid-tenancy would take the property, the lease, the payment
 * history and the conversation with it - out from under a tenant with no say
 * and no warning. The database refuses that; this screen explains it before
 * anyone types their email, and offers the way through rather than a dead end:
 * give notice, agree it, then leave.
 *
 * The confirmation asks for the email address rather than the word "delete",
 * because typing your own address is a moment of recognising whose account
 * this is.
 */
export function DeleteAccount({
  email,
  onGoToNotice,
  onDeleted,
}: {
  email: string;
  /** Takes them to the screen where notice is given, for the right side. */
  onGoToNotice: (block: DeletionBlock) => void;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [block, setBlock] = useState<DeletionBlock | null>(null);
  const [checking, setChecking] = useState(false);
  const [confirm, setConfirm] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) {
      setConfirm('');
      return;
    }
    setChecking(true);
    accountDeletionBlock()
      .then(setBlock)
      .catch(() => setBlock(null))
      .finally(() => setChecking(false));
  }, [open]);

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteMyAccount();
      toast.success('Your account has been deleted');
      onDeleted();
    } catch (err) {
      toast.error('Could not delete the account', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
      setDeleting(false);
    }
  };

  const matches = confirm.trim().toLowerCase() === email.trim().toLowerCase();

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Trash2 className="h-5 w-5 text-destructive" />
          <div>
            <p className="font-medium">Delete your account</p>
            <p className="text-sm text-muted-foreground">
              Permanent, and it takes your properties and tenancy records with it.
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          className="h-11 rounded-full border-destructive/40 text-destructive sm:h-9"
          onClick={() => setOpen(true)}
        >
          Delete
        </Button>
      </div>

      <Dialog open={open} onOpenChange={o => !deleting && setOpen(o)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-destructive">Delete your account</DialogTitle>
            <DialogDescription>
              This cannot be undone, and nobody can restore it for you.
            </DialogDescription>
          </DialogHeader>

          {checking ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : block ? (
            <div className="space-y-4 py-2">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{block.reason}</AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground">
                A tenancy is an agreement between two people, and closing an
                account is not a way for one of them to end it. Everything here
                &mdash; the property, the lease, the rent history, your messages
                &mdash; would go with the account, out from under{' '}
                {block.is_landlord ? 'your tenant' : 'your landlord'}.
              </p>
              <p className="text-sm text-muted-foreground">
                Give notice, agree it between you, and this becomes available.
              </p>
              <Button
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  onGoToNotice(block);
                }}
              >
                Go to give notice
              </Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <p className="text-sm text-muted-foreground">
                Deleting removes your profile and everything that hangs off it:
                any properties you own, ended tenancies, rent records, documents
                you uploaded and your side of every conversation.
              </p>
              <p className="text-sm text-muted-foreground">
                Download anything you need first &mdash; the rent agreement
                above all.
              </p>

              <div className="space-y-2">
                <Label htmlFor="confirm-delete">
                  Type <span className="font-medium">{email}</span> to confirm
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirm}
                  autoComplete="off"
                  onChange={e => setConfirm(e.target.value)}
                  placeholder={email}
                />
              </div>
            </div>
          )}

          {!checking && !block && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
                Keep my account
              </Button>
              <Button
                variant="destructive"
                disabled={!matches || deleting}
                onClick={remove}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Delete permanently'}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
