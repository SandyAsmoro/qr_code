import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function uploadPhoto(fileName: string, buffer: Buffer) {
  const path = `participants/${fileName}.webp`;

  const { error } = await supabase.storage
    .from("photos")
    .upload(path, buffer, { contentType: "image/webp", upsert: true });

  if (error) throw error;
  return path; // simpan path ini di database
}

export async function getPhotoUrl(path: string) {
  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUrl(path, 60 * 60); // berlaku 1 jam

  if (error) throw error;
  return data.signedUrl;
}