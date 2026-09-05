import { useEffect, useRef, useState } from 'react';
import { Loader2, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'sonner';

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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import {
  deletePropertyPhoto,
  photoUrl,
  uploadPropertyPhotos,
  PHOTO_ACCEPT,
  rejectPhoto,
} from '../../lib/photos';
import { supabase } from '../../lib/supabase';
import { updateProperty, type DbProperty, type DbTenancy } from '../../lib/tenancy';

const indigo = '#2e3a8c';

const TYPES = ['apartment', 'house', 'villa', 'studio', 'penthouse'];
const STATUSES = ['vacant', 'occupied', 'maintenance'];

const num = (v: string) => Number(v.replace(/[^0-9.]/g, '')) || 0;

/**
 * Everything about a property the landlord can actually change.
 *
 * Three tabs because they are three different kinds of change with three
 * different consequences: the property's own description, the terms of the
 * lease on it - which the tenant sees and is bound by - and its photos.
 *
 * What is deliberately *not* here is the tenant's name, phone or email. Those
 * belong to their account, the policies do not let anyone else write them, and
 * a form that appeared to edit them would be recording something that never
 * saved.
 */
export function PropertyEditor({
  open,
  onOpenChange,
  property,
  tenancy,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: DbProperty;
  tenancy: DbTenancy | null;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: '',
    address_line: '',
    city: '',
    state: '',
    pincode: '',
    type: 'apartment',
    status: 'vacant',
    rent: '',
    deposit: '',
    bedrooms: '',
    bathrooms: '',
    area: '',
    amenities: '',
  });
  const [lease, setLease] = useState({ rent: '', deposit: '', start: '', end: '' });
  const [photos, setPhotos] = useState<string[]>([]);

  // Reload from the row every time it opens, so a cancelled edit leaves
  // nothing behind for the next one.
  useEffect(() => {
    if (!open) return;
    setForm({
      title: property.title ?? '',
      address_line: property.address_line ?? '',
      city: property.city ?? '',
      state: property.state ?? '',
      pincode: property.pincode ?? '',
      type: property.type || 'apartment',
      status: property.status || 'vacant',
      rent: String(property.rent ?? ''),
      deposit: String(property.deposit ?? ''),
      bedrooms: String(property.bedrooms ?? ''),
      bathrooms: String(property.bathrooms ?? ''),
      area: String(property.area_sqft ?? ''),
      amenities: (property.amenities ?? []).join(', '),
    });
    setLease({
      rent: String(tenancy?.rent ?? ''),
      deposit: String(tenancy?.deposit ?? ''),
      start: tenancy?.start_date?.slice(0, 10) ?? '',
      end: tenancy?.end_date?.slice(0, 10) ?? '',
    });
    setPhotos(property.image_paths ?? []);
  }, [open, property, tenancy]);

  /** image_paths is the one column photos change, so it is written on its own. */
  const savePhotoPaths = async (next: string[]) => {
    if (!supabase) return;
    const { error } = await supabase
      .from('properties')
      .update({ image_paths: next })
      .eq('id', property.id);
    if (error) throw new Error(error.message);
  };

  const addPhotos = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const chosen = Array.from(files);
    const bad = chosen.map(rejectPhoto).find(Boolean);
    if (bad) {
      toast.error('That file cannot be used', { description: bad });
      return;
    }
    setUploading(true);
    try {
      const paths = await uploadPropertyPhotos(property.id, chosen);
      const next = [...photos, ...paths];
      await savePhotoPaths(next);
      setPhotos(next);
      onSaved();
      toast.success(paths.length === 1 ? 'Photo added' : `${paths.length} photos added`);
    } catch (err) {
      toast.error('Could not upload that', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const removePhoto = async (path: string) => {
    const next = photos.filter(p => p !== path);
    try {
      // The row first: a path pointing at a deleted object shows a broken
      // image, while an orphaned object shows nothing at all.
      await savePhotoPaths(next);
      setPhotos(next);
      await deletePropertyPhoto(path);
      onSaved();
      toast.success('Photo removed');
    } catch (err) {
      toast.error('Could not remove it', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    }
  };

  const save = async () => {
    if (!form.title.trim() || !form.address_line.trim()) {
      toast.error('A property needs a name and an address');
      return;
    }
    setSaving(true);
    try {
      await updateProperty(property.id, {
        title: form.title.trim(),
        address_line: form.address_line.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        pincode: form.pincode.trim(),
        type: form.type,
        status: form.status,
        rent: num(form.rent),
        deposit: num(form.deposit),
        bedrooms: num(form.bedrooms),
        bathrooms: num(form.bathrooms),
        area_sqft: num(form.area),
        amenities: form.amenities
          .split(',')
          .map(a => a.trim())
          .filter(Boolean),
      });

      if (tenancy && supabase) {
        const { error } = await supabase
          .from('tenancies')
          .update({
            rent: num(lease.rent),
            deposit: num(lease.deposit),
            start_date: lease.start || null,
            end_date: lease.end || null,
          })
          .eq('id', tenancy.id);
        if (error) throw new Error(error.message);
      }

      onSaved();
      onOpenChange(false);
      toast.success('Property updated', {
        description: tenancy ? 'Your tenant sees the new lease terms.' : undefined,
      });
    } catch (err) {
      toast.error('Could not save that', {
        description: err instanceof Error ? err.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  const field = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    type = 'text',
  ) => (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type={type} value={value} onChange={e => onChange(e.target.value)} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle style={{ color: indigo }}>Update {property.title}</DialogTitle>
          <DialogDescription>
            Property details, the terms of the lease, and the photos on its card.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="details" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="lease">Lease terms</TabsTrigger>
            <TabsTrigger value="photos">Photos</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            {field('p-title', 'Property name', form.title, v => setForm({ ...form, title: v }))}
            {field('p-address', 'Address', form.address_line, v =>
              setForm({ ...form, address_line: v }),
            )}
            <div className="grid gap-4 sm:grid-cols-3">
              {field('p-city', 'City', form.city, v => setForm({ ...form, city: v }))}
              {field('p-state', 'State', form.state, v => setForm({ ...form, state: v }))}
              {field('p-pincode', 'PIN code', form.pincode, v => setForm({ ...form, pincode: v }))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="p-type">Type</Label>
                <select
                  id="p-type"
                  value={form.type}
                  onChange={e => setForm({ ...form, type: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-input-background px-3 text-sm capitalize"
                >
                  {TYPES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-status">Status</Label>
                <select
                  id="p-status"
                  value={form.status}
                  onChange={e => setForm({ ...form, status: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-input-background px-3 text-sm capitalize"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  A property with a live tenancy shows as occupied whatever this says.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {field('p-rent', 'Asking rent (₹)', form.rent, v => setForm({ ...form, rent: v }))}
              {field('p-deposit', 'Deposit (₹)', form.deposit, v =>
                setForm({ ...form, deposit: v }),
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {field('p-beds', 'Bedrooms', form.bedrooms, v => setForm({ ...form, bedrooms: v }))}
              {field('p-baths', 'Bathrooms', form.bathrooms, v =>
                setForm({ ...form, bathrooms: v }),
              )}
              {field('p-area', 'Area (sq ft)', form.area, v => setForm({ ...form, area: v }))}
            </div>
            {field('p-amenities', 'Amenities, comma separated', form.amenities, v =>
              setForm({ ...form, amenities: v }),
            )}
          </TabsContent>

          <TabsContent value="lease" className="space-y-4">
            {!tenancy ? (
              <p className="text-sm text-muted-foreground">
                No lease on this property yet. The asking rent under
                &ldquo;Details&rdquo; is what a tenant joins on.
              </p>
            ) : (
              <>
                <p className="text-sm text-muted-foreground">
                  These are the agreed terms. Your tenant sees them, and rent is
                  tracked against this figure.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('l-rent', 'Monthly rent (₹)', lease.rent, v =>
                    setLease({ ...lease, rent: v }),
                  )}
                  {field('l-deposit', 'Security deposit (₹)', lease.deposit, v =>
                    setLease({ ...lease, deposit: v }),
                  )}
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  {field('l-start', 'Lease start', lease.start, v =>
                    setLease({ ...lease, start: v }), 'date',
                  )}
                  {field('l-end', 'Lease end', lease.end, v =>
                    setLease({ ...lease, end: v }), 'date',
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="photos" className="space-y-4">
            <p className="text-sm text-muted-foreground">
              These appear on the property card. Anyone given a photo&rsquo;s link
              can open it, so keep documents out of here - the rent agreement has
              its own private storage.
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map(path => {
                const src = photoUrl(path);
                return (
                  <div
                    key={path}
                    className="group relative aspect-video overflow-hidden rounded-xl border border-[var(--hairline)]"
                  >
                    {src ? (
                      <img src={src} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-xs text-muted-foreground">
                        Unavailable
                      </div>
                    )}
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() => removePhoto(path)}
                      className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}

              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
                className="grid aspect-video place-items-center rounded-xl border border-dashed border-[var(--hairline)] text-sm text-muted-foreground hover:bg-muted/50"
              >
                {uploading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <span className="flex flex-col items-center gap-1">
                    <Upload className="h-5 w-5" />
                    Add photos
                  </span>
                )}
              </button>
            </div>

            <input
              ref={fileInput}
              type="file"
              accept={PHOTO_ACCEPT}
              multiple
              hidden
              onChange={e => addPhotos(e.target.files)}
            />

            {photos.length === 0 && (
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <Trash2 className="h-4 w-4" />
                No photos yet, so the card shows a stock image.
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              JPEG, PNG, WebP or AVIF, up to 5 MB each. Photos save as soon as
              they upload.
            </p>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={save}
            disabled={saving}
            className="bg-[#2e3a8c] text-white hover:bg-[#1f2861]"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
