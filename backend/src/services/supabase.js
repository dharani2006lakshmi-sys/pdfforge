import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY

export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

export async function uploadToSupabase(fileBuffer, filePath, mimetype = 'application/pdf') {
  const { data, error } = await supabase.storage
    .from('pdf-files')
    .upload(filePath, fileBuffer, {
      contentType: mimetype,
      cacheControl: '3600',
      upsert: false,
    })

  if (error) throw new Error(`Upload failed: ${error.message}`)
  return data
}

export async function getSignedUrl(filePath, expiresIn = 3600) {
  const { data, error } = await supabase.storage
    .from('pdf-files')
    .createSignedUrl(filePath, expiresIn)

  if (error) throw new Error(`Signed URL failed: ${error.message}`)
  return data.signedUrl
}

export async function deleteFromSupabase(filePath) {
  const { error } = await supabase.storage
    .from('pdf-files')
    .remove([filePath])

  if (error) throw new Error(`Delete failed: ${error.message}`)
}
