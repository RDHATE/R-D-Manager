import { createClient } from "@supabase/supabase-js"

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const STORAGE_BUCKET = "eln-attachments"

/** Upload a file to Supabase Storage, returns the public URL */
export async function uploadFile(file: File, folder = "uploads"): Promise<string> {
  const ext  = file.name.split(".").pop()
  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(name, file, { cacheControl: "3600", upsert: false })

  if (error) throw new Error(error.message)

  const { data } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(name)
  return data.publicUrl
}
