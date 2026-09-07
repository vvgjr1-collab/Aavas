import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, FileText, Loader2, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import {
  DOCUMENT_ACCEPT,
  DOCUMENT_KINDS,
  deleteDocument,
  listDocuments,
  rejectDocument,
  signedDocumentUrl,
  uploadDocument,
  type DbDocument,
} from '../../lib/records';

const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const size = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

const labelFor = (kind: string) =>
  DOCUMENT_KINDS.find(k => k.id === kind)?.label ?? kind.replace(/_/g, ' ');

/**
 * The paperwork on a tenancy.
 *
 * The table, the private bucket and the policies for all of this have existed
 * since the schema was written, and nothing has ever put a file in them: there
 * was no way to upload a rent agreement, so the one document both parties
 * actually need lived on somebody's phone. This is that missing screen.
 *
 * Both sides see the same list, because both sides are party to the same
 * documents. Either can add; only whoever uploaded a file, or the landlord,
 * can remove it - which is what the delete policy has always said.
 */
export function DocumentsPanel({
  tenancyId,
  userId,
  canUpload = true,
  title = 'Documents',
  description = 'The rent agreement and anything else worth keeping together.',
}: {
  tenancyId: string | null;
  userId: string | null;
  canUpload?: boolean;
  title?: string;
  description?: string;
}) {
  const [docs, setDocs] = useState<DbDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [kind, setKind] = useState<string>('agreement');
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    if (!tenancyId) {
      setDocs([]);
      return;
    }
    setLoading(true);
    listDocuments(tenancyId)
      .then(setDocs)
      .catch(() => {
        /* an empty list reads correctly as "nothing uploaded yet" */
      })
      .finally(() => setLoading(false));
  }, [tenancyId]);

  useEffect(load, [load]);

  const add = async (files: FileList | null) => {
    if (!files?.length || !tenancyId || !userId) return;
    const file = files[0];
    const reason = rejectDocument(file);
    if (reason) {
      toast.error('That file cannot be used', { description: reason });
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    setBusy('upload');
    try {
      const row = await uploadDocument({ tenancyId, userId, kind, file });
      setDocs(prev => [row, ...prev]);
      toast.success(`${labelFor(kind)} uploaded`, {
        description: 'Both of you can open it from here.',
      });
    } catch (err) {
      toast.error('Could not upload that', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setBusy(null);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const open = async (doc: DbDocument) => {
    setBusy(doc.id);
    try {
      // The bucket is private, so this is a short-lived signed link rather
      // than a URL anybody could pass on.
      const url = await signedDocumentUrl(doc.storage_path);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error('Could not open it', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setBusy(null);
    }
  };

  const remove = async (doc: DbDocument) => {
    setBusy(doc.id);
    try {
      await deleteDocument(doc);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      toast.success('Removed');
    } catch (err) {
      toast.error('Could not remove it', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <Card className="shadow-[var(--shadow-md)]">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {!tenancyId ? (
          <p className="text-sm text-muted-foreground">
            Documents attach to a tenancy. Once one exists, the agreement and
            anything else can live here.
          </p>
        ) : (
          <>
            <ul className="space-y-2">
              {loading && docs.length === 0 && (
                <li className="text-sm text-muted-foreground">Loading…</li>
              )}
              {!loading && docs.length === 0 && (
                <li className="text-sm text-muted-foreground">
                  Nothing uploaded yet.
                </li>
              )}
              {docs.map(doc => (
                <li
                  key={doc.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--hairline)] p-3"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate font-medium">{doc.file_name}</p>
                      <Badge variant="secondary">{labelFor(doc.kind)}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {size(doc.size_bytes)} · added {day(doc.created_at)}
                      {doc.uploaded_by === userId ? ' by you' : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-11 sm:h-8"
                      disabled={busy === doc.id}
                      onClick={() => open(doc)}
                    >
                      {busy === doc.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                      Open
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove ${doc.file_name}`}
                      className="h-11 sm:h-8 text-muted-foreground"
                      disabled={busy === doc.id}
                      onClick={() => remove(doc)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>

            {canUpload && (
              <div className="space-y-3 rounded-2xl border border-dashed border-[var(--hairline)] p-4">
                <div className="space-y-2">
                  <Label htmlFor="doc-kind">What is this?</Label>
                  <select
                    id="doc-kind"
                    value={kind}
                    onChange={e => setKind(e.target.value)}
                    className="h-11 w-full rounded-md border border-input bg-input-background px-3 text-sm sm:h-9"
                  >
                    {DOCUMENT_KINDS.map(k => (
                      <option key={k.id} value={k.id}>
                        {k.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    {DOCUMENT_KINDS.find(k => k.id === kind)?.hint}
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="h-11 w-full rounded-full"
                  disabled={busy === 'upload'}
                  onClick={() => fileInput.current?.click()}
                >
                  {busy === 'upload' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  Choose a file
                </Button>
                <input
                  ref={fileInput}
                  type="file"
                  accept={DOCUMENT_ACCEPT}
                  hidden
                  onChange={e => add(e.target.files)}
                />
                <p className="text-xs text-muted-foreground">
                  PDF or image, up to 10 MB. These are private to you and the
                  other party to this tenancy &mdash; unlike property photos,
                  which are public.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
