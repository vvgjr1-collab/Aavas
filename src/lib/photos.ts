import { requireSupabase, supabase } from './supabase';

/**
 * Photos of a property.
 *
 * Stored under `properties/<property_id>/<file>` in the public-read
 * `property-photos` bucket, with the path - not the URL - kept in
 * properties.image_paths. Keeping the path means the rows survive the project
 * moving to a different Supabase URL, which storing a full URL would not.
 */

const BUCKET = 'property-photos';

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/** Everything a browser will accept in an <input accept> attribute. */
export const PHOTO_ACCEPT = ACCEPTED_PHOTO_TYPES.join(',');

/**
 * A public URL for a stored photo.
 *
 * Passes an http(s) value straight through: the seed portfolio holds Unsplash
 * URLs, and the listing wizard used to record bare filenames, so the column
 * carries more than one shape of value.
 */
export function photoUrl(pathOrUrl: string): string | null {
  if (!pathOrUrl) return null;
  if (/^https?:\/\//.test(pathOrUrl)) return pathOrUrl;
  if (!pathOrUrl.startsWith('properties/')) return null;
  if (!supabase) return null;
  return supabase.storage.from(BUCKET).getPublicUrl(pathOrUrl).data.publicUrl;
}

const extensionFor = (file: File) => {
  const fromName = file.name.includes('.') ? file.name.split('.').pop() : '';
  return (fromName || file.type.split('/')[1] || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
};

/** Refuses anything the bucket should not hold, with a reason a person can act on. */
export function rejectPhoto(file: File): string | null {
  if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
    return `${file.name} is not a JPEG, PNG, WebP or AVIF image.`;
  }
  if (file.size > MAX_PHOTO_BYTES) {
    return `${file.name} is larger than 5 MB.`;
  }
  return null;
}

/**
 * Upload photos and return the paths, in the order given.
 *
 * The filename is random rather than the one the file arrived with: two
 * uploads called IMG_0001.jpg would otherwise collide, and an uploaded name
 * can carry characters storage would have to escape.
 */
export async function uploadPropertyPhotos(
  propertyId: string,
  files: File[],
): Promise<string[]> {
  const client = requireSupabase();
  const paths: string[] = [];

  for (const file of files) {
    const reason = rejectPhoto(file);
    if (reason) throw new Error(reason);

    const name = `${crypto.randomUUID()}.${extensionFor(file)}`;
    const path = `properties/${propertyId}/${name}`;
    const { error } = await client.storage.from(BUCKET).upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) throw new Error(error.message);
    paths.push(path);
  }

  return paths;
}

/**
 * Remove a photo from storage.
 *
 * Only paths in this bucket are touched: an http URL in image_paths came from
 * the seed data and there is nothing of ours to delete.
 */
export async function deletePropertyPhoto(path: string): Promise<void> {
  if (!path.startsWith('properties/')) return;
  const client = requireSupabase();
  const { error } = await client.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}
